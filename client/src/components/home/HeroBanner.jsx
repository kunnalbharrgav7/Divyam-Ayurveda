import React from "react";
import { ScrollProductHero } from "./ScrollProductHero";
import { TrustBadges } from "../common/TrustBadges";

export const HeroBanner = () => {
  return (
    <div className="w-full">
      {/* Cinematic Frame-by-Frame GSAP Scroll-Driven Hero */}
      <ScrollProductHero />

      {/* Trust Indicators Row directly under hero */}
      <section className="bg-white py-6 sm:py-8 relative z-10 border-b border-[#E5E7DF]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <TrustBadges />
        </div>
      </section>
    </div>
  );
};
