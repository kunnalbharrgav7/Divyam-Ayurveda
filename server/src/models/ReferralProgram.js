import mongoose from "mongoose";
import { toRupees } from "../utils/currency.js";

const referralProgramSchema = new mongoose.Schema(
  {
    enabled: { type: Boolean, default: true },
    programName: { type: String, default: "Divyam Wellness Seeker Circle" },

    // What the friend gets on their first order ("percentage" of the goods, or a "fixed" rupee amount)
    refereeDiscountType: { type: String, enum: ["percentage", "fixed"], default: "percentage" },
    refereeDiscountPercent: { type: Number, default: 10, min: 0 }, // the discount value: percent, or rupees when fixed
    refereeDiscountCapPaise: { type: Number, default: 25000, min: 0 }, // 0 = no cap
    minOrderValuePaise: { type: Number, default: 49900 },

    // What the referrer earns as store credit ("fixed" rupees, or a "percent" of the friend's order)
    referrerRewardType: { type: String, default: "fixed" },
    referrerRewardPaise: { type: Number, default: 10000 },
    referrerRewardPercent: { type: Number, default: 10, min: 0, max: 100 },
    referrerRewardCapPaise: { type: Number, default: 20000, min: 0 }, // 0 = no cap

    holdDays: { type: Number, default: 7, min: 0 }, // days after delivery before the reward is paid (return window)
    maxRewardsPerMonth: { type: Number, default: 20, min: 0 }, // per referrer, 0 = unlimited
    cookieExpiryDays: { type: Number, default: 30 },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(doc, ret) {
        ret.id = ret._id.toString();
        ret.referrerReward = toRupees(ret.referrerRewardPaise);
        ret.minOrderValue = toRupees(ret.minOrderValuePaise);
        ret.refereeDiscountCap = toRupees(ret.refereeDiscountCapPaise);
        ret.referrerRewardCap = toRupees(ret.referrerRewardCapPaise);
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const ReferralProgram = mongoose.model("ReferralProgram", referralProgramSchema);

