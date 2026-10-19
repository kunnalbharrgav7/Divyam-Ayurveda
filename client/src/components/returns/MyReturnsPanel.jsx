import React, { useState } from "react";
import { CheckCircle2, Circle, XCircle, Wallet } from "lucide-react";
import { useReturns } from "../../context/ReturnContext";
import { formatINR, formatDate } from "../../utils/formatters";

export const RETURN_STATUS_STYLE = {
  requested: "bg-amber-100 text-amber-800",
  approved: "bg-blue-100 text-blue-800",
  received: "bg-indigo-100 text-indigo-800",
  refund_pending: "bg-purple-100 text-purple-800",
  refunded: "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-100 text-red-700",
  cancelled: "bg-stone-100 text-stone-600",
};

export const RETURN_STATUS_LABEL = {
  requested: "Requested",
  approved: "Approved",
  received: "Received",
  refund_pending: "Refund processing",
  refunded: "Refunded",
  rejected: "Rejected",
  cancelled: "Cancelled",
};

const STEPS = [
  { key: "requested", label: "Requested" },
  { key: "approved", label: "Approved" },
  { key: "received", label: "Received" },
  { key: "refunded", label: "Refunded" },
];
const STEP_RANK = { requested: 0, approved: 1, received: 2, refund_pending: 2, refunded: 3 };

const METHOD_TEXT = {
  original: "Original payment method",
  bank: "Bank account",
  upi: "UPI",
  store_credit: "Store credit",
};

const Tracker = ({ status }) => {
  if (status === "rejected" || status === "cancelled") {
    return (
      <div className="flex items-center gap-2 text-xs font-semibold text-stone-600">
        <XCircle size={14} className={status === "rejected" ? "text-red-500" : "text-stone-400"} />
        {RETURN_STATUS_LABEL[status]}
      </div>
    );
  }
  const rank = STEP_RANK[status] ?? 0;
  return (
    <div className="flex items-center">
      {STEPS.map((s, i) => (
        <React.Fragment key={s.key}>
          <div className="flex flex-col items-center gap-1 min-w-[56px]">
            {i <= rank ? <CheckCircle2 size={16} className="text-emerald-600" /> : <Circle size={16} className="text-stone-300" />}
            <span className={`text-[10px] ${i <= rank ? "font-semibold text-stone-800" : "text-stone-400"}`}>
              {i === 3 && status === "refund_pending" ? "Processing" : s.label}
            </span>
          </div>
          {i < STEPS.length - 1 && <div className={`h-0.5 flex-1 ${i < rank ? "bg-emerald-500" : "bg-stone-200"}`} />}
        </React.Fragment>
      ))}
    </div>
  );
};

export const MyReturnsPanel = () => {
  const { returns, storeCredit, cancelReturn, loading } = useReturns();
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");

  const cancel = async (r) => {
    if (!window.confirm("Cancel this return request?")) return;
    setBusyId(r.id);
    setError("");
    try {
      await cancelReturn(r.id, r.orderNumber);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <h2 className="font-heading tracking-tight text-2xl font-bold text-[#171A17]">Returns &amp; Refunds</h2>
          <p className="text-xs sm:text-sm text-[#666B64] mt-1">Track your return requests. Status updates appear here automatically.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-emerald-50 border border-emerald-200">
          <Wallet size={16} className="text-emerald-700" />
          <div>
            <span className="text-[10px] uppercase tracking-wide text-emerald-700 block leading-none">Store credit</span>
            <span className="text-sm font-bold text-emerald-900">{formatINR(storeCredit)}</span>
          </div>
        </div>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      {returns.length === 0 ? (
        <div className="p-10 text-center bg-stone-50 rounded-2xl text-xs text-stone-500">
          {loading ? "Loading your returns…" : "You haven't requested any returns. Delivered orders can be returned from My Orders within 7 days."}
        </div>
      ) : (
        <div className="space-y-4">
          {returns.map((r) => (
            <div key={r.id} className="p-5 rounded-2xl border border-[#E5E7DF] space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <div>
                  <span className="text-stone-400 block">Return</span>
                  <span className="font-mono font-bold text-sm">{r.referenceNumber}</span>
                </div>
                <div>
                  <span className="text-stone-400 block">Order</span>
                  <span className="font-mono font-semibold">{r.orderNumber}</span>
                </div>
                <div>
                  <span className="text-stone-400 block">Requested</span>
                  <span className="font-semibold">{formatDate(r.createdAt)}</span>
                </div>
                <span className={`px-3 py-1 rounded-full font-bold ${RETURN_STATUS_STYLE[r.status] || "bg-stone-100"}`}>
                  {RETURN_STATUS_LABEL[r.status] || r.status}
                </span>
              </div>

              <Tracker status={r.status} />

              <div className="space-y-1.5">
                {r.items.map((it, i) => (
                  <div key={i} className="flex items-center gap-3 text-xs">
                    {it.image && <img src={it.image} alt="" className="w-9 h-9 rounded-lg object-contain bg-[#FBFAF6] border p-1" />}
                    <span className="flex-1 font-semibold text-[#171A17]">
                      {it.name} <span className="text-stone-500 font-normal">&bull; {it.size} &bull; Qty {it.quantity}</span>
                    </span>
                  </div>
                ))}
              </div>

              <div className="text-xs text-stone-600 grid sm:grid-cols-2 gap-x-6 gap-y-1">
                <p><span className="text-stone-400">Reason: </span>{r.reasonLabel}{r.reason ? ` — ${r.reason}` : ""}</p>
                <p><span className="text-stone-400">Refund: </span><b className="text-[#173D2A]">{formatINR(r.refundAmount)}</b> via {METHOD_TEXT[r.refundMethod]}</p>
                {r.payout?.upiId && <p><span className="text-stone-400">UPI: </span>{r.payout.upiId}</p>}
                {r.payout?.accountNumber && <p><span className="text-stone-400">Account: </span>{r.payout.accountNumber} ({r.payout.ifsc})</p>}
                {r.creditReturn > 0 && <p><span className="text-stone-400">Store credit returned: </span>{formatINR(r.creditReturn)}</p>}
                {r.status === "refunded" && r.refundedAt && <p><span className="text-stone-400">Refunded on: </span>{formatDate(r.refundedAt)}</p>}
              </div>

              {r.customerNote && (
                <p className="text-xs bg-[#FBFAF6] border border-[#E5E7DF] rounded-xl p-3">
                  <b>Message from Divyam Ayurveda: </b>{r.customerNote}
                </p>
              )}

              <details className="text-xs">
                <summary className="cursor-pointer font-semibold text-[#386B40]">History</summary>
                <ul className="mt-2 space-y-1">
                  {r.timeline.map((t, i) => (
                    <li key={i} className="text-stone-600">
                      <b className="text-stone-800">{RETURN_STATUS_LABEL[t.status] || t.status}</b> &middot; {formatDate(t.at)}
                      {t.note ? ` — ${t.note}` : ""}
                    </li>
                  ))}
                </ul>
              </details>

              {r.canCancel && (
                <button
                  onClick={() => cancel(r)}
                  disabled={busyId === r.id}
                  className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs font-semibold disabled:opacity-60"
                >
                  Cancel request
                </button>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyReturnsPanel;
