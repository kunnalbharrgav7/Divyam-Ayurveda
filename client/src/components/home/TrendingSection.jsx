import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Flame } from "lucide-react";
import { ProductCard } from "../products/ProductCard";
import { productService } from "../../services/api";
import { ScrollReveal } from "../../animations/useScrollReveal";

export const TrendingSection = () => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTrending = async () => {
      try {
        const data = await productService.getTrendingProducts(6);
        setProducts(data);
      } catch (err) {
        console.error("Error loading trending products:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchTrending();
  }, []);

  return (
    <section className="py-12 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <ScrollReveal yOffset={16} duration={500} className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1 rounded-md bg-amber-100 text-amber-700">
                <Flame size={16} />
              </span>
              <h2 className="text-2xl sm:text-3xl font-heading font-bold tracking-tight text-[#171A17]">
                Trending Now
              </h2>
              <div className="h-0.5 w-16 bg-[#386B40] rounded-full hidden sm:block" />
            </div>
            <p className="text-xs sm:text-sm text-[#666B64] mt-1">
              Curated seasonal remedies and botanical favorites trending across wellness homes.
            </p>
          </div>

          <Link
            to="/products?sort=rating"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#173D2A] hover:text-[#386B40] transition-colors shrink-0 group"
          >
            <span>View All Trending</span>
            <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </ScrollReveal>

        {/* Product Cards Grid with stagger */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((n) => (
              <div key={n} className="h-72 bg-stone-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-2xl border border-stone-100">
            <p className="text-stone-500 text-sm">No trending products available yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {products.slice(0, 4).map((product, idx) => (
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
