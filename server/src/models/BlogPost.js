import mongoose from "mongoose";

const blogPostSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, trim: true, unique: true, index: true },
    excerpt: { type: String, default: "" },
    content: { type: String, required: true },
    image: { type: String, default: "" },
    author: { type: String, default: "Vaidya Team" },
    category: { type: String, default: "Ayurvedic Living" },
    readTime: { type: String, default: "5 min read" },
    tags: { type: [String], default: [] },
    publishedAt: { type: Date, default: Date.now },
    status: { type: String, enum: ["published", "draft", "archived"], default: "published", index: true },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform(doc, ret) {
        ret.id = ret._id ? ret._id.toString() : ret.id;
        ret.date = ret.publishedAt
          ? new Date(ret.publishedAt).toISOString().split("T")[0]
          : (ret.createdAt ? new Date(ret.createdAt).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]);
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
    toObject: {
      virtuals: true,
      transform(doc, ret) {
        ret.id = ret._id ? ret._id.toString() : ret.id;
        ret.date = ret.publishedAt
          ? new Date(ret.publishedAt).toISOString().split("T")[0]
          : (ret.createdAt ? new Date(ret.createdAt).toISOString().split("T")[0] : new Date().toISOString().split("T")[0]);
        delete ret._id;
        delete ret.__v;
        return ret;
      },
    },
  }
);

export const BlogPost = mongoose.model("BlogPost", blogPostSchema);

