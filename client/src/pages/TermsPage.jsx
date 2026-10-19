import React from "react";
import { Scale, FileText } from "lucide-react";
import { Breadcrumbs } from "../components/common/Breadcrumbs";

export const TermsPage = () => {
  return (
    <div className="bg-[#FBFAF6] min-h-screen py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <Breadcrumbs items={[{ label: "Terms & Conditions" }]} />

        <div className="bg-white rounded-3xl border border-[#E5E7DF] p-6 sm:p-12 shadow-xs mt-4 space-y-8">
          <div className="space-y-2 border-b border-[#E5E7DF] pb-6">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#386B40] flex items-center gap-1.5">
              <Scale size={14} /> Legal Terms of Service
            </span>
            <h1 className="font-heading tracking-tight text-3xl sm:text-4xl font-bold text-[#171A17]">
              Terms &amp; Conditions
            </h1>
            <p className="text-xs text-stone-500">Last updated: January 2026</p>
          </div>

          <div className="space-y-6 text-xs sm:text-sm text-[#171A17] leading-relaxed">
            <section className="space-y-2">
              <h3 className="font-heading tracking-tight text-lg font-bold text-[#173D2A]">
                1. Acceptance of Terms
              </h3>
              <p className="text-[#666B64]">
                By browsing, accessing, or placing orders through the Divyam Ayurveda website, you agree to comply with and be bound by these Terms and Conditions and our Privacy Policy.
              </p>
            </section>

            <section className="space-y-2">
              <h3 className="font-heading tracking-tight text-lg font-bold text-[#173D2A]">
                2. Ayurvedic Wellness Disclaimer
              </h3>
              <p className="text-[#666B64]">
                The herbal products, classical churnas, and dietary formulations displayed on this website are based on traditional Ayurvedic texts and intended to support general well-being. Content provided on this website is for educational purposes and is not a substitute for professional clinical medical advice, diagnosis, or treatment.
              </p>
            </section>

            <section className="space-y-2">
              <h3 className="font-heading tracking-tight text-lg font-bold text-[#173D2A]">
                3. Pricing &amp; Formulation Availability
              </h3>
              <p className="text-[#666B64]">
                All prices are declared in Indian Rupees (INR) and are inclusive of GST. We reserve the right to revise product specifications, pack sizes, and prices based on seasonal botanical harvest yields without prior notice.
              </p>
            </section>

            <section className="space-y-2">
              <h3 className="font-heading tracking-tight text-lg font-bold text-[#173D2A]">
                4. Intellectual Property
              </h3>
              <p className="text-[#666B64]">
                All trademarks, trade dress, product nomenclature, classical formulation write-ups, and imagery displayed on Divyam Ayurveda are the intellectual property of Divyam Ayurveda.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

