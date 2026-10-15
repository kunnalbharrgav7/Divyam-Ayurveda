import React from "react";
import { Link } from "react-router-dom";
import { categories } from "../../data/categories";

export const ShopByCategory = () => {
  return (
    <section className="py-12 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-8">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#386B40]">
            Botanical Categories
          </span>
          <h2 className="text-2xl sm:text-3xl font-serif font-bold text-[#171A17] mt-1">
            Shop by Category
          </h2>
          <div className="w-12 h-0.5 bg-[#386B40] mx-auto mt-2.5 rounded-full" />
        </div>

        {/* 8 Circular Category Shortcuts Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-4 sm:gap-6">
          {categories.map((cat) => (
            <Link
              key={cat.id}
              to={`/category/${cat.slug}`}
              className="group flex flex-col items-center text-center focus:outline-none"
            >
              {/* Circular Avatar Container */}
              <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full p-1 bg-[#F4F4EE] border-2 border-[#E5E7DF] group-hover:border-[#386B40] group-hover:shadow-md transition-all duration-300 flex items-center justify-center overflow-hidden">
                <img
                  src={cat.image}
                  alt={cat.name}
                  loading="lazy"
                  className="w-full h-full object-cover rounded-full group-hover:scale-110 transition-transform duration-300"
                />
              </div>

              {/* Title */}
              <span className="mt-3 text-xs sm:text-sm font-semibold text-[#171A17] group-hover:text-[#173D2A] transition-colors leading-tight line-clamp-2">
                {cat.name}
              </span>
              <span className="text-[11px] text-[#666B64] mt-0.5">
                {cat.itemCount} items
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
};

