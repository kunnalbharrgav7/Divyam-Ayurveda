import React from "react";
import { Leaf, Heart, Sprout, Truck, Headphones, ShieldCheck } from "lucide-react";
import { motion } from "framer-motion";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 18, scale: 0.97 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: { type: "spring", stiffness: 300, damping: 24 },
  },
};

export const TrustBadges = ({ className = "" }) => {
  const badges = [
    {
      icon: Leaf,
      title: "100% Organic & Natural",
      desc: "Pure botanicals without fillers",
    },
    {
      icon: Heart,
      title: "Chemical Free & Safe",
      desc: "Non-GMO & zero harsh synthetics",
    },
    {
      icon: Sprout,
      title: "Sustainably Sourced",
      desc: "Ethically harvested across India",
    },
    {
      icon: Truck,
      title: "Fast & Reliable Delivery",
      desc: "Carefully packed Ayurvedic dispatch",
    },
  ];

  return (
    <motion.div
      className={`grid grid-cols-2 lg:grid-cols-4 gap-4 py-6 border-t border-b border-[#E5E7DF] ${className}`}
      variants={containerVariants}
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, margin: "-20px" }}
    >
      {badges.map((b, idx) => {
        const Icon = b.icon;
        return (
          <motion.div
            key={idx}
            variants={itemVariants}
            whileHover={{ y: -3 }}
            className="flex items-center gap-3.5 p-2 rounded-xl transition-all duration-300 group hover:bg-[#173D2A]/4 cursor-default"
          >
            <div className="w-11 h-11 rounded-full bg-[#173D2A]/10 text-[#173D2A] flex items-center justify-center shrink-0 transition-all duration-300 group-hover:bg-[#173D2A] group-hover:text-[#A9D18E] group-hover:rotate-6 group-hover:scale-110 shadow-xs">
              <Icon size={20} />
            </div>
            <div>
              <h4 className="text-xs sm:text-sm font-semibold text-[#171A17] group-hover:text-[#173D2A] transition-colors leading-tight">
                {b.title}
              </h4>
              <p className="text-[11px] sm:text-xs text-[#666B64] mt-0.5">{b.desc}</p>
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
};

export const BenefitsStrip = ({ className = "" }) => {
  const benefits = [
    {
      icon: Leaf,
      title: "100% Organic Products",
      desc: "Pure. Safe. Effective.",
    },
    {
      icon: Sprout,
      title: "Eco-Friendly Packaging",
      desc: "For a greener planet.",
    },
    {
      icon: Truck,
      title: "Fast & Reliable Delivery",
      desc: "Right to your doorstep.",
    },
    {
      icon: Headphones,
      title: "Dedicated Support",
      desc: "We're always here for you.",
    },
  ];

  return (
    <div className={`bg-gradient-to-br from-[#F4F4EE] via-[#F8F8F4] to-[#F0EFE9] border border-[#E5E7DF]/80 rounded-2xl p-6 lg:p-8 shadow-xs ${className}`}>
      <motion.div
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
        variants={containerVariants}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, margin: "-30px" }}
      >
        {benefits.map((b, idx) => {
          const Icon = b.icon;
          return (
            <motion.div
              key={idx}
              variants={itemVariants}
              whileHover={{ y: -5, scale: 1.01 }}
              className="flex items-start gap-4 p-4 rounded-xl bg-white/70 backdrop-blur-xs border border-[#E5E7DF]/70 hover:border-[#A9D18E] hover:shadow-md transition-all duration-300 group cursor-default"
            >
              <div className="w-12 h-12 rounded-xl bg-[#173D2A]/10 border border-[#173D2A]/15 text-[#173D2A] flex items-center justify-center shrink-0 shadow-xs transition-all duration-300 group-hover:bg-[#173D2A] group-hover:text-[#A9D18E] group-hover:scale-110 group-hover:-rotate-6">
                <Icon size={22} />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-bold text-[#171A17] group-hover:text-[#173D2A] transition-colors">
                  {b.title}
                </h4>
                <p className="text-xs text-[#666B64] mt-1 leading-snug">{b.desc}</p>
              </div>
            </motion.div>
          );
        })}
      </motion.div>
    </div>
  );
};
