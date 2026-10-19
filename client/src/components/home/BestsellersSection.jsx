import React, { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles, Wind, Flame, Mountain, Heart } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { ProductCard } from "../products/ProductCard";
import { productService } from "../../services/api";
import { ScrollReveal } from "../../animations/useScrollReveal";

const DOSHA_TABS = [
  { id: "all", label: "All Bestsellers", icon: Sparkles },
  { id: "vata", label: "Vata Balancing", sub: "Calm & Sleep", icon: Wind },
  { id: "pitta", label: "Pitta Soothing", sub: "Digestion & Glow", icon: Flame },
  { id: "kapha", label: "Kapha Vitality", sub: "Energy & Vigor", icon: Mountain },
  { id: "rasayana", label: "Rasayana (Ojas)", sub: "Longevity", icon: Heart },
];

export const BestsellersSection = () => {
  const [allProducts, setAllProducts] = useState([]);
  const [activeTab, setActiveTab] = useState("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCatalog = async () => {
      try {
        const data = await productService.getProducts({ limit: 50 });
        const list = Array.isArray(data) ? data : (data?.products || []);
        setAllProducts(list);
      } catch (err) {
        console.error("Error loading products for bestsellers:", err);
        setAllProducts([]);
      } finally {
        setLoading(false);
      }
    };
    fetchCatalog();
  }, []);

  // Filter products intelligently based on selected Ayurvedic Dosha/Goal
  const displayedProducts = useMemo(() => {
    const prods = Array.isArray(allProducts) ? allProducts : [];
    if (prods.length === 0) return [];

    let filtered = [];
    if (activeTab === "all") {
      // Driven purely by the admin "Bestseller Badge" checkbox
      return prods.filter((p) => p.isBestSeller || p.isBestseller).slice(0, 5);
    } else if (activeTab === "vata") {
      filtered = prods.filter((p) => {
        const text = `${p.name} ${p.tags?.join(" ")} ${p.description || ""}`.toLowerCase();
        return text.includes("ashwagandha") || text.includes("stress") || text.includes("sleep") || text.includes("vata") || text.includes("calm");
      });
    } else if (activeTab === "pitta") {
      filtered = prods.filter((p) => {
        const text = `${p.name} ${p.tags?.join(" ")} ${p.description || ""}`.toLowerCase();
        return text.includes("turmeric") || text.includes("aloe") || text.includes("skin") || text.includes("pitta") || text.includes("cooling");
      });
    } else if (activeTab === "kapha") {
      filtered = prods.filter((p) => {
        const text = `${p.name} ${p.tags?.join(" ")} ${p.description || ""}`.toLowerCase();
        return text.includes("honey") || text.includes("detox") || text.includes("churna") || text.includes("kapha") || text.includes("metabolism");
      });
    } else if (activeTab === "rasayana") {
      filtered = prods.filter((p) => {
        const text = `${p.name} ${p.tags?.join(" ")} ${p.description || ""}`.toLowerCase();
        return text.includes("shilajit") || text.includes("vitality") || text.includes("immunity") || text.includes("gold") || p.isBestSeller;
      });
    }

    // Ensure we always have at least 5 products to display
    if (filtered.length < 5) {
      const remaining = prods.filter((p) => !filtered.some((f) => f.id === p.id));
      filtered = [...filtered, ...remaining];
    }

    return filtered.slice(0, 5);
  }, [allProducts, activeTab]);

  return (
    <section className="py-14 bg-[#FBFAF6] relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header with Accent and View All */}
        <ScrollReveal yOffset={16} duration={500} className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl sm:text-3xl font-heading font-bold tracking-tight text-[#171A17]">
                Our Best Sellers
              </h2>
              <div className="h-0.5 w-16 bg-[#386B40] rounded-full hidden sm:block" />
            </div>
            <p className="text-xs sm:text-sm text-[#666B64] mt-1">
              Time-tested Ayurvedic classics curated to harmonize mind, metabolic fire, and physical vigor.
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

        {/* Interactive Dosha & Vitality Goal Filter Bar */}
        <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-8 no-scrollbar scroll-smooth">
          {DOSHA_TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative px-4 sm:px-5 py-2.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors duration-200 cursor-pointer flex items-center gap-2 shrink-0 ${
                  isActive ? "text-[#FAF8F2]" : "text-[#555A52] hover:text-[#171A17] bg-white border border-[#E5E7DF]"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeDoshaFilterPill"
                    className="absolute inset-0 bg-[#173D2A] rounded-full z-0 shadow-sm"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <span className="relative z-10 flex items-center gap-1.5">
                  <Icon size={14} className={isActive ? "text-[#A9D18E]" : "text-[#386B40]"} />
                  <span>{tab.label}</span>
                </span>
              </button>
            );
          })}
        </div>

        {/* Animated Product Cards Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
            {[1, 2, 3, 4, 5].map((n) => (
              <div key={n} className="h-72 bg-stone-100 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : displayedProducts.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-stone-100">
            <p className="text-stone-500 text-sm">No products found in this category yet.</p>
          </div>
        ) : (
          <motion.div layout className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
            <AnimatePresence mode="popLayout">
              {displayedProducts.map((product) => (
                <motion.div
                  key={product.id}
                  layout
                  initial={{ opacity: 0, scale: 0.92 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.35, ease: "easeOut" }}
                >
                  <ProductCard product={product} />
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </section>
  );
};
