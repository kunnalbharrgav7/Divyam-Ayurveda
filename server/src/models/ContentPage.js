import mongoose from "mongoose";

// One block of a policy page: a numbered heading, body text, and optional info cards (e.g. delivery times)
const cardSchema = new mongoose.Schema(
  { title: { type: String, default: "", trim: true }, text: { type: String, default: "" } },
  { _id: false }
);

const sectionSchema = new mongoose.Schema(
  {
    heading: { type: String, required: true, trim: true },
    body: { type: String, default: "" },
    cards: { type: [cardSchema], default: [] },
  },
  { _id: false }
);

const contentPageSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, unique: true, index: true },
    // Small label above the title, and the "Last updated" line under it
    eyebrow: { type: String, default: "", trim: true },
    updatedLabel: { type: String, default: "", trim: true },
    sections: { type: [sectionSchema], default: [] },
    content: { type: String, default: "" },
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

