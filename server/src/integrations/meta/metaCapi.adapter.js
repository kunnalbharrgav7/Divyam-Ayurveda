import crypto from "crypto";
import { config } from "../../config/index.js";
import { logger } from "../../config/logger.js";

/**
 * Meta Conversions API (server-side events for Meta Ads).
 *
 * Switched off unless META_PIXEL_ID and META_CAPI_ACCESS_TOKEN are set (and always off in tests).
 * Customer details are normalised and SHA-256 hashed before they leave the server, as Meta requires.
 */

export const sha256 = (value) => crypto.createHash("sha256").update(String(value)).digest("hex");

const lower = (v) => String(v || "").trim().toLowerCase();
const lettersOnly = (v) => lower(v).replace(/[^a-z]/g, "");

// Meta wants the phone number as digits with the country code (India: 91XXXXXXXXXX)
export const normalizePhoneForMeta = (value) => {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 11 && digits.startsWith("0")) return `91${digits.slice(1)}`;
  return digits;
};

const hashed = (value) => (value ? [sha256(value)] : undefined);

/** Build Meta's user_data block. Never includes the street address. */
export const buildUserData = ({ email, phone, name, city, state, pincode, externalId, clientIp, userAgent, fbp, fbc }) => {
  const [first = "", ...rest] = String(name || "").trim().split(/\s+/);
  const userData = {
    em: hashed(lower(email)),
    ph: hashed(normalizePhoneForMeta(phone)),
    fn: hashed(lettersOnly(first)),
    ln: hashed(lettersOnly(rest.join(""))),
    ct: hashed(lettersOnly(city)),
    st: hashed(lettersOnly(state)),
    zp: hashed(String(pincode || "").trim()),
    country: hashed("in"),
    external_id: hashed(externalId ? String(externalId) : ""),
    client_ip_address: clientIp || undefined,
    client_user_agent: userAgent || undefined,
    fbp: fbp || undefined,
    fbc: fbc || undefined,
  };
  return Object.fromEntries(Object.entries(userData).filter(([, v]) => v !== undefined && !(Array.isArray(v) && !v[0])));
};

export class MetaCapiAdapter {
  get enabled() {
    return Boolean(config.META_PIXEL_ID && config.META_CAPI_ACCESS_TOKEN) && config.NODE_ENV !== "test";
  }

  /** Send one event. Resolves to { sent: boolean }; never throws, so checkout can never fail because of ads. */
  async sendEvent(event) {
    if (!this.enabled) return { sent: false, reason: "disabled" };
    const url = `https://graph.facebook.com/${config.META_GRAPH_VERSION}/${encodeURIComponent(config.META_PIXEL_ID)}/events`;
    const body = {
      data: [event],
      ...(config.META_TEST_EVENT_CODE ? { test_event_code: config.META_TEST_EVENT_CODE } : {}),
      access_token: config.META_CAPI_ACCESS_TOKEN,
    };
    try {
      const response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(8000),
      });
      if (!response.ok) {
        const text = await response.text().catch(() => "");
        logger.warn({ status: response.status, event: event.event_name, body: text.slice(0, 500) }, "Meta Conversions API rejected an event");
        return { sent: false, reason: `http_${response.status}` };
      }
      return { sent: true };
    } catch (err) {
      logger.warn({ err: err.message, event: event.event_name }, "Meta Conversions API request failed");
      return { sent: false, reason: "network" };
    }
  }
}

export const metaCapi = new MetaCapiAdapter();
