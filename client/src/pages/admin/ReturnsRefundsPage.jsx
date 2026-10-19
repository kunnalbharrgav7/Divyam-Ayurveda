import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Search, Eye, Loader2, RefreshCw } from "lucide-react";
import { useAdmin } from "../../context/AdminContext";
import { AdminCard } from "../../components/admin/common/AdminCard";
import { AdminTable } from "../../components/admin/common/AdminTable";
import { AdminModal } from "../../components/admin/common/AdminModal";
import { formatCurrency, formatDate } from "../../utils/formatters";

const STATUS_LABEL = {
  requested: "Requested",
  approved: "Approved",
  received: "Received",
  refund_pending: "Refund processing",
  refunded: "Refunded",
  rejected: "Rejected",
  cancelled: "Cancelled",
};
const STATUS_STYLE = {
  requested: "bg-amber-100 text-amber-800",
  approved: "bg-blue-100 text-blue-800",
  received: "bg-indigo-100 text-indigo-800",
  refund_pending: "bg-purple-100 text-purple-800",
  refunded: "bg-emerald-100 text-emerald-800",
  rejected: "bg-rose-100 text-rose-800",
  cancelled: "bg-stone-100 text-stone-600",
};
const METHOD_LABEL = { original: "Original payment (Cashfree)", bank: "Bank transfer", upi: "UPI", store_credit: "Store credit" };
const POLL_MS = 20000;

const inputCls = "w-full px-3 py-2 text-sm rounded-xl border border-stone-300 bg-white";
const btn = (tone) =>
  `px-3 py-1.5 text-xs font-semibold rounded-lg border disabled:opacity-60 ${
    {
      blue: "bg-blue-50 text-blue-800 border-blue-200 hover:bg-blue-100",
      rose: "bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100",
      green: "bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100",
      gray: "bg-stone-50 text-stone-700 border-stone-200 hover:bg-stone-100",
    }[tone]
  }`;

