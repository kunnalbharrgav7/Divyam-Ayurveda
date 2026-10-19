import React, { useState, useMemo, useEffect } from "react";
import { Gift, Search, Save, Users, ShoppingBag, IndianRupee, AlertTriangle, RefreshCw, Download, Clock, CheckCircle2 } from "lucide-react";
import { useAdmin } from "../../context/AdminContext";
import { AdminCard } from "../../components/admin/common/AdminCard";
import { formatCurrency, formatDate } from "../../utils/formatters";

const STATUS = {
  signed_up: { label: "Signed up", cls: "bg-sky-100 text-sky-800" },
  ordered: { label: "Reward on hold", cls: "bg-amber-100 text-amber-800" },
  rewarded: { label: "Rewarded", cls: "bg-emerald-100 text-emerald-800" },
  cancelled: { label: "Cancelled", cls: "bg-stone-100 text-stone-600" },
  clawed_back: { label: "Clawed back", cls: "bg-rose-100 text-rose-800" },
  pending: { label: "Pending (legacy)", cls: "bg-stone-100 text-stone-600" },
  qualified: { label: "Qualified (legacy)", cls: "bg-stone-100 text-stone-600" },
};
const FLAG_LABEL = { same_phone: "Same phone as referrer", same_address: "Same address as referrer" };

const FILTERS = [
  { id: "all", label: "All" },
  { id: "ordered", label: "On hold" },
  { id: "rewarded", label: "Rewarded" },
  { id: "signed_up", label: "Signed up" },
  { id: "flagged", label: "Flagged" },
  { id: "closed", label: "Closed" },
];

const formFromSettings = (s) => ({
  enabled: s?.enabled ?? true,
  refereeDiscountType: s?.refereeDiscountType ?? "percentage",
  refereeDiscountPercent: s?.refereeDiscountPercent ?? 10,
  refereeDiscountCap: s?.refereeDiscountCap ?? 250,
  minOrderValue: s?.minOrderValue ?? 499,
  referrerRewardType: s?.referrerRewardType === "percent" ? "percent" : "fixed",
  referrerReward: s?.referrerReward ?? 100,
  referrerRewardPercent: s?.referrerRewardPercent ?? 10,
  referrerRewardCap: s?.referrerRewardCap ?? 200,
  holdDays: s?.holdDays ?? 7,
  maxRewardsPerMonth: s?.maxRewardsPerMonth ?? 20,
  cookieExpiryDays: s?.cookieExpiryDays ?? 30,
});

const inputCls = "w-full px-3 py-2 text-sm rounded-xl border border-stone-300 bg-white";
const Field = ({ label, hint, children }) => (
  <label className="block text-xs space-y-1">
    <span className="font-bold text-stone-900 block">{label}</span>
    {children}
    {hint && <span className="text-[11px] text-stone-400 block">{hint}</span>}
  </label>
);

