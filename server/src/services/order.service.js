import mongoose from "mongoose";
import { Order } from "../models/Order.js";
import { Shipment } from "../models/Shipment.js";
import { Refund } from "../models/Refund.js";
import { cashfree, PAYMENT_WINDOW_MS } from "../integrations/cashfree/cashfree.adapter.js";
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
import { pricingService, toOrderPricing, toOrderLine, resolvePackPrice } from "./pricing.service.js";
import { canonicalState } from "../utils/indianStates.js";
import { stockLinesOf } from "../utils/orderLines.js";
import { ApiError } from "../utils/apiError.js";
import { logger } from "../config/logger.js";
import {
  issueGuestCredentials,
  formatTrackingCode,
  normalizeTrackingCode,
  hashToken,
  isWellFormedClaimToken,
  maskPhone,
  maskEmail,
} from "../utils/guestAccess.js";
import { marketingService } from "./marketing.service.js";

// Attribution the storefront captured (Meta click ids, UTM tags), trimmed to sane lengths
const cleanAttribution = (raw = {}, request = {}) => {
  const pick = (v, max = 300) => String(v ?? "").trim().slice(0, max);
  const src = raw && typeof raw === "object" ? raw : {};
  const req = request && typeof request === "object" ? request : {};
  return {
    fbp: pick(src.fbp, 200),
    fbc: pick(src.fbc, 300),
    utmSource: pick(src.utmSource, 120),
    utmMedium: pick(src.utmMedium, 120),
    utmCampaign: pick(src.utmCampaign, 200),
    utmContent: pick(src.utmContent, 200),
    utmTerm: pick(src.utmTerm, 200),
    landingUrl: pick(src.landingUrl, 500),
    clientIp: pick(req.ip, 64),
    userAgent: pick(req.userAgent, 400),
  };
};

// The plain guest credentials, returned once in the order-placement response and never stored
const guestAccessResponse = (credentials) =>
  credentials
    ? {
        trackingCode: formatTrackingCode(credentials.plain.trackingCode),
        claimToken: credentials.plain.claimToken,
        claimExpiresAt: credentials.plain.claimExpiresAt,
      }
    : undefined;

// What anyone holding a private tracking code may see: enough to follow the parcel, nothing to edit,
// and no full address, phone or email (the buyer already has them)
const toTrackingView = (order, shipment) => {
  const json = order.toJSON();
  return {
    orderNumber: json.orderNumber,
    id: json.orderNumber,
    createdAt: json.createdAt,
    status: json.status,
    fulfilmentStatus: json.fulfilmentStatus,
    paymentStatus: json.paymentStatus,
    paymentMethod: json.paymentMethod,
    estimatedDelivery: json.estimatedDelivery,
    deliveredAt: json.deliveredAt,
    timeline: (json.timeline || []).map((t) => ({ status: t.status, time: t.time, completed: t.completed })),
    items: (json.items || []).map((it) => ({
      name: it.name,
      size: it.size,
      image: it.image,
      quantity: it.quantity,
      price: it.price,
      total: it.total,
    })),
    pricing: {
      subtotal: json.pricing.subtotal,
      discount: json.pricing.discount,
      referralDiscount: json.pricing.referralDiscount,
      shipping: json.pricing.shipping,
      tax: json.pricing.tax,
      storeCredit: json.pricing.storeCredit,
      total: json.pricing.total,
    },
    trackingNumber: json.trackingNumber,
    carrier: json.carrier,
    trackingUrl: json.trackingUrl,
    shipment: toPublicShipment(shipment),
    customer: {
      name: json.customer?.name,
      phone: maskPhone(json.customer?.phone),
      email: maskEmail(json.customer?.email),
    },
    shippingAddress: {
      city: json.shippingAddress?.city,
      state: json.shippingAddress?.state,
      pincode: json.shippingAddress?.pincode,
    },
    isGuest: json.isGuest,
    linkedToAccount: Boolean(order.userId),
  };
};

