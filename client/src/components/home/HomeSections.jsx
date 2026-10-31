import React from "react";
import { ShopByCategory } from "./ShopByCategory";
import { BestsellersSection } from "./BestsellersSection";
import { TrendingSection } from "./TrendingSection";
import { NewArrivalsSection } from "./NewArrivalsSection";
import { FeaturedCollectionsSection } from "./FeaturedCollectionsSection";
import { FeaturedProductsSection } from "./FeaturedProductsSection";
import { PromotionalBanners } from "./PromotionalBanners";
import { AyurvedicRitualSection } from "./AyurvedicRitualSection";
import { BenefitsStrip } from "../common/TrustBadges";
import { TestimonialsSection } from "./TestimonialsSection";
import { BlogHighlightsSection } from "./BlogHighlightsSection";

// Everything below the pinned scroll hero. Loaded as its own chunk so the hero and first paint don't wait for it.
export const HomeSections = () => (
  <>
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
  </>
);
