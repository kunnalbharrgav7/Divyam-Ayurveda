import mongoose from "mongoose";
import { Order } from "../models/Order.js";
import { Shipment } from "../models/Shipment.js";
import { Quote } from "../models/Quote.js";
import { User } from "../models/User.js";
import { Product } from "../models/Product.js";
import { ProductVariant } from "../models/ProductVariant.js";
import { toPaise } from "../utils/currency.js";
import { ORDER_STATUS, isValidOrderTransition } from "../constants/orderStatus.js";
import { PAYMENT_STATUS, FULFILMENT_STATUS } from "../constants/paymentStatus.js";
import { PAYMENT_METHODS, normalizePaymentMethod } from "../constants/paymentMethods.js";
import { generateOrderNumber } from "../utils/orderNumber.js";
import { inventoryService } from "./inventory.service.js";
import { couponService } from "./coupon.service.js";
import { referralService } from "./referral.service.js";
import { walletService } from "./wallet.service.js";
import { logAudit } from "./audit.service.js";
import { ApiError } from "../utils/apiError.js";

export class OrderService {
  /**
   * Create order from validated server Quote fingerprint or direct customer checkout payload
   */
  async createOrder(payload = {}) {
    const { quoteId, notes = "", user = null } = payload;
    const rawPaymentMethod = payload.paymentMethod || "cod";
    const canonicalMethod = normalizePaymentMethod(rawPaymentMethod);
    const isCOD = canonicalMethod === PAYMENT_METHODS.COD;
    const isOnline = !isCOD;

    // PATH A: Quote-based order placement (fingerprint verification)
    if (quoteId) {
      const quote = await Quote.findById(quoteId);
      if (!quote) {
        throw ApiError.badRequest("Invalid or expired checkout quote. Please request a new quote.");
      }

      if (quote.expiresAt < new Date()) {
        throw ApiError.badRequest("Checkout quote has expired. Please calculate a new quote.");
      }

      const orderNumber = generateOrderNumber();

      // 1. Atomically reserve stock for all items
      await inventoryService.reserveStock(quote.items, orderNumber, user?.id || "checkout");

      const initialStatus =
        isCOD ? ORDER_STATUS.CONFIRMED : ORDER_STATUS.PENDING_PAYMENT;
      const initialPaymentStatus = PAYMENT_STATUS.PENDING;

      const initialTimeline = [
        { status: "Order Placed", time: new Date(), completed: true, note: "Order created successfully" },
      ];

      if (isCOD) {
        initialTimeline.push({
          status: "Payment Pending on Delivery",
          time: new Date(),
          completed: false,
          note: "Cash on delivery selected",
        });
        // For COD, commit stock as allocated/sold
        await inventoryService.commitSoldStock(quote.items, orderNumber, "cod_order_placed");
        if (quote.appliedCoupon) {
          await couponService.recordUsage(quote.appliedCoupon);
        }
      }

      const order = await Order.create({
        orderNumber,
        userId: user?._id || user?.id || quote.userId || null,
        customer: {
          name: quote.shippingAddress.fullName,
          email: (user?.email || quote.guestEmail || "guest@divyamayurveda.test").toLowerCase(),
          phone: quote.shippingAddress.phone,
        },
        shippingAddress: {
          fullName: quote.shippingAddress.fullName,
          phone: quote.shippingAddress.phone,
          street: quote.shippingAddress.line1,
          line2: quote.shippingAddress.line2 || "",
          city: quote.shippingAddress.city,
          state: quote.shippingAddress.state,
          pincode: quote.shippingAddress.pincode,
        },
        items: quote.items.map((it) => ({
          variantId: it.variantId,
          productId: it.productId,
          sku: it.sku,
          name: it.name,
          size: it.label,
          image: it.image,
          unitPricePaise: it.unitPricePaise,
          quantity: it.quantity,
          lineTotalPaise: it.lineTotalPaise,
          weightGrams: it.weightGrams,
        })),
        pricing: {
          subtotalPaise: quote.subtotalPaise,
          couponDiscountPaise: quote.couponDiscountPaise,
          referralDiscountPaise: quote.referralDiscountPaise,
          shippingPaise: quote.shippingPaise,
          taxPaise: quote.taxPaise,
          cgstPaise: quote.cgstPaise,
          sgstPaise: quote.sgstPaise,
          igstPaise: quote.igstPaise,
          taxType: quote.taxType,
          totalPaise: quote.totalPaise,
          appliedCoupon: quote.appliedCoupon,
          referralCode: quote.appliedReferralCode,
        },
        status: initialStatus,
        paymentStatus: initialPaymentStatus,
        paymentMethod: canonicalMethod,
        deliveryMethod: quote.deliveryMethod,
        timeline: initialTimeline,
        notes,
        quoteId: quote._id,
      });

      // A referral code was used: tie this first order to the referral (the reward is paid after delivery)
      if (quote.appliedReferralCode && user?._id) {
        await referralService.recordOrder(order, user);
      }

      let paymentSession = null;
      if (isOnline) {
        try {
          const { paymentService } = await import("./payment.service.js");
          paymentSession = await paymentService.createCashfreeSession({
            orderNumber: order.orderNumber,
            returnUrl: payload.returnUrl,
            user,
          });
        } catch (pgErr) {
          throw ApiError.badRequest(
            pgErr.message || "Failed to initialize Cashfree payment session."
          );
        }
      }

      const orderJson = order.toJSON();
      if (paymentSession) {
        orderJson.paymentSession = paymentSession;
      }
      return orderJson;
    }

    // PATH B: Direct checkout placement from client (saves immediately to MongoDB)
    const orderNumber = generateOrderNumber();
    const initialStatus = isOnline ? ORDER_STATUS.PENDING_PAYMENT : ORDER_STATUS.CONFIRMED;
    const initialPaymentStatus = PAYMENT_STATUS.PENDING;

    const initialTimeline = [
      { status: "Order Placed", time: new Date(), completed: true, note: "Order placed successfully" },
      { status: "Packed at Dispensary", time: null, completed: false },
      { status: "Dispatched", time: null, completed: false },
      { status: "Out for Delivery", time: null, completed: false },
      { status: "Delivered", time: null, completed: false },
    ];

    const customerName =
      payload.customer?.name || payload.shippingAddress?.fullName || user?.name || "Customer";
    const customerEmail = (
      payload.customer?.email || user?.email || "customer@divyamayurveda.test"
    ).toLowerCase();
    const customerPhone =
      payload.customer?.phone || payload.shippingAddress?.phone || "9876543210";

    const street =
      payload.shippingAddress?.street || payload.shippingAddress?.line1 || "Street Address";
    const city = payload.shippingAddress?.city || "City";
    const state = payload.shippingAddress?.state || "Karnataka";
    const pincode = payload.shippingAddress?.pincode || "560001";

    const mappedItems = await Promise.all(
      (payload.items || []).map(async (item) => {
        let variantId = null;
        let productId = null;
        let sku = item.sku || `SKU-${Date.now()}`;

        if (item.productId && mongoose.Types.ObjectId.isValid(item.productId)) {
          productId = item.productId;
        } else {
          const foundProd = await Product.findOne({
            $or: [{ slug: item.slug }, { name: item.name }],
          });
          if (foundProd) {
            productId = foundProd._id;
            const foundVariant = await ProductVariant.findOne({
              productId: foundProd._id,
              label: item.size,
            });
            if (foundVariant) {
              variantId = foundVariant._id;
              sku = foundVariant.sku;
            }
          }
        }

        const unitPricePaise = toPaise(Number(item.price || 0));
        const quantity = Number(item.quantity || 1);
        return {
          variantId,
          productId,
          sku,
          name: item.name || "Ayurvedic Product",
          size: item.size || "Standard",
          image: item.image || "",
          unitPricePaise,
          quantity,
          lineTotalPaise: unitPricePaise * quantity,
          weightGrams: item.weightGrams || 250,
        };
      })
    );

    // Refuse to place an order for anything that is out of stock, unavailable, or over the available quantity
    for (const item of mappedItems) {
      if (!item.productId) continue;
      const product = await Product.findById(item.productId).select("status name").lean();
      if (!product || product.status !== "active") {
        throw ApiError.conflict(`"${item.name}" is no longer available. Please remove it from your cart.`);
      }
      const variants = await ProductVariant.find({ productId: item.productId, isActive: true }).lean();
      const availableOf = (v) => Math.max(0, (v.stockOnHand || 0) - (v.reservedStock || 0));
      const match = variants.find((v) => v.label === item.size);
      const available = match ? availableOf(match) : variants.reduce((sum, v) => sum + availableOf(v), 0);
      if (available <= 0) {
        throw ApiError.conflict(`"${item.name}" is out of stock. Please remove it from your cart to continue.`);
      }
      if (item.quantity > available) {
        throw ApiError.conflict(`Only ${available} unit(s) of "${item.name}" are available. Please reduce the quantity.`);
      }
    }


    // The client says which offer it applied and how much it took off; verify that against the database
    // (dates, limits, eligible products) so nobody can invent a discount, then count the redemption.
    let verifiedOfferCode = null;
    const claimedOfferCode = String(payload.pricing?.couponCode || "").trim();
    if (claimedOfferCode) {
      const verified = await couponService.validateCoupon(
        claimedOfferCode,
        mappedItems.reduce((sum, it) => sum + it.lineTotalPaise, 0),
        user?._id || null,
        [],
        { items: mappedItems.map((it) => ({ productId: it.productId, unitPricePaise: it.unitPricePaise, quantity: it.quantity })) }
      );
      const claimedPaise = toPaise(Number(payload.pricing?.offerDiscount || 0));
      if (Math.abs(verified.discountPaise - claimedPaise) > 100) {
        throw ApiError.conflict("This offer has changed. Please review your cart and try again.");
      }
      verifiedOfferCode = verified.code;
    }

    // Referral: the server works the discount out itself; the browser's figure must agree with it.
    // (A referral code with no discount claimed is simply ignored, e.g. when the basket is under the minimum.)
    let verifiedReferralCode = null;
    let referralDiscountPaise = 0;
    const claimedReferralPaise = toPaise(Number(payload.pricing?.referralDiscount || 0));
    if (claimedReferralPaise > 0) {
      if (!String(payload.pricing?.referralCode || "").trim()) {
        throw ApiError.badRequest("A referral discount needs a referral code.");
      }
      if (verifiedOfferCode) {
        throw ApiError.badRequest("A referral code cannot be combined with a coupon or offer.");
      }
      const referral = await referralService.computeDiscount({
        code: payload.pricing.referralCode,
        user,
        goodsPaise: mappedItems.reduce((sum, it) => sum + it.lineTotalPaise, 0),
      });
      if (Math.abs(referral.discountPaise - claimedReferralPaise) > 100) {
        throw ApiError.conflict("The referral discount has changed. Please review your order and try again.");
      }
      verifiedReferralCode = referral.code;
      referralDiscountPaise = referral.discountPaise;
    }

    const subtotalPaise = toPaise(Number(payload.pricing?.subtotal || 0));
    const couponDiscountPaise = toPaise(Number(payload.pricing?.discount || 0));
    const shippingPaise = toPaise(Number(payload.pricing?.shipping || 0));
    const taxPaise = toPaise(Number(payload.pricing?.tax || 0));
    const cgstPaise = toPaise(Number(payload.pricing?.cgst || 0));
    const sgstPaise = toPaise(Number(payload.pricing?.sgst || 0));
    const igstPaise = toPaise(Number(payload.pricing?.igst || 0));
    const totalPaise = toPaise(Number(payload.pricing?.total || 0));

    // Store credit (from refunds) used on this order: debited atomically, refunded if the order fails
    let storeCreditPaise = 0;
    const claimedCreditPaise = toPaise(Number(payload.pricing?.storeCredit || 0));
    if (claimedCreditPaise > 0) {
      if (!user?._id) throw ApiError.badRequest("Please sign in to use store credit.");
      await walletService.debit(user._id, claimedCreditPaise, {
        source: "checkout_spend",
        reference: orderNumber,
        note: `Used on order ${orderNumber}`,
        key: `checkout_spend:${orderNumber}`,
      });
      storeCreditPaise = claimedCreditPaise;
    }

    // Link every line to its pack size (variant) and reserve the stock: availability drops immediately,
    // and the units are permanently deducted when the order is delivered.
    const reservations = [];
    for (const item of mappedItems) {
      if (!item.productId) continue;
      const packs = await ProductVariant.find({ productId: item.productId, isActive: true }).sort({ createdAt: 1 }).lean();
      const pack = packs.find((v) => v.label === item.size) || packs[0];
      if (pack) {
        item.variantId = pack._id;
        item.sku = pack.sku;
        reservations.push({ variantId: pack._id, productId: item.productId, sku: pack.sku, quantity: item.quantity });
      }
    }

    let order;
    let stockReserved = false;
    try {
      await inventoryService.reserveStock(reservations, orderNumber, user?.id || "checkout");
      stockReserved = true;
      order = await Order.create({
      stockState: reservations.length > 0 ? "reserved" : "none",
      orderNumber,
      userId: user?._id || user?.id || null,
      customer: {
        name: customerName,
        email: customerEmail,
        phone: customerPhone,
      },
      shippingAddress: {
        fullName: customerName,
        phone: customerPhone,
        street,
        line2: payload.shippingAddress?.line2 || "",
        city,
        state,
        pincode,
      },
      items: mappedItems,
      pricing: {
        subtotalPaise,
        couponDiscountPaise,
        referralDiscountPaise,
        shippingPaise,
        taxPaise,
        cgstPaise,
        sgstPaise,
        igstPaise,
        taxType: payload.pricing?.taxType || "intra_state",
        totalPaise,
        appliedCoupon: verifiedOfferCode,
        storeCreditPaise,
        referralCode: verifiedReferralCode,
      },
      status: initialStatus,
      paymentStatus: initialPaymentStatus,
      paymentMethod: canonicalMethod,
      deliveryMethod: payload.deliveryMethod || "standard",
      timeline: initialTimeline,
      notes,
      });
    } catch (err) {
      // Never leave stock or store credit held for an order that was not saved
      if (stockReserved) await inventoryService.releaseReservedStock(reservations, orderNumber);
      if (storeCreditPaise > 0) {
        await walletService.credit(user._id, storeCreditPaise, {
          source: "checkout_restore",
          reference: orderNumber,
          note: `Order ${orderNumber} could not be placed`,
          key: `checkout_restore:${orderNumber}`,
        });
      }
      throw err;
    }

    // Count the redemption (drives usage limits) for confirmed/COD orders; online orders record upon payment success
    if (isCOD) {
      if (verifiedOfferCode) await couponService.recordUsage(verifiedOfferCode);
      if (verifiedReferralCode) await referralService.recordOrder(order, user);
    }

    let paymentSession = null;
    if (isOnline) {
      try {
        const { paymentService } = await import("./payment.service.js");
        paymentSession = await paymentService.createCashfreeSession({
          orderNumber: order.orderNumber,
          returnUrl: payload.returnUrl,
          user,
        });
      } catch (pgErr) {
        if (stockReserved) await inventoryService.releaseReservedStock(reservations, orderNumber);
        throw ApiError.badRequest(
          pgErr.message || "Failed to initialize secure Cashfree payment session. Please try again."
        );
      }
    }

    const orderJson = order.toJSON();
    if (paymentSession) {
      orderJson.paymentSession = paymentSession;
    }
    return orderJson;
  }

