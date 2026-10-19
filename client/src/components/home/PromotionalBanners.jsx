import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Leaf, Sparkles, CheckCircle2 } from "lucide-react";
import { ScrollReveal } from "../../animations/useScrollReveal";

export const PromotionalBanners = () => {
  return (
    <section className="py-12 bg-white relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 items-stretch">
          {/* Banner A - Light Ayurvedic Heritage Card */}
          <ScrollReveal delay={0} yOffset={20} duration={550} className="h-full flex flex-col">
            <motion.div
              whileHover={{ y: -6, transition: { type: "spring", stiffness: 350, damping: 20 } }}
              className="relative h-full rounded-3xl overflow-hidden bg-[#F6F6F1] border border-[#E5E7DF] p-7 sm:p-9 flex flex-col justify-between group transition-all duration-300 hover:shadow-xl hover:border-[#386B40]/40"
            >
              {/* Soft radial aura in top-right */}
              <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-gradient-to-br from-[#386B40]/10 to-transparent blur-2xl pointer-events-none" />

              {/* Shimmer sweep effect on hover */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none" />

              {/* Decorative botanical leaf watermark silhouette */}
              <div className="absolute right-3 -bottom-6 pointer-events-none text-[#173D2A]/[0.06] group-hover:text-[#173D2A]/[0.09] transition-colors duration-500">
                <svg width="220" height="220" viewBox="0 0 200 200" fill="currentColor">
                  <path d="M100 10 C140 40, 180 80, 180 130 C180 165, 155 190, 120 190 C85 190, 50 160, 45 125 C40 85, 70 35, 100 10 Z" />
                  <path d="M100 10 C100 80, 115 140, 130 185" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path d="M105 70 C125 65, 145 75, 155 90" stroke="currentColor" strokeWidth="3" fill="none" />
                  <path d="M112 110 C130 110, 150 120, 160 135" stroke="currentColor" strokeWidth="3" fill="none" />
                  <path d="M95 90 C78 90, 65 105, 58 120" stroke="currentColor" strokeWidth="3" fill="none" />
                </svg>
              </div>

              {/* Top Eyebrow Badge */}
              <div className="relative z-10 mb-5">
                <span className="font-heading text-xs font-semibold text-[#173D2A] bg-white/95 px-3.5 py-1.5 rounded-full shadow-xs border border-stone-200/80 inline-flex items-center gap-1.5">
                  <Sparkles size={12} className="text-[#386B40]" />
                  <span>Pure Herbs &bull; Natural Vitality</span>
                </span>
              </div>

              {/* Text Copy */}
              <div className="relative z-10 flex-1 flex flex-col justify-between max-w-md space-y-4 mb-6">
                <div>
                  <h3 className="font-heading text-2xl sm:text-3xl lg:text-[2rem] font-bold tracking-tight text-[#171A17] leading-snug">
                    Nature's Wisdom for Everyday Wellness
                  </h3>
                  <p className="mt-3 text-xs sm:text-sm text-[#5D635B] leading-relaxed">
                    Clean botanical churnas, golden Lakadong haldi, and wild single-origin honey formulated strictly to classical Ayurvedic principles.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] font-medium text-[#386B40] pt-1">
                  <span className="inline-flex items-center gap-1">
                    <CheckCircle2 size={12} className="text-[#386B40]" /> 100% Organically Grown
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <CheckCircle2 size={12} className="text-[#386B40]" /> Third-Party Lab Tested
                  </span>
                </div>
              </div>

              {/* Button CTA */}
              <div className="relative z-10 pt-2">
                <Link
                  to="/products?category=ayurvedic-herbs"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-[#173D2A] text-[#171A17] hover:text-white border border-[#DCDFD5] text-xs font-bold rounded-xl transition-all shadow-xs group/btn active:scale-95"
                >
                  <span>Shop Ayurvedic Herbs</span>
                  <ArrowRight size={14} className="group-hover/btn:translate-x-1.5 transition-transform" />
                </Link>
              </div>
            </motion.div>
          </ScrollReveal>

          {/* Banner B - Dark Botanical Luxury Card */}
          <ScrollReveal delay={120} yOffset={20} duration={550} className="h-full flex flex-col">
            <motion.div
              whileHover={{ y: -6, transition: { type: "spring", stiffness: 350, damping: 20 } }}
              className="relative h-full rounded-3xl overflow-hidden bg-gradient-to-br from-[#173D2A] via-[#103020] to-[#0A2215] text-white p-7 sm:p-9 flex flex-col justify-between group transition-all duration-300 hover:shadow-2xl hover:border-[#A9D18E]/50 border border-[#234D35]"
            >
              {/* Ambient radial glow in background */}
              <div className="absolute -bottom-20 -right-20 w-72 h-72 rounded-full bg-[#A9D18E]/10 blur-3xl pointer-events-none" />

              {/* Shimmer sweep effect on hover */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out pointer-events-none" />

              {/* Decorative sacred geometry concentric circles watermark */}
              <div className="absolute right-4 bottom-2 pointer-events-none text-[#A9D18E]/[0.08] group-hover:text-[#A9D18E]/[0.12] transition-colors duration-500">
                <svg width="220" height="220" viewBox="0 0 200 200" fill="none" stroke="currentColor">
                  <circle cx="100" cy="100" r="80" strokeWidth="1.5" strokeDasharray="4 4" />
                  <circle cx="100" cy="100" r="60" strokeWidth="1.5" />
                  <circle cx="100" cy="100" r="40" strokeWidth="1.5" strokeDasharray="2 4" />
                  <circle cx="100" cy="100" r="20" strokeWidth="1.5" />
                  <path d="M100 10 L100 190 M10 100 L190 100" strokeWidth="1" strokeOpacity="0.4" />
                </svg>
              </div>

              {/* Circular rotating badge placed absolute top-6 right-6 so it doesn't inflate row height */}
              <div className="absolute top-6 right-6 z-10 hidden sm:flex w-16 h-16 lg:w-18 lg:h-18 rounded-full bg-white/5 backdrop-blur-xs border border-white/15 items-center justify-center text-center p-1 pointer-events-none">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
                  className="w-full h-full flex items-center justify-center"
                >
                  <span className="text-[7.5px] lg:text-[8px] font-bold uppercase tracking-wider text-[#A9D18E] leading-tight block">
                    SUSTAINABLE TODAY &bull; BRIGHTER TOMORROW &bull;
                  </span>
                </motion.div>
              </div>

              {/* Top Eyebrow Badge */}
              <div className="relative z-10 mb-5">
                <span className="text-[11px] font-semibold tracking-wider uppercase text-[#A9D18E] inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-xs border border-white/15">
                  <Leaf size={13} /> Eco-Conscious Harvesting
                </span>
              </div>

              {/* Text Copy */}
              <div className="relative z-10 flex-1 flex flex-col justify-between max-w-md space-y-4 mb-6">
                <div>
                  <h3 className="font-heading text-2xl sm:text-3xl lg:text-[2rem] font-bold tracking-tight text-white leading-snug pr-12 sm:pr-16">
                    Rediscover the Art of Ayurveda
                  </h3>
                  <p className="mt-3 text-xs sm:text-sm text-stone-200/90 leading-relaxed">
                    Together for a cleaner, greener and healthier tomorrow. Zero synthetics, zero plastic waste, and wildcrafted Himalayan potency.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] font-medium text-[#A9D18E] pt-1">
                  <span className="inline-flex items-center gap-1">
                    <CheckCircle2 size={12} className="text-[#A9D18E]" /> Zero Synthetics
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <CheckCircle2 size={12} className="text-[#A9D18E]" /> Recyclable Packaging
                  </span>
                </div>
              </div>

              {/* Button CTA */}
              <div className="relative z-10 pt-2">
                <Link
                  to="/products?category=wellness-essentials"
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#A9D18E] hover:bg-white text-[#0B2416] text-xs font-bold rounded-xl transition-all shadow-xs group/btn active:scale-95"
                >
                  <span>Shop Classical Remedies</span>
                  <ArrowRight size={14} className="group-hover/btn:translate-x-1.5 transition-transform" />
                </Link>
              </div>
            </motion.div>
          </ScrollReveal>
        </div>
      </div>
    </section>
  );
};
