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
 * Truncate text with ellipsis
 */
export const truncateText = (text, maxLength = 100) => {
  if (!text || text.length <= maxLength) return text;
  return text.substring(0, maxLength) + "...";
};

