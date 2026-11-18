import { canonicalState, sameState } from "./indianStates.js";

/**
 * Where a parcel is going, according to the zones and PIN-code exceptions saved in Admin -> Settings.
 * Pure functions (no database, no network). Amounts are handled in services/pricing.service.js.
 *
 * Precedence (first match wins, always the same order):
 *   1. PIN-code exception (a range, narrowest range first)
 *   2. the dispatch-state zone ("origin")
 *   3. a zone that lists the state
 *   4. the "rest" zone
 * A destination is never quietly given a cheaper rate: an unknown state or a switched-off zone is refused.
 */
export const isValidPin = (pin) => /^[1-9]\d{5}$/.test(String(pin || ""));

const pinNumber = (pin) => Number.parseInt(String(pin), 10);

export const findPinException = (exceptions, pincode) => {
  if (!isValidPin(pincode)) return null;
  const pin = pinNumber(pincode);
  const hits = (Array.isArray(exceptions) ? exceptions : []).filter((e) => pin >= pinNumber(e.from) && pin <= pinNumber(e.to));
  if (hits.length === 0) return null;
  // Narrowest range wins so a single-PIN rule beats a wider range, deterministically
  return hits.sort((a, b) => pinNumber(a.to) - pinNumber(a.from) - (pinNumber(b.to) - pinNumber(b.from)) || String(a.id).localeCompare(String(b.id)))[0];
};

/**
 * @returns {{ ok: true, zone, via: "pin"|"origin"|"state"|"rest", state: string }
 *          | { ok: false, code: string, message: string }}
 */
export const resolveDestination = ({ settings, state, pincode = null }) => {
  const shipping = settings?.shipping || {};
  const zones = Array.isArray(shipping.zones) ? shipping.zones : [];
  const dest = canonicalState(state);
  if (!dest) {
    return { ok: false, code: "UNKNOWN_STATE", message: "Please choose a valid state or union territory for delivery." };
  }

  let zone = null;
  let via = null;

  const exception = pincode ? findPinException(shipping.pinExceptions, pincode) : null;
  if (exception) {
    zone = zones.find((z) => z.id === exception.zoneId) || null;
    via = "pin";
  }
  if (!zone && sameState(dest, shipping.originState)) {
    zone = zones.find((z) => z.matchType === "origin") || null;
    via = "origin";
  }
  if (!zone) {
    zone = zones.find((z) => z.matchType === "states" && (z.states || []).some((s) => sameState(s, dest))) || null;
    via = "state";
  }
  if (!zone) {
    zone = zones.find((z) => z.matchType === "rest") || null;
    via = "rest";
  }
  if (!zone) {
    return { ok: false, code: "NO_ZONE", message: "Delivery rates are not set up for this address yet. Please contact us." };
  }
  if (zone.enabled === false) {
    return { ok: false, code: "ZONE_DISABLED", message: "Sorry, we don't deliver to this area right now." };
  }
  return { ok: true, zone, via, state: dest };
};

/** Is `from..to` overlapping any of the other exception ranges? (used when the admin saves exceptions) */
export const rangesOverlap = (a, b) => pinNumber(a.from) <= pinNumber(b.to) && pinNumber(b.from) <= pinNumber(a.to);
