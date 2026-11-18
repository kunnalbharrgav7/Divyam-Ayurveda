/**
 * Centralized API & Backend Configuration for Divyam Ayurveda
 * 
 * Supports both VITE_API_URL and VITE_API_BASE_URL environment variables.
 * Without VITE_API_URL, API calls go to the same site as the page (relative /api/...): in production the
 * storefront's own backend, in development Vite's local proxy.
 */

const getEnv = () => {
  try {
    if (typeof import.meta !== "undefined" && import.meta.env) {
      return import.meta.env;
    }
  } catch (_) {}
  return {};
};

const env = getEnv();
const rawUrl = env.VITE_API_URL || env.VITE_API_BASE_URL;

const resolveBaseUrl = () => {
  if (typeof rawUrl === "string" && rawUrl.trim() !== "") {
    let clean = rawUrl.trim().replace(/\/+$/, "");
    // If the configured URL ends with /api or /api/v1, normalize it to the base host
    clean = clean.replace(/\/api(\/v1)?$/i, "");
    return clean;
  }
  // No address configured: use the same site the page was loaded from (production: the storefront's own /api,
  // so the www and non-www addresses both work; development: Vite's local proxy). A backend on another address
  // (e.g. a separate static host) must say so explicitly with VITE_API_URL.
  return "";
};

export const API_BASE_URL = resolveBaseUrl();

/**
 * Normalizes an API path to include the backend origin.
 * Examples:
 *   apiUrl("/api/v1/products") -> "/api/v1/products" (or "<VITE_API_URL>/api/v1/products" when it is set)
 *   apiUrl("https://other.com/foo") -> "https://other.com/foo"
 */
export const apiUrl = (path = "") => {
  if (!path) return API_BASE_URL;
  if (/^https?:\/\//i.test(path)) return path;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalized}`;
};
