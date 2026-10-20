/**
 * Centralized API & Backend Configuration for Divyam Ayurveda
 * 
 * Supports both VITE_API_URL and VITE_API_BASE_URL environment variables.
 * Automatically falls back to the production Render backend (https://divyam-ayurveda.onrender.com)
 * in production environments, and uses empty string in local development to leverage the Vite proxy.
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
  // Default to deployed Render backend for production builds
  if (env.PROD) {
    return "https://divyam-ayurveda.onrender.com";
  }
  // In development, empty string allows relative fetches to be caught by Vite's local proxy
  return "";
};

export const API_BASE_URL = resolveBaseUrl();

/**
 * Normalizes an API path to include the backend origin.
 * Examples:
 *   apiUrl("/api/v1/products") -> "https://divyam-ayurveda.onrender.com/api/v1/products"
 *   apiUrl("https://other.com/foo") -> "https://other.com/foo"
 */
export const apiUrl = (path = "") => {
  if (!path) return API_BASE_URL;
  if (/^https?:\/\//i.test(path)) return path;
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE_URL}${normalized}`;
};
