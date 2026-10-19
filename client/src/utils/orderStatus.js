/**
 * Order statuses travel in two spellings: the API uses snake_case keys ("out_for_delivery") while the UI
 * shows labels ("Out for Delivery"). Comparing them directly silently fails for multi-word statuses, so
 * everything that reads a status should go through toStatusKey().
 */

// "Out for Delivery" / "out-for-delivery" / "out_for_delivery" -> "out_for_delivery"
export const toStatusKey = (status) => {
  const key = String(status || "").toLowerCase().trim().replace(/[\s-]+/g, "_");
  if (key === "pending") return "pending_payment";
  if (key === "shipped") return "dispatched";
  if (key === "packed") return "processing";
  return key;
};

// Position in the 5-step fulfilment journey: Placed, Packed, Dispatched, Out for Delivery, Delivered
export const STATUS_LEVEL = {
  delivered: 4,
  out_for_delivery: 3,
  dispatched: 2,
  processing: 1,
};

export const getStatusLevel = (status) => STATUS_LEVEL[toStatusKey(status)] ?? 0;

const LABELS = {
  pending_payment: "Pending",
  confirmed: "Confirmed",
  processing: "Processing",
  dispatched: "Dispatched",
  out_for_delivery: "Out for Delivery",
  delivered: "Delivered",
  cancelled: "Cancelled",
  return_requested: "Return Requested",
  returned: "Returned",
};

export const getStatusLabel = (status) => {
  const key = toStatusKey(status);
  return LABELS[key] || (key ? key.charAt(0).toUpperCase() + key.slice(1).replace(/_/g, " ") : "Pending");
};
