import React, { useState } from "react";
import { Save, FileText, Check, Plus, Trash2 } from "lucide-react";
import { AdminCard } from "../../components/admin/common/AdminCard";

export const ContentPagesPage = () => {
  const [activeTab, setActiveTab] = useState("about");
  const [toastMessage, setToastMessage] = useState("");

  const [pagesData, setPagesData] = useState(() => {
    const saved = localStorage.getItem("divyam_site_content_pages");
    return saved
      ? JSON.parse(saved)
      : {
          about: {
            title: "About Divyam Ayurveda",
            headline: "Preserving 5,000 Years of Ayurvedic Wisdom with Modern Scientific Purity",
            body: "At Divyam Ayurveda, we believe nature holds the ultimate blueprint for vitality. Each formula is crafted using classical Ayurvedic methodology, organically wildcrafted herbs, and certified manufacturing to bring holistic healing into modern lives.",
            mission: "To restore natural balance and authentic vitality to every household through pure, ethical, and potent Ayurvedic remedies.",
          },
          shipping: {
            title: "Shipping & Delivery Policy",
            turnaround: "Orders are processed within 24-48 business hours. Standard pan-India delivery takes 3 to 5 business days via BlueDart and Delhivery.",
            freeThreshold: "Orders above ₹499 qualify for free shipping. Orders below ₹499 incur a flat nominal shipping fee of ₹50.",
          },
          returns: {
            title: "14-Day Botanical Guarantee & Returns Policy",
            policy: "If you receive a damaged product or experience adverse sensitivity, you may request a replacement or full refund within 14 days of delivery.",
          },
          faqs: [
            {
              q: "Are Divyam Ayurveda products 100% natural and vegetarian?",
              a: "Yes. All our herbal powders, oils, and capsules are 100% vegetarian, free from synthetic preservatives, and non-GMO.",
            },
            {
              q: "How do I know which Ayurvedic remedy suits my Dosha?",
              a: "You can check our Dosha Guide under the Ayurveda section or consult our certified in-house Ayurvedic physicians for tailored advice.",
            },
          ],
        };
  });

  const [newFaqQ, setNewFaqQ] = useState("");
  const [newFaqA, setNewFaqA] = useState("");

  const handleSave = (e) => {
    e.preventDefault();
    localStorage.setItem("divyam_site_content_pages", JSON.stringify(pagesData));
    setToastMessage("Page content updated successfully!");
    setTimeout(() => setToastMessage(""), 3000);
  };

  const handleAddFaq = () => {
    if (newFaqQ.trim() && newFaqA.trim()) {
      setPagesData((prev) => ({
        ...prev,
        faqs: [...prev.faqs, { q: newFaqQ.trim(), a: newFaqA.trim() }],
      }));
      setNewFaqQ("");
      setNewFaqA("");
    }
  };

  const handleRemoveFaq = (idx) => {
    setPagesData((prev) => ({
      ...prev,
      faqs: prev.faqs.filter((_, i) => i !== idx),
    }));
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 font-sans tracking-tight">
            Content Pages & Policy Editor
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Manage public brand story, FAQ items, and regulatory policy documentation.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#173D2A] text-white hover:bg-[#0B2416] text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto"
        >
          <Save className="w-4 h-4" />
          <span>Save Changes</span>
        </button>
      </div>

      {toastMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
          <Check className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap items-center gap-1 border-b border-stone-200 pb-3">
        {[
          { id: "about", label: "About Us & Story" },
          { id: "shipping", label: "Shipping Policy" },
          { id: "returns", label: "Returns Policy" },
          { id: "faqs", label: "FAQs Management" },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition-colors ${
              activeTab === tab.id
                ? "bg-[#173D2A] text-white"
                : "text-stone-600 hover:bg-stone-200/60"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      {activeTab === "about" && (
        <AdminCard title="About Us & Brand Heritage" subtitle="Displayed on /about and /our-story">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Headline
              </label>
              <input
                type="text"
                value={pagesData.about.headline}
                onChange={(e) =>
                  setPagesData({
                    ...pagesData,
                    about: { ...pagesData.about, headline: e.target.value },
                  })
                }
                className="w-full px-3 py-2 text-sm rounded-xl border border-stone-300 bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Brand Overview Body
              </label>
              <textarea
                rows={4}
                value={pagesData.about.body}
                onChange={(e) =>
                  setPagesData({
                    ...pagesData,
                    about: { ...pagesData.about, body: e.target.value },
                  })
                }
                className="w-full px-3 py-2 text-sm rounded-xl border border-stone-300 bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Mission Statement
              </label>
              <input
                type="text"
                value={pagesData.about.mission}
                onChange={(e) =>
                  setPagesData({
                    ...pagesData,
                    about: { ...pagesData.about, mission: e.target.value },
                  })
                }
                className="w-full px-3 py-2 text-sm rounded-xl border border-stone-300 bg-white"
              />
            </div>
          </div>
        </AdminCard>
      )}

      {activeTab === "shipping" && (
        <AdminCard title="Shipping & Dispatch Policy" subtitle="Displayed on /shipping">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Processing & Dispatch Turnaround
              </label>
              <textarea
                rows={3}
                value={pagesData.shipping.turnaround}
                onChange={(e) =>
                  setPagesData({
                    ...pagesData,
                    shipping: { ...pagesData.shipping, turnaround: e.target.value },
                  })
                }
                className="w-full px-3 py-2 text-sm rounded-xl border border-stone-300 bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Free Shipping Threshold & Standard Rates
              </label>
              <textarea
                rows={3}
                value={pagesData.shipping.freeThreshold}
                onChange={(e) =>
                  setPagesData({
                    ...pagesData,
                    shipping: {
                      ...pagesData.shipping,
                      freeThreshold: e.target.value,
                    },
                  })
                }
                className="w-full px-3 py-2 text-sm rounded-xl border border-stone-300 bg-white"
              />
            </div>
          </div>
        </AdminCard>
      )}

      {activeTab === "returns" && (
        <AdminCard title="Returns, Replacements & Guarantee" subtitle="Displayed on /returns">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                14-Day Guarantee Terms
              </label>
              <textarea
                rows={4}
                value={pagesData.returns.policy}
                onChange={(e) =>
                  setPagesData({
                    ...pagesData,
                    returns: { ...pagesData.returns, policy: e.target.value },
                  })
                }
                className="w-full px-3 py-2 text-sm rounded-xl border border-stone-300 bg-white"
              />
            </div>
          </div>
        </AdminCard>
      )}

      {activeTab === "faqs" && (
        <AdminCard title="Frequently Asked Questions (FAQ)" subtitle="Displayed on /faq">
          <div className="space-y-4">
            <div className="space-y-3">
              {pagesData.faqs.map((faq, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl border border-stone-200 bg-stone-50/60 flex items-start justify-between gap-3 text-xs"
                >
                  <div className="space-y-1">
                    <div className="font-semibold text-stone-900">
                      Q: {faq.q}
                    </div>
                    <div className="text-stone-600 leading-relaxed">
                      A: {faq.a}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveFaq(idx)}
                    className="p-1 text-stone-400 hover:text-rose-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-stone-100 space-y-3">
              <h4 className="text-xs font-semibold text-stone-800">
                Add New FAQ Item
              </h4>
              <input
                type="text"
                placeholder="Question (e.g. Can pregnant women consume Ashwagandha?)"
                value={newFaqQ}
                onChange={(e) => setNewFaqQ(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 bg-white"
              />
              <textarea
                rows={2}
                placeholder="Official Ayurvedic doctor answer..."
                value={newFaqA}
                onChange={(e) => setNewFaqA(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 bg-white"
              />
              <button
                type="button"
                onClick={handleAddFaq}
                className="px-3.5 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg text-xs font-semibold"
              >
                + Add FAQ
              </button>
            </div>
          </div>
        </AdminCard>
      )}
    </div>
  );
};

