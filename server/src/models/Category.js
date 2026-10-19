import mongoose from "mongoose";

const subcategorySchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true, trim: true },
  slug: { type: String, required: true, trim: true },
  description: { type: String, default: "" },
  image: { type: String, default: "" },
});

const categorySchema = new mongoose.Schema(
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
      index: true,
    },
    shortName: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      default: "",
    },
    image: {
      type: String,
      default: "",
    },
    bannerImage: {
      type: String,
      default: "",
    },
    subcategories: [subcategorySchema],
    displayOrder: {
      type: Number,
      default: 0,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      enum: ["active", "archived"],
      default: "active",
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(doc, ret) {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const Category = mongoose.model("Category", categorySchema);

