import React from "react";
import { HeroBanner } from "../components/home/HeroBanner";
import { ShopByCategory } from "../components/home/ShopByCategory";
import { BestsellersSection } from "../components/home/BestsellersSection";
import { TrendingSection } from "../components/home/TrendingSection";
import { NewArrivalsSection } from "../components/home/NewArrivalsSection";
import { FeaturedCollectionsSection } from "../components/home/FeaturedCollectionsSection";
import { FeaturedProductsSection } from "../components/home/FeaturedProductsSection";
import { PromotionalBanners } from "../components/home/PromotionalBanners";
import { AyurvedicRitualSection } from "../components/home/AyurvedicRitualSection";
import { BenefitsStrip } from "../components/common/TrustBadges";
import { TestimonialsSection } from "../components/home/TestimonialsSection";
import { BlogHighlightsSection } from "../components/home/BlogHighlightsSection";

export const HomePage = () => {
  return (
    <div className="flex flex-col w-full">
      {/* 4. Hero Banner & 5. Trust Indicators */}
      <HeroBanner />

      {/* 6. Shop by Category (8 circular shortcuts) */}
      <ShopByCategory />

      {/* 7. Bestselling Products */}
      <BestsellersSection />

      {/* 8. Trending Products ("Trending Now") */}
      <TrendingSection />

      {/* 9. New Arrivals ("Fresh Additions") */}
      <NewArrivalsSection />

      {/* 10. Featured products ("Featured on Homepage" flag) */}
      <FeaturedProductsSection />

      {/* 10b. Featured Ayurvedic Collections */}
      <FeaturedCollectionsSection />

      {/* 11. Promotional Banners (Banner A & Banner B) */}
      <PromotionalBanners />

      {/* 12. Ayurvedic Consumption & Rejuvenation Ritual */}
      <AyurvedicRitualSection />

      {/* 13. Why Choose Divyam Ayurveda (Benefits strip) */}
      <section className="py-8 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <BenefitsStrip />
        </div>
      </section>

      {/* 13. Customer Testimonials */}
      <TestimonialsSection />

      {/* 14. Ayurvedic Education and Blog Highlights */}
      <BlogHighlightsSection />
    </div>
  );
};

