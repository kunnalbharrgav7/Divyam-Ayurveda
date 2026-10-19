import mongoose from "mongoose";

const webhookEventSchema = new mongoose.Schema(
  {
    provider: {
      type: String,
      enum: ["cashfree", "shiprocket"],
      required: true,
      index: true,
    },
    eventId: {
      type: String,
      required: true,
      index: true,
    },
    eventType: {
      type: String,
      required: true,
    },
    payloadHash: {
      type: String,
      required: true,
      index: true,
    },
    rawPayload: {
      type: mongoose.Schema.Types.Mixed,
      required: true,
    },
    status: {
      type: String,
      enum: ["processing", "processed", "failed", "duplicate"],
      default: "processing",
      index: true,
    },
    error: {
      type: String,
      default: null,
    },
    processedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Enforce unique event delivery per provider
webhookEventSchema.index({ provider: 1, eventId: 1 }, { unique: true });
webhookEventSchema.index({ provider: 1, payloadHash: 1 });

export const WebhookEvent = mongoose.model("WebhookEvent", webhookEventSchema);

