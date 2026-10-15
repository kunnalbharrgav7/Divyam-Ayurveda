import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Leaf, Sparkles } from "lucide-react";

export const PromotionalBanners = () => {
  return (
    <section className="py-10 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8">
          {/* Banner A */}
          <div className="relative rounded-3xl overflow-hidden bg-[#F4F4EE] border border-[#E5E7DF] p-6 sm:p-8 flex flex-col justify-between min-h-[260px] group">
            {/* Background image half right */}
            <div className="absolute right-0 top-0 bottom-0 w-1/2 overflow-hidden pointer-events-none p-3 flex items-center justify-end">
              <img
                src="/images/ProductImages/Ashuwaganda.png"
                alt="Divyam Ayurveda Ashwagandha Capsules"
                className="max-h-full max-w-full object-contain group-hover:scale-105 transition-transform duration-500 drop-shadow-md"
              />
            </div>

            {/* Handwritten style badge top-left */}
            <div className="relative z-10 mb-4 inline-block">
              <span className="font-serif italic text-xs font-semibold text-[#173D2A] bg-white/90 px-3 py-1 rounded-full shadow-xs">
                Pure Herbs &bull; Natural Vitality &#9829;
              </span>
            </div>

            {/* Text Copy */}
            <div className="relative z-10 max-w-xs space-y-2 mb-6">
              <h3 className="font-serif text-2xl sm:text-3xl font-bold text-[#171A17] leading-tight">
                Nature's Wisdom for Everyday Wellness
              </h3>
              <p className="text-xs sm:text-sm text-[#666B64]">
                Clean botanical churnas, golden Lakadong haldi, and wild single-origin honey.
              </p>
            </div>

            {/* Button CTA */}
            <div className="relative z-10">
              <Link
                to="/products?category=ayurvedic-herbs"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-[#173D2A] text-[#171A17] hover:text-white border border-[#E5E7DF] text-xs font-bold rounded-xl transition-all shadow-xs group/btn"
              >
                <span>Shop Ayurvedic Herbs</span>
                <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>

          {/* Banner B */}
          <div className="relative rounded-3xl overflow-hidden bg-[#173D2A] text-white p-6 sm:p-8 flex flex-col justify-between min-h-[260px] group">
            {/* Background image right */}
            <div className="absolute right-0 top-0 bottom-0 w-1/2 overflow-hidden pointer-events-none opacity-40 sm:opacity-85">
              <img
                src="/images/ProductImages/Himalya.png"
                alt="Pure Himalayan Shilajit packaging"
                className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-500"
              />
              <div className="absolute inset-0 bg-gradient-to-r from-[#173D2A] via-[#173D2A]/60 to-transparent" />
            </div>

            {/* Circular badge top-right */}
            <div className="absolute top-4 right-4 z-10 hidden sm:flex w-20 h-20 rounded-full bg-white/10 backdrop-blur-xs border border-white/20 items-center justify-center text-center p-1 transform rotate-6">
              <span className="text-[9px] font-bold uppercase tracking-wider text-[#A9D18E] leading-tight">
                SUSTAINABLE TODAY &bull; BRIGHTER TOMORROW
              </span>
            </div>

            {/* Eyebrow */}
            <div className="relative z-10 mb-4 inline-block">
              <span className="text-[11px] font-semibold tracking-wider uppercase text-[#A9D18E] flex items-center gap-1.5">
                <Leaf size={13} /> Eco-Conscious Harvesting
              </span>
            </div>

            {/* Text Copy */}
            <div className="relative z-10 max-w-xs space-y-2 mb-6">
              <h3 className="font-serif text-2xl sm:text-3xl font-bold text-white leading-tight">
                Rediscover the Art of Ayurveda
              </h3>
              <p className="text-xs sm:text-sm text-stone-200">
                Together for a cleaner, greener and healthier tomorrow. Zero synthetics, zero plastic waste.
              </p>
            </div>

            {/* Button CTA */}
            <div className="relative z-10">
              <Link
                to="/products?category=wellness-essentials"
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#A9D18E] hover:bg-white text-[#0B2416] text-xs font-bold rounded-xl transition-all shadow-xs group/btn"
              >
                <span>Shop Classical Remedies</span>
                <ArrowRight size={14} className="group-hover/btn:translate-x-1 transition-transform" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

