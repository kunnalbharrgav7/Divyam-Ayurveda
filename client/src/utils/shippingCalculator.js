/**
 * Shipping & Tax (GST) Dynamic Engine for Indian E-Commerce
 * Handles Zone allocation, Distance tiers, Free shipping thresholds,
 * and Indian GST compliance (Intra-state CGST+SGST vs Inter-state IGST).
 */

export const INDIAN_STATES = [
  "Andhra Pradesh",
  "Arunachal Pradesh",
  "Assam",
  "Bihar",
  "Chhattisgarh",
  "Goa",
  "Gujarat",
  "Haryana",
  "Himachal Pradesh",
  "Jharkhand",
  "Karnataka",
  "Kerala",
  "Madhya Pradesh",
  "Maharashtra",
  "Manipur",
  "Meghalaya",
  "Mizoram",
  "Nagaland",
  "Odisha",
  "Punjab",
  "Rajasthan",
  "Sikkim",
  "Tamil Nadu",
  "Telangana",
  "Tripura",
  "Uttar Pradesh",
  "Uttarakhand",
  "West Bengal",
  "Andaman and Nicobar Islands",
  "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu",
  "Delhi",
  "Jammu and Kashmir",
  "Ladakh",
  "Lakshadweep",
  "Puducherry",
];

// Special/Remote States & Territories (Zone 4)
export const REMOTE_STATES = [
  "Jammu and Kashmir",
  "Ladakh",
  "Assam",
  "Meghalaya",
  "Arunachal Pradesh",
  "Manipur",
  "Mizoram",
  "Nagaland",
  "Tripura",
  "Sikkim",
  "Andaman and Nicobar Islands",
  "Lakshadweep",
];

// Regional Neighbors by origin state
export const NEIGHBOR_STATES_MAP = {
  Karnataka: [
    "Tamil Nadu",
    "Kerala",
    "Andhra Pradesh",
    "Telangana",
    "Maharashtra",
    "Goa",
    "Puducherry",
  ],
  Maharashtra: [
    "Gujarat",
    "Madhya Pradesh",
    "Chhattisgarh",
    "Telangana",
    "Karnataka",
    "Goa",
    "Dadra and Nagar Haveli and Daman and Diu",
  ],
  "Delhi": [
    "Haryana",
    "Uttar Pradesh",
    "Punjab",
    "Rajasthan",
    "Chandigarh",
    "Uttarakhand",
  ],
  "Uttar Pradesh": [
    "Delhi",
    "Haryana",
    "Rajasthan",
    "Madhya Pradesh",
    "Bihar",
    "Uttarakhand",
  ],
  "Uttarakhand": [
    "Uttar Pradesh",
    "Himachal Pradesh",
    "Haryana",
    "Delhi",
    "Punjab",
  ],
};

// Built-in zones, used only until the store's saved zones arrive from the API (or if none are saved).
// "origin" = the dispatch state, "states" = the listed states, "rest" = every other state.
export const DEFAULT_SHIPPING_ZONES = [
  { id: "zone-1", name: "Zone 1 (Local / Intra-State)", tier: "Local", description: "Fast intra-state delivery within dispatch home state", baseFee: 40, freeThreshold: 499, deliveryDays: "1–2 Business Days", matchType: "origin", states: [] },
  { id: "zone-2", name: "Zone 2 (Regional)", tier: "Regional", description: "Neighboring states & contiguous transit hubs", baseFee: 65, freeThreshold: 699, deliveryDays: "2–4 Business Days", matchType: "states", states: NEIGHBOR_STATES_MAP.Karnataka },
  { id: "zone-3", name: "Zone 3 (National)", tier: "National", description: "Rest of India major cities, metros and towns", baseFee: 90, freeThreshold: 899, deliveryDays: "4–6 Business Days", matchType: "rest", states: [] },
  { id: "zone-4", name: "Zone 4 (Special / Remote)", tier: "Remote", description: "North-East states, J&K, Ladakh, and Island territories", baseFee: 140, freeThreshold: 1299, deliveryDays: "6–9 Business Days", matchType: "states", states: REMOTE_STATES },
];

const norm = (s) => String(s || "").trim().toLowerCase();

/**
 * Zone for a destination state, from the zones saved in Admin -> Settings: the dispatch-state zone,
 * then a zone that lists the state, then the "all other states" zone. (Same rule the server applies.)
 */
