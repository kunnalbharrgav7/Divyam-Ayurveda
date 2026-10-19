import React, { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Heart, ShoppingBag, Check, Eye } from "lucide-react";
import { RatingStars } from "../common/RatingStars";
import { formatINR, getDiscountPercentage } from "../../utils/formatters";
import { useCart } from "../../context/CartContext";
import { useWishlist } from "../../context/WishlistContext";
import { ProductQuickViewModal } from "./ProductQuickViewModal";

// Out-of-stock products keep a disabled "Out of Stock" button at the bottom, but can still be
// added to the cart with the cart icon next to the wishlist heart (the cart blocks checkout
// until they are available again).
export const ProductCard = ({ product }) => {
  const { addToCart, isInCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();

  const cardRef = useRef(null);
  const [rotate, setRotate] = useState({ x: 0, y: 0 });
  const [glowPos, setGlowPos] = useState({ x: 50, y: 50 });
  const [isAdded, setIsAdded] = useState(false);
  const [isQuickViewOpen, setIsQuickViewOpen] = useState(false);
  const [showInCartNotice, setShowInCartNotice] = useState(false);

  if (!product) return null;

  const inWishlist = isInWishlist(product.id);
  const isOutOfStock = Number.isFinite(product.stockQuantity) && product.stockQuantity <= 0;
  const alreadyInCart = isInCart(product.id);
  const discountPercent = getDiscountPercentage(
    product.price,
    product.originalPrice,
  );

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -5.5;
    const rotateY = ((x - centerX) / centerX) * 5.5;
    setRotate({ x: rotateX, y: rotateY });
    setGlowPos({
      x: Math.round((x / rect.width) * 100),
      y: Math.round((y / rect.height) * 100),
    });
  };

  const handleMouseLeave = () => {
    setRotate({ x: 0, y: 0 });
  };

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
    // An out-of-stock item can't be bought, so adding it again would only inflate the cart quantity
    if (isOutOfStock && alreadyInCart) {
      setShowInCartNotice(true);
      setTimeout(() => setShowInCartNotice(false), 4000);
      return;
    }
    addToCart(product, 1);
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 1800);
  };

  const handleWishlistToggle = (e) => {
    e.preventDefault();
    e.stopPropagation();
    toggleWishlist(product);
  };

  return (
    <>
      <motion.div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        initial={{ opacity: 0, y: 15 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-30px" }}
        animate={{
          rotateX: rotate.x,
          rotateY: rotate.y,
          transformPerspective: 1000,
        }}
        whileHover={{ y: -6 }}
        transition={{
          type: "spring",
          stiffness: 280,
          damping: 24,
        }}
        className="group relative flex flex-col bg-white rounded-2xl border border-[#E5E7DF] overflow-hidden transition-shadow duration-300 ease-out hover:shadow-2xl hover:border-[#A9D18E]/90"
        style={{ transformStyle: "preserve-3d" }}
      >
        {/* Dynamic Specular Light Flare Following Cursor */}
        <div
          className="pointer-events-none absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-20"
          style={{
            background: `radial-gradient(circle 240px at ${glowPos.x}% ${glowPos.y}%, rgba(212, 175, 55, 0.12), transparent 70%)`,
          }}
        />

        {/* Top Badges & Wishlist Action */}
        <div className="absolute top-3 inset-x-3 z-10 flex items-center justify-between pointer-events-none">
          <div className="flex flex-col gap-1 items-start">
            {product.isBestSeller && (
              <span className="px-2.5 py-0.5 text-[11px] font-semibold bg-[#173D2A] text-[#FAF8F2] rounded-md tracking-wider shadow-xs transition-transform duration-200 group-hover:scale-105">
                Best Seller
              </span>
            )}
            {product.isNew && (
              <span className="px-2.5 py-0.5 text-[11px] font-semibold bg-emerald-600 text-white rounded-md tracking-wider shadow-xs transition-transform duration-200 group-hover:scale-105">
                New
              </span>
            )}
            {discountPercent > 0 && !product.isBestSeller && (
              <span className="px-2 py-0.5 text-[11px] font-semibold bg-[#386B40] text-white rounded-md shadow-xs">
                {discountPercent}% OFF
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 self-start">
            {isOutOfStock && (
              <motion.button
                onClick={handleAddToCart}
                whileTap={{ scale: 0.82 }}
                whileHover={{ scale: 1.1 }}
                className={`pointer-events-auto p-2 rounded-full transition-colors duration-200 cursor-pointer shadow-xs ${
                  isAdded
                    ? "bg-[#173D2A] text-white ring-2 ring-[#A9D18E]"
                    : alreadyInCart
                      ? "bg-emerald-50 text-emerald-700 ring-2 ring-emerald-200"
                      : "bg-white/90 text-[#173D2A] hover:bg-[#173D2A] hover:text-white backdrop-blur-xs"
                }`}
                title={
                  alreadyInCart
                    ? "Already in your cart"
                    : "Add to Cart (checkout is unavailable until restocked)"
                }
                aria-label={alreadyInCart ? "Already in your cart" : "Add to Cart"}
              >
                {isAdded ? (
                  <Check size={18} className="text-[#A9D18E]" />
                ) : alreadyInCart ? (
                  <Check size={18} />
                ) : (
                  <ShoppingBag size={18} />
                )}
              </motion.button>
            )}

            <motion.button
              onClick={handleWishlistToggle}
              whileTap={{ scale: 0.82 }}
              whileHover={{ scale: 1.1 }}
              className={`pointer-events-auto p-2 rounded-full transition-colors duration-200 cursor-pointer shadow-xs ${
                inWishlist
                  ? "bg-rose-50 text-rose-600 ring-2 ring-rose-200"
                  : "bg-white/90 text-stone-600 hover:text-rose-600 hover:bg-white backdrop-blur-xs"
              }`}
              title={inWishlist ? "Remove from Wishlist" : "Add to Wishlist"}
              aria-label={inWishlist ? "Remove from Wishlist" : "Add to Wishlist"}
            >
              <Heart
                size={18}
                className={`transition-all duration-200 ${
                  inWishlist ? "fill-rose-500 text-rose-500 scale-110" : "group-hover/btn:scale-105"
                }`}
              />
            </motion.button>
          </div>
        </div>

        {/* "Already in cart" notice for out-of-stock items */}
        {showInCartNotice && (
          <div className="absolute top-14 right-3 z-30 px-3 py-1.5 rounded-lg bg-stone-900 text-white text-[11px] font-medium shadow-lg flex items-center gap-2 animate-in fade-in duration-150">
            <span>This product is already in your cart</span>
            <Link to="/cart" className="font-semibold text-[#A9D18E] hover:underline">
              View Cart
            </Link>
          </div>
        )}

        {/* Image Container with Dynamic Spring Zoom & Quick View Reveal */}
        <div className="relative aspect-square w-full overflow-hidden bg-[#FBFAF6] p-4 flex items-center justify-center group/img">
          <Link
            to={`/products/${product.slug}`}
            className="w-full h-full flex items-center justify-center"
          >
            <img
              src={
                product.images?.[0] ||
                product.image ||
                "/images/ProductImages/Ashuwaganda.png"
              }
              alt={product.name}
              loading="lazy"
              className="w-full h-full object-contain object-center transition-transform duration-700 ease-out group-hover:scale-110 group-hover:-rotate-1 drop-shadow-xs"
            />
          </Link>

          {/* Quick View Hover Button */}
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setIsQuickViewOpen(true);
            }}
            className="absolute bottom-3 inset-x-4 z-10 py-2 px-3 rounded-xl bg-white/95 backdrop-blur-md text-[#173D2A] hover:bg-[#173D2A] hover:text-white text-xs font-semibold shadow-md flex items-center justify-center gap-1.5 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-200 cursor-pointer"
            aria-label="Quick view product details"
          >
            <Eye size={14} />
            <span>Quick View</span>
          </button>

          {/* Subtle radial glow on card hover */}
          <div className="absolute inset-0 bg-radial from-[#A9D18E]/0 via-transparent to-transparent group-hover:from-[#A9D18E]/10 transition-all duration-500 pointer-events-none" />
        </div>

        {/* Product Content Details */}
        <div className="p-4 flex flex-col flex-1">
          <Link to={`/products/${product.slug}`} className="block mb-1 group/title">
            <h3 className="text-base font-semibold text-[#171A17] group-hover/title:text-[#173D2A] transition-colors line-clamp-1 leading-snug">
              {product.name}
            </h3>
          </Link>

          {/* Subtitle / Pack Size info */}
          <p className="text-xs text-[#666B64] mb-2 line-clamp-1">
            {product.productForm || "Classical"} | {product.packSize}
          </p>

          {/* Rating and Reviews */}
          <div className="mb-3">
            <RatingStars
              rating={product.rating}
              reviewCount={product.reviewCount}
              size={14}
            />
          </div>

          {/* Price & Add to Cart button */}
          <div className="mt-auto pt-2 flex flex-col gap-3">
            <div className="flex items-baseline gap-2">
              <span className="text-lg font-bold text-[#171A17]">
                {formatINR(product.price)}
              </span>
              {product.originalPrice > product.price && (
                <span className="text-xs text-stone-400 line-through">
                  {formatINR(product.originalPrice)}
                </span>
              )}
            </div>

            <motion.button
              onClick={handleAddToCart}
              disabled={isOutOfStock}
              whileTap={{ scale: isOutOfStock ? 1 : 0.96 }}
              whileHover={{ scale: isOutOfStock ? 1 : 1.02 }}
              className={`w-full py-2.5 px-4 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all duration-200 ${
                isOutOfStock
                  ? "bg-stone-200 text-stone-500 cursor-not-allowed"
                  : isAdded
                    ? "bg-[#173D2A] text-white ring-2 ring-[#A9D18E] shadow-sm cursor-pointer"
                    : "bg-[#386B40] hover:bg-[#173D2A] text-white shadow-xs hover:shadow-md cursor-pointer"
              }`}
            >
              {isOutOfStock ? (
                "Out of Stock"
              ) : isAdded ? (
                <span className="inline-flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-150 font-semibold">
                  <Check size={16} className="text-[#A9D18E]" />
                  <span>Added to Cart</span>
                </span>
              ) : (
                <span className="inline-flex items-center gap-1.5">
                  <ShoppingBag size={16} />
                  <span>Add to Cart</span>
                </span>
              )}
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Quick View Modal */}
      <ProductQuickViewModal
        product={product}
        isOpen={isQuickViewOpen}
        onClose={() => setIsQuickViewOpen(false)}
      />
    </>
  );
};
