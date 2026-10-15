import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search, User, Heart, ShoppingBag, Menu, X, Shield, LogOut } from "lucide-react";
import { useCart } from "../../context/CartContext";
import { useWishlist } from "../../context/WishlistContext";
import { useAuth } from "../../context/AuthContext";
import { formatINR } from "../../utils/formatters";

export const Header = ({ onToggleMobileMenu }) => {
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
    <header className="bg-white border-b border-[#E5E7DF] sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20 gap-4">
          {/* Mobile Menu Button & Logo */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onToggleMobileMenu}
              className="lg:hidden p-2 rounded-lg text-stone-700 hover:text-[#173D2A] hover:bg-stone-100 focus:outline-none"
              aria-label="Toggle navigation menu"
            >
              <Menu size={24} />
            </button>

            {/* Brand Logo */}
            <Link to="/" className="flex items-center shrink-0 group" aria-label="Divyam Ayurveda">
              <img
                src="/images/Logo/Logo.png"
                alt="Divyam Ayurveda"
                className="h-10 sm:h-12 w-auto object-contain transition-transform group-hover:scale-105"
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
                className="w-full pl-4 pr-12 py-2.5 bg-stone-50 border border-[#E5E7DF] rounded-xl text-sm text-[#171A17] placeholder-stone-400 focus:outline-none focus:ring-2 focus:ring-[#386B40] focus:border-transparent transition-all"
              />
              <button
                type="submit"
                className="absolute right-1.5 top-1.5 bottom-1.5 px-3 bg-[#386B40] hover:bg-[#173D2A] text-white rounded-lg flex items-center justify-center transition-colors shadow-xs"
                title="Search products"
                aria-label="Search products"
              >
                <Search size={16} />
              </button>
            </div>
          </form>

          {/* Right Action Section: Dynamically rendered based on Auth State / Role */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {/* 1. Admin Role: Admin + Logout + Wishlist + Cart */}
            {isAdmin ? (
              <div className="flex items-center gap-1 sm:gap-2">
                <Link
                  to="/admin/dashboard"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 bg-[#173D2A] hover:bg-[#0B2416] text-white text-xs sm:text-sm font-semibold rounded-xl shadow-xs transition-colors"
                  title="Admin Dashboard"
                >
                  <Shield size={15} className="text-[#A9D18E]" />
                  <span>Admin</span>
                </Link>
                <button
                  type="button"
                  onClick={logoutAdmin}
                  className="p-1.5 sm:p-2 text-stone-500 hover:text-rose-600 hover:bg-stone-100 rounded-xl transition-colors"
                  title="Logout from Admin"
                  aria-label="Logout from Admin"
                >
                  <LogOut size={16} />
                </button>
              </div>
            ) : isAuthenticated ? (
              /* 2. Customer Role: Account + Logout + Wishlist + Cart */
              <div className="flex items-center gap-1 sm:gap-2">
                <Link
                  to="/account"
                  className="flex items-center gap-2 p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl text-stone-700 hover:text-[#173D2A] hover:bg-stone-50 transition-colors"
                  title="My Account"
                >
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-stone-100 flex items-center justify-center text-[#173D2A] border border-stone-200">
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
                  className="p-1.5 sm:p-2 text-stone-500 hover:text-rose-600 hover:bg-stone-100 rounded-xl transition-colors"
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
                  className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold text-stone-700 hover:text-[#173D2A] hover:bg-stone-100 rounded-xl transition-colors"
                >
                  Login
                </Link>
                <Link
                  to="/register"
                  className="px-2.5 sm:px-3.5 py-1.5 sm:py-2 text-xs sm:text-sm font-semibold bg-[#173D2A] hover:bg-[#0B2416] text-white rounded-xl shadow-xs transition-colors"
                >
                  Register
                </Link>
              </div>
            )}

            {/* Wishlist */}
            <Link
              to="/wishlist"
              className="relative p-2 rounded-xl text-stone-700 hover:text-[#173D2A] hover:bg-stone-50 transition-colors"
              title="View Wishlist"
              aria-label={`Wishlist with ${wishlistCount} items`}
            >
              <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-stone-100 flex items-center justify-center text-[#173D2A]">
                <Heart size={18} />
              </div>
              {wishlistCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-5 h-5 bg-rose-500 text-white text-[11px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">
                  {wishlistCount}
                </span>
              )}
            </Link>

            {/* Cart */}
            <Link
              to="/cart"
              className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-2 rounded-xl bg-[#173D2A]/5 hover:bg-[#173D2A]/10 text-[#173D2A] transition-colors"
              title="View Cart"
              aria-label={`Cart with ${cartCount} items`}
            >
              <div className="relative">
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#173D2A] text-white flex items-center justify-center">
                  <ShoppingBag size={18} />
                </div>
                {cartCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-5 h-5 bg-[#386B40] text-white text-[11px] font-bold rounded-full flex items-center justify-center ring-2 ring-white">
                    {cartCount}
                  </span>
                )}
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
              className="w-full pl-4 pr-10 py-2 bg-stone-50 border border-[#E5E7DF] rounded-xl text-xs text-[#171A17] placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-[#386B40]"
            />
            <button
              type="submit"
              className="absolute right-1 top-1 bottom-1 px-2.5 bg-[#386B40] text-white rounded-lg flex items-center justify-center"
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

