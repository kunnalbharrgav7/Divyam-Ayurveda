import React, { useState } from "react";
import { X, Upload, Trash2, AlertCircle, Loader2 } from "lucide-react";
import { useReturns } from "../../context/ReturnContext";
import { compressImageFile } from "../../utils/imageCompressor";
import { formatINR } from "../../utils/formatters";

const METHOD_LABELS = {
  original: "Original payment method",
  bank: "Bank account",
  upi: "UPI",
  store_credit: "Store credit (instant)",
};

const fieldCls =
  "w-full px-3 py-2 rounded-xl border border-[#E5E7DF] text-sm bg-white focus:outline-none focus:border-[#386B40]";

// Full-order return request. Rules and options come from the server (/me/return-options + eligibility).
export const ReturnRequestModal = ({ order, onClose, onSubmitted }) => {
  const { options, eligibility, createReturn } = useReturns();
  const elig = eligibility[order.id] || {};
  const methods = elig.refundMethods?.length ? elig.refundMethods : ["upi", "bank", "store_credit"];

  const [reasonCategory, setReasonCategory] = useState("");
  const [reason, setReason] = useState("");
  const [images, setImages] = useState([]);
  const [sealed, setSealed] = useState(false);
  const [refundMethod, setRefundMethod] = useState(methods[0]);
  const [payout, setPayout] = useState({ accountName: "", accountNumber: "", ifsc: "", upiId: "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const picked = options.reasons.find((r) => r.key === reasonCategory);

  const handleFiles = async (e) => {
    const files = Array.from(e.target.files || []).slice(0, 5 - images.length);
    e.target.value = "";
    try {
      const urls = await Promise.all(files.map((f) => compressImageFile(f, { maxDimension: 1280, quality: 0.75 })));
      setImages((prev) => [...prev, ...urls].slice(0, 5));
    } catch (err) {
      setError(err.message || "Could not read that photo.");
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!picked) return setError("Please choose a reason for the return.");
    if (reasonCategory === "other" && reason.trim().length < 10) return setError("Please describe the problem (at least 10 characters).");
    if (picked.photoRequired && images.length === 0) return setError("Please attach at least one photo of the issue.");
    if (!picked.opened && !sealed) return setError("Please confirm the product is unopened and the seal is intact.");

    const body = { reasonCategory, reason: reason.trim(), evidenceImages: images, sealedConfirmed: sealed, refundMethod };
    if (refundMethod === "bank" || refundMethod === "upi") body.payout = payout;

    setBusy(true);
    try {
      const created = await createReturn(order.id, body);
      onSubmitted?.(created);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  const setP = (k) => (e) => setPayout((p) => ({ ...p, [k]: k === "ifsc" ? e.target.value.toUpperCase() : e.target.value }));

  return (
    <div className="fixed inset-0 z-[80] bg-black/50 flex items-center justify-center p-4" onClick={onClose}>
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="bg-white rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 space-y-4"
      >
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-heading text-xl font-bold text-[#171A17]">Return order {order.id}</h3>
            <p className="text-xs text-stone-500 mt-0.5">
              The whole order is returned. {elig.daysLeft != null && `${elig.daysLeft} day(s) left in your ${options.windowDays}-day window.`}
            </p>
          </div>
          <button type="button" onClick={onClose} className="p-1 rounded-lg hover:bg-stone-100" aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div>
          <label className="text-xs font-semibold text-stone-700">Why are you returning it?</label>
          <select value={reasonCategory} onChange={(e) => setReasonCategory(e.target.value)} className={`${fieldCls} mt-1`}>
            <option value="">Select a reason</option>
            {options.reasons.map((r) => (
              <option key={r.key} value={r.key}>{r.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="text-xs font-semibold text-stone-700">
            Tell us more{reasonCategory === "other" ? " (required)" : " (optional)"}
          </label>
          <textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} className={`${fieldCls} mt-1`} maxLength={1000} />
        </div>

        <div>
          <label className="text-xs font-semibold text-stone-700">
            Photos {picked?.photoRequired ? "(required)" : "(optional)"} &middot; up to 5
          </label>
          <div className="flex flex-wrap gap-2 mt-1">
            {images.map((src, i) => (
              <div key={i} className="relative w-16 h-16">
                <img src={src} alt="" className="w-16 h-16 object-cover rounded-lg border" />
                <button
                  type="button"
                  onClick={() => setImages((p) => p.filter((_, j) => j !== i))}
                  className="absolute -top-1.5 -right-1.5 bg-white rounded-full border p-0.5 text-red-600"
                  aria-label="Remove photo"
                >
                  <Trash2 size={11} />
                </button>
              </div>
            ))}
            {images.length < 5 && (
              <label className="w-16 h-16 rounded-lg border border-dashed border-stone-300 flex items-center justify-center cursor-pointer text-stone-400 hover:bg-stone-50">
                <Upload size={16} />
                <input type="file" accept="image/*" multiple className="hidden" onChange={handleFiles} />
              </label>
            )}
          </div>
        </div>

        {picked && !picked.opened && (
          <label className="flex items-start gap-2 text-xs text-stone-700">
            <input type="checkbox" checked={sealed} onChange={(e) => setSealed(e.target.checked)} className="mt-0.5" />
            <span>I confirm the product is unopened with its seal intact.</span>
          </label>
        )}

        <div className="rounded-2xl bg-[#FBFAF6] border border-[#E5E7DF] p-4 space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-stone-600">Refund amount</span>
            <span className="font-bold text-[#173D2A]">{formatINR(elig.refundAmount ?? order.pricing?.total)}</span>
          </div>
          {elig.creditReturn > 0 && (
            <p className="text-[11px] text-stone-500">
              The {formatINR(elig.creditReturn)} of store credit you used comes back to your credit balance.
            </p>
          )}

          {methods.length === 1 && methods[0] === "original" ? (
            <p className="text-xs text-stone-600">
              Paid online &mdash; the money goes back to your original payment method (3&ndash;7 working days after we receive the parcel).
            </p>
          ) : (
            <>
              <label className="text-xs font-semibold text-stone-700 block">Refund me via</label>
              <div className="flex flex-wrap gap-2">
                {methods.map((m) => (
                  <button
                    type="button"
                    key={m}
                    onClick={() => setRefundMethod(m)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-semibold border ${
                      refundMethod === m ? "bg-[#173D2A] text-white border-[#173D2A]" : "bg-white text-stone-700 border-[#E5E7DF]"
                    }`}
                  >
                    {METHOD_LABELS[m]}
                  </button>
                ))}
              </div>
              {refundMethod === "upi" && (
                <input placeholder="UPI ID (name@bank)" value={payout.upiId} onChange={setP("upiId")} className={fieldCls} />
              )}
              {refundMethod === "bank" && (
                <div className="space-y-2">
                  <input placeholder="Account holder name" value={payout.accountName} onChange={setP("accountName")} className={fieldCls} />
                  <input placeholder="Account number" inputMode="numeric" value={payout.accountNumber} onChange={setP("accountNumber")} className={fieldCls} />
                  <input placeholder="IFSC code" value={payout.ifsc} onChange={setP("ifsc")} className={fieldCls} maxLength={11} />
                </div>
              )}
            </>
          )}
        </div>

        {error && (
          <div className="flex items-start gap-2 text-xs text-red-700 bg-red-50 border border-red-200 rounded-xl p-3">
            <AlertCircle size={14} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-xs font-semibold bg-stone-100 hover:bg-stone-200">
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="px-5 py-2 rounded-xl text-xs font-semibold bg-[#173D2A] text-white disabled:opacity-60 inline-flex items-center gap-2"
          >
            {busy && <Loader2 size={13} className="animate-spin" />}
            Submit return request
          </button>
        </div>
      </form>
    </div>
  );
};

export default ReturnRequestModal;
