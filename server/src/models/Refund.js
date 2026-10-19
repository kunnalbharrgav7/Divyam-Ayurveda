import mongoose from "mongoose";
import { toRupees } from "../utils/currency.js";

const refundSchema = new mongoose.Schema(
  {
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
    returnRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ReturnRequest",
      default: null,
    },
    amountPaise: {
      type: Number,
      required: true,
      min: 1,
    },
    reason: {
      type: String,
      required: true,
    },
    provider: {
      type: String,
      enum: ["cashfree", "manual", "store_credit"],
      default: "cashfree",
    },
    // Our own unique id for this refund attempt (also sent to the gateway as refund_id)
    refundId: { type: String, index: true },
    method: { type: String, enum: ["original", "bank", "upi", "store_credit"], default: "original" },
    errorMessage: { type: String, default: "" },
    providerRefundId: {
      type: String,
      sparse: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "succeeded", "failed"],
      default: "pending",
      index: true,
    },
    staffActorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    idempotencyKey: {
      type: String,
      sparse: true,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(doc, ret) {
        ret.id = ret._id.toString();
        ret.amount = toRupees(ret.amountPaise);
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const Refund = mongoose.model("Refund", refundSchema);

