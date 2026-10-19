import React, { useState, useEffect } from "react";
import { Link, NavLink, useNavigate } from "react-router-dom";
import {
  LayoutGrid,
  ChevronDown,
  ChevronRight,
  Sparkles,
  X,
  Heart,
  User,
  ShoppingBag,
  ShieldCheck,
  Shield,
  LogOut,
} from "lucide-react";
import { categoryService } from "../../services/api";
import { useAuth } from "../../context/AuthContext";

export const CategoryNav = ({
  isMobileMenuOpen,
  onCloseMobileMenu,
  hideMobileDrawer = false,
}) => {
  const [categoriesList, setCategoriesList] = useState([]);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [hoveredCatId, setHoveredCatId] = useState("");
  const [expandedMobileCat, setExpandedMobileCat] = useState(null);
  const navigate = useNavigate();
  const { user, isAuthenticated, isAdmin, logout, logoutAdmin } = useAuth();

  useEffect(() => {
    let isMounted = true;
    const fetchCats = async () => {
      try {
        const data = await categoryService.getCategories();
        if (isMounted && Array.isArray(data) && data.length > 0) {
          setCategoriesList(data);
          setHoveredCatId(data[0].id || data[0].slug);
        }
      } catch (err) {
        console.error("Failed to load navigation categories:", err);
      }
    };
    fetchCats();
    return () => {
      isMounted = false;
    };
  }, []);

  // Top-level links come from the categories saved in Admin → Categories (first 7 by display order);
  // the Categories dropdown lists them all.
  const categoryLinks = categoriesList.slice(0, 7).map((cat) => ({
    label: cat.shortName || cat.name,
    href: `/category/${cat.slug}`,
  }));

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

                {/* Two-Tier Mega Dropdown Menu with Subcategories */}
                {dropdownOpen && (() => {
                  const activeCategory = categoriesList.find((c) => c.id === hoveredCatId) || categoriesList[0];
                  return (
                    <div className="absolute top-full left-0 w-[640px] bg-white border border-[#E5E7DF] rounded-2xl shadow-2xl mt-1.5 z-50 overflow-hidden flex animate-in fade-in slide-in-from-top-1.5 duration-200">
                      {/* Left: Categories Column */}
                      <div className="w-56 border-r border-[#E5E7DF] p-2 bg-stone-50/70 shrink-0">
                        <div className="px-3 py-1.5 text-[10px] font-bold text-stone-400 uppercase tracking-wider">
                          Categories
                        </div>
                        <div className="space-y-0.5">
                          {categoriesList.map((cat) => {
                            const isHovered = cat.id === (activeCategory?.id);
                            return (
                              <div
                                key={cat.id}
                                onMouseEnter={() => setHoveredCatId(cat.id)}
                                onClick={() => {
                                  navigate(`/category/${cat.slug}`);
                                  setDropdownOpen(false);
                                }}
                                className={`flex items-center justify-between px-3 py-2 text-xs rounded-xl cursor-pointer transition-colors ${
                                  isHovered
                                    ? "bg-[#173D2A] text-white font-semibold shadow-xs"
                                    : "text-stone-700 hover:bg-stone-200/60"
                                }`}
                              >
                                <span className="truncate">{cat.name}</span>
                                <ChevronRight
                                  size={13}
                                  className={isHovered ? "text-[#A9D18E]" : "text-stone-400"}
                                />
                              </div>
                            );
                          })}
                        </div>
                        <div className="border-t border-[#E5E7DF] mt-2 pt-2">
                          <Link
                            to="/products"
                            onClick={() => setDropdownOpen(false)}
                            className="block px-3 py-1.5 text-xs font-semibold text-[#173D2A] hover:underline"
                          >
                            All Products &rarr;
                          </Link>
                        </div>
                      </div>

                      {/* Right: Active Category's Subcategories Panel */}
                      <div className="flex-1 p-5 flex flex-col justify-between bg-white min-h-[360px]">
                        <div>
                          <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                            <div>
                              <h4 className="text-sm font-heading tracking-tight font-bold text-[#171A17]">
                                {activeCategory?.name}
                              </h4>
                              <p className="text-[11px] text-[#666B64] line-clamp-1 mt-0.5">
                                {activeCategory?.description}
                              </p>
                            </div>
                            <Link
                              to={`/category/${activeCategory?.slug}`}
                              onClick={() => setDropdownOpen(false)}
                              className="text-xs font-semibold text-[#386B40] hover:text-[#173D2A] hover:underline shrink-0 ml-3"
                            >
                              View All &rarr;
                            </Link>
                          </div>

                          {/* Subcategories Grid */}
                          <div className="grid grid-cols-2 gap-2.5 pt-3">
                            {(activeCategory?.subcategories || []).map((sub) => (
                              <Link
                                key={sub.id}
                                to={`/category/${activeCategory.slug}?subcategory=${sub.slug}`}
                                onClick={() => setDropdownOpen(false)}
                                className="p-3 rounded-xl border border-stone-100 hover:border-[#A9D18E]/70 hover:bg-[#F4F4EE]/60 group transition-all"
                              >
                                <div className="flex items-center justify-between">
                                  <span className="text-xs font-semibold text-stone-800 group-hover:text-[#173D2A]">
                                    {sub.name}
                                  </span>
                                  <ChevronRight
                                    size={12}
                                    className="opacity-0 group-hover:opacity-100 transition-opacity text-[#386B40]"
                                  />
                                </div>
                                <p className="text-[11px] text-stone-500 line-clamp-2 mt-1 leading-snug">
                                  {sub.description}
                                </p>
                              </Link>
                            ))}
                          </div>
                        </div>

                        <div className="pt-3 border-t border-stone-100 flex items-center justify-between text-[11px] text-stone-500">
                          <span>Authentic AYUSH-Certified Herbal Formulations</span>
                          <Link
                            to={`/category/${activeCategory?.slug}`}
                            onClick={() => setDropdownOpen(false)}
                            className="font-semibold text-[#173D2A] hover:underline"
                          >
                            Explore {activeCategory?.name}
                          </Link>
                        </div>
                      </div>
                    </div>
                  );
                })()}
              </div>

              {/* Main Category Horizontal Links */}
              <div className="flex items-center space-x-1 xl:space-x-2">
                {categoryLinks.map((link) => (
                  <NavLink
                    key={link.href}
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
      {isMobileMenuOpen && !hideMobileDrawer && (
        <div className="fixed inset-0 z-50 lg:hidden">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={onCloseMobileMenu}
          />

          {/* Drawer Content */}
          <div className="fixed inset-y-0 left-0 w-4/5 max-w-sm bg-white shadow-2xl z-50 flex flex-col overflow-y-auto animate-in slide-in-from-left duration-300 ease-out">
            {/* Drawer Header */}
            <div className="p-4 bg-[#173D2A] text-white flex items-center justify-between">
              <div>
                <span className="font-heading tracking-tight text-xl font-bold">
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
                {categoriesList.map((cat) => {
                  const isExpanded = expandedMobileCat === cat.id;
                  const hasSubcategories = Array.isArray(cat.subcategories) && cat.subcategories.length > 0;
                  return (
                    <div key={cat.id} className="rounded-xl overflow-hidden transition-colors">
                      <div className="flex items-center justify-between px-3 py-2 text-sm text-stone-700 hover:text-[#173D2A] hover:bg-stone-50 rounded-xl">
                        <Link
                          to={`/category/${cat.slug}`}
                          onClick={onCloseMobileMenu}
                          className="flex-1 font-medium truncate"
                        >
                          {cat.name}
                        </Link>
                        {hasSubcategories && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setExpandedMobileCat(isExpanded ? null : cat.id);
                            }}
                            className="p-1 rounded-md hover:bg-stone-200/70 text-stone-500 hover:text-stone-900 ml-2 cursor-pointer"
                            aria-label={`Toggle ${cat.name} subcategories`}
                          >
                            <ChevronDown
                              size={16}
                              className={`transition-transform duration-200 ${
                                isExpanded ? "rotate-180 text-[#386B40]" : ""
                              }`}
                            />
                          </button>
                        )}
                      </div>

                      {/* Subcategories Accordion */}
                      {isExpanded && hasSubcategories && (
                        <div className="pl-4 pr-2 py-1.5 space-y-1 bg-[#F4F4EE]/60 rounded-xl mt-0.5 border-l-2 border-[#386B40] animate-in fade-in duration-150">
                          {cat.subcategories.map((sub) => (
                            <Link
                              key={sub.id}
                              to={`/category/${cat.slug}?subcategory=${sub.slug}`}
                              onClick={onCloseMobileMenu}
                              className="flex items-center justify-between py-1.5 px-2 text-xs text-stone-600 hover:text-[#173D2A] hover:bg-white rounded-lg transition-colors"
                            >
                              <span>{sub.name}</span>
                              <ChevronRight size={12} className="text-stone-400" />
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
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
                      logout();
                      onCloseMobileMenu();
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-rose-600 hover:bg-rose-50 rounded-xl transition-colors text-left font-medium"
                  >
                    <LogOut size={16} /> Sign Out (Admin)
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
