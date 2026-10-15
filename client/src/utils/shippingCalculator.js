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

// Default Shipping Zones Matrix
export const DEFAULT_SHIPPING_ZONES = [
  {
    id: "zone-1",
    name: "Zone 1 (Local / Intra-State)",
    tier: "Local",
    description: "Fast intra-state delivery within dispensary home state",
    baseFee: 40,
    freeThreshold: 499,
    deliveryDays: "1–2 Business Days",
  },
  {
    id: "zone-2",
    name: "Zone 2 (Regional)",
    tier: "Regional",
    description: "Neighboring states & contiguous transit hubs",
    baseFee: 65,
    freeThreshold: 699,
    deliveryDays: "2–4 Business Days",
  },
  {
    id: "zone-3",
    name: "Zone 3 (National)",
    tier: "National",
    description: "Rest of India major cities, metros and towns",
    baseFee: 90,
    freeThreshold: 899,
    deliveryDays: "4–6 Business Days",
  },
  {
    id: "zone-4",
    name: "Zone 4 (Special / Remote)",
    tier: "Remote",
    description: "North-East states, J&K, Ladakh, and Island territories",
    baseFee: 140,
    freeThreshold: 1299,
    deliveryDays: "6–9 Business Days",
  },
];

/**
 * Determine shipping zone for a given destination state and store origin state
 */
export const resolveShippingZone = (destinationState, originState = "Karnataka") => {
  if (!destinationState) {
    return DEFAULT_SHIPPING_ZONES[1]; // default to regional
  }

  const cleanDest = destinationState.trim().toLowerCase();
  const cleanOrigin = (originState || "Karnataka").trim().toLowerCase();

  // Zone 1: Same State (Intra-state)
  if (cleanDest === cleanOrigin) {
    return DEFAULT_SHIPPING_ZONES[0];
  }

  // Zone 4: Remote / Hill / Island
  const isRemote = REMOTE_STATES.some((s) => s.toLowerCase() === cleanDest);
  if (isRemote) {
    return DEFAULT_SHIPPING_ZONES[3];
  }

  // Zone 2: Regional Neighbors
  const originNeighbors = NEIGHBOR_STATES_MAP[originState] || NEIGHBOR_STATES_MAP["Karnataka"] || [];
  const isNeighbor = originNeighbors.some((s) => s.toLowerCase() === cleanDest);
  if (isNeighbor) {
    return DEFAULT_SHIPPING_ZONES[1];
  }

  // Zone 3: All other National destinations
  return DEFAULT_SHIPPING_ZONES[2];
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
  const originState = settings?.general?.dispensaryState || settings?.shipping?.originState || "Karnataka";
  const zones = settings?.shipping?.zones || DEFAULT_SHIPPING_ZONES;
  const gstRate = Number(settings?.tax?.standardGstRate) || 12;
  const taxIncluded = settings?.tax?.taxIncludedInPrice !== false;

  // 1. Resolve Zone
  const matchedZoneRule = resolveShippingZone(destinationState, originState);
  const activeZone =
    zones.find((z) => z.id === matchedZoneRule.id) || matchedZoneRule;

  const baseFee = Number(activeZone.baseFee) || 50;
  const freeThreshold = Number(activeZone.freeThreshold) || 499;
  const isFreeEligible = subtotal >= freeThreshold;

  let baseShippingFee = isFreeEligible ? 0 : baseFee;
  if (deliveryMethod === "express") {
    // Express adds flat ₹50 to standard zone fee or minimum ₹99
    baseShippingFee = isFreeEligible ? 60 : baseShippingFee + 50;
  }

  const amountNeededForFree = isFreeEligible ? 0 : Math.max(0, freeThreshold - subtotal);
  const progressPercent = Math.min(100, Math.round((subtotal / freeThreshold) * 100));

  // 2. GST Tax Breakdown
  const isIntraState =
    destinationState &&
    originState &&
    destinationState.trim().toLowerCase() === originState.trim().toLowerCase();

  let totalTax = 0;
  let cgstAmount = 0;
  let sgstAmount = 0;
  let igstAmount = 0;

  if (taxIncluded) {
    // Price includes GST: Extract included tax component
    totalTax = Math.round(subtotal - subtotal / (1 + gstRate / 100));
  } else {
    // Tax added on top
    totalTax = Math.round(subtotal * (gstRate / 100));
  }

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

