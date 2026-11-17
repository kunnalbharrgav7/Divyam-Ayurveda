/**
 * Meta (Facebook) Pixel + ad attribution.
 *
 * - Loads only when VITE_META_PIXEL_ID is set at build time.
 * - Remembers how the visitor arrived (fbclid, UTM tags) so the order can be attributed to the ad.
 * - Events carry an event id; the server sends the same Purchase id through the Conversions API,
 *   so Meta counts each purchase once.
 *
 * Never send passwords, tracking codes, claim tokens, emails, phone numbers or addresses through here.
 */

const PIXEL_ID = (import.meta.env.VITE_META_PIXEL_ID || "").trim();
const ATTRIBUTION_KEY = "divyam_ad_attribution";
const FIRED_KEY = "divyam_pixel_fired";
const ATTRIBUTION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // Meta's default click window

export const pixelEnabled = Boolean(PIXEL_ID);

let initialised = false;

const injectPixel = () => {
  /* eslint-disable */
  !(function (f, b, e, v, n, t, s) {
    if (f.fbq) return;
    n = f.fbq = function () {
      n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
    };
    if (!f._fbq) f._fbq = n;
    n.push = n;
    n.loaded = !0;
    n.version = "2.0";
    n.queue = [];
    t = b.createElement(e);
    t.async = !0;
    t.src = v;
    s = b.getElementsByTagName(e)[0];
    s.parentNode.insertBefore(t, s);
  })(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
  /* eslint-enable */
};

const readCookie = (name) => {
  try {
    const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
    return match ? decodeURIComponent(match[1]) : "";
  } catch (_) {
    return "";
  }
};

/** Call once at startup: remember ad click ids / UTM tags from the landing URL */
export const initMarketing = () => {
  if (typeof window === "undefined" || initialised) return;
  initialised = true;

  try {
    const params = new URLSearchParams(window.location.search);
    const fbclid = params.get("fbclid");
    const utm = {
      utmSource: params.get("utm_source") || "",
      utmMedium: params.get("utm_medium") || "",
      utmCampaign: params.get("utm_campaign") || "",
      utmContent: params.get("utm_content") || "",
      utmTerm: params.get("utm_term") || "",
    };
    if (fbclid || utm.utmSource || utm.utmCampaign) {
      const landingUrl = `${window.location.origin}${window.location.pathname}`; // no query string: it may hold ids
      const saved = {
        ...utm,
        landingUrl,
        fbc: fbclid ? `fb.1.${Date.now()}.${fbclid}` : "",
        savedAt: Date.now(),
      };
      localStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(saved));
    }
  } catch (_) {}

  // The Pixel itself loads on the first trackable page view (see trackPageView), never on private pages
};

// Pages the Pixel must never see: the admin panel, and private tracking links (the code is in the URL,
// and the Pixel reports the page URL with every event)
const isPrivatePath = (path) => path.startsWith("/admin") || path.startsWith("/track/");

let pixelLoaded = false;
const ensurePixel = () => {
  if (pixelLoaded || !PIXEL_ID) return pixelLoaded;
  injectPixel();
  window.fbq.disablePushState = true; // we report SPA page views ourselves, only on allowed pages
  window.fbq("set", "autoConfig", false, PIXEL_ID); // no automatic button/form scraping
  window.fbq("init", PIXEL_ID);
  pixelLoaded = true;
  return true;
};

/** Attribution to attach to an order (Meta browser ids + UTM tags), or {} */
export const getAttribution = () => {
  let saved = {};
  try {
    const parsed = JSON.parse(localStorage.getItem(ATTRIBUTION_KEY) || "{}");
    if (parsed.savedAt && Date.now() - parsed.savedAt < ATTRIBUTION_TTL_MS) saved = parsed;
  } catch (_) {}
  const { savedAt, ...rest } = saved;
  return {
    ...rest,
    fbp: readCookie("_fbp"),
    fbc: readCookie("_fbc") || rest.fbc || "",
    landingUrl: rest.landingUrl || (typeof window !== "undefined" ? `${window.location.origin}${window.location.pathname}` : ""),
  };
};

/** Page view on load and on every SPA navigation (skipped on private pages) */
let lastPath = null;
export const trackPageView = (path) => {
  if (!pixelEnabled || typeof window === "undefined") return;
  if (path === lastPath) return;
  lastPath = path;
  if (isPrivatePath(path) || !ensurePixel()) return;
  window.fbq("track", "PageView");
};

/**
 * Standard event. `onceKey` (optional) stops the same event firing twice in this browser,
 * e.g. a Purchase when the confirmation page is reloaded.
 */
export const trackEvent = (name, params = {}, { eventId, onceKey } = {}) => {
  if (!pixelEnabled || typeof window === "undefined") return;
  if (isPrivatePath(window.location.pathname) || !ensurePixel()) return;
  if (onceKey) {
    try {
      const fired = JSON.parse(localStorage.getItem(FIRED_KEY) || "[]");
      if (fired.includes(onceKey)) return;
      localStorage.setItem(FIRED_KEY, JSON.stringify([onceKey, ...fired].slice(0, 100)));
    } catch (_) {}
  }
  window.fbq("track", name, params, eventId ? { eventID: eventId } : undefined);
};

/** Same id the server uses for its Conversions API Purchase event (deduplication) */
export const purchaseEventId = (orderNumber) => `purchase.${orderNumber}`;

/** Pixel content params for a list of { productId, price, quantity } */
export const contentParams = (lines = [], value = undefined) => ({
  content_type: "product",
  content_ids: lines.map((l) => String(l.productId)),
  contents: lines.map((l) => ({ id: String(l.productId), quantity: l.quantity, item_price: l.price })),
  num_items: lines.reduce((sum, l) => sum + (l.quantity || 0), 0),
  currency: "INR",
  ...(value !== undefined ? { value: Math.round(Number(value) * 100) / 100 } : {}),
});
