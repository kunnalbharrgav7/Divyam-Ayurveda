import { config } from "../config/index.js";
import { logger } from "../config/logger.js";

/**
 * City / state for an Indian PIN code, used only to pre-fill the checkout address (the customer can edit it).
 * Source: India Post's public PIN code directory. Only the PIN code is sent; results are cached in memory.
 * Any failure simply returns { found: false } so checkout never depends on it.
 */
const cache = new Map(); // pincode -> { value, at }
const TTL_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_ENTRIES = 5000;

const titleCase = (v) =>
  String(v || "")
    .toLowerCase()
    .replace(/\b([a-z])/g, (m) => m.toUpperCase())
    .trim();

export class PincodeService {
  async lookup(pincode) {
    const pin = String(pincode || "").trim();
    if (!/^[1-9]\d{5}$/.test(pin)) return { found: false };
    const hit = cache.get(pin);
    if (hit && Date.now() - hit.at < TTL_MS) return hit.value;
    if (config.NODE_ENV === "test") return { found: false }; // no network in tests

    let value = { found: false };
    try {
      const response = await fetch(`https://api.postalpincode.in/pincode/${pin}`, {
        headers: { Accept: "application/json" },
        signal: AbortSignal.timeout(4000),
      });
      if (response.ok) {
        const json = await response.json();
        const offices = Array.isArray(json) && json[0]?.Status === "Success" ? json[0].PostOffice || [] : [];
        if (offices.length > 0) {
          const first = offices[0];
          value = {
            found: true,
            city: titleCase(first.District || first.Block || first.Name),
            state: titleCase(first.State),
            areas: [...new Set(offices.map((o) => titleCase(o.Name)).filter(Boolean))].slice(0, 15),
          };
        }
      }
    } catch (err) {
      logger.debug({ err: err.message, pin }, "PIN code lookup unavailable");
      return { found: false }; // not cached: try again next time
    }
    if (cache.size >= MAX_ENTRIES) cache.delete(cache.keys().next().value);
    cache.set(pin, { value, at: Date.now() });
    return value;
  }
}

export const pincodeService = new PincodeService();
