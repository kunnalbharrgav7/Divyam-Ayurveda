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
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#171A17]">
              Returns, Exchanges &amp; Refunds
            </h1>
            <p className="text-xs text-stone-500">Last updated: January 2026</p>
          </div>

          <div className="space-y-6 text-xs sm:text-sm text-[#171A17] leading-relaxed">
            <section className="space-y-2">
              <h3 className="font-serif text-lg font-bold text-[#173D2A]">
                1. 7-Day Window for Damaged or Incorrect Dispatches
              </h3>
              <p className="text-[#666B64]">
                Because our formulations contain active living botanicals, churnas, and edible extracts, we do not accept returns for opened or unsealed bottles due to health hygiene regulations. However, if your order arrived damaged in transit, with broken seals, or missing items, you may initiate a return within <strong>7 days</strong> of delivery.
              </p>
            </section>

            <section className="space-y-2">
              <h3 className="font-serif text-lg font-bold text-[#173D2A]">
                2. How to Initiate a Return Request
              </h3>
              <p className="text-[#666B64]">
                Email our care team at <strong>care@divyamayurveda.com</strong> with your Order ID (DA-XXXXXX), photos of the damaged container or outer carton, and description of the defect. Our support team will confirm pickup within 24 hours.
              </p>
            </section>

            <section className="space-y-2">
              <h3 className="font-serif text-lg font-bold text-[#173D2A]">
                3. Refund Processing
              </h3>
              <p className="text-[#666B64]">
                Once returned items are inspected at our warehouse, approved refunds are transferred back to the original payment source (UPI / Card / NetBanking) within 5 to 7 business days. For COD orders, a direct NEFT transfer or store credit voucher is provided.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

