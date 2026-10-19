/**
 * Friends the customer has invited, with where each one is in the journey and the reward status.
 */
import React, { useState, useMemo } from "react";
import { Search, CheckCircle2, Clock, ShoppingBag, UserCheck, XCircle, X } from "lucide-react";
import { useReferrals } from "../../context/ReferralContext";
import { formatINR, formatDate } from "../../utils/formatters";

const STATUS = {
  signed_up: { label: "Signed up", cls: "bg-sky-100 text-sky-800", Icon: UserCheck },
  ordered: { label: "Reward pending", cls: "bg-amber-100 text-amber-800", Icon: Clock },
  rewarded: { label: "Reward credited", cls: "bg-emerald-100 text-emerald-800", Icon: CheckCircle2 },
  cancelled: { label: "No reward", cls: "bg-stone-100 text-stone-600", Icon: XCircle },
  clawed_back: { label: "Reward reversed", cls: "bg-rose-100 text-rose-800", Icon: XCircle },
};

const FILTERS = [
  { id: "all", label: "All" },
  { id: "rewarded", label: "Credited" },
  { id: "ordered", label: "Pending" },
  { id: "signed_up", label: "Signed up" },
];

const Badge = ({ status }) => {
  const s = STATUS[status] || STATUS.signed_up;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${s.cls}`}>
      <s.Icon size={12} />
      <span>{s.label}</span>
    </span>
  );
};

const detail = (r) => {
  if (r.status === "ordered") return r.releasesAt ? `Credit on ${formatDate(r.releasesAt)}` : "After the order is delivered";
  if (r.status === "rewarded") return r.rewardedAt ? `Credited ${formatDate(r.rewardedAt)}` : "Credited";
  return r.note || "No order yet";
};

export const ReferralHistory = () => {
  const { dashboardData, dashboardLoaded, settings } = useReferrals();
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");

  const rows = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return (dashboardData.referrals || []).filter(
      (r) => (statusFilter === "all" || r.status === statusFilter) && (!q || `${r.friend} ${r.email}`.toLowerCase().includes(q))
    );
  }, [dashboardData.referrals, statusFilter, searchTerm]);

  return (
    <div className="bg-white rounded-3xl border border-[#E5E7DF] p-6 sm:p-8 shadow-xs space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#E5E7DF]">
        <div>
          <h4 className="font-heading tracking-tight text-lg font-bold text-[#171A17]">Your Referrals</h4>
          <p className="text-xs text-stone-500 mt-0.5">Friends who joined with your code and the rewards they earned you. Updates automatically.</p>
        </div>
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {FILTERS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setStatusFilter(tab.id)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                statusFilter === tab.id ? "bg-[#173D2A] text-white shadow-xs" : "bg-stone-100 text-stone-600 hover:bg-stone-200/70"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="relative max-w-sm">
        <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-400" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Search by friend name..."
          className="w-full pl-9 pr-8 py-2 text-xs bg-stone-50 border border-stone-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-[#173D2A] focus:bg-white transition-all"
        />
        {searchTerm && (
          <button type="button" onClick={() => setSearchTerm("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700">
            <X size={14} />
          </button>
        )}
      </div>

      {rows.length === 0 ? (
        <div className="text-center py-12 px-4 bg-stone-50/50 rounded-2xl border border-dashed border-stone-200">
          <ShoppingBag size={32} className="mx-auto text-stone-300 mb-2" />
          <h5 className="text-xs font-bold text-stone-700">{dashboardLoaded ? "No referrals yet" : "Loading your referrals…"}</h5>
          <p className="text-xs text-stone-500 mt-1 max-w-sm mx-auto">
            {searchTerm || statusFilter !== "all"
              ? "Try clearing the filter or search."
              : "Share your link. When a friend joins and places their first order, you earn store credit."}
          </p>
        </div>
      ) : (
        <div className="divide-y divide-stone-100">
          {rows.map((r) => (
            <div key={r.id} className="py-3.5 flex flex-wrap items-center justify-between gap-3 text-xs">
              <div className="min-w-0">
                <span className="font-semibold text-stone-900 block">{r.friend}</span>
                <span className="text-[10px] text-stone-400 font-mono">{r.email} &bull; joined {formatDate(r.createdAt)}</span>
              </div>
              <span className="text-[11px] text-stone-500 flex-1 min-w-[140px]">{detail(r)}</span>
              <span className="font-bold text-[#173D2A]">
                {r.reward > 0 && ["ordered", "rewarded"].includes(r.status) ? `+${formatINR(r.reward)}` : "—"}
              </span>
              <Badge status={r.status} />
            </div>
          ))}
        </div>
      )}
      <p className="text-[10px] text-stone-400">Rewards are paid {settings.holdDays} days after delivery and reversed if the order is cancelled or returned.</p>
    </div>
  );
};
