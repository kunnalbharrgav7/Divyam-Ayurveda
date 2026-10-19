import mongoose from "mongoose";

const cartItemSchema = new mongoose.Schema({
  variantId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "ProductVariant",
    required: true,
  },
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Product",
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
    default: 1,
  },
});

const cartSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      sparse: true,
      index: true,
    },
    guestTokenHash: {
      type: String,
      sparse: true,
      index: true,
    },
    items: [cartItemSchema],
    couponCode: {
      type: String,
      default: null,
      trim: true,
      uppercase: true,
    },
    referralCode: {
      type: String,
      default: null,
      trim: true,
      uppercase: true,
    },
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 day TTL
      index: { expires: 0 },
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

export const Cart = mongoose.model("Cart", cartSchema);