export const resolveShippingZone = (destinationState, originState = "Karnataka", zones = DEFAULT_SHIPPING_ZONES) => {
  const list = Array.isArray(zones) && zones.length > 0 ? zones : DEFAULT_SHIPPING_ZONES;
  const dest = norm(destinationState);
  if (dest && dest === norm(originState)) {
    const origin = list.find((z) => z.matchType === "origin");
    if (origin) return origin;
  }
  const listed = list.find((z) => z.matchType === "states" && (z.states || []).some((st) => norm(st) === dest));
  if (listed) return listed;
  return list.find((z) => z.matchType === "rest") || list[list.length - 1];
};

/**
 * Calculate dynamic shipping fee and GST tax breakdown
 *
 * @param {Object} params
 * @param {string} params.destinationState Customer destination state
 * @param {number} params.subtotal Cart subtotal amount in INR
 * @param {string} params.deliveryMethod "standard" or "express"
 * @param {Object} params.settings Configured store settings
 * @returns {Object} Full calculation breakdown
 */
export const calculateShippingAndTax = ({
  destinationState = "Karnataka",
  subtotal = 0,
  deliveryMethod = "standard",
  settings = {},
}) => {
  const originState = settings?.shipping?.originState || "Karnataka";
  const zones = settings?.shipping?.zones;
  const gstRate = Number(settings?.tax?.standardGstRate ?? 12);
  const expressFee = Number(settings?.shipping?.expressShippingFee ?? 99);

  // 1. Resolve zone from the saved zone rules
  const activeZone = resolveShippingZone(destinationState, originState, zones);

  const baseFee = Number(activeZone.baseFee) || 0;
  const freeThreshold = Number(activeZone.freeThreshold) || 0;
  const isFreeEligible = subtotal >= freeThreshold;

  // Express adds the flat express fee on top of the zone fee (which is waived above the free-delivery minimum)
  let baseShippingFee = isFreeEligible ? 0 : baseFee;
  if (deliveryMethod === "express") baseShippingFee += expressFee;

  const amountNeededForFree = isFreeEligible ? 0 : Math.max(0, freeThreshold - subtotal);
  const progressPercent = freeThreshold > 0 ? Math.min(100, Math.round((subtotal / freeThreshold) * 100)) : 100;

  // 2. GST Tax Breakdown
  const isIntraState = norm(destinationState) === norm(originState);

  let totalTax = 0;
  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;

  // Prices are GST-inclusive: extract the tax component
  totalTax = Math.round(subtotal - subtotal / (1 + gstRate / 100));

  if (isIntraState) {
    const halfRate = gstRate / 2;
    cgstAmount = Math.round(totalTax / 2);
    sgstAmount = totalTax - cgstAmount;
    return {
      originState,
      destinationState,
      zone: activeZone,
      shippingFee: baseShippingFee,
      isFreeShipping: isFreeEligible && deliveryMethod !== "express",
      amountNeededForFree,
      freeThreshold,
      progressPercent,
      estimatedDelivery:
        deliveryMethod === "express"
          ? "Next-Day Priority Air"
          : activeZone.deliveryDays,
      taxType: "INTRA_STATE",
      taxLabel: `Intra-State GST (${gstRate}%)`,
      totalTax,
      gstRate,
      cgstRate: halfRate,
      cgstAmount,
      sgstRate: halfRate,
      sgstAmount,
      igstRate: 0,
      igstAmount: 0,
    };
  } else {
    igstAmount = totalTax;
    return {
      originState,
      destinationState,
      zone: activeZone,
      shippingFee: baseShippingFee,
      isFreeShipping: isFreeEligible && deliveryMethod !== "express",
      amountNeededForFree,
      freeThreshold,
      progressPercent,
      estimatedDelivery:
        deliveryMethod === "express"
          ? "1–2 Days Express Courier"
          : activeZone.deliveryDays,
      taxType: "INTER_STATE",
      taxLabel: `Inter-State IGST (${gstRate}%)`,
      totalTax,
      gstRate,
      cgstRate: 0,
      cgstAmount: 0,
      sgstRate: 0,
      sgstAmount: 0,
      igstRate: gstRate,
      igstAmount,
    };
  }
};