export const AdminReferralsPage = () => {
  const { referrals, referralMetrics, referralsData, referralSettings, fetchAdminReferrals, saveReferralSettings, approveReferral, voidReferral, downloadReferralsCsv } = useAdmin();
  const [form, setForm] = useState(() => formFromSettings(referralSettings));
  const [saved, setSaved] = useState(false);
  const [formError, setFormError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [busyId, setBusyId] = useState(null);
  const [actionError, setActionError] = useState("");

  // Load once on open, then keep fresh (mount-only: the context functions are re-created on every update)
  useEffect(() => {
    fetchAdminReferrals?.();
    const timer = setInterval(() => document.visibilityState === "visible" && fetchAdminReferrals?.(), 30000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    if (referralSettings) setForm(formFromSettings(referralSettings));
  }, [referralSettings]);

  const m = referralMetrics || {};
  const num = (v) => Number(v) || 0;
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  const save = async (e) => {
    e.preventDefault();
    setFormError("");
    try {
      await saveReferralSettings({
        enabled: Boolean(form.enabled),
        refereeDiscountType: form.refereeDiscountType,
        refereeDiscountPercent: num(form.refereeDiscountPercent),
        refereeDiscountCap: num(form.refereeDiscountCap),
        minOrderValue: num(form.minOrderValue),
        referrerRewardType: form.referrerRewardType,
        referrerReward: num(form.referrerReward),
        referrerRewardPercent: num(form.referrerRewardPercent),
        referrerRewardCap: num(form.referrerRewardCap),
        holdDays: num(form.holdDays),
        maxRewardsPerMonth: num(form.maxRewardsPerMonth),
        cookieExpiryDays: num(form.cookieExpiryDays),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      setFormError(err.message || "Could not save the program settings.");
    }
  };

  const rows = useMemo(() => {
    const q = searchTerm.toLowerCase();
    return (referrals || []).filter((r) => {
      const text = `${r.referee?.name} ${r.referee?.email} ${r.referrer?.name} ${r.referrer?.email} ${r.code} ${r.orderNumber || ""}`.toLowerCase();
      const byStatus =
        statusFilter === "all" ||
        (statusFilter === "flagged" ? r.flags?.length > 0 : statusFilter === "closed" ? ["cancelled", "clawed_back"].includes(r.status) : r.status === statusFilter);
      return byStatus && (!q || text.includes(q));
    });
  }, [referrals, searchTerm, statusFilter]);

  const act = async (id, fn) => {
    setBusyId(id);
    setActionError("");
    try {
      await fn();
    } catch (err) {
      setActionError(err.message);
    } finally {
      setBusyId(null);
    }
  };
  const approve = (r) => window.confirm(`Pay ${formatCurrency(r.rewardAmount)} to ${r.referrer?.name} now?`) && act(r.id, () => approveReferral(r.id));
  const voidIt = (r) => {
    const reason = window.prompt(r.status === "rewarded" ? "Reason for taking this reward back (the credit is deducted from the referrer's balance):" : "Reason for cancelling this referral:");
    if (reason && reason.trim()) act(r.id, () => voidReferral(r.id, reason.trim()));
  };

  const cards = [
    { label: "Friends Referred", value: m.totalAttributed ?? 0, icon: Users, tone: "text-emerald-700 bg-emerald-50" },
    { label: "First Orders", value: m.qualifyingOrders ?? 0, icon: ShoppingBag, tone: "text-amber-700 bg-amber-50" },
    { label: "Referral Revenue", value: formatCurrency(num(m.totalRevenue)), icon: IndianRupee, tone: "text-sky-700 bg-sky-50" },
    { label: "Friend Discounts Given", value: formatCurrency(num(m.discountsGiven)), icon: Gift, tone: "text-purple-700 bg-purple-50" },
    { label: "Rewards On Hold", value: formatCurrency(num(m.pendingRewards)), icon: Clock, tone: "text-amber-800 bg-amber-50" },
    { label: "Rewards Paid", value: formatCurrency(num(m.creditedRewards)), icon: CheckCircle2, tone: "text-[#173D2A] bg-emerald-100" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight flex items-center gap-2">
            <Gift className="w-6 h-6 text-emerald-800" /> Referrals &amp; Rewards Program
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">Rewards are paid to the referrer's store credit after the friend's first order is delivered and the hold period has passed.</p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => fetchAdminReferrals()} className="px-3 py-2 text-xs font-semibold rounded-xl border border-stone-300 bg-white inline-flex items-center gap-1.5">
            <RefreshCw size={13} /> Refresh
          </button>
          <button type="button" onClick={() => downloadReferralsCsv().catch((e) => setActionError(e.message))} className="px-3 py-2 text-xs font-semibold rounded-xl border border-stone-300 bg-white inline-flex items-center gap-1.5">
            <Download size={13} /> Export CSV
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        {cards.map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className="p-4 rounded-2xl border border-stone-200 bg-white">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-stone-500">{label}</span>
              <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${tone}`}><Icon size={14} /></span>
            </div>
            <div className="text-xl font-bold text-stone-900">{value}</div>
          </div>
        ))}
      </div>

      {m.flagged > 0 && (
        <div className="flex items-center gap-2 text-xs text-amber-900 bg-amber-50 border border-amber-200 rounded-xl p-3">
          <AlertTriangle size={14} /> {m.flagged} referral(s) are flagged for review (e.g. same phone or address as the referrer). Flagged rewards are not paid automatically.
        </div>
      )}

      <AdminCard title="Program Rules" subtitle="Changes apply to new orders straight away.">
        <form onSubmit={save} className="space-y-5">
          <label className="flex items-center gap-2 text-sm font-semibold">
            <input type="checkbox" checked={form.enabled} onChange={set("enabled")} /> Program is active
          </label>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">Friend's offer (first order)</h4>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Field label="Discount type">
                <select className={inputCls} value={form.refereeDiscountType} onChange={set("refereeDiscountType")}>
                  <option value="percentage">Percentage of the order</option>
                  <option value="fixed">Fixed amount (₹)</option>
                </select>
              </Field>
              <Field label={form.refereeDiscountType === "fixed" ? "Discount (₹)" : "Discount (%)"}>
                <input type="number" min="0" step="0.01" className={inputCls} value={form.refereeDiscountPercent} onChange={set("refereeDiscountPercent")} />
              </Field>
              <Field label="Maximum discount (₹)" hint="0 = no cap">
                <input type="number" min="0" className={inputCls} value={form.refereeDiscountCap} onChange={set("refereeDiscountCap")} />
              </Field>
              <Field label="Minimum order (₹)">
                <input type="number" min="0" className={inputCls} value={form.minOrderValue} onChange={set("minOrderValue")} />
              </Field>
            </div>
          </div>

          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-2">Referrer's reward (store credit)</h4>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Field label="Reward type">
                <select className={inputCls} value={form.referrerRewardType} onChange={set("referrerRewardType")}>
                  <option value="fixed">Fixed amount (₹)</option>
                  <option value="percent">Percent of friend's order</option>
                </select>
              </Field>
              {form.referrerRewardType === "percent" ? (
                <>
                  <Field label="Reward (%)">
                    <input type="number" min="0" max="100" className={inputCls} value={form.referrerRewardPercent} onChange={set("referrerRewardPercent")} />
                  </Field>
                  <Field label="Maximum reward (₹)" hint="0 = no cap">
                    <input type="number" min="0" className={inputCls} value={form.referrerRewardCap} onChange={set("referrerRewardCap")} />
                  </Field>
                </>
              ) : (
                <Field label="Reward (₹)">
                  <input type="number" min="0" className={inputCls} value={form.referrerReward} onChange={set("referrerReward")} />
                </Field>
              )}
              <Field label="Hold after delivery (days)" hint="Match your return window">
                <input type="number" min="0" max="90" className={inputCls} value={form.holdDays} onChange={set("holdDays")} />
              </Field>
              <Field label="Max rewards per referrer / month" hint="0 = unlimited">
                <input type="number" min="0" className={inputCls} value={form.maxRewardsPerMonth} onChange={set("maxRewardsPerMonth")} />
              </Field>
              <Field label="Link attribution (days)">
                <input type="number" min="1" max="365" className={inputCls} value={form.cookieExpiryDays} onChange={set("cookieExpiryDays")} />
              </Field>
            </div>
          </div>

          {formError && <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-2.5">{formError}</p>}
          <button type="submit" className="px-4 py-2 text-xs font-semibold rounded-xl bg-[#173D2A] text-white inline-flex items-center gap-1.5">
            <Save size={13} /> {saved ? "Saved" : "Save program rules"}
          </button>
        </form>
      </AdminCard>

      {referralsData?.topReferrers?.length > 0 && (
        <AdminCard title="Top Referrers">
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
            {referralsData.topReferrers.map((t) => (
              <div key={t.email} className="p-3 rounded-xl bg-stone-50 border border-stone-200">
                <b className="block truncate">{t.name}</b>
                <span className="text-stone-500">{t.rewards} reward(s) &bull; {formatCurrency(t.earned)}</span>
              </div>
            ))}
          </div>
        </AdminCard>
      )}

      <AdminCard noPadding={true} title="Referral Records">
        <div className="p-4 border-b border-stone-100 flex flex-wrap items-center justify-between gap-3 bg-stone-50/50">
          <div className="relative flex-1 min-w-[220px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input type="text" placeholder="Search friend, referrer, code or order…" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 text-xs rounded-xl border border-stone-300 bg-white" />
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {FILTERS.map((f) => (
              <button key={f.id} type="button" onClick={() => setStatusFilter(f.id)} className={`px-3 py-1.5 rounded-xl text-xs font-semibold ${statusFilter === f.id ? "bg-[#173D2A] text-white" : "bg-stone-100 text-stone-600"}`}>
                {f.label}
              </button>
            ))}
          </div>
        </div>
        {actionError && <p className="m-4 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-2.5">{actionError}</p>}

        {rows.length === 0 ? (
          <p className="p-8 text-center text-xs text-stone-500">No referral records found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-stone-200 text-stone-500 uppercase text-[10px] tracking-wider">
                  <th className="px-4 py-3">Referrer</th>
                  <th className="px-4 py-3">Friend</th>
                  <th className="px-4 py-3">Order</th>
                  <th className="px-4 py-3">Reward</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-stone-100">
                {rows.map((r) => {
                  const st = STATUS[r.status] || STATUS.pending;
                  const busy = busyId === r.id;
                  return (
                    <tr key={r.id} className="align-top">
                      <td className="px-4 py-3">
                        <b className="block">{r.referrer?.name || "—"}</b>
                        <span className="text-[10px] text-stone-400 font-mono">{r.code}</span>
                      </td>
                      <td className="px-4 py-3">
                        <b className="block">{r.referee.name}</b>
                        <span className="text-[10px] text-stone-400">{r.referee.email} &bull; {formatDate(r.createdAt)}</span>
                      </td>
                      <td className="px-4 py-3">
                        {r.orderNumber ? (
                          <>
                            <span className="font-mono font-bold block">{r.orderNumber}</span>
                            <span className="text-[10px] text-stone-500">{formatCurrency(r.orderAmount)} (friend saved {formatCurrency(r.discount)})</span>
                          </>
                        ) : (
                          <span className="text-stone-400 italic">No order</span>
                        )}
                      </td>
                      <td className="px-4 py-3 font-bold text-[#173D2A]">{r.rewardAmount > 0 ? formatCurrency(r.rewardAmount) : "—"}</td>
                      <td className="px-4 py-3 space-y-1">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full font-semibold ${st.cls}`}>{st.label}</span>
                        {r.flags?.map((f) => (
                          <span key={f} className="flex items-center gap-1 text-[10px] text-amber-800"><AlertTriangle size={10} /> {FLAG_LABEL[f] || f}</span>
                        ))}
                        {r.voidReason && <span className="block text-[10px] text-stone-500">{r.voidReason}</span>}
                      </td>
                      <td className="px-4 py-3 text-right space-x-1.5 whitespace-nowrap">
                        {r.status === "ordered" && (
                          <button disabled={busy} onClick={() => approve(r)} className="px-2.5 py-1 rounded-lg border border-emerald-200 bg-emerald-50 text-emerald-800 font-semibold disabled:opacity-60">Approve now</button>
                        )}
                        {["signed_up", "ordered", "rewarded"].includes(r.status) && (
                          <button disabled={busy} onClick={() => voidIt(r)} className="px-2.5 py-1 rounded-lg border border-rose-200 bg-rose-50 text-rose-800 font-semibold disabled:opacity-60">
                            {r.status === "rewarded" ? "Take back" : "Void"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </AdminCard>
    </div>
  );
};

export default AdminReferralsPage;
