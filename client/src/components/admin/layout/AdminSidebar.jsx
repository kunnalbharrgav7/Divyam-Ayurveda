import React from "react";
import { NavLink, Link, useNavigate, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Package,
  PlusCircle,
  FolderTree,
  Tag,
  Layers,
  Boxes,
  Sparkles,
  ShoppingBag,
  RotateCcw,
  Ticket,
  Users,
  Star,
  Globe,
  FileText,
  BookOpen,
  Mail,
  LifeBuoy,
  Send,
  BarChart3,
  ShieldCheck,
  UserCheck,
  History,
  Settings,
  Store,
  RefreshCw,
  LogOut,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "../../../context/AuthContext";
import { useAdmin } from "../../../context/AdminContext";

export const AdminSidebar = ({
  isCollapsed,
  setIsCollapsed,
  isMobileOpen,
  setIsMobileOpen,
}) => {
  const { adminUser, logoutAdmin } = useAuth();
  const {
    resetDemoData,
    lowStockCount,
    pendingOrdersCount,
    pendingReviewsCount,
  } = useAdmin();
  const navigate = useNavigate();
  const location = useLocation();

  // Determine precise active state so nested routes like /admin/products/new
  // don't simultaneously highlight /admin/products
  const isItemActive = (item) => {
    if (item.to === "/admin") {
      return location.pathname === "/admin";
    }
    if (item.to === "/admin/products") {
      return (
        location.pathname === "/admin/products" ||
        (location.pathname.startsWith("/admin/products/") &&
          location.pathname !== "/admin/products/new")
      );
    }
    if (item.to === "/admin/products/new") {
      return location.pathname === "/admin/products/new";
    }
    if (item.exact) {
      return location.pathname === item.to;
    }
    return (
      location.pathname === item.to ||
      location.pathname.startsWith(item.to + "/")
    );
  };

  const handleLogout = () => {
    logoutAdmin();
    navigate("/admin/login");
  };

  const handleReset = () => {
    if (
      window.confirm(
        "Are you sure you want to reset all mock data to the initial factory seeds? Any changes you made will be reinitialized.",
      )
    ) {
      resetDemoData();
      alert("Demo data successfully reset to factory seeds!");
    }
  };

  const navGroups = [
    {
      group: "Overview",
      items: [
        {
          label: "Dashboard",
          to: "/admin",
          icon: LayoutDashboard,
          exact: true,
        },
      ],
    },
    {
      group: "Catalog",
      items: [
        {
          label: "Products",
          to: "/admin/products",
          icon: Package,
          badge: lowStockCount > 0 ? `${lowStockCount} low` : null,
          badgeVariant: "amber",
        },
        { label: "Add Product", to: "/admin/products/new", icon: PlusCircle },
        { label: "Categories", to: "/admin/categories", icon: FolderTree },
        { label: "Brands", to: "/admin/brands", icon: Tag },
        { label: "Collections", to: "/admin/collections", icon: Layers },
        {
          label: "Inventory Control",
          to: "/admin/inventory",
          icon: Boxes,
          badge: lowStockCount > 0 ? "Alert" : null,
          badgeVariant: "rose",
        },
        { label: "Botanical Herbs", to: "/admin/ingredients", icon: Sparkles },
      ],
    },
    {
      group: "Sales & Orders",
      items: [
        {
          label: "Orders",
          to: "/admin/orders",
          icon: ShoppingBag,
          badge: pendingOrdersCount > 0 ? pendingOrdersCount : null,
          badgeVariant: "emerald",
        },
        {
          label: "Returns & Refunds",
          to: "/admin/returns-refunds",
          icon: RotateCcw,
        },
        { label: "Discounts & Coupons", to: "/admin/coupons", icon: Ticket },
      ],
    },
    {
      group: "Customers & Feedback",
      items: [
        { label: "Customers", to: "/admin/customers", icon: Users },
        {
          label: "Product Reviews",
          to: "/admin/reviews",
          icon: Star,
          badge: pendingReviewsCount > 0 ? pendingReviewsCount : null,
          badgeVariant: "amber",
        },
      ],
    },
    {
      group: "Storefront Management",
      items: [
        {
          label: "Homepage Builder",
          to: "/admin/homepage-builder",
          icon: Globe,
        },
        { label: "Content Pages", to: "/admin/content-pages", icon: FileText },
        { label: "Blog & Education", to: "/admin/blog", icon: BookOpen },
      ],
    },
    {
      group: "Communications",
      items: [
        { label: "Contact Enquiries", to: "/admin/enquiries", icon: Mail },
        {
          label: "Support Tickets",
          to: "/admin/support-tickets",
          icon: LifeBuoy,
        },
        { label: "Subscribers", to: "/admin/subscribers", icon: Send },
      ],
    },
    {
      group: "Analytics & Insights",
      items: [
        { label: "Reports & KPIs", to: "/admin/reports", icon: BarChart3 },
      ],
    },
    {
      group: "Administration",
      items: [
        { label: "Admin Staff", to: "/admin/users", icon: ShieldCheck },
        { label: "Roles & Permissions", to: "/admin/roles", icon: UserCheck },
        { label: "Audit Logs", to: "/admin/audit-logs", icon: History },
      ],
    },
    {
      group: "Configuration",
      items: [{ label: "Settings", to: "/admin/settings", icon: Settings }],
    },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-stone-900/60 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar Container */}
      <aside
        className={`fixed top-0 bottom-0 left-0 z-40 flex flex-col bg-[#0B2416] text-stone-200 border-r border-[#173D2A] transition-all duration-300 ease-in-out ${
          isCollapsed ? "w-20" : "w-64"
        } ${isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}`}
      >
        {/* Brand Header */}
        <div
          className={`relative flex h-16 items-center border-b border-[#173D2A]/80 bg-[#07190F] transition-all duration-300 ${
            isCollapsed ? "justify-center px-2" : "justify-between px-4"
          }`}
        >
          <Link
            to="/admin"
            className={`flex items-center gap-2.5 overflow-hidden text-left group ${
              isCollapsed ? "justify-center" : ""
            }`}
            title="Divyam Ayurveda Admin Dashboard"
          >
            <img
              src="/images/Logo/Logo.png"
              alt="Divyam Ayurveda"
              className={`object-contain transition-transform group-hover:scale-105 flex-shrink-0 ${
                isCollapsed ? "h-8 w-auto max-w-[48px]" : "h-8 sm:h-9 w-auto max-w-[125px]"
              }`}
            />
            {!isCollapsed && (
              <div className="truncate border-l border-[#173D2A] pl-2">
                <span className="text-[10px] tracking-widest uppercase text-[#A9D18E] font-bold block leading-tight">
                  ADMIN
                </span>
                <span className="text-[9px] tracking-wider text-stone-400 block uppercase">
                  Control Center
                </span>
              </div>
            )}
          </Link>

          {/* Desktop Collapse / Expand Toggle */}
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className={`hidden lg:flex items-center justify-center transition-all ${
              isCollapsed
                ? "absolute -right-3.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-[#173D2A] border-2 border-[#0B2416] text-[#A9D18E] hover:text-white hover:bg-[#386B40] shadow-lg z-50 cursor-pointer"
                : "w-7 h-7 rounded-lg text-stone-400 hover:text-white hover:bg-[#173D2A]"
            }`}
            title={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4 stroke-[2.5]" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Navigation List */}
        <div
          className={`flex-1 overflow-y-auto py-4 space-y-6 scrollbar-thin scrollbar-thumb-[#173D2A] ${
            isCollapsed ? "px-2" : "px-3"
          }`}
        >
          {navGroups.map((grp, grpIdx) => (
            <div key={grpIdx}>
              {!isCollapsed && (
                <h4 className="px-3 text-[10px] font-bold uppercase tracking-wider text-[#A9D18E]/60 mb-2">
                  {grp.group}
                </h4>
              )}
              {isCollapsed && grpIdx > 0 && (
                <div className="w-6 h-px bg-[#173D2A]/60 mx-auto my-3" />
              )}
              <div className="space-y-1">
                {grp.items.map((item, itemIdx) => {
                  const Icon = item.icon;
                  const active = isItemActive(item);
                  return (
                    <NavLink
                      key={itemIdx}
                      to={item.to}
                      onClick={() => setIsMobileOpen(false)}
                      className={() =>
                        `relative flex items-center transition-all group ${
                          active
                            ? "bg-[#173D2A] text-white shadow-xs font-semibold"
                            : "text-stone-300 hover:bg-[#173D2A]/50 hover:text-white"
                        } ${
                          isCollapsed
                            ? "w-10 h-10 mx-auto justify-center rounded-xl p-0"
                            : "gap-3 px-3 py-2 rounded-xl text-xs sm:text-sm font-medium"
                        }`
                      }
                      title={isCollapsed ? item.label : undefined}
                      aria-current={active ? "page" : undefined}
                    >
                      <Icon
                        className={`w-4 h-4 transition-colors flex-shrink-0 ${
                          active
                            ? "text-[#A9D18E]"
                            : "text-stone-400 group-hover:text-[#A9D18E]"
                        }`}
                      />
                      {!isCollapsed && (
                        <span className="truncate flex-1">{item.label}</span>
                      )}
                      {!isCollapsed && item.badge && (
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                            item.badgeVariant === "rose"
                              ? "bg-rose-500/20 text-rose-300"
                              : item.badgeVariant === "amber"
                                ? "bg-amber-500/20 text-amber-300"
                                : "bg-emerald-500/20 text-emerald-300"
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                      {isCollapsed && item.badge && (
                        <span
                          className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full ${
                            item.badgeVariant === "rose"
                              ? "bg-rose-500 ring-2 ring-[#0B2416]"
                              : item.badgeVariant === "amber"
                                ? "bg-amber-400 ring-2 ring-[#0B2416]"
                                : "bg-emerald-400 ring-2 ring-[#0B2416]"
                          }`}
                        />
                      )}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Sidebar Footer Controls */}
        <div
          className={`border-t border-[#173D2A] bg-[#07190F] transition-all duration-300 ${
            isCollapsed ? "p-2.5 space-y-2" : "p-3 space-y-2"
          }`}
        >
          {/* View Public Storefront Link */}
          <Link
            to="/"
            onClick={() => setIsMobileOpen(false)}
            className={`flex items-center gap-2.5 text-xs font-medium text-[#A9D18E] hover:bg-[#173D2A]/60 transition-colors ${
              isCollapsed
                ? "w-10 h-10 mx-auto justify-center rounded-xl p-0"
                : "px-3 py-2 rounded-xl"
            }`}
            title="View Storefront"
          >
            <Store className="w-4 h-4 flex-shrink-0" />
            {!isCollapsed && <span>View Storefront</span>}
          </Link>

          {/* Reset Demo Data */}
          <button
            type="button"
            onClick={handleReset}
            className={`flex items-center gap-2.5 text-xs font-medium text-stone-400 hover:text-amber-300 hover:bg-[#173D2A]/40 transition-colors ${
              isCollapsed
                ? "w-10 h-10 mx-auto justify-center rounded-xl p-0"
                : "w-full px-3 py-2 rounded-xl"
            }`}
            title="Reset Mock Data"
          >
            <RefreshCw className="w-4 h-4 flex-shrink-0" />
            {!isCollapsed && <span>Reset Demo Data</span>}
          </button>

          {/* Admin User Profile & Logout */}
          {isCollapsed ? (
            <div className="pt-2 border-t border-[#173D2A]/60 flex flex-col items-center gap-2">
              <div
                className="w-10 h-10 rounded-full bg-[#173D2A] text-white flex items-center justify-center font-bold text-xs border border-[#A9D18E]/40 shadow-xs cursor-default flex-shrink-0"
                title={`${adminUser?.name || "Admin"} (${adminUser?.roleName || "Super Admin"})`}
              >
                {adminUser?.name ? adminUser.name.charAt(0).toUpperCase() : "A"}
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="w-10 h-10 flex items-center justify-center text-stone-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors cursor-pointer flex-shrink-0"
                title="Sign Out"
                aria-label="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="pt-2 border-t border-[#173D2A]/60 flex items-center justify-between">
              <div className="flex items-center gap-2.5 min-w-0 pr-2">
                <div className="w-9 h-9 rounded-full bg-[#173D2A] text-white flex items-center justify-center font-bold text-xs flex-shrink-0 border border-[#A9D18E]/30 shadow-xs">
                  {adminUser?.name
                    ? adminUser.name.charAt(0).toUpperCase()
                    : "A"}
                </div>
                <div className="truncate">
                  <div className="text-xs font-semibold text-white truncate">
                    {adminUser?.name || "Admin"}
                  </div>
                  <div className="text-[10px] text-[#A9D18E] capitalize truncate">
                    {adminUser?.roleName || "Super Admin"}
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={handleLogout}
                className="p-2 text-stone-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors flex-shrink-0 cursor-pointer"
                title="Sign Out"
                aria-label="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
};
