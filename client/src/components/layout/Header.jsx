import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Search, User, Heart, ShoppingBag, Menu, X, Shield, LogOut, Gift } from "lucide-react";
import { useCart } from "../../context/CartContext";
import { useWishlist } from "../../context/WishlistContext";
import { useAuth } from "../../context/AuthContext";
import { formatINR } from "../../utils/formatters";

export const Header = ({ onToggleMobileMenu, isSticky = true }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const navigate = useNavigate();
  const { cartCount, subtotal } = useCart();
  const { wishlistCount } = useWishlist();
  const { user, isAuthenticated, isAdmin, logout, logoutAdmin } = useAuth();

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/products?search=${encodeURIComponent(searchQuery.trim())}`);
    } else {
      navigate("/products");
    }
  };

  return (
    <header className={`bg-white border-b border-[#E5E7DF] z-40 transition-shadow duration-300 ${isSticky ? "sticky top-0" : "relative"}`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 gap-4">
          {/* Mobile Menu Button & Logo */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onToggleMobileMenu}
              className="lg:hidden p-2 rounded-lg text-stone-700 hover:text-[#173D2A] hover:bg-stone-100 focus:outline-none transition-colors active:scale-95"
              aria-label="Toggle navigation menu"
            >
              <Menu size={24} />
            </button>

            {/* Brand Logo with Smooth Hover Scale */}
            <Link to="/" className="flex items-center shrink-0 group" aria-label="Divyam Ayurveda">
              <img
                src="/images/Logo/Logo.png"
                alt="Divyam Ayurveda"
                className="h-10 sm:h-12 w-auto object-contain transition-transform duration-300 ease-out group-hover:scale-105"
              />
            </Link>
          </div>

          {/* Center Search Bar */}
          <form
            onSubmit={handleSearchSubmit}
            className="hidden md:flex flex-1 max-w-xl mx-4 relative"
            role="search"
          >
            <div className="relative w-full flex items-center">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search Ayurvedic herbs, oils, churna, wellness products..."
                className="w-full pl-4 pr-12 py-2.5 bg-stone-50 border border-[#E5E7DF] rounded-xl text-sm text-[#171A17] placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#386B40]/60 focus:bg-white focus:border-transparent transition-all duration-200"
              />
              <button
                type="submit"
                className="absolute right-1.5 top-1.5 bottom-1.5 px-3 bg-[#386B40] hover:bg-[#173D2A] text-white rounded-lg flex items-center justify-center transition-all duration-200 active:scale-95 shadow-xs"
                title="Search products"
                aria-label="Search products"
              >
                <Search size={16} />
              </button>
            </div>
          </form>

          {/* Right Action Section: Dynamically rendered based on Auth State / Role */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {/* 1. Admin Role: Admin Dashboard Redirect Button + Logout */}
            {isAdmin ? (
              <div className="flex items-center gap-1.5 sm:gap-2">
                <Link
                  to="/admin/dashboard"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 bg-[#173D2A] hover:bg-[#0B2416] text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition-all duration-200 active:scale-95 hover:shadow-md ring-1 ring-[#386B40]/30"
                  title="Go to Admin Dashboard"
                >
                  <Shield size={15} className="text-[#A9D18E]" />
                  <span>Admin Dashboard</span>
                </Link>
                <button
                  type="button"
                  onClick={logout}
                  className="p-1.5 sm:p-2 text-stone-500 hover:text-rose-600 hover:bg-stone-100 rounded-xl transition-all duration-200 active:scale-90"
                  title="Sign Out"
                  aria-label="Sign Out"
                >
                  <LogOut size={16} />
                </button>
              </div>
            ) : isAuthenticated ? (
              /* 2. Customer Role: Account + Logout + Wishlist + Cart */
              <div className="flex items-center gap-1 sm:gap-2">
                <Link
                  to="/account"
                  className="flex items-center gap-2 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl text-stone-700 hover:text-[#173D2A] hover:bg-stone-50 transition-all duration-200 active:scale-98"
                  title="My Account"
                >
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-stone-100 flex items-center justify-center text-[#173D2A] border border-stone-200 transition-transform duration-200 group-hover:scale-105">
                    <User size={18} />
                  </div>
                  <div className="hidden xl:flex flex-col text-left">
                    <span className="text-[11px] text-stone-500 leading-none">Hello,</span>
                    <span className="text-xs font-semibold text-[#171A17] leading-tight mt-0.5">
                      {user?.name?.split(" ")[0] || "Account"}
                    </span>
                  </div>
                </Link>
                <button
                  type="button"
                  onClick={logout}
                  className="p-1.5 sm:p-2 text-stone-500 hover:text-rose-600 hover:bg-stone-100 rounded-xl transition-all duration-200 active:scale-90"
                  title="Sign Out"
                  aria-label="Sign Out"
                >
                  <LogOut size={16} />
                </button>
              </div>
            ) : (
              /* 3. Guest (No Login): Login + Register + Wishlist + Cart */
              <div className="flex items-center gap-1 sm:gap-2">
                <Link
                  to="/login"
                  className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-stone-700 hover:text-[#173D2A] hover:bg-stone-100 rounded-xl transition-all duration-200 active:scale-95"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold bg-[#173D2A] hover:bg-[#0B2416] text-white rounded-xl shadow-xs transition-all duration-200 active:scale-95 hover:shadow-md"
                >
                  Register
                </Link>
              </div>
            )}

            {/* Refer & Earn link */}
            <Link
              to="/referrals"
              className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50/80 hover:bg-amber-100/90 text-amber-900 border border-amber-200/70 text-xs font-semibold transition-all duration-200 active:scale-95 shadow-2xs"
              title="Refer Friends & Earn ₹100"
            >
              <Gift size={14} className="text-amber-700" />
              <span>Refer &amp; Earn</span>
            </Link>

            {/* Wishlist */}
            <Link
              to="/wishlist"
              className="relative p-2 rounded-xl text-stone-700 hover:text-[#173D2A] hover:bg-stone-50 transition-all duration-200 active:scale-95 group"
              title="View Wishlist"
              aria-label={`Wishlist with ${wishlistCount} items`}
            >
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-stone-100 flex items-center justify-center text-[#173D2A] transition-transform duration-200 group-hover:scale-108">
                <Heart size={18} />
              </div>
              <AnimatePresence>
                {wishlistCount > 0 && (
                  <motion.span
                    key={wishlistCount}
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 25 }}
                    className="absolute top-1.5 right-1.5 w-5 h-5 bg-rose-500 text-white text-[11px] font-bold rounded-full flex items-center justify-center ring-2 ring-white"
                  >
                    {wishlistCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>

            {/* Cart with Price Pill */}
            <Link
              to="/cart"
              className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-2 rounded-xl bg-[#173D2A]/5 hover:bg-[#173D2A]/10 text-[#173D2A] transition-all duration-200 active:scale-98 group"
              title="View Cart"
              aria-label={`Cart with ${cartCount} items`}
            >
              <div className="relative">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#173D2A] text-white flex items-center justify-center transition-transform duration-200 group-hover:scale-108 shadow-xs">
                  <ShoppingBag size={18} />
                </div>
                <AnimatePresence>
                  {cartCount > 0 && (
                    <motion.span
                      key={cartCount}
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      exit={{ scale: 0.5, opacity: 0 }}
                      transition={{ type: "spring", stiffness: 500, damping: 25 }}
                      className="absolute -top-1 -right-1 w-5 h-5 bg-[#386B40] text-white text-[11px] font-bold rounded-full flex items-center justify-center ring-2 ring-white"
                    >
                      {cartCount}
                    </motion.span>
                  )}
                </AnimatePresence>
              </div>
              <div className="hidden sm:flex flex-col text-left">
                <span className="text-[11px] text-stone-500 leading-none">Cart</span>
                <span className="text-xs font-bold text-[#173D2A] leading-tight mt-0.5">
                  {formatINR(subtotal)}
                </span>
              </div>
            </Link>
          </div>
        </div>

        {/* Mobile Search Bar (underneath logo row on small screens) */}
        <div className="md:hidden pb-3">
          <form onSubmit={handleSearchSubmit} className="relative w-full flex items-center">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search herbs, oils, churna..."
              className="w-full pl-4 pr-10 py-2 bg-stone-50 border border-[#E5E7DF] rounded-xl text-xs text-[#171A17] placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-[#386B40] focus:bg-white transition-all"
            />
            <button
              type="submit"
              className="absolute right-1 top-1 bottom-1 px-2.5 bg-[#386B40] text-white rounded-lg flex items-center justify-center active:scale-95 transition-transform"
              aria-label="Search"
            >
              <Search size={14} />
            </button>
          </form>
        </div>
      </div>
    </header>
  );
};

export default Header;

