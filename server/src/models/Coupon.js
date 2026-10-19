import mongoose from "mongoose";
import { toRupees } from "../utils/currency.js";

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    // Display name of the offer, e.g. "Diwali Festive Sale"
    title: {
      type: String,
      default: "",
      trim: true,
    },
    // Season / festival the offer belongs to, e.g. "Diwali", "Monsoon"
    occasion: {
      type: String,
      default: "",
      trim: true,
    },
    // Auto-applied offers need no code: the discount is applied to eligible carts automatically
    autoApply: {
      type: Boolean,
      default: false,
      index: true,
    },
    // "all" = every product; "products" = only the products listed in applicableProducts
    appliesTo: {
      type: String,
      enum: ["all", "products"],
      default: "all",
    },
    description: {
      type: String,
      default: "",
    },
    type: {
      type: String,
      enum: ["percentage", "fixed_amount"],
      required: true,
    },
    value: {
      type: Number,
      required: true, // percentage (e.g. 10 for 10%) or integer paise (e.g. 5000 for ₹50)
    },
    minimumOrderPaise: {
      type: Number,
      default: 0,
      min: 0,
    },
    maximumDiscountPaise: {
      type: Number,
      default: 0, // 0 = uncapped
      min: 0,
    },
    usageLimitTotal: {
      type: Number,
      default: null, // null = unlimited
    },
    usageLimitPerUser: {
      type: Number,
      default: 1,
    },
    usedCount: {
      type: Number,
      default: 0,
    },
    applicableCategories: {
      type: [String],
      default: [],
    },
    applicableProducts: {
      type: [String],
      default: [],
    },
    validFrom: {
      type: Date,
      default: Date.now,
    },
    validUntil: {
      type: Date,
      default: null, // null = never expires
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    // Public coupons are listed on the storefront Offers page; private ones are shared by code only
    isPublic: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(doc, ret) {
        ret.id = ret._id.toString();
        ret.minOrder = toRupees(ret.minimumOrderPaise);
        ret.maxDiscount = toRupees(ret.maximumDiscountPaise);
        ret.discountValue = ret.type === "fixed_amount" ? toRupees(ret.value) : ret.value;
        ret.minOrderValue = ret.minOrder;
        ret.usageCount = ret.usedCount || 0;
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const Coupon = mongoose.model("Coupon", couponSchema);

