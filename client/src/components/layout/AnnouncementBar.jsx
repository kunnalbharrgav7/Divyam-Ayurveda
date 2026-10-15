import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Check } from "lucide-react";

export const AnnouncementBar = () => {
  return (
    <div className="bg-[#0B2416] text-white text-xs border-b border-emerald-950/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex flex-col md:flex-row items-center justify-between gap-2 text-center md:text-left">
        {/* Left / Center Message */}
        <div className="flex flex-wrap items-center justify-center md:justify-start gap-2">
          <span className="font-semibold tracking-wider text-[#A9D18E] uppercase">
            Discover the Wisdom of Ayurveda
          </span>
          <span className="hidden sm:inline text-stone-300">|</span>
          <span className="text-stone-200">
            Pure, classical botanical formulations crafted for modern holistic health
          </span>
        </div>

        {/* Right side CTA & Quick Indicators */}
        <div className="flex items-center gap-4 shrink-0">
          <div className="hidden lg:flex items-center gap-3 text-[11px] text-[#A9D18E]">
            <span className="flex items-center gap-1">
              <Check size={12} /> 100% Herbal
            </span>
            <span className="flex items-center gap-1">
              <Check size={12} /> Ayush Standard
            </span>
            <span className="flex items-center gap-1">
              <Check size={12} /> Free Shipping &gt; ₹499
            </span>
          </div>

          <Link
            to="/contact"
            className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[#386B40] hover:bg-[#A9D18E] hover:text-[#0B2416] text-white font-medium text-[11px] transition-colors"
          >
            <span>Contact Us</span>
            <ArrowRight size={12} />
          </Link>
        </div>
      </div>
    </div>
  );
};

