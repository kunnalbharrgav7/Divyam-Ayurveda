/**
 * DIVYAM AYURVEDA — REFERRAL LINK & CODE CARD
 * 
 * Displays the customer's stable referral code and complete link.
 * Provides instant 1-click copy with feedback badges.
 */

import React from "react";
import { Copy, Check, Link2, Sparkles, ShieldCheck } from "lucide-react";
import { useReferrals } from "../../context/ReferralContext";
import { describeFriendOffer, describeReward } from "../../services/referralService";

export const ReferralLinkCard = () => {
  const { dashboardData, copyToClipboard, copyFeedback, settings } = useReferrals();
  const { referralCode, shareUrl } = dashboardData;

  return (
    <div className="bg-gradient-to-br from-[#173D2A] to-[#0B2416] text-white rounded-3xl p-6 sm:p-8 shadow-md border border-[#A9D18E]/20 relative overflow-hidden">
      {/* Decorative background botanicals */}
      <div className="absolute -right-8 -bottom-8 w-48 h-48 rounded-full bg-emerald-700/10 blur-2xl pointer-events-none" />
      <div className="absolute -left-8 -top-8 w-40 h-40 rounded-full bg-[#A9D18E]/10 blur-2xl pointer-events-none" />

      <div className="relative z-10 space-y-6">
        {/* Card Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-[#A9D18E] text-[11px] font-bold uppercase tracking-wider mb-2 border border-white/10">
              <Sparkles size={12} />
              <span>Your Personal Wellness Link</span>
            </div>
            <h3 className="font-heading tracking-tight text-2xl sm:text-3xl font-bold text-white">
              Give {describeFriendOffer(settings)}, Earn {describeReward(settings)}
            </h3>
            <p className="text-xs sm:text-sm text-stone-300 mt-1 max-w-xl leading-relaxed">
              When friends use your code or link, they get{" "}
              <strong className="text-white">{describeFriendOffer(settings)}</strong> on their first order above ₹
              {settings.minOrderValue}. You earn{" "}
              <strong className="text-[#A9D18E]">{describeReward(settings)} in store credit</strong>, added {settings.holdDays} days after their order is delivered.
            </p>
          </div>

          <div className="flex sm:flex-col items-center sm:items-end gap-1.5 text-xs text-stone-300 bg-white/5 p-3 rounded-2xl border border-white/10">
            <span className="text-[10px] text-stone-400 uppercase tracking-wider">Your Code</span>
            <span className="font-mono text-base font-extrabold text-[#A9D18E]">
              {referralCode}
            </span>
          </div>
        </div>

        {/* Input Box: Complete Referral Link */}
        <div className="space-y-2">
          <label className="block text-xs font-semibold text-stone-200">
            Shareable Referral URL
          </label>
          <div className="flex flex-col sm:flex-row items-stretch gap-2.5">
            <div className="flex-1 relative flex items-center">
              <Link2 size={16} className="absolute left-3.5 text-stone-400" />
              <input
                type="text"
                readOnly
                value={shareUrl}
                aria-label="Shareable referral link"
                className="w-full pl-10 pr-4 py-3 bg-white/10 text-stone-100 rounded-2xl text-xs sm:text-sm font-mono border border-white/20 focus:outline-none focus:ring-2 focus:ring-[#A9D18E]/60 select-all cursor-text truncate"
              />
            </div>

            <button
              type="button"
              onClick={() => copyToClipboard(shareUrl, "link")}
              className={`px-5 py-3 rounded-2xl text-xs sm:text-sm font-bold flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer shrink-0 ${
                copyFeedback.link
                  ? "bg-emerald-500 text-white"
                  : "bg-[#A9D18E] text-[#0B2416] hover:bg-[#b8dd9e] active:scale-95"
              }`}
            >
              {copyFeedback.link ? (
                <>
                  <Check size={16} />
                  <span>Link Copied!</span>
                </>
              ) : (
                <>
                  <Copy size={16} />
                  <span>Copy Link</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Quick Referral Code Box */}
        <div className="pt-2 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-stone-300">Or share code directly:</span>
            <span className="font-mono text-sm font-bold bg-white/10 px-3 py-1 rounded-xl text-white border border-white/20">
              {referralCode}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => copyToClipboard(referralCode, "code")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                copyFeedback.code
                  ? "bg-emerald-500 text-white"
                  : "bg-white/10 hover:bg-white/20 text-white border border-white/20 active:scale-95"
              }`}
            >
              {copyFeedback.code ? (
                <>
                  <Check size={14} />
                  <span>Code Copied!</span>
                </>
              ) : (
                <>
                  <Copy size={14} />
                  <span>Copy Code Only</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Demo policy disclaimer */}
        <div className="flex items-center gap-2 text-[11px] text-stone-400 pt-1">
          <ShieldCheck size={14} className="text-[#A9D18E] shrink-0" />
          <span>
            Demo environment: Simulated client-side attribution. No real financial transaction occurs.
          </span>
        </div>
      </div>
    </div>
  );
};