  /**
   * Get single order by orderNumber with ownership verification or safe tracking view
   */
  async getOrder(orderNumber, user = null) {
    const isObjectId = mongoose.Types.ObjectId.isValid(orderNumber);
    const order = await Order.findOne({
      $or: [
        { orderNumber },
        ...(isObjectId ? [{ _id: orderNumber }] : []),
      ],
    });
    if (!order) throw ApiError.notFound("Order not found.");

    const shipment = await Shipment.findOne({ orderNumber: order.orderNumber }).lean();

    // Staff see everything; everyone else (including signed-out visitors) only sees their own orders in full
    if (!user || !user.isStaff) {
      const isOwner =
        !!user &&
        ((order.userId && order.userId.toString() === user._id.toString()) ||
          (order.customer?.email && order.customer.email.toLowerCase() === user.email.toLowerCase()));

      if (!isOwner) {
        // Return public tracking view (masked customer data)
        const json = order.toJSON();
        return {
          orderNumber: json.orderNumber,
          id: json.orderNumber,
          status: json.status,
          fulfilmentStatus: json.fulfilmentStatus,
          paymentStatus: json.paymentStatus,
          timeline: json.timeline,
          items: json.items,
          estimatedDelivery: json.estimatedDelivery,
          createdAt: json.createdAt,
          trackingNumber: json.trackingNumber,
          carrier: json.carrier,
          trackingUrl: json.trackingUrl,
          shippingLabelUrl: json.shippingLabelUrl,
          shipment: shipment || null,
          shippingAddress: {
            city: json.shippingAddress?.city,
            state: json.shippingAddress?.state,
            pincode: json.shippingAddress?.pincode,
          },
          customer: {
            name: json.customer?.name || "Customer",
          },
        };
      }
    }

    const fullOrder = order.toJSON();
    fullOrder.shipment = shipment || null;
    return fullOrder;
  }

