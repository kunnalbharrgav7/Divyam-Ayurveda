import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { categoryService } from "../../services/api";
import { ScrollReveal } from "../../animations/useScrollReveal";

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.07,
      delayChildren: 0.1,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24, scale: 0.9 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      type: "spring",
      stiffness: 280,
      damping: 22,
    },
  },
};

export const ShopByCategory = () => {
  const [categoriesList, setCategoriesList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchCats = async () => {
      try {
        const data = await categoryService.getCategories();
        if (isMounted && Array.isArray(data)) {
          setCategoriesList(data);
        }
      } catch (err) {
        console.error("Failed to load categories:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchCats();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <section className="py-14 bg-white relative overflow-hidden">
      {/* Subtle organic background ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-3/4 h-32 bg-[#A9D18E]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <ScrollReveal yOffset={16} duration={500} className="text-center mb-10">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#386B40] inline-block px-3 py-1 bg-emerald-50 rounded-full border border-emerald-100">
            Botanical Categories
          </span>
          <h2 className="text-2xl sm:text-3xl font-heading font-bold tracking-tight text-[#171A17] mt-2">
            Shop by Category
          </h2>
          <div className="w-12 h-0.5 bg-[#386B40] mx-auto mt-3 rounded-full" />
        </ScrollReveal>

        {/* 8 Circular Category Shortcuts Grid with Staggered Spring Wave */}
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4 sm:gap-6">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-stone-100 animate-pulse border border-stone-200" />
                <div className="w-16 h-3 bg-stone-100 rounded-md animate-pulse" />
              </div>
            ))}
          </div>
        ) : categoriesList.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-stone-500 text-sm">No botanical categories available yet.</p>
          </div>
        ) : (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-40px" }}
            className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4 sm:gap-6"
          >
            {categoriesList.map((cat) => (
            <motion.div
              key={cat.id}
              variants={itemVariants}
              whileHover={{ y: -8, transition: { type: "spring", stiffness: 400, damping: 17 } }}
              className="flex"
            >
              <Link
                to={`/category/${cat.slug}`}
                className="group flex flex-col items-center text-center focus:outline-none w-full"
              >
                {/* Circular Avatar Container with Glowing Botanical Halo */}
                <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full p-1 bg-[#F4F4EE] border-2 border-[#E5E7DF] group-hover:border-[#386B40] group-hover:shadow-xl group-hover:ring-4 group-hover:ring-[#A9D18E]/40 transition-all duration-300 flex items-center justify-center overflow-hidden">
                  <img
                    src={cat.image}
                    alt={cat.name}
                    loading="lazy"
                    className="w-full h-full object-cover rounded-full group-hover:scale-115 transition-transform duration-500 ease-out"
                  />
                  {/* Circular shine sheen */}
                  <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-transparent via-white/0 to-white/30 group-hover:via-white/20 transition-all duration-300 pointer-events-none" />
                </div>

                {/* Title */}
                <span className="mt-3 text-xs sm:text-sm font-semibold text-[#171A17] group-hover:text-[#173D2A] transition-colors leading-tight line-clamp-2">
                  {cat.name}
                </span>
                <span className="text-[11px] text-[#666B64] mt-0.5">
                  {cat.itemCount} items
                </span>
              </Link>
            </motion.div>
          ))}
        </motion.div>
        )}
      </div>
    </section>
  );
};
