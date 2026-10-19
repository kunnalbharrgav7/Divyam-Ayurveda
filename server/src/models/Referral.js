import mongoose from "mongoose";
import { toRupees } from "../utils/currency.js";

const referralSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    referrerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    refereeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true,
    },
    refereeEmail: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    refereeName: {
      type: String,
      default: "",
    },
    qualifiedOrderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      unique: true,
      sparse: true,
    },
    orderNumber: {
      type: String,
      default: "",
    },
    orderAmountPaise: {
      type: Number,
      default: 0,
    },
    rewardAmountPaise: {
      type: Number,
      default: 0, // fixed when the friend places their first order
    },
    discountPaise: { type: Number, default: 0 }, // what the friend saved on their first order
    rewardedAt: { type: Date, default: null },
    walletTransactionId: { type: mongoose.Schema.Types.ObjectId, ref: "WalletTransaction", default: null },
    voidReason: { type: String, default: "" },
    flags: { type: [String], default: [] }, // fraud signals for the admin, e.g. "same_address"
    status: {
      type: String,
      // signed_up: linked, no order yet | ordered: first order placed, reward on hold
      // rewarded: credit paid | cancelled: order cancelled/returned before payout | clawed_back: reward taken back
      // ("pending"/"qualified" are legacy values from before the wallet existed)
      enum: ["pending", "qualified", "signed_up", "ordered", "rewarded", "cancelled", "clawed_back"],
      default: "signed_up",
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(doc, ret) {
        ret.id = ret._id.toString();
        ret.orderAmount = toRupees(ret.orderAmountPaise);
        ret.rewardAmount = toRupees(ret.rewardAmountPaise);
        ret.discount = toRupees(ret.discountPaise);
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Prevent duplicate referral attribution between same referrer and referee email
referralSchema.index({ referrerId: 1, refereeEmail: 1 }, { unique: true });
// A customer can only ever be referred once
referralSchema.index({ refereeId: 1 }, { unique: true, partialFilterExpression: { refereeId: { $type: "objectId" } } });

export const Referral = mongoose.model("Referral", referralSchema);

