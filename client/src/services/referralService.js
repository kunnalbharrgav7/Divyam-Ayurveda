/**
 * Referral helpers. All program rules, discounts, rewards and statistics come from the API;
 * the only thing kept in the browser is the invitation code a visitor arrived with (and when).
 */
import { storage } from "../utils/storage";
import { apiUrl } from "../config/api";

const ATTRIBUTION_KEY = "divyam_referral_attribution";

// Shown until the real program settings load
export const DEFAULT_PROGRAM = {
  enabled: true,
  programName: "Divyam Wellness Seeker Circle",
  refereeDiscountType: "percentage",
  refereeDiscountValue: 10,
  refereeDiscountCap: 250,
  minOrderValue: 499,
  referrerRewardType: "fixed",
  referrerReward: 100,
  referrerRewardPercent: 10,
  referrerRewardCap: 200,
  holdDays: 7,
  attributionDays: 30,
};

export const getReferralShareUrl = (code) =>
  `${typeof window !== "undefined" ? window.location.origin : ""}/?ref=${encodeURIComponent(code)}`;

/** "10% OFF" or "₹100 OFF" for the friend's offer */
export const describeFriendOffer = (program = DEFAULT_PROGRAM) =>
  program.refereeDiscountType === "fixed" ? `₹${program.refereeDiscountValue} OFF` : `${program.refereeDiscountValue}% OFF`;

/** What the referrer earns, e.g. "₹100" or "5% (up to ₹50)" */
export const describeReward = (program = DEFAULT_PROGRAM) =>
  program.referrerRewardType === "percent"
    ? `${program.referrerRewardPercent}%${program.referrerRewardCap ? ` (up to ₹${program.referrerRewardCap})` : ""}`
    : `₹${program.referrerReward}`;

export const getStoredAttribution = (maxDays = 30) => {
  const stored = storage.get(ATTRIBUTION_KEY, null);
  if (!stored?.code || !stored.attributedAt) return null;
  if ((Date.now() - new Date(stored.attributedAt).getTime()) / 86400000 > maxDays) {
    storage.remove(ATTRIBUTION_KEY);
    return null;
  }
  return stored;
};

// Tells the referral context (and so checkout) that the saved invitation changed
const notifyAttributionChange = () => {
  if (typeof window !== "undefined") window.dispatchEvent(new CustomEvent("divyam_referral_attribution"));
};

export const storeAttribution = (code) => {
  const data = { code: String(code).trim().toUpperCase(), attributedAt: new Date().toISOString() };
  storage.set(ATTRIBUTION_KEY, data);
  notifyAttributionChange();
  return data;
};

export const clearAttribution = () => {
  storage.remove(ATTRIBUTION_KEY);
  notifyAttributionChange();
};

/** Is this a real code? Who invited me, and what is the offer? (public endpoint) */
export const lookupReferralCode = async (code) => {
  try {
    const res = await fetch(apiUrl(`/api/v1/referrals/code/${encodeURIComponent(String(code).trim())}`));
    const json = await res.json();
    if (res.ok && json.success) return json.data;
    return { valid: false, reason: json?.error?.message || "This referral code is not valid." };
  } catch (_) {
    return { valid: false, reason: "Could not check this referral code right now." };
  }
};
