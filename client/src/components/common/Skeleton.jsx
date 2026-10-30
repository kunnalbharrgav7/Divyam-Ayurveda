import React from "react";

/**
 * Shared loading placeholders. Each composite mirrors the real component's structure and
 * breakpoints so content swaps in without shifting the layout. The pulse is wrapped in
 * `motion-safe:` so it stops for visitors who prefer reduced motion.
 */

export const Skeleton = ({ className = "", style }) => (
  <div
    aria-hidden="true"
    style={style}
    className={`bg-stone-200/70 ${/(^|\s)rounded/.test(className) ? "" : "rounded-md"} motion-safe:animate-pulse ${className}`}
  />
);

/**
 * Wraps a loading region: marks it busy for assistive tech and announces `label` once.
 * The visible placeholders inside are aria-hidden.
 */
export const SkeletonRegion = ({ label = "Loading", className = "", children }) => (
  <div aria-busy="true" className={className}>
    <span role="status" className="sr-only">
      {label}…
    </span>
    {children}
  </div>
);

// Mirrors components/products/ProductCard.jsx: square image, then title, subtitle, rating, price and button
export const ProductCardSkeleton = () => (
  <div aria-hidden="true" className="flex flex-col bg-white rounded-2xl border border-[#E5E7DF] overflow-hidden">
    <div className="aspect-square w-full bg-[#FBFAF6] p-4 flex items-center justify-center">
      <Skeleton className="w-full h-full rounded-xl" />
    </div>
    <div className="p-4 flex flex-col flex-1">
      <Skeleton className="h-5 w-4/5 mb-1" />
      <Skeleton className="h-3.5 w-1/2 mb-2" />
      <Skeleton className="h-3.5 w-2/5 mb-3" />
      <div className="pt-2 flex flex-col gap-3">
        <Skeleton className="h-7 w-1/3" />
        <Skeleton className="h-10 w-full rounded-xl" />
      </div>
    </div>
  </div>
);

/** A grid of product-card placeholders. Pass the same `className` the real grid uses. */
export const ProductGridSkeleton = ({
  count = 5,
  className = "grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6",
  label = "Loading products",
}) => (
  <SkeletonRegion label={label} className={className}>
    {Array.from({ length: count }, (_, i) => (
      <ProductCardSkeleton key={i} />
    ))}
  </SkeletonRegion>
);

/** Placeholder rows for AdminTable; `columns` is the real column count including any checkbox column. */
export const TableRowsSkeleton = ({ columns = 4, rows = 6 }) => (
  <>
    {Array.from({ length: rows }, (_, r) => (
      <tr key={r} aria-hidden="true">
        {Array.from({ length: columns }, (_, c) => (
          <td key={c} className="px-4 py-4">
            <Skeleton className={`h-4 ${c === 0 ? "w-3/4" : c === columns - 1 ? "w-1/3" : "w-2/3"}`} />
          </td>
        ))}
      </tr>
    ))}
  </>
);

/** Mirrors the admin dashboard KPI cards (label, value, caption, icon tile). */
export const StatCardSkeleton = () => (
  <div aria-hidden="true" className="bg-white rounded-2xl border border-stone-200 p-5 sm:p-6 flex items-start justify-between gap-4">
    <div className="flex-1 space-y-3">
      <Skeleton className="h-3 w-24" />
      <Skeleton className="h-8 w-32" />
      <Skeleton className="h-3 w-40" />
    </div>
    <Skeleton className="h-12 w-12 rounded-xl shrink-0" />
  </div>
);

/** Simple stacked rows for lists of cards or records. */
export const ListRowsSkeleton = ({ rows = 4, className = "", label = "Loading" }) => (
  <SkeletonRegion label={label} className={`space-y-3 ${className}`}>
    {Array.from({ length: rows }, (_, i) => (
      <div key={i} aria-hidden="true" className="bg-white rounded-2xl border border-[#E5E7DF] p-4 flex items-center gap-4">
        <Skeleton className="h-12 w-12 rounded-xl shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-1/2" />
          <Skeleton className="h-3 w-3/4" />
        </div>
        <Skeleton className="h-6 w-16 rounded-full shrink-0" />
      </div>
    ))}
  </SkeletonRegion>
);

/** Article layout: title, byline, hero image and paragraphs (blog post). */
export const ArticleSkeleton = () => (
  <SkeletonRegion label="Loading article" className="space-y-6">
    <Skeleton className="h-4 w-40" />
    <Skeleton className="h-10 w-4/5" />
    <Skeleton className="h-4 w-56" />
    <Skeleton className="h-64 sm:h-96 w-full rounded-3xl" />
    <div className="space-y-3">
      {[100, 95, 100, 85, 100, 70].map((w, i) => (
        <Skeleton key={i} className="h-4" style={{ width: `${w}%` }} />
      ))}
    </div>
  </SkeletonRegion>
);

/** Route-level fallback while a lazily loaded page chunk downloads (the surrounding layout stays visible). */
export const PageSkeleton = () => (
  <SkeletonRegion label="Loading page" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 min-h-[60vh]">
    <Skeleton className="h-4 w-40" />
    <Skeleton className="h-9 w-2/3 sm:w-1/3" />
    <Skeleton className="h-4 w-full max-w-xl" />
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
      {[0, 1, 2].map((i) => (
        <Skeleton key={i} className="h-48 rounded-2xl" />
      ))}
    </div>
  </SkeletonRegion>
);

/**
 * Card placeholders for the admin card grids (categories, brands, collections, coupons,
 * ingredients, blog). Render inside the page's own grid, before the real cards.
 */
export const AdminCardGridSkeleton = ({ count = 6, label = "Loading" }) => (
  <>
    <span role="status" className="sr-only">
      {label}…
    </span>
    {Array.from({ length: count }, (_, i) => (
      <div key={i} aria-hidden="true" className="bg-white rounded-2xl border border-stone-200 p-5 space-y-4">
        <div className="flex items-center gap-3">
          <Skeleton className="h-12 w-12 rounded-xl shrink-0" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-2/3" />
            <Skeleton className="h-3 w-1/3" />
          </div>
        </div>
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
      </div>
    ))}
  </>
);

/** Admin detail/edit screens (order, customer, product form) while their record is loading. */
export const DetailPageSkeleton = ({ label = "Loading" }) => (
  <SkeletonRegion label={label} className="space-y-6">
    <div className="flex items-center gap-3">
      <Skeleton className="h-10 w-10 rounded-xl" />
      <div className="space-y-2">
        <Skeleton className="h-7 w-64 max-w-full" />
        <Skeleton className="h-3 w-40" />
      </div>
    </div>
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 space-y-6">
        {[0, 1].map((i) => (
          <div key={i} aria-hidden="true" className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <Skeleton className="h-24 w-full rounded-xl" />
          </div>
        ))}
      </div>
      <div aria-hidden="true" className="bg-white rounded-2xl border border-stone-200 p-6 space-y-4 self-start">
        <Skeleton className="h-5 w-32" />
        <Skeleton className="h-10 w-full rounded-xl" />
        <Skeleton className="h-10 w-full rounded-xl" />
        <Skeleton className="h-10 w-full rounded-xl" />
      </div>
    </div>
  </SkeletonRegion>
);
