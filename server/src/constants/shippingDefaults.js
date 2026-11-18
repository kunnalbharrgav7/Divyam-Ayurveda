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

/**
 * matchType: "origin" = the dispatch state itself, "states" = the listed destination states,
 * "rest" = every state not matched by another zone.
 *
 * The recommended starting point is three zones: Local (the dispatch state), Rest of India and Remote.
 * Everything here is only a starting point for a settings record without zone rules; the admin edits it in
 * Settings -> Shipping & Tax and the saved values are what count.
 */
export const defaultZones = () => [
  { id: "zone-local", name: "Local (dispatch state)", tier: "Local", description: "Deliveries inside the dispatch state", baseFee: 40, freeThreshold: 499, deliveryDays: "1–3 business days", matchType: "origin", states: [], enabled: true },
  { id: "zone-rest", name: "Rest of India", tier: "Rest of India", description: "Every other state and union territory", baseFee: 80, freeThreshold: 799, deliveryDays: "3–6 business days", matchType: "rest", states: [], enabled: true },
  { id: "zone-remote", name: "Remote locations", tier: "Remote", description: "North-East, Jammu & Kashmir, Ladakh and island territories", baseFee: 120, freeThreshold: 1299, deliveryDays: "5–9 business days", matchType: "states", states: REMOTE_STATES, enabled: true },
];
