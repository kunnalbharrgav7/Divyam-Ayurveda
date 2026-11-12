// Keep in sync with server/src/constants/productTypes.js
export const PRODUCT_TYPES = {
  tablet: { label: "Tablet", unit: "Tablets", units: ["Tablets"], dosageHint: "e.g. 1-2 tablets twice daily with warm water after meals." },
  capsule: { label: "Capsule", unit: "Capsules", units: ["Capsules"], dosageHint: "e.g. 1 capsule twice daily with warm milk or water after meals." },
  powder: { label: "Powder / Churna", unit: "g", units: ["g", "kg"], dosageHint: "e.g. 1 teaspoon with warm water at bedtime." },
  liquid: { label: "Syrup / Liquid / Juice", unit: "ml", units: ["ml", "L"], dosageHint: "e.g. 15 ml twice daily, diluted with an equal quantity of water." },
  oil: { label: "Oil / Thailam", unit: "ml", units: ["ml", "L"], dosageHint: "e.g. Warm slightly and massage gently on the affected area." },
  gel_cream: { label: "Gel / Cream / Balm", unit: "g", units: ["g", "ml"], dosageHint: "e.g. Apply a thin layer on clean skin twice daily." },
  resin: { label: "Resin / Paste / Avaleha", unit: "g", units: ["g", "kg"], dosageHint: "e.g. A pea-sized portion (300-500 mg) dissolved in warm milk once daily." },
  other: { label: "Other", unit: "", units: ["g", "ml", "pcs"], dosageHint: "e.g. How much to use, how often, and with what." },
};

export const PRODUCT_TYPE_KEYS = Object.keys(PRODUCT_TYPES);

/** 60 + "Tablets" -> "60 Tablets"; empty when there is no quantity yet. */
export const buildPackLabel = (quantity, unit) => {
  const q = Number(quantity);
  if (!Number.isFinite(q) || q <= 0) return "";
  return `${q} ${String(unit || "").trim()}`.trim();
};

/** "250g" / "60 Tablets" -> { quantity: "250", unit: "g" }; null when the label is free text. */
export const parsePackLabel = (label) => {
  const m = String(label || "").trim().match(/^(\d+(?:\.\d+)?)\s*([a-zA-Z]+)$/);
  return m ? { quantity: m[1], unit: m[2] } : null;
};

/** Best-guess type for products saved before types existed. */
export const guessProductType = (text) => {
  const t = String(text || "").toLowerCase();
  if (/tablet|vati|gutika/.test(t)) return "tablet";
  if (/capsule/.test(t)) return "capsule";
  if (/oil|thailam|tailam/.test(t)) return "oil";
  if (/syrup|liquid|juice|asava|arishta|drops/.test(t)) return "liquid";
  if (/gel|cream|balm|ointment|lotion/.test(t)) return "gel_cream";
  if (/resin|shilajit|paste|avaleha|jam|honey|ghee|prash/.test(t)) return "resin";
  if (/powder|churna|granule|leaves|decoction/.test(t)) return "powder";
  return "";
};
