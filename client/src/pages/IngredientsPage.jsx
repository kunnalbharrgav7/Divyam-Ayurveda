import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Search, Sparkles, Leaf, ArrowRight } from "lucide-react";
import { Breadcrumbs } from "../components/common/Breadcrumbs";
import { ingredients } from "../data/ingredients";

export const IngredientsPage = () => {
  const [searchTerm, setSearchTerm] = useState("");

  const filteredIngredients = ingredients.filter((ing) => {
    const q = searchTerm.toLowerCase();
    return (
      ing.name.toLowerCase().includes(q) ||
      ing.sanskritName.toLowerCase().includes(q) ||
      ing.botanicalName.toLowerCase().includes(q) ||
      ing.traditionalUses.toLowerCase().includes(q)
    );
  });

  return (
    <div className="bg-[#FBFAF6] min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Breadcrumbs items={[{ label: "Herbal Ingredients Directory" }]} />

        {/* Header */}
        <div className="text-center max-w-2xl mx-auto py-6 space-y-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-[#386B40] flex items-center justify-center gap-1.5">
            <Leaf size={14} /> Botanical Materia Medica
          </span>
          <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#171A17]">
            Ayurvedic Herb Directory
          </h1>
          <p className="text-xs sm:text-sm text-[#666B64] leading-relaxed">
            Explore classical botanical profiles, classical Sanskrit terminology, therapeutic actions, and doshic affinities.
          </p>

          {/* Search Bar */}
          <div className="pt-4 max-w-md mx-auto">
            <div className="relative">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by herb (e.g. Ashwagandha, Amla, Tulsi)..."
                className="w-full pl-10 pr-4 py-3 bg-white border border-[#E5E7DF] rounded-2xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#386B40] shadow-xs"
              />
              <Search size={16} className="absolute left-3.5 top-3.5 text-stone-400" />
            </div>
          </div>
        </div>

        {/* Directory Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 my-8">
          {filteredIngredients.map((item) => (
            <div
              key={item.id}
              className="bg-white rounded-3xl border border-[#E5E7DF] overflow-hidden p-6 flex flex-col justify-between shadow-xs hover:border-[#A9D18E] transition-all"
            >
              <div className="space-y-4">
                {/* Thumbnail & Title */}
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl overflow-hidden bg-stone-100 shrink-0 border border-stone-200">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div>
                    <h3 className="font-serif text-lg font-bold text-[#171A17]">
                      {item.name}
                    </h3>
                    <p className="text-xs text-[#386B40] font-medium font-sans">
                      {item.sanskritName}
                    </p>
                    <p className="text-[11px] text-stone-400 italic">
                      {item.botanicalName}
                    </p>
                  </div>
                </div>

                {/* Dosha Tag */}
                <div className="p-2.5 rounded-xl bg-[#FBFAF6] border border-[#E5E7DF] text-xs">
                  <span className="font-bold text-[#173D2A] block text-[11px] uppercase tracking-wider mb-0.5">
                    Doshic Action:
                  </span>
                  <span className="text-stone-700">{item.doshaBalance}</span>
                </div>

                {/* Traditional Uses */}
                <p className="text-xs text-[#666B64] leading-relaxed">
                  {item.traditionalUses}
                </p>
              </div>

              {/* Featured in Products */}
              <div className="pt-4 mt-4 border-t border-[#E5E7DF] text-xs space-y-1.5">
                <span className="text-[11px] font-bold text-stone-500 uppercase tracking-wider block">
                  Featured in Formulations:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {item.featuredInProducts.map((pName, idx) => (
                    <Link
                      key={idx}
                      to={`/products?search=${encodeURIComponent(pName.split(" ")[0])}`}
                      className="px-2 py-0.5 rounded-md bg-stone-100 hover:bg-[#A9D18E]/30 text-[#173D2A] text-[11px] font-medium transition-colors"
                    >
                      {pName}
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
