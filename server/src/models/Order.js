import mongoose from "mongoose";
import { ORDER_STATUS } from "../constants/orderStatus.js";
import { PAYMENT_STATUS, FULFILMENT_STATUS } from "../constants/paymentStatus.js";
import { PAYMENT_METHODS, normalizePaymentMethod } from "../constants/paymentMethods.js";
import { toRupees } from "../utils/currency.js";

const orderItemSchema = new mongoose.Schema({
  variantId: { type: mongoose.Schema.Types.ObjectId, ref: "ProductVariant", required: false, default: null },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: false, default: null },
  sku: { type: String, default: "" },
  name: { type: String, required: true },
  size: { type: String, required: true },
  image: { type: String, default: "" },
  unitPricePaise: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 },
  lineTotalPaise: { type: Number, required: true },
  weightGrams: { type: Number, default: 250 },
  cancelledQuantity: { type: Number, default: 0, min: 0 },
  isCancelled: { type: Boolean, default: false },
  cancelledAt: { type: Date, default: null },
});

const timelineEntrySchema = new mongoose.Schema({
  status: { type: String, required: true },
  time: { type: Date, default: Date.now },
  note: { type: String, default: "" },
  completed: { type: Boolean, default: true },
});

const adminNoteSchema = new mongoose.Schema({
  text: { type: String, required: true, maxlength: 2000 },
  authorId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
  authorName: { type: String, default: "Staff" },
  createdAt: { type: Date, default: Date.now },
});

