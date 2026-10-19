import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Layers, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { collectionService } from "../../services/api";
import { ScrollReveal } from "../../animations/useScrollReveal";
import { SpotlightCard } from "../reactbits/SpotlightCard";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.05,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 32, scale: 0.96 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 240, damping: 22 },
  },
};

export const FeaturedCollectionsSection = () => {
  const [collectionsList, setCollectionsList] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;
    const fetchCollections = async () => {
      try {
        const data = await collectionService.getCollections();
        if (isMounted && Array.isArray(data)) {
          setCollectionsList(data);
        }
      } catch (err) {
        console.error("Failed to load featured collections:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchCollections();
    return () => {
      isMounted = false;
    };
  }, []);

  // Nothing curated in Admin → Collections yet: skip the section instead of showing an empty box
  if (!loading && collectionsList.length === 0) return null;

  return (
    <section className="py-14 bg-white relative overflow-hidden">
      {/* Subtle organic ambient glow in background */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#A9D18E]/8 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <ScrollReveal yOffset={16} duration={500} className="text-center mb-10">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#386B40] flex items-center justify-center gap-1.5">
            <Layers size={14} /> Curated Formulations
          </span>
          <h2 className="text-2xl sm:text-3xl font-heading font-bold tracking-tight text-[#171A17] mt-1">
            Featured Ayurvedic Collections
          </h2>
          <div className="w-12 h-0.5 bg-[#386B40] mx-auto mt-2.5 rounded-full" />
          <p className="text-xs sm:text-sm text-[#666B64] mt-2 max-w-xl mx-auto">
            Thoughtfully grouped herbal regimens curated to address specific vitality goals and daily routines.
          </p>
        </ScrollReveal>

        {/* 4 Editorial Collection Cards Grid with Framer Motion Stagger */}
        {loading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="aspect-4/5 rounded-2xl bg-stone-100 animate-pulse border border-stone-200" />
            ))}
          </div>
        ) : collectionsList.length === 0 ? (
          <div className="text-center py-10 bg-white rounded-2xl border border-stone-100">
            <p className="text-stone-500 text-sm">No featured collections available yet.</p>
          </div>
        ) : (
          <motion.div
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-40px" }}
          >
            {collectionsList.map((col) => (
            <motion.div
              key={col.id}
              variants={cardVariants}
              whileHover={{ y: -8, transition: { duration: 0.28, ease: "easeOut" } }}
              className="flex h-full"
            >
              <SpotlightCard
                spotlightColor="rgba(169, 209, 142, 0.25)"
                className="rounded-2xl w-full h-full shadow-xs hover:shadow-xl transition-shadow duration-300"
              >
                <Link
                  to={`/products?collection=${col.slug}`}
                  className="group relative rounded-2xl overflow-hidden bg-stone-950 aspect-4/5 flex flex-col justify-end p-6 border border-stone-200/90 hover:border-[#A9D18E]/60 transition-all duration-300 w-full h-full block"
                >
                  {/* Background Image with Dynamic Zoom & Sheen */}
                  <img
                    src={col.image}
                    alt={col.name}
                    loading="lazy"
                    className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-112 transition-transform duration-700 ease-out opacity-65 group-hover:opacity-85"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/45 to-black/10 group-hover:via-black/35 transition-colors duration-500" />

                  {/* Top Badge with subtle shine */}
                  <div className="absolute top-4 left-4 z-10 flex items-center gap-1.5">
                    <span className="px-2.5 py-1 text-[11px] font-semibold bg-[#A9D18E] text-[#0B2416] rounded-full uppercase tracking-wider shadow-sm flex items-center gap-1 group-hover:scale-105 transition-transform duration-300">
                      <Sparkles size={11} className="text-[#0B2416]" />
                      {col.badge}
                    </span>
                  </div>

                  {/* Content Bottom */}
                  <div className="relative z-10 text-white space-y-2">
                    <h3 className="font-heading text-lg font-bold tracking-tight group-hover:text-[#A9D18E] transition-colors leading-snug">
                      {col.name}
                    </h3>
                    <p className="text-xs text-stone-300 line-clamp-2 leading-relaxed font-light">
                      {col.subtitle}
                    </p>
                    <div className="pt-2 flex items-center gap-1.5 text-xs font-semibold text-[#A9D18E] group-hover:text-emerald-300 transition-colors">
                      <span>Explore Collection</span>
                      <ArrowRight size={13} className="group-hover:translate-x-1.5 transition-transform duration-200" />
                    </div>
                  </div>
                </Link>
              </SpotlightCard>
            </motion.div>
          ))}
        </motion.div>
        )}
      </div>
    </section>
  );
};
