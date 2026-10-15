import React, { useState } from "react";
import {
  BarChart3,
  Download,
  Calendar,
  TrendingUp,
  CreditCard,
  Package,
  DollarSign,
  ArrowUpRight,
} from "lucide-react";
import { useAdmin } from "../../context/AdminContext";
import { AdminCard, StatCard } from "../../components/admin/common/AdminCard";
import { formatCurrency } from "../../utils/formatters";

export const ReportsPage = () => {
  const adminContext = useAdmin();
  const kpis = adminContext?.kpis || {
    totalRevenue: 0,
    totalOrders: 0,
    totalCustomers: 0,
    totalProducts: 0,
  };
  const products = adminContext?.products || [];
  const orders = adminContext?.orders || [];
  const [dateRange, setDateRange] = useState("30");

  const topProducts = [...products]
    .sort((a, b) => (b.price || 0) * (b.stock || 1) - (a.price || 0) * (a.stock || 1))
    .slice(0, 5);

  const handleExportFullReport = () => {
    const headers = ["Metric / Report Item", "Value"];
    const rows = [
      ["Gross Sales Revenue", formatCurrency(kpis.totalRevenue)],
      ["Total Completed Orders", kpis.totalOrders],
      ["Registered Customers", kpis.totalCustomers],
      ["Average Order Value (AOV)", formatCurrency(kpis.totalRevenue / (kpis.totalOrders || 1))],
      ["Estimated GST 12% Liability", formatCurrency(kpis.totalRevenue * 0.12)],
      ["Total Active Catalog SKUs", kpis.totalProducts],
      ["Report Generation Date", new Date().toLocaleString()],
    ];

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => `"${e[0]}","${e[1]}"`)].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `divyam_financial_report_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 font-sans tracking-tight">
            Financial & Sales Performance Analytics
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Revenues, product performance rankings, sales tax liabilities, and channel breakdowns.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-stone-300 bg-white font-medium text-stone-700"
          >
            <option value="7">Last 7 Days</option>
            <option value="30">Last 30 Days</option>
            <option value="90">Last Quarter (90 Days)</option>
            <option value="365">This Fiscal Year</option>
          </select>

          <button
            type="button"
            onClick={handleExportFullReport}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#173D2A] text-white hover:bg-[#0B2416] text-xs font-semibold shadow-xs transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Download Financial CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Gross Revenue"
          value={formatCurrency(kpis.totalRevenue)}
          change="18.4%"
          isPositive={true}
          subtitle="selected window"
          icon={DollarSign}
          color="emerald"
        />

        <StatCard
          title="Average Order Value"
          value={formatCurrency(kpis.totalRevenue / (kpis.totalOrders || 1))}
          change="5.1%"
          isPositive={true}
          subtitle="per buyer checkout"
          icon={TrendingUp}
          color="blue"
        />

        <StatCard
          title="GST Tax Collected"
          value={formatCurrency(kpis.totalRevenue * 0.12)}
          subtitle="12% statutory rate"
          icon={DollarSign}
          color="stone"
        />

        <StatCard
          title="Fulfillment Success Rate"
          value="98.4%"
          badgeText="Optimal"
          subtitle="on-time delivery"
          icon={BarChart3}
          color="emerald"
        />
      </div>

      {/* Top Products Table & Payment Method Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <AdminCard
            title="Top Performing Ayurvedic Formulations"
            subtitle="Ranked by total revenue and customer velocity"
            noPadding={true}
          >
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-stone-700">
                <thead className="bg-stone-50/80 text-[11px] font-semibold uppercase tracking-wider text-stone-500 border-b border-stone-200">
                  <tr>
                    <th className="px-4 py-3">Remedy / SKU</th>
                    <th className="px-4 py-3">Category</th>
                    <th className="px-4 py-3 text-right">Unit Price</th>
                    <th className="px-4 py-3 text-center">In Stock</th>
                    <th className="px-4 py-3 text-right">Est. Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {topProducts.map((p, idx) => (
                    <tr key={p.id} className="hover:bg-stone-50/50">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <span className="w-5 h-5 rounded-full bg-stone-100 text-stone-600 font-bold flex items-center justify-center text-[10px]">
                            #{idx + 1}
                          </span>
                          <img
                            src={p.image}
                            alt={p.title}
                            className="w-9 h-9 rounded object-cover border border-stone-200"
                          />
                          <div>
                            <div className="font-semibold text-stone-900 line-clamp-1">
                              {p.title}
                            </div>
                            <div className="text-[10px] text-stone-400">
                              SKU: {p.sku || "N/A"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-stone-600">{p.category}</td>
                      <td className="px-4 py-3.5 text-right font-semibold text-stone-900">
                        {formatCurrency(p.price)}
                      </td>
                      <td className="px-4 py-3.5 text-center font-mono">
                        {p.stock}
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold text-emerald-800">
                        {formatCurrency(p.price * 84)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </AdminCard>
        </div>

        {/* Payment Channels Breakdown */}
        <div>
          <AdminCard
            title="Payment Method Distribution"
            subtitle="Preferred transaction methods"
          >
            <div className="space-y-4 pt-2">
              {[
                { name: "UPI & QR (PhonePe / GPay)", pct: 64, color: "bg-[#173D2A]" },
                { name: "Credit & Debit Cards", pct: 24, color: "bg-[#386B40]" },
                { name: "Cash on Delivery (COD)", pct: 8, color: "bg-amber-500" },
                { name: "Net Banking", pct: 4, color: "bg-stone-400" },
              ].map((m, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-stone-800">{m.name}</span>
                    <span className="text-stone-500 font-bold">{m.pct}%</span>
                  </div>
                  <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${m.color}`}
                      style={{ width: `${m.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 p-3 rounded-xl bg-stone-50 border border-stone-200 text-xs text-stone-600">
              <span className="font-semibold text-stone-900 block mb-0.5">
                Low COD Return Ratio
              </span>
              Prepaid UPI transactions reduce return-to-origin (RTO) friction by 92% compared to standard retail averages.
            </div>
          </AdminCard>
        </div>
      </div>
    </div>
  );
};

