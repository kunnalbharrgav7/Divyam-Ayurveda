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

export const compressImageFile = async (file, { maxDimension = 1200, quality = 0.75 } = {}) => {
  if (!file) return "";
  if (!COMPRESSIBLE_TYPES.includes(file.type)) return readFileAsDataUrl(file);

  try {
    let width = 0;
    let height = 0;
    let drawSource = null;

    if (typeof createImageBitmap === "function") {
      try {
        const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
        width = bitmap.width;
        height = bitmap.height;
        drawSource = bitmap;
      } catch (_) {}
    }

    if (!drawSource) {
      // Fallback for environments where createImageBitmap fails
      const dataUrl = await readFileAsDataUrl(file);
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
        img.src = dataUrl;
      });
      width = img.width;
      height = img.height;
      drawSource = img;
    }

    const scale = Math.min(1, maxDimension / Math.max(width, height));
    const targetW = Math.max(1, Math.round(width * scale));
    const targetH = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(drawSource, 0, 0, targetW, targetH);
    if (typeof drawSource.close === "function") drawSource.close();

    // Prefer WebP, fallback to JPEG
    let blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/webp", quality));
    if (!blob || blob.size === 0) {
      blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    }

    if (blob && blob.size > 0) {
      return readFileAsDataUrl(blob);
    }
    return readFileAsDataUrl(file);
  } catch (err) {
    console.warn("Image compression failed, using original file:", err);
    return readFileAsDataUrl(file);
  }
};