  /**
   * Guest order tracking requiring BOTH orderNumber AND email
   */
  /**
   * An order the signed-in customer owns (404 for anyone else's, so existence isn't revealed)
   */
  async getOwnedOrder(orderNumber, user) {
    const order = await Order.findOne({ orderNumber });
    const owns =
      order &&
      ((order.userId && order.userId.toString() === user._id.toString()) ||
        (order.customer?.email && order.customer.email.toLowerCase() === user.email.toLowerCase()));
    if (!owns) throw ApiError.notFound("Order not found.");

    const shipment = await Shipment.findOne({ orderNumber: order.orderNumber }).lean();
    const res = order.toJSON();
    res.shipment = shipment || null;
    return res;
  }

  async trackOrder(orderNumber, email) {
    if (!orderNumber || !email) {
      throw ApiError.badRequest("Order number and customer email are both required for tracking.");
    }

    const order = await Order.findOne({
      orderNumber: orderNumber.trim(),
      "customer.email": email.trim().toLowerCase(),
    });

    if (!order) {
      throw ApiError.notFound("No matching order found for this order number and email address.");
    }

    const shipment = await Shipment.findOne({ orderNumber: order.orderNumber }).lean();
    const result = order.toJSON();
    result.shipment = shipment || null;
    return result;
  }

