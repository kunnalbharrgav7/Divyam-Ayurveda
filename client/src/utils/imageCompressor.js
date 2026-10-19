/**
 * Browser-side image compression for admin uploads.
 *
 * Photos are resized so the longest edge is at most `maxDimension` and re-encoded as WebP, which is
 * typically 5-20x smaller than a phone/camera original with no visible difference at storefront sizes.
 * The compressed result is returned as a data URL (the format the admin forms already store).
 *
 * The original file is returned unchanged (as a data URL) when it can't or shouldn't be compressed:
 * SVG/GIF (vector/animated), a browser that can't encode WebP, a decode error, or when re-encoding
 * would not make it smaller.
 */

const COMPRESSIBLE_TYPES = ["image/jpeg", "image/png", "image/webp"];

export const readFileAsDataUrl = (fileOrBlob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error("Could not read the image file."));
    reader.readAsDataURL(fileOrBlob);
  });

export const compressImageFile = async (file, { maxDimension = 1600, quality = 0.8 } = {}) => {
  if (!COMPRESSIBLE_TYPES.includes(file.type)) return readFileAsDataUrl(file);

  try {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d").drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();

    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/webp", quality));
    // Browsers that can't encode WebP silently return PNG: keep the original in that case
    if (!blob || blob.type !== "image/webp" || blob.size >= file.size) return readFileAsDataUrl(file);
    return readFileAsDataUrl(blob);
  } catch (err) {
    console.warn("Image compression failed, using the original file:", err);
    return readFileAsDataUrl(file);
  }
};
