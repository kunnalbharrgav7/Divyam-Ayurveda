import { StoreSettings } from "../models/StoreSettings.js";
import { ApiError } from "../utils/apiError.js";
import { INDIAN_STATES, defaultZones } from "../constants/shippingDefaults.js";

const canonicalState = (value) =>
  INDIAN_STATES.find((s) => s.toLowerCase() === String(value || "").trim().toLowerCase());

const text = (value, label, { max = 200, required = false } = {}) => {
  const v = String(value ?? "").trim();
  if (required && !v) throw ApiError.badRequest(`${label} is required.`);
  if (v.length > max) throw ApiError.badRequest(`${label} must be at most ${max} characters.`);
  return v;
};

const money = (value, label, { max = 1000000 } = {}) => {
  const n = Number(value);
  if (value === "" || value === null || value === undefined || !Number.isFinite(n) || n < 0 || n > max) {
    throw ApiError.badRequest(`${label} must be a number between 0 and ${max}.`);
  }
  return Math.round(n * 100) / 100;
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const GSTIN_RE = /^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

const slugId = (name) =>
  `zone-${String(name).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}`.slice(0, 60);

const validateZones = (zones, originState) => {
  if (!Array.isArray(zones) || zones.length === 0) throw ApiError.badRequest("Add at least one shipping zone.");
  if (zones.length > 20) throw ApiError.badRequest("At most 20 shipping zones are allowed.");
  const seenIds = new Set();
  const seenStates = new Map();
  let restCount = 0;
  let originCount = 0;
  const cleaned = zones.map((z, i) => {
    const label = `Zone ${i + 1}`;
    const name = text(z.name, `${label} name`, { max: 80, required: true });
    const matchType = ["origin", "states", "rest"].includes(z.matchType) ? z.matchType : "states";
    let id = text(z.id, `${label} id`, { max: 60 }) || slugId(name);
    while (seenIds.has(id)) id = `${id}-${i + 1}`;
    seenIds.add(id);
    if (matchType === "rest") restCount += 1;
    if (matchType === "origin") originCount += 1;
    let states = [];
    if (matchType === "states") {
      states = [...new Set((Array.isArray(z.states) ? z.states : []).map(canonicalState))];
      if (states.some((s) => !s)) throw ApiError.badRequest(`${label} lists a state that is not recognised.`);
      if (states.length === 0) throw ApiError.badRequest(`${name} must cover at least one state.`);
      for (const s of states) {
        if (seenStates.has(s)) {
          throw ApiError.badRequest(
            `${s} is in both "${seenStates.get(s)}" and "${name}". A state can only belong to one zone.`
          );
        }
        seenStates.set(s, name);
      }
    }
    return {
      id,
      name,
      tier: text(z.tier, `${label} tier`, { max: 40 }) || "Standard",
      description: text(z.description, `${label} description`, { max: 200 }),
      baseFee: money(z.baseFee, `${name}: shipping fee`, { max: 10000 }),
      freeThreshold: money(z.freeThreshold, `${name}: free-delivery minimum`),
      deliveryDays: text(z.deliveryDays, `${label} delivery time`, { max: 60, required: true }),
      matchType,
      states,
    };
  });
  if (restCount !== 1) {
    throw ApiError.badRequest('Exactly one zone must be the "all other states" zone, so every address has a rate.');
  }
  if (originCount > 1) throw ApiError.badRequest("Only one zone can be the dispatch-state zone.");
  const origin = canonicalState(originState);
  if (origin && originCount === 1 && seenStates.has(origin)) {
    throw ApiError.badRequest(
      `${origin} is the dispatch state, so it can't also be listed in "${seenStates.get(origin)}".`
    );
  }
  return cleaned;
};

export class SettingsService {
  /** The single settings record, created from defaults if missing, with zone rules filled in for older records. */
  async get() {
    let settings = await StoreSettings.findOne();
    if (!settings) settings = await StoreSettings.create({});
    const zones = settings.shipping?.zones || [];
    const needsRules = zones.length === 0 || zones.every((z) => !z.states?.length && z.matchType === "states");
    if (needsRules) {
      const base = defaultZones(settings.shipping?.originState);
      // Keep any fees/thresholds the admin had already set on the existing zones
      settings.shipping.zones = base.map((d) => {
        const old = zones.find((z) => z.id === d.id);
        return old
          ? {
              ...d,
              name: old.name,
              tier: old.tier,
              description: old.description,
              baseFee: old.baseFee,
              freeThreshold: old.freeThreshold,
              deliveryDays: old.deliveryDays,
            }
          : d;
      });
      settings.markModified("shipping.zones");
      await settings.save();
    }
    return settings;
  }

  /** Validates and merges the sections that were sent; everything else is left untouched. */
  async update(patch = {}) {
    const settings = await this.get();
    const changed = [];

    if (patch.general) {
      const g = patch.general;
      if (g.storeName !== undefined) settings.general.storeName = text(g.storeName, "Store name", { max: 80, required: true });
      if (g.storeTagline !== undefined) settings.general.storeTagline = text(g.storeTagline, "Tagline", { max: 120 });
      if (g.contactEmail !== undefined) {
        const email = text(g.contactEmail, "Support email", { max: 120, required: true });
        if (!EMAIL_RE.test(email)) throw ApiError.badRequest("Enter a valid support email address.");
        settings.general.contactEmail = email.toLowerCase();
      }
      if (g.contactPhone !== undefined) settings.general.contactPhone = text(g.contactPhone, "Support phone", { max: 60, required: true });
      if (g.dispensaryAddress !== undefined) settings.general.dispensaryAddress = text(g.dispensaryAddress, "Address", { max: 300, required: true });
      changed.push("general");
    }

    if (patch.appearance?.bannerAnnouncementText !== undefined) {
      settings.appearance.bannerAnnouncementText = text(patch.appearance.bannerAnnouncementText, "Announcement text", {
        max: 240,
        required: true,
      });
      changed.push("announcement");
    }

    if (patch.shipping) {
      const s = patch.shipping;
      if (s.originState !== undefined) {
        const origin = canonicalState(s.originState);
        if (!origin) throw ApiError.badRequest("Choose a valid dispatch state.");
        settings.shipping.originState = origin;
        settings.tax.originState = origin; // GST place of supply follows the dispatch state
      }
      if (s.originCity !== undefined) settings.shipping.originCity = text(s.originCity, "Dispatch city", { max: 80, required: true });
      if (s.originPincode !== undefined) {
        const pin = text(s.originPincode, "Dispatch PIN code", { max: 6, required: true });
        if (!/^[1-9]\d{5}$/.test(pin)) throw ApiError.badRequest("The dispatch PIN code must be 6 digits.");
        settings.shipping.originPincode = pin;
      }
      if (s.expressShippingFee !== undefined) {
        settings.shipping.expressShippingFee = money(s.expressShippingFee, "Express delivery fee", { max: 10000 });
      }
      if (s.dispatchLeadTime !== undefined) {
        settings.shipping.dispatchLeadTime = text(s.dispatchLeadTime, "Dispatch lead time", { max: 60, required: true });
      }
      if (s.zones !== undefined || s.originState !== undefined) {
        const zones = s.zones ?? settings.shipping.zones.map((z) => z.toObject());
        settings.shipping.zones = validateZones(zones, settings.shipping.originState);
        settings.markModified("shipping.zones");
      }
      changed.push("shipping");
    }

    if (patch.tax) {
      const t = patch.tax;
      if (t.standardGstRate !== undefined) {
        const rate = Number(t.standardGstRate);
        if (!Number.isFinite(rate) || rate < 0 || rate > 40) throw ApiError.badRequest("The GST rate must be between 0 and 40.");
        settings.tax.standardGstRate = rate;
      }
      if (t.gstinNumber !== undefined) {
        const gstin = text(t.gstinNumber, "GSTIN", { max: 15 }).toUpperCase();
        if (gstin && !GSTIN_RE.test(gstin)) {
          throw ApiError.badRequest("The GSTIN format is not valid (15 characters, e.g. 29AABCD1234E1Z5).");
        }
        settings.tax.gstinNumber = gstin;
      }
      changed.push("tax");
    }

    if (patch.store) {
      const st = patch.store;
      if (st.enableCashOnDelivery !== undefined) settings.store.enableCashOnDelivery = Boolean(st.enableCashOnDelivery);
      if (st.enableOnlinePayments !== undefined) settings.store.enableOnlinePayments = Boolean(st.enableOnlinePayments);
      if (st.maxCodLimit !== undefined) settings.store.maxCodLimit = money(st.maxCodLimit, "Maximum COD order value");
      if (!settings.store.enableCashOnDelivery && !settings.store.enableOnlinePayments) {
        throw ApiError.badRequest("Keep at least one payment method turned on, or customers won't be able to check out.");
      }
      changed.push("payments");
    }

    if (patch.notifications) {
      for (const key of ["emailOnNewOrder", "smsOnDispatch", "lowStockAlerts", "dailySalesDigest"]) {
        if (patch.notifications[key] !== undefined) settings.notifications[key] = Boolean(patch.notifications[key]);
      }
      changed.push("notifications");
    }

    await settings.save();
    return { settings, changed };
  }

  /** What the storefront may know: contact details, payment options, shipping rules, GST rate, announcement. */
  async getPublic() {
    const json = (await this.get()).toJSON();
    return {
      general: {
        storeName: json.general.storeName,
        storeTagline: json.general.storeTagline,
        contactEmail: json.general.contactEmail,
        contactPhone: json.general.contactPhone,
        dispensaryAddress: json.general.dispensaryAddress,
        defaultCurrency: json.general.defaultCurrency,
      },
      store: {
        enableCashOnDelivery: json.store.enableCashOnDelivery,
        enableOnlinePayments: json.store.enableOnlinePayments,
        maxCodLimit: json.store.maxCodLimit,
        enableGuestCheckout: json.store.enableGuestCheckout,
      },
      shipping: {
        originState: json.shipping.originState,
        expressShippingFee: json.shipping.expressShippingFee,
        dispatchLeadTime: json.shipping.dispatchLeadTime,
        zones: json.shipping.zones.map(({ _id, ...zone }) => zone),
      },
      tax: {
        originState: json.shipping.originState,
        taxIncludedInPrice: json.tax.taxIncludedInPrice,
        standardGstRate: json.tax.standardGstRate,
      },
      appearance: { bannerAnnouncementText: json.appearance.bannerAnnouncementText },
    };
  }
}

export const settingsService = new SettingsService();
