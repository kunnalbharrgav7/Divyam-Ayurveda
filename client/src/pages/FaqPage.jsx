import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Search, ChevronDown, HelpCircle, MessageSquare } from "lucide-react";
import { Breadcrumbs } from "../components/common/Breadcrumbs";
import { faqs, faqCategories } from "../data/faqs";

export const FaqPage = () => {
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [openFaqId, setOpenFaqId] = useState("faq-01");

  const filteredFaqs = faqs.filter((item) => {
    const matchesCat =
      selectedCategory === "all" || item.category === selectedCategory;
    const matchesSearch =
      searchQuery.trim() === "" ||
      item.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const toggleFaq = (id) => {
    setOpenFaqId((prev) => (prev === id ? null : id));
  };

  return (
    <div className="bg-[#FBFAF6] min-h-screen py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <Breadcrumbs items={[{ label: "Frequently Asked Questions" }]} />

        {/* Heading & Search */}
        <div className="text-center max-w-2xl mx-auto py-8 space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-[#173D2A]/10 text-[#173D2A] flex items-center justify-center mx-auto mb-2">
            <HelpCircle size={24} />
          </div>
          <h1 className="font-serif text-3xl sm:text-5xl font-bold text-[#171A17]">
            Frequently Asked Questions
          </h1>
          <p className="text-xs sm:text-sm text-[#666B64] leading-relaxed">
            Find answers to common questions about our botanical sourcing, classical preparations, dispatch, and returns.
          </p>

          <div className="pt-4 max-w-md mx-auto">
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search queries (e.g. shipping, testing, doshas)..."
                className="w-full pl-10 pr-4 py-3 bg-white border border-[#E5E7DF] rounded-2xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#386B40] shadow-xs"
              />
              <Search size={16} className="absolute left-3.5 top-3.5 text-stone-400" />
            </div>
          </div>
        </div>

        {/* Category Pills */}
        <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
          {faqCategories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`px-4 py-2 rounded-xl text-xs font-semibold transition-all ${
                selectedCategory === cat.id
                  ? "bg-[#173D2A] text-white shadow-xs"
                  : "bg-white text-stone-700 border border-[#E5E7DF] hover:bg-stone-50"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Accordion List */}
        <div className="bg-white rounded-3xl border border-[#E5E7DF] divide-y divide-[#E5E7DF] overflow-hidden shadow-xs mb-12">
          {filteredFaqs.length === 0 ? (
            <div className="p-8 text-center text-xs text-stone-500">
              No matching questions found. Try a different search keyword or contact our support team.
            </div>
          ) : (
            filteredFaqs.map((faq) => {
              const isOpen = openFaqId === faq.id;
              return (
                <div key={faq.id} className="p-5 sm:p-6 transition-colors">
                  <button
                    onClick={() => toggleFaq(faq.id)}
                    className="w-full flex items-center justify-between text-left gap-4 focus:outline-none"
                  >
                    <span className="font-serif font-bold text-base sm:text-lg text-[#171A17] hover:text-[#173D2A] transition-colors">
                      {faq.question}
                    </span>
                    <div
                      className={`w-7 h-7 rounded-full bg-stone-100 flex items-center justify-center shrink-0 transition-transform duration-200 ${
                        isOpen ? "rotate-180 bg-[#173D2A] text-white" : "text-stone-600"
                      }`}
                    >
                      <ChevronDown size={16} />
                    </div>
                  </button>

                  {isOpen && (
                    <div className="mt-3 pt-3 border-t border-stone-100 text-xs sm:text-sm text-[#666B64] leading-relaxed animate-in fade-in duration-200">
                      {faq.answer}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Contact Strip */}
        <div className="p-6 bg-[#FBFAF6] rounded-3xl border border-[#E5E7DF] flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#386B40] text-white flex items-center justify-center shrink-0">
              <MessageSquare size={20} />
            </div>
            <div>
              <h4 className="font-serif font-bold text-[#171A17] text-base">
                Still have questions?
              </h4>
              <p className="text-xs text-[#666B64]">
                Our Ayurvedic dispensary wellness team is available to assist you.
              </p>
            </div>
          </div>
          <Link
            to="/contact"
            className="px-5 py-2.5 bg-[#173D2A] hover:bg-[#0B2416] text-white text-xs font-semibold rounded-xl transition-colors shrink-0"
          >
            Contact Customer Care
          </Link>
        </div>
      </div>
    </div>
  );
};
