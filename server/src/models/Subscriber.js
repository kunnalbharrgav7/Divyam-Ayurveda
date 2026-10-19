import mongoose from "mongoose";

const subscriberSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    source: {
      type: String,
      default: "footer_newsletter",
    },
    status: {
      type: String,
      enum: ["subscribed", "unsubscribed"],
      default: "subscribed",
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

export const Subscriber = mongoose.model("Subscriber", subscriberSchema);

