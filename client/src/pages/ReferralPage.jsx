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
    <div className="bg-[#FBFAF6] min-h-screen py-5 sm:py-8 overflow-x-clip">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 sm:space-y-8">
        {/* Breadcrumb Navigation */}
        <Breadcrumbs
          items={[
            { label: "Home", href: "/" },
            { label: "Refer & Earn Rewards" },
          ]}
        />

        {/* Page Hero Header */}
        <section className="relative rounded-3xl bg-gradient-to-r from-[#173D2A] via-[#1E4A34] to-[#0B2416] text-white p-5 sm:p-10 lg:p-12 overflow-hidden shadow-sm">
          {/* Subtle Ayurvedic glow accents */}
          <div className="absolute top-0 right-0 w-72 sm:w-96 h-72 sm:h-96 bg-[#A9D18E]/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 w-64 h-64 bg-emerald-500/10 rounded-full blur-2xl pointer-events-none" />

          <div className="relative z-10 grid lg:grid-cols-[minmax(0,1fr)_auto] gap-6 lg:gap-12 items-center">
            <div className="space-y-3 sm:space-y-4 min-w-0">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 text-[#A9D18E] text-[11px] sm:text-xs font-bold uppercase tracking-wider border border-white/10 backdrop-blur-xs">
                <Gift size={14} />
                <span>Ayurvedic Wellness Circle</span>
              </div>

              <h1 className="font-heading tracking-tight text-[1.75rem] sm:text-4xl lg:text-5xl font-bold text-white leading-[1.15]">
                Share Natural Healing. <br className="hidden sm:inline" />
                <span className="text-[#A9D18E]">
                  Give {describeFriendOffer(settings)}, Earn {describeReward(settings)}.
                </span>
              </h1>

              <p className="text-sm sm:text-base text-stone-200 leading-relaxed max-w-2xl">
                Introduce your friends and family to authentic, single-origin herbs, Shilajit, and classical churnas.
                They receive an immediate welcome discount of {describeFriendOffer(settings)}, and you receive {describeReward(settings)} in wellness rewards on their first qualifying order.
              </p>

              {!isAuthenticated && (
                <div className="pt-1 flex flex-wrap items-center gap-3">
                  <Link
                    to="/login?redirect=/referrals"
                    className="px-5 py-3 bg-[#A9D18E] hover:bg-[#8FBE72] text-[#0B2416] text-xs sm:text-sm font-bold rounded-xl shadow-xs transition-all duration-200 flex items-center gap-2 w-full sm:w-auto justify-center"
                  >
                    <span>Sign In for Personal Code</span>
                    <ArrowRight size={14} />
                  </Link>
                </div>
              )}
            </div>

            {/* At-a-glance offer */}
            <div className="grid grid-cols-2 lg:grid-cols-1 gap-3 lg:w-60">
              <div className="rounded-2xl bg-white/10 border border-white/15 backdrop-blur-xs p-3.5 sm:p-4">
                <span className="text-[10px] sm:text-[11px] uppercase tracking-wider text-stone-300">Your friend gets</span>
                <p className="text-xl sm:text-2xl font-bold text-white mt-0.5">{describeFriendOffer(settings)}</p>
                <p className="text-[11px] text-stone-300 mt-0.5">on their first order</p>
              </div>
              <div className="rounded-2xl bg-[#A9D18E]/15 border border-[#A9D18E]/30 backdrop-blur-xs p-3.5 sm:p-4">
                <span className="text-[10px] sm:text-[11px] uppercase tracking-wider text-[#A9D18E]">You earn</span>
                <p className="text-xl sm:text-2xl font-bold text-[#A9D18E] mt-0.5">{describeReward(settings)}</p>
                <p className="text-[11px] text-stone-300 mt-0.5">as store credit</p>
              </div>
            </div>
          </div>
        </section>

        {/* 1-Click Link & Share Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-8 items-start">
          <div className="lg:col-span-7 min-w-0 space-y-5 sm:space-y-6">
            <ReferralLinkCard />
            <ReferralShareActions />
          </div>

          <div className="lg:col-span-5 min-w-0 lg:sticky lg:top-24">
            <ReferralHowItWorks />
          </div>
        </div>

        {/* Real-time Statistics Cards */}
        <section className="space-y-4">
          <div>
            <h2 className="font-heading tracking-tight text-xl sm:text-2xl font-bold text-[#171A17]">
              Your Referral Performance
            </h2>
            <p className="text-xs sm:text-sm text-[#666B64] mt-0.5">
              Real-time tracking of links shared, invited friends, orders placed, and rewards earned.
            </p>
          </div>
          <ReferralStats showTitle={false} />
        </section>

        {/* Referral Activity History */}
        <section>
          <ReferralHistory />
        </section>

        {/* Frequently Asked Questions */}
        <section className="bg-white rounded-3xl border border-[#E5E7DF] p-4 sm:p-8 shadow-xs space-y-4 sm:space-y-6">
          <div className="flex items-start sm:items-center gap-3 pb-3 border-b border-[#E5E7DF]">
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-800 flex items-center justify-center shrink-0">
              <HelpCircle size={20} />
            </div>
            <div className="min-w-0">
              <h3 className="font-heading tracking-tight text-lg sm:text-xl font-bold text-[#171A17]">
                Referral Program FAQs &amp; Guidelines
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
                <div key={idx} className="py-1">
                  <button
                    type="button"
                    onClick={() => toggleFaq(idx)}
                    aria-expanded={isOpen}
                    className="w-full min-h-12 py-2.5 flex items-center justify-between text-left gap-4 font-semibold text-[13px] sm:text-sm text-[#171A17] hover:text-[#386B40] transition-colors cursor-pointer"
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
                    <div className="pb-3 text-xs sm:text-sm text-stone-600 leading-relaxed pr-6 animate-in fade-in duration-150">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
};

export default ReferralPage;

