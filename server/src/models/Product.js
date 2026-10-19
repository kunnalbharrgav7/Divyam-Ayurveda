import mongoose from "mongoose";
import { toRupees } from "../utils/currency.js";

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    slug: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
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
    brand: {
      type: String,
      default: "Divyam Ayurveda",
      trim: true,
    },
    brandId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Brand",
      default: null,
    },
    categoryId: {
      type: String, // Slug or string identifier for simple client mapping
      required: true,
      index: true,
    },
    categoryRef: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      default: null,
    },
    subcategoryId: {
      type: String,
      default: "",
    },
    subcategory: {
      type: String,
      default: "",
    },
    shortDescription: {
      type: String,
      default: "",
    },
    description: {
      type: String,
      default: "",
    },
    images: {
      type: [String],
      default: [],
    },
    packSize: {
      type: String,
      default: "",
    },
    productForm: {
      type: String,
      default: "",
    },
    ingredients: {
      type: [String],
      default: [],
    },
    basePricePaise: {
      type: Number,
      required: true,
      min: 0,
      index: true,
    },
    compareAtPricePaise: {
      type: Number,
      default: 0,
      min: 0,
    },
    tags: {
      type: [String],
      default: [],
      index: true,
    },
    dosha: {
      type: [String],
      default: [],
    },
    benefits: {
      type: [String],
      default: [],
    },
    dosage: {
      type: String,
      default: "",
    },
    warnings: {
      type: String,
      default: "",
    },
    productInformation: {
      storage: { type: String, default: "" },
      certifications: { type: [String], default: [] },
      origin: { type: String, default: "India" },
      shelfLife: { type: String, default: "" },
    },
    seo: {
      metaTitle: { type: String, default: "" },
      metaDescription: { type: String, default: "" },
    },
    rating: {
      type: Number,
      default: 5.0,
      min: 1,
      max: 5,
      index: true,
    },
    reviewCount: {
      type: Number,
      default: 0,
    },
    isFeatured: {
      type: Boolean,
      default: false,
      index: true,
    },
    isBestSeller: {
      type: Boolean,
      default: false,
      index: true,
    },
    isTrending: {
      type: Boolean,
      default: false,
      index: true,
    },
    isNew: {
      type: Boolean,
      default: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["active", "draft", "archived"],
      default: "active",
      index: true,
    },
  },
  {
    timestamps: true,
    suppressReservedKeysWarning: true,
    toJSON: {
      virtuals: true,
      transform(doc, ret) {
        ret.id = ret._id.toString();
        ret.price = toRupees(ret.basePricePaise);
        ret.originalPrice = toRupees(ret.compareAtPricePaise);
        ret.image = ret.images?.[0] || "";
        ret.isArchived = ret.status === "archived";
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

// Compound indexes
productSchema.index({ status: 1, categoryId: 1, isFeatured: 1 });
productSchema.index({ status: 1, basePricePaise: 1 });
productSchema.index({ status: 1, rating: -1 });

// Full text search index
productSchema.index({
  name: "text",
  shortDescription: "text",
  description: "text",
  tags: "text",
  ingredients: "text",
});

export const Product = mongoose.model("Product", productSchema);
