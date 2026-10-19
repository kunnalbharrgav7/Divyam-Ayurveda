import React, { useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Sun, Droplets, Zap, ShieldCheck, ArrowRight, CheckCircle2 } from "lucide-react";
import { ScrollReveal } from "../../animations/useScrollReveal";

const RITUAL_STEPS = [
  {
    id: "measure",
    step: "01",
    label: "The Sacred Measure",
    title: "Portion a Pea-Sized Resin Bead",
    timing: "Brahma Muhurta (Early Morning)",
    doshaEffect: "Balances Vata & Kapha",
    description:
      "Using the included stainless Ayurvedic spatula or clean wooden tip, extract 300mg to 500mg of raw resin (roughly the size of a green pea or grain of barley). Authentic gold-grade Shilajit is malleable at room temperature.",
    carrierTip: "Take on an empty stomach 30 minutes before your morning meal.",
    sanskritCitation: "मात्रा प्रमाणं — यथोचितं रसायनानाम् (Charaka Samhita, Chikitsa 1:1)",
    accentColor: "#D4AF37",
    highlights: [
      "Optimal daily serving: 300mg – 500mg",
      "Softens naturally in ambient warmth",
      "Free of binders, starches, or thickeners",
    ],
  },
  {
    id: "dissolve",
    step: "02",
    label: "Vedic Dissolution",
    title: "Dissolve in Lukewarm Vedic Anupana",
    timing: "Temperature < 45°C (Lukewarm)",
    doshaEffect: "Yogavahi Potentiator",
    description:
      "Stir the resin bead into a cup of lukewarm A2 Vedic cow milk, raw forest honey water, or warm spring water. It acts as an active Yogavahi (catalytic bio-transporter), completely dissolving in 2 minutes without residue.",
    carrierTip: "Never boil Shilajit directly; high heat denatures precious fulvic complex bonds.",
    sanskritCitation: "योगवाही परं श्रेष्ठं — द्रव्यगुणावहं परम् (Ashtanga Hridaya)",
    accentColor: "#A9D18E",
    highlights: [
      "100% water-soluble within 120 seconds",
      "Creates a rich golden-amber elixir",
      "Leaves zero gritty sediment or ash",
    ],
  },
  {
    id: "assimilation",
    step: "03",
    label: "Cellular Assimilation",
    title: "Peak Mitochondrial Bio-Absorption",
    timing: "Daily for 90-Day Mandala Cycle",
    doshaEffect: "Rasayana (Ojas & Vigor)",
    description:
      "The small-molecular-weight fulvic acid directly penetrates mitochondrial cellular walls, delivering 80+ ionic minerals and boosting cellular ATP production. Delivers sustained stamina without caffeine crash.",
    carrierTip: "Noticeable surge in mental clarity and physical vitality within 10 to 14 days.",
    sanskritCitation: "बल्यं रसायनं वृष्यं — सर्वदोषहरं परम् (Bhavaprakasha Nighantu)",
    accentColor: "#386B40",
    highlights: [
      ">75% Fulvic Acid passes cell membranes",
      "Supports healthy testosterone & vitality",
      "Elevates natural cellular ATP output",
    ],
  },
];

