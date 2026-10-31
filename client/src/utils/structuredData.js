import { SITE_URL, absoluteUrl } from "../config/seoPages";

const plain = (text) => String(text || "").replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();

export const buildBreadcrumbSchema = (items, currentPath) => {
  const crumbs = [{ label: "Home", url: `${SITE_URL}/` }];
  for (let i = 0; i < items.length; i++) {
    const { label, href } = items[i];
    const isLast = i === items.length - 1;
    if (!label) continue;
    if (!href && !isLast) return null; // an intermediate crumb without a URL would make the list invalid
    crumbs.push({ label: String(label), url: href ? `${SITE_URL}${href}` : `${SITE_URL}${currentPath}` });
  }
  if (crumbs.length < 2) return null;
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.label, item: c.url })),
  };
};

export const buildProductSchema = (product) => {
  if (!product?.name || !product.slug) return null;

  const stock = Number(product.stockQuantity);
  const availability = stock === 0 ? "https://schema.org/OutOfStock" : "https://schema.org/InStock";
  const url = `${SITE_URL}/products/${product.slug}`;

  const variantPrices = (product.variants || []).map((v) => Number(v.price)).filter((n) => n > 0);
  const basePrice = Number(product.price);
  const offer =
    variantPrices.length > 1 && Math.min(...variantPrices) !== Math.max(...variantPrices)
      ? {
          "@type": "AggregateOffer",
          priceCurrency: "INR",
          lowPrice: Math.min(...variantPrices),
          highPrice: Math.max(...variantPrices),
          offerCount: variantPrices.length,
          availability,
          url,
        }
      : {
          "@type": "Offer",
          priceCurrency: "INR",
          price: variantPrices[0] || basePrice,
          availability,
          itemCondition: "https://schema.org/NewCondition",
          url,
        };
  if (!(offer.price > 0 || offer.lowPrice > 0)) return null;

  const images = (product.images || []).map(absoluteUrl).filter(Boolean);
  const schema = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    url,
    sku: product.sku,
    brand: { "@type": "Brand", name: product.brand || "Divyam Ayurveda" },
    offers: offer,
  };
  const description = plain(product.shortDescription || product.description);
  if (description) schema.description = description;
  if (images.length) schema.image = images;
  if (product.category) schema.category = product.category;

  // Only real ratings: no reviews means no aggregateRating.
  if (Number(product.reviewCount) > 0 && Number(product.rating) > 0) {
    schema.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: Number(product.rating),
      reviewCount: Number(product.reviewCount),
    };
  }
  return schema;
};
