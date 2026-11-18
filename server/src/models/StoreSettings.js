import mongoose from "mongoose";

const shippingZoneSchema = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true },
  tier: { type: String, default: "Standard" },
  description: { type: String, default: "" },
  baseFee: { type: Number, default: 40 },
  freeThreshold: { type: Number, default: 499 },
  deliveryDays: { type: String, default: "2–4 Business Days" },
  // "origin" = the dispatch state, "states" = the listed destination states, "rest" = everywhere else
  matchType: {
    type: String,
    enum: ["origin", "states", "rest"],
    default: "states",
  },
  states: { type: [String], default: [] },
  // A switched-off zone means "we don't deliver there" (never a silent fall-back to a cheaper rate)
  enabled: { type: Boolean, default: true },
});

// PIN-code exceptions win over state rules: e.g. one remote district inside an otherwise normal state
const pinExceptionSchema = new mongoose.Schema({
  id: { type: String, required: true },
  from: { type: String, required: true }, // 6-digit PIN, start of range
  to: { type: String, required: true }, // 6-digit PIN, end of range (same as from for a single PIN)
  zoneId: { type: String, required: true },
  note: { type: String, default: "" },
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
        default:
          "A-142 Sector 69, Noida, Gautam Buddha Nagar, Uttar Pradesh, India 201301",
      },
      defaultCurrency: { type: String, default: "INR" },
      timezone: { type: String, default: "Asia/Kolkata" },
    },
    store: {
      enableCashOnDelivery: { type: Boolean, default: true },
      enableOnlinePayments: { type: Boolean, default: true },
      maxCodLimit: { type: Number, default: 5000 },
      enableGuestCheckout: { type: Boolean, default: true },
      enableReviewModeration: { type: Boolean, default: true },
      lowStockThreshold: { type: Number, default: 10 },
      notifyLowStock: { type: Boolean, default: true },
    },
    shipping: {
      originCountry: { type: String, default: "India" },
      originState: { type: String, default: "Uttar Pradesh" },
      originCity: { type: String, default: "Noida" },
      originPincode: { type: String, default: "201301" },
      standardShippingFee: { type: Number, default: 40 },
      freeShippingThreshold: { type: Number, default: 499 },
      expressShippingFee: { type: Number, default: 99 }, // the express surcharge, added to the zone's standard fee
      expressEnabled: { type: Boolean, default: true },
      expressEstimate: { type: String, default: "1–2 business days" },
      // Offer express only where the courier confirms a fast service (their quickest delivery <= expressMaxCourierDays)
      expressRequiresCourierSupport: { type: Boolean, default: true },
      expressMaxCourierDays: { type: Number, default: 2 },
      dispatchLeadTime: { type: String, default: "24-48 Hours" },
      zones: [shippingZoneSchema],
      pinExceptions: { type: [pinExceptionSchema], default: [] },
    },
    tax: {
      originState: { type: String, default: "Uttar Pradesh" },
      // true: shelf prices already contain GST (the GST is extracted); false: GST is added on top at checkout
      taxIncludedInPrice: { type: Boolean, default: true },
      // Used for products that have no GST rate of their own
      standardGstRate: { type: Number, default: 12 },
      // How delivery charges are taxed. "none": no GST line on shipping (current behaviour).
      // "fixed": shippingGstRate % applies to the shipping charge. Confirm the right treatment with your accountant.
      shippingTaxMode: { type: String, enum: ["none", "fixed"], default: "none" },
      shippingGstRate: { type: Number, default: 0 },
      legalName: { type: String, default: "" },
      invoicePrefix: { type: String, default: "DA" },
      gstinNumber: { type: String, default: "" },
    },
    notifications: {
      emailOnNewOrder: { type: Boolean, default: true },
      smsOnDispatch: { type: Boolean, default: true },
      lowStockAlerts: { type: Boolean, default: true },
      dailySalesDigest: { type: Boolean, default: false },
    },
    cancellationPolicy: {
      enabled: { type: Boolean, default: true },
      allowFullCancellation: { type: Boolean, default: true },
      allowPartialCancellation: { type: Boolean, default: true },
      cancellationCutoff: {
        type: String,
        enum: ["before_shipped", "before_packed", "before_pickup"],
        default: "before_shipped",
      },
      requireAdminApproval: { type: Boolean, default: false },
      automaticOnlineRefund: { type: Boolean, default: true },
      allowCancellationForCOD: { type: Boolean, default: true },
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
  },
);

export const StoreSettings = mongoose.model(
  "StoreSettings",
  storeSettingsSchema,
);
