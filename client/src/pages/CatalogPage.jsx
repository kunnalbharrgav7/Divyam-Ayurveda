import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Filter, X, SlidersHorizontal, ArrowUpDown, Search, RefreshCw } from "lucide-react";
import { ProductCard } from "../components/products/ProductCard";
import { Breadcrumbs } from "../components/common/Breadcrumbs";
import { EmptyState } from "../components/common/EmptyState";
import { productService, categoryService } from "../services/api";

export const CatalogPage = () => {
  const [searchParams, setSearchParams] = useSearchParams();

  // URL parameters state
  const categoryParam = searchParams.get("category") || "all";
  const subcategoryParam = searchParams.get("subcategory") || "all";
  const searchParam = searchParams.get("search") || "";
  const sortParam = searchParams.get("sort") || "featured";
  const minPriceParam = searchParams.get("minPrice") || "";
  const maxPriceParam = searchParams.get("maxPrice") || "";
  const minRatingParam = searchParams.get("rating") || "";
  const inStockParam = searchParams.get("inStock") === "true";
  const collectionParam = searchParams.get("collection") || "";

  // Local filter states
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [categoriesList, setCategoriesList] = useState([]);
  const [products, setProducts] = useState([]);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchCats = async () => {
      try {
        const data = await categoryService.getCategories();
        if (isMounted && Array.isArray(data)) {
          setCategoriesList(data);
        }
      } catch (err) {
        console.error("Failed to load catalog categories:", err);
      }
    };
    fetchCats();
    return () => {
      isMounted = false;
    };
  }, []);

  // Fetch products whenever filters or search query changes
  useEffect(() => {
    const loadProducts = async () => {
      setLoading(true);
      try {
        const result = await productService.getProducts({
          category: categoryParam,
          subcategory: subcategoryParam === "all" ? undefined : subcategoryParam,
          search: searchParam,
          sort: sortParam,
          minPrice: minPriceParam,
          maxPrice: maxPriceParam,
          minRating: minRatingParam,
          inStockOnly: inStockParam,
          collection: collectionParam,
          page: 1,
          limit: 12,
        });
        setProducts(result.products);
        setTotalCount(result.total);
        setHasMore(result.hasMore);
        setPage(1);
      } catch (err) {
        console.error("Error fetching catalog products:", err);
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, [
    categoryParam,
    subcategoryParam,
    searchParam,
    sortParam,
    minPriceParam,
    maxPriceParam,
    minRatingParam,
    inStockParam,
    collectionParam,
  ]);

  const handleLoadMore = async () => {
    const nextPage = page + 1;
    try {
      const result = await productService.getProducts({
        category: categoryParam,
        subcategory: subcategoryParam === "all" ? undefined : subcategoryParam,
        search: searchParam,
        sort: sortParam,
        minPrice: minPriceParam,
        maxPrice: maxPriceParam,
        minRating: minRatingParam,
        inStockOnly: inStockParam,
        collection: collectionParam,
        page: nextPage,
        limit: 12,
      });
      setProducts((prev) => [...prev, ...result.products]);
      setHasMore(result.hasMore);
      setPage(nextPage);
    } catch (err) {
      console.error("Error loading more products:", err);
    }
  };

  const updateParam = (key, value) => {
    const newParams = new URLSearchParams(searchParams);
    if (value === null || value === "" || value === false || value === "all") {
      newParams.delete(key);
    } else {
      newParams.set(key, String(value));
    }
    setSearchParams(newParams);
  };

  const handleCategoryChange = (slug) => {
    const newParams = new URLSearchParams(searchParams);
    if (slug === "all") {
      newParams.delete("category");
    } else {
      newParams.set("category", slug);
    }
    newParams.delete("subcategory");
    setSearchParams(newParams);
  };

  const clearAllFilters = () => {
    setSearchParams({});
  };

  const hasActiveFilters = Boolean(
    categoryParam !== "all" ||
      subcategoryParam !== "all" ||
      searchParam ||
      minPriceParam ||
      maxPriceParam ||
      minRatingParam ||
      inStockParam ||
      collectionParam
  );

  const activeCategoryObj = useMemo(() => {
    return categoriesList.find((c) => c.slug === categoryParam);
  }, [categoryParam, categoriesList]);

  const activeSubcategoryObj = useMemo(() => {
    if (!activeCategoryObj || subcategoryParam === "all") return null;
    return activeCategoryObj.subcategories?.find(
      (s) => s.slug === subcategoryParam || s.id === subcategoryParam
    );
  }, [activeCategoryObj, subcategoryParam]);

  return (
    <div className="bg-[#FBFAF6] min-h-screen py-6 sm:py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumbs */}
        <Breadcrumbs
          items={[
            { label: "Products Catalog", href: "/products" },
            ...(activeCategoryObj
              ? [
                  {
                    label: activeCategoryObj.name,
                    href:
                      subcategoryParam !== "all"
                        ? `/products?category=${activeCategoryObj.slug}`
                        : undefined,
                  },
                ]
              : []),
            ...(activeSubcategoryObj ? [{ label: activeSubcategoryObj.name }] : []),
          ]}
        />

        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between py-4 mb-6 border-b border-[#E5E7DF] gap-4">
          <div>
            <h1 className="font-heading tracking-tight text-3xl sm:text-4xl font-bold text-[#171A17]">
              {activeSubcategoryObj
                ? `${activeCategoryObj.name} — ${activeSubcategoryObj.name}`
                : activeCategoryObj
                ? activeCategoryObj.name
                : searchParam
                ? `Search: "${searchParam}"`
                : "All Ayurvedic Formulations"}
            </h1>
            <p className="text-xs sm:text-sm text-[#666B64] mt-1.5">
              {activeSubcategoryObj?.description ||
                activeCategoryObj?.description ||
                "Explore classical herbal churnas, cold-pressed tailams, organic extracts, and daily rasayanas."}
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-stone-500 whitespace-nowrap">
              Showing <span className="font-bold text-[#171A17]">{totalCount}</span> products
            </span>

            {/* Mobile Filter Trigger */}
            <button
              onClick={() => setMobileFiltersOpen(true)}
              className="lg:hidden flex items-center gap-1.5 px-3 py-2 bg-white border border-[#E5E7DF] rounded-xl text-xs font-semibold text-[#173D2A] shadow-xs"
            >
              <SlidersHorizontal size={14} />
              <span>Filters {hasActiveFilters && "•"}</span>
            </button>
          </div>
        </div>

        {/* Catalog Main Layout: Sidebar Filters + Products Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 items-start">
          {/* Desktop Filter Sidebar */}
          <aside className="hidden lg:block bg-white rounded-2xl border border-[#E5E7DF] p-6 shadow-xs sticky top-28 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-[#E5E7DF]">
              <h3 className="font-heading tracking-tight text-lg font-bold text-[#171A17] flex items-center gap-2">
                <Filter size={16} className="text-[#386B40]" />
                <span>Filter By</span>
              </h3>
              {hasActiveFilters && (
                <button
                  onClick={clearAllFilters}
                  className="text-xs font-medium text-rose-600 hover:underline"
                >
                  Clear All
                </button>
              )}
            </div>

            {/* Category Filter */}
            <div>
              <h4 className="text-xs font-bold text-[#171A17] uppercase tracking-wider mb-3">
                Categories
              </h4>
              <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                <button
                  onClick={() => handleCategoryChange("all")}
                  className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center justify-between ${
                    categoryParam === "all"
                      ? "bg-[#173D2A] text-white"
                      : "text-stone-700 hover:bg-stone-100"
                  }`}
                >
                  <span>All Categories</span>
                </button>
                {categoriesList.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => handleCategoryChange(cat.slug)}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center justify-between ${
                      categoryParam === cat.slug
                        ? "bg-[#173D2A] text-white"
                        : "text-stone-700 hover:bg-stone-100"
                    }`}
                  >
                    <span className="truncate">{cat.name}</span>
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded ${
                        categoryParam === cat.slug
                          ? "bg-white/20 text-white"
                          : "bg-stone-100 text-stone-500"
                      }`}
                    >
                      {cat.itemCount}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Subcategory Filter (Desktop) */}
            {activeCategoryObj?.subcategories?.length > 0 && (
              <div className="border-t border-[#E5E7DF] pt-5">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs font-bold text-[#171A17] uppercase tracking-wider">
                    Subcategories
                  </h4>
                  {subcategoryParam !== "all" && (
                    <button
                      onClick={() => updateParam("subcategory", "all")}
                      className="text-[11px] text-emerald-700 hover:underline"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  <button
                    onClick={() => updateParam("subcategory", "all")}
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center justify-between ${
                      subcategoryParam === "all"
                        ? "bg-[#386B40] text-white"
                        : "text-stone-700 hover:bg-stone-100"
                    }`}
                  >
                    <span>All {activeCategoryObj.name}</span>
                  </button>
                  {activeCategoryObj.subcategories.map((sub) => (
                    <button
                      key={sub.id}
                      onClick={() => updateParam("subcategory", sub.slug)}
                      className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center justify-between ${
                        subcategoryParam === sub.slug
                          ? "bg-[#386B40] text-white"
                          : "text-stone-700 hover:bg-stone-100"
                      }`}
                    >
                      <span className="truncate">{sub.name}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Price Filter */}
            <div className="border-t border-[#E5E7DF] pt-5">
              <h4 className="text-xs font-bold text-[#171A17] uppercase tracking-wider mb-3">
                Price Range (INR)
              </h4>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  placeholder="Min ₹"
                  value={minPriceParam}
                  onChange={(e) => updateParam("minPrice", e.target.value)}
                  className="w-1/2 px-2.5 py-1.5 text-xs bg-stone-50 border border-[#E5E7DF] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#386B40]"
                />
                <span className="text-stone-400 text-xs">-</span>
                <input
                  type="number"
                  placeholder="Max ₹"
                  value={maxPriceParam}
                  onChange={(e) => updateParam("maxPrice", e.target.value)}
                  className="w-1/2 px-2.5 py-1.5 text-xs bg-stone-50 border border-[#E5E7DF] rounded-lg focus:outline-none focus:ring-1 focus:ring-[#386B40]"
                />
              </div>
            </div>

            {/* Rating Filter */}
            <div className="border-t border-[#E5E7DF] pt-5">
              <h4 className="text-xs font-bold text-[#171A17] uppercase tracking-wider mb-2.5">
                Customer Rating
              </h4>
              <div className="space-y-1">
                {[
                  { value: "4.8", label: "4.8★ & Above" },
                  { value: "4.5", label: "4.5★ & Above" },
                  { value: "4.0", label: "4.0★ & Above" },
                ].map((r) => (
                  <button
                    key={r.value}
                    onClick={() =>
                      updateParam("rating", minRatingParam === r.value ? "" : r.value)
                    }
                    className={`w-full text-left px-2.5 py-1.5 rounded-lg text-xs font-medium flex items-center justify-between ${
                      minRatingParam === r.value
                        ? "bg-[#386B40] text-white"
                        : "text-stone-600 hover:bg-stone-50"
                    }`}
                  >
                    <span>{r.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* In Stock Only Checkbox */}
            <div className="border-t border-[#E5E7DF] pt-5">
              <label className="flex items-center gap-2.5 cursor-pointer text-xs font-medium text-stone-700">
                <input
                  type="checkbox"
                  checked={inStockParam}
                  onChange={(e) => updateParam("inStock", e.target.checked)}
                  className="rounded border-stone-300 text-[#173D2A] focus:ring-[#386B40]"
                />
                <span>In Stock Only</span>
              </label>
            </div>
          </aside>

          {/* Right Area: Sort Bar + Products Grid */}
          <div className="lg:col-span-3 space-y-6">
            {/* Sorting & Active Filter Pills Bar */}
            <div className="bg-white p-3.5 sm:px-4 rounded-2xl border border-[#E5E7DF] flex flex-wrap items-center justify-between gap-3 shadow-xs">
              {/* Active Filter Badges */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                {hasActiveFilters && (
                  <span className="font-semibold text-stone-500">Active Filters:</span>
                )}
                {categoryParam !== "all" && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-stone-100 text-stone-700 text-xs">
                    Category: {activeCategoryObj?.name || categoryParam}
                    <button
                      onClick={() => handleCategoryChange("all")}
                      className="hover:text-rose-600 ml-1"
                    >
                      <X size={12} />
                    </button>
                  </span>
                )}
                {subcategoryParam !== "all" && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800 text-xs font-semibold">
                    Subcategory: {activeSubcategoryObj?.name || subcategoryParam}
                    <button
                      onClick={() => updateParam("subcategory", "all")}
                      className="hover:text-rose-600 ml-1"
                    >
                      <X size={12} />
                    </button>
                  </span>
                )}
                {searchParam && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-stone-100 text-stone-700 text-xs">
                    Search: {searchParam}
                    <button
                      onClick={() => updateParam("search", "")}
                      className="hover:text-rose-600 ml-1"
                    >
                      <X size={12} />
                    </button>
                  </span>
                )}
                {minPriceParam && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-stone-100 text-stone-700 text-xs">
                    Min: ₹{minPriceParam}
                    <button
                      onClick={() => updateParam("minPrice", "")}
                      className="hover:text-rose-600 ml-1"
                    >
                      <X size={12} />
                    </button>
                  </span>
                )}
                {maxPriceParam && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-stone-100 text-stone-700 text-xs">
                    Max: ₹{maxPriceParam}
                    <button
                      onClick={() => updateParam("maxPrice", "")}
                      className="hover:text-rose-600 ml-1"
                    >
                      <X size={12} />
                    </button>
                  </span>
                )}
                {minRatingParam && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-stone-100 text-stone-700 text-xs">
                    {minRatingParam}★+
                    <button
                      onClick={() => updateParam("rating", "")}
                      className="hover:text-rose-600 ml-1"
                    >
                      <X size={12} />
                    </button>
                  </span>
                )}
              </div>

              {/* Sort Dropdown */}
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-xs text-stone-500 font-medium whitespace-nowrap">
                  Sort By:
                </span>
                <select
                  value={sortParam}
                  onChange={(e) => updateParam("sort", e.target.value)}
                  className="px-3 py-1.5 bg-stone-50 border border-[#E5E7DF] rounded-xl text-xs font-semibold text-[#171A17] focus:outline-none focus:ring-1 focus:ring-[#386B40]"
                >
                  <option value="featured">Featured First</option>
                  <option value="newest">Newest Arrivals</option>
                  <option value="price-low-high">Price: Low to High</option>
                  <option value="price-high-low">Price: High to Low</option>
                  <option value="rating">Highest Rated</option>
                </select>
              </div>
            </div>

            {/* Quick Subcategory Pills Row */}
            {activeCategoryObj?.subcategories?.length > 0 && (
              <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
                <button
                  onClick={() => updateParam("subcategory", "all")}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all shadow-xs ${
                    subcategoryParam === "all"
                      ? "bg-[#173D2A] text-white shadow-emerald-950/10"
                      : "bg-white text-stone-700 hover:bg-stone-50 border border-[#E5E7DF]"
                  }`}
                >
                  All {activeCategoryObj.name}
                </button>
                {activeCategoryObj.subcategories.map((sub) => {
                  const isActive = subcategoryParam === sub.slug;
                  return (
                    <button
                      key={sub.id}
                      onClick={() => updateParam("subcategory", sub.slug)}
                      className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all shadow-xs ${
                        isActive
                          ? "bg-[#386B40] text-white shadow-emerald-950/10"
                          : "bg-white text-stone-700 hover:bg-stone-50 border border-[#E5E7DF]"
                      }`}
                    >
                      {sub.name}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Products Grid */}
            {loading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <div key={n} className="h-80 bg-stone-100 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : products.length === 0 ? (
              <EmptyState
                icon={Search}
                title="No Ayurvedic products match your criteria"
                description="Try clearing some filters, searching for broader terms (e.g., 'churna', 'honey', 'oil', 'immunity'), or reset all filters."
                actionText="Reset All Filters"
                onAction={clearAllFilters}
              />
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {products.map((product) => (
                    <ProductCard key={product.id} product={product} />
                  ))}
                </div>

                {/* Load More Button */}
                {hasMore && (
                  <div className="text-center pt-8">
                    <button
                      onClick={handleLoadMore}
                      className="px-8 py-3 bg-white hover:bg-stone-50 text-[#173D2A] border border-[#E5E7DF] hover:border-[#386B40] text-sm font-semibold rounded-xl shadow-xs transition-all inline-flex items-center gap-2"
                    >
                      <RefreshCw size={15} />
                      <span>Load More Products</span>
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile Drawer Filter Dialog */}
      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs animate-in fade-in duration-200"
            onClick={() => setMobileFiltersOpen(false)}
          />
          <div className="relative ml-auto w-4/5 max-w-sm bg-white h-full shadow-2xl p-6 flex flex-col overflow-y-auto animate-in slide-in-from-right duration-300 ease-out">
            <div className="flex items-center justify-between pb-4 border-b border-[#E5E7DF]">
              <h3 className="font-heading tracking-tight text-lg font-bold text-[#171A17]">Filter Products</h3>
              <button
                onClick={() => setMobileFiltersOpen(false)}
                className="p-1 rounded-lg text-stone-500 hover:bg-stone-100"
              >
                <X size={20} />
              </button>
            </div>

            <div className="py-4 space-y-6 flex-1">
              {/* Category */}
              <div>
                <h4 className="text-xs font-bold text-[#171A17] uppercase tracking-wider mb-2">
                  Category
                </h4>
                <div className="space-y-1">
                  <button
                    onClick={() => {
                      handleCategoryChange("all");
                      setMobileFiltersOpen(false);
                    }}
                    className={`block w-full text-left text-xs py-1.5 px-2 rounded ${
                      categoryParam === "all"
                        ? "bg-[#173D2A] text-white font-medium"
                        : "hover:bg-stone-100 text-stone-700"
                    }`}
                  >
                    All Categories
                  </button>
                  {categoriesList.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => {
                        handleCategoryChange(cat.slug);
                      }}
                      className={`block w-full text-left text-xs py-1.5 px-2 rounded ${
                        categoryParam === cat.slug
                          ? "bg-[#173D2A] text-white font-medium"
                          : "hover:bg-stone-100 text-stone-700"
                      }`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Subcategories (Mobile) */}
              {activeCategoryObj?.subcategories?.length > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-xs font-bold text-[#171A17] uppercase tracking-wider">
                      Subcategories
                    </h4>
                    {subcategoryParam !== "all" && (
                      <button
                        onClick={() => updateParam("subcategory", "all")}
                        className="text-[11px] text-emerald-700 hover:underline"
                      >
                        All
                      </button>
                    )}
                  </div>
                  <div className="space-y-1">
                    <button
                      onClick={() => {
                        updateParam("subcategory", "all");
                        setMobileFiltersOpen(false);
                      }}
                      className={`block w-full text-left text-xs py-1.5 px-2 rounded ${
                        subcategoryParam === "all"
                          ? "bg-[#386B40] text-white font-medium"
                          : "text-stone-700 hover:bg-stone-100"
                      }`}
                    >
                      All {activeCategoryObj.name}
                    </button>
                    {activeCategoryObj.subcategories.map((sub) => (
                      <button
                        key={sub.id}
                        onClick={() => {
                          updateParam("subcategory", sub.slug);
                          setMobileFiltersOpen(false);
                        }}
                        className={`block w-full text-left text-xs py-1.5 px-2 rounded ${
                          subcategoryParam === sub.slug
                            ? "bg-[#386B40] text-white font-medium"
                            : "text-stone-700 hover:bg-stone-100"
                        }`}
                      >
                        {sub.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Price */}
              <div>
                <h4 className="text-xs font-bold text-[#171A17] uppercase tracking-wider mb-2">
                  Price
                </h4>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={minPriceParam}
                    onChange={(e) => updateParam("minPrice", e.target.value)}
                    className="w-1/2 p-2 border border-stone-200 rounded text-xs"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={maxPriceParam}
                    onChange={(e) => updateParam("maxPrice", e.target.value)}
                    className="w-1/2 p-2 border border-stone-200 rounded text-xs"
                  />
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-[#E5E7DF] flex gap-3">
              <button
                onClick={clearAllFilters}
                className="flex-1 py-2 text-xs font-semibold text-stone-600 bg-stone-100 rounded-lg"
              >
                Reset
              </button>
              <button
                onClick={() => setMobileFiltersOpen(false)}
                className="flex-1 py-2 text-xs font-semibold text-white bg-[#173D2A] rounded-lg"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