  /**
   * List customer's own orders
   */
  async getCustomerOrders(userId, email) {
    const orders = await Order.find({
      $or: [{ userId }, { "customer.email": email?.toLowerCase() }],
    }).sort({ createdAt: -1 });

    return orders.map((o) => o.toJSON());
  }

  /**
   * Update order status with state machine enforcement, milestone synchronization, and audit trail
   */
  async updateOrderStatus(orderNumber, newStatus, note = "", staffUser = null, newPaymentStatus = null) {
    const isObjectId = mongoose.Types.ObjectId.isValid(orderNumber);
    const order = await Order.findOne({
      $or: [
        { orderNumber },
        ...(isObjectId ? [{ _id: orderNumber }] : []),
      ],
    });
    if (!order) throw ApiError.notFound("Order not found.");

    if (!newStatus) throw ApiError.badRequest("New order status is required.");

    const raw = String(newStatus).toLowerCase().trim();
    // Normalize aliases: e.g. "shipped" -> "dispatched"
    const normalizedStatus = raw === "shipped" ? ORDER_STATUS.DISPATCHED : raw;

    const isStaff = Boolean(staffUser?.isStaff || staffUser);
    if (!isValidOrderTransition(order.status, normalizedStatus, isStaff)) {
      throw ApiError.badRequest(`Cannot transition order from "${order.status}" to "${normalizedStatus}".`);
    }

    const beforeStatus = order.status;
    order.status = normalizedStatus;

    // Update fulfillment status based on new order status
    if (
      normalizedStatus === ORDER_STATUS.DELIVERED ||
      normalizedStatus === ORDER_STATUS.DISPATCHED ||
      normalizedStatus === ORDER_STATUS.SHIPPED ||
      normalizedStatus === ORDER_STATUS.OUT_FOR_DELIVERY
    ) {
      order.fulfilmentStatus = FULFILMENT_STATUS.FULFILLED;
    } else if (
      normalizedStatus === ORDER_STATUS.PROCESSING ||
      normalizedStatus === ORDER_STATUS.PACKED
    ) {
      order.fulfilmentStatus = FULFILMENT_STATUS.PROCESSING;
    } else if (
      normalizedStatus === ORDER_STATUS.CONFIRMED ||
      normalizedStatus === ORDER_STATUS.PENDING_PAYMENT
    ) {
      order.fulfilmentStatus = FULFILMENT_STATUS.UNFULFILLED;
    } else if (normalizedStatus === ORDER_STATUS.CANCELLED) {
      order.fulfilmentStatus = FULFILMENT_STATUS.CANCELLED;
    }

    // Standard 5 milestone stages for customer tracking
    const standardMilestones = [
      "Order Placed",
      "Packed at Dispensary",
      "Dispatched",
      "Out for Delivery",
      "Delivered",
    ];

    // Filter out previous "Status changed to..." noise
    const existingCleanTimeline = (order.timeline || []).filter(
      (entry) => !entry.status.startsWith("Status changed to")
    );

    // Build or align standard milestones
    const updatedTimeline = standardMilestones.map((mName) => {
      const match = existingCleanTimeline.find(
        (e) => e.status.toLowerCase() === mName.toLowerCase()
      );
      return (
        match || {
          status: mName,
          time: null,
          note: "",
          completed: false,
        }
      );
    });

    const now = new Date();

    // Determine completion index based on normalizedStatus
    let completeUpToIndex = -1;
    if (normalizedStatus === ORDER_STATUS.CONFIRMED || normalizedStatus === ORDER_STATUS.PENDING_PAYMENT) {
      completeUpToIndex = 0; // Order Placed
    } else if (normalizedStatus === ORDER_STATUS.PROCESSING || normalizedStatus === ORDER_STATUS.PACKED) {
      completeUpToIndex = 1; // Packed at Dispensary
    } else if (normalizedStatus === ORDER_STATUS.DISPATCHED || normalizedStatus === ORDER_STATUS.SHIPPED) {
      completeUpToIndex = 2; // Dispatched
    } else if (normalizedStatus === ORDER_STATUS.OUT_FOR_DELIVERY) {
      completeUpToIndex = 3; // Out for Delivery
    } else if (normalizedStatus === ORDER_STATUS.DELIVERED) {
      completeUpToIndex = 4; // Delivered
    }

    if (completeUpToIndex >= 0) {
      for (let i = 0; i < updatedTimeline.length; i++) {
        if (i <= completeUpToIndex) {
          updatedTimeline[i].completed = true;
          if (!updatedTimeline[i].time) {
            updatedTimeline[i].time = now;
          }
          if (i === completeUpToIndex && note) {
            updatedTimeline[i].note = note;
          }
        } else {
          // Reset future milestones if status is moved backwards
          updatedTimeline[i].completed = false;
          updatedTimeline[i].time = null;
          updatedTimeline[i].note = "";
        }
      }
    }

    if (normalizedStatus === ORDER_STATUS.CANCELLED) {
      const hasCancelled = updatedTimeline.some(
        (t) => t.status.toLowerCase() === "cancelled"
      );
      if (!hasCancelled) {
        updatedTimeline.push({
          status: "Cancelled",
          time: now,
          note: note || "Order was cancelled.",
          completed: true,
        });
      }
    }

    order.timeline = updatedTimeline;

    if (normalizedStatus === ORDER_STATUS.DELIVERED && !order.deliveredAt) order.deliveredAt = now;
    if (normalizedStatus === ORDER_STATUS.CANCELLED) {
      await this.restoreStoreCredit(order);
      await referralService.onOrderCancelled(order);
    }

    // Inventory follows the order: delivery permanently deducts the reserved units; cancelling frees them
    const stockLines = (order.items || [])
      .filter((i) => i.variantId)
      .map((i) => ({ variantId: i.variantId, productId: i.productId, sku: i.sku, quantity: i.quantity }));
    if (order.stockState === "reserved" && stockLines.length > 0) {
      if (normalizedStatus === ORDER_STATUS.DELIVERED) {
        await inventoryService.commitSoldStock(stockLines, order.orderNumber, staffUser?.id || "order_delivered");
        order.stockState = "committed";
      } else if (normalizedStatus === ORDER_STATUS.CANCELLED) {
        await inventoryService.releaseReservedStock(stockLines, order.orderNumber);
        order.stockState = "released";
      }
    }

    if (newPaymentStatus) {
      order.paymentStatus = String(newPaymentStatus).toLowerCase().trim();
    } else if (normalizedStatus === ORDER_STATUS.DELIVERED && order.paymentStatus === "pending") {
      order.paymentStatus = "paid";
    }

    await order.save();

    if (staffUser) {
      await logAudit({
        actorId: staffUser._id,
        actorName: staffUser.name || "Staff",
        actorRole: staffUser.roles?.[0]?.name || "Staff",
        action: "orders.update",
        module: "Sales",
        targetId: order.orderNumber,
        details: `Updated order status from ${beforeStatus} to ${normalizedStatus}`,
        before: { status: beforeStatus },
        after: { status: normalizedStatus },
      });
    }

    return order.toJSON();
  }

