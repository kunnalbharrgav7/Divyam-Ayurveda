import mongoose from "mongoose";
import { toRupees } from "../utils/currency.js";

const quoteItemSchema = new mongoose.Schema({
  variantId: { type: mongoose.Schema.Types.ObjectId, ref: "ProductVariant", required: true },
  productId: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
  sku: { type: String, required: true },
  name: { type: String, required: true },
  label: { type: String, required: true },
  image: { type: String, default: "" },
  unitPricePaise: { type: Number, required: true },
  quantity: { type: Number, required: true, min: 1 },
  lineTotalPaise: { type: Number, required: true },
  weightGrams: { type: Number, default: 250 },
});

const quoteSchema = new mongoose.Schema(
  {
    userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },
    guestEmail: { type: String, default: null },
    items: [quoteItemSchema],
    deliveryMethod: { type: String, enum: ["standard", "express"], default: "standard" },
    shippingAddress: {
      fullName: { type: String, required: true },
      phone: { type: String, required: true },
      line1: { type: String, required: true },
      line2: { type: String, default: "" },
      city: { type: String, required: true },
      state: { type: String, required: true },
      pincode: { type: String, required: true },
    },
    subtotalPaise: { type: Number, required: true },
    couponDiscountPaise: { type: Number, default: 0 },
    appliedCoupon: { type: String, default: null },
    referralDiscountPaise: { type: Number, default: 0 },
    appliedReferralCode: { type: String, default: null },
    shippingPaise: { type: Number, default: 0 },
    taxPaise: { type: Number, default: 0 },
    cgstPaise: { type: Number, default: 0 },
    sgstPaise: { type: Number, default: 0 },
    igstPaise: { type: Number, default: 0 },
    taxType: { type: String, enum: ["intra_state", "inter_state"], default: "intra_state" },
    totalPaise: { type: Number, required: true },
    zoneName: { type: String, default: "Standard Delivery" },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 15 * 60 * 1000), // 15 minutes TTL
      index: { expires: 0 },
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(doc, ret) {
        ret.id = ret._id.toString();
        ret.quoteId = ret.id;
        ret.subtotal = toRupees(ret.subtotalPaise);
        ret.discount = toRupees(ret.couponDiscountPaise);
        ret.referralDiscount = toRupees(ret.referralDiscountPaise);
        ret.shipping = toRupees(ret.shippingPaise);
        ret.tax = toRupees(ret.taxPaise);
        ret.cgst = toRupees(ret.cgstPaise);
        ret.sgst = toRupees(ret.sgstPaise);
        ret.igst = toRupees(ret.igstPaise);
        ret.total = toRupees(ret.totalPaise);
        ret.items = (ret.items || []).map((it) => ({
          ...it,
          price: toRupees(it.unitPricePaise),
          total: toRupees(it.lineTotalPaise),
          size: it.label,
        }));
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const Quote = mongoose.model("Quote", quoteSchema);

