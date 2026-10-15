import React from "react";
import { Leaf, Heart, Sprout, Truck, ShieldCheck, Headphones } from "lucide-react";

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
    <div className={`grid grid-cols-2 lg:grid-cols-4 gap-4 py-6 border-t border-b border-[#E5E7DF] ${className}`}>
      {badges.map((b, idx) => {
        const Icon = b.icon;
        return (
          <div key={idx} className="flex items-center gap-3 px-2">
            <div className="w-10 h-10 rounded-full bg-[#173D2A]/10 text-[#173D2A] flex items-center justify-center shrink-0">
              <Icon size={20} />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-[#171A17] leading-tight">{b.title}</h4>
              <p className="text-xs text-[#666B64] mt-0.5">{b.desc}</p>
            </div>
          </div>
        );
      })}
    </div>
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
      title: "Dedicated Customer Support",
      desc: "We're always here for you.",
    },
  ];

  return (
    <div className={`bg-[#F4F4EE] rounded-2xl p-6 lg:p-8 ${className}`}>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {benefits.map((b, idx) => {
          const Icon = b.icon;
          return (
            <div key={idx} className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-xl bg-white border border-[#E5E7DF] text-[#173D2A] flex items-center justify-center shrink-0 shadow-xs">
                <Icon size={22} />
              </div>
              <div>
                <h4 className="text-sm font-semibold text-[#171A17]">{b.title}</h4>
                <p className="text-xs text-[#666B64] mt-0.5">{b.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

