/**
 * Products held in the cart / wishlist are saved to localStorage (~5 MB total). Older records can still
 * carry product photos as inline base64 data URLs (hundreds of KB each), which blows that quota and makes
 * later saves fail. These helpers swap such inline images for the server's image URL, which serves the
 * same bytes (GET /api/v1/products/:id/images/:index) and is cached by the browser.
 */

const isDataUrl = (value) => typeof value === "string" && value.startsWith("data:");

const toImageUrl = (productId, index) => `/api/v1/products/${productId}/images/${index}`;

export const compactProduct = (product) => {
  if (!product || typeof product !== "object" || !product.id) return product;

  const hasInline =
    isDataUrl(product.image) ||
    (Array.isArray(product.images) && product.images.some(isDataUrl)) ||
    (Array.isArray(product.gallery) && product.gallery.some(isDataUrl));
  if (!hasInline) return product;

  const swap = (list) =>
    Array.isArray(list) ? list.map((img, i) => (isDataUrl(img) ? toImageUrl(product.id, i) : img)) : list;
  const images = swap(product.images);

  return {
    ...product,
    images,
    gallery: swap(product.gallery),
    image: isDataUrl(product.image) ? (Array.isArray(images) && images[0]) || toImageUrl(product.id, 0) : product.image,
  };
};

export const compactCartItems = (items) =>
  Array.isArray(items) ? items.map((item) => ({ ...item, product: compactProduct(item.product) })) : [];

export const compactWishlistItems = (items) => (Array.isArray(items) ? items.map(compactProduct) : []);
