import mongoose from "mongoose";
import { PAYMENT_STATUS } from "../constants/paymentStatus.js";
import { toRupees } from "../utils/currency.js";

const paymentSchema = new mongoose.Schema(
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
    provider: {
      type: String,
      enum: ["cashfree", "cod"],
      default: "cashfree",
    },
    providerOrderId: {
      type: String, // Cashfree cf_order_id
      sparse: true,
      index: true,
    },
    providerPaymentId: {
      type: String, // Cashfree cf_payment_id
      sparse: true,
      index: true,
    },
    paymentSessionId: {
      type: String,
      default: null,
    },
    amountPaise: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: "INR",
    },
    status: {
      type: String,
      enum: Object.values(PAYMENT_STATUS),
      default: PAYMENT_STATUS.PENDING,
      index: true,
    },
    rawEventHash: {
      type: String,
      default: null,
    },
    rawWebhookPayload: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    verifiedAt: {
      type: Date,
      default: null,
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
        delete ret.rawWebhookPayload;
        return ret;
      },
    },
  }
);

export const Payment = mongoose.model("Payment", paymentSchema);

