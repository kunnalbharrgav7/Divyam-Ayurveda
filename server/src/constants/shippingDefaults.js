/**
 * Indian states and the built-in starting point for shipping zones. Zones are stored in the database and
 * edited in Admin → Settings; these lists only seed a settings record that has no zone rules yet.
 */
export const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana",
  "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur",
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana",
  "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal", "Andaman and Nicobar Islands", "Chandigarh",
  "Dadra and Nagar Haveli and Daman and Diu", "Delhi", "Jammu and Kashmir", "Ladakh", "Lakshadweep", "Puducherry",
];

const REMOTE_STATES = [
  "Jammu and Kashmir", "Ladakh", "Assam", "Meghalaya", "Arunachal Pradesh", "Manipur", "Mizoram", "Nagaland",
  "Tripura", "Sikkim", "Andaman and Nicobar Islands", "Lakshadweep",
];

const NEIGHBOR_STATES = {
  Karnataka: ["Tamil Nadu", "Kerala", "Andhra Pradesh", "Telangana", "Maharashtra", "Goa", "Puducherry"],
  Maharashtra: ["Gujarat", "Madhya Pradesh", "Chhattisgarh", "Telangana", "Karnataka", "Goa", "Dadra and Nagar Haveli and Daman and Diu"],
  Delhi: ["Haryana", "Uttar Pradesh", "Punjab", "Rajasthan", "Chandigarh", "Uttarakhand"],
  "Uttar Pradesh": ["Delhi", "Haryana", "Rajasthan", "Madhya Pradesh", "Bihar", "Uttarakhand"],
  Uttarakhand: ["Uttar Pradesh", "Himachal Pradesh", "Haryana", "Delhi", "Punjab"],
};

/**
 * matchType: "origin" = the dispatch state itself, "states" = the listed destination states,
 * "rest" = every state not matched by another zone.
 */
export const defaultZones = (originState = "Karnataka") => [
  { id: "zone-1", name: "Zone 1 (Local / Intra-State)", tier: "Local", description: "Intra-state delivery within the dispatch state", baseFee: 40, freeThreshold: 499, deliveryDays: "1–2 Business Days", matchType: "origin", states: [] },
  { id: "zone-2", name: "Zone 2 (Regional)", tier: "Regional", description: "Neighboring states & contiguous transit hubs", baseFee: 65, freeThreshold: 699, deliveryDays: "2–4 Business Days", matchType: "states", states: NEIGHBOR_STATES[originState] || NEIGHBOR_STATES.Karnataka },
  { id: "zone-3", name: "Zone 3 (National)", tier: "National", description: "Rest of India major cities, metros and towns", baseFee: 90, freeThreshold: 899, deliveryDays: "4–6 Business Days", matchType: "rest", states: [] },
  { id: "zone-4", name: "Zone 4 (Special / Remote)", tier: "Remote", description: "North-East states, J&K, Ladakh, and Island territories", baseFee: 140, freeThreshold: 1299, deliveryDays: "6–9 Business Days", matchType: "states", states: REMOTE_STATES },
];
