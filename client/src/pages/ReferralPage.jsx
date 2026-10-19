/**
 * DIVYAM AYURVEDA — CUSTOMER REFERRAL & REWARDS PAGE
 * 
 * Public / Authenticated customer-facing page where users can:
 * 1. View their personal referral code and shareable link
 * 2. Instantly share via WhatsApp, Email, or Web Share
 * 3. Track real-time statistics (shares, attributed friends, signups, rewards)
 * 4. Review recent referral activity and reward payout statuses
 * 5. Learn how the program works and read terms
 */

import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  Gift,
  Sparkles,
  ShieldCheck,
  HelpCircle,
  ChevronDown,
  ArrowRight,
  HeartHandshake,
  CheckCircle2,
  Users,
} from "lucide-react";
import { Breadcrumbs } from "../components/common/Breadcrumbs";
import { ReferralLinkCard } from "../components/referrals/ReferralLinkCard";
import { ReferralShareActions } from "../components/referrals/ReferralShareActions";
import { ReferralStats } from "../components/referrals/ReferralStats";
import { ReferralHowItWorks } from "../components/referrals/ReferralHowItWorks";
import { ReferralHistory } from "../components/referrals/ReferralHistory";
import { useReferrals } from "../context/ReferralContext";
import { useAuth } from "../context/AuthContext";
import { describeFriendOffer, describeReward } from "../services/referralService";

export const ReferralPage = () => {
  const { settings } = useReferrals();
  const { user, isAuthenticated } = useAuth();

  const [expandedFaq, setExpandedFaq] = useState(null);

  const toggleFaq = (index) => {
    setExpandedFaq(expandedFaq === index ? null : index);
  };

  const faqs = [
    {
      q: "How does the Divyam Ayurveda Referral Program work?",
      a: `It's simple: Share your personal referral code or unique link with friends. When they place their first order above ₹${settings.minOrderValue}, they get ${describeFriendOffer(settings)} at checkout. ${settings.holdDays} days after that order is delivered, ${describeReward(settings)} in store credit is added to your account.`,
    },
    {
      q: "Is there a limit on how many friends I can refer?",
      a: "You can invite as many friends as you like. Rewards are paid for each friend's first order, up to the monthly limit set for the program.",
    },
    {
      q: "When and how are my rewards credited?",
      a: `Your reward shows as "Pending" once your friend places their first order. It is credited to your store credit ${settings.holdDays} days after delivery, as long as the order is not cancelled or returned, and you can use it at checkout.`,
    },
    {
      q: "Can my friend combine the referral discount with other coupon codes?",
      a: `The referral discount (${describeFriendOffer(settings)}, up to ₹${settings.refereeDiscountCap}) applies to a first order of at least ₹${settings.minOrderValue}. It cannot be combined with a coupon or other offer.`,
    },
    {
      q: "How long does the referral link stay active after a friend clicks it?",
      a: `Our referral tracking window remains active for ${settings.attributionDays} days in your friend's browser, so you still get credit if they sign up and order a few days later.`,
    },
  ];

  return (
    <div className="bg-[#FBFAF6] min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Breadcrumb Navigation */}
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Refer & Earn Rewards" },
          ]}
        />

        {/* Page Hero Header */}
        <div className="relative rounded-3xl bg-gradient-to-r from-[#173D2A] via-[#1E4A34] to-[#0B2416] text-white p-8 sm:p-12 overflow-hidden shadow-sm">
          {/* Subtle Ayurvedic glow accents */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#A9D18E]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 max-w-3xl space-y-4">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 text-[#A9D18E] text-xs font-bold uppercase tracking-wider border border-white/10 backdrop-blur-xs">
              <Gift size={14} />
              <span>Ayurvedic Wellness Circle</span>
            </div>

            <h1 className="font-heading tracking-tight text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-white leading-tight">
              Share Natural Healing. <br className="hidden sm:inline" />
              <span className="text-[#A9D18E]">Give 10%, Earn ₹100.</span>
            </h1>

            <p className="text-sm sm:text-base text-stone-200 leading-relaxed max-w-2xl">
              Introduce your friends and family to authentic, single-origin herbs, Shilajit, and classical churnas. 
              They receive an immediate 10% welcome discount, and you receive ₹100 in wellness rewards on their first qualifying order.
            </p>

            {!isAuthenticated && (
              <div className="pt-2 flex flex-wrap items-center gap-3">
                <Link
                  to="/login?redirect=/referrals"
                  className="px-5 py-2.5 bg-[#A9D18E] hover:bg-[#8FBE72] text-[#0B2416] text-xs font-bold rounded-xl shadow-xs transition-all duration-200 flex items-center gap-2"
                >
                  <span>Sign In for Personal Code</span>
                  <ArrowRight size={14} />
                </Link>
                <span className="text-xs text-stone-300">
                  (Or test using our active demo customer Aarav Sharma)
                </span>
              </div>
            )}
          </div>
        </div>

        {/* 1-Click Link & Share Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-7 space-y-6">
            <ReferralLinkCard />
            <ReferralShareActions />
          </div>

          <div className="lg:col-span-5">
            <ReferralHowItWorks />
          </div>
        </div>

        {/* Real-time Statistics Cards */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-heading tracking-tight text-2xl font-bold text-[#171A17]">
                Your Referral Performance
              </h2>
              <p className="text-xs sm:text-sm text-[#666B64] mt-0.5">
                Real-time tracking of links shared, invited friends, orders placed, and rewards earned.
              </p>
            </div>
          </div>
          <ReferralStats />
        </div>

        {/* Referral Activity History */}
        <div className="space-y-4">
          <ReferralHistory />
        </div>

        {/* Frequently Asked Questions */}
        <div className="bg-white rounded-3xl border border-[#E5E7DF] p-6 sm:p-8 shadow-xs space-y-6">
          <div className="flex items-center gap-3 pb-3 border-b border-[#E5E7DF]">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-800 flex items-center justify-center shrink-0">
              <HelpCircle size={20} />
            </div>
            <div>
              <h3 className="font-heading tracking-tight text-xl font-bold text-[#171A17]">
                Referral Program FAQs & Guidelines
              </h3>
              <p className="text-xs text-[#666B64]">
                Everything you need to know about sharing, qualifying orders, and reward redemption.
              </p>
            </div>
          </div>

          <div className="divide-y divide-stone-100">
            {faqs.map((faq, idx) => {
              const isOpen = expandedFaq === idx;
              return (
                <div key={idx} className="py-4 first:pt-0 last:pb-0">
                  <button
                    onClick={() => toggleFaq(idx)}
                    className="w-full flex items-center justify-between text-left gap-4 font-semibold text-xs sm:text-sm text-[#171A17] hover:text-[#386B40] transition-colors"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      size={16}
                      className={`text-stone-400 shrink-0 transition-transform duration-200 ${
                        isOpen ? "rotate-180 text-[#386B40]" : ""
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="mt-2.5 text-xs text-stone-600 leading-relaxed pl-1 animate-in fade-in duration-150">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ReferralPage;

