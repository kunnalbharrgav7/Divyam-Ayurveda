import mongoose from "mongoose";
import { CANCELLATION_STATUS, CANCELLATION_TYPES } from "../constants/cancellationReasons.js";
import { toRupees } from "../utils/currency.js";

const cancellationItemSchema = new mongoose.Schema({
  orderItemId: { type: String, required: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", default: null },
  variantId: { type: mongoose.Schema.Types.ObjectId, ref: "ProductVariant", default: null },
  sku: { type: String, default: "" },
  name: { type: String, required: true },
  size: { type: String, default: "" },
  image: { type: String, default: "" },
  requestedQuantity: { type: Number, required: true, min: 1 },
  approvedQuantity: { type: Number, default: 0, min: 0 },
  unitPricePaise: { type: Number, required: true },
  allocatedDiscountPaise: { type: Number, default: 0 },
  refundAmountPaise: { type: Number, default: 0 },
});

const timelineSchema = new mongoose.Schema(
  {
    status: { type: String, required: true },
    note: { type: String, default: "" },
    by: { type: String, default: "" }, // "customer" | staff name | "system"
    at: { type: Date, default: Date.now },
  },
  { _id: false }
);

const orderCancellationSchema = new mongoose.Schema(
  {
    referenceNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    orderNumber: {
      type: String,
      required: true,
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
      email: { type: String, required: true },
      phone: { type: String, required: true },
    },
    cancellationType: {
      type: String,
      enum: Object.values(CANCELLATION_TYPES),
      default: CANCELLATION_TYPES.FULL,
      index: true,
    },
    reason: {
      type: String,
      required: true,
    },
    customerNote: {
      type: String,
      default: "",
    },
    adminNotes: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: Object.values(CANCELLATION_STATUS),
      default: CANCELLATION_STATUS.REQUESTED,
      index: true,
    },
    items: [cancellationItemSchema],
    totalRefundPaise: {
      type: Number,
      default: 0,
      min: 0,
    },
    storeCreditToRestorePaise: {
      type: Number,
      default: 0,
      min: 0,
    },
    paymentMethod: {
      type: String,
      default: "cod",
    },
    isPaid: {
      type: Boolean,
      default: false,
    },
    shipmentCancelled: {
      type: Boolean,
      default: false,
    },
    shipmentStatusAtCancellation: {
      type: String,
      default: "",
    },
    refundId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Refund",
      default: null,
    },
    internalRefundReference: {
      type: String,
      default: "",
    },
    requestedAt: {
      type: Date,
      default: Date.now,
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    rejectionReason: {
      type: String,
      default: "",
    },
    completedAt: {
      type: Date,
      default: null,
    },
    failureReason: {
      type: String,
      default: "",
    },
    timeline: [timelineSchema],
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(doc, ret) {
        ret.id = ret._id.toString();
        ret.totalRefund = toRupees(ret.totalRefundPaise || 0);
        ret.storeCreditToRestore = toRupees(ret.storeCreditToRestorePaise || 0);
        ret.items = (ret.items || []).map((it) => ({
          ...it,
          unitPrice: toRupees(it.unitPricePaise),
          allocatedDiscount: toRupees(it.allocatedDiscountPaise || 0),
          refundAmount: toRupees(it.refundAmountPaise || 0),
        }));
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

orderCancellationSchema.index({ createdAt: -1 });
orderCancellationSchema.index({ orderNumber: 1, createdAt: -1 });
orderCancellationSchema.index({ status: 1, createdAt: -1 });

export const OrderCancellation = mongoose.model("OrderCancellation", orderCancellationSchema);
