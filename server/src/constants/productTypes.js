/**
 * How a product is made and counted. The type decides the unit used for pack sizes:
 * tablets are counted ("60 Tablets"), a resin like Shilajit is weighed ("20 g"), a syrup is measured ("200 ml").
 */
export const PRODUCT_TYPES = {
  tablet: { label: "Tablet", unit: "Tablets", countable: true },
  capsule: { label: "Capsule", unit: "Capsules", countable: true },
  powder: { label: "Powder / Churna", unit: "g", countable: false },
  liquid: { label: "Syrup / Liquid / Juice", unit: "ml", countable: false },
  oil: { label: "Oil / Thailam", unit: "ml", countable: false },
  gel_cream: { label: "Gel / Cream / Balm", unit: "g", countable: false },
  resin: { label: "Resin / Paste / Avaleha", unit: "g", countable: false },
  other: { label: "Other", unit: "", countable: false },
};

export const PRODUCT_TYPE_KEYS = Object.keys(PRODUCT_TYPES);

/** "multiple" = several pack sizes to choose from; "single" = one fixed pack. */
export const SOLD_AS = ["multiple", "single"];

/** "60" + "Tablets" -> "60 Tablets"; "20" + "g" -> "20 g". */
export const buildPackLabel = (quantity, unit) => {
  const q = Number(quantity);
  if (!Number.isFinite(q) || q <= 0) return "";
  return `${q} ${String(unit || "").trim()}`.trim();
};
