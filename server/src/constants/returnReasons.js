// Returns: full-order returns only, within 7 days of delivery.
export const RETURN_WINDOW_DAYS = 7;

// photo: evidence photo(s) required. opened: the product may already be opened for this reason.
export const RETURN_REASONS = {
  damaged_in_transit: { label: "Damaged in transit", photo: true, opened: true, restock: false },
  wrong_item: { label: "Wrong item received", photo: true, opened: false, restock: true },
  missing_item: { label: "Item missing from the package", photo: true, opened: false, restock: true },
  seal_broken: { label: "Seal broken / tampered packaging", photo: true, opened: true, restock: false },
  quality_issue: { label: "Quality or purity concern", photo: true, opened: true, restock: false },
  expired: { label: "Expired or near-expiry product", photo: true, opened: false, restock: false },
  not_as_described: { label: "Not as described on the website", photo: false, opened: false, restock: true },
  allergic_reaction: { label: "Allergic reaction / side effect", photo: false, opened: true, restock: false },
  delayed_delivery: { label: "Delivered too late, no longer needed", photo: false, opened: false, restock: true },
  ordered_by_mistake: { label: "Ordered by mistake (unopened)", photo: false, opened: false, restock: true },
  other: { label: "Other", photo: false, opened: false, restock: true },
};

export const RETURN_STATUS = {
  REQUESTED: "requested",
  APPROVED: "approved",
  REJECTED: "rejected",
  RECEIVED: "received",
  REFUND_PENDING: "refund_pending",
  REFUNDED: "refunded",
  CANCELLED: "cancelled",
};

// Statuses that count as an open (in-progress) return for an order
export const OPEN_RETURN_STATUSES = ["requested", "approved", "received", "refund_pending"];

export const REFUND_METHODS = ["original", "bank", "upi", "store_credit"];
