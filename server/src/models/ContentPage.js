import mongoose from "mongoose";

const contentPageSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, unique: true, index: true },
    content: { type: String, required: true },
    metaTitle: { type: String, default: "" },
    metaDescription: { type: String, default: "" },
    status: { type: String, enum: ["published", "draft"], default: "published", index: true },
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

export const ContentPage = mongoose.model("ContentPage", contentPageSchema);

