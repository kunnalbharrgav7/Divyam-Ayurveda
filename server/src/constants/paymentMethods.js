export const PAYMENT_METHODS = {
  COD: "Cash on Delivery (COD)",
  ONLINE: "Online Payment",
};

export const normalizePaymentMethod = (method) => {
  if (!method) return PAYMENT_METHODS.COD;
  const m = String(method).toLowerCase().trim();
  if (m === "cod" || m.includes("cash")) {
    return PAYMENT_METHODS.COD;
  }
  return PAYMENT_METHODS.ONLINE;
};

