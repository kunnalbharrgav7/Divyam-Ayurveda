import React from "react";
import { Truck, Clock, ShieldCheck, MapPin } from "lucide-react";
import { Breadcrumbs } from "../components/common/Breadcrumbs";

export const ShippingPage = () => {
  return (
    <div className="bg-[#FBFAF6] min-h-screen py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <Breadcrumbs items={[{ label: "Shipping & Delivery Policy" }]} />

        <div className="bg-white rounded-3xl border border-[#E5E7DF] p-6 sm:p-12 shadow-xs mt-4 space-y-8">
          <div className="space-y-2 border-b border-[#E5E7DF] pb-6">
            <span className="text-xs font-semibold uppercase tracking-wider text-[#386B40] flex items-center gap-1.5">
              <Truck size={14} /> Logistics &amp; Dispensary Dispatch
            </span>
            <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#171A17]">
              Shipping &amp; Delivery Policy
            </h1>
            <p className="text-xs text-stone-500">Last updated: January 2026</p>
          </div>

          <div className="space-y-6 text-xs sm:text-sm text-[#171A17] leading-relaxed">
            <section className="space-y-2">
              <h3 className="font-serif text-lg font-bold text-[#173D2A]">
                1. Order Processing Timelines
              </h3>
              <p className="text-[#666B64]">
                All Divyam Ayurveda formulations are fresh-pulverized and batch-checked prior to packing. Orders placed before 1:00 PM IST on business days are dispatched within 24 to 48 hours from our central Ayurvedic dispensary.
              </p>
            </section>

            <section className="space-y-2">
              <h3 className="font-serif text-lg font-bold text-[#173D2A]">
                2. Shipping Rates &amp; Free Delivery
              </h3>
              <p className="text-[#666B64]">
                - <strong>Free Shipping:</strong> Automatically applied to all prepaid and COD orders exceeding <strong>₹499</strong> across serviceable pin codes in India.
                <br />
                - <strong>Standard Shipping Fee:</strong> A nominal charge of <strong>₹49</strong> is applied to orders below ₹499 to cover temperature-neutral protective packaging.
              </p>
            </section>

            <section className="space-y-2">
              <h3 className="font-serif text-lg font-bold text-[#173D2A]">
                3. Estimated Delivery Duration
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                <div className="p-4 rounded-2xl bg-[#FBFAF6] border border-[#E5E7DF]">
                  <h4 className="font-bold text-[#171A17]">Metro Cities</h4>
                  <p className="text-xs text-[#666B64] mt-1">
                    Bengaluru, Mumbai, Delhi NCR, Chennai, Hyderabad, Kolkata: <strong>2 to 4 business days</strong>.
                  </p>
                </div>
                <div className="p-4 rounded-2xl bg-[#FBFAF6] border border-[#E5E7DF]">
                  <h4 className="font-bold text-[#171A17]">Rest of India</h4>
                  <p className="text-xs text-[#666B64] mt-1">
                    Tier-2, Tier-3 cities and regional townships: <strong>4 to 7 business days</strong>.
                  </p>
                </div>
              </div>
            </section>

            <section className="space-y-2">
              <h3 className="font-serif text-lg font-bold text-[#173D2A]">
                4. Cash on Delivery (COD) Rules
              </h3>
              <p className="text-[#666B64]">
                Cash on delivery is available for orders up to ₹5,000. Please ensure someone is present at the delivery address with exact cash or mobile UPI payment enabled.
              </p>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
};

