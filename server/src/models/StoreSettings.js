import mongoose from "mongoose";

const shippingZoneSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  tier: { type: String, default: "Standard" },
  description: { type: String, default: "" },
  baseFee: { type: Number, default: 40 },
  freeThreshold: { type: Number, default: 499 },
  deliveryDays: { type: String, default: "2–4 Business Days" },
});

const storeSettingsSchema = new mongoose.Schema(
  {
    general: {
      storeName: { type: String, default: "Divyam Ayurveda" },
      storeTagline: { type: String, default: "Pure Herbal Wellness" },
      contactEmail: { type: String, default: "care@divyamayurveda.com" },
      contactPhone: { type: String, default: "+91 (080) 4567-8900" },
      dispensaryAddress: {
        type: String,
        default: "108 Botanical Garden Road, Indiranagar, Bengaluru, Karnataka 560038",
      },
      defaultCurrency: { type: String, default: "INR" },
      timezone: { type: String, default: "Asia/Kolkata" },
    },
    store: {
      enableCashOnDelivery: { type: Boolean, default: true },
      maxCodLimit: { type: Number, default: 5000 },
      enableGuestCheckout: { type: Boolean, default: true },
      enableReviewModeration: { type: Boolean, default: true },
      lowStockThreshold: { type: Number, default: 10 },
      notifyLowStock: { type: Boolean, default: true },
    },
    shipping: {
      originState: { type: String, default: "Karnataka" },
      originCity: { type: String, default: "Bengaluru" },
      originPincode: { type: String, default: "560038" },
      standardShippingFee: { type: Number, default: 40 },
      freeShippingThreshold: { type: Number, default: 499 },
      expressShippingFee: { type: Number, default: 99 },
      dispatchLeadTime: { type: String, default: "24-48 Hours" },
      zones: [shippingZoneSchema],
    },
    tax: {
      originState: { type: String, default: "Karnataka" },
      taxIncludedInPrice: { type: Boolean, default: true },
      standardGstRate: { type: Number, default: 12 },
      gstinNumber: { type: String, default: "29AABCD1234E1Z5" },
    },
    notifications: {
      emailOnNewOrder: { type: Boolean, default: true },
      smsOnDispatch: { type: Boolean, default: true },
      lowStockAlerts: { type: Boolean, default: true },
      dailySalesDigest: { type: Boolean, default: false },
    },
    appearance: {
      primaryColor: { type: String, default: "#173D2A" },
      secondaryColor: { type: String, default: "#386B40" },
      accentColor: { type: String, default: "#A9D18E" },
      bannerAnnouncementText: {
        type: String,
        default:
          "DISCOVER THE WISDOM OF AYURVEDA — Pure, classical botanical formulations crafted for modern holistic health",
      },
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

export const StoreSettings = mongoose.model("StoreSettings", storeSettingsSchema);

