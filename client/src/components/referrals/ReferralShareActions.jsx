/**
 * DIVYAM AYURVEDA — REFERRAL SHARING ACTIONS
 * 
 * Provides quick sharing triggers:
 * 1. WhatsApp
 * 2. Email
 * 3. Native Web Share API (where supported)
 * 4. Copy Link
 * 5. Copy Code
 */

import React, { useState } from "react";
import { Copy, Check, Share2, Mail, MessageCircle, Send } from "lucide-react";
import { useReferrals } from "../../context/ReferralContext";

export const ReferralShareActions = () => {
  const {
    dashboardData,
    copyToClipboard,
    copyFeedback,
    shareViaWhatsApp,
    shareViaEmail,
    shareNative,
  } = useReferrals();
  const { referralCode, shareUrl } = dashboardData;

  const [nativeShareStatus, setNativeShareStatus] = useState("");

  const handleNativeShare = async () => {
    const res = await shareNative(referralCode, shareUrl);
    if (!res && !navigator?.share) {
      // Fallback: copy to clipboard
      await copyToClipboard(shareUrl, "link");
      setNativeShareStatus("Link copied to clipboard!");
      setTimeout(() => setNativeShareStatus(""), 3000);
    }
  };

  return (
    <div className="bg-white rounded-3xl border border-[#E5E7DF] p-6 sm:p-8 shadow-xs space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div>
          <h4 className="font-heading tracking-tight text-lg font-bold text-[#171A17]">
            Share With Friends & Family
          </h4>
          <p className="text-xs text-stone-500 mt-0.5">
            Choose your preferred messaging channel to spread holistic Ayurvedic wellness.
          </p>
        </div>

        {nativeShareStatus && (
          <span className="text-xs text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full font-medium border border-emerald-200">
            {nativeShareStatus}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
        {/* 1. WhatsApp */}
        <button
          type="button"
          onClick={() => shareViaWhatsApp(referralCode, shareUrl)}
          className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-[#25D366]/10 hover:bg-[#25D366]/20 text-[#1E7E34] border border-[#25D366]/30 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer text-center group"
          title="Share referral link via WhatsApp"
        >
          <div className="w-10 h-10 rounded-full bg-[#25D366] text-white flex items-center justify-center shadow-xs group-hover:scale-110 transition-transform">
            <MessageCircle size={20} />
          </div>
          <div>
            <span className="text-xs font-bold block text-stone-800">WhatsApp</span>
            <span className="text-[10px] text-stone-500">Instant Message</span>
          </div>
        </button>

        {/* 2. Email */}
        <button
          type="button"
          onClick={() => shareViaEmail(referralCode, shareUrl)}
          className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-200 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer text-center group"
          title="Share referral link via Email"
        >
          <div className="w-10 h-10 rounded-full bg-sky-600 text-white flex items-center justify-center shadow-xs group-hover:scale-110 transition-transform">
            <Mail size={19} />
          </div>
          <div>
            <span className="text-xs font-bold block text-stone-800">Email</span>
            <span className="text-[10px] text-stone-500">Pre-written Note</span>
          </div>
        </button>

        {/* 3. Native Share */}
        <button
          type="button"
          onClick={handleNativeShare}
          className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 transition-all hover:scale-[1.02] active:scale-95 cursor-pointer text-center group"
          title="Open system share options"
        >
          <div className="w-10 h-10 rounded-full bg-amber-600 text-white flex items-center justify-center shadow-xs group-hover:scale-110 transition-transform">
            <Share2 size={19} />
          </div>
          <div>
            <span className="text-xs font-bold block text-stone-800">Social / Apps</span>
            <span className="text-[10px] text-stone-500">Device Share</span>
          </div>
        </button>

        {/* 4. Copy Link Button */}
        <button
          type="button"
          onClick={() => copyToClipboard(shareUrl, "link")}
          className="flex flex-col items-center justify-center gap-2 p-4 rounded-2xl bg-[#FBFAF6] hover:bg-stone-100 text-stone-800 border border-[#E5E7DF] transition-all hover:scale-[1.02] active:scale-95 cursor-pointer text-center group"
          title="Copy referral link to clipboard"
        >
          <div
            className={`w-10 h-10 rounded-full flex items-center justify-center shadow-xs transition-transform group-hover:scale-110 ${
              copyFeedback.link ? "bg-emerald-600 text-white" : "bg-[#173D2A] text-white"
            }`}
          >
            {copyFeedback.link ? <Check size={19} /> : <Copy size={18} />}
          </div>
          <div>
            <span className="text-xs font-bold block text-stone-800">
              {copyFeedback.link ? "Copied!" : "Copy Link"}
            </span>
            <span className="text-[10px] text-stone-500">To Clipboard</span>
          </div>
        </button>
      </div>
    </div>
  );
};

