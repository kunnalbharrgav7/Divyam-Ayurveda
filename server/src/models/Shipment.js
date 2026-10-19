import mongoose from "mongoose";

const trackingEventSchema = new mongoose.Schema({
  status: { type: String, required: true },
  activity: { type: String, default: "" },
  location: { type: String, default: "" },
  time: { type: Date, default: Date.now },
});

const shipmentSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Order",
      required: true,
      index: true,
    },
    orderNumber: {
      type: String,
      required: true,
      index: true,
    },
    provider: {
      type: String,
      default: "shiprocket",
    },
    shiprocketOrderId: {
      type: String,
      sparse: true,
      index: true,
    },
    shipmentId: {
      type: String,
      sparse: true,
      index: true,
    },
    awbCode: {
      type: String,
      sparse: true,
      index: true,
    },
    courierName: {
      type: String,
      default: "",
    },
    courierId: {
      type: String,
      default: "",
    },
    pickupLocation: {
      type: String,
      default: "Primary Dispensary",
    },
    status: {
      type: String,
      default: "CREATED",
      index: true,
    },
    trackingUrl: {
      type: String,
      default: "",
    },
    labelUrl: {
      type: String,
      default: "",
    },
    manifestUrl: {
      type: String,
      default: "",
    },
    weightGrams: {
      type: Number,
      default: 250,
    },
    trackingEvents: [trackingEventSchema],
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

export const Shipment = mongoose.model("Shipment", shipmentSchema);

