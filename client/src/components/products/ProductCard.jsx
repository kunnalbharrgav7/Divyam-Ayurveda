import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Heart, ShoppingBag, Check } from "lucide-react";
import { RatingStars } from "../common/RatingStars";
import { formatINR, getDiscountPercentage } from "../../utils/formatters";
import { useCart } from "../../context/CartContext";
import { useWishlist } from "../../context/WishlistContext";

export const ProductCard = ({ product }) => {
  const { addToCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();
  const [isAdded, setIsAdded] = useState(false);

  if (!product) return null;

  const inWishlist = isInWishlist(product.id);
  const discountPercent = getDiscountPercentage(product.price, product.originalPrice);

  const handleAddToCart = (e) => {
    e.preventDefault();
    e.stopPropagation();
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
    <div className="group relative flex flex-col bg-white rounded-2xl border border-[#E5E7DF] overflow-hidden transition-all duration-300 hover:shadow-md hover:border-[#A9D18E]/60">
      {/* Top Badges & Wishlist Action */}
      <div className="absolute top-3 inset-x-3 z-10 flex items-center justify-between pointer-events-none">
        <div className="flex flex-col gap-1 items-start">
          {product.isBestSeller && (
            <span className="px-2 py-0.5 text-[11px] font-semibold bg-[#173D2A] text-white rounded-md tracking-wider">
              Best Seller
            </span>
          )}
          {product.isNew && (
            <span className="px-2 py-0.5 text-[11px] font-semibold bg-emerald-600 text-white rounded-md tracking-wider">
              New
            </span>
          )}
          {discountPercent > 0 && !product.isBestSeller && (
            <span className="px-2 py-0.5 text-[11px] font-semibold bg-[#386B40] text-white rounded-md">
              {discountPercent}% OFF
            </span>
          )}
        </div>

        <button
          onClick={handleWishlistToggle}
          className={`pointer-events-auto p-2 rounded-full transition-all duration-200 ${
            inWishlist
              ? "bg-rose-50 text-rose-600 shadow-xs"
              : "bg-white/90 text-stone-600 hover:text-rose-600 hover:bg-white shadow-xs"
          }`}
          title={inWishlist ? "Remove from Wishlist" : "Add to Wishlist"}
          aria-label={inWishlist ? "Remove from Wishlist" : "Add to Wishlist"}
        >
          <Heart size={18} className={inWishlist ? "fill-rose-500 text-rose-500" : ""} />
        </button>
      </div>

      {/* Image Container */}
      <Link
        to={`/products/${product.slug}`}
        className="block relative aspect-square w-full overflow-hidden bg-[#FBFAF6] p-4 flex items-center justify-center"
      >
        <img
          src={product.images?.[0] || product.image || "/images/ProductImages/Ashuwaganda.png"}
          alt={product.name}
          loading="lazy"
          className="w-full h-full object-contain object-center transition-transform duration-500 group-hover:scale-105"
        />
      </Link>

      {/* Product Content Details */}
      <div className="p-4 flex flex-col flex-1">
        <Link to={`/products/${product.slug}`} className="block mb-1">
          <h3 className="text-base font-semibold text-[#171A17] hover:text-[#173D2A] transition-colors line-clamp-1 leading-snug">
            {product.name}
          </h3>
        </Link>

        {/* Subtitle / Pack Size info */}
        <p className="text-xs text-[#666B64] mb-2 line-clamp-1">
          {product.productForm || "Classical"} | {product.packSize}
        </p>

        {/* Rating and Reviews */}
        <div className="mb-3">
          <RatingStars rating={product.rating} reviewCount={product.reviewCount} size={14} />
        </div>

        {/* Price & Add to Cart button */}
        <div className="mt-auto pt-2 flex flex-col gap-3">
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold text-[#171A17]">
              {formatINR(product.price)}
            </span>
            {product.originalPrice && product.originalPrice > product.price && (
              <span className="text-xs text-stone-400 line-through">
                {formatINR(product.originalPrice)}
              </span>
            )}
          </div>

          <button
            onClick={handleAddToCart}
            disabled={product.stockQuantity === 0}
            className={`w-full py-2.5 px-4 rounded-xl text-sm font-medium flex items-center justify-center gap-2 transition-all duration-200 ${
              product.stockQuantity === 0
                ? "bg-stone-200 text-stone-500 cursor-not-allowed"
                : isAdded
                ? "bg-[#173D2A] text-white ring-2 ring-[#A9D18E]"
                : "bg-[#386B40] hover:bg-[#173D2A] text-white shadow-xs hover:shadow"
            }`}
          >
            {product.stockQuantity === 0 ? (
              "Out of Stock"
            ) : isAdded ? (
              <>
                <Check size={16} className="text-[#A9D18E]" />
                <span>Added to Cart</span>
              </>
            ) : (
              <>
                <ShoppingBag size={16} />
                <span>Add to Cart</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

