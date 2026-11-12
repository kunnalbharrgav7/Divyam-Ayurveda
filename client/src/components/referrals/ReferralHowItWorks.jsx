/**
 * DIVYAM AYURVEDA — HOW REFERRALS WORK STEP-BY-STEP
 */

import React from "react";
import { Share2, Tag, Gift, CheckCircle2 } from "lucide-react";
import { useReferrals } from "../../context/ReferralContext";
import { describeFriendOffer, describeReward } from "../../services/referralService";
import { formatINR } from "../../utils/formatters";

export const ReferralHowItWorks = () => {
  const { settings } = useReferrals();

  const steps = [
    {
      step: "01",
      icon: Share2,
      title: "Invite Friends & Family",
      desc: "Share your unique personal link or referral code via WhatsApp, Email, or Social Media.",
    },
    {
      step: "02",
      icon: Tag,
      title: `They Get ${describeFriendOffer(settings)}`,
      desc: `Friends get ${describeFriendOffer(settings)}${settings.refereeDiscountType !== "fixed" && settings.refereeDiscountCap ? ` (up to ${formatINR(settings.refereeDiscountCap)})` : ""} on their first order of ${formatINR(settings.minOrderValue)} or more.`,
    },
    {
      step: "03",
      icon: Gift,
      title: `You Earn ${describeReward(settings)} Credit`,
      desc: `${settings.holdDays} days after your friend's order is delivered (and not returned), the reward is added to your store credit and can be used at checkout.`,
    },
  ];

  return (
    <div className="bg-[#FBFAF6] rounded-3xl border border-[#E5E7DF] p-4 sm:p-8 space-y-5 sm:space-y-6">
      <div className="text-center max-w-xl mx-auto space-y-1">
        <h4 className="font-heading tracking-tight text-lg sm:text-2xl font-bold text-[#171A17]">
          How The Mitra Referral Program Works
        </h4>
        <p className="text-xs sm:text-sm text-stone-500">
          Spread authentic Himalayan wellness in three effortless steps.
        </p>
      </div>

      {/* Stacked rows on phones and in the desktop side column; three cards on tablets */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-1 gap-3 sm:gap-4">
        {steps.map((item, idx) => {
          const Icon = item.icon;
          return (
            <div
              key={idx}
              className="bg-white rounded-2xl border border-[#E5E7DF] p-4 sm:p-5 flex md:flex-col lg:flex-row items-start gap-4 group hover:shadow-sm transition-all min-w-0"
            >
              <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-emerald-50 text-[#173D2A] border border-emerald-100 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                <Icon size={22} />
              </div>

              <div className="min-w-0 space-y-1.5">
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-stone-100 text-stone-600 inline-block">
                  Step {item.step}
                </span>
                <h5 className="font-heading tracking-tight text-[15px] sm:text-base font-bold text-[#171A17] leading-snug">
                  {item.title}
                </h5>
                <p className="text-xs sm:text-[13px] text-stone-500 leading-relaxed">{item.desc}</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
