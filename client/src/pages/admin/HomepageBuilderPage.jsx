import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  Save,
  Globe,
  Eye,
  Sliders,
  Sparkles,
  Layers,
  Check,
  ExternalLink,
  Plus,
  Trash2,
} from "lucide-react";
import { useAdmin } from "../../context/AdminContext";
import { AdminCard } from "../../components/admin/common/AdminCard";
import { AdminImageUpload } from "../../components/admin/common/AdminImageUpload";

export const HomepageBuilderPage = () => {
  const { homepageContent, saveHomepageContent } = useAdmin();
  const [content, setContent] = useState(homepageContent);
  const [toastMessage, setToastMessage] = useState("");

  const handleHeroChange = (index, field, value) => {
    const updatedSlides = [...(content.heroSlides || [])];
    updatedSlides[index] = { ...updatedSlides[index], [field]: value };
    setContent((prev) => ({ ...prev, heroSlides: updatedSlides }));
  };

  const handleToggleSection = (sectionKey) => {
    setContent((prev) => ({
      ...prev,
      sections: {
        ...prev.sections,
        [sectionKey]: !prev.sections[sectionKey],
      },
    }));
  };

  const handleSave = (e) => {
    e.preventDefault();
    saveHomepageContent(content);
    setToastMessage("Homepage settings updated successfully! Live store updated.");
    setTimeout(() => setToastMessage(""), 3000);
  };

  return (
    <form onSubmit={handleSave} className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 font-sans tracking-tight">
            Homepage & Storefront Builder
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Customize hero banners, promo announcements, and toggle customer homepage sections.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 text-xs font-semibold shadow-xs transition-colors"
          >
            <span>Preview Storefront</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>

          <button
            type="submit"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#173D2A] text-white hover:bg-[#0B2416] text-xs font-semibold shadow-xs transition-colors"
          >
            <Save className="w-4 h-4" />
            <span>Save & Publish Live</span>
          </button>
        </div>
      </div>

      {toastMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
          <Check className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Grid: Left Column & Right Column */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Hero & Promo Banners */}
        <div className="lg:col-span-2 space-y-6">
          {/* Top Announcement Bar */}
          <AdminCard
            title="1. Top Announcement Header Bar"
            subtitle="Promotional strip rendered at the very top of all store pages"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-stone-100">
                <span className="text-xs font-semibold text-stone-800">
                  Enable Announcement Strip
                </span>
                <input
                  type="checkbox"
                  checked={content.announcementBar?.enabled ?? true}
                  onChange={(e) =>
                    setContent({
                      ...content,
                      announcementBar: {
                        ...content.announcementBar,
                        enabled: e.target.checked,
                      },
                    })
                  }
                  className="w-4 h-4 rounded border-stone-300 text-[#173D2A] focus:ring-[#173D2A]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Announcement Message
                </label>
                <input
                  type="text"
                  value={content.announcementBar?.text || ""}
                  onChange={(e) =>
                    setContent({
                      ...content,
                      announcementBar: {
                        ...content.announcementBar,
                        text: e.target.value,
                      },
                    })
                  }
                  placeholder="e.g. Free Ayurvedic Shipping on orders above ₹499 | Use Code: DIVYAM15"
                  className="w-full px-3.5 py-2 text-xs sm:text-sm rounded-xl border border-stone-300 bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Action Link Text
                  </label>
                  <input
                    type="text"
                    value={content.announcementBar?.linkText || "Shop Now"}
                    onChange={(e) =>
                      setContent({
                        ...content,
                        announcementBar: {
                          ...content.announcementBar,
                          linkText: e.target.value,
                        },
                      })
                    }
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-stone-300 bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Link Destination URL
                  </label>
                  <input
                    type="text"
                    value={content.announcementBar?.linkUrl || "/products"}
                    onChange={(e) =>
                      setContent({
                        ...content,
                        announcementBar: {
                          ...content.announcementBar,
                          linkUrl: e.target.value,
                        },
                      })
                    }
                    className="w-full px-3 py-1.5 text-xs rounded-xl border border-stone-300 bg-white font-mono"
                  />
                </div>
              </div>
            </div>
          </AdminCard>

          {/* Hero Banner Slides */}
          <AdminCard
            title="2. Main Hero Banner Slides"
            subtitle="Hero carousel headline, call to action, and botanical hero imagery"
          >
            <div className="space-y-6">
              {(content.heroSlides || []).map((slide, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl border border-stone-200 bg-stone-50/60 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-xs text-[#173D2A] uppercase tracking-wider">
                      Slide #{idx + 1}
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Main Headline
                    </label>
                    <input
                      type="text"
                      value={slide.title || ""}
                      onChange={(e) => handleHeroChange(idx, "title", e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-xl border border-stone-300 bg-white font-sans"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-stone-700 mb-1">
                      Subheadline / Supporting Description
                    </label>
                    <textarea
                      rows={2}
                      value={slide.subtitle || ""}
                      onChange={(e) => handleHeroChange(idx, "subtitle", e.target.value)}
                      className="w-full px-3 py-1.5 text-xs rounded-xl border border-stone-300 bg-white"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">
                        CTA Button Text
                      </label>
                      <input
                        type="text"
                        value={slide.ctaText || "Explore Remedies"}
                        onChange={(e) => handleHeroChange(idx, "ctaText", e.target.value)}
                        className="w-full px-3 py-1.5 text-xs rounded-xl border border-stone-300 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-stone-700 mb-1">
                        CTA Target URL
                      </label>
                      <input
                        type="text"
                        value={slide.ctaLink || "/products"}
                        onChange={(e) => handleHeroChange(idx, "ctaLink", e.target.value)}
                        className="w-full px-3 py-1.5 text-xs rounded-xl border border-stone-300 bg-white font-mono"
                      />
                    </div>
                  </div>

                  <AdminImageUpload
                    label="Hero Slide Banner Image"
                    value={slide.image || ""}
                    onChange={(img) => handleHeroChange(idx, "image", img)}
                    compact={true}
                    helperText="Upload full-width hero banner artwork"
                  />
                </div>
              ))}
            </div>
          </AdminCard>
        </div>

        {/* Right 1 Col: Section Visibility Toggles */}
        <div className="space-y-6">
          <AdminCard
            title="3. Homepage Section Visibility"
            subtitle="Enable or disable customer storefront sections"
          >
            <div className="space-y-3">
              {[
                { key: "hero", label: "Hero Banner Carousel" },
                { key: "categories", label: "Shop by Category Shortcuts" },
                { key: "bestsellers", label: "Bestselling Products Section" },
                { key: "trending", label: "Trending Formulations" },
                { key: "newArrivals", label: "New Botanical Arrivals" },
                { key: "collections", label: "Featured Collections" },
                { key: "promoBanners", label: "Promotional Banner Ads" },
                { key: "whyChooseUs", label: "Why Choose Divyam (Benefits)" },
                { key: "testimonials", label: "Customer Testimonials" },
                { key: "ayurvedaEducation", label: "Ayurvedic Blog Highlights" },
                { key: "newsletter", label: "Newsletter Subscription Box" },
              ].map((sec) => {
                const isEnabled = content.sections?.[sec.key] ?? true;
                return (
                  <label
                    key={sec.key}
                    className="flex items-center justify-between p-2.5 rounded-xl hover:bg-stone-50 cursor-pointer border border-stone-100 transition-colors"
                  >
                    <span className="text-xs font-medium text-stone-800">
                      {sec.label}
                    </span>
                    <input
                      type="checkbox"
                      checked={isEnabled}
                      onChange={() => handleToggleSection(sec.key)}
                      className="w-4 h-4 rounded border-stone-300 text-[#173D2A] focus:ring-[#173D2A]"
                    />
                  </label>
                );
              })}
            </div>

            <div className="mt-5 p-3 rounded-xl bg-emerald-50/80 border border-emerald-200/80 text-xs text-emerald-900">
              <span className="font-semibold block mb-0.5">Instant Storefront Update</span>
              Changes saved here instantly update the public customer view without needing code recompilation.
            </div>
          </AdminCard>
        </div>
      </div>
    </form>
  );
};

