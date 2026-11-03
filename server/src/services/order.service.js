import mongoose from "mongoose";
import { Order } from "../models/Order.js";
import { Shipment } from "../models/Shipment.js";
import { Refund } from "../models/Refund.js";
import { cashfree } from "../integrations/cashfree/cashfree.adapter.js";
import { shiprocket } from "../integrations/shiprocket/shiprocket.adapter.js";
import { shipmentService, toPublicShipment } from "./shipment.service.js";
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
import { settingsService } from "./settings.service.js";
import { computeShipping, computeTax } from "../utils/shippingRules.js";
import { ApiError } from "../utils/apiError.js";
import { logger } from "../config/logger.js";

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

    // Payment options are controlled from Admin -> Settings; enforce them here, not just in the checkout UI
    const settings = await settingsService.get();
    if (isCOD && !settings.store.enableCashOnDelivery) {
      throw ApiError.badRequest("Cash on Delivery is not available right now. Please choose online payment.");
    }
    if (isOnline && !settings.store.enableOnlinePayments) {
      throw ApiError.badRequest("Online payment is not available right now. Please choose Cash on Delivery.");
    }
    const assertCodWithinLimit = (totalPaise) => {
      const limit = Number(settings.store.maxCodLimit || 0);
      if (isCOD && limit > 0 && totalPaise > Math.round(limit * 100)) {
        throw ApiError.badRequest(`Cash on Delivery is available for orders up to ₹${limit}. Please pay online for this order.`);
      }
    };

    // PATH A: Quote-based order placement (fingerprint verification)
    if (quoteId) {
      const quote = await Quote.findById(quoteId);
      if (!quote) {
        throw ApiError.badRequest("Invalid or expired checkout quote. Please request a new quote.");
      }

      if (quote.expiresAt < new Date()) {
        throw ApiError.badRequest("Checkout quote has expired. Please calculate a new quote.");
      }

      assertCodWithinLimit(quote.totalPaise);
      await shipmentService.assertDeliverable({ pincode: quote.shippingAddress?.pincode, cod: isCOD });
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
        stockState: isCOD ? "committed" : "reserved",
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

      if (isCOD) setImmediate(() => shipmentService.autoCreateForOrder(order.orderNumber));

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
    const customerEmail = String(payload.customer?.email || user?.email || "").trim().toLowerCase();
    const customerPhone = String(payload.customer?.phone || payload.shippingAddress?.phone || "").trim();

    const street = String(payload.shippingAddress?.street || payload.shippingAddress?.line1 || "").trim();
    const city = String(payload.shippingAddress?.city || "").trim();
    const state = String(payload.shippingAddress?.state || "").trim();
    const pincode = String(payload.shippingAddress?.pincode || "").trim();

    // Couriers and the payment gateway need real contact and delivery details; never substitute placeholders
    if (!/@/.test(customerEmail)) throw ApiError.badRequest("A valid email address is required to place an order.");
    if (customerPhone.replace(/\D/g, "").slice(-10).length !== 10) {
      throw ApiError.badRequest("A valid 10-digit mobile number is required to place an order.");
    }
    if (!street || !city || !state) throw ApiError.badRequest("Please enter your full delivery address.");
    if (!/^\d{6}$/.test(pincode)) throw ApiError.badRequest("Please enter a valid 6-digit PIN code.");
    await shipmentService.assertDeliverable({ pincode, cod: isCOD });

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


    // Prices come from the database, never from the browser: re-price every line from its pack size.
    // (The cart sends a price only so the customer sees it; a changed or forged one is simply ignored.)
    for (const item of mappedItems) {
      if (!item.productId) {
        throw ApiError.conflict(`"${item.name}" is no longer available. Please remove it from your cart.`);
      }
      const packs = await ProductVariant.find({ productId: item.productId, isActive: true }).sort({ createdAt: 1 }).lean();
      // A product with no pack sizes is sold at its base price
      const priced = packs.find((v) => v.label === item.size) || packs[0] || (await Product.findById(item.productId).select("basePricePaise compareAtPricePaise").lean());
      const unit = priced?.pricePaise ?? priced?.basePricePaise;
      if (!Number.isFinite(unit) || unit <= 0) throw ApiError.conflict(`"${item.name}" is no longer available. Please remove it from your cart.`);
      const compareAt = priced.compareAtPricePaise;
      item.unitPricePaise = unit;
      item.lineTotalPaise = unit * item.quantity;
      item.mrpLinePaise = (compareAt > unit ? compareAt : unit) * item.quantity;
    }
    const goodsPaise = mappedItems.reduce((sum, it) => sum + it.lineTotalPaise, 0);
    const mrpPaise = mappedItems.reduce((sum, it) => sum + it.mrpLinePaise, 0);

    // The client says which offer it applied and how much it took off; verify that against the database
    // (dates, limits, eligible products) so nobody can invent a discount, then count the redemption.
    let verifiedOfferCode = null;
    let offerDiscountPaise = 0;
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
      offerDiscountPaise = verified.discountPaise;
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

    // Shipping, GST and the total are worked out here from the saved settings (zones, rates, GST); the
    // browser's figures are only what the customer was shown and are not trusted.
    const deliveryMethod = payload.deliveryMethod === "express" ? "express" : "standard";
    const payablePaise = Math.max(0, goodsPaise - offerDiscountPaise);
    const shippingCalc = computeShipping({ settings, destinationState: state, payablePaise, deliveryMethod });
    const taxCalc = computeTax({ settings, destinationState: state, payablePaise });
    const subtotalPaise = mrpPaise;
    const couponDiscountPaise = mrpPaise - goodsPaise + offerDiscountPaise; // product savings + offer
    const shippingPaise = shippingCalc.shippingPaise;
    const taxPaise = taxCalc.totalTaxPaise;
    const cgstPaise = taxCalc.cgstPaise;
    const sgstPaise = taxCalc.sgstPaise;
    const igstPaise = taxCalc.igstPaise;
    const payableTotalPaise = Math.max(0, goodsPaise - offerDiscountPaise - referralDiscountPaise + shippingPaise);

    // Store credit (from refunds) used on this order: debited atomically, refunded if the order fails
    let storeCreditPaise = 0;
    const claimedCreditPaise = toPaise(Number(payload.pricing?.storeCredit || 0));
    // Credit can cover everything except the last rupee, so there is always something to pay
    if (claimedCreditPaise > Math.max(0, payableTotalPaise - 100)) {
      throw ApiError.conflict("Your store credit can't cover this order in full. Please review your order and try again.");
    }
    const totalPaise = payableTotalPaise - claimedCreditPaise;
    assertCodWithinLimit(totalPaise);
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
        if (pack.weightGrams) item.weightGrams = pack.weightGrams;
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
        taxType: taxCalc.taxType,
        totalPaise,
        appliedCoupon: verifiedOfferCode,
        storeCreditPaise,
        referralCode: verifiedReferralCode,
      },
      status: initialStatus,
      paymentStatus: initialPaymentStatus,
      paymentMethod: canonicalMethod,
      deliveryMethod,
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
      // Cash on delivery is confirmed on placement, so the courier can be booked right away
      setImmediate(() => shipmentService.autoCreateForOrder(order.orderNumber));
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
        // The payment could not be started: cancel the order properly (frees the stock once, restores store credit)
        await this.cancelOrder(order.orderNumber, "Payment could not be started").catch((cancelErr) =>
          logger.error({ orderNumber, err: cancelErr.message }, "Could not cancel order after payment start failed")
        );
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
          shipment: toPublicShipment(shipment),
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
    if (user?.isStaff) {
      fullOrder.shipment = shipment || null;
    } else {
      delete fullOrder.shippingLabelUrl;
      fullOrder.shipment = toPublicShipment(shipment);
    }
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
    delete res.shippingLabelUrl;
    res.shipment = toPublicShipment(shipment);
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
    delete result.shippingLabelUrl;
    result.shipment = toPublicShipment(shipment);

    // Order number + email is a weak proof of ownership (emails are easy to guess), so the street address and the
    // full phone number are not repeated back; the customer already has them.
    const phone = String(result.customer?.phone || "").replace(/\D/g, "");
    result.customer = {
      name: result.customer?.name,
      email: result.customer?.email,
      phone: phone ? `${"*".repeat(Math.max(0, phone.length - 4))}${phone.slice(-4)}` : "",
    };
    result.shippingAddress = {
      city: result.shippingAddress?.city,
      state: result.shippingAddress?.state,
      pincode: result.shippingAddress?.pincode,
    };
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
    const isNewCancellation = normalizedStatus === ORDER_STATUS.CANCELLED && beforeStatus !== ORDER_STATUS.CANCELLED;
    if (isNewCancellation) await this.cancelCourierShipment(order);
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
    if (stockLines.length > 0) {
      if (normalizedStatus === ORDER_STATUS.DELIVERED && order.stockState === "reserved") {
        await inventoryService.commitSoldStock(stockLines, order.orderNumber, staffUser?.id || "order_delivered");
        order.stockState = "committed";
      } else if (normalizedStatus === ORDER_STATUS.CANCELLED) {
        await this.settleStockOnCancel(order, stockLines, staffUser?.id);
      }
    }

    if (newPaymentStatus) {
      order.paymentStatus = String(newPaymentStatus).toLowerCase().trim();
    } else if (normalizedStatus === ORDER_STATUS.DELIVERED && order.paymentStatus === "pending") {
      order.paymentStatus = "paid";
    }

    await order.save();
    if (isNewCancellation) await this.refundCancelledOrder(order, staffUser);

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
  /**
   * Cancel the courier booking of an order that is being cancelled, so a cancelled order is never picked up.
   * If Shiprocket refuses, the cancellation is stopped and the admin sees why.
   */
  async cancelCourierShipment(order) {
    const shipment = await Shipment.findOne({ orderNumber: order.orderNumber });
    if (!shipment) return;
    if (["CANCELLED", "CANCELED", "DELIVERED"].includes(String(shipment.status).toUpperCase())) return;

    // Shipments created by the development simulator have made-up ids that Shiprocket does not know
    const simulated = String(shipment.shiprocketOrderId || "").startsWith("sr_ord_") && !shiprocket.isMock;
    if (simulated) return;

    if (shipment.awbCode) {
      let result;
      try {
        result = await shiprocket.cancelShipment(shipment.awbCode);
      } catch (err) {
        throw ApiError.conflict(`The courier shipment could not be cancelled (${err.message}). Cancel it in Shiprocket, then retry.`);
      }
      if (!result?.success) {
        throw ApiError.conflict(
          `Shiprocket did not cancel the shipment${result?.message ? `: ${result.message}` : ""}. Cancel AWB ${shipment.awbCode} in Shiprocket, then retry.`
        );
      }
    }

    // The order itself must go too, or it stays open (and assignable) in the Shiprocket panel
    if (shipment.shiprocketOrderId) {
      let result;
      try {
        result = await shiprocket.cancelOrder(shipment.shiprocketOrderId);
      } catch (err) {
        throw ApiError.conflict(`The Shiprocket order could not be cancelled (${err.message}). Cancel order ${shipment.shiprocketOrderId} in Shiprocket, then retry.`);
      }
      if (!result?.success) {
        throw ApiError.conflict(
          `Shiprocket did not cancel its order${result?.message ? `: ${result.message}` : ""}. Cancel order ${shipment.shiprocketOrderId} in Shiprocket, then retry.`
        );
      }
    }

    if (shipment.awbCode || shipment.shiprocketOrderId) {
      shipment.status = "CANCELLED";
      shipment.trackingEvents.push({ status: "CANCELLED", activity: "Shipment cancelled with the order", location: "", time: new Date() });
      await shipment.save();
    }
  }

  /**
   * Send the customer's money back when a paid online order is cancelled. One refund per order (the id is
   * fixed, and Cashfree treats a repeat of it as the same refund). A failure never undoes the cancellation:
   * it is written on the order so staff can refund manually.
   */
  async refundCancelledOrder(order, staffUser = null) {
    const isOnline = normalizePaymentMethod(order.paymentMethod) === PAYMENT_METHODS.ONLINE;
    if (!isOnline || order.paymentStatus !== PAYMENT_STATUS.SUCCEEDED || !staffUser?._id) return null;

    const refundablePaise = Math.max(0, (order.pricing?.totalPaise || 0) - (order.refundedPaise || 0));
    if (refundablePaise <= 0) return null;

    const refundId = `RF-CANCEL-${order.orderNumber}`;
    const already = await Refund.findOne({ orderNumber: order.orderNumber, refundId });
    if (already) return already;

    const refund = await Refund.create({
      orderId: order._id,
      orderNumber: order.orderNumber,
      amountPaise: refundablePaise,
      reason: "Order cancelled",
      provider: "cashfree",
      method: "original",
      refundId,
      status: "pending",
      staffActorId: staffUser._id,
    });

    try {
      const result = await cashfree.createRefund({
        orderNumber: order.orderNumber,
        refundId,
        amountPaise: refundablePaise,
        note: "Order cancelled",
      });
      const status = String(result.status || "").toUpperCase();
      if (!["SUCCESS", "PENDING", "ONHOLD"].includes(status)) {
        throw new Error(`Cashfree returned refund status "${status || "UNKNOWN"}".`);
      }
      refund.providerRefundId = result.cfRefundId || result.refundId || refundId;
      refund.status = status === "SUCCESS" ? "succeeded" : "pending";
      await refund.save();

      order.refundedPaise = (order.refundedPaise || 0) + refundablePaise;
      if (status === "SUCCESS") order.paymentStatus = PAYMENT_STATUS.REFUNDED;
      order.timeline.push({
        status: "Refund issued",
        time: new Date(),
        note: `₹${refundablePaise / 100} sent back to the original payment method${status === "SUCCESS" ? "" : " (processing)"}.`,
        completed: true,
      });
      await order.save();
    } catch (err) {
      refund.status = "failed";
      refund.errorMessage = err.message;
      await refund.save();
      order.timeline.push({
        status: "Refund failed",
        time: new Date(),
        note: `The automatic refund of ₹${refundablePaise / 100} failed (${err.message}). Refund this order manually.`,
        completed: false,
      });
      await order.save();
      logger.error({ orderNumber: order.orderNumber, err: err.message }, "Refund for cancelled order failed");
    }
    return refund;
  }

  /**
   * Put a cancelled order's stock back. Reserved stock is simply un-reserved; stock that was already
   * sold (paid online, or COD placed through a quote) is added back to the shelf. Runs once per order.
   */
  async settleStockOnCancel(order, stockLines, actorId = "cancellation") {
    if (!stockLines.length) return;
    if (order.stockState === "reserved") {
      await inventoryService.releaseReservedStock(stockLines, order.orderNumber);
      order.stockState = "released";
    } else if (order.stockState === "committed") {
      await inventoryService.restockReturned(stockLines, order.orderNumber, actorId || "cancellation");
      order.stockState = "released";
    }
  }

  /**
   * Cancel online orders nobody paid for within the payment window, so their reserved stock goes back on sale.
   * Cashfree is asked first: a payment whose webhook was missed is confirmed instead of cancelled.
   */
  async expireUnpaidOrders({ olderThanMs = 2 * 60 * 60 * 1000 + 10 * 60 * 1000 } = {}) {
    const { paymentService } = await import("./payment.service.js");
    const cutoff = new Date(Date.now() - olderThanMs);
    const stale = await Order.find({
      status: ORDER_STATUS.PENDING_PAYMENT,
      paymentStatus: { $ne: PAYMENT_STATUS.SUCCEEDED },
      createdAt: { $lt: cutoff },
    })
      .select("orderNumber")
      .limit(50)
      .lean();

    let cancelled = 0;
    for (const { orderNumber } of stale) {
      try {
        const check = await paymentService.refreshPaymentStatus(orderNumber);
        if (check.isPaid) continue;
        await this.cancelOrder(orderNumber, "Payment not completed in time");
        cancelled += 1;
      } catch (err) {
        logger.warn({ orderNumber, err: err.message }, "Could not expire unpaid order");
      }
    }
    return { checked: stale.length, cancelled };
  }

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

    if (
      [ORDER_STATUS.SHIPPED, ORDER_STATUS.OUT_FOR_DELIVERY, ORDER_STATUS.DELIVERED, ORDER_STATUS.RETURN_REQUESTED, ORDER_STATUS.RETURNED].includes(order.status)
    ) {
      throw ApiError.badRequest("Cannot cancel an order that has already shipped or been delivered.");
    }

    const beforeStatus = order.status;
    await this.cancelCourierShipment(order);
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
    if (order.stockState === "none") {
      // Older orders that were saved before stock states existed
      await inventoryService.releaseReservedStock(order.items, order.orderNumber);
    } else {
      const lines = (order.items || [])
        .filter((i) => i.variantId)
        .map((i) => ({ variantId: i.variantId, productId: i.productId, sku: i.sku, quantity: i.quantity }));
      await this.settleStockOnCancel(order, lines, staffUser?.id);
      if (order.isModified("stockState")) await order.save();
    }
    await this.refundCancelledOrder(order, staffUser);

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

