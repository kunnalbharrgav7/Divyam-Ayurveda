import React from "react";
import { useStoreSettings } from "../../hooks/useStoreSettings";
import { formatINR } from "../../utils/formatters";

/**
 * "Free shipping from ₹X" using the lowest free-delivery minimum among the zones switched on in
 * Admin -> Settings (never a number typed into the page). Exact thresholds per address appear in the cart and checkout.
 */
export const FreeShippingNote = () => {
  const { settings } = useStoreSettings();
  const thresholds = (settings?.shipping?.zones || [])
    .filter((z) => z.enabled !== false)
    .map((z) => Number(z.freeThreshold))
    .filter((n) => n > 0);
  const from = thresholds.length ? Math.min(...thresholds) : 0;
  return <span>{from > 0 ? `Free shipping from ${formatINR(from)}` : "Free shipping on eligible orders"}</span>;
};
