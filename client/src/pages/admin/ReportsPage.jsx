import React from "react";
import { Download, TrendingUp, DollarSign, Undo2, Clock, Receipt, Truck, ShoppingBag } from "lucide-react";
import { AdminCard, StatCard } from "../../components/admin/common/AdminCard";
import { RevenueFilters } from "../../components/admin/common/RevenueFilters";
import { useRevenueReport, RANGE_OPTIONS } from "../../hooks/useRevenueReport";
import { formatCurrency } from "../../utils/formatters";

const BAR_COLORS = ["bg-[#173D2A]", "bg-[#386B40]", "bg-amber-500", "bg-stone-400"];
const growthProps = (g) => (g == null ? {} : { change: `${Math.abs(g)}%`, isPositive: g >= 0 });
const csvCell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;

export const ReportsPage = () => {
  const { report, error, loading, days, setDays, basis, setBasis } = useRevenueReport({ months: 12 });
  const s = report?.summary;
  const periodLabel = RANGE_OPTIONS.find((r) => r.value === days)?.label || "";

  const handleExportFullReport = () => {
    if (!report) return;
    const rows = [
      ["Revenue basis", `${report.basisLabel} (${report.basisDescription})`],
      ["Period", periodLabel],
      ["Gross revenue (payment received)", s.grossRevenue],
      ["Refunds", s.refunds],
      ["Net revenue", s.netRevenue],
      ["Paid orders", s.orders],
      ["Average order value", s.averageOrderValue],
      ["GST included in net revenue", s.taxIncluded],
      ["Pending collection (not counted)", s.pendingCollection],
      ["Orders awaiting payment", s.pendingOrders],
      ["Cancelled order value", s.cancelledValue],
      ["Delivery success rate %", s.deliverySuccessRate ?? "n/a"],
      [],
      ["Month", "Gross", "Refunds", "Net", "Orders"],
      ...report.trend.map((t) => [t.month, t.gross, t.refunds, t.net, t.orders]),
      [],
      ["Top products", "Units", "Net revenue"],
      ...report.topProducts.map((p) => [p.name, p.units, p.net]),
      [],
      ["Report generated", new Date().toLocaleString()],
    ];
    const blob = new Blob([rows.map((r) => r.map(csvCell).join(",")).join("\r\n")], { type: "text/csv" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `divyam_financial_report_${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
  };

  const maxTrend = Math.max(1, ...(report?.trend || []).map((t) => t.gross));

  return (
    <div className="space-y-6 pb-12">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 font-sans tracking-tight">Financial &amp; Sales Performance Analytics</h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">Revenue is counted when payment is received, and refunds are deducted. Pending payments are shown separately.</p>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
          <RevenueFilters report={report} days={days} setDays={setDays} basis={basis} setBasis={setBasis} />
          <button
            type="button"
            onClick={handleExportFullReport}
            disabled={!report}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#173D2A] text-white hover:bg-[#0B2416] text-xs font-semibold shadow-xs transition-colors disabled:opacity-60"
          >
            <Download className="w-4 h-4" />
            <span>Download Financial CSV</span>
          </button>
        </div>
      </div>

      <div className="text-xs text-stone-600 p-4 rounded-xl border border-stone-200 bg-white">
        <b className="text-stone-900">{report?.basisLabel || "…"}:</b> {report?.basisDescription}
      </div>
      {error && <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-2.5">{error}</p>}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Net Revenue"
          value={formatCurrency(s?.netRevenue ?? 0)}
          {...growthProps(s?.netGrowthPercent)}
          subtitle={days === "all" ? "all time, after refunds" : "vs previous period"}
          icon={DollarSign}
          color="emerald"
        />
        <StatCard title="Gross Received" value={formatCurrency(s?.grossRevenue ?? 0)} subtitle={`${s?.orders ?? 0} paid order(s)`} icon={ShoppingBag} color="blue" />
        <StatCard
          title="Refunds"
          value={formatCurrency(s?.refunds ?? 0)}
          subtitle={`${s?.refundedOrders ?? 0} refunded order(s)`}
          icon={Undo2}
          color={s?.refunds > 0 ? "rose" : "stone"}
        />
        <StatCard
          title="Pending Collection"
          value={formatCurrency(s?.pendingCollection ?? 0)}
          subtitle={`${s?.pendingOrders ?? 0} order(s) awaiting payment`}
          icon={Clock}
          color={s?.pendingCollection > 0 ? "amber" : "stone"}
        />
        <StatCard title="Average Order Value" value={formatCurrency(s?.averageOrderValue ?? 0)} subtitle="per paid order" icon={TrendingUp} color="blue" />
        <StatCard title="GST Included" value={formatCurrency(s?.taxIncluded ?? 0)} subtitle="tax within net revenue (from orders)" icon={Receipt} color="stone" />
        <StatCard
          title="Delivery Success Rate"
          value={s?.deliverySuccessRate == null ? "—" : `${s.deliverySuccessRate}%`}
          subtitle="delivered vs cancelled / returned"
          icon={Truck}
          color="emerald"
        />
        <StatCard title="Cancelled Orders" value={formatCurrency(s?.cancelledValue ?? 0)} subtitle={`${s?.cancelledOrders ?? 0} order(s), never counted`} icon={Undo2} color="stone" />
      </div>

      <AdminCard title="Monthly Revenue" subtitle="Gross received vs refunds, by month the order was placed">
        <div className="space-y-2.5 pt-1">
          {(report?.trend || []).map((t) => (
            <div key={t.month} className="grid grid-cols-[64px_1fr_auto] items-center gap-3 text-xs">
              <span className="font-semibold text-stone-600">{t.label} {t.month.slice(2, 4)}</span>
              <div className="h-3 rounded-full bg-stone-100 overflow-hidden flex">
                <div className="h-full bg-[#173D2A]" style={{ width: `${((t.gross - t.refunds) / maxTrend) * 100}%` }} />
                <div className="h-full bg-rose-400" style={{ width: `${(t.refunds / maxTrend) * 100}%` }} />
              </div>
              <span className="font-bold text-stone-900 w-40 text-right">
                {formatCurrency(t.net)} <span className="font-normal text-stone-400">({t.orders})</span>
              </span>
            </div>
          ))}
          <p className="text-[11px] text-stone-400 pt-1">Green = net revenue, red = refunded, (n) = paid orders.</p>
        </div>
      </AdminCard>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <AdminCard title="Top Selling Products" subtitle="Ranked by net revenue (refunds deducted) in the selected period" noPadding={true}>
            {report?.topProducts?.length ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-stone-700">
                  <thead className="bg-stone-50/80 text-[11px] font-semibold uppercase tracking-wider text-stone-500 border-b border-stone-200">
                    <tr>
                      <th className="px-4 py-3">Product</th>
                      <th className="px-4 py-3 text-center">Units sold</th>
                      <th className="px-4 py-3 text-center">Orders</th>
                      <th className="px-4 py-3 text-right">Net revenue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {report.topProducts.map((p, idx) => (
                      <tr key={`${p.name}-${idx}`} className="hover:bg-stone-50/50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <span className="w-5 h-5 rounded-full bg-stone-100 text-stone-600 font-bold flex items-center justify-center text-[10px]">#{idx + 1}</span>
                            {p.image && <img src={p.image} alt="" className="w-9 h-9 rounded object-cover border border-stone-200" />}
                            <span className="font-semibold text-stone-900 line-clamp-1">{p.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center font-mono">{p.units}</td>
                        <td className="px-4 py-3 text-center font-mono">{p.orders}</td>
                        <td className="px-4 py-3 text-right font-bold text-emerald-800">{formatCurrency(p.net)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="p-8 text-center text-xs text-stone-500">{loading ? "Loading…" : "No paid orders in this period."}</p>
            )}
          </AdminCard>
        </div>

        <div className="space-y-6">
          <AdminCard title="Payment Method Split" subtitle="Share of net revenue">
            <div className="space-y-4 pt-2">
              {(report?.paymentMethods || []).map((m, idx) => (
                <div key={m.method} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-stone-800">{m.method}</span>
                    <span className="text-stone-500 font-bold">{formatCurrency(m.net)} ({m.percent}%)</span>
                  </div>
                  <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${BAR_COLORS[idx % BAR_COLORS.length]}`} style={{ width: `${m.percent}%` }} />
                  </div>
                </div>
              ))}
              {!report?.paymentMethods?.length && <p className="text-xs text-stone-500">No paid orders in this period.</p>}
            </div>
          </AdminCard>

          <AdminCard title="Sales by Category" subtitle="Share of net revenue">
            <div className="space-y-4 pt-2">
              {(report?.categories || []).slice(0, 6).map((c, idx) => (
                <div key={c.name} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-stone-800">{c.name}</span>
                    <span className="text-stone-500 font-bold">{formatCurrency(c.net)} ({c.percent}%)</span>
                  </div>
                  <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full ${BAR_COLORS[idx % BAR_COLORS.length]}`} style={{ width: `${c.percent}%` }} />
                  </div>
                </div>
              ))}
              {!report?.categories?.length && <p className="text-xs text-stone-500">No paid orders in this period.</p>}
            </div>
          </AdminCard>
        </div>
      </div>
    </div>
  );
};
