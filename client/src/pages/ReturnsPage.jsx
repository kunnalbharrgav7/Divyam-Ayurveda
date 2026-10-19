import React from "react";
import { RotateCcw, AlertCircle, ShieldCheck } from "lucide-react";
import { Breadcrumbs } from "../components/common/Breadcrumbs";

export const ReturnsPage = () => {
  return (
    <div className="bg-[#FBFAF6] min-h-screen py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <Breadcrumbs items={[{ label: "Returns & Refund Policy" }]} />

        <div className="bg-white rounded-3xl border border-[#E5E7DF] p-6 sm:p-12 shadow-xs mt-4 space-y-8">
          <div className="space-y-2 border-b border-[#E5E7DF] pb-6">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#386B40] flex items-center gap-1.5">
              <RotateCcw size={14} /> Customer Assurance
            </span>
            <h1 className="font-heading tracking-tight text-3xl sm:text-4xl font-bold text-[#171A17]">
              Returns, Exchanges &amp; Refunds
            </h1>
            <p className="text-xs text-stone-500">Last updated: January 2026</p>
          </div>

          <div className="space-y-6 text-xs sm:text-sm text-[#171A17] leading-relaxed">
            <section className="space-y-2">
              <h3 className="font-heading tracking-tight text-lg font-bold text-[#173D2A]">
                1. 7-Day Return Window
              </h3>
              <p className="text-[#666B64]">
                Because our formulations contain active botanicals and edible extracts, opened or used products cannot be returned for a change of mind. You can return a delivered order within <strong>7 days</strong> of delivery if it arrived damaged, with a broken seal, wrong or missing items, near expiry, not as described, or if you had a reaction to it. Unopened products ordered by mistake can also be returned. Returns are for the <strong>whole order</strong>, not individual items.
              </p>
            </section>

            <section className="space-y-2">
              <h3 className="font-heading tracking-tight text-lg font-bold text-[#173D2A]">
                2. How to Request a Return
              </h3>
              <p className="text-[#666B64]">
                Sign in, open <strong>My Account &rarr; My Orders</strong> and press <strong>Return / Refund</strong> on the delivered order. Choose a reason, add photos where asked, and tell us how you want your refund. You can follow every step under <strong>My Account &rarr; Returns &amp; Refunds</strong>. We review requests within 24 hours.
              </p>
            </section>

            <section className="space-y-2">
              <h3 className="font-heading tracking-tight text-lg font-bold text-[#173D2A]">
                3. Refund Processing
              </h3>
              <p className="text-[#666B64]">
                After the returned parcel is received and checked, orders paid online are refunded to the original payment method (UPI / Card / NetBanking), usually within 3 to 7 business days. For Cash on Delivery orders you choose between a bank transfer, UPI, or instant store credit that you can use on your next order.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

