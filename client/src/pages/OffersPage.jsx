import React, { useMemo } from "react";
import { Sparkles, Tag, Percent, ArrowRight } from "lucide-react";
import { Breadcrumbs } from "../components/common/Breadcrumbs";
import { ProductCard } from "../components/products/ProductCard";
import { products } from "../data/products";

export const OffersPage = () => {
  // Filter products that have an originalPrice greater than price
  const discountedProducts = useMemo(() => {
    return products.filter((p) => p.originalPrice && p.originalPrice > p.price);
  }, []);

  return (
    <div className="bg-[#FBFAF6] min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Breadcrumbs items={[{ label: "Exclusive Offers & Savings" }]} />

        {/* Hero Coupon Banner */}
        <div className="bg-[#173D2A] text-white rounded-3xl p-8 sm:p-12 mb-10 relative overflow-hidden shadow-xs">
          <div className="max-w-xl space-y-3 relative z-10">
            <span className="px-3 py-1 text-xs font-semibold uppercase tracking-wider bg-[#A9D18E] text-[#0B2416] rounded-full inline-flex items-center gap-1.5">
              <Sparkles size={13} /> Seasonal Herbal Savings
            </span>
            <h1 className="font-serif text-3xl sm:text-5xl font-bold leading-tight">
              Pure Wellness. <br />
              Extraordinary Value.
            </h1>
            <p className="text-xs sm:text-sm text-stone-200 leading-relaxed">
              Enjoy up to 35% savings across select classical churnas, single-origin raw honey, and cold-pressed elixirs.
            </p>
          </div>

          {/* Promo code cards */}
          <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg relative z-10">
            <div className="p-4 bg-white/10 backdrop-blur-xs rounded-2xl border border-white/20 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-[#A9D18E] font-semibold block">Flat 10% Off Orders &gt; ₹999</span>
                <span className="font-mono text-base font-bold text-white tracking-wider">VEDA10</span>
              </div>
              <span className="text-xs px-2.5 py-1 bg-white text-[#173D2A] rounded-lg font-bold">Coupon</span>
            </div>

            <div className="p-4 bg-white/10 backdrop-blur-xs rounded-2xl border border-white/20 flex items-center justify-between">
              <div>
                <span className="text-[11px] text-[#A9D18E] font-semibold block">Free Shipping Above ₹499</span>
                <span className="font-mono text-base font-bold text-white tracking-wider">AUTO-APPLIED</span>
              </div>
              <span className="text-xs px-2.5 py-1 bg-[#A9D18E] text-[#0B2416] rounded-lg font-bold">Active</span>
            </div>
          </div>
        </div>

        {/* Section Header */}
        <div className="flex items-center justify-between pb-4 mb-6 border-b border-[#E5E7DF]">
          <div>
            <h2 className="font-serif text-2xl font-bold text-[#171A17]">
              Special Offers on Authentic Formulations
            </h2>
            <p className="text-xs text-[#666B64] mt-0.5">
              Showing {discountedProducts.length} items with active promotional pricing.
            </p>
          </div>
        </div>

        {/* Product Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-12">
          {discountedProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </div>
    </div>
  );
};
