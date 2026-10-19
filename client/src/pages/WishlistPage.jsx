import React from "react";
import { Link } from "react-router-dom";
import { Heart, ShoppingBag, Trash2, ArrowLeft } from "lucide-react";
import { Breadcrumbs } from "../components/common/Breadcrumbs";
import { EmptyState } from "../components/common/EmptyState";
import { ProductCard } from "../components/products/ProductCard";
import { useWishlist } from "../context/WishlistContext";
import { useCart } from "../context/CartContext";
import { useLiveStock, getAvailableUnits } from "../hooks/useLiveStock";

export const WishlistPage = () => {
  const { wishlistItems, clearWishlist, wishlistCount } = useWishlist();
  const { addToCart } = useCart();

  // Wishlist items are snapshots from when they were saved; overlay live stock so
  // restocked / sold-out products display correctly.
  const { stockMap } = useLiveStock(wishlistItems);
  const liveWishlistItems = wishlistItems.map((product) => {
    const units = getAvailableUnits(product, undefined, stockMap[product.id]);
    return Number.isFinite(units) ? { ...product, stockQuantity: units } : product;
  });

  const handleAddAllToCart = () => {
    liveWishlistItems.forEach((product) => {
      addToCart(product, 1);
    });
  };

  if (wishlistItems.length === 0) {
    return (
      <div className="bg-[#FBFAF6] min-h-screen py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Breadcrumbs items={[{ label: "My Wishlist" }]} />
          <EmptyState
            icon={Heart}
            title="Your Wishlist is Empty"
            description="Save your favorite Ayurvedic herbs, classical churnas, and botanical oils here for later purchase."
            actionText="Discover Formulations"
            actionLink="/products"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#FBFAF6] min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Breadcrumbs items={[{ label: "My Wishlist" }]} />

        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 mb-8 border-b border-[#E5E7DF] gap-4">
          <div>
            <h1 className="font-heading tracking-tight text-3xl font-bold text-[#171A17]">
              Saved Products ({wishlistCount})
            </h1>
            <p className="text-xs sm:text-sm text-[#666B64] mt-1">
              Your personal shortlist of traditional Indian herbal formulas.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleAddAllToCart}
              className="px-4 py-2 bg-[#386B40] hover:bg-[#173D2A] text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-xs transition-colors"
            >
              <ShoppingBag size={14} />
              <span>Add All to Cart</span>
            </button>
            <button
              onClick={clearWishlist}
              className="px-3 py-2 text-stone-500 hover:text-rose-600 text-xs font-medium"
            >
              Clear All
            </button>
          </div>
        </div>

        {/* Wishlist Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {liveWishlistItems.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>

        <div className="mt-8 pt-6 border-t border-[#E5E7DF]">
          <Link
            to="/products"
            className="inline-flex items-center gap-2 text-xs font-semibold text-[#173D2A] hover:underline"
          >
            <ArrowLeft size={14} />
            <span>Continue Shopping</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
