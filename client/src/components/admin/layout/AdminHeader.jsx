import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  Menu,
  Search,
  Bell,
  Store,
  ChevronRight,
  Package,
  ShoppingBag,
  Star,
  Check,
} from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { useAdmin } from "../../../context/AdminContext";
import { AdminSearchModal } from "../common/AdminSearchModal";

export const AdminHeader = ({ isCollapsed, setIsMobileOpen }) => {
  const [searchOpen, setSearchOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const { adminUser } = useAuth();
  const { lowStockCount, pendingOrdersCount, pendingReviewsCount, orders } = useAdmin();
  const location = useLocation();

  // Generate breadcrumb items from URL path
  const pathParts = location.pathname.split("/").filter(Boolean);
  const breadcrumbs = pathParts.map((part, index) => {
    const url = "/" + pathParts.slice(0, index + 1).join("/");
    const formatted = part
      .replace(/-/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
    return { name: formatted, url, isLast: index === pathParts.length - 1 };
  });

  const totalNotifications =
    (lowStockCount > 0 ? 1 : 0) +
    (pendingOrdersCount > 0 ? 1 : 0) +
    (pendingReviewsCount > 0 ? 1 : 0);

  return (
    <>
      <header
        className={`sticky top-0 z-30 h-16 bg-white/95 backdrop-blur-md border-b border-stone-200 transition-all duration-300 ease-in-out px-4 sm:px-6 flex items-center justify-between ${
          isCollapsed ? "lg:ml-20" : "lg:ml-64"
        }`}
      >
        {/* Left side: Mobile menu button & Breadcrumbs */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setIsMobileOpen(true)}
            className="lg:hidden p-2 rounded-lg text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Breadcrumbs */}
          <nav className="hidden sm:flex items-center gap-1.5 text-xs text-stone-500">
            {breadcrumbs.map((crumb, idx) => (
              <React.Fragment key={crumb.url}>
                {idx > 0 && <ChevronRight className="w-3.5 h-3.5 text-stone-300" />}
                {crumb.isLast ? (
                  <span className="font-semibold text-stone-900">{crumb.name}</span>
                ) : (
                  <Link
                    to={crumb.url}
                    className="hover:text-emerald-800 transition-colors"
                  >
                    {crumb.name}
                  </Link>
                )}
              </React.Fragment>
            ))}
          </nav>
        </div>

        {/* Right side: Global Search, Storefront Link, Notifications, Profile */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Global Search trigger */}
          <button
            type="button"
            onClick={() => setSearchOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-stone-200 bg-stone-50 hover:bg-stone-100 text-stone-500 text-xs transition-colors"
          >
            <Search className="w-3.5 h-3.5 text-stone-400" />
            <span className="hidden md:inline">Quick search...</span>
            <kbd className="hidden md:inline-block px-1.5 py-0.5 text-[10px] font-semibold text-stone-400 bg-stone-200 rounded">
              ⌘K
            </kbd>
          </button>

          {/* Public Storefront button */}
          <Link
            to="/"
            title="Go to Live Storefront"
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-50 text-emerald-800 hover:bg-emerald-100 text-xs font-semibold border border-emerald-200/60 transition-colors"
          >
            <Store className="w-3.5 h-3.5" />
            <span>Live Store</span>
          </Link>

          {/* Notifications dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="relative p-2 rounded-lg text-stone-600 hover:text-stone-900 hover:bg-stone-100 transition-colors"
            >
              <Bell className="w-5 h-5" />
              {totalNotifications > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-rose-500 ring-2 ring-white animate-pulse" />
              )}
            </button>

            {notificationsOpen && (
              <>
                <div
                  className="fixed inset-0 z-30"
                  onClick={() => setNotificationsOpen(false)}
                />
                <div className="absolute right-0 mt-2 w-80 rounded-2xl bg-white border border-stone-200 shadow-xl z-40 p-4 divide-y divide-stone-100 animate-in fade-in zoom-in-95">
                  <div className="flex items-center justify-between pb-3">
                    <h4 className="font-semibold text-xs text-stone-900 uppercase tracking-wider">
                      Admin Notifications
                    </h4>
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                      {totalNotifications} Alerts
                    </span>
                  </div>

                  <div className="py-2 space-y-2 max-h-72 overflow-y-auto text-xs">
                    {pendingOrdersCount > 0 && (
                      <Link
                        to="/admin/orders"
                        onClick={() => setNotificationsOpen(false)}
                        className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-emerald-50/70 transition-colors"
                      >
                        <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <ShoppingBag className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="font-semibold text-stone-900">
                            {pendingOrdersCount} Pending Order(s)
                          </div>
                          <p className="text-[11px] text-stone-500">
                            Awaiting fulfillment and warehouse dispatch.
                          </p>
                        </div>
                      </Link>
                    )}

                    {lowStockCount > 0 && (
                      <Link
                        to="/admin/inventory"
                        onClick={() => setNotificationsOpen(false)}
                        className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-rose-50/70 transition-colors"
                      >
                        <div className="w-7 h-7 rounded-lg bg-rose-100 text-rose-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Package className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="font-semibold text-stone-900">
                            {lowStockCount} Low Inventory Alert(s)
                          </div>
                          <p className="text-[11px] text-stone-500">
                            Stock level fell below safety reorder threshold.
                          </p>
                        </div>
                      </Link>
                    )}

                    {pendingReviewsCount > 0 && (
                      <Link
                        to="/admin/reviews"
                        onClick={() => setNotificationsOpen(false)}
                        className="flex items-start gap-2.5 p-2 rounded-lg hover:bg-amber-50/70 transition-colors"
                      >
                        <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Star className="w-3.5 h-3.5" />
                        </div>
                        <div>
                          <div className="font-semibold text-stone-900">
                            {pendingReviewsCount} Review(s) Pending
                          </div>
                          <p className="text-[11px] text-stone-500">
                            Customer feedback awaiting approval.
                          </p>
                        </div>
                      </Link>
                    )}

                    {totalNotifications === 0 && (
                      <div className="py-4 text-center text-stone-400">
                        <Check className="w-6 h-6 mx-auto mb-1 text-emerald-600" />
                        <span>All caught up! No active alerts.</span>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 text-center">
                    <Link
                      to="/admin/audit-logs"
                      onClick={() => setNotificationsOpen(false)}
                      className="text-[11px] font-semibold text-emerald-800 hover:underline"
                    >
                      View Full Activity Audit Log →
                    </Link>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Admin User Badge */}
          <div className="flex items-center gap-2 pl-2 border-l border-stone-200">
            <div className="w-8 h-8 rounded-full bg-[#173D2A] text-white flex items-center justify-center font-bold text-xs shadow-xs">
              {adminUser?.name ? adminUser.name.charAt(0) : "A"}
            </div>
            <div className="hidden lg:block text-left text-xs">
              <div className="font-semibold text-stone-900 leading-tight">
                {adminUser?.name || "Administrator"}
              </div>
              <div className="text-[10px] text-stone-500">
                {adminUser?.roleName || "Super Admin"}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Quick Search Modal */}
      <AdminSearchModal
        isOpen={searchOpen}
        onClose={() => setSearchOpen(false)}
      />
    </>
  );
};

