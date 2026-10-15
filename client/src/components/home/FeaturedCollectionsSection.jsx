import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Layers } from "lucide-react";
import { collections } from "../../data/collections";

export const FeaturedCollectionsSection = () => {
  return (
    <section className="py-12 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-10">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#386B40] flex items-center justify-center gap-1.5">
            <Layers size={14} /> Curated Formulations
          </span>
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#171A17] mt-1">
            Featured Ayurvedic Collections
          </h2>
          <div className="w-12 h-0.5 bg-[#386B40] mx-auto mt-2.5 rounded-full" />
          <p className="text-xs sm:text-sm text-[#666B64] mt-2 max-w-xl mx-auto">
            Thoughtfully grouped herbal regimens curated to address specific vitality goals and daily routines.
          </p>
        </div>

        {/* 4 Editorial Collection Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {collections.map((col) => (
            <Link
              key={col.id}
              to={`/products?collection=${col.slug}`}
              className="group relative rounded-2xl overflow-hidden bg-stone-900 aspect-4/5 flex flex-col justify-end p-6 border border-stone-200 shadow-xs hover:shadow-lg transition-all"
            >
              {/* Background Image with Overlay */}
              <img
                src={col.image}
                alt={col.name}
                loading="lazy"
                className="absolute inset-0 w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500 opacity-60 group-hover:opacity-70"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent" />

              {/* Badge top-left */}
              <div className="absolute top-4 left-4 z-10">
                <span className="px-2.5 py-1 text-[11px] font-semibold bg-[#A9D18E] text-[#0B2416] rounded-full uppercase tracking-wider">
                  {col.badge}
                </span>
              </div>

              {/* Content Bottom */}
              <div className="relative z-10 text-white space-y-2">
                <h3 className="font-serif text-lg font-bold group-hover:text-[#A9D18E] transition-colors leading-snug">
                  {col.name}
                </h3>
                <p className="text-xs text-stone-200 line-clamp-2 leading-relaxed">
                  {col.subtitle}
                </p>
                <div className="pt-2 flex items-center gap-1.5 text-xs font-semibold text-[#A9D18E] group-hover:underline">
                  <span>Explore Collection</span>
                  <ArrowRight size={13} className="group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

