import React from "react";
import { Link } from "react-router-dom";
import {
  IndianRupee,
  ShoppingBag,
  Users,
  Package,
  Clock,
  AlertTriangle,
  Star,
  LifeBuoy,
  ArrowUpRight,
  Plus,
  RefreshCw,
  Eye,
  CheckCircle2,
  XCircle,
  TrendingUp,
  FileText,
} from "lucide-react";
import { useAdmin } from "../../context/AdminContext";
import { AdminCard, StatCard } from "../../components/admin/common/AdminCard";
import { formatCurrency, formatDate } from "../../utils/formatters";

export const DashboardPage = () => {
  const adminContext = useAdmin();
  const kpis = adminContext?.kpis || {
    totalRevenue: 0,
    totalOrders: 0,
    totalCustomers: 0,
    totalProducts: 0,
    pendingOrders: 0,
    lowStockCount: 0,
    pendingReviews: 0,
    openTickets: 0,
  };
  const orders = adminContext?.orders || [];
  const products = adminContext?.products || [];
  const reviews = adminContext?.reviews || [];
  const updateOrderStatus = adminContext?.updateOrderStatus || (() => {});
  const updateProductStock = adminContext?.updateProductStock || (() => {});
  const moderateReview = adminContext?.moderateReview || (() => {});

  const recentOrders = orders.slice(0, 5);
  const lowStockProducts = products
    .filter(
      (p) => (p.stock ?? p.stockQuantity ?? 0) <= (p.reorderThreshold || 10),
    )
    .slice(0, 4);
  const pendingReviews = reviews
    .filter((r) => (r.status || "").toLowerCase() === "pending")
    .slice(0, 4);

  // Status color pill helper
  const getStatusBadge = (status) => {
    switch (status) {
      case "Delivered":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "Dispatched":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "Processing":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "Cancelled":
        return "bg-rose-100 text-rose-800 border-rose-200";
      default:
        return "bg-stone-100 text-stone-800 border-stone-200";
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 font-sans tracking-tight">
            Store Performance & Operations
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Real-time Ayurvedic catalog health, order fulfillments, and revenue
            metrics.
          </p>
        </div>

        {/* Quick action buttons */}
        <div className="flex items-center gap-2">
          <Link
            to="/admin/products/new"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#173D2A] text-white hover:bg-[#0B2416] text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Product</span>
          </Link>
          <Link
            to="/admin/orders"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 text-xs font-semibold shadow-xs transition-colors"
          >
            <span>View All Orders</span>
          </Link>
        </div>
      </div>

      {/* Top 8 KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Gross Revenue"
          value={formatCurrency(kpis.totalRevenue)}
          change="18.4%"
          isPositive={true}
          subtitle="vs last month"
          icon={IndianRupee}
          color="emerald"
        />

        <StatCard
          title="Total Customer Orders"
          value={kpis.totalOrders}
          change="12.2%"
          isPositive={true}
          subtitle="completed & active"
          icon={ShoppingBag}
          color="blue"
        />

        <StatCard
          title="Registered Customers"
          value={kpis.totalCustomers}
          change="8.6%"
          isPositive={true}
          subtitle="verified buyers"
          icon={Users}
          color="stone"
        />

        <StatCard
          title="Active Products in Catalog"
          value={kpis.totalProducts}
          subtitle="herbal SKUs published"
          icon={Package}
          color="stone"
        />

        <StatCard
          title="Pending Fulfillment"
          value={kpis.pendingOrders}
          badgeText="Requires Action"
          subtitle="unfulfilled orders"
          icon={Clock}
          color={kpis.pendingOrders > 0 ? "amber" : "stone"}
        />

        <StatCard
          title="Low Stock Inventory"
          value={kpis.lowStockCount}
          badgeText={kpis.lowStockCount > 0 ? "Restock Needed" : "Healthy"}
          subtitle="SKUs ≤ safety threshold"
          icon={AlertTriangle}
          color={kpis.lowStockCount > 0 ? "rose" : "emerald"}
        />

        <StatCard
          title="Pending Reviews"
          value={kpis.pendingReviews}
          badgeText="Moderation"
          subtitle="new customer ratings"
          icon={Star}
          color="amber"
        />

        <StatCard
          title="Open Support Requests"
          value={kpis.openTickets}
          subtitle="tickets & enquiries"
          icon={LifeBuoy}
          color="stone"
        />
      </div>

      {/* Interactive Visual Analytics Charts (SVG) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Revenue & Order Analytics Chart */}
        <div className="lg:col-span-2">
          <AdminCard
            title="Monthly Sales & Growth Trajectory"
            subtitle="Gross monthly revenue from online Ayurvedic remedies (Last 6 Months)"
            action={
              <Link
                to="/admin/reports"
                className="text-xs font-semibold text-emerald-800 hover:underline inline-flex items-center gap-1"
              >
                <span>Full Reports</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            }
          >
            {/* SVG Visual Area Chart */}
            <div className="pt-2">
              <div className="h-64 w-full flex flex-col justify-between">
                <svg
                  viewBox="0 0 600 200"
                  className="w-full h-48 overflow-visible"
                >
                  <defs>
                    <linearGradient
                      id="revenueGrad"
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="0%"
                        stopColor="#173D2A"
                        stopOpacity="0.35"
                      />
                      <stop
                        offset="100%"
                        stopColor="#173D2A"
                        stopOpacity="0.0"
                      />
                    </linearGradient>
                  </defs>

                  {/* Horizontal grid guide lines */}
                  <line
                    x1="0"
                    y1="40"
                    x2="600"
                    y2="40"
                    stroke="#E5E7DF"
                    strokeDasharray="3 3"
                  />
                  <line
                    x1="0"
                    y1="90"
                    x2="600"
                    y2="90"
                    stroke="#E5E7DF"
                    strokeDasharray="3 3"
                  />
                  <line
                    x1="0"
                    y1="140"
                    x2="600"
                    y2="140"
                    stroke="#E5E7DF"
                    strokeDasharray="3 3"
                  />
                  <line x1="0" y1="190" x2="600" y2="190" stroke="#E5E7DF" />

                  {/* Shaded Area fill */}
                  <polygon
                    points="0,180 80,150 180,135 280,110 380,85 480,55 580,30 580,190 0,190"
                    fill="url(#revenueGrad)"
                  />

                  {/* Trajectory Stroke */}
                  <polyline
                    fill="none"
                    stroke="#173D2A"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    points="0,180 80,150 180,135 280,110 380,85 480,55 580,30"
                  />

                  {/* Data Points */}
                  {[
                    { cx: 80, cy: 150, val: "₹1.4L" },
                    { cx: 180, cy: 135, val: "₹1.8L" },
                    { cx: 280, cy: 110, val: "₹2.3L" },
                    { cx: 380, cy: 85, val: "₹2.9L" },
                    { cx: 480, cy: 55, val: "₹3.6L" },
                    { cx: 580, cy: 30, val: "₹4.2L" },
                  ].map((pt, i) => (
                    <g key={i} className="cursor-pointer group">
                      <circle
                        cx={pt.cx}
                        cy={pt.cy}
                        r="5"
                        fill="#FFFFFF"
                        stroke="#173D2A"
                        strokeWidth="3"
                        className="transition-transform duration-200 group-hover:scale-125"
                      />
                      <text
                        x={pt.cx}
                        y={pt.cy - 10}
                        textAnchor="middle"
                        className="text-[11px] font-bold fill-stone-700"
                      >
                        {pt.val}
                      </text>
                    </g>
                  ))}
                </svg>

                {/* X Axis Month Labels */}
                <div className="flex justify-between px-2 text-xs font-semibold text-stone-500 pt-3 border-t border-stone-100">
                  <span>May</span>
                  <span>Jun</span>
                  <span>Jul</span>
                  <span>Aug</span>
                  <span>Sep</span>
                  <span>Oct (Current)</span>
                </div>
              </div>
            </div>
          </AdminCard>
        </div>

        {/* Category Share & Ayurvedic Dosha Breakdown */}
        <div>
          <AdminCard
            title="Sales by Category"
            subtitle="Revenue contribution across herbal lines"
          >
            <div className="space-y-4 pt-2">
              {[
                {
                  name: "Digestive Health & Gut",
                  pct: 36,
                  rev: "₹1,51,200",
                  color: "bg-[#173D2A]",
                },
                {
                  name: "Immunity & Rasayana",
                  pct: 28,
                  rev: "₹1,17,600",
                  color: "bg-[#386B40]",
                },
                {
                  name: "Stress Relief & Sleep",
                  pct: 18,
                  rev: "₹75,600",
                  color: "bg-[#A9D18E]",
                },
                {
                  name: "Herbal Skincare & Oils",
                  pct: 12,
                  rev: "₹50,400",
                  color: "bg-amber-500",
                },
                {
                  name: "Joint Care & Mobility",
                  pct: 6,
                  rev: "₹25,200",
                  color: "bg-stone-400",
                },
              ].map((cat, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-stone-800">
                      {cat.name}
                    </span>
                    <span className="text-stone-500">
                      {cat.rev} ({cat.pct}%)
                    </span>
                  </div>
                  <div className="w-full bg-stone-100 h-2.5 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${cat.color}`}
                      style={{ width: `${cat.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 pt-4 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-600" /> Top
                Performer: Gut Health
              </span>
              <Link
                to="/admin/categories"
                className="font-semibold text-emerald-800 hover:underline"
              >
                Manage Categories →
              </Link>
            </div>
          </AdminCard>
        </div>
      </div>

      {/* Two Column Section: Recent Orders & Operational Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Orders Table */}
        <div className="lg:col-span-2">
          <AdminCard
            title="Recent Customer Orders"
            subtitle="Latest orders received from customer storefront"
            action={
              <Link
                to="/admin/orders"
                className="text-xs font-semibold text-emerald-800 hover:underline inline-flex items-center gap-1"
              >
                <span>View All ({orders.length})</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            }
            noPadding={true}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-stone-700">
                <thead className="bg-stone-50/80 text-[11px] font-semibold uppercase tracking-wider text-stone-500 border-b border-stone-200">
                  <tr>
                    <th className="px-4 py-3">Order ID</th>
                    <th className="px-4 py-3">Customer</th>
                    <th className="px-4 py-3">Date</th>
                    <th className="px-4 py-3">Amount</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Quick Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {recentOrders.map((ord) => (
                    <tr
                      key={ord.id}
                      className="hover:bg-stone-50/60 transition-colors"
                    >
                      <td className="px-4 py-3 font-semibold text-stone-900">
                        <Link
                          to={`/admin/orders/${ord.id}`}
                          className="hover:text-emerald-800 underline decoration-stone-300"
                        >
                          {ord.id}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-stone-900">
                          {ord.customerName}
                        </div>
                        <div className="text-[11px] text-stone-500">
                          {ord.email}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-stone-500">
                        {formatDate(ord.date || ord.orderDate)}
                      </td>
                      <td className="px-4 py-3 font-semibold text-stone-900">
                        {formatCurrency(ord.totalAmount || ord.total)}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold border ${getStatusBadge(
                            ord.orderStatus || ord.status,
                          )}`}
                        >
                          {ord.orderStatus || ord.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <select
                          value={ord.orderStatus || ord.status}
                          onChange={(e) =>
                            updateOrderStatus(ord.id, e.target.value)
                          }
                          className="px-2 py-1 text-xs rounded border border-stone-200 bg-white hover:border-stone-300 focus:ring-[#173D2A] focus:border-[#173D2A]"
                        >
                          <option value="Pending">Pending</option>
                          <option value="Processing">Processing</option>
                          <option value="Dispatched">Dispatched</option>
                          <option value="Delivered">Delivered</option>
                          <option value="Cancelled">Cancelled</option>
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </AdminCard>
        </div>

        {/* Low Stock Inventory Alerts */}
        <div>
          <AdminCard
            title="Low Inventory Alerts"
            subtitle="Products requiring urgent warehouse reorder"
            action={
              <Link
                to="/admin/inventory"
                className="text-xs font-semibold text-emerald-800 hover:underline inline-flex items-center gap-1"
              >
                <span>Stock Control</span>
                <ArrowUpRight className="w-3.5 h-3.5" />
              </Link>
            }
          >
            {lowStockProducts.length === 0 ? (
              <div className="py-8 text-center text-xs text-stone-400">
                All inventory levels are currently above minimum safety
                thresholds.
              </div>
            ) : (
              <div className="space-y-3.5">
                {lowStockProducts.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between p-2.5 rounded-xl border border-stone-100 bg-stone-50/50 hover:bg-stone-100/60 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <img
                        src={
                          p.image ||
                          (Array.isArray(p.images) ? p.images[0] : "") ||
                          "/images/ProductImages/Ashuwaganda.png"
                        }
                        alt={p.title || p.name || "Product"}
                        className="w-10 h-10 rounded-lg object-contain border border-stone-200"
                      />
                      <div>
                        <div className="font-semibold text-stone-900 text-xs line-clamp-1">
                          {p.title || p.name || "Untitled Product"}
                        </div>
                        <div className="text-[11px] text-stone-500">
                          SKU: {p.sku || "N/A"} •{" "}
                          <span className="font-bold text-rose-600">
                            Only {p.stock ?? p.stockQuantity ?? 0} units left!
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() =>
                          updateProductStock(
                            p.id,
                            p.stock + 20,
                            "Reorder Received",
                          )
                        }
                        className="px-2 py-1 text-[11px] font-bold rounded bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                        title="Add +20 units immediately"
                      >
                        +20 Stock
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </AdminCard>
        </div>
      </div>

      {/* Bottom Section: Customer Reviews Pending Moderation & Quick Shortcuts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Pending Reviews Moderation */}
        <div className="lg:col-span-2">
          <AdminCard
            title="Customer Reviews Moderation Queue"
            subtitle="Customer feedback awaiting public approval"
            action={
              <Link
                to="/admin/reviews"
                className="text-xs font-semibold text-emerald-800 hover:underline"
              >
                Manage All Reviews →
              </Link>
            }
          >
            {pendingReviews.length === 0 ? (
              <div className="py-6 text-center text-xs text-stone-400">
                No customer reviews pending moderation. All reviews are up to
                date!
              </div>
            ) : (
              <div className="space-y-3">
                {pendingReviews.map((rev) => (
                  <div
                    key={rev.id}
                    className="p-3 rounded-xl border border-stone-200/80 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-stone-900">
                          {rev.userName}
                        </span>
                        <span className="text-[11px] text-stone-400">
                          on{" "}
                          <span className="font-medium text-stone-700">
                            {rev.productTitle}
                          </span>
                        </span>
                        <div className="flex text-amber-400 text-xs">
                          {"★".repeat(rev.rating)}
                        </div>
                      </div>
                      <p className="text-xs text-stone-600 italic">
                        "{rev.comment}"
                      </p>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <button
                        type="button"
                        onClick={() => moderateReview(rev.id, "Approved")}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Approve</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => moderateReview(rev.id, "Rejected")}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200 transition-colors"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Reject</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </AdminCard>
        </div>

        {/* Quick Operational Shortcuts */}
        <div>
          <AdminCard
            title="Quick Shortcuts"
            subtitle="Fast administrative access"
          >
            <div className="grid grid-cols-2 gap-2.5 pt-1">
              <Link
                to="/admin/products/new"
                className="p-3 rounded-xl border border-stone-200 hover:border-emerald-600 hover:bg-emerald-50/40 transition-all text-center group"
              >
                <Package className="w-5 h-5 mx-auto mb-1 text-stone-600 group-hover:text-emerald-800" />
                <span className="text-xs font-semibold text-stone-800 block">
                  Add Product
                </span>
              </Link>

              <Link
                to="/admin/homepage-builder"
                className="p-3 rounded-xl border border-stone-200 hover:border-emerald-600 hover:bg-emerald-50/40 transition-all text-center group"
              >
                <TrendingUp className="w-5 h-5 mx-auto mb-1 text-stone-600 group-hover:text-emerald-800" />
                <span className="text-xs font-semibold text-stone-800 block">
                  Homepage Builder
                </span>
              </Link>

              <Link
                to="/admin/coupons"
                className="p-3 rounded-xl border border-stone-200 hover:border-emerald-600 hover:bg-emerald-50/40 transition-all text-center group"
              >
                <Star className="w-5 h-5 mx-auto mb-1 text-stone-600 group-hover:text-emerald-800" />
                <span className="text-xs font-semibold text-stone-800 block">
                  Create Coupon
                </span>
              </Link>

              <Link
                to="/admin/reports"
                className="p-3 rounded-xl border border-stone-200 hover:border-emerald-600 hover:bg-emerald-50/40 transition-all text-center group"
              >
                <FileText className="w-5 h-5 mx-auto mb-1 text-stone-600 group-hover:text-emerald-800" />
                <span className="text-xs font-semibold text-stone-800 block">
                  Export Reports
                </span>
              </Link>
            </div>

            <div className="mt-4 p-3 rounded-xl bg-amber-50/80 border border-amber-200/80 text-xs text-amber-900">
              <span className="font-semibold block mb-0.5">
                Admin Pair Sync Active
              </span>
              Changes to inventory or publishing statuses synchronize
              immediately with the public Divyam Ayurveda store.
            </div>
          </AdminCard>
        </div>
      </div>
    </div>
  );
};
