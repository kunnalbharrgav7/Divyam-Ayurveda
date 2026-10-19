import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, Heart, ShoppingBag, Check, ShieldCheck, Sparkles, ArrowRight, Minus, Plus } from "lucide-react";
import { RatingStars } from "../common/RatingStars";
import { formatINR, getDiscountPercentage } from "../../utils/formatters";
import { useCart } from "../../context/CartContext";
import { useWishlist } from "../../context/WishlistContext";

export const ProductQuickViewModal = ({ product, isOpen, onClose }) => {
  const { addToCart, isInCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();

  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [isAdded, setIsAdded] = useState(false);

  // Sync state whenever opened with a new product
  useEffect(() => {
    if (product) {
      setActiveImageIndex(0);
      setQuantity(1);
      setIsAdded(false);
      if (product.variants && product.variants.length > 0) {
        setSelectedVariant(product.variants[0]);
      } else {
        setSelectedVariant(null);
      }
    }
  }, [product, isOpen]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) {
      document.body.style.overflow = "hidden";
      window.addEventListener("keydown", handleKeyDown);
    }
    return () => {
      document.body.style.overflow = "unset";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen || !product || typeof document === "undefined") return null;

  const images = product.images && product.images.length > 0
    ? product.images
    : [product.image || "/images/ProductImages/Ashuwaganda.png"];

  const currentPrice = selectedVariant?.price || product.price;
  const currentOriginalPrice = selectedVariant?.originalPrice || product.originalPrice;
  const discountPercent = getDiscountPercentage(currentPrice, currentOriginalPrice);
  const inWishlist = isInWishlist(product.id);

  // Prefer the selected pack size's stock; fall back to the product total.
  // Unknown stock (e.g. offline fallback data) is treated as purchasable.
  const rawStock = Number.isFinite(selectedVariant?.stock)
    ? selectedVariant.stock
    : (product.stockQuantity ?? product.stock);
  const availableStock = Number.isFinite(rawStock) ? rawStock : Infinity;
  const isOutOfStock = availableStock <= 0;

  // Out-of-stock items can't be bought, so a second add would only inflate the cart quantity
  const alreadyInCart = isInCart(product.id, selectedVariant?.size || product.packSize);
  const blockedAsInCart = isOutOfStock && alreadyInCart;

  const handleAddToCart = () => {
    if (blockedAsInCart) return;
    const itemToAdd = {
      ...product,
      price: currentPrice,
      originalPrice: currentOriginalPrice,
      packSize: selectedVariant?.size || product.packSize,
    };
    addToCart(itemToAdd, quantity);
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 2000);
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          {/* Backdrop with Frosted Blur */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/70 backdrop-blur-sm cursor-pointer"
          />

          {/* Modal Dialog */}
          <motion.div
            initial={{ opacity: 0, scale: 0.94, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl overflow-hidden z-10 border border-[#E5E7DF] my-auto pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
          >
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-20 w-10 h-10 rounded-full bg-stone-100 hover:bg-stone-200 text-stone-700 flex items-center justify-center transition-colors shadow-xs cursor-pointer focus:outline-hidden"
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>

          <div className="grid grid-cols-1 md:grid-cols-2 max-h-[85vh] overflow-y-auto">
            {/* Left: Product Images Gallery */}
            <div className="bg-[#FBFAF6] p-6 sm:p-8 flex flex-col justify-between border-b md:border-b-0 md:border-r border-[#E5E7DF]">
              {/* Main Image Container */}
              <div className="relative aspect-square w-full rounded-2xl bg-white border border-[#E5E7DF]/70 p-6 flex items-center justify-center overflow-hidden shadow-xs">
                {/* Badges */}
                <div className="absolute top-3 left-3 z-10 flex flex-col gap-1 items-start">
                  {product.isBestSeller && (
                    <span className="px-2.5 py-1 text-[11px] font-semibold bg-[#173D2A] text-[#FAF8F2] rounded-md tracking-wider shadow-xs">
                      Best Seller
                    </span>
                  )}
                  {discountPercent > 0 && (
                    <span className="px-2.5 py-0.5 text-[11px] font-semibold bg-[#386B40] text-white rounded-md shadow-xs">
                      {discountPercent}% OFF
                    </span>
                  )}
                </div>

                <motion.img
                  key={activeImageIndex}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  src={images[activeImageIndex]}
                  alt={product.name}
                  className="max-h-full max-w-full object-contain drop-shadow-md"
                />
              </div>

              {/* Thumbnail Strip */}
              {images.length > 1 && (
                <div className="flex items-center justify-center gap-3 mt-4 pt-2">
                  {images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveImageIndex(idx)}
                      className={`w-14 h-14 rounded-xl border-2 p-1 bg-white overflow-hidden transition-all duration-200 cursor-pointer ${
                        activeImageIndex === idx
                          ? "border-[#386B40] shadow-sm scale-105"
                          : "border-stone-200 opacity-60 hover:opacity-100"
                      }`}
                    >
                      <img
                        src={img}
                        alt={`Thumbnail ${idx + 1}`}
                        className="w-full h-full object-contain"
                      />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Product Details & Purchase Form */}
            <div className="p-6 sm:p-8 flex flex-col justify-between">
              <div>
                {/* Brand & Category */}
                <div className="flex items-center justify-between text-xs text-[#386B40] font-semibold tracking-wider uppercase mb-1">
                  <span>{product.brand || "Divyam Ayurveda"}</span>
                  <span className="text-stone-400 font-normal normal-case">
                    {product.subcategory || product.productForm || "Classical Formulation"}
                  </span>
                </div>

                {/* Title */}
                <h3 className="font-heading tracking-tight text-2xl font-bold text-[#171A17] leading-snug">
                  {product.name}
                </h3>

                {/* Rating */}
                <div className="flex items-center gap-2 mt-2 mb-4">
                  <RatingStars rating={product.rating} reviewCount={product.reviewCount} size={15} />
                  <span className="text-xs text-stone-500">
                    ({product.reviewCount || 100}+ Verified Reviews)
                  </span>
                </div>

                {/* Price Display */}
                <div className="flex items-baseline gap-3 mb-5 p-3 rounded-xl bg-[#FBFAF6] border border-[#E5E7DF]">
                  <span className="text-2xl font-bold text-[#171A17]">
                    {formatINR(currentPrice)}
                  </span>
                  {currentOriginalPrice > currentPrice && (
                    <span className="text-sm text-stone-400 line-through">
                      {formatINR(currentOriginalPrice)}
                    </span>
                  )}
                  {discountPercent > 0 && (
                    <span className="text-xs font-semibold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded-full">
                      Save {discountPercent}%
                    </span>
                  )}
                </div>

                {/* Short Description */}
                <p className="text-xs sm:text-sm text-[#666B64] leading-relaxed mb-5 font-light">
                  {product.shortDescription || product.description?.slice(0, 180) + "..."}
                </p>

                {/* Variant / Size Options */}
                {product.variants && product.variants.length > 0 && (
                  <div className="mb-5">
                    <label className="block text-xs font-semibold text-[#171A17] uppercase tracking-wider mb-2">
                      Select Pack Size
                    </label>
                    <div className="flex flex-wrap gap-2">
                      {product.variants.map((v, idx) => {
                        const isSelected = selectedVariant?.size === v.size;
                        return (
                          <button
                            key={idx}
                            onClick={() => setSelectedVariant(v)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all duration-200 cursor-pointer ${
                              isSelected
                                ? "bg-[#173D2A] text-white border-[#173D2A] shadow-xs"
                                : "bg-white text-stone-700 border-stone-200 hover:border-[#386B40]"
                            }`}
                          >
                            {v.size} &bull; {formatINR(v.price)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Authenticity Badges Strip */}
                <div className="grid grid-cols-2 gap-2 text-[11px] text-[#386B40] font-medium pt-3 pb-5 border-t border-[#E5E7DF]">
                  <span className="flex items-center gap-1.5">
                    <ShieldCheck size={14} className="text-[#386B40]" />
                    <span>100% Ayush Certified</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Sparkles size={14} className="text-[#D4AF37]" />
                    <span>Free Fast Delivery</span>
                  </span>
                </div>
              </div>

              {/* Bottom Actions */}
              <div className="space-y-3 pt-2">
                {isOutOfStock && (
                  <p className="text-xs font-medium text-rose-600">
                    {blockedAsInCart
                      ? "This product is already in your cart. Checkout stays unavailable until it is restocked."
                      : "Currently out of stock \u2014 you can add it to your cart, but checkout stays unavailable until it is restocked."}
                  </p>
                )}
                <div className="flex items-center gap-3">
                  {/* Quantity Counter */}
                  <div className="flex items-center border border-stone-200 rounded-xl overflow-hidden bg-stone-50">
                    <button
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      disabled={quantity <= 1}
                      className="p-2.5 text-stone-600 hover:text-black transition-colors disabled:opacity-40 cursor-pointer"
                      aria-label="Decrease quantity"
                    >
                      <Minus size={14} />
                    </button>
                    <span className="w-9 text-center text-sm font-semibold text-[#171A17]">
                      {quantity}
                    </span>
                    <button
                      onClick={() => setQuantity((q) => Math.min(availableStock, q + 1))}
                      disabled={isOutOfStock || quantity >= availableStock}
                      className="p-2.5 text-stone-600 hover:text-black transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                      aria-label="Increase quantity"
                    >
                      <Plus size={14} />
                    </button>
                  </div>

                  {/* Add to Cart CTA */}
                  <motion.button
                    onClick={handleAddToCart}
                    whileTap={{ scale: blockedAsInCart ? 1 : 0.97 }}
                    className={`flex-1 py-3 px-6 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all duration-300 ${
                      blockedAsInCart
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200 cursor-default"
                        : isAdded
                          ? "bg-[#173D2A] text-white ring-2 ring-[#A9D18E] shadow-md cursor-pointer"
                          : "bg-[#386B40] hover:bg-[#173D2A] text-white shadow-md hover:shadow-lg cursor-pointer"
                    }`}
                  >
                    {blockedAsInCart ? (
                      <>
                        <Check size={17} />
                        <span>Already in Cart</span>
                      </>
                    ) : isAdded ? (
                      <>
                        <Check size={17} className="text-[#A9D18E]" />
                        <span>Added to Cart!</span>
                      </>
                    ) : (
                      <>
                        <ShoppingBag size={17} />
                        <span>
                          {isOutOfStock
                            ? "Add to Cart"
                            : `Add ${quantity} to Cart • ${formatINR(currentPrice * quantity)}`}
                        </span>
                      </>
                    )}
                  </motion.button>

                  {/* Wishlist Button */}
                  <button
                    onClick={() => toggleWishlist(product)}
                    className={`p-3 rounded-xl border transition-colors cursor-pointer ${
                      inWishlist
                        ? "bg-rose-50 border-rose-200 text-rose-600"
                        : "bg-white border-stone-200 text-stone-600 hover:text-rose-600 hover:border-rose-200"
                    }`}
                    title={inWishlist ? "In Wishlist" : "Save for later"}
                  >
                    <Heart size={18} className={inWishlist ? "fill-rose-500 text-rose-500" : ""} />
                  </button>
                </div>

                {/* View Full Product Link */}
                <div className="text-center pt-1">
                  <Link
                    to={`/products/${product.slug}`}
                    onClick={onClose}
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#386B40] hover:text-[#173D2A] hover:underline"
                  >
                    <span>View Complete Product Details &amp; Clinical Information</span>
                    <ArrowRight size={13} />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body
  );
};

