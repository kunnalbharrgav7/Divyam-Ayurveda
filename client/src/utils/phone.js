/**
 * Mobile number helpers shared by the sign-up, sign-in, profile and admin forms.
 *
 * A number is always handled as two parts: a country code ("+91") and the national digits ("9876543210").
 * The server re-validates with the same library, so what passes here also passes there.
 */
import { parsePhoneNumberFromString, getCountries, getCountryCallingCode } from "libphonenumber-js/max";

export const DEFAULT_COUNTRY = { iso: "IN", dial: "+91" };

const POPULAR = ["IN", "US", "GB", "AE", "CA", "AU", "SG", "SA", "QA", "KW", "OM", "BH", "NP", "BD", "LK", "NZ", "DE", "FR"];

let cache = null;

/** Every country the library knows: { iso, name, dial }. India first, then common ones, then A-Z. */
export const getCountryList = () => {
  if (cache) return cache;
  let names = null;
  try {
    names = new Intl.DisplayNames(["en"], { type: "region" });
  } catch {
    names = null;
  }
  const all = getCountries()
    .map((iso) => ({ iso, name: (names && names.of(iso)) || iso, dial: `+${getCountryCallingCode(iso)}` }))
    .filter((c) => c.name && c.name !== c.iso);
  const rank = (iso) => {
    const i = POPULAR.indexOf(iso);
    return i === -1 ? POPULAR.length : i;
  };
  all.sort((a, b) => rank(a.iso) - rank(b.iso) || a.name.localeCompare(b.name));
  cache = all;
  return cache;
};

export const findCountry = (iso) => getCountryList().find((c) => c.iso === iso) || null;

/** The first country that uses a calling code ("+91" -> India). */
export const countryForDial = (dial) => getCountryList().find((c) => c.dial === dial) || null;

/** Keep digits only, which is what the number box accepts. */
export const sanitizeNationalNumber = (raw) => String(raw ?? "").replace(/\D/g, "").slice(0, 15);

/**
 * Check a country code + national number. Returns { ok: true, e164 } or { ok: false, message }.
 * A leading 0 (the national trunk prefix) is ignored, like on the server.
 */
export const validateMobile = (countryCode, nationalNumber) => {
  const digits = sanitizeNationalNumber(nationalNumber).replace(/^0+/, "");
  if (!digits) return { ok: false, message: "Enter your mobile number." };
  const parsed = parsePhoneNumberFromString(`${countryCode}${digits}`);
  if (!parsed || !parsed.isValid() || `+${parsed.countryCallingCode}` !== countryCode) {
    return { ok: false, message: "Enter a valid mobile number for the selected country." };
  }
  return { ok: true, e164: parsed.number };
};

/** "+91" + "9876543210" -> "+91 9876543210" */
export const formatMobile = (countryCode, nationalNumber) =>
  [countryCode, nationalNumber].filter(Boolean).join(" ");

/** Display text for a signed-in user (new accounts have the parts; old ones only the single string). */
export const displayPhone = (user) => {
  if (!user) return "";
  if (user.phoneCountryCode && user.phoneNumber) return formatMobile(user.phoneCountryCode, user.phoneNumber);
  return user.phone || "";
};
