import mongoose from "mongoose";
import { INVENTORY_REASONS } from "../constants/inventoryReasons.js";

const inventoryMovementSchema = new mongoose.Schema(
  {
    variantId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ProductVariant",
      required: true,
      index: true,
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
      index: true,
    },
    delta: {
      type: Number,
      required: true, // e.g. -2 for order reservation, +10 for stock receipt
    },
    beforeStock: {
      type: Number,
      required: true,
    },
    afterStock: {
      type: Number,
      required: true,
    },
    reason: {
      type: String,
      enum: Object.values(INVENTORY_REASONS),
      required: true,
      index: true,
    },
    reference: {
      type: String, // e.g. orderNumber or PO reference
      default: "",
      index: true,
    },
    actorId: {
      type: String,
      default: "system",
      index: true,
    },
    note: {
      type: String,
      default: "",
    },
    idempotencyKey: {
      type: String,
      sparse: true,
      index: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // Immutable append-only
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

export const InventoryMovement = mongoose.model("InventoryMovement", inventoryMovementSchema);

