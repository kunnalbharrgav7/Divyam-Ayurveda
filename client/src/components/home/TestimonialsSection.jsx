import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, Quote, Sparkles } from "lucide-react";
import { RatingStars } from "../common/RatingStars";
import { contentService } from "../../services/api";
import { ScrollReveal } from "../../animations/useScrollReveal";
import { testimonials as fallbackTestimonials } from "../../data/testimonials";

const TestimonialCard = ({ item }) => {
  return (
    <div className="w-[320px] sm:w-[460px] md:w-[520px] lg:w-[560px] shrink-0 bg-white rounded-2xl border border-[#E5E7DF] hover:border-[#386B40]/50 p-4 sm:p-5 flex flex-col justify-between transition-all duration-300 hover:shadow-xl hover:shadow-[#173D2A]/6 group relative overflow-hidden select-none min-h-[190px] sm:min-h-[205px]">
      {/* Decorative Quote Watermark */}
      <div className="absolute top-3 right-3 sm:top-3.5 sm:right-3.5 text-[#173D2A]/6 group-hover:text-[#173D2A]/12 transition-colors pointer-events-none select-none">
        <Quote size={32} strokeWidth={1.5} />
      </div>

      <div className="relative z-10">
        {/* Rating Stars + Product Pill (Left-shifted with mr-8/mr-9 so text never overlaps background quote watermark) */}
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-1 shrink-0">
            <RatingStars rating={item.rating} size={14} />
          </div>
          {item.productMentioned && (
            <span className="text-[10px] sm:text-[11px] font-medium text-[#386B40] bg-[#386B40]/8 px-2.5 py-0.5 rounded-full border border-[#386B40]/15 truncate max-w-[180px] sm:max-w-[240px] mr-8 sm:mr-9">
              {item.productMentioned}
            </span>
          )}
        </div>

        {/* Review Title */}
        {item.title && (
          <h4 className="font-heading font-bold tracking-tight text-xs sm:text-[13.5px] text-[#171A17] mb-1 leading-snug">
            {item.title}
          </h4>
        )}

        {/* Review Quote text */}
        <p className="text-[11.5px] sm:text-xs text-[#444942] italic leading-normal mb-3 font-normal line-clamp-3">
          &ldquo;{item.comment}&rdquo;
        </p>
      </div>

      {/* Customer profile footer */}
      <div className="relative z-10 flex items-center justify-between pt-2.5 sm:pt-3 border-t border-[#E5E7DF]/80">
        <div className="flex items-center gap-2.5 sm:gap-3">
          <img
            src={item.avatar}
            alt={item.name}
            loading="lazy"
            className="w-8 h-8 sm:w-9 sm:h-9 rounded-full object-cover border-2 border-[#A9D18E]/60 group-hover:border-[#386B40] transition-colors"
          />
          <div className="flex flex-col">
            <span className="text-xs sm:text-[13px] font-bold text-[#171A17] group-hover:text-[#173D2A] transition-colors leading-tight">
              {item.name}
            </span>
            <span className="flex items-center gap-1 text-[10px] sm:text-[11px] font-medium text-emerald-700 mt-0.5">
              <CheckCircle2 size={11} className="text-[#386B40]" />
              <span>{item.role}</span>
            </span>
          </div>
        </div>

        {item.location && (
          <span className="text-[10px] sm:text-[11px] text-[#888E84] font-medium hidden sm:inline-block">
            {item.location}
          </span>
        )}
      </div>
    </div>
  );
};

export const TestimonialsSection = () => {
  const [reviews, setReviews] = useState(fallbackTestimonials);

  useEffect(() => {
    const fetchTestimonials = async () => {
      try {
        const data = await contentService.getTestimonials();
        if (data && data.length >= 6) {
          setReviews(data);
        }
      } catch (err) {
        console.error("Error loading testimonials:", err);
      }
    };
    fetchTestimonials();
  }, []);

  // Split into 6 upper reviews and 6 lower reviews
  const row1 = reviews.slice(0, 6);
  const row2 = reviews.length >= 12 ? reviews.slice(6, 12) : reviews.slice(0, 6);

  return (
    <section className="py-14 bg-white relative overflow-hidden">
      {/* Embedded CSS for smooth infinite hardware-accelerated marquee */}
      <style>{`
        @keyframes marqueeLeftToRight {
          0% { transform: translate3d(-50%, 0, 0); }
          100% { transform: translate3d(0%, 0, 0); }
        }
        @keyframes marqueeRightToLeft {
          0% { transform: translate3d(0%, 0, 0); }
          100% { transform: translate3d(-50%, 0, 0); }
        }
        .marquee-track-ltr {
          display: flex;
          width: max-content;
          animation: marqueeLeftToRight 50s linear infinite;
          will-change: transform;
        }
        .marquee-track-rtl {
          display: flex;
          width: max-content;
          animation: marqueeRightToLeft 50s linear infinite;
          will-change: transform;
        }
        .marquee-track-ltr:hover,
        .marquee-track-rtl:hover {
          animation-play-state: paused;
        }
      `}</style>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-8">
        {/* Header with green accent line and View All Reviews link to /reviews */}
        <ScrollReveal yOffset={16} duration={500} className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl sm:text-3xl font-heading font-bold tracking-tight text-[#171A17]">
                What Our Customers Say
              </h2>
              <div className="h-0.5 w-16 bg-[#386B40] rounded-full hidden sm:block" />
            </div>
            <p className="text-xs sm:text-sm text-[#666B64] mt-1">
              Honest experiences from families embracing authentic Ayurvedic daily rituals.
            </p>
          </div>

          <Link
            to="/reviews"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#173D2A] hover:text-[#386B40] transition-colors shrink-0 group"
          >
            <span>View All Reviews</span>
            <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </ScrollReveal>
      </div>

      {/* Infinite Marquee Area with Left & Right Gradient Fade Masks */}
      <div className="relative w-full overflow-hidden space-y-6">
        {/* Left and Right Edge Gradient Masks */}
        <div className="pointer-events-none absolute left-0 top-0 bottom-0 w-12 sm:w-28 bg-gradient-to-r from-white via-white/80 to-transparent z-20" />
        <div className="pointer-events-none absolute right-0 top-0 bottom-0 w-12 sm:w-28 bg-gradient-to-l from-white via-white/80 to-transparent z-20" />

        {/* Upper Row: 6 Reviews sliding Left to Right */}
        <div className="flex overflow-hidden py-1">
          <div className="marquee-track-ltr flex gap-6">
            {/* Double array for seamless loop */}
            {[...row1, ...row1].map((item, index) => (
              <TestimonialCard key={`row1-${item.id}-${index}`} item={item} />
            ))}
          </div>
        </div>

        {/* Lower Row: 6 Reviews sliding Right to Left */}
        <div className="flex overflow-hidden py-1">
          <div className="marquee-track-rtl flex gap-6">
            {/* Double array for seamless loop */}
            {[...row2, ...row2].map((item, index) => (
              <TestimonialCard key={`row2-${item.id}-${index}`} item={item} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
