/**
 * LocalStorage wrapper with error handling and serialization
 */

// Rebuildable caches (they are re-fetched from the API). When the ~5 MB quota is full these are
// dropped first so that user data such as the cart and wishlist can still be saved.
const EVICTABLE_CACHE_KEYS = [
  "divyam_ayurveda_products",
  "divyam_ayurveda_categories",
  "divyam_ayurveda_collections",
  "divyam_ayurveda_brands",
  "divyam_ayurveda_ingredients",
  "divyam_ayurveda_blog",
];

const isQuotaError = (error) =>
  error?.name === "QuotaExceededError" ||
  error?.name === "NS_ERROR_DOM_QUOTA_REACHED" ||
  error?.code === 22 ||
  error?.code === 1014;

export const storage = {
  get: (key, defaultValue = null) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.warn(`Error reading localStorage key "${key}":`, error);
      return defaultValue;
    }
  },

  /** Returns true when the value was saved. */
  set: (key, value) => {
    let json;
    try {
      json = JSON.stringify(value);
      localStorage.setItem(key, json);
      return true;
    } catch (error) {
      if (json !== undefined && isQuotaError(error)) {
        for (const cacheKey of EVICTABLE_CACHE_KEYS) {
          if (cacheKey === key || localStorage.getItem(cacheKey) === null) continue;
          try {
            localStorage.removeItem(cacheKey);
            localStorage.setItem(key, json);
            console.warn(`localStorage was full; cleared cache "${cacheKey}" to save "${key}".`);
            return true;
          } catch (retryError) {
            if (!isQuotaError(retryError)) break;
          }
        }
      }
      console.error(`Could not save "${key}" to localStorage (storage full?):`, error);
      return false;
    }
  },

  remove: (key) => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.warn(`Error removing localStorage key "${key}":`, error);
    }
  },

  clear: () => {
    try {
      localStorage.clear();
    } catch (error) {
      console.warn("Error clearing localStorage:", error);
    }
  },
};