const ownsOrder = (order, user) =>
  Boolean(order && user?._id && order.userId && order.userId.toString() === user._id.toString());

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
      const quoteOwnerId = user?._id || user?.id || quote.userId || null;
      const quoteGuest = quoteOwnerId ? null : issueGuestCredentials();

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
        userId: quoteOwnerId,
        checkoutType: quoteGuest ? "guest" : "account",
        ...(quoteGuest ? { guestAccess: quoteGuest.stored } : {}),
        attribution: cleanAttribution(payload.attribution, payload.requestMeta),
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
        items: quote.items.map((it, i) => ({
          ...(quote.pricingSnapshot?.lines?.[i] || {}),
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
          ...(quote.pricingSnapshot?.pricing || {}), // zone, delivery and GST snapshot
          // the quote's own figures stay authoritative for what was shown and is charged
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

      if (isCOD) {
        setImmediate(() => shipmentService.autoCreateForOrder(order.orderNumber));
        setImmediate(() => marketingService.sendPurchase(order.orderNumber));
      }

      let paymentSession = null;
      if (isOnline) {
        try {
          const { paymentService } = await import("./payment.service.js");
          paymentSession = await paymentService.createCashfreeSession({
            orderNumber: order.orderNumber,
            returnOrigin: payload.returnOrigin,
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
      if (quoteGuest) orderJson.guestAccess = guestAccessResponse(quoteGuest);
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
    const stateInput = String(payload.shippingAddress?.state || "").trim();
    const state = canonicalState(stateInput) || stateInput; // "Orissa" -> "Odisha"; an unknown state is refused when priced
    const pincode = String(payload.shippingAddress?.pincode || "").trim();

    // Couriers and the payment gateway need real contact and delivery details; never substitute placeholders
    if (!/@/.test(customerEmail)) throw ApiError.badRequest("A valid email address is required to place an order.");
    if (customerPhone.replace(/\D/g, "").slice(-10).length !== 10) {
      throw ApiError.badRequest("A valid 10-digit mobile number is required to place an order.");
    }
    if (!street || !city || !state) throw ApiError.badRequest("Please enter your full delivery address.");
    if (!/^\d{6}$/.test(pincode)) throw ApiError.badRequest("Please enter a valid 6-digit PIN code.");
    await pricingService.assertPinMatchesState({ state, pincode });
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
      const productDoc = await Product.findById(item.productId).select("basePricePaise compareAtPricePaise gstRate hsnCode").lean();
      // A product with no pack sizes is sold at its base price (same rule the price preview uses)
      const { unitPaise: unit, mrpUnitPaise } = resolvePackPrice({ product: productDoc, packs, size: item.size });
      if (!Number.isFinite(unit) || unit <= 0) throw ApiError.conflict(`"${item.name}" is no longer available. Please remove it from your cart.`);
      item.unitPricePaise = unit;
      item.lineTotalPaise = unit * item.quantity;
      item.mrpUnitPaise = mrpUnitPaise;
      item.gstRate = productDoc?.gstRate ?? null;
      item.hsnCode = productDoc?.hsnCode || "";
    }

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
        {
          items: mappedItems.map((it) => ({ productId: it.productId, unitPricePaise: it.unitPricePaise, quantity: it.quantity })),
          // Without an account, "once per customer" offers are counted against this email / mobile number
          guestContact: user?._id ? null : { email: customerEmail, phone: customerPhone },
        }
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

    // Shipping, GST and the total come from the one pricing engine (services/pricing.service.js), from the saved
    // settings and database prices; the browser's figures are only what the customer was shown and are not trusted.
    const deliveryMethod = payload.deliveryMethod === "express" ? "express" : "standard";
    const breakdown = await pricingService.price({
      settings,
      lines: mappedItems.map((it) => ({
        productId: it.productId,
        name: it.name,
        size: it.size,
        quantity: it.quantity,
        unitPricePaise: it.unitPricePaise,
        mrpUnitPaise: it.mrpUnitPaise,
        gstRate: it.gstRate,
        hsnCode: it.hsnCode,
      })),
      address: { state, pincode },
      deliveryMethod,
      offerDiscountPaise,
      referralDiscountPaise,
    });
    mappedItems.forEach((it, i) => Object.assign(it, toOrderLine(breakdown.lines[i])));
    const payableTotalPaise = breakdown.totalPaise;

    // Store credit (from refunds) used on this order: debited atomically, refunded if the order fails
    let storeCreditPaise = 0;
    const claimedCreditPaise = toPaise(Number(payload.pricing?.storeCredit || 0));
    // Credit can cover everything except the last rupee, so there is always something to pay
    if (claimedCreditPaise > Math.max(0, payableTotalPaise - 100)) {
      throw ApiError.conflict("Your store credit can't cover this order in full. Please review your order and try again.");
    }
    const totalPaise = payableTotalPaise - claimedCreditPaise;
    // The total the customer saw must be the total they are charged: if anything moved since (price, offer,
    // delivery rule, GST setting) they are asked to review it first instead of paying a different amount.
    const expectedTotalPaise = payload.pricing?.expectedTotal;
    if (expectedTotalPaise !== undefined && expectedTotalPaise !== null && Math.round(Number(expectedTotalPaise) * 100) !== totalPaise) {
      throw ApiError.conflict("The price changed while you were checking out. Please review the updated total and try again.", {
        expectedTotal: Number(expectedTotalPaise),
        actualTotal: totalPaise / 100,
      });
    }
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

    // Placed without an account: private tracking code + one-time claim token for this buyer
    const guestCredentials = user?._id || user?.id ? null : issueGuestCredentials();

    let order;
    let stockReserved = false;
    try {
      await inventoryService.reserveStock(reservations, orderNumber, user?.id || "checkout");
      stockReserved = true;
      order = await Order.create({
      stockState: reservations.length > 0 ? "reserved" : "none",
      orderNumber,
      userId: user?._id || user?.id || null,
      checkoutType: guestCredentials ? "guest" : "account",
      ...(guestCredentials ? { guestAccess: guestCredentials.stored } : {}),
      attribution: cleanAttribution(payload.attribution, payload.requestMeta),
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
        state: breakdown.destinationState,
        pincode,
      },
      items: mappedItems,
      pricing: {
        ...toOrderPricing(breakdown, { appliedCoupon: verifiedOfferCode, referralCode: verifiedReferralCode }),
        totalPaise, // what is actually charged (after any store credit)
        storeCreditPaise,
      },
      status: initialStatus,
      paymentStatus: initialPaymentStatus,
      paymentMethod: canonicalMethod,
      deliveryMethod: breakdown.shipping.deliveryMethod,
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
      setImmediate(() => marketingService.sendPurchase(order.orderNumber));
    }

    let paymentSession = null;
    if (isOnline) {
      try {
        const { paymentService } = await import("./payment.service.js");
        paymentSession = await paymentService.createCashfreeSession({
          orderNumber: order.orderNumber,
          returnOrigin: payload.returnOrigin,
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
    if (guestCredentials) orderJson.guestAccess = guestAccessResponse(guestCredentials);
    return orderJson;
  }

  /**
   * One order. Staff see everything; a customer sees their own order (linked to their account) in full.
   * Anyone else gets 404, so order numbers reveal nothing. Guests use their private tracking code instead.
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
    if (!user?.isStaff && !ownsOrder(order, user)) throw ApiError.notFound("Order not found.");

    const shipment = await Shipment.findOne({ orderNumber: order.orderNumber }).lean();
    const fullOrder = order.toJSON();
    if (user?.isStaff) {
      fullOrder.shipment = shipment || null;
      fullOrder.adminNotes = (order.adminNotes || []).map((n) => ({
        id: n._id.toString(),
        text: n.text,
        authorName: n.authorName,
        createdAt: n.createdAt,
      }));
      fullOrder.guestTracking = {
        active: Boolean(order.guestAccess?.trackingTokenHash) && !order.guestAccess?.trackingRevokedAt,
        issuedAt: order.guestAccess?.trackingIssuedAt || null,
        revokedAt: order.guestAccess?.trackingRevokedAt || null,
        claimedAt: order.guestAccess?.claimedAt || null,
      };
    } else {
      delete fullOrder.shippingLabelUrl;
      fullOrder.shipment = toPublicShipment(shipment);
    }
    return fullOrder;
  }

  /**
   * Structured invoice data for an order, built only from the pricing snapshot saved when the order was placed
   * (never from today's settings), so it always matches what was charged. The customer who owns the order and
   * staff can read it.
   */
  async getInvoice(orderNumber, user) {
    const order = await Order.findOne({ orderNumber });
    if (!order || (!user?.isStaff && !ownsOrder(order, user))) throw ApiError.notFound("Order not found.");

    const settings = await settingsService.get();
    const p = order.pricing || {};
    const exclusive = p.gstMode === "exclusive";
    const snapshot = Number(p.sellingSubtotalPaise) > 0 && (order.items || []).every((it) => Number(it.mrpUnitPaise) > 0);

    const lines = (order.items || []).map((it) => {
      const discountPaise = it.discountPaise || 0;
      const netPaise = (it.lineTotalPaise || 0) - discountPaise;
      return {
        name: it.name,
        size: it.size,
        sku: it.sku,
        hsnCode: it.hsnCode || "",
        quantity: it.quantity,
        unitPricePaise: it.unitPricePaise,
        discountPaise,
        taxablePaise: snapshot ? it.taxablePaise : null,
        gstRate: snapshot ? it.gstRate : null,
        taxPaise: snapshot ? it.taxPaise : null,
        totalPaise: snapshot ? netPaise + (exclusive ? it.taxPaise || 0 : 0) : netPaise,
      };
    });

    const shippingPaise = p.shippingPaise || 0;
    const shippingTaxPaise = p.shippingTaxPaise || 0;
    const shipping = {
      description: p.deliveryMethod === "express" ? "Express delivery" : "Delivery",
      standardPaise: p.standardShippingPaise ?? shippingPaise,
      expressSurchargePaise: p.expressSurchargePaise || 0,
      freeShippingApplied: Boolean(p.freeShippingApplied),
      zone: p.zoneName || "",
      taxRate: p.shippingTaxRate || 0,
      taxPaise: shippingTaxPaise,
      totalPaise: shippingPaise + (exclusive ? shippingTaxPaise : 0),
    };

    // Delivery is part of the taxable value only when a GST rate has been set for it
    const shippingTaxable = shippingTaxPaise > 0 ? (exclusive ? shippingPaise : shippingPaise - shippingTaxPaise) : 0;
    const grossTotalPaise = lines.reduce((sum, l) => sum + l.totalPaise, 0) + shipping.totalPaise;
    const gstin = settings.tax?.gstinNumber || "";
    return {
      orderNumber: order.orderNumber,
      invoiceNumber: `${settings.tax?.invoicePrefix || "DA"}-${order.orderNumber}`,
      invoiceDate: order.createdAt,
      isTaxInvoice: Boolean(gstin),
      seller: {
        name: settings.tax?.legalName || settings.general?.storeName || "",
        gstin,
        address: settings.general?.dispensaryAddress || "",
        state: settings.shipping?.originState || "",
      },
      buyer: {
        name: order.customer?.name,
        email: order.customer?.email,
        phone: order.customer?.phone,
        address: {
          street: order.shippingAddress?.street,
          line2: order.shippingAddress?.line2 || "",
          city: order.shippingAddress?.city,
          state: order.shippingAddress?.state,
          pincode: order.shippingAddress?.pincode,
        },
      },
      placeOfSupply: order.shippingAddress?.state,
      taxType: p.taxType,
      priceMode: snapshot ? p.gstMode || "inclusive" : "inclusive",
      lines,
      shipping,
      totals: {
        taxableValuePaise: snapshot ? (p.taxableValuePaise || 0) + shippingTaxable : null,
        cgstPaise: p.cgstPaise || 0,
        sgstPaise: p.sgstPaise || 0,
        igstPaise: p.igstPaise || 0,
        totalTaxPaise: p.taxPaise || 0,
        discountPaise: lines.reduce((sum, l) => sum + l.discountPaise, 0),
        grossTotalPaise, // everything the customer is billed
        storeCreditPaise: p.storeCreditPaise || 0,
        amountPayablePaise: p.totalPaise || 0, // after any store credit: what is paid by card / UPI / cash
      },
      paymentMethod: order.paymentMethod,
      paymentStatus: order.paymentStatus,
      snapshot,
    };
  }

  /**
   * An order the signed-in customer owns (404 for anyone else's, so existence isn't revealed)
   */
  async getOwnedOrder(orderNumber, user) {
    const order = await Order.findOne({ orderNumber });
    if (!ownsOrder(order, user)) throw ApiError.notFound("Order not found.");

    const shipment = await Shipment.findOne({ orderNumber: order.orderNumber }).lean();
    const res = order.toJSON();
    delete res.shippingLabelUrl;
    res.shipment = toPublicShipment(shipment);
    return res;
  }

  /**
   * Private tracking for orders placed without an account. The tracking code is the proof (it is random and
   * unrelated to the order number, phone or email); when an order number is also given it must match.
   * Every failure looks the same, so nothing can be learnt by guessing.
   */
  async trackByCode({ code, orderNumber = null }) {
    const normalized = normalizeTrackingCode(code);
    const notFound = () => ApiError.notFound("We couldn't find an order with these details. Check the order ID and tracking code.");
    if (!normalized) throw notFound();

    const order = await Order.findOne({ "guestAccess.trackingTokenHash": hashToken(normalized) });
    if (!order || order.guestAccess?.trackingRevokedAt) throw notFound();
    if (orderNumber && String(orderNumber).trim().toUpperCase() !== order.orderNumber.toUpperCase()) throw notFound();

    const shipment = await Shipment.findOne({ orderNumber: order.orderNumber }).lean();
    const view = toTrackingView(order, shipment);
    // Can this order still be linked to an account? (The claim token itself is never echoed back)
    view.claimable =
      !order.userId &&
      Boolean(order.guestAccess?.claimTokenHash) &&
      Boolean(order.guestAccess?.claimExpiresAt) &&
      order.guestAccess.claimExpiresAt > new Date();
    return view;
  }

  /**
   * Link a guest order to the signed-in customer's account with its one-time claim token.
   * Atomic: the token is consumed in the same write that sets the owner, so two accounts can never both
   * claim it, and a used, expired or unknown token gets the same answer.
   */
  async claimGuestOrder({ claimToken, user }) {
    if (!user?._id) throw ApiError.unauthorized("Please sign in to add this order to your account.");
    if (user.isStaff) throw ApiError.forbidden("Staff accounts cannot take ownership of customer orders.");
    const invalid = () => ApiError.badRequest("This link has expired or was already used. Your order is safe; you can still track it with your tracking code.");
    if (!isWellFormedClaimToken(claimToken)) throw invalid();

    const now = new Date();
    const order = await Order.findOneAndUpdate(
      {
        "guestAccess.claimTokenHash": hashToken(claimToken),
        "guestAccess.claimExpiresAt": { $gt: now },
        "guestAccess.claimedAt": null,
        userId: null,
      },
      {
        $set: { userId: user._id, "guestAccess.claimedAt": now, "guestAccess.claimedBy": user._id },
        $unset: { "guestAccess.claimTokenHash": "" },
        $push: { timeline: { status: "Linked to customer account", time: now, completed: true, note: "" } },
      },
      { new: true }
    );
    if (!order) throw invalid();

    await logAudit({
      actorId: user._id,
      actorName: user.name || user.email,
      actorRole: "Customer",
      action: "order.claimed",
      module: "orders",
      targetId: order.orderNumber,
      details: `Guest order ${order.orderNumber} linked to the customer's account with its one-time claim link`,
      after: { userId: String(user._id) },
    }).catch(() => {});
    return order.toJSON();
  }

  /**
   * Staff: replace an order's private tracking code (the old link stops working at once).
   * Returns the new code so it can be shared with the customer.
   */
  async regenerateTrackingCode(orderNumber, staffUser) {
    const order = await Order.findOne({ orderNumber });
    if (!order) throw ApiError.notFound("Order not found.");
    const { plain, stored } = issueGuestCredentials({ withClaim: false });
    await Order.updateOne(
      { _id: order._id },
      {
        $set: {
          "guestAccess.trackingTokenHash": stored.trackingTokenHash,
          "guestAccess.trackingIssuedAt": stored.trackingIssuedAt,
          "guestAccess.trackingRevokedAt": null,
        },
      }
    );
    await logAudit({
      actorId: staffUser?._id || null,
      actorName: staffUser?.name || staffUser?.email || "Staff",
      actorRole: staffUser?.role || "Staff",
      action: "order.tracking_code_regenerated",
      module: "orders",
      targetId: order.orderNumber,
      details: `New private tracking link issued for ${order.orderNumber}; the previous link no longer works`,
    }).catch(() => {});
    return { orderNumber: order.orderNumber, trackingCode: formatTrackingCode(plain.trackingCode) };
  }

  /** Staff: switch off an order's private tracking link without issuing a new one */
  async revokeTrackingCode(orderNumber, staffUser) {
    const order = await Order.findOneAndUpdate(
      { orderNumber },
      { $set: { "guestAccess.trackingRevokedAt": new Date() } },
      { new: true }
    );
    if (!order) throw ApiError.notFound("Order not found.");
    await logAudit({
      actorId: staffUser?._id || null,
      actorName: staffUser?.name || staffUser?.email || "Staff",
      actorRole: staffUser?.role || "Staff",
      action: "order.tracking_code_revoked",
      module: "orders",
      targetId: order.orderNumber,
      details: `Private tracking link for ${order.orderNumber} switched off`,
    }).catch(() => {});
    return { orderNumber: order.orderNumber, revokedAt: order.guestAccess.trackingRevokedAt };
  }

  /** Staff: add a private note to an order (never shown to the customer) */
  async addAdminNote(orderNumber, text, staffUser) {
    const clean = String(text || "").trim();
    if (!clean) throw ApiError.badRequest("Please write a note.");
    if (clean.length > 2000) throw ApiError.badRequest("Notes can be at most 2000 characters.");
    const note = { text: clean, authorId: staffUser?._id || null, authorName: staffUser?.name || staffUser?.email || "Staff", createdAt: new Date() };
    const order = await Order.findOneAndUpdate(
      { orderNumber },
      { $push: { adminNotes: { $each: [note], $position: 0 } } },
      { new: true }
    );
    if (!order) throw ApiError.notFound("Order not found.");
    const saved = order.adminNotes[0];
    return { id: saved._id.toString(), text: saved.text, authorName: saved.authorName, createdAt: saved.createdAt };
  }

  /**
   * List customer's own orders (linked to their account; never matched by email alone)
   */
  async getCustomerOrders(userId) {
    const orders = await Order.find({ userId }).sort({ createdAt: -1 });
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
    const stockLines = stockLinesOf(order); // units cancelled earlier were already released
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
      order.refundStatus = status === "SUCCESS" ? "completed" : "processing"; // what the customer and admin screens show
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
      order.refundStatus = "failed";
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
  async expireUnpaidOrders({ olderThanMs = PAYMENT_WINDOW_MS + 5 * 60 * 1000 } = {}) {
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
    // The units still on the order, worked out before the lines are marked cancelled below
    // (units cancelled earlier were already released)
    const stockToRelease = stockLinesOf(order);
    await this.cancelCourierShipment(order);
    order.status = ORDER_STATUS.CANCELLED;
    order.cancellationStatus = "cancelled";
    order.cancelledAt = new Date();
    order.cancellationReason = reason || "Cancelled by request";
    for (const it of order.items || []) {
      it.cancelledQuantity = it.quantity;
      it.isCancelled = true;
      it.cancelledAt = new Date();
    }
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
      await this.settleStockOnCancel(order, stockToRelease, staffUser?.id);
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

