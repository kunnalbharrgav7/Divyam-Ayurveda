/**
 * Browser-side image compression for admin uploads.
 *
 * Photos are resized so the longest edge is at most `maxDimension` (default 1000px) and re-encoded
 * as WebP (or JPEG fallback) at ~0.75 quality. This yields crisp 40-100 KB payloads from original
 * camera/phone photos that may be 5-25 MB, preventing upload timeouts and payload limits.
 */

export const readFileAsDataUrl = (fileOrBlob) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error || new Error("Could not read the image file."));
    reader.readAsDataURL(fileOrBlob);
  });

const isImageFile = (file) => {
  if (!file) return false;
  if (file.type && file.type.startsWith("image/")) return true;
  const name = (file.name || "").toLowerCase();
  return /\.(jpe?g|png|webp|jfif|pjpeg|avif|bmp|gif|svg)$/i.test(name);
};

export const compressImageFile = async (file, { maxDimension = 1000, quality = 0.75 } = {}) => {
  if (!file) return "";

  // If not recognized as an image, check size before reading
  if (!isImageFile(file)) {
    if (file.size > 2 * 1024 * 1024) {
      throw new Error(`File "${file.name}" is not a supported image format.`);
    }
    return readFileAsDataUrl(file);
  }

  // Vector SVG and animated GIFs should not be flattened to canvas
  const typeLower = (file.type || "").toLowerCase();
  const nameLower = (file.name || "").toLowerCase();
  if (
    typeLower === "image/svg+xml" ||
    nameLower.endsWith(".svg") ||
    typeLower === "image/gif" ||
    nameLower.endsWith(".gif")
  ) {
    if (file.size > 2 * 1024 * 1024) {
      throw new Error(`Image "${file.name}" exceeds the 2 MB limit for SVG/GIF files.`);
    }
    return readFileAsDataUrl(file);
  }

  try {
    let width = 0;
    let height = 0;
    let drawSource = null;

    // 1. Try modern createImageBitmap
    if (typeof createImageBitmap === "function") {
      try {
        const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
        width = bitmap.width;
        height = bitmap.height;
        drawSource = bitmap;
      } catch (_) {}
    }

    // 2. Fallback to HTMLImageElement using object URL (much faster & less memory than data URL)
    let objectUrl = null;
    if (!drawSource) {
      objectUrl = URL.createObjectURL(file);
      const img = new Image();
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = () => reject(new Error(`Could not decode image "${file.name}".`));
        img.src = objectUrl;
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
    if (ctx) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = "high";
      ctx.drawImage(drawSource, 0, 0, targetW, targetH);
    }
    if (typeof drawSource.close === "function") drawSource.close();
    if (objectUrl) URL.revokeObjectURL(objectUrl);

    // Prefer WebP, fallback to JPEG
    let blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/webp", quality));
    if (!blob || blob.size === 0) {
      blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    }

    // If still > 250 KB (rare), do a quick 2nd pass with slightly lower dimension & quality
    if (blob && blob.size > 250 * 1024) {
      const secondBlob = await new Promise((resolve) => canvas.toBlob(resolve, "image/webp", 0.65));
      if (secondBlob && secondBlob.size > 0 && secondBlob.size < blob.size) {
        blob = secondBlob;
      }
    }

    if (blob && blob.size > 0) {
      return readFileAsDataUrl(blob);
    }

    // If canvas returned no blob, check original file size
    if (file.size > 500 * 1024) {
      throw new Error(`Image "${file.name}" could not be compressed. Please choose an image under 2MB.`);
    }
    return readFileAsDataUrl(file);
  } catch (err) {
    console.warn("Image compression warning:", err);
    // Safety guard: never pass uncompressed file > 500 KB to avoid 50s timeouts
    if (file.size > 500 * 1024) {
      throw new Error(
        err.message ||
          `Image "${file.name}" is too large (${Math.round(file.size / 1024)} KB) and could not be compressed.`
      );
    }
    return readFileAsDataUrl(file);
  }
};
