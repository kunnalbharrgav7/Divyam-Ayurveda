import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { Breadcrumbs } from "../components/common/Breadcrumbs";
import { ProductCard } from "../components/products/ProductCard";
import { EmptyState } from "../components/common/EmptyState";
import { categoryService, productService } from "../services/api";

export const CategoryPage = () => {
  const { slug } = useParams();
  const [category, setCategory] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCategoryData = async () => {
      setLoading(true);
      try {
        const cat = await categoryService.getCategoryBySlug(slug);
        setCategory(cat);
        const result = await productService.getProducts({
          category: slug,
          limit: 20,
        });
        setProducts(result.products);
      } catch (err) {
        console.error("Error loading category page:", err);
      } finally {
        setLoading(false);
      }
    };

    loadCategoryData();
  }, [slug]);

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
            <span className="text-xs font-semibold uppercase tracking-wider text-[#A9D18E]">
              Ayurvedic Collection
            </span>
            <h1 className="font-serif text-3xl sm:text-4xl lg:text-5xl font-bold">
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
        <Breadcrumbs
          items={[
            { label: "Products", href: "/products" },
            { label: category?.name || slug },
          ]}
        />

        {/* Product Count Header */}
        <div className="flex items-center justify-between py-4 mb-6 border-b border-[#E5E7DF]">
          <span className="text-xs font-medium text-stone-500">
            Showing <span className="font-bold text-[#171A17]">{products.length}</span> formulations in {category?.name}
          </span>
          <Link
            to="/products"
            className="text-xs font-semibold text-[#173D2A] hover:underline"
          >
            All Products &rarr;
          </Link>
        </div>

        {/* Product Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="h-80 bg-stone-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <EmptyState
            title="No formulations in this category yet"
            description="Our herbal team is preparing fresh seasonal batches for this section."
            actionText="View Other Products"
            actionLink="/products"
          />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
