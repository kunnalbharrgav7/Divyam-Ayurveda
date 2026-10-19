import mongoose from "mongoose";

const ingredientSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    sanskritName: { type: String, default: "", trim: true },
    botanicalName: { type: String, default: "", trim: true },
    slug: { type: String, required: true, trim: true, unique: true, index: true },
    description: { type: String, default: "" },
    benefits: { type: [String], default: [] },
    doshaEffect: { type: String, default: "" },
    doshaBalance: { type: String, default: "" },
    partUsed: { type: String, default: "" },
    traditionalUses: { type: String, default: "" },
    featuredInProducts: { type: [String], default: [] },
    image: { type: String, default: "" },
    status: { type: String, enum: ["active", "archived"], default: "active", index: true },
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

export const Ingredient = mongoose.model("Ingredient", ingredientSchema);

