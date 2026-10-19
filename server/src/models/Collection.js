import mongoose from "mongoose";

const collectionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, unique: true, index: true },
    subtitle: { type: String, default: "" },
    description: { type: String, default: "" },
    badge: { type: String, default: "Featured" },
    image: { type: String, default: "" },
    filterTag: { type: String, default: "" },
    isFeatured: { type: Boolean, default: false },
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

export const Collection = mongoose.model("Collection", collectionSchema);

