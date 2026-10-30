/**
 * Shipping and GST rules driven by the zones and rates saved in Admin → Settings.
 * The same rules run in the browser (to show the customer a price) and here (the price that counts).
 * Amounts are in paise.
 */
const norm = (s) => String(s || "").trim().toLowerCase();

/** Picks the zone for a destination state: origin zone, then a zone listing the state, then the "rest" zone. */
export const resolveZone = (zones, destinationState, originState) => {
  const list = Array.isArray(zones) ? zones : [];
  const dest = norm(destinationState);
  if (dest && dest === norm(originState)) {
    const origin = list.find((z) => z.matchType === "origin");
    if (origin) return origin;
  }
  const listed = list.find((z) => z.matchType === "states" && (z.states || []).some((s) => norm(s) === dest));
  if (listed) return listed;
  return list.find((z) => z.matchType === "rest") || list[list.length - 1] || null;
};

/**
 * Shipping for a basket. `payablePaise` is the goods value after any coupon/offer (what the customer pays for
 * the items); free-shipping eligibility is judged on that. Express adds the flat express fee on top.
 */
export const computeShipping = ({ settings, destinationState, payablePaise, deliveryMethod = "standard" }) => {
  const shipping = settings?.shipping || {};
  const zone = resolveZone(shipping.zones, destinationState, shipping.originState);
  if (!zone) return { shippingPaise: 0, zone: null, zoneName: "Standard Delivery", isFreeEligible: false };
  const freeThresholdPaise = Math.round(Number(zone.freeThreshold || 0) * 100);
  const isFreeEligible = payablePaise >= freeThresholdPaise;
  let shippingPaise = isFreeEligible ? 0 : Math.round(Number(zone.baseFee || 0) * 100);
  let zoneName = zone.name;
  if (deliveryMethod === "express") {
    shippingPaise += Math.round(Number(shipping.expressShippingFee || 0) * 100);
    zoneName += " [Express]";
  }
  return { shippingPaise, zone, zoneName, isFreeEligible };
};

/** GST included in the (tax-inclusive) goods value, split CGST+SGST within the origin state, IGST outside it. */
export const computeTax = ({ settings, destinationState, payablePaise }) => {
  const rate = Number(settings?.tax?.standardGstRate ?? 12) / 100;
  const originState = settings?.shipping?.originState || settings?.tax?.originState;
  const totalTaxPaise = Math.round(payablePaise - payablePaise / (1 + rate));
  if (norm(destinationState) === norm(originState)) {
    const cgstPaise = Math.round(totalTaxPaise / 2);
    return { totalTaxPaise, cgstPaise, sgstPaise: totalTaxPaise - cgstPaise, igstPaise: 0, taxType: "intra_state" };
  }
  return { totalTaxPaise, cgstPaise: 0, sgstPaise: 0, igstPaise: totalTaxPaise, taxType: "inter_state" };
};
