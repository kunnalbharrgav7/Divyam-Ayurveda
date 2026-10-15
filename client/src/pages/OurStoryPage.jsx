import React from "react";
import { Link } from "react-router-dom";
import { Sparkles, Leaf, ArrowRight } from "lucide-react";
import { Breadcrumbs } from "../components/common/Breadcrumbs";

export const OurStoryPage = () => {
  return (
    <div className="bg-[#FBFAF6] min-h-screen py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <Breadcrumbs items={[{ label: "Our Story & Heritage" }]} />

        {/* Article Layout */}
        <div className="bg-white rounded-3xl border border-[#E5E7DF] p-6 sm:p-12 shadow-xs mt-4 space-y-8">
          <div className="text-center max-w-2xl mx-auto space-y-3">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#386B40] flex items-center justify-center gap-1.5">
              <Sparkles size={14} /> Our Journey &amp; Philosophy
            </span>
            <h1 className="font-serif text-3xl sm:text-5xl font-bold text-[#171A17] leading-tight">
              Reviving Ancient Botanical Truths
            </h1>
            <p className="text-xs sm:text-sm text-[#666B64]">
              How a quest for authentic Ayurvedic purity turned into Divyam Ayurveda.
            </p>
          </div>

          <div className="rounded-2xl overflow-hidden aspect-16/9 bg-stone-100">
            <img
              src="https://images.unsplash.com/photo-1509358271058-acd22cc93898?auto=format&fit=crop&w=1200&q=80"
              alt="Himalayan and Indian herbal flora"
              className="w-full h-full object-cover"
            />
          </div>

          <div className="prose prose-stone max-w-none text-xs sm:text-sm text-[#171A17] space-y-4 leading-relaxed">
            <p>
              In an era dominated by synthetic additives, bleached herbal powders, and quick-fix pharmaceuticals, true holistic well-being was getting drowned out. The founders of Divyam Ayurveda — Vaidyas, botanists, and modern life science researchers — came together with a clear mission: to resurrect pure, unadulterated Ayurvedic wisdom.
            </p>
            <h3 className="font-serif text-lg sm:text-xl font-bold text-[#173D2A] pt-2">
              The Problem with Mass-Market Herbal Supplements
            </h3>
            <p>
              Most commercial herbal churnas are machine-pulverized using high-heat blades that scorch delicate volatile aromatic oils. Whole herbs are often replaced with spent marc (waste fiber after solvent extraction). At Divyam Ayurveda, we refuse to compromise. We harvest botanicals at their peak biological potency, shade-dry them naturally, and use traditional low-temperature micro-pulverizers.
            </p>
            <h3 className="font-serif text-lg sm:text-xl font-bold text-[#173D2A] pt-2">
              Ethical Forest Community Partnerships
            </h3>
            <p>
              True healing must extend beyond the individual to the earth itself. Every gram of our wild forest honey is harvested sustainably without destroying bee hives. Our Lakadong turmeric is grown by women farmers in Meghalaya using traditional organic compost.
            </p>
          </div>

          <div className="p-6 bg-[#FBFAF6] rounded-2xl border border-[#E5E7DF] flex flex-col sm:flex-row items-center justify-between gap-4">
            <div>
              <h4 className="font-serif font-bold text-[#171A17] text-base">
                Ready to Experience Pure Ayurveda?
              </h4>
              <p className="text-xs text-[#666B64] mt-0.5">
                Explore our classical single-origin churnas and extracts today.
              </p>
            </div>
            <Link
              to="/products"
              className="px-6 py-2.5 bg-[#173D2A] hover:bg-[#0B2416] text-white text-xs font-semibold rounded-xl flex items-center gap-2 transition-colors shrink-0"
            >
              <span>Explore Catalog</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

