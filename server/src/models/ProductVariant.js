import mongoose from "mongoose";
import { toRupees } from "../utils/currency.js";

const productVariantSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    sku: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
      index: true,
    },
    label: {
      type: String,
      required: true, // e.g. "250g", "60 Tablets"
      trim: true,
    },
    pricePaise: {
      type: Number,
      required: true,
      min: 0,
    },
    compareAtPricePaise: {
      type: Number,
      default: 0,
      min: 0,
    },
    costPricePaise: {
      type: Number,
      default: 0,
      min: 0,
    },
    stockOnHand: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    reservedStock: {
      type: Number,
      default: 0,
      min: 0,
    },
    reorderThreshold: {
      type: Number,
      default: 10,
      min: 0,
    },
    weightGrams: {
      type: Number,
      default: 250,
      min: 0,
    },
    dimensions: {
      lengthCm: { type: Number, default: 10 },
      widthCm: { type: Number, default: 10 },
      heightCm: { type: Number, default: 10 },
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(doc, ret) {
        ret.id = ret._id.toString();
        ret.price = toRupees(ret.pricePaise);
        ret.originalPrice = toRupees(ret.compareAtPricePaise);
        ret.size = ret.label;
        ret.availableStock = Math.max(0, (ret.stockOnHand || 0) - (ret.reservedStock || 0));
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Virtual for available stock
productVariantSchema.virtual("availableStock").get(function () {
  return Math.max(0, (this.stockOnHand || 0) - (this.reservedStock || 0));
});

export const ProductVariant = mongoose.model("ProductVariant", productVariantSchema);

