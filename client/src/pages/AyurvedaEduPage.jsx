import React from "react";
import { Link } from "react-router-dom";
import { Wind, Flame, Mountain, Sun, Sparkles, ArrowRight } from "lucide-react";
import { Breadcrumbs } from "../components/common/Breadcrumbs";

export const AyurvedaEduPage = () => {
  return (
    <div className="bg-[#FBFAF6] min-h-screen py-8">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
        <Breadcrumbs items={[{ label: "The Wisdom of Ayurveda" }]} />

        {/* Header */}
        <div className="text-center max-w-2xl mx-auto py-8 space-y-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#386B40] flex items-center justify-center gap-1.5">
            <Sparkles size={14} /> Ancient Science of Life
          </span>
          <h1 className="font-heading tracking-tight text-3xl sm:text-5xl font-bold text-[#171A17]">
            The Fundamentals of Ayurveda
          </h1>
          <p className="text-xs sm:text-sm text-[#666B64] leading-relaxed">
            Ayurveda (*Ayur* = Life, *Veda* = Science or Knowledge) is humanity&apos;s oldest codified healthcare tradition, offering timeless principles to restore physical harmony and emotional equanimity.
          </p>
        </div>

        {/* 3 Doshas Breakdown */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
          {/* Vata */}
          <div className="bg-white rounded-3xl border border-[#E5E7DF] p-6 sm:p-8 space-y-4 hover:border-[#386B40] transition-colors shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-sky-50 text-sky-700 flex items-center justify-center">
              <Wind size={24} />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-sky-800">
                Air + Ether
              </span>
              <h3 className="font-heading tracking-tight text-xl font-bold text-[#171A17] mt-0.5">
                Vata Dosha
              </h3>
            </div>
            <p className="text-xs text-[#666B64] leading-relaxed">
              Governs all bodily movement, respiration, blood flow, and nervous signals. When balanced, it fosters creativity, lightness, and enthusiasm.
            </p>
            <div className="pt-2 text-xs text-stone-500 border-t border-stone-100">
              <strong>Balancing Botanicals:</strong> Ashwagandha, Sesame Tailam, Shatavari, warm spices.
            </div>
          </div>

          {/* Pitta */}
          <div className="bg-white rounded-3xl border border-[#E5E7DF] p-6 sm:p-8 space-y-4 hover:border-[#386B40] transition-colors shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <Flame size={24} />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-800">
                Fire + Water
              </span>
              <h3 className="font-heading tracking-tight text-xl font-bold text-[#171A17] mt-0.5">
                Pitta Dosha
              </h3>
            </div>
            <p className="text-xs text-[#666B64] leading-relaxed">
              Controls digestion (*Agni*), enzymatic transformation, body heat, and sharp intellect. Excess Pitta causes inflammation, acidity, and irritability.
            </p>
            <div className="pt-2 text-xs text-stone-500 border-t border-stone-100">
              <strong>Balancing Botanicals:</strong> Amla, Pure Aloe Vera, Brahmi, Avipattikar Churna.
            </div>
          </div>

          {/* Kapha */}
          <div className="bg-white rounded-3xl border border-[#E5E7DF] p-6 sm:p-8 space-y-4 hover:border-[#386B40] transition-colors shadow-xs">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <Mountain size={24} />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-800">
                Water + Earth
              </span>
              <h3 className="font-heading tracking-tight text-xl font-bold text-[#171A17] mt-0.5">
                Kapha Dosha
              </h3>
            </div>
            <p className="text-xs text-[#666B64] leading-relaxed">
              Supplies biological lubrication, joint cohesion, muscular stability, and emotional compassion. Excess Kapha brings sluggishness and congestion.
            </p>
            <div className="pt-2 text-xs text-stone-500 border-t border-stone-100">
              <strong>Balancing Botanicals:</strong> Tulsi, Lakadong Turmeric, Trikatu, Ginger, Triphala.
            </div>
          </div>
        </div>

        {/* Dinacharya (Daily Routine) Section */}
        <div className="bg-white rounded-3xl border border-[#E5E7DF] p-6 sm:p-10 shadow-xs mb-12 space-y-6">
          <h2 className="font-heading tracking-tight text-2xl font-bold text-[#171A17]">
            Dinacharya: Aligning Your Daily Rhythm
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 text-xs sm:text-sm text-stone-700">
            <div className="space-y-2 p-4 rounded-2xl bg-[#FBFAF6] border border-[#E5E7DF]">
              <h4 className="font-bold text-[#173D2A] text-sm">1. Brahma Muhurta &amp; Hydration</h4>
              <p className="text-xs text-stone-600 leading-relaxed">
                Awakening before sunrise and drinking copper-infused or warm water rekindles the gastrointestinal peristalsis and evacuates metabolic residue.
              </p>
            </div>
            <div className="space-y-2 p-4 rounded-2xl bg-[#FBFAF6] border border-[#E5E7DF]">
              <h4 className="font-bold text-[#173D2A] text-sm">2. Abhyanga (Self-Massage)</h4>
              <p className="text-xs text-stone-600 leading-relaxed">
                Applying warm sesame or herbal medicated tailams prior to morning bath calms excessive Vata, deeply hydrates tissues, and promotes longevity.
              </p>
            </div>
            <div className="space-y-2 p-4 rounded-2xl bg-[#FBFAF6] border border-[#E5E7DF]">
              <h4 className="font-bold text-[#173D2A] text-sm">3. Honoring Agni at Noon</h4>
              <p className="text-xs text-stone-600 leading-relaxed">
                When the sun is highest, internal digestive enzymes burn brightest. Consume your largest, most nourishing meal during midday.
              </p>
            </div>
            <div className="space-y-2 p-4 rounded-2xl bg-[#FBFAF6] border border-[#E5E7DF]">
              <h4 className="font-bold text-[#173D2A] text-sm">4. Evening Rasayana Ritual</h4>
              <p className="text-xs text-stone-600 leading-relaxed">
                Sip warm spiced golden milk with Lakadong turmeric and organic forest honey 45 minutes before sleep to facilitate restorative dream states.
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="p-8 bg-[#173D2A] text-white rounded-3xl text-center space-y-4">
          <h3 className="font-heading tracking-tight text-2xl sm:text-3xl font-bold">
            Begin Your Personalized Ayurvedic Journey
          </h3>
          <p className="text-xs sm:text-sm text-stone-200 max-w-lg mx-auto">
            Discover single-herb powders and classical formulations tailored to your dominant constitution.
          </p>
          <Link
            to="/products"
            className="inline-flex items-center gap-2 px-6 py-3 bg-[#A9D18E] text-[#0B2416] text-xs font-bold rounded-xl hover:bg-white transition-colors"
          >
            <span>Explore All Ayurvedic Products</span>
            <ArrowRight size={14} />
          </Link>
        </div>
      </div>
    </div>
  );
};

