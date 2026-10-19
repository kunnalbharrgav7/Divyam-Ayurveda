/**
 * Referral performance for the signed-in customer: friends invited, first orders placed,
 * rewards paid, rewards on hold and the store-credit balance. All figures come from the API.
 */
import React from "react";
import { Users, ShoppingBag, Clock, CheckCircle2, Wallet, Award } from "lucide-react";
import { useReferrals } from "../../context/ReferralContext";
import { formatINR } from "../../utils/formatters";

export const ReferralStats = () => {
  const { dashboardData, settings } = useReferrals();
  const { stats, tier } = dashboardData;

  const statCards = [
    { id: "invited", label: "Friends Joined", value: stats.invited, subtext: "Signed up with your code", icon: Users, color: "text-emerald-700 bg-emerald-50" },
    { id: "ordered", label: "First Orders", value: stats.ordered, subtext: `Min. ${formatINR(settings.minOrderValue)} order`, icon: ShoppingBag, color: "text-amber-700 bg-amber-50" },
    {
      id: "pending",
      label: "Pending Rewards",
      value: formatINR(stats.pendingRewards),
      subtext: `Paid ${settings.holdDays} days after delivery`,
      icon: Clock,
      color: "text-amber-800 bg-amber-50",
      highlight: stats.pendingRewards > 0,
    },
    { id: "earned", label: "Total Earned", value: formatINR(stats.totalEarned), subtext: `${stats.rewarded} reward(s) paid`, icon: CheckCircle2, color: "text-[#173D2A] bg-emerald-100", highlight: true },
    { id: "wallet", label: "Store Credit", value: formatINR(stats.walletBalance), subtext: "Spend it at checkout", icon: Wallet, color: "text-[#173D2A] bg-emerald-100", highlight: stats.walletBalance > 0 },
    {
      id: "tier",
      label: "Your Tier",
      value: tier.name.replace("Prana ", ""),
      subtext: tier.nextTier ? `${tier.nextTier.remaining} more for ${tier.nextTier.name.replace("Prana ", "")}` : "Top tier reached",
      icon: Award,
      color: "text-stone-700 bg-stone-100",
    },
  ];

  return (
    <div className="space-y-3">
      <h4 className="font-heading tracking-tight text-lg font-bold text-[#171A17] flex items-center gap-2">
        <Wallet size={18} className="text-[#386B40]" />
        <span>Referral Performance &amp; Earnings</span>
      </h4>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.id}
              className={`p-4 rounded-2xl border transition-all ${
                card.highlight ? "bg-gradient-to-br from-emerald-50/80 to-white border-[#A9D18E]/50 shadow-xs" : "bg-white border-[#E5E7DF] shadow-xs"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-stone-600 truncate">{card.label}</span>
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${card.color}`}>
                  <Icon size={14} />
                </div>
              </div>
              <div className="text-xl sm:text-2xl font-bold text-[#171A17] tracking-tight">{card.value}</div>
              <p className="text-[10px] text-stone-500 mt-0.5 truncate">{card.subtext}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
};
