import crypto from "crypto";

/**
 * Private access for orders placed without an account.
 *
 * - Tracking code: 16 characters of Crockford base32 (80 random bits), shown to the customer as
 *   XXXX-XXXX-XXXX-XXXX and used in their private tracking link. Unrelated to the order number, phone or email.
 * - Claim token: 32 random bytes (base64url). Lets the buyer attach the order to an account once.
 *
 * Only SHA-256 hashes are stored, so a database leak does not reveal working links.
 */

const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"; // Crockford base32: no I, L, O, U
const CODE_LENGTH = 16;

export const CLAIM_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export const hashToken = (value) => crypto.createHash("sha256").update(String(value)).digest("hex");

export const generateTrackingCode = () => {
  const bytes = crypto.randomBytes(CODE_LENGTH);
  let out = "";
  for (let i = 0; i < CODE_LENGTH; i += 1) out += ALPHABET[bytes[i] & 31]; // 256 % 32 === 0: no bias
  return out;
};

// Accepts what people actually type or paste: lower case, spaces, dashes, and the look-alike letters O/I/L
export const normalizeTrackingCode = (value) => {
  const cleaned = String(value || "")
    .toUpperCase()
    .replace(/[\s-]+/g, "")
    .replace(/O/g, "0")
    .replace(/[IL]/g, "1");
  if (cleaned.length !== CODE_LENGTH) return null;
  for (const ch of cleaned) if (!ALPHABET.includes(ch)) return null;
  return cleaned;
};

export const formatTrackingCode = (code) => String(code || "").replace(/(.{4})(?=.)/g, "$1-");

export const generateClaimToken = () => crypto.randomBytes(32).toString("base64url");

export const isWellFormedClaimToken = (value) => /^[A-Za-z0-9_-]{43}$/.test(String(value || ""));

/** Fresh tracking + claim credentials: the plain values go to the buyer once, the hashes into the order */
export const issueGuestCredentials = ({ withClaim = true } = {}) => {
  const trackingCode = generateTrackingCode();
  const claimToken = withClaim ? generateClaimToken() : null;
  const now = new Date();
  const claimExpiresAt = withClaim ? new Date(now.getTime() + CLAIM_TOKEN_TTL_MS) : null;
  return {
    plain: { trackingCode, claimToken, claimExpiresAt },
    stored: {
      trackingTokenHash: hashToken(trackingCode),
      trackingIssuedAt: now,
      trackingRevokedAt: null,
      ...(withClaim ? { claimTokenHash: hashToken(claimToken), claimExpiresAt } : {}),
    },
  };
};

export const maskPhone = (value) => {
  const digits = String(value || "").replace(/\D/g, "");
  if (!digits) return "";
  return `${"*".repeat(Math.max(0, digits.length - 4))}${digits.slice(-4)}`;
};

export const maskEmail = (value) => {
  const [local, domain] = String(value || "").split("@");
  if (!local || !domain) return "";
  return `${local.slice(0, 2)}${"*".repeat(Math.max(1, local.length - 2))}@${domain}`;
};
