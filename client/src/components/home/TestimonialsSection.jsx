import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { RatingStars } from "../common/RatingStars";
import { contentService } from "../../services/api";

export const TestimonialsSection = () => {
  const [testimonials, setTestimonials] = useState([]);

  useEffect(() => {
    const fetchTestimonials = async () => {
      try {
        const data = await contentService.getTestimonials();
        setTestimonials(data);
      } catch (err) {
        console.error("Error loading testimonials:", err);
      }
    };
    fetchTestimonials();
  }, []);

  return (
    <section className="py-14 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header with green horizontal accent line */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between mb-8 gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#171A17]">
                What Our Customers Say
              </h2>
              <div className="h-0.5 w-16 bg-[#386B40] rounded-full hidden sm:block" />
            </div>
            <p className="text-xs sm:text-sm text-[#666B64] mt-1">
              Honest experiences from families embracing authentic Ayurvedic daily rituals.
            </p>
          </div>

          <Link
            to="/about"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#173D2A] hover:text-[#386B40] transition-colors shrink-0 group"
          >
            <span>View All Reviews</span>
            <ArrowRight size={15} className="group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>

        {/* 3 Testimonial Cards Grid (matching screenshot) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.slice(0, 3).map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-2xl border border-[#E5E7DF] p-6 flex flex-col justify-between transition-all duration-300 hover:shadow-md hover:border-[#A9D18E]/60"
            >
              <div>
                {/* 5 Gold Stars */}
                <div className="mb-3">
                  <RatingStars rating={item.rating} size={16} />
                </div>

                {/* Quote Text */}
                <p className="text-xs sm:text-sm text-[#171A17] italic leading-relaxed mb-6">
                  &ldquo;{item.comment}&rdquo;
                </p>
              </div>

              {/* Customer Profile Row */}
              <div className="flex items-center gap-3 pt-4 border-t border-[#E5E7DF]/60">
                <img
                  src={item.avatar}
                  alt={item.name}
                  loading="lazy"
                  className="w-11 h-11 rounded-full object-cover border border-[#A9D18E]"
                />
                <div className="flex flex-col">
                  <span className="text-xs sm:text-sm font-bold text-[#171A17]">
                    {item.name}
                  </span>
                  <span className="flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                    <CheckCircle2 size={12} />
                    <span>{item.role}</span>
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

