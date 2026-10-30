import React, { useEffect, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Layers, WifiOff } from "lucide-react";
import { Breadcrumbs } from "../components/common/Breadcrumbs";
import { ProductCard } from "../components/products/ProductCard";
import { EmptyState } from "../components/common/EmptyState";
import { ProductGridSkeleton } from "../components/common/Skeleton";
import { categoryService, productService } from "../services/api";

export const CategoryPage = () => {
  const { slug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedSubcategory = searchParams.get("subcategory") || "all";

  const [category, setCategory] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);

  useEffect(() => {
    // A newer request (slug/subcategory changed, or retry) makes this one stale
    let cancelled = false;
    const loadCategoryData = async () => {
      setLoading(true);
      setLoadError(false);
      try {
        const cat = await categoryService.getCategoryBySlug(slug);
        if (cancelled) return;
        setCategory(cat);

        const result = await productService.getProducts({
          category: slug,
          subcategory: selectedSubcategory !== "all" ? selectedSubcategory : undefined,
          limit: 30,
        });
        if (cancelled) return;
        setProducts(result.products);
        setLoadError(Boolean(result.backendUnavailable) && result.products.length === 0);
      } catch (err) {
        console.error("Error loading category page:", err);
        if (!cancelled) setLoadError(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadCategoryData();
    return () => {
      cancelled = true;
    };
  }, [slug, selectedSubcategory, reloadTick]);

  const handleSubcategorySelect = (subSlug) => {
    if (subSlug === "all") {
      const nextParams = new URLSearchParams(searchParams);
      nextParams.delete("subcategory");
      setSearchParams(nextParams);
    } else {
      setSearchParams({ subcategory: subSlug });
    }
  };

  const currentSubcategoryObj = category?.subcategories?.find(
    (s) => s.slug === selectedSubcategory || s.id === selectedSubcategory
  );

  if (!loading && !category && loadError) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16">
        <EmptyState
          icon={WifiOff}
          title="We couldn't load this category"
          description="The store didn't respond. Check your connection and try again."
          actionText="Try again"
          onAction={() => setReloadTick((n) => n + 1)}
        />
      </div>
    );
  }

  if (!loading && !category) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16">
        <EmptyState
          title="Category Not Found"
          description={`We couldn't locate the category "${slug}". Please browse all available Ayurvedic collections.`}
          actionText="Browse Catalog"
          actionLink="/products"
        />
      </div>
    );
  }

  const breadcrumbItems = [
    { label: "Products", href: "/products" },
    {
      label: category?.name || slug,
      href: selectedSubcategory !== "all" ? `/category/${slug}` : undefined,
    },
  ];

  if (selectedSubcategory !== "all" && currentSubcategoryObj) {
    breadcrumbItems.push({ label: currentSubcategoryObj.name });
  }

  return (
    <div className="bg-[#FBFAF6] min-h-screen pb-16">
      {/* Category Hero Banner */}
      <div className="relative bg-[#173D2A] text-white py-12 lg:py-16 overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <img
            src={category?.bannerImage || category?.image || "/images/ProductImages/Himalya.png"}
            alt={category?.name || "Category banner"}
            className="w-full h-full object-cover"
          />
        </div>
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center sm:text-left">
          <div className="max-w-2xl space-y-2">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#A9D18E] flex items-center justify-center sm:justify-start gap-1.5">
              <Layers size={13} />
              <span>Ayurvedic Collection</span>
            </span>
            <h1 className="font-heading tracking-tight text-3xl sm:text-4xl lg:text-5xl font-bold">
              {category?.name}
            </h1>
            <p className="text-sm sm:text-base text-stone-200 leading-relaxed pt-1">
              {category?.description}
            </p>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {/* Breadcrumbs */}
        <Breadcrumbs items={breadcrumbItems} />

        {/* Subcategories Filter Pills */}
        {category?.subcategories && category.subcategories.length > 0 && (
          <div className="mt-4 mb-6">
            <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
              <button
                type="button"
                onClick={() => handleSubcategorySelect("all")}
                className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                  selectedSubcategory === "all"
                    ? "bg-[#173D2A] text-white shadow-xs"
                    : "bg-white text-stone-700 border border-[#E5E7DF] hover:bg-stone-50"
                }`}
              >
                All {category.name}
              </button>

              {category.subcategories.map((sub) => {
                const isActive = selectedSubcategory === sub.slug || selectedSubcategory === sub.id;
                return (
                  <button
                    key={sub.id}
                    type="button"
                    onClick={() => handleSubcategorySelect(sub.slug)}
                    className={`px-4 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                      isActive
                        ? "bg-[#173D2A] text-white shadow-xs"
                        : "bg-white text-stone-700 border border-[#E5E7DF] hover:bg-stone-50 hover:border-[#386B40]/60"
                    }`}
                  >
                    {sub.name}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Product Count Header & Subcategory Description */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between py-4 mb-6 border-b border-[#E5E7DF] gap-2">
          <div>
            <span className="text-xs font-medium text-stone-500">
              Showing <span className="font-bold text-[#171A17]">{products.length}</span>{" "}
              {selectedSubcategory !== "all" && currentSubcategoryObj
                ? `formulations in ${currentSubcategoryObj.name}`
                : `formulations in ${category?.name}`}
            </span>
            {currentSubcategoryObj?.description && (
              <p className="text-xs text-[#666B64] mt-0.5">
                {currentSubcategoryObj.description}
              </p>
            )}
          </div>
          <Link
            to="/products"
            className="text-xs font-semibold text-[#173D2A] hover:underline shrink-0"
          >
            All Products &rarr;
          </Link>
        </div>

        {/* Product Grid with Smooth Transition */}
        {loading ? (
          <ProductGridSkeleton count={8} className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6" />
        ) : loadError ? (
          <EmptyState
            icon={WifiOff}
            title="We couldn't load these products"
            description="The store didn't respond. Check your connection and try again."
            actionText="Try again"
            onAction={() => setReloadTick((n) => n + 1)}
          />
        ) : products.length === 0 ? (
          <EmptyState
            title="No formulations found in this subcategory"
            description="Try selecting another subcategory or browse the full Ayurvedic collection."
            actionText="View All Formulations"
            onAction={() => handleSubcategorySelect("all")}
          />
        ) : (
          <motion.div
            key={selectedSubcategory}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6"
          >
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
};
