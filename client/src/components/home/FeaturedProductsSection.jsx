import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Star } from "lucide-react";
import { ProductCard } from "../products/ProductCard";
import { productService } from "../../services/api";
import { ScrollReveal } from "../../animations/useScrollReveal";

/**
 * Products flagged "Featured on Homepage" in Admin → Products.
 * Renders nothing when no product is featured.
 */
export const FeaturedProductsSection = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchFeatured = async () => {
      try {
        const data = await productService.getFeaturedProducts(8);
        if (isMounted && Array.isArray(data)) setProducts(data);
      } catch (err) {
        console.error("Error loading featured products:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchFeatured();
    return () => {
      isMounted = false;
    };
  }, []);

  if (!loading && products.length === 0) return null;

  return (
    <section className="py-12 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <ScrollReveal yOffset={16} duration={500} className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-md bg-amber-100 text-amber-700">
                <Star size={16} />
              </span>
              <h2 className="text-2xl sm:text-3xl font-heading font-bold tracking-tight text-[#171A17]">
                Featured Formulations
              </h2>
              <div className="h-0.5 w-16 bg-[#386B40] rounded-full hidden sm:block" />
            </div>
            <p className="text-xs sm:text-sm text-[#666B64] mt-1">
              Handpicked Ayurvedic essentials our physicians recommend most.
            </p>
          </div>

          <Link
            to="/products?sort=featured"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#173D2A] hover:text-[#386B40] transition-colors shrink-0 group"
          >
            <span>View All Products</span>
            <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </ScrollReveal>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="h-72 bg-stone-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.map((product, idx) => (
              <ScrollReveal key={product.id} delay={idx * 60} yOffset={18} duration={500}>
                <ProductCard product={product} />
              </ScrollReveal>
            ))}
          </div>
        )}
      </div>
    </section>
  );
};
