/**
 * Order lines after partial cancellations. A cancelled unit was already released (or restocked) when it was
 * cancelled, so everything that happens later (delivery, final cancellation, courier booking, parcel weight)
 * must use what is still left on the order, never the quantity originally ordered.
 */
export const remainingQuantity = (item) =>
  Math.max(0, (Number(item?.quantity) || 0) - (Number(item?.cancelledQuantity) || 0));

/** Stock lines for the units still on the order */
export const stockLinesOf = (order) =>
  (order.items || [])
    .filter((i) => i.variantId)
    .map((i) => ({ variantId: i.variantId, productId: i.productId, sku: i.sku, quantity: remainingQuantity(i) }))
    .filter((l) => l.quantity > 0);

/**
 * What a COD parcel must collect / what the order is still worth after partial cancellations: the order total
 * less the cancelled units' value (their price, less their share of discounts, plus their GST when GST was
 * added on top). Delivery stays charged. Orders placed before the pricing snapshot use the unit price.
 */
export const cancelledValuePaise = (order) => {
  const exclusive = order.pricing?.gstMode === "exclusive";
  return (order.items || []).reduce((sum, it) => {
    const cancelled = Number(it.cancelledQuantity) || 0;
    const qty = Number(it.quantity) || 0;
    if (cancelled <= 0 || qty <= 0) return sum;
    const gross = (Number(it.unitPricePaise) || 0) * cancelled;
    if (!(Number(it.mrpUnitPaise) > 0)) return sum + gross;
    const discount = Math.round(((Number(it.discountPaise) || 0) * cancelled) / qty);
    const tax = exclusive ? Math.round(((Number(it.taxPaise) || 0) * cancelled) / qty) : 0;
    return sum + gross - discount + tax;
  }, 0);
};

export const amountDueAfterCancellationsPaise = (order) =>
  Math.max(0, (Number(order.pricing?.totalPaise) || 0) - cancelledValuePaise(order));
