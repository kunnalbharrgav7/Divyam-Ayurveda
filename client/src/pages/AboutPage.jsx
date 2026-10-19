import React from "react";
import { Link } from "react-router-dom";
import { Leaf, Award, HeartHandshake, ShieldCheck, ArrowRight } from "lucide-react";
import { Breadcrumbs } from "../components/common/Breadcrumbs";
import { BenefitsStrip } from "../components/common/TrustBadges";
import { ScrollReveal } from "../animations/useScrollReveal";
import { BlurText } from "../components/reactbits/BlurText";
import { SpotlightCard } from "../components/reactbits/SpotlightCard";

export const AboutPage = () => {
  return (
    <div className="bg-[#FBFAF6] min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Breadcrumbs items={[{ label: "About Us" }]} />

        {/* Hero Section */}
        <ScrollReveal yOffset={20} duration={600}>
          <div className="bg-[#173D2A] text-white rounded-3xl p-8 sm:p-14 mb-12 relative overflow-hidden text-center sm:text-left shadow-lg">
            <div className="max-w-2xl space-y-4 relative z-10">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#A9D18E]">
                Authentic Herbal Heritage
              </span>
              <h1 className="font-heading tracking-tight text-3xl sm:text-5xl font-bold leading-tight">
                <BlurText text="Rooted in Nature. Guided by Ayurveda." delay={50} />
              </h1>
              <p className="text-sm sm:text-base text-stone-200 leading-relaxed pt-2">
                Divyam Ayurveda was founded on a singular conviction: that classical Indian herbal science holds profound solutions for modern lifestyle imbalances when formulated with unwavering purity.
              </p>
              <div className="pt-2">
                <Link
                  to="/products"
                  className="inline-flex items-center gap-2 px-6 py-3 bg-[#A9D18E] text-[#0B2416] text-xs font-bold rounded-xl hover:bg-white transition-all duration-200 active:scale-95 shadow-xs"
                >
                  <span>Explore Formulations</span>
                  <ArrowRight size={15} />
                </Link>
              </div>
            </div>

            <div className="absolute right-0 bottom-0 top-0 w-1/2 opacity-20 pointer-events-none hidden sm:block">
              <img
                src="https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=1200&q=80"
                alt="Ayurvedic herbs"
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        </ScrollReveal>

        {/* Pillars / Values */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
          <ScrollReveal delay={0} yOffset={18} duration={500}>
            <SpotlightCard className="rounded-3xl h-full" spotlightColor="rgba(169, 209, 142, 0.16)">
              <div className="bg-white rounded-3xl border border-[#E5E7DF] p-8 space-y-3 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg h-full">
                <div className="w-12 h-12 rounded-2xl bg-[#173D2A]/10 text-[#173D2A] flex items-center justify-center transition-transform duration-300 hover:scale-110">
                  <Leaf size={24} />
                </div>
                <h3 className="font-heading tracking-tight text-xl font-bold text-[#171A17]">100% Wild Botanicals</h3>
                <p className="text-xs sm:text-sm text-[#666B64] leading-relaxed">
                  We source directly from indigenous tribal collectors in the pristine Western Ghats, Meghalaya hills, and Madhya Pradesh reserves.
                </p>
              </div>
            </SpotlightCard>
          </ScrollReveal>

          <ScrollReveal delay={80} yOffset={18} duration={500}>
            <SpotlightCard className="rounded-3xl h-full" spotlightColor="rgba(169, 209, 142, 0.16)">
              <div className="bg-white rounded-3xl border border-[#E5E7DF] p-8 space-y-3 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg h-full">
                <div className="w-12 h-12 rounded-2xl bg-[#173D2A]/10 text-[#173D2A] flex items-center justify-center transition-transform duration-300 hover:scale-110">
                  <Award size={24} />
                </div>
                <h3 className="font-heading tracking-tight text-xl font-bold text-[#171A17]">Classical Shastra Adherence</h3>
                <p className="text-xs sm:text-sm text-[#666B64] leading-relaxed">
                  Every churna, tailam, and avaleha is cooked strictly according to the Charaka Samhita, Sushruta Samhita, and Sharangadhara guidelines.
                </p>
              </div>
            </SpotlightCard>
          </ScrollReveal>

          <ScrollReveal delay={160} yOffset={18} duration={500}>
            <SpotlightCard className="rounded-3xl h-full" spotlightColor="rgba(169, 209, 142, 0.16)">
              <div className="bg-white rounded-3xl border border-[#E5E7DF] p-8 space-y-3 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg h-full">
                <div className="w-12 h-12 rounded-2xl bg-[#173D2A]/10 text-[#173D2A] flex items-center justify-center transition-transform duration-300 hover:scale-110">
                  <ShieldCheck size={24} />
                </div>
                <h3 className="font-heading tracking-tight text-xl font-bold text-[#171A17]">Transparent Purity Testing</h3>
                <p className="text-xs sm:text-sm text-[#666B64] leading-relaxed">
                  Zero compromises. Every batch is rigorously tested for heavy metals, pesticides, microbial purity, and active phytochemical concentration.
                </p>
              </div>
            </SpotlightCard>
          </ScrollReveal>
        </div>

        {/* Benefits Strip */}
        <div className="mb-14">
          <BenefitsStrip />
        </div>
      </div>
    </div>
  );
};
