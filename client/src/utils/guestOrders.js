/**
 * Orders placed without an account, remembered on this device only so the buyer can find them again:
 * order number, private tracking code and (until used or expired) the one-time claim token that links the
 * order to an account. Nothing here is ever sent anywhere except our own API, and only when the buyer acts.
 *
 * Orders are linked to an account only when the buyer explicitly asks ("Save to my account"),
 * never automatically, so a shared device can't hand one person's orders to someone else.
 */

const STORE_KEY = "divyam_guest_orders";
const PENDING_CLAIM_KEY = "divyam_pending_claim"; // sessionStorage: the order the buyer chose to save after signing in
const MAX_ORDERS = 20;

const read = () => {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter((o) => o && o.orderNumber && o.trackingCode) : [];
  } catch (_) {
    return [];
  }
};

const write = (list) => {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(list.slice(0, MAX_ORDERS)));
  } catch (_) {}
};

const notExpired = (o) => !o.claimExpiresAt || new Date(o.claimExpiresAt).getTime() > Date.now();

export const getGuestOrders = () => read();

export const getGuestOrder = (orderNumber) =>
  read().find((o) => o.orderNumber.toUpperCase() === String(orderNumber || "").toUpperCase()) || null;

export const saveGuestOrder = ({ orderNumber, trackingCode, claimToken, claimExpiresAt, total, placedAt }) => {
  if (!orderNumber || !trackingCode) return;
  const rest = read().filter((o) => o.orderNumber !== orderNumber);
  write([{ orderNumber, trackingCode, claimToken: claimToken || null, claimExpiresAt: claimExpiresAt || null, total, placedAt: placedAt || new Date().toISOString() }, ...rest]);
};

/** The claim token, if this device still holds a usable one for the order */
export const getClaimToken = (orderNumber) => {
  const o = getGuestOrder(orderNumber);
  return o && o.claimToken && notExpired(o) ? o.claimToken : null;
};

/** After a successful (or impossible) claim the token is useless: forget it, keep the tracking code */
export const forgetClaimToken = (orderNumber) => {
  write(read().map((o) => (o.orderNumber === orderNumber ? { ...o, claimToken: null, claimExpiresAt: null, linked: true } : o)));
};

export const removeGuestOrder = (orderNumber) => write(read().filter((o) => o.orderNumber !== orderNumber));

export const trackingLinkFor = (trackingCode) =>
  `${typeof window !== "undefined" ? window.location.origin : ""}/track/${String(trackingCode || "").replace(/-/g, "")}`;

// "Save to my account" before signing in: remember which order, finish after login/registration (same tab)
export const setPendingClaim = (orderNumber) => {
  try {
    sessionStorage.setItem(PENDING_CLAIM_KEY, orderNumber);
  } catch (_) {}
};

export const takePendingClaim = () => {
  try {
    const value = sessionStorage.getItem(PENDING_CLAIM_KEY);
    sessionStorage.removeItem(PENDING_CLAIM_KEY);
    return value || null;
  } catch (_) {
    return null;
  }
};
