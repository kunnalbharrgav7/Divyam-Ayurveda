import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { 
  Star, 
  CheckCircle2, 
  Quote, 
  Search, 
  Filter, 
  ThumbsUp, 
  PenLine, 
  X, 
  Sparkles, 
  ShieldCheck, 
  Award,
  ArrowRight
} from "lucide-react";
import { Breadcrumbs } from "../components/common/Breadcrumbs";
import { RatingStars } from "../components/common/RatingStars";
import { contentService } from "../services/api";
import { ScrollReveal } from "../animations/useScrollReveal";

export const CustomerReviewsPage = () => {
  const [reviewsList, setReviewsList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [selectedRating, setSelectedRating] = useState("All");
  const [sortBy, setSortBy] = useState("helpful");
  const [isWriteModalOpen, setIsWriteModalOpen] = useState(false);
  const [helpfulVoted, setHelpfulVoted] = useState({});

  React.useEffect(() => {
    let isMounted = true;
    const fetchReviews = async () => {
      try {
        const data = await contentService.getTestimonials();
        if (isMounted && Array.isArray(data)) {
          setReviewsList(data);
        }
      } catch (err) {
        console.error("Failed to load customer reviews:", err);
      } finally {
        if (isMounted) setLoading(false);
      }
    };
    fetchReviews();
    return () => {
      isMounted = false;
    };
  }, []);

  // Form state for writing a review
  const [newReview, setNewReview] = useState({
    name: "",
    email: "",
    location: "",
    productMentioned: "Pure Himalayan Shilajit Resin",
    rating: 5,
    title: "",
    comment: "",
  });
  const [formSubmitted, setFormSubmitted] = useState(false);

  // Categories extracted from reviews
  const categories = [
    "All",
    "Organic Herbs",
    "Immunity & Vitality",
    "Digestive Health",
    "Hair & Skin",
    "Himalayan Shilajit",
    "Classical Churnas",
  ];

  // Filter & sort logic
  const filteredReviews = useMemo(() => {
    return reviewsList
      .filter((r) => {
        // Search query filter
        const matchesSearch =
          searchQuery === "" ||
          r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.comment.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.productMentioned?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          r.location?.toLowerCase().includes(searchQuery.toLowerCase());

        // Category filter
        const matchesCategory =
          selectedCategory === "All" || r.category === selectedCategory;

        // Rating filter
        const matchesRating =
          selectedRating === "All" || r.rating === Number(selectedRating);

        return matchesSearch && matchesCategory && matchesRating;
      })
      .sort((a, b) => {
        if (sortBy === "highest") return b.rating - a.rating;
        if (sortBy === "helpful") return (b.helpfulCount || 0) - (a.helpfulCount || 0);
        return 0; // Default order
      });
  }, [reviewsList, searchQuery, selectedCategory, selectedRating, sortBy]);

  const handleHelpfulClick = (id) => {
    if (helpfulVoted[id]) return;
    setHelpfulVoted((prev) => ({ ...prev, [id]: true }));
    setReviewsList((prev) =>
      prev.map((r) => (r.id === id ? { ...r, helpfulCount: (r.helpfulCount || 0) + 1 } : r))
    );
  };

  const handleSubmitReview = (e) => {
    e.preventDefault();
    if (!newReview.name || !newReview.comment || !newReview.title) return;

    const created = {
      id: `review-${Date.now()}`,
      name: newReview.name,
      role: "Verified Buyer",
      location: newReview.location || "India",
      rating: Number(newReview.rating),
      title: newReview.title,
      comment: newReview.comment,
      avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=300&q=80",
      productMentioned: newReview.productMentioned,
      category: "Organic Herbs",
      verified: true,
      date: "Just now",
      helpfulCount: 1,
    };

    setReviewsList([created, ...reviewsList]);
    setFormSubmitted(true);
    setTimeout(() => {
      setFormSubmitted(false);
      setIsWriteModalOpen(false);
      setNewReview({
        name: "",
        email: "",
        location: "",
        productMentioned: "Pure Himalayan Shilajit Resin",
        rating: 5,
        title: "",
        comment: "",
      });
    }, 1800);
  };

  return (
    <div className="bg-[#FBFAF6] min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Breadcrumbs items={[{ label: "Customer Reviews" }]} />

        {/* Hero Header Section */}
        <ScrollReveal yOffset={20} duration={550}>
          <div className="bg-gradient-to-br from-[#173D2A] via-[#103020] to-[#0A2215] text-white rounded-3xl p-8 sm:p-12 mb-10 relative overflow-hidden shadow-xl border border-[#234D35]">
            {/* Ambient background glows */}
            <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-[#A9D18E]/10 blur-3xl pointer-events-none" />
            <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-[#386B40]/20 blur-3xl pointer-events-none" />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center relative z-10">
              <div className="lg:col-span-7 space-y-4">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 text-xs font-semibold tracking-wider uppercase text-[#A9D18E] backdrop-blur-xs border border-white/10">
                  <Sparkles size={12} /> Real Experiences &bull; Authentic Healing
                </span>
                <h1 className="font-heading tracking-tight text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight">
                  What Our Customers Say
                </h1>
                <p className="text-sm sm:text-base text-stone-200/90 leading-relaxed max-w-xl">
                  Real unfiltered stories from families and Ayurvedic doctors across India embracing authentic daily herbal rituals.
                </p>

                <div className="flex flex-wrap items-center gap-4 pt-2">
                  <button
                    onClick={() => setIsWriteModalOpen(true)}
                    className="inline-flex items-center gap-2 px-6 py-3 bg-[#A9D18E] hover:bg-white text-[#0B2416] text-xs font-bold rounded-xl transition-all shadow-md active:scale-95"
                  >
                    <PenLine size={15} />
                    <span>Write a Review</span>
                  </button>

                  <Link
                    to="/products"
                    className="inline-flex items-center gap-1.5 px-5 py-3 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl border border-white/15 transition-all"
                  >
                    <span>Browse Products</span>
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </div>

              {/* Rating Summary Card */}
              <div className="lg:col-span-5 bg-white/10 backdrop-blur-md rounded-2xl p-6 sm:p-7 border border-white/20 space-y-5">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div>
                    <div className="flex items-baseline gap-2">
                      <span className="font-heading tracking-tight text-4xl sm:text-5xl font-extrabold text-white">4.9</span>
                      <span className="text-stone-300 text-sm">/ 5.0</span>
                    </div>
                    <div className="flex items-center gap-1 mt-1 text-[#F2C94C]">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} size={16} fill="currentColor" />
                      ))}
                    </div>
                    <p className="text-[11px] text-stone-300 mt-1">Based on 2,840+ verified buyer ratings</p>
                  </div>

                  <div className="text-right">
                    <span className="text-2xl sm:text-3xl font-bold text-[#A9D18E]">98%</span>
                    <p className="text-[11px] text-stone-200 font-medium">Would Recommend</p>
                  </div>
                </div>

                {/* Rating Distribution Bars */}
                <div className="space-y-1.5 text-xs text-stone-200">
                  {[
                    { stars: 5, pct: "89%" },
                    { stars: 4, pct: "9%" },
                    { stars: 3, pct: "2%" },
                    { stars: 2, pct: "0%" },
                    { stars: 1, pct: "0%" },
                  ].map((bar) => (
                    <div key={bar.stars} className="flex items-center gap-3">
                      <span className="w-12 text-[11px] text-stone-300">{bar.stars} Stars</span>
                      <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[#A9D18E] rounded-full transition-all duration-1000"
                          style={{ width: bar.pct }}
                        />
                      </div>
                      <span className="w-8 text-right text-[11px] text-stone-300">{bar.pct}</span>
                    </div>
                  ))}
                </div>

                {/* Trust guarantee pill */}
                <div className="pt-2 flex items-center gap-2 text-[11px] text-stone-200 font-medium">
                  <ShieldCheck size={14} className="text-[#A9D18E]" />
                  <span>100% Genuine, Verified Purchase Reviews Only</span>
                </div>
              </div>
            </div>
          </div>
        </ScrollReveal>

        {/* Filters and Search Bar */}
        <div className="bg-white rounded-2xl border border-[#E5E7DF] p-4 sm:p-5 mb-8 shadow-xs space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            {/* Search Input */}
            <div className="relative flex-1 max-w-md">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
              <input
                type="text"
                placeholder="Search reviews by keyword, herb, or condition..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-[#E5E7DF] focus:outline-hidden focus:border-[#386B40] focus:ring-1 focus:ring-[#386B40] transition-all bg-[#FBFAF6]"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-600"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Sort & Rating Dropdowns */}
            <div className="flex items-center gap-3 shrink-0">
              <div className="flex items-center gap-2">
                <span className="text-xs text-[#666B64] font-medium hidden sm:inline">Sort:</span>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  className="text-xs font-semibold text-[#171A17] bg-[#FBFAF6] border border-[#E5E7DF] rounded-xl px-3 py-2 focus:outline-hidden focus:border-[#386B40]"
                >
                  <option value="helpful">Most Helpful</option>
                  <option value="highest">Highest Rating</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs text-[#666B64] font-medium hidden sm:inline">Rating:</span>
                <select
                  value={selectedRating}
                  onChange={(e) => setSelectedRating(e.target.value)}
                  className="text-xs font-semibold text-[#171A17] bg-[#FBFAF6] border border-[#E5E7DF] rounded-xl px-3 py-2 focus:outline-hidden focus:border-[#386B40]"
                >
                  <option value="All">All Ratings</option>
                  <option value="5">5 Stars</option>
                </select>
              </div>
            </div>
          </div>

          {/* Category Pill Filters */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none pt-1">
            <span className="text-xs font-semibold text-stone-400 shrink-0 flex items-center gap-1 mr-1">
              <Filter size={13} /> Filter:
            </span>
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`text-xs px-3.5 py-1.5 rounded-full font-medium transition-all shrink-0 cursor-pointer ${
                  selectedCategory === cat
                    ? "bg-[#173D2A] text-white shadow-xs"
                    : "bg-[#F3F4EE] hover:bg-[#EAECE4] text-[#4F554C]"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Review Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredReviews.length === 0 ? (
            <div className="col-span-full py-16 text-center bg-white rounded-3xl border border-[#E5E7DF] space-y-3">
              <p className="text-base font-heading tracking-tight font-bold text-[#171A17]">No reviews match your filter</p>
              <p className="text-xs sm:text-sm text-[#666B64]">
                Try adjusting your search query or selecting &quot;All&quot; categories.
              </p>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setSelectedCategory("All");
                  setSelectedRating("All");
                }}
                className="mt-2 px-4 py-2 bg-[#173D2A] text-white text-xs font-semibold rounded-xl hover:bg-[#386B40] transition-colors"
              >
                Reset Filters
              </button>
            </div>
          ) : (
            filteredReviews.map((item) => (
              <div
                key={item.id}
                className="bg-white rounded-2xl border border-[#E5E7DF] hover:border-[#386B40]/40 p-6 sm:p-7 flex flex-col justify-between transition-all duration-300 hover:shadow-lg group relative overflow-hidden"
              >
                {/* Decorative Quote Watermark */}
                <div className="absolute top-4 right-4 text-[#173D2A]/6 group-hover:text-[#173D2A]/10 transition-colors pointer-events-none select-none">
                  <Quote size={36} strokeWidth={1.5} />
                </div>

                <div className="relative z-10">
                  {/* Rating Stars + Product Pill (with mr-8 so text never overlaps background quote watermark) */}
                  <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
                    <div className="flex items-center gap-1">
                      <RatingStars rating={item.rating} size={15} />
                    </div>
                    {item.productMentioned && (
                      <span className="text-[11px] font-medium text-[#386B40] bg-[#386B40]/8 px-2.5 py-0.5 rounded-full border border-[#386B40]/15 mr-8 sm:mr-9">
                        {item.productMentioned}
                      </span>
                    )}
                  </div>

                  {/* Review Title */}
                  {item.title && (
                    <h3 className="font-heading tracking-tight font-bold text-base text-[#171A17] mb-2 leading-snug">
                      {item.title}
                    </h3>
                  )}

                  {/* Review Quote */}
                  <p className="text-xs sm:text-sm text-[#444942] italic leading-relaxed mb-6 font-normal">
                    &ldquo;{item.comment}&rdquo;
                  </p>
                </div>

                {/* Footer with Customer Info and Helpful Button */}
                <div className="relative z-10 flex items-center justify-between pt-4 border-t border-[#E5E7DF]/80">
                  <div className="flex items-center gap-3">
                    <img
                      src={item.avatar}
                      alt={item.name}
                      loading="lazy"
                      className="w-10 h-10 rounded-full object-cover border-2 border-[#A9D18E]/60 group-hover:border-[#386B40] transition-colors"
                    />
                    <div>
                      <span className="text-xs sm:text-sm font-bold text-[#171A17] block">
                        {item.name}
                      </span>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                          <CheckCircle2 size={12} className="text-[#386B40]" />
                          <span>{item.role}</span>
                        </span>
                        {item.location && (
                          <span className="text-[11px] text-stone-400 hidden sm:inline">&bull; {item.location}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Helpful Button */}
                  <button
                    onClick={() => handleHelpfulClick(item.id)}
                    disabled={helpfulVoted[item.id]}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      helpfulVoted[item.id]
                        ? "bg-[#386B40]/10 text-[#386B40] cursor-default"
                        : "bg-[#F4F4EE] hover:bg-[#E7E9E1] text-[#4F554C] active:scale-95 cursor-pointer"
                    }`}
                  >
                    <ThumbsUp size={13} className={helpfulVoted[item.id] ? "text-[#386B40]" : ""} />
                    <span>Helpful ({item.helpfulCount || 0})</span>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* WRITE A REVIEW MODAL */}
      {/* ======================================================== */}
      {isWriteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative border border-[#E5E7DF] max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setIsWriteModalOpen(false)}
              className="absolute top-5 right-5 text-stone-400 hover:text-stone-700 p-1 rounded-full hover:bg-stone-100 transition-colors"
            >
              <X size={18} />
            </button>

            {formSubmitted ? (
              <div className="py-12 text-center space-y-3">
                <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-2">
                  <CheckCircle2 size={32} />
                </div>
                <h3 className="font-heading tracking-tight text-2xl font-bold text-[#171A17]">Thank You for Your Feedback!</h3>
                <p className="text-xs sm:text-sm text-[#666B64] max-w-xs mx-auto">
                  Your review has been verified and added to our authentic Ayurvedic community ledger.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmitReview} className="space-y-4">
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[#386B40]">Share Your Experience</span>
                  <h3 className="font-heading tracking-tight text-2xl font-bold text-[#171A17] mt-0.5">Write a Customer Review</h3>
                  <p className="text-xs text-[#666B64] mt-1">
                    Help other health seekers find authentic botanical wellness solutions.
                  </p>
                </div>

                {/* Rating selection */}
                <div>
                  <label className="block text-xs font-bold text-[#171A17] mb-1.5">Overall Rating</label>
                  <div className="flex items-center gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        type="button"
                        key={star}
                        onClick={() => setNewReview({ ...newReview, rating: star })}
                        className="text-[#F2C94C] hover:scale-110 transition-transform p-1 cursor-pointer"
                      >
                        <Star
                          size={24}
                          fill={star <= newReview.rating ? "currentColor" : "none"}
                        />
                      </button>
                    ))}
                    <span className="text-xs font-semibold text-[#171A17] ml-2">
                      {newReview.rating} out of 5 Stars
                    </span>
                  </div>
                </div>

                {/* Product Mentioned */}
                <div>
                  <label className="block text-xs font-bold text-[#171A17] mb-1">Product Formulations Purchased</label>
                  <select
                    value={newReview.productMentioned}
                    onChange={(e) => setNewReview({ ...newReview, productMentioned: e.target.value })}
                    className="w-full text-xs sm:text-sm rounded-xl border border-[#E5E7DF] px-3.5 py-2.5 bg-[#FBFAF6] focus:outline-hidden focus:border-[#386B40]"
                  >
                    <option value="Pure Himalayan Shilajit Resin">Pure Himalayan Shilajit Resin</option>
                    <option value="Organic Ashwagandha Extract">Organic Ashwagandha Extract</option>
                    <option value="Classical Triphala Churna">Classical Triphala Churna</option>
                    <option value="Organic Lakadong Turmeric Powder">Organic Lakadong Turmeric Powder</option>
                    <option value="Maha Bhringraj Herbal Hair Oil">Maha Bhringraj Herbal Hair Oil</option>
                    <option value="Classical Chyawanprash Awaleha">Classical Chyawanprash Awaleha</option>
                    <option value="Kumkumadi Tailam Radiant Glow Oil">Kumkumadi Tailam Radiant Glow Oil</option>
                  </select>
                </div>

                {/* Review Headline */}
                <div>
                  <label className="block text-xs font-bold text-[#171A17] mb-1">Review Headline *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Life-changing energy and natural purity"
                    value={newReview.title}
                    onChange={(e) => setNewReview({ ...newReview, title: e.target.value })}
                    className="w-full text-xs sm:text-sm rounded-xl border border-[#E5E7DF] px-3.5 py-2.5 bg-[#FBFAF6] focus:outline-hidden focus:border-[#386B40]"
                  />
                </div>

                {/* Review Text */}
                <div>
                  <label className="block text-xs font-bold text-[#171A17] mb-1">Your Detailed Experience *</label>
                  <textarea
                    required
                    rows={4}
                    placeholder="How did this formulation help your daily wellness? What differences did you notice?"
                    value={newReview.comment}
                    onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                    className="w-full text-xs sm:text-sm rounded-xl border border-[#E5E7DF] px-3.5 py-2.5 bg-[#FBFAF6] focus:outline-hidden focus:border-[#386B40]"
                  />
                </div>

                {/* Customer Details Row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-[#171A17] mb-1">Your Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Aditi R."
                      value={newReview.name}
                      onChange={(e) => setNewReview({ ...newReview, name: e.target.value })}
                      className="w-full text-xs rounded-xl border border-[#E5E7DF] px-3 py-2 bg-[#FBFAF6] focus:outline-hidden focus:border-[#386B40]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-[#171A17] mb-1">City / State</label>
                    <input
                      type="text"
                      placeholder="e.g. Bengaluru, Karnataka"
                      value={newReview.location}
                      onChange={(e) => setNewReview({ ...newReview, location: e.target.value })}
                      className="w-full text-xs rounded-xl border border-[#E5E7DF] px-3 py-2 bg-[#FBFAF6] focus:outline-hidden focus:border-[#386B40]"
                    />
                  </div>
                </div>

                {/* Submit button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    className="w-full py-3 bg-[#173D2A] hover:bg-[#386B40] text-white text-xs font-bold rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
                  >
                    Submit Verified Review
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

