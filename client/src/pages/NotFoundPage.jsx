import React from "react";
import { Link } from "react-router-dom";
import { Leaf, Compass, ArrowRight } from "lucide-react";

export const NotFoundPage = () => {
  return (
    <div className="bg-[#FBFAF6] min-h-[70vh] flex items-center justify-center py-16 px-4">
      <div className="max-w-md w-full bg-white rounded-3xl border border-[#E5E7DF] p-8 sm:p-10 text-center shadow-xs space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-[#173D2A]/10 text-[#173D2A] flex items-center justify-center mx-auto">
          <Compass size={32} />
        </div>

        <div>
          <span className="font-serif text-5xl font-bold text-[#173D2A] block mb-2">
            404
          </span>
          <h1 className="font-serif text-2xl font-bold text-[#171A17]">
            Page Out of Balance
          </h1>
          <p className="text-xs sm:text-sm text-[#666B64] mt-2 leading-relaxed">
            The path you followed does not seem to lead anywhere in our Ayurvedic dispensary. Let us guide you back to wellness.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-3 justify-center pt-2">
          <Link
            to="/"
            className="px-6 py-2.5 bg-[#173D2A] hover:bg-[#0B2416] text-white text-xs font-semibold rounded-xl transition-colors shadow-xs"
          >
            Return to Homepage
          </Link>
          <Link
            to="/products"
            className="px-6 py-2.5 bg-white border border-[#E5E7DF] hover:bg-stone-50 text-[#171A17] text-xs font-semibold rounded-xl transition-colors"
          >
            Explore Catalog
          </Link>
        </div>
      </div>
    </div>
  );
};

