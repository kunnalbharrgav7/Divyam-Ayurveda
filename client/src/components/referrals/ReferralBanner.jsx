/**
 * DIVYAM AYURVEDA — REFERRAL INVITATION FLOATING BANNER
 * 
 * Appears when a visitor arrives via a referral link (?ref=CODE).
 * Displays the unlocked discount and gives clear confirmation.
 */

import React from "react";
import { Gift, X, Sparkles, Check, AlertCircle } from "lucide-react";
import { useReferrals } from "../../context/ReferralContext";

export const ReferralBanner = () => {
  const { bannerAlert, dismissBanner, activeAttribution } = useReferrals();

  if (!bannerAlert || !bannerAlert.show) {
    return null;
  }

  if (bannerAlert.isInvalid) {
    return (
      <aside
        aria-label="Referral link notice"
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 max-w-md bg-stone-900 text-white rounded-2xl p-4 shadow-2xl border border-stone-700 animate-in fade-in slide-in-from-bottom-4 duration-300"
      >
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-amber-500/20 text-amber-400 shrink-0">
            <AlertCircle size={20} />
          </div>
          <div className="flex-1 pr-2">
            <h4 className="text-xs font-bold text-amber-400">Referral Notice</h4>
            <p className="text-xs text-stone-300 mt-0.5 leading-relaxed">
              {bannerAlert.reason || "The referral code is invalid or has expired."}
            </p>
          </div>
          <button
            type="button"
            onClick={dismissBanner}
            className="text-stone-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
            aria-label="Dismiss referral notice"
          >
            <X size={16} />
          </button>
        </div>
      </aside>
    );
  }

  return (
    <aside
      aria-label="Referral discount notification"
      className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50 max-w-md bg-[#173D2A] text-white rounded-3xl p-5 shadow-2xl border border-[#A9D18E]/30 animate-in fade-in slide-in-from-bottom-5 duration-300 ring-4 ring-emerald-950/20"
    >
      <div className="flex items-start gap-3.5">
        <div className="w-10 h-10 rounded-2xl bg-[#A9D18E]/20 text-[#A9D18E] flex items-center justify-center shrink-0 border border-[#A9D18E]/30">
          <Gift size={20} />
        </div>

        <div className="flex-1 min-w-0 pr-1">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold uppercase tracking-wider text-[#A9D18E] flex items-center gap-1">
              <Sparkles size={12} />
              <span>Friend Referral Applied</span>
            </span>
          </div>

          <h4 className="text-sm font-heading tracking-tight font-bold text-white mt-0.5">
            You Unlocked {bannerAlert.offer || `${bannerAlert.discountValue}% OFF`}!
          </h4>

          <p className="text-xs text-stone-200 mt-1 leading-relaxed">
            Courtesy of <span className="font-semibold text-white">{bannerAlert.referrerName || "your friend"}</span>.
            Valid on first orders above ₹{bannerAlert.minOrderValue}. Create an account or sign in, and it is applied at checkout.
          </p>

          <div className="mt-3 flex items-center gap-2">
            <span className="font-mono text-[11px] font-bold px-2 py-0.5 bg-white/10 rounded-md text-[#A9D18E] border border-white/15">
              Code: {bannerAlert.code}
            </span>
            <span className="text-[10px] text-stone-300">
              &bull; Invitation from a friend
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={dismissBanner}
          className="text-stone-300 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer shrink-0"
          aria-label="Dismiss notification"
        >
          <X size={18} />
        </button>
      </div>
    </aside>
  );
};

