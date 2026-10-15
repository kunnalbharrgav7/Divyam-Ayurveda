import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  X,
  ExternalLink,
  Edit,
  Star,
  Package,
  Layers,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  Clock,
  TrendingUp,
  Tag,
  DollarSign,
  Boxes,
  Heart,
  ChevronRight,
  Info,
} from "lucide-react";
import { AdminModal } from "../common/AdminModal";
import { formatCurrency } from "../../../utils/formatters";

export const ProductQuickViewModal = ({
  isOpen,
  onClose,
  product,
  onToggleFeatured,
}) => {
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Reset active image when product changes
  useEffect(() => {
    setActiveImageIndex(0);
  }, [product?.id]);

  if (!product) return null;

  // Resolve images array
  const images = Array.isArray(product.images) && product.images.length > 0
    ? product.images
    : product.image
    ? [product.image]
    : [
        "/images/ProductImages/Ashuwaganda.png",
      ];

  const primaryImage = product.image || images[0];
  const activeImage = images[activeImageIndex] || primaryImage;

  // Pricing calculations
  const price = Number(product.price) || 0;
  const compareAt = Number(product.compareAtPrice || product.originalPrice) || 0;
  const costPrice = Number(product.costPrice) || 0;
  const profit = costPrice > 0 ? price - costPrice : 0;
  const profitMargin = costPrice > 0 && price > 0 ? Math.round((profit / price) * 100) : null;
  const discountPercent =
    compareAt > price ? Math.round(((compareAt - price) / compareAt) * 100) : 0;

  // Inventory calculations
  const stock = product.stock !== undefined ? product.stock : (product.stockQuantity ?? 0);
  const reorderThreshold = product.reorderThreshold || 10;
  const isOutOfStock = stock === 0;
  const isLowStock = stock > 0 && stock <= reorderThreshold;

  // Doshas
  const doshas = Array.isArray(product.dosha)
    ? product.dosha
    : typeof product.dosha === "string"
    ? [product.dosha]
    : ["Tridoshic"];

  // Benefits
  const benefits = Array.isArray(product.benefits) && product.benefits.length > 0
    ? product.benefits
    : [
        "Promotes holistic balance and vitality",
        "Supports digestive metabolic fire (Agni)",
        "Formulated according to classical Ayurvedic principles",
      ];

  // Ingredients
  const ingredients = Array.isArray(product.ingredients) && product.ingredients.length > 0
    ? product.ingredients
    : [];

  // Variants
  const variants = Array.isArray(product.variants) && product.variants.length > 0
    ? product.variants
    : [];

  return (
    <AdminModal
      isOpen={isOpen}
      onClose={onClose}
      title="Product Details & Overview"
      subtitle={`SKU: ${product.sku || "N/A"} • ID: ${product.id}`}
      maxWidth="max-w-4xl"
      footer={
        <div className="flex flex-wrap items-center justify-between w-full gap-2">
          <div className="flex items-center gap-2">
            {onToggleFeatured && (
              <button
                type="button"
                onClick={() => onToggleFeatured(product)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                  product.isFeatured
                    ? "bg-amber-100 text-amber-900 border border-amber-300"
                    : "bg-stone-100 text-stone-700 hover:bg-stone-200"
                }`}
              >
                <span>★</span>
                <span>{product.isFeatured ? "Featured on Store" : "Feature on Store"}</span>
              </button>
            )}

            <Link
              to={`/products/${product.slug}`}
              onClick={onClose}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 text-xs font-semibold transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5 text-stone-500" />
              <span>Live Website View</span>
            </Link>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 transition-colors"
            >
              Close
            </button>
            <Link
              to={`/admin/products/${product.id}/edit`}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-[#173D2A] text-white hover:bg-[#0B2416] shadow-sm transition-colors"
            >
              <Edit className="w-3.5 h-3.5" />
              <span>Edit Full Formulation</span>
            </Link>
          </div>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Top Header Card */}
        <div className="flex flex-col md:flex-row gap-6 p-4 rounded-2xl bg-stone-50/80 border border-stone-200">
          {/* Gallery Showcase */}
          <div className="w-full md:w-56 shrink-0 space-y-3">
            {/* Active Image Preview */}
            <div className="relative aspect-square rounded-xl overflow-hidden bg-white border border-stone-200 shadow-xs flex items-center justify-center p-2">
              <img
                src={activeImage}
                alt={product.title || product.name}
                className="w-full h-full object-contain"
                onError={(e) => {
                  e.target.src =
                    "/images/ProductImages/Ashuwaganda.png";
                }}
              />
              {activeImage === primaryImage && (
                <span className="absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-bold bg-[#173D2A] text-white shadow-xs">
                  ★ Primary
                </span>
              )}
            </div>

            {/* Thumbnail Strip */}
            {images.length > 1 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                {images.map((img, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveImageIndex(idx)}
                    className={`relative w-12 h-12 rounded-lg overflow-hidden border-2 bg-white shrink-0 p-0.5 transition-all ${
                      activeImageIndex === idx
                        ? "border-[#173D2A] ring-2 ring-[#A9D18E]/50"
                        : "border-stone-200 hover:border-stone-400"
                    }`}
                  >
                    <img
                      src={img}
                      alt={`Thumbnail ${idx + 1}`}
                      className="w-full h-full object-contain"
                    />
                    {img === primaryImage && (
                      <span className="absolute bottom-0 inset-x-0 bg-[#173D2A]/90 text-[8px] font-bold text-white text-center leading-tight py-0.5">
                        ★ Main
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
            <p className="text-[11px] text-stone-400 text-center">
              {images.length} {images.length === 1 ? "Image" : "Images in Gallery"}
            </p>
          </div>

          {/* Details Overview */}
          <div className="flex-1 space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-[#173D2A]/10 text-[#173D2A] border border-[#173D2A]/20">
                {product.category || product.categoryId || "Ayurveda"}
              </span>
              <span className="text-xs text-stone-400 font-medium">•</span>
              <span className="text-xs font-semibold text-stone-600">
                {product.brand || "Divyam Ayurveda"}
              </span>
              <span
                className={`ml-auto px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  product.status === "Draft"
                    ? "bg-stone-100 text-stone-600"
                    : product.status === "Archived"
                    ? "bg-rose-50 text-rose-700"
                    : "bg-emerald-100 text-emerald-800"
                }`}
              >
                {product.status || "Active"}
              </span>
            </div>

            <h2 className="text-xl font-bold text-stone-900 font-sans leading-tight">
              {product.title || product.name || "Untitled Product"}
            </h2>

            {product.subtitle && (
              <p className="text-xs text-stone-600 font-medium">
                {product.subtitle}
              </p>
            )}

            <p className="text-xs text-stone-500 line-clamp-3 leading-relaxed">
              {product.description ||
                product.shortDescription ||
                "Traditional botanical formulation prepared according to authentic Ayurvedic principles."}
            </p>

            {/* Key Tags / Badges */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1">
              {product.isFeatured && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-200">
                  ★ Featured on Home
                </span>
              )}
              {product.isBestseller && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-900 border border-emerald-200">
                  Bestseller
                </span>
              )}
              {product.isTrending && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-100 text-purple-900 border border-purple-200">
                  Trending
                </span>
              )}
              {product.isNewArrival && (
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-900 border border-blue-200">
                  New Arrival
                </span>
              )}
              <div className="flex items-center gap-1 text-xs text-amber-600 font-semibold ml-auto">
                <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                <span>{product.rating || 4.8}</span>
                <span className="text-stone-400 font-normal">
                  ({product.reviewCount || 0} reviews)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Financials & Stock Quick Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl border border-stone-200 bg-white">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
              Selling Price
            </span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-lg font-bold text-stone-900">
                {formatCurrency(price)}
              </span>
              {compareAt > price && (
                <span className="text-xs text-stone-400 line-through">
                  {formatCurrency(compareAt)}
                </span>
              )}
            </div>
            {discountPercent > 0 && (
              <span className="text-[10px] font-semibold text-emerald-700">
                {discountPercent}% customer discount
              </span>
            )}
          </div>

          <div className="p-3.5 rounded-xl border border-stone-200 bg-white">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
              Unit Cost & Margin
            </span>
            <div className="text-lg font-bold text-stone-900 mt-1">
              {costPrice > 0 ? formatCurrency(costPrice) : "Not Set"}
            </div>
            {profitMargin !== null && (
              <span className="text-[10px] font-semibold text-stone-600">
                Profit: {formatCurrency(profit)} ({profitMargin}%)
              </span>
            )}
          </div>

          <div className="p-3.5 rounded-xl border border-stone-200 bg-white">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
              Warehouse Stock
            </span>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="text-lg font-bold text-stone-900">
                {stock}
              </span>
              <span className="text-xs text-stone-400 font-medium">units</span>
            </div>
            <span
              className={`text-[10px] font-semibold inline-flex items-center gap-1 ${
                isOutOfStock
                  ? "text-rose-600"
                  : isLowStock
                  ? "text-amber-600"
                  : "text-emerald-700"
              }`}
            >
              {isOutOfStock ? (
                <>
                  <XCircle className="w-3 h-3" /> Out of stock
                </>
              ) : isLowStock ? (
                <>
                  <AlertTriangle className="w-3 h-3" /> Low stock alert (≤{reorderThreshold})
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-3 h-3" /> Healthy stock level
                </>
              )}
            </span>
          </div>

          <div className="p-3.5 rounded-xl border border-stone-200 bg-white">
            <span className="text-[10px] font-bold uppercase tracking-wider text-stone-400">
              SKU & Identifiers
            </span>
            <div className="text-sm font-bold font-mono text-stone-800 mt-1 truncate">
              {product.sku || "N/A"}
            </div>
            <span className="text-[10px] text-stone-400 truncate block">
              slug: {product.slug}
            </span>
          </div>
        </div>

        {/* Tabular Details: Ayurvedic Profile & Benefits */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Ayurvedic Doshas & Herbal Composition */}
          <div className="p-4 rounded-xl border border-stone-200 bg-white space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
              <Sparkles className="w-4 h-4 text-emerald-700" />
              <span>Ayurvedic Formulation & Doshas</span>
            </h4>

            {/* Doshas */}
            <div>
              <span className="text-[11px] font-medium text-stone-500 block mb-1.5">
                Primary Doshas Balanced:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {doshas.map((d, idx) => (
                  <span
                    key={idx}
                    className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-[#173D2A] text-white"
                  >
                    ✓ {d}
                  </span>
                ))}
              </div>
            </div>

            {/* Key Ingredients */}
            {ingredients.length > 0 && (
              <div className="pt-2 border-t border-stone-100">
                <span className="text-[11px] font-medium text-stone-500 block mb-1.5">
                  Herbal Ingredients:
                </span>
                <div className="space-y-1.5">
                  {ingredients.map((ing, idx) => {
                    const name = typeof ing === "string" ? ing : ing.name;
                    const sanskrit = typeof ing === "object" ? ing.sanskrit : null;
                    const ratio = typeof ing === "object" ? ing.ratio : null;
                    return (
                      <div
                        key={idx}
                        className="flex items-center justify-between text-xs p-1.5 rounded-lg bg-stone-50 border border-stone-100"
                      >
                        <span className="font-semibold text-stone-900">{name}</span>
                        {sanskrit && (
                          <span className="text-stone-500 italic text-[11px]">
                            {sanskrit}
                          </span>
                        )}
                        {ratio && (
                          <span className="font-mono text-stone-400 text-[10px]">
                            {ratio}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Dosage */}
            {product.dosage && (
              <div className="pt-2 border-t border-stone-100">
                <span className="text-[11px] font-medium text-stone-500 block mb-1">
                  Dosage & Anupana:
                </span>
                <p className="text-xs text-stone-700 bg-amber-50/60 p-2 rounded-lg border border-amber-200/50">
                  {product.dosage}
                </p>
              </div>
            )}
          </div>

          {/* Key Benefits & Variants */}
          <div className="p-4 rounded-xl border border-stone-200 bg-white space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-700 flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-emerald-700" />
              <span>Key Health Benefits & Variants</span>
            </h4>

            {/* Benefits */}
            <div className="space-y-1.5">
              {benefits.map((b, idx) => (
                <div key={idx} className="flex items-start gap-2 text-xs text-stone-700">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 mt-1.5 shrink-0" />
                  <span>{b}</span>
                </div>
              ))}
            </div>

            {/* Variants table */}
            {variants.length > 0 && (
              <div className="pt-2 border-t border-stone-100">
                <span className="text-[11px] font-medium text-stone-500 block mb-1.5">
                  Pack Sizes & Variants:
                </span>
                <div className="border border-stone-200 rounded-lg overflow-hidden text-xs">
                  <table className="w-full text-left">
                    <thead className="bg-stone-50 text-[10px] text-stone-500 uppercase border-b border-stone-200">
                      <tr>
                        <th className="p-2">Variant</th>
                        <th className="p-2">Price</th>
                        <th className="p-2 text-right">Stock</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100">
                      {variants.map((v, idx) => (
                        <tr key={idx} className="hover:bg-stone-50/50">
                          <td className="p-2 font-medium text-stone-800">
                            {v.name || v.size}
                          </td>
                          <td className="p-2 font-semibold text-stone-900">
                            {formatCurrency(v.price)}
                          </td>
                          <td className="p-2 text-right text-stone-600">
                            {v.stock !== undefined ? `${v.stock} units` : "Shared"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Certifications */}
            {Array.isArray(product.certifications) && product.certifications.length > 0 && (
              <div className="pt-2 border-t border-stone-100">
                <div className="flex flex-wrap gap-1.5">
                  {product.certifications.map((c, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded text-[10px] font-medium bg-stone-100 text-stone-600"
                    >
                      ✓ {c}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </AdminModal>
  );
};

