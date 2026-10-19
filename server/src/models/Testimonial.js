import mongoose from "mongoose";

const testimonialSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    location: { type: String, default: "" },
    avatar: { type: String, default: "" },
    role: { type: String, default: "Verified Customer" },
    rating: { type: Number, default: 5, min: 1, max: 5 },
    content: { type: String, required: true },
    productName: { type: String, default: "" },
    displayOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true, index: true },
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

export const Testimonial = mongoose.model("Testimonial", testimonialSchema);

