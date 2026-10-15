import React from "react";
import { ShieldCheck, Lock } from "lucide-react";
import { Breadcrumbs } from "../components/common/Breadcrumbs";

export const PrivacyPage = () => {
  return (
    <div className="bg-[#FBFAF6] min-h-screen py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <Breadcrumbs items={[{ label: "Privacy Policy" }]} />

        <div className="bg-white rounded-3xl border border-[#E5E7DF] p-6 sm:p-12 shadow-xs mt-4 space-y-8">
          <div className="space-y-2 border-b border-[#E5E7DF] pb-6">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#386B40] flex items-center gap-1.5">
              <Lock size={14} /> Data Protection &amp; Integrity
            </span>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#171A17]">
              Privacy Policy
            </h1>
            <p className="text-xs text-stone-500">Effective Date: January 1, 2026</p>
          </div>

          <div className="space-y-6 text-xs sm:text-sm text-[#171A17] leading-relaxed">
            <section className="space-y-2">
              <h3 className="font-serif text-lg font-bold text-[#173D2A]">
                1. Information We Collect
              </h3>
              <p className="text-[#666B64]">
                Divyam Ayurveda collects essential customer contact details (name, email address, delivery street address, phone number) exclusively for order delivery, SMS shipment alerts, and opt-in Ayurvedic newsletter updates.
              </p>
            </section>

            <section className="space-y-2">
              <h3 className="font-serif text-lg font-bold text-[#173D2A]">
                2. Payment Security
              </h3>
              <p className="text-[#666B64]">
                We do not store complete credit card numbers, CVVs, or NetBanking credentials on our servers. All digital transactions are processed through encrypted, RBI-compliant payment gateway partners.
              </p>
            </section>

            <section className="space-y-2">
              <h3 className="font-serif text-lg font-bold text-[#173D2A]">
                3. Zero Third-Party Data Selling
              </h3>
              <p className="text-[#666B64]">
                We never sell, rent, or trade your personal wellness information or browsing history to third-party ad networks or brokers.
              </p>
            </section>

            <section className="space-y-2">
              <h3 className="font-serif text-lg font-bold text-[#173D2A]">
                4. Cookies &amp; Local Persistence
              </h3>
              <p className="text-[#666B64]">
                We use secure local storage and essential session cookies strictly to preserve your cart contents, wishlist preferences, and account session states across browsing sessions.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

