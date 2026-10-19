import mongoose from "mongoose";
import { RETURN_REASONS, RETURN_STATUS, REFUND_METHODS } from "../constants/returnReasons.js";
import { toRupees } from "../utils/currency.js";

// Snapshot of each order line at the time of the request (full returns only: every line comes back)
const returnItemSchema = new mongoose.Schema({
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", default: null },
  variantId: { type: mongoose.Schema.Types.ObjectId, ref: "ProductVariant", default: null },
  sku: { type: String, default: "" },
  name: { type: String, required: true },
  size: { type: String, default: "" },
  image: { type: String, default: "" },
  quantity: { type: Number, required: true, min: 1 },
  unitPricePaise: { type: Number, required: true },
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

const returnRequestSchema = new mongoose.Schema(
  {
    referenceNumber: { type: String, required: true, unique: true, index: true },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: "Order", required: true, index: true },
    orderNumber: { type: String, required: true, index: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null, index: true },
    customer: {
      name: { type: String, required: true },
      email: { type: String, required: true },
      phone: { type: String, required: true },
    },
    items: [returnItemSchema],

    reasonCategory: { type: String, enum: Object.keys(RETURN_REASONS), required: true },
    reason: { type: String, default: "" }, // customer's own words
    evidenceImages: { type: [String], default: [] },
    deliveredAt: { type: Date, default: null },

    status: { type: String, enum: Object.values(RETURN_STATUS), default: RETURN_STATUS.REQUESTED, index: true },
    timeline: [timelineSchema],
    customerNote: { type: String, default: "" }, // message from the store, visible to the customer
    adminNotes: { type: String, default: "" }, // internal only

    // How the money goes back
    refundMethod: { type: String, enum: REFUND_METHODS, required: true },
    payout: {
      accountName: { type: String, default: "" },
      accountNumber: { type: String, default: "" },
      ifsc: { type: String, default: "" },
      upiId: { type: String, default: "" },
    },
    refundAmountPaise: { type: Number, default: 0, min: 0 }, // cash to refund (admin can lower it)
    creditReturnPaise: { type: Number, default: 0, min: 0 }, // store credit the customer spent on the order, given back
    refundedPaise: { type: Number, default: 0 },
    refundId: { type: mongoose.Schema.Types.ObjectId, ref: "Refund", default: null },
    restocked: { type: Boolean, default: false },
    refundedAt: { type: Date, default: null },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(doc, ret) {
        ret.id = ret._id.toString();
        ret.refundAmount = toRupees(ret.refundAmountPaise);
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const ReturnRequest = mongoose.model("ReturnRequest", returnRequestSchema);