const StatusPill = ({ status }) => (
  <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLE[status] || "bg-stone-100"}`}>
    {STATUS_LABEL[status] || status}
  </span>
);

const ReturnDetail = ({ ret, onChange }) => {
  const { approveReturnRequest, rejectReturnRequest, receiveReturnRequest, refundReturnRequest, refreshReturnRefund } = useAdmin();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [note, setNote] = useState("");
  const [amount, setAmount] = useState(ret.refundAmount);
  const [restock, setRestock] = useState(ret.restockDefault);
  const [reference, setReference] = useState("");
  const manual = ret.refundMethod === "bank" || ret.refundMethod === "upi";

  const run = async (fn, body) => {
    setBusy(true);
    setError("");
    try {
      const updated = await fn(ret.id, body);
      if (updated) onChange(updated);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4 text-sm">
      <div className="flex flex-wrap items-center gap-3">
        <StatusPill status={ret.status} />
        <span className="font-mono text-xs">{ret.referenceNumber}</span>
        <Link to={`/admin/orders/${ret.orderNumber}`} className="text-emerald-800 underline text-xs">Order {ret.orderNumber}</Link>
        <span className="text-xs text-stone-400">{formatDate(ret.createdAt)}</span>
      </div>

      <div className="grid sm:grid-cols-2 gap-3 text-xs">
        <div className="p-3 rounded-xl bg-stone-50 space-y-1">
          <b>Customer</b>
          <p>{ret.customer?.name}</p>
          <p>{ret.customer?.email} &bull; {ret.customer?.phone}</p>
          <p>Order total {formatCurrency(ret.order?.total)} &bull; {ret.order?.paymentMethod} ({ret.order?.paymentStatus})</p>
        </div>
        <div className="p-3 rounded-xl bg-stone-50 space-y-1">
          <b>Refund</b>
          <p>{formatCurrency(ret.refundAmount)} via {METHOD_LABEL[ret.refundMethod]}</p>
          {ret.creditReturn > 0 && <p>Store credit to give back: {formatCurrency(ret.creditReturn)}</p>}
          {ret.payout?.upiId && <p>UPI: <b>{ret.payout.upiId}</b></p>}
          {ret.payout?.accountNumber && (
            <p>Bank: <b>{ret.payout.accountName}</b>, A/C <b>{ret.payout.accountNumber}</b>, IFSC <b>{ret.payout.ifsc}</b></p>
          )}
          {ret.refund && (
            <p>
              Gateway: <b>{ret.refund.status}</b> {ret.refund.reference && `(${ret.refund.reference})`}
              {ret.refund.errorMessage && <span className="text-rose-700"> &mdash; {ret.refund.errorMessage}</span>}
            </p>
          )}
        </div>
      </div>

      <div className="text-xs">
        <b>Reason:</b> {ret.reasonLabel}{ret.reason ? ` — "${ret.reason}"` : ""}
        <ul className="mt-2 space-y-1">
          {ret.items.map((it, i) => (
            <li key={i}>{it.name} ({it.size}) &times; {it.quantity} &bull; {formatCurrency(it.price)}</li>
          ))}
        </ul>
      </div>

      {ret.evidenceImages?.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {ret.evidenceImages.map((src, i) => (
            <a key={i} href={src} target="_blank" rel="noreferrer">
              <img src={src} alt="Evidence" className="w-24 h-24 object-cover rounded-xl border" />
            </a>
          ))}
        </div>
      )}

      <details className="text-xs">
        <summary className="cursor-pointer font-semibold">Timeline</summary>
        <ul className="mt-1 space-y-1">
          {ret.timeline.map((t, i) => (
            <li key={i}><b>{STATUS_LABEL[t.status] || t.status}</b> &middot; {formatDate(t.at)} &middot; {t.by}{t.note ? ` — ${t.note}` : ""}</li>
          ))}
        </ul>
      </details>

      {error && <p className="text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-xl p-2.5">{error}</p>}

      {ret.status === "requested" && (
        <div className="space-y-2 border-t pt-3">
          <textarea rows={2} className={inputCls} placeholder="Message to the customer (required to reject)" value={note} onChange={(e) => setNote(e.target.value)} />
          <label className="text-xs text-stone-600 block">
            Refund amount (₹)
            <input type="number" min="0" step="0.01" className={`${inputCls} mt-1 max-w-[160px]`} value={amount} onChange={(e) => setAmount(e.target.value)} />
          </label>
          <div className="flex gap-2">
            <button disabled={busy} className={btn("blue")} onClick={() => run(approveReturnRequest, { customerNote: note, refundAmount: Number(amount) })}>Approve</button>
            <button disabled={busy || !note.trim()} className={btn("rose")} onClick={() => run(rejectReturnRequest, { customerNote: note })}>Reject</button>
          </div>
        </div>
      )}

      {ret.status === "approved" && (
        <div className="space-y-2 border-t pt-3">
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={restock} onChange={(e) => setRestock(e.target.checked)} />
            Put the returned units back in sellable stock
          </label>
          <input className={inputCls} placeholder="Inspection note (optional)" value={note} onChange={(e) => setNote(e.target.value)} />
          <button disabled={busy} className={btn("blue")} onClick={() => run(receiveReturnRequest, { restock, note })}>Mark parcel received</button>
        </div>
      )}

      {(ret.status === "received" || ret.status === "refund_pending") && (
        <div className="space-y-2 border-t pt-3">
          {ret.status === "received" && (
            <>
              <label className="text-xs text-stone-600 block">
                Refund amount (₹)
                <input type="number" min="0" step="0.01" className={`${inputCls} mt-1 max-w-[160px]`} value={amount} onChange={(e) => setAmount(e.target.value)} />
              </label>
              {manual && (
                <input
                  className={inputCls}
                  placeholder={`Payout reference / UTR after you send the ${ret.refundMethod === "upi" ? "UPI payment" : "bank transfer"} (required)`}
                  value={reference}
                  onChange={(e) => setReference(e.target.value)}
                />
              )}
              <button
                disabled={busy || (manual && reference.trim().length < 4)}
                className={btn("green")}
                onClick={() => run(refundReturnRequest, { refundAmount: Number(amount), payoutReference: reference.trim() })}
              >
                {ret.refundMethod === "original" ? "Refund via Cashfree" : ret.refundMethod === "store_credit" ? "Credit to wallet" : "Record payout as done"}
              </button>
            </>
          )}
          {ret.status === "refund_pending" && (
            <button disabled={busy} className={`${btn("gray")} inline-flex items-center gap-1`} onClick={() => run((id) => refreshReturnRefund(id))}>
              <RefreshCw size={12} /> Check gateway status
            </button>
          )}
        </div>
      )}
      {busy && <Loader2 size={16} className="animate-spin text-stone-400" />}
    </div>
  );
};

export const ReturnsRefundsPage = () => {
  const { returns, fetchAdminReturns } = useAdmin();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [openId, setOpenId] = useState(null);

  // Load on open, then keep fresh (the context function is re-created on every update, so keep this mount-only)
  useEffect(() => {
    fetchAdminReturns?.();
    const timer = setInterval(() => document.visibilityState === "visible" && fetchAdminReturns?.(), POLL_MS);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rows = returns || [];
  const open = rows.find((r) => r.id === openId) || null;
  const needsAction = rows.filter((r) => ["requested", "approved", "received", "refund_pending"].includes(r.status)).length;

  const q = searchTerm.toLowerCase();
  const filtered = rows.filter((r) => {
    const hay = `${r.referenceNumber} ${r.orderNumber} ${r.customer?.name} ${r.customer?.email}`.toLowerCase();
    return hay.includes(q) && (statusFilter === "all" || r.status === statusFilter);
  });

  const columns = [
    {
      header: "Return",
      render: (row) => (
        <div>
          <span className="font-bold text-stone-900 font-mono text-xs">{row.referenceNumber}</span>
          <div className="text-[11px] text-stone-400">
            For: <Link to={`/admin/orders/${row.orderNumber}`} className="text-emerald-800 underline">{row.orderNumber}</Link>
          </div>
        </div>
      ),
    },
    { header: "Customer", render: (row) => row.customer?.name },
    {
      header: "Product & Reason",
      render: (row) => (
        <div className="max-w-xs">
          <div className="font-semibold text-stone-900 line-clamp-1">{row.items.map((i) => i.name).join(", ")}</div>
          <div className="text-[11px] text-stone-500 italic mt-0.5">{row.reasonLabel}</div>
        </div>
      ),
    },
    {
      header: "Refund",
      render: (row) => (
        <div>
          <span className="font-bold text-stone-900">{formatCurrency(row.refundAmount)}</span>
          <div className="text-[11px] text-stone-400">{METHOD_LABEL[row.refundMethod]}</div>
        </div>
      ),
    },
    { header: "Status", render: (row) => <StatusPill status={row.status} /> },
    {
      header: "",
      align: "right",
      render: (row) => (
        <button type="button" onClick={() => setOpenId(row.id)} className={`${btn("gray")} inline-flex items-center gap-1`}>
          <Eye size={12} /> {["requested", "approved", "received", "refund_pending"].includes(row.status) ? "Process" : "View"}
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900 font-sans tracking-tight">Returns &amp; Refund Management</h1>
        <p className="text-xs sm:text-sm text-stone-500 mt-1">
          Full-order returns within 7 days of delivery. {needsAction > 0 ? `${needsAction} request(s) in progress.` : "Nothing waiting on you."}
        </p>
      </div>

      <AdminCard noPadding={true}>
        <div className="p-4 border-b border-stone-100 flex flex-wrap items-center justify-between gap-3 bg-stone-50/50">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              type="text"
              placeholder="Search by return no., order no. or customer..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-stone-300 bg-white"
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl border border-stone-300 bg-white text-stone-700"
          >
            <option value="all">All statuses</option>
            {Object.entries(STATUS_LABEL).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>

        <AdminTable columns={columns} data={filtered} keyField="id" emptyMessage="No return or refund requests found." />
      </AdminCard>

      <AdminModal isOpen={!!open} onClose={() => setOpenId(null)} title="Return request" maxWidth="max-w-3xl">
        {open && <ReturnDetail key={`${open.id}-${open.status}`} ret={open} onChange={() => {}} />}
      </AdminModal>
    </div>
  );
};
