import mongoose from "mongoose";

const brandSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, unique: true },
    slug: { type: String, required: true, trim: true, unique: true, index: true },
    description: { type: String, default: "" },
    logo: { type: String, default: "" },
    origin: { type: String, default: "India" },
    established: { type: Number, default: null },
    certified: { type: Boolean, default: true },
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

export const Brand = mongoose.model("Brand", brandSchema);

