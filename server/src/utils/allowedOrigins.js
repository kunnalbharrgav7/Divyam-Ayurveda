import { config } from "../config/index.js";

/**
 * The storefront addresses this API trusts (CORS, and where Cashfree may send a customer back after paying).
 * The storefront is reachable with and without "www", and both must work: a customer who pays on one must come
 * back to the same one (their saved order details live in that site's browser storage).
 */
export const allowedOrigins = new Set(
  [
    config.CLIENT_ORIGIN,
    "https://divyam-ayurveda-dgha.onrender.com",
    "https://divyamayurveda.in",
    "https://www.divyamayurveda.in",
    ...(process.env.CLIENT_ORIGINS || "").split(","),
  ]
    .map((origin) => String(origin || "").trim().replace(/\/+$/, ""))
    .filter(Boolean)
);

const isLocal = (origin) => /^http:\/\/localhost:\d+$/.test(origin);

/**
 * Where Cashfree should send the customer after payment: the page they started from, only if it is one of our
 * own storefront addresses (never an address supplied by a stranger). Returns null to use the configured default.
 */
export const returnUrlFor = (returnOrigin, orderNumber) => {
  const origin = String(returnOrigin || "").trim().replace(/\/+$/, "");
  if (!origin || !orderNumber) return null;
  if (!allowedOrigins.has(origin) && !(config.NODE_ENV !== "production" && isLocal(origin))) return null;
  return `${origin}/order-confirmation/${encodeURIComponent(orderNumber)}?order_id={order_id}`;
};
