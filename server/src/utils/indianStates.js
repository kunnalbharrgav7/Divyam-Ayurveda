import { INDIAN_STATES } from "../constants/shippingDefaults.js";

/**
 * One place that turns whatever a customer, an admin or an address service types for a state
 * ("Orissa", "jammu & kashmir", "NCT of Delhi") into the canonical name used by zones and GST.
 * An unrecognised name returns null: callers must refuse it instead of quietly picking a rate.
 */
const squash = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z]/g, "");

const ALIASES = {
  orissa: "Odisha",
  uttaranchal: "Uttarakhand",
  pondicherry: "Puducherry",
  nctofdelhi: "Delhi",
  newdelhi: "Delhi",
  delhincr: "Delhi",
  andamanandnicobar: "Andaman and Nicobar Islands",
  andamannicobarislands: "Andaman and Nicobar Islands",
  andamanandnicobarisland: "Andaman and Nicobar Islands",
  dadraandnagarhaveli: "Dadra and Nagar Haveli and Daman and Diu",
  damananddiu: "Dadra and Nagar Haveli and Daman and Diu",
  dadranagarhavelidamandiu: "Dadra and Nagar Haveli and Daman and Diu",
  jammuandkashmir: "Jammu and Kashmir",
  jk: "Jammu and Kashmir",
  chattisgarh: "Chhattisgarh",
};

const BY_SQUASHED = new Map(INDIAN_STATES.map((s) => [squash(s), s]));

export const canonicalState = (value) => {
  const key = squash(value);
  if (!key) return null;
  return BY_SQUASHED.get(key) || ALIASES[key] || null;
};

export const sameState = (a, b) => {
  const x = canonicalState(a);
  const y = canonicalState(b);
  return Boolean(x && y && x === y);
};

// India Post lists some regions under their former state; treat these pairs as the same place when
// checking a PIN code against the state the customer chose.
const EQUIVALENT_GROUPS = [
  ["Jammu and Kashmir", "Ladakh"],
  ["Telangana", "Andhra Pradesh"],
  ["Dadra and Nagar Haveli and Daman and Diu"],
  ["Uttarakhand", "Uttar Pradesh"],
  ["Chhattisgarh", "Madhya Pradesh"],
  ["Jharkhand", "Bihar"],
  ["Delhi", "Haryana", "Uttar Pradesh"], // NCR border PIN codes are filed under the neighbouring state
  ["Chandigarh", "Punjab", "Haryana"],
  ["Puducherry", "Tamil Nadu", "Kerala", "Andhra Pradesh"],
];

export const statesCompatible = (chosen, fromPinDirectory) => {
  const a = canonicalState(chosen);
  const b = canonicalState(fromPinDirectory);
  if (!a || !b) return true; // nothing reliable to compare against
  if (a === b) return true;
  return EQUIVALENT_GROUPS.some((g) => g.includes(a) && g.includes(b));
};

export { INDIAN_STATES };
