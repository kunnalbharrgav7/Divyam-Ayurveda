import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Sparkles } from "lucide-react";
import { TrustBadges } from "../common/TrustBadges";

export const HeroBanner = () => {
  return (
    <div className="w-full">
      {/* Full-width Hero Banner with Background Image */}
      <section className="relative w-full overflow-hidden flex items-center bg-[#EFE9DC] min-h-[480px] sm:min-h-[520px] lg:h-[calc(100vh-160px)] lg:min-h-[480px] lg:max-h-[720px]">
        {/* Full Background Image */}
        <img
          src="/images/LandingPage/LandingPage.png"
          alt="Divyam Ayurveda Pure Himalayan Shilajit and authentic Indian botanicals"
          className="absolute inset-0 w-full h-full object-cover object-right md:object-center select-none pointer-events-none"
        />

        {/* Soft atmospheric gradient on left to keep text ultra-legible while keeping products on right 100% visible */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#FAF8F2]/95 via-[#FAF8F2]/75 to-transparent md:via-[#FAF8F2]/45 md:to-transparent lg:w-3/5 pointer-events-none" />

        {/* Text and Actions Overlay Container */}
        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 lg:py-6 xl:py-8">
          <div className="max-w-xl lg:max-w-2xl space-y-3 sm:space-y-4 lg:space-y-3.5 xl:space-y-4 text-center lg:text-left">
            {/* Eyebrow */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#173D2A]/10 backdrop-blur-xs text-[#173D2A] text-[11px] sm:text-xs font-semibold tracking-wider uppercase">
              <Sparkles size={12} className="text-[#386B40]" />
              <span>Rooted in Ayurveda. Made for Modern Living.</span>
            </div>

            {/* Main Heading */}
            <h1 className="font-serif text-3xl sm:text-4xl lg:text-4xl xl:text-5xl font-bold text-[#171A17] tracking-tight leading-[1.12]">
              Embrace Ayurveda. <br />
              <span className="text-[#173D2A] italic">Live Naturally.</span>
            </h1>

            {/* Supporting Description */}
            <p className="text-xs sm:text-sm lg:text-sm xl:text-base text-[#4E544C] max-w-lg mx-auto lg:mx-0 leading-relaxed font-normal">
              Explore authentic Ayurvedic herbs, classical churnas, cold-pressed
              oils, and everyday wellness essentials inspired by India's
              timeless herbal heritage.
            </p>

            {/* CTAs */}
            <div className="flex flex-wrap items-center justify-center lg:justify-start gap-3.5 pt-1">
              <Link
                to="/products"
                className="px-6 sm:px-7 py-2.5 sm:py-3 bg-[#173D2A] hover:bg-[#0B2416] text-white text-xs sm:text-sm font-semibold rounded-xl flex items-center gap-2 shadow-md hover:shadow-lg transition-all group"
              >
                <span>Shop Now</span>
                <ArrowRight
                  size={15}
                  className="group-hover:translate-x-1 transition-transform"
                />
              </Link>
              <Link
                to="/our-story"
                className="px-5 sm:px-6 py-2.5 sm:py-3 bg-white/95 hover:bg-white text-[#173D2A] border border-stone-300 text-xs sm:text-sm font-semibold rounded-xl transition-all shadow-xs"
              >
                Explore Our Story
              </Link>
            </div>

            {/* Compact Botanical Tagline */}
            <div className="pt-1 text-[11px] sm:text-xs text-stone-600 flex items-center justify-center lg:justify-start gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>
                Pure, single-origin botanicals tested for heavy metals and
                purity
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Indicators Row directly under hero */}
      <section className="bg-white py-4 sm:py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <TrustBadges />
        </div>
      </section>
    </div>
  );
};