const orderSchema = new mongoose.Schema(
  {
    // How the order was placed. Stays "guest" after the buyer later links it to an account.
    checkoutType: { type: String, enum: ["guest", "account"], default: "account", index: true },
    // Private access for guest orders: only SHA-256 hashes of the tracking code / claim token (see utils/guestAccess.js)
    guestAccess: {
      trackingTokenHash: { type: String, default: undefined },
      trackingIssuedAt: { type: Date, default: null },
      trackingRevokedAt: { type: Date, default: null },
      claimTokenHash: { type: String, default: undefined },
      claimExpiresAt: { type: Date, default: null },
      claimedAt: { type: Date, default: null },
      claimedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    },
    // Staff-only notes (never sent to customers)
    adminNotes: { type: [adminNoteSchema], default: [] },
    // Ad attribution captured at checkout, for Meta Conversions API matching (never sent to customers)
    attribution: {
      fbp: { type: String, default: "" },
      fbc: { type: String, default: "" },
      utmSource: { type: String, default: "" },
      utmMedium: { type: String, default: "" },
      utmCampaign: { type: String, default: "" },
      utmContent: { type: String, default: "" },
      utmTerm: { type: String, default: "" },
      landingUrl: { type: String, default: "" },
      clientIp: { type: String, default: "" },
      userAgent: { type: String, default: "" },
    },
    metaPurchaseSentAt: { type: Date, default: null },
    orderNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    customer: {
      name: { type: String, required: true },
      email: { type: String, required: true, lowercase: true, trim: true, index: true },
      phone: { type: String, required: true },
    },
    shippingAddress: {
      fullName: { type: String, required: true },
      phone: { type: String, required: true },
      street: { type: String, required: true },
      line2: { type: String, default: "" },
      city: { type: String, required: true },
      state: { type: String, required: true },
      pincode: { type: String, required: true },
    },
    items: [orderItemSchema],
    pricing: {
      subtotalPaise: { type: Number, required: true },
      couponDiscountPaise: { type: Number, default: 0 },
      referralDiscountPaise: { type: Number, default: 0 },
      shippingPaise: { type: Number, default: 0 },
      taxPaise: { type: Number, default: 0 },
      cgstPaise: { type: Number, default: 0 },
      sgstPaise: { type: Number, default: 0 },
      igstPaise: { type: Number, default: 0 },
      taxType: { type: String, default: "intra_state" },
      totalPaise: { type: Number, required: true },
      appliedCoupon: { type: String, default: null },
      storeCreditPaise: { type: Number, default: 0 }, // store credit the customer spent on this order
      referralCode: { type: String, default: null },
    },
    storeCreditRestored: { type: Boolean, default: false }, // spent credit already returned (cancellation / return)
    refundedPaise: { type: Number, default: 0 }, // cash refunded so far
    deliveredAt: { type: Date, default: null },
    // Where this order's stock is: "reserved" (held at placement), "committed" (deducted on delivery),
    // "released" (returned after cancellation) or "none" (not tracked)
    stockState: {
      type: String,
      enum: ["none", "reserved", "committed", "released"],
      default: "none",
    },
    cancellationStatus: {
      type: String,
      enum: ["none", "requested", "approved", "rejected", "partially_cancelled", "cancelled"],
      default: "none",
      index: true,
    },
    cancellationReason: {
      type: String,
      default: "",
    },
    cancelledAt: {
      type: Date,
      default: null,
    },
    refundStatus: {
      type: String,
      enum: ["not_applicable", "pending", "initiated", "processing", "completed", "failed"],
      default: "not_applicable",
      index: true,
    },
    status: {
      type: String,
      enum: Object.values(ORDER_STATUS),
      default: ORDER_STATUS.PENDING_PAYMENT,
      index: true,
    },
    paymentStatus: {
      type: String,
      default: "pending",
      index: true,
    },
    fulfilmentStatus: {
      type: String,
      enum: Object.values(FULFILMENT_STATUS),
      default: FULFILMENT_STATUS.UNFULFILLED,
      index: true,
    },
    paymentMethod: {
      type: String,
      default: PAYMENT_METHODS.COD,
      set: (val) => normalizePaymentMethod(val),
    },
    deliveryMethod: {
      type: String,
      enum: ["standard", "express"],
      default: "standard",
    },
    timeline: [timelineEntrySchema],
    notes: {
      type: String,
      default: "",
    },
    trackingNumber: {
      type: String,
      default: "",
    },
    carrier: {
      type: String,
      default: "",
    },
    trackingUrl: {
      type: String,
      default: "",
    },
    shippingLabelUrl: {
      type: String,
      default: "",
    },
    estimatedDelivery: {
      type: Date,
      default: () => new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
    },
    quoteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Quote",
      default: null,
    },
    version: {
      type: Number,
      default: 1,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(doc, ret) {
        // Placed without an account (older orders predate checkoutType, so a missing account also counts)
        ret.isGuest = ret.checkoutType === "guest" || !ret.userId;
        ret.linkedToAccountAt = ret.guestAccess?.claimedAt || null;
        // Secrets, staff notes and ad data never leave the server through the default projection
        delete ret.guestAccess;
        delete ret.adminNotes;
        delete ret.attribution;
        delete ret.metaPurchaseSentAt;
        ret.id = ret.orderNumber || ret._id.toString();
        ret.orderNumber = ret.orderNumber || ret.id;
        ret._id = ret._id.toString();
        ret.paymentMethod = normalizePaymentMethod(ret.paymentMethod);
        // Frontend compatibility projection
        ret.pricing = {
          subtotal: toRupees(ret.pricing.subtotalPaise),
          discount: toRupees(ret.pricing.couponDiscountPaise),
          referralDiscount: toRupees(ret.pricing.referralDiscountPaise),
          shipping: toRupees(ret.pricing.shippingPaise),
          tax: toRupees(ret.pricing.taxPaise),
          cgst: toRupees(ret.pricing.cgstPaise),
          sgst: toRupees(ret.pricing.sgstPaise),
          igst: toRupees(ret.pricing.igstPaise),
          total: toRupees(ret.pricing.totalPaise),
          couponCode: ret.pricing.appliedCoupon,
          storeCredit: toRupees(ret.pricing.storeCreditPaise || 0),
          referralCode: ret.pricing.referralCode,
          ...ret.pricing,
        };
        ret.refunded = toRupees(ret.refundedPaise || 0);
        ret.cancellationStatus = ret.cancellationStatus || "none";
        ret.cancellationReason = ret.cancellationReason || "";
        ret.cancelledAt = ret.cancelledAt || null;
        ret.refundStatus = ret.refundStatus || "not_applicable";
        ret.items = (ret.items || []).map((it) => ({
          ...it,
          price: toRupees(it.unitPricePaise),
          total: toRupees(it.lineTotalPaise),
          cancelledQuantity: it.cancelledQuantity || 0,
          isCancelled: Boolean(it.isCancelled),
          remainingQuantity: Math.max(0, (it.quantity || 0) - (it.cancelledQuantity || 0)),
        }));
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Compound indexes for optimized query performance
orderSchema.index({ userId: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ paymentStatus: 1, createdAt: -1 });
orderSchema.index({ "customer.email": 1, orderNumber: 1 });
// Tracking codes and claim tokens are looked up by hash; unique so two orders can never share one
orderSchema.index({ "guestAccess.trackingTokenHash": 1 }, { unique: true, sparse: true });
orderSchema.index({ "guestAccess.claimTokenHash": 1 }, { unique: true, sparse: true });

export const Order = mongoose.model("Order", orderSchema);

