import React, { useState } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import {
  LayoutGrid,
  ChevronDown,
  Sparkles,
  X,
  Heart,
  User,
  ShoppingBag,
  ShieldCheck,
  Shield,
  LogOut,
} from "lucide-react";
import { categories } from "../../data/categories";
import { useAuth } from "../../context/AuthContext";

export const CategoryNav = ({ isMobileMenuOpen, onCloseMobileMenu }) => {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const navigate = useNavigate();
  const { user, isAuthenticated, isAdmin, logout, logoutAdmin } = useAuth();

  const categoryLinks = [
    { label: "Ayurvedic Herbs", href: "/category/ayurvedic-herbs" },
    { label: "Churna & Powders", href: "/category/churna-powders" },
    { label: "Herbal Oils", href: "/category/herbal-oils" },
    { label: "Herbal Juices", href: "/category/herbal-juices" },
    { label: "Kadha & Herbal Teas", href: "/category/kadha-herbal-teas" },
    { label: "Digestive Wellness", href: "/category/digestive-wellness" },
    { label: "Personal Care", href: "/category/personal-care" },
  ];

  return (
    <>
      {/* Desktop Category Navigation Bar */}
      <nav className="bg-white border-b border-[#E5E7DF] hidden lg:block relative z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-12">
            <div className="flex items-center gap-1 xl:gap-2">
              {/* All Categories Button with Dropdown */}
              <div
                className="relative"
                onMouseEnter={() => setDropdownOpen(true)}
                onMouseLeave={() => setDropdownOpen(false)}
              >
                <button
                  onClick={() => navigate("/products")}
                  className="flex items-center gap-2 px-4 py-2 bg-[#386B40] hover:bg-[#173D2A] text-white text-xs font-semibold rounded-lg transition-colors shadow-xs"
                >
                  <LayoutGrid size={15} />
                  <span>Categories</span>
                  <ChevronDown
                    size={14}
                    className={`transition-transform duration-200 ${
                      dropdownOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>

                {/* Dropdown Menu */}
                {dropdownOpen && (
                  <div className="absolute top-full left-0 w-64 bg-white border border-[#E5E7DF] rounded-xl shadow-lg py-2 mt-1 z-50 animate-in fade-in slide-in-from-top-1 duration-150">
                    <div className="px-3 py-1.5 text-[11px] font-semibold text-stone-400 uppercase tracking-wider">
                      Shop By Category
                    </div>
                    {categories.map((cat) => (
                      <Link
                        key={cat.id}
                        to={`/category/${cat.slug}`}
                        onClick={() => setDropdownOpen(false)}
                        className="flex items-center justify-between px-3.5 py-2 text-xs text-stone-700 hover:text-[#173D2A] hover:bg-[#F4F4EE] transition-colors"
                      >
                        <span>{cat.name}</span>
                        <span className="text-[10px] text-stone-400 bg-stone-100 px-1.5 py-0.5 rounded">
                          {cat.itemCount}
                        </span>
                      </Link>
                    ))}
                    <div className="border-t border-[#E5E7DF] my-1" />
                    <Link
                      to="/products"
                      onClick={() => setDropdownOpen(false)}
                      className="block px-3.5 py-2 text-xs font-semibold text-[#173D2A] hover:bg-[#F4F4EE]"
                    >
                      View All Products &rarr;
                    </Link>
                  </div>
                )}
              </div>

              {/* Main Category Horizontal Links */}
              <div className="flex items-center space-x-1 xl:space-x-2">
                {categoryLinks.map((link, idx) => (
                  <NavLink
                    key={idx}
                    to={link.href}
                    className={({ isActive }) =>
                      `px-2.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                        isActive
                          ? "text-[#173D2A] bg-stone-100 font-semibold"
                          : "text-[#666B64] hover:text-[#173D2A] hover:bg-stone-50"
                      }`
                    }
                  >
                    {link.label}
                  </NavLink>
                ))}
              </div>
            </div>

            {/* Right Side Links: Offers & Ayurvedic Knowledge */}
            <div className="flex items-center gap-3 xl:gap-4 shrink-0 pl-2">
              <NavLink
                to="/offers"
                className={({ isActive }) =>
                  `inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full transition-colors whitespace-nowrap ${
                    isActive
                      ? "bg-emerald-700 text-white shadow-xs"
                      : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/60"
                  }`
                }
              >
                <Sparkles size={12} className="text-emerald-600" />
                <span>Offers</span>
              </NavLink>

              <div className="w-px h-4 bg-[#E5E7DF] hidden sm:block" />

              <NavLink
                to="/ayurveda"
                className={({ isActive }) =>
                  `inline-flex items-center gap-1.5 text-xs font-semibold transition-colors whitespace-nowrap ${
                    isActive
                      ? "text-[#173D2A] underline underline-offset-4"
                      : "text-[#386B40] hover:text-[#173D2A] hover:underline"
                  }`
                }
              >
                <ShieldCheck size={14} />
                <span>Ayurvedic Knowledge</span>
              </NavLink>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Drawer Menu (Sidebar for screens < 1024px) */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobileMenu}
          />

          {/* Drawer Content */}
          <div className="fixed inset-y-0 left-0 w-4/5 max-w-sm bg-white shadow-xl z-50 flex flex-col overflow-y-auto">
            {/* Drawer Header */}
            <div className="p-4 bg-[#173D2A] text-white flex items-center justify-between">
              <div>
                <span className="font-serif text-xl font-bold">
                  Divyam Ayurveda
                </span>
                <p className="text-[11px] text-[#A9D18E]">
                  Pure Herbal Wellness
                </p>
              </div>
              <button
                onClick={onCloseMobileMenu}
                className="p-1.5 rounded-lg text-white hover:bg-white/10"
                aria-label="Close menu"
              >
                <X size={20} />
              </button>
            </div>

            {/* Navigation List */}
            <div className="p-4 flex-1">
              <div className="mb-4">
                <Link
                  to="/products"
                  onClick={onCloseMobileMenu}
                  className="flex items-center justify-between p-3 bg-[#F4F4EE] text-[#173D2A] font-semibold text-sm rounded-xl mb-3"
                >
                  <span className="flex items-center gap-2">
                    <LayoutGrid size={16} /> All Products Catalog
                  </span>
                  <span>&rarr;</span>
                </Link>
              </div>

              <div className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider mb-2">
                Categories
              </div>
              <div className="space-y-1 mb-6">
                {categories.map((cat) => (
                  <Link
                    key={cat.id}
                    to={`/category/${cat.slug}`}
                    onClick={onCloseMobileMenu}
                    className="flex items-center justify-between px-3 py-2 text-sm text-stone-700 hover:text-[#173D2A] hover:bg-stone-50 rounded-lg"
                  >
                    <span>{cat.name}</span>
                    <span className="text-xs text-stone-400 bg-stone-100 px-2 py-0.5 rounded-full">
                      {cat.itemCount}
                    </span>
                  </Link>
                ))}
              </div>

              <div className="border-t border-[#E5E7DF] pt-4 mb-6">
                <div className="text-[11px] font-semibold text-stone-400 uppercase tracking-wider mb-2">
                  Explore & Learn
                </div>
                <div className="space-y-1">
                  <Link
                    to="/offers"
                    onClick={onCloseMobileMenu}
                    className="block px-3 py-2 text-sm text-emerald-700 font-semibold hover:bg-emerald-50 rounded-lg"
                  >
                    Special Offers & Bundles
                  </Link>
                  <Link
                    to="/ayurveda"
                    onClick={onCloseMobileMenu}
                    className="block px-3 py-2 text-sm text-stone-700 hover:text-[#173D2A] hover:bg-stone-50 rounded-lg"
                  >
                    About Ayurveda & Doshas
                  </Link>
                  <Link
                    to="/ingredients"
                    onClick={onCloseMobileMenu}
                    className="block px-3 py-2 text-sm text-stone-700 hover:text-[#173D2A] hover:bg-stone-50 rounded-lg"
                  >
                    Herbal Ingredients Directory
                  </Link>
                  <Link
                    to="/blog"
                    onClick={onCloseMobileMenu}
                    className="block px-3 py-2 text-sm text-stone-700 hover:text-[#173D2A] hover:bg-stone-50 rounded-lg"
                  >
                    Ayurvedic Wellness Blog
                  </Link>
                  <Link
                    to="/about"
                    onClick={onCloseMobileMenu}
                    className="block px-3 py-2 text-sm text-stone-700 hover:text-[#173D2A] hover:bg-stone-50 rounded-lg"
                  >
                    Our Story & Philosophy
                  </Link>
                  <Link
                    to="/contact"
                    onClick={onCloseMobileMenu}
                    className="block px-3 py-2 text-sm text-stone-700 hover:text-[#173D2A] hover:bg-stone-50 rounded-lg"
                  >
                    Contact Support
                  </Link>
                </div>
              </div>
            </div>

            {/* Drawer Footer: Conditional based on Auth State / Role */}
            <div className="p-4 bg-stone-50 border-t border-[#E5E7DF] space-y-2">
              {isAdmin ? (
                <>
                  <Link
                    to="/admin/dashboard"
                    onClick={onCloseMobileMenu}
                    className="flex items-center justify-between px-3 py-2 text-sm font-semibold text-white bg-[#173D2A] rounded-xl shadow-xs"
                  >
                    <span className="flex items-center gap-2">
                      <Shield size={16} className="text-[#A9D18E]" /> Admin Dashboard
                    </span>
                    <span className="text-xs">&rarr;</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      logoutAdmin();
                      onCloseMobileMenu();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 rounded-xl transition-colors text-left font-medium"
                  >
                    <LogOut size={16} /> Logout Admin
                  </button>
                </>
              ) : isAuthenticated ? (
                <>
                  <Link
                    to="/account"
                    onClick={onCloseMobileMenu}
                    className="flex items-center justify-between px-3 py-2 text-sm font-semibold text-[#173D2A] bg-stone-100 rounded-xl"
                  >
                    <span className="flex items-center gap-2">
                      <User size={16} /> My Account ({user?.name?.split(" ")[0] || "User"})
                    </span>
                    <span className="text-xs text-stone-400">&rarr;</span>
                  </Link>
                  <button
                    type="button"
                    onClick={() => {
                      logout();
                      onCloseMobileMenu();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 rounded-xl transition-colors text-left font-medium"
                  >
                    <LogOut size={16} /> Sign Out
                  </button>
                </>
              ) : (
                <div className="grid grid-cols-2 gap-2 pb-1">
                  <Link
                    to="/login"
                    onClick={onCloseMobileMenu}
                    className="py-2 text-center text-xs font-semibold text-[#173D2A] border border-[#173D2A] rounded-xl hover:bg-stone-100 transition-colors"
                  >
                    Login
                  </Link>
                  <Link
                    to="/register"
                    onClick={onCloseMobileMenu}
                    className="py-2 text-center text-xs font-semibold text-white bg-[#173D2A] hover:bg-[#0B2416] rounded-xl shadow-xs transition-colors"
                  >
                    Register
                  </Link>
                </div>
              )}

              <Link
                to="/wishlist"
                onClick={onCloseMobileMenu}
                className="flex items-center gap-2 px-3 py-2 text-sm text-stone-700 hover:text-[#173D2A]"
              >
                <Heart size={16} /> Wishlist
              </Link>
              <Link
                to="/track-order"
                onClick={onCloseMobileMenu}
                className="flex items-center gap-2 px-3 py-2 text-sm text-stone-700 hover:text-[#173D2A]"
              >
                <ShieldCheck size={16} /> Track Order
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
