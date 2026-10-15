import React from "react";
import { Star } from "lucide-react";

export const RatingStars = ({ rating = 5, reviewCount = null, size = 16, showNumber = false }) => {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.4;

  return (
    <div className="flex items-center gap-1.5" aria-label={`Rating: ${rating} out of 5 stars`}>
      <div className="flex items-center text-amber-500">
        {[1, 2, 3, 4, 5].map((star) => {
          return (
            <Star
              key={star}
              size={size}
              className={`${
                star <= fullStars
                  ? "fill-amber-400 text-amber-400"
                  : star === fullStars + 1 && hasHalfStar
                  ? "fill-amber-300 text-amber-400 opacity-80"
                  : "text-stone-300 fill-stone-100"
              }`}
            />
          );
        })}
      </div>
      {showNumber && (
        <span className="text-xs font-semibold text-stone-700">{rating.toFixed(1)}</span>
      )}
      {reviewCount !== null && (
        <span className="text-xs text-stone-500">({reviewCount.toLocaleString("en-IN")})</span>
      )}
    </div>
  );
};

