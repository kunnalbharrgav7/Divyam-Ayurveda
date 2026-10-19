import mongoose from "mongoose";

const idempotencyKeySchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    path: {
      type: String,
      required: true,
    },
    actorId: {
      type: String,
      default: "anonymous",
    },
    bodyHash: {
      type: String,
      required: true,
    },
    statusCode: {
      type: Number,
      default: null,
    },
    responseBody: {
      type: mongoose.Schema.Types.Mixed,
      default: null,
    },
    status: {
      type: String,
      enum: ["processing", "completed", "failed"],
      default: "processing",
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 }, // TTL index
    },
  },
  {
    timestamps: true,
  }
);

export const IdempotencyKey = mongoose.model("IdempotencyKey", idempotencyKeySchema);

