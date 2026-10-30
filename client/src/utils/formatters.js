/**
 * Currency and string formatting utilities for Divyam Ayurveda
 */

/**
 * Standard INR currency formatter
 * @param {number} amount - The numerical amount in INR
 * @returns {string} Formatted INR currency string (e.g., ₹499 or ₹1,299)
 */
export const formatINR = (amount) => {
  if (amount === undefined || amount === null || isNaN(amount)) return "₹0";
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatCurrency = formatINR;

/**
 * Calculate discount percentage
 */
export const getDiscountPercentage = (price, originalPrice) => {
  if (!originalPrice || originalPrice <= price) return 0;
  return Math.round(((originalPrice - price) / originalPrice) * 100);
};

/**
 * Format date in standard Indian English format
 */
export const formatDate = (dateString) => {
  if (!dateString) return "";
  const date = new Date(dateString);
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
};

/**
 * Date and time in the viewer's own time zone, e.g. "24 Oct 2026, 11:52:05 am".
 * Returns "—" for a missing or unparseable value instead of "Invalid Date".
 */
export const formatDateTime = (value) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  }).format(date);
};

/**
 * Truncate text with ellipsis
 */
export const truncateText = (text, maxLength = 100) => {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
};

