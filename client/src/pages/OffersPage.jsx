import React, { useState, useEffect, useMemo } from "react";
import { Sparkles, Copy, Check } from "lucide-react";
import { Breadcrumbs } from "../components/common/Breadcrumbs";
import { ProductCard } from "../components/products/ProductCard";
import { productService, couponService } from "../services/api";
import { formatINR, getDiscountPercentage } from "../utils/formatters";

// Human-readable terms of an offer, built from the saved values
const describeCoupon = (coupon) => {
  const amount = coupon.type === "fixed_amount" ? formatINR(coupon.discountValue) : `${coupon.discountValue}%`;
  let text = `${amount} off`;
  if (coupon.minOrder > 0) text += ` on ${coupon.appliesTo === "products" ? "eligible products worth" : "orders above"} ${formatINR(coupon.minOrder)}`;
  if (coupon.type === "percentage" && coupon.maxDiscount > 0) text += ` (up to ${formatINR(coupon.maxDiscount)})`;
  return text;
};

export const OffersPage = () => {
  const [allProducts, setAllProducts] = useState([]);
  const [coupons, setCoupons] = useState([]);
  const [copiedCode, setCopiedCode] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchOffers = async () => {
      try {
        const [res, couponList] = await Promise.all([
          productService.getProducts({ limit: 50 }),
          couponService.getPublicCoupons(),
        ]);
        if (!isMounted) return;
        if (res?.products) setAllProducts(res.products);
        setCoupons(couponList);
      } catch (err) {
        console.error("Failed to load offers:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchOffers();
    return () => {
      isMounted = false;
    };
  }, []);

  // Filter products that have an originalPrice greater than price
  const discountedProducts = useMemo(() => {
    return allProducts.filter((p) => p.originalPrice > p.price);
  }, [allProducts]);

  // Headline saving comes from the real catalog prices instead of a hardcoded number
  const maxSavingPercent = useMemo(
    () => Math.max(0, ...discountedProducts.map((p) => getDiscountPercentage(p.price, p.originalPrice))),
    [discountedProducts]
  );

  const productNameById = useMemo(
    () => Object.fromEntries(allProducts.map((p) => [p.id, p.name])),
    [allProducts]
  );

  const handleCopyCoupon = async (code) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(""), 2000);
    } catch (_) {}
  };

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
            <h1 className="font-heading tracking-tight text-3xl sm:text-5xl font-bold leading-tight">
              Pure Wellness. <br />
              Extraordinary Value.
            </h1>
            <p className="text-xs sm:text-sm text-stone-200 leading-relaxed">
              {maxSavingPercent > 0
                ? `Enjoy up to ${maxSavingPercent}% savings across select authentic Ayurvedic formulations.`
                : "Discover seasonal savings on authentic Ayurvedic formulations."}
            </p>
          </div>

          {/* Running offers (managed in Admin → Discounts & Coupons) */}
          {coupons.length > 0 && (
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl relative z-10">
              {coupons.map((coupon) => {
                const names = (coupon.applicableProductIds || [])
                  .map((id) => productNameById[id])
                  .filter(Boolean);
                const appliesLabel =
                  coupon.appliesTo === "products"
                    ? `On: ${names.slice(0, 3).join(", ")}${coupon.applicableProductIds.length > 3 ? ` +${coupon.applicableProductIds.length - 3} more` : ""}`
                    : "On all products";
                const Wrapper = coupon.autoApply ? "div" : "button";
                return (
                  <Wrapper
                    key={coupon.id}
                    {...(coupon.autoApply
                      ? {}
                      : { type: "button", onClick: () => handleCopyCoupon(coupon.code), title: "Click to copy coupon code" })}
                    className={`p-4 bg-white/10 backdrop-blur-xs rounded-2xl border border-white/20 flex items-start justify-between gap-3 text-left transition-colors ${
                      coupon.autoApply ? "" : "cursor-pointer hover:bg-white/15"
                    }`}
                  >
                    <div className="min-w-0 space-y-0.5">
                      {(coupon.occasion || coupon.title) && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#A9D18E] block">
                          {[coupon.occasion, coupon.title && coupon.title !== `${coupon.occasion} Special` ? coupon.title : ""]
                            .filter(Boolean)
                            .join(" \u2022 ")}
                        </span>
                      )}
                      <span className="text-sm font-bold text-white block">{describeCoupon(coupon)}</span>
                      {!coupon.autoApply && (
                        <span className="font-mono text-base font-bold text-white tracking-wider block">{coupon.code}</span>
                      )}
                      <span className="text-[11px] text-stone-200 block">{appliesLabel}</span>
                      {coupon.description && <span className="text-[11px] text-stone-300 block">{coupon.description}</span>}
                      {coupon.validUntil && (
                        <span className="text-[10px] text-stone-300 block">
                          Valid till {new Date(coupon.validUntil).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
                        </span>
                      )}
                    </div>
                    {coupon.autoApply ? (
                      <span className="text-[11px] px-2.5 py-1 bg-[#A9D18E] text-[#0B2416] rounded-lg font-bold shrink-0">
                        Auto-applied
                      </span>
                    ) : (
                      <span className="text-xs px-2.5 py-1 bg-white text-[#173D2A] rounded-lg font-bold inline-flex items-center gap-1 shrink-0">
                        {copiedCode === coupon.code ? <Check size={12} /> : <Copy size={12} />}
                        {copiedCode === coupon.code ? "Copied" : "Copy"}
                      </span>
                    )}
                  </Wrapper>
                );
              })}
            </div>
          )}
        </div>

        {/* Section Header */}
        <div className="flex items-center justify-between pb-4 mb-6 border-b border-[#E5E7DF]">
          <div>
            <h2 className="font-heading tracking-tight text-2xl font-bold text-[#171A17]">
              Special Offers on Authentic Formulations
            </h2>
            <p className="text-xs text-[#666B64] mt-0.5">
              Showing {discountedProducts.length} items with active promotional pricing.
            </p>
          </div>
        </div>

        {/* Product Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-12">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="aspect-3/4 rounded-2xl bg-stone-100 animate-pulse border border-stone-200" />
            ))}
          </div>
        ) : discountedProducts.length === 0 ? (
          <div className="py-16 text-center text-stone-500">
            No active promotional offers right now. Check back soon for seasonal discounts!
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 mb-12">
            {discountedProducts.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
