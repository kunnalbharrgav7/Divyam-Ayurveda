import mongoose from "mongoose";
import { toRupees } from "../utils/currency.js";

export const WALLET_SOURCES = [
  "referral_reward",
  "referral_clawback",
  "refund_credit", // a return refunded to store credit
  "checkout_spend", // credit used to pay for an order
  "checkout_restore", // credit given back (order cancelled / returned)
  "admin_adjustment",
];

// Append-only record of every store-credit movement. User.storeCreditPaise is the running balance.
const walletTransactionSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: { type: String, enum: ["credit", "debit"], required: true },
    amountPaise: { type: Number, required: true, min: 1 },
    balanceAfterPaise: { type: Number, default: 0 },
    source: { type: String, enum: WALLET_SOURCES, required: true },
    reference: { type: String, default: "" }, // order number, return number or referral id
    note: { type: String, default: "" },
    // Makes a credit/debit safe to retry: the same key can only ever be applied once
    idempotencyKey: { type: String, default: null },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        ret.id = ret._id.toString();
        ret.amount = toRupees(ret.amountPaise);
        ret.balanceAfter = toRupees(ret.balanceAfterPaise);
        delete ret._id;
        delete ret.__v;
        delete ret.idempotencyKey;
        return ret;
      },
    },
  }
);

walletTransactionSchema.index({ idempotencyKey: 1 }, { unique: true, partialFilterExpression: { idempotencyKey: { $type: "string" } } });
walletTransactionSchema.index({ userId: 1, createdAt: -1 });

export const WalletTransaction = mongoose.model("WalletTransaction", walletTransactionSchema);
