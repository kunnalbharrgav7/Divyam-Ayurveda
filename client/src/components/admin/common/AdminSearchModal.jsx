import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Search, X, Package, ShoppingBag, Users, ArrowRight } from "lucide-react";
import { useAdmin } from "../../../context/AdminContext";

export const AdminSearchModal = ({ isOpen, onClose }) => {
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();
  const { products, orders, customers } = useAdmin();

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        onClose(); // toggle or open if controlled externally
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [onClose]);

  if (!isOpen) return null;

  const term = searchTerm.trim().toLowerCase();

  const matchingProducts = term
    ? products
        .filter(
          (p) =>
            (p.title || p.name || "").toLowerCase().includes(term) ||
            (p.sku || "").toLowerCase().includes(term) ||
            (p.category || p.categoryId || "").toLowerCase().includes(term)
        )
        .slice(0, 4)
    : [];

  const matchingOrders = term
    ? orders
        .filter(
          (o) =>
            o.id.toLowerCase().includes(term) ||
            o.customerName?.toLowerCase().includes(term) ||
            o.email?.toLowerCase().includes(term)
        )
        .slice(0, 4)
    : [];

  const matchingCustomers = term
    ? customers
        .filter(
          (c) =>
            c.name.toLowerCase().includes(term) ||
            c.email.toLowerCase().includes(term) ||
            c.phone?.includes(term)
        )
        .slice(0, 3)
    : [];

  const handleSelect = (url) => {
    navigate(url);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto p-4 sm:p-6 md:p-20">
      <div
        className="fixed inset-0 bg-stone-900/60 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="relative mx-auto max-w-2xl transform divide-y divide-stone-100 overflow-hidden rounded-2xl bg-white shadow-2xl transition-all border border-stone-200">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3 bg-stone-50/50">
          <Search className="h-5 w-5 text-stone-400 mr-3" />
          <input
            type="text"
            className="h-10 w-full border-0 bg-transparent text-stone-900 placeholder-stone-400 focus:outline-hidden focus:ring-0 text-base"
            placeholder="Search products, orders, customers, SKU... (e.g. Ashwagandha, ORD-1001)"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            autoFocus
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="text-stone-400 hover:text-stone-600 p-1 mr-1"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-block px-2 py-0.5 text-[10px] font-semibold text-stone-400 bg-stone-200 rounded border border-stone-300">
            ESC
          </kbd>
        </div>

        {/* Search Results Area */}
        <div className="max-h-96 overflow-y-auto p-3 text-sm">
          {!term && (
            <div className="py-6 text-center text-xs text-stone-400">
              Type to search across the entire Divyam Ayurveda admin panel...
            </div>
          )}

          {term &&
            matchingProducts.length === 0 &&
            matchingOrders.length === 0 &&
            matchingCustomers.length === 0 && (
              <div className="py-8 text-center text-stone-500">
                No matching results found for{" "}
                <span className="font-semibold text-stone-700">"{searchTerm}"</span>
              </div>
            )}

          {matchingProducts.length > 0 && (
            <div className="mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400 px-3 py-1 block">
                Products ({matchingProducts.length})
              </span>
              {matchingProducts.map((p) => (
                <div
                  key={p.id}
                  onClick={() => handleSelect(`/admin/products/${p.id}/edit`)}
                  className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-emerald-50/60 cursor-pointer text-stone-800 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <img
                      src={p.image || (Array.isArray(p.images) ? p.images[0] : "") || "/images/ProductImages/Ashuwaganda.png"}
                      alt={p.title || p.name || "Product"}
                      className="w-9 h-9 rounded object-cover border border-stone-200"
                    />
                    <div>
                      <div className="font-medium text-stone-900 text-xs sm:text-sm">
                        {p.title || p.name || "Untitled Product"}
                      </div>
                      <div className="text-[11px] text-stone-500">
                        SKU: {p.sku || "N/A"} • ₹{p.price} • Stock: {p.stock ?? p.stockQuantity ?? 0}
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-stone-300 group-hover:text-emerald-700 transition-colors" />
                </div>
              ))}
            </div>
          )}

          {matchingOrders.length > 0 && (
            <div className="mb-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400 px-3 py-1 block">
                Orders ({matchingOrders.length})
              </span>
              {matchingOrders.map((o) => (
                <div
                  key={o.id}
                  onClick={() => handleSelect(`/admin/orders/${o.id}`)}
                  className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-emerald-50/60 cursor-pointer text-stone-800 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded bg-stone-100 flex items-center justify-center text-stone-600">
                      <ShoppingBag className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-medium text-stone-900 text-xs sm:text-sm">
                        {o.id} — {o.customerName}
                      </div>
                      <div className="text-[11px] text-stone-500">
                        ₹{o.totalAmount || o.total} • Status: {o.orderStatus || o.status}
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-stone-300 group-hover:text-emerald-700 transition-colors" />
                </div>
              ))}
            </div>
          )}

          {matchingCustomers.length > 0 && (
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-400 px-3 py-1 block">
                Customers ({matchingCustomers.length})
              </span>
              {matchingCustomers.map((c) => (
                <div
                  key={c.id}
                  onClick={() => handleSelect(`/admin/customers/${c.id}`)}
                  className="flex items-center justify-between px-3 py-2 rounded-lg hover:bg-emerald-50/60 cursor-pointer text-stone-800 transition-colors group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs">
                      {c.name.charAt(0)}
                    </div>
                    <div>
                      <div className="font-medium text-stone-900 text-xs sm:text-sm">
                        {c.name}
                      </div>
                      <div className="text-[11px] text-stone-500">
                        {c.email} • {c.phone}
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-stone-300 group-hover:text-emerald-700 transition-colors" />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer shortcuts */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-stone-50 text-[11px] text-stone-500">
          <span>Navigate with mouse or click result to open</span>
          <span className="font-medium">Divyam Admin Global Search</span>
        </div>
      </div>
    </div>
  );
};

