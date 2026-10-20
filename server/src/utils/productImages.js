/**
 * Product photos uploaded in the admin panel are stored as base64 data URLs inside the product
 * document (hundreds of KB each). Sending those inline bloats every API response and the browser's
 * localStorage (cart / wishlist snapshots), so the API exposes them as cacheable image URLs instead
 * and serves the bytes from GET /api/v1/products/:id/images/:index.
 */

import { config } from "../config/index.js";

const IMAGE_URL_PATTERN = /\/api\/v1\/products\/([a-f0-9]{24})\/images\/(\d+)/i;

const isDataUrl = (value) => typeof value === "string" && value.startsWith("data:");

/** Images as the API should expose them: data URLs become image-endpoint URLs, other URLs pass through. */
export const toPublicImages = (product) => {
  const images = Array.isArray(product?.images) ? product.images : [];
  const id = String(product?._id || product?.id || "");
  const version = product?.updatedAt ? new Date(product.updatedAt).getTime() : 0;
  const baseUrl =
    config.API_URL && !config.API_URL.includes("localhost")
      ? config.API_URL.replace(/\/+$/, "")
      : "";
  return images.map((img, index) =>
    isDataUrl(img) && id ? `${baseUrl}/api/v1/products/${id}/images/${index}?v=${version}` : img
  );
};

/**
 * Inverse of toPublicImages, used when the admin form saves a product it loaded from the API:
 * image-endpoint URLs are mapped back to the stored image they pointed at, new uploads pass through.
 */
export const resolveStoredImages = (incoming, existingImages, productId) =>
  (Array.isArray(incoming) ? incoming : [])
    .map((img) => {
      const match = typeof img === "string" ? img.match(IMAGE_URL_PATTERN) : null;
      if (match && match[1] === String(productId)) return existingImages[Number(match[2])];
      return img;
    })
    .filter(Boolean);

/** Splits "data:<mime>;base64,<payload>" into a Buffer and content type, or null if it isn't one. */
export const parseDataUrl = (value) => {
  const match = isDataUrl(value) ? value.match(/^data:([^;,]+)?(;base64)?,(.*)$/s) : null;
  if (!match) return null;
  const buffer = match[2] ? Buffer.from(match[3], "base64") : Buffer.from(decodeURIComponent(match[3]));
  return { contentType: match[1] || "application/octet-stream", buffer };
};
