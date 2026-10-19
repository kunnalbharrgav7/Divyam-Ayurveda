import sharp from "sharp";
import { parseDataUrl } from "./productImages.js";
import { logger } from "../config/logger.js";

/**
 * Server-side safety net for product photos: the admin UI already compresses in the browser, but
 * anything that reaches the API as a base64 data URL (other clients, older pages, huge originals) is
 * resized and re-encoded here before it is stored in MongoDB.
 */

const MAX_DIMENSION = 1600; // longest edge in px, plenty for product pages and zoom
const WEBP_QUALITY = 80;
const COMPRESSIBLE_TYPES = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp", "image/avif", "image/tiff"]);

/**
 * Returns a (smaller) data URL for a base64 image. Non-image values, URLs, SVG/GIF (vector/animated) and
 * images that would not get smaller are returned unchanged. Never throws: on a decode error the original is kept.
 */
export const compressDataUrl = async (value, { maxDimension = MAX_DIMENSION, quality = WEBP_QUALITY } = {}) => {
  const parsed = parseDataUrl(value);
  if (!parsed || !COMPRESSIBLE_TYPES.has(parsed.contentType.toLowerCase())) return value;

  try {
    const output = await sharp(parsed.buffer)
      .rotate() // honour EXIF orientation before the metadata is dropped
      .resize({ width: maxDimension, height: maxDimension, fit: "inside", withoutEnlargement: true })
      .webp({ quality })
      .toBuffer();

    if (output.length >= parsed.buffer.length) return value;
    return `data:image/webp;base64,${output.toString("base64")}`;
  } catch (err) {
    logger.warn({ err: err.message }, "Image compression failed; storing the original image");
    return value;
  }
};

/** Compresses every data-URL entry of an images array (plain URLs pass through), in parallel. */
export const compressImages = (images, options) =>
  Promise.all((Array.isArray(images) ? images : []).map((img) => compressDataUrl(img, options)));