  /**
   * Update payment status directly (e.g. Paid, Pending, Refunded, Failed)
   */
  async updatePaymentStatus(orderNumber, newPaymentStatus, note = "", staffUser = null) {
    const isObjectId = mongoose.Types.ObjectId.isValid(orderNumber);
    const order = await Order.findOne({
      $or: [
        { orderNumber },
        ...(isObjectId ? [{ _id: orderNumber }] : []),
      ],
    });
    if (!order) throw ApiError.notFound("Order not found.");

    const beforeStatus = order.paymentStatus;
    const cleanPaymentStatus = String(newPaymentStatus).toLowerCase().trim();
    order.paymentStatus = cleanPaymentStatus;

    await order.save();

    if (staffUser) {
      await logAudit({
        actorId: staffUser._id,
        actorName: staffUser.name || "Staff",
        actorRole: staffUser.roles?.[0]?.name || "Staff",
        action: "orders.update_payment",
        module: "Sales",
        targetId: order.orderNumber,
        details: `Updated payment status from ${beforeStatus} to ${cleanPaymentStatus}`,
        before: { paymentStatus: beforeStatus },
        after: { paymentStatus: cleanPaymentStatus },
      });
    }

    return order.toJSON();
  }

  /** Gives the store credit a customer spent on an order back to their balance (once). */
  async restoreStoreCredit(order) {
    const spent = order.pricing?.storeCreditPaise || 0;
    if (spent > 0 && order.userId && !order.storeCreditRestored) {
      await walletService.credit(order.userId, spent, {
        source: "checkout_restore",
        reference: order.orderNumber,
        note: `Order ${order.orderNumber} was cancelled`,
        key: `checkout_restore:${order.orderNumber}`,
      });
      order.storeCreditRestored = true;
    }
  }