export const AyurvedicRitualSection = () => {
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const currentStep = RITUAL_STEPS[activeStepIndex];

  return (
    <section className="py-16 bg-[#173D2A] text-white relative overflow-hidden">
      {/* Background Organic Ambient Halos */}
      <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#A9D18E]/5 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[450px] h-[450px] bg-[#D4AF37]/5 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        {/* Header */}
        <ScrollReveal yOffset={16} duration={500} className="text-center max-w-2xl mx-auto mb-10">
          <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 backdrop-blur-md text-[#A9D18E] text-xs font-semibold uppercase tracking-widest border border-white/10">
            <Sparkles size={13} className="text-[#D4AF37]" />
            The Rasayana Daily Ritual
          </span>
          <h2 className="text-2xl sm:text-4xl font-heading font-bold tracking-tight text-white mt-3 leading-snug">
            How to Consume Pure Shilajit
          </h2>
          <div className="w-14 h-0.5 bg-[#D4AF37] mx-auto mt-3 rounded-full" />
          <p className="text-xs sm:text-sm text-stone-300 mt-3 font-light leading-relaxed">
            Follow the ancient Shodhana-honored method to unlock 80+ minerals and deep cellular bio-absorption.
          </p>
        </ScrollReveal>

        {/* Step Selector Tabs */}
        <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-3 mb-10">
          {RITUAL_STEPS.map((step, idx) => {
            const isActive = activeStepIndex === idx;
            return (
              <button
                key={step.id}
                onClick={() => setActiveStepIndex(idx)}
                className={`relative px-4 sm:px-6 py-3 rounded-2xl text-xs sm:text-sm font-semibold transition-all duration-300 cursor-pointer flex items-center gap-2.5 ${
                  isActive
                    ? "text-[#173D2A] shadow-xl"
                    : "text-stone-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10"
                }`}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeRitualPill"
                    className="absolute inset-0 bg-[#E8D9B5] rounded-2xl z-0 shadow-lg"
                    transition={{ type: "spring", stiffness: 350, damping: 30 }}
                  />
                )}
                <span className="relative z-10 font-mono text-xs opacity-75">
                  {step.step}
                </span>
                <span className="relative z-10 font-heading font-bold tracking-tight">
                  {step.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Interactive Step Content Display */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Left Column: Visual Display Card */}
          <div className="lg:col-span-5 bg-black/30 backdrop-blur-md rounded-3xl p-6 sm:p-8 border border-white/10 flex flex-col justify-between shadow-2xl relative overflow-hidden">
            {/* Ambient inner glow */}
            <div
              className="absolute -top-24 -left-24 w-60 h-60 rounded-full blur-2xl pointer-events-none transition-colors duration-700"
              style={{ background: `${currentStep.accentColor}20` }}
            />

            <div>
              {/* Timing & Dosha Badges */}
              <div className="flex flex-wrap items-center gap-2 mb-6">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-xs text-stone-200 border border-white/10">
                  <Sun size={13} className="text-[#D4AF37]" />
                  {currentStep.timing}
                </span>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#386B40]/40 text-[#A9D18E] text-xs border border-[#A9D18E]/30 font-medium">
                  <Zap size={12} />
                  {currentStep.doshaEffect}
                </span>
              </div>

              {/* Step Graphic Illustration */}
              <div className="aspect-4/3 rounded-2xl bg-gradient-to-b from-white/10 to-white/5 border border-white/10 p-6 flex flex-col items-center justify-center text-center relative overflow-hidden my-4 group">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentStep.id}
                    initial={{ opacity: 0, scale: 0.9, y: 15 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.9, y: -15 }}
                    transition={{ duration: 0.35, ease: "easeOut" }}
                    className="flex flex-col items-center gap-4"
                  >
                    <div className="w-20 h-20 rounded-full bg-black/40 border-2 border-[#D4AF37]/50 flex items-center justify-center shadow-xl relative">
                      {activeStepIndex === 0 && (
                        <div className="w-7 h-7 rounded-full bg-[#1A1813] border-2 border-[#D4AF37] shadow-inner animate-pulse" />
                      )}
                      {activeStepIndex === 1 && (
                        <Droplets size={32} className="text-[#A9D18E] animate-bounce" />
                      )}
                      {activeStepIndex === 2 && (
                        <Zap size={34} className="text-[#D4AF37] animate-pulse" />
                      )}
                    </div>

                    <div className="space-y-1">
                      <span className="text-[11px] font-mono tracking-widest text-[#D4AF37] uppercase">
                        Ritual Stage {currentStep.step} / 03
                      </span>
                      <h4 className="font-heading text-lg font-bold tracking-tight text-white">
                        {currentStep.title}
                      </h4>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>

            {/* Carrier Tip Card */}
            <div className="p-4 rounded-2xl bg-white/5 border border-white/10 mt-4 text-xs text-stone-300 font-light leading-relaxed">
              <span className="font-semibold text-[#A9D18E] block mb-0.5">
                ✦ Ayurvedic Practitioner Tip:
              </span>
              {currentStep.carrierTip}
            </div>
          </div>

          {/* Right Column: Detailed Scientific & Vedic Insights */}
          <div className="lg:col-span-7 bg-white/5 backdrop-blur-md rounded-3xl p-6 sm:p-10 border border-white/10 flex flex-col justify-between shadow-2xl">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3, ease: "easeOut" }}
                className="space-y-6"
              >
                <div>
                  <span className="text-xs font-mono tracking-widest text-[#D4AF37] uppercase font-bold">
                    Phase {currentStep.step} &bull; {currentStep.label}
                  </span>
                  <h3 className="text-2xl sm:text-3xl font-heading font-bold tracking-tight text-white mt-1.5 leading-snug">
                    {currentStep.title}
                  </h3>
                  <p className="text-sm sm:text-base text-stone-200 mt-4 leading-relaxed font-light">
                    {currentStep.description}
                  </p>
                </div>

                {/* Classical Shloka Card */}
                <div className="p-4 rounded-2xl bg-[#0B2416]/70 border border-[#A9D18E]/30 text-stone-300 space-y-1.5">
                  <span className="text-[11px] font-semibold text-[#D4AF37] uppercase tracking-wider block">
                    Classical Ayurvedic Reference
                  </span>
                  <p className="text-xs sm:text-sm font-sans italic text-stone-100 leading-relaxed">
                    &ldquo;{currentStep.sanskritCitation}&rdquo;
                  </p>
                </div>

                {/* Key Checklist Highlights */}
                <div className="space-y-2.5 pt-2">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-stone-300">
                    Key Quality Indicators
                  </h5>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {currentStep.highlights.map((h, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-2.5 text-xs text-stone-200 bg-white/5 p-3 rounded-xl border border-white/5"
                      >
                        <CheckCircle2 size={15} className="text-[#A9D18E] shrink-0" />
                        <span>{h}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Bottom Actions Row */}
            <div className="pt-8 mt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 text-xs text-stone-300">
                <ShieldCheck size={18} className="text-[#A9D18E]" />
                <span>Heavy-Metal Tested &bull; 80+ Ionic Trace Minerals</span>
              </div>

              <Link
                to="/products/shilajit-pure-himalayan-resin"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#D4AF37] hover:bg-[#e4c251] text-[#0B2416] text-xs font-bold uppercase tracking-wider transition-all duration-300 shadow-lg hover:shadow-xl hover:scale-105"
              >
                <span>Experience Pure Shilajit</span>
                <ArrowRight size={14} />
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

