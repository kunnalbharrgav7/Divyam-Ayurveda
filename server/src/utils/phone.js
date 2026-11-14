/**
 * Phone numbers are identities (they can be used to sign in), so they are stored in one canonical form:
 *
 *   phone             "+919876543210"  international (E.164), no spaces. Unique per account.
 *   phoneCountryCode  "+91"
 *   phoneNumber       "9876543210"     digits only, without the country code
 *
 * "+91 98765 43210" and "+1 98765 43210" are therefore different identities even though the national digits match.
 */
import { parsePhoneNumberFromString } from "libphonenumber-js/max";

const DEFAULT_COUNTRY_CODE = "+91";

const digitsOnly = (value) => String(value ?? "").replace(/\D/g, "");

/** "+91" / "91" / " +91 " -> "+91", or "" when it is not a plausible calling code. */
export const normalizeCountryCode = (value) => {
  const digits = digitsOnly(value);
  return /^[1-9]\d{0,3}$/.test(digits) ? `+${digits}` : "";
};

/**
 * Validate a country code + national number pair. Returns { phone, phoneCountryCode, phoneNumber, country }
 * or null when the combination is not a real number for that country.
 */
export const parsePhone = (countryCode, nationalNumber) => {
  const code = normalizeCountryCode(countryCode);
  let national = digitsOnly(nationalNumber);
  if (!code || !national) return null;
  // People often type the national trunk prefix (0 98765 43210); it is never part of the number
  national = national.replace(/^0+/, "");
  if (!national) return null;

  const parsed = parsePhoneNumberFromString(`${code}${national}`);
  if (!parsed || !parsed.isValid()) return null;
  // Guard against a number that only parses because the code and digits were merged differently
  if (`+${parsed.countryCallingCode}` !== code) return null;

  return {
    phone: parsed.number, // E.164
    phoneCountryCode: code,
    phoneNumber: parsed.nationalNumber,
    country: parsed.country || null,
  };
};

/**
 * Read a phone supplied as one string (older accounts, staff forms, scripts). "+..." is parsed as international,
 * anything else is assumed to be an Indian number.
 */
export const parseLegacyPhone = (value) => {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  if (raw.startsWith("+")) {
    const parsed = parsePhoneNumberFromString(raw);
    if (!parsed || !parsed.isValid()) return null;
    return {
      phone: parsed.number,
      phoneCountryCode: `+${parsed.countryCallingCode}`,
      phoneNumber: parsed.nationalNumber,
      country: parsed.country || null,
    };
  }
  let digits = digitsOnly(raw);
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2); // 91 98765 43210
  return parsePhone(DEFAULT_COUNTRY_CODE, digits);
};

/**
 * Accepts either { phoneCountryCode, phone } (the forms) or a single "phone" string. Returns the canonical fields,
 * or null when nothing was supplied. Throws { invalid: true } when something was supplied but is not a valid number.
 */
export const readPhoneInput = ({ phoneCountryCode, phone } = {}) => {
  const hasAny = String(phone ?? "").trim() !== "";
  if (!hasAny) return null;
  const result = phoneCountryCode ? parsePhone(phoneCountryCode, phone) : parseLegacyPhone(phone);
  if (!result) {
    const err = new Error("invalid phone");
    err.invalid = true;
    throw err;
  }
  return result;
};

/** "+919876543210" -> "+91 9876543210" for display */
export const formatPhoneDisplay = (user) => {
  if (user?.phoneCountryCode && user?.phoneNumber) return `${user.phoneCountryCode} ${user.phoneNumber}`;
  return user?.phone || "";
};