  /**
   * Cancel order and safely release stock
   */
  async cancelOrder(orderNumber, reason = "", staffUser = null) {
    const isObjectId = mongoose.Types.ObjectId.isValid(orderNumber);
    const order = await Order.findOne({
      $or: [
        { orderNumber },
        ...(isObjectId ? [{ _id: orderNumber }] : []),
      ],
    });
    if (!order) throw ApiError.notFound("Order not found.");

    if (order.status === ORDER_STATUS.CANCELLED) {
      throw ApiError.badRequest("This order is already cancelled.");
    }

    if (order.status === ORDER_STATUS.SHIPPED || order.status === ORDER_STATUS.DELIVERED) {
      throw ApiError.badRequest("Cannot cancel an order that has already shipped or been delivered.");
    }

    const beforeStatus = order.status;
    order.status = ORDER_STATUS.CANCELLED;
    order.timeline.push({
      status: "Order Cancelled",
      time: new Date(),
      note: reason || "Cancelled by request",
      completed: true,
    });

    await order.save();

    // Release reserved stock back to active inventory (orders tracked by stockState are released only once)
    await this.restoreStoreCredit(order);
    await referralService.onOrderCancelled(order);
    if (order.isModified("storeCreditRestored")) await order.save();
    if (order.stockState === "reserved" || order.stockState === "none") {
      await inventoryService.releaseReservedStock(order.items, order.orderNumber);
      if (order.stockState === "reserved") {
        order.stockState = "released";
        await order.save();
      }
    }

    if (staffUser) {
      await logAudit({
        actorId: staffUser._id,
        actorName: staffUser.name,
        actorRole: staffUser.roles?.[0]?.name || "Staff",
        action: "orders.cancel",
        module: "Sales",
        targetId: order.orderNumber,
        details: `Order cancelled. Reason: ${reason}`,
        before: { status: beforeStatus },
        after: { status: ORDER_STATUS.CANCELLED },
      });
    }

    return order.toJSON();
  }
}

export const orderService = new OrderService();

