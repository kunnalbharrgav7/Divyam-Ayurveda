import React, { useState, useMemo } from "react";
import { X, AlertCircle, Loader2, CheckCircle2, ShoppingBag, ArrowRight } from "lucide-react";
import { formatINR } from "../../utils/formatters";
import { OrderItemImage } from "../common/OrderItemImage";

const CANCELLATION_REASONS = [
  "Ordered by mistake",
  "Found a better alternative",
  "Delivery taking too long",
  "Want to change the product",
  "Payment-related issue",
  "Other",
];

export const CancellationModal = ({
  order,
  initialItem = null,
  onClose,
  onCancelled,
}) => {
  const isOnline = /online|cashfree|card|upi|netbanking/i.test(String(order?.paymentMethod || ""));
  const isPaid = isOnline && (order?.paymentStatus === "paid" || order?.paymentStatus === "Paid");

  // Determine mode: "full" or "partial"
  const [mode, setMode] = useState(initialItem ? "partial" : "full");

  // Multi-item selection for partial cancellation: map of orderItemId -> quantity to cancel
  const [selectedItems, setSelectedItems] = useState(() => {
    const map = {};
    const items = order?.items || [];
    if (initialItem) {
      const itId = initialItem.orderItemId || initialItem.id || initialItem._id;
      map[itId] = 1;
    } else {
      items.forEach((it) => {
        const remaining = Math.max(0, (it.quantity || 0) - (it.cancelledQuantity || 0));
        if (remaining > 0) {
          const itId = it.orderItemId || it.id || it._id;
          map[itId] = remaining;
        }
      });
    }
    return map;
  });

  const [reason, setReason] = useState(CANCELLATION_REASONS[0]);
  const [customerNote, setCustomerNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [successResult, setSuccessResult] = useState(null);

  // Active uncancelled items in the order
  const cancellableItems = useMemo(() => {
    return (order?.items || []).filter((it) => {
      const remaining = Math.max(0, (it.quantity || 0) - (it.cancelledQuantity || 0));
      return remaining > 0;
    });
  }, [order]);

  // Compute estimated refund for selected items
  const refundSummary = useMemo(() => {
    const subtotal = Number(order?.pricing?.subtotal || order?.pricing?.subtotalPaise / 100 || 0);
    const total = Number(order?.pricing?.total || order?.pricing?.totalPaise / 100 || 0);
    const discount = Number(order?.pricing?.discount || 0) + Number(order?.pricing?.referralDiscount || 0);
    const storeCredit = Number(order?.pricing?.storeCredit || 0);

    let grossCancelled = 0;
    let anySelected = false;

    cancellableItems.forEach((it) => {
      const itId = it.orderItemId || it.id || it._id;
      const qty = mode === "full" ? Math.max(0, (it.quantity || 0) - (it.cancelledQuantity || 0)) : (selectedItems[itId] || 0);
      if (qty > 0) {
        anySelected = true;
        const unitPrice = Number(it.price || it.unitPrice || 0);
        grossCancelled += unitPrice * qty;
      }
    });

    if (!anySelected) {
      return { grossCancelled: 0, estimatedRefund: 0, estimatedCredit: 0 };
    }

    if (mode === "full") {
      return {
        grossCancelled,
        estimatedRefund: isPaid ? total : 0,
        estimatedCredit: storeCredit,
      };
    }

    const fraction = subtotal > 0 ? grossCancelled / subtotal : 0;
    const itemDiscount = Math.round(fraction * discount);
    const itemCredit = Math.round(fraction * storeCredit);
    const netCash = Math.max(0, grossCancelled - itemDiscount - itemCredit);

    return {
      grossCancelled,
      estimatedRefund: isPaid ? netCash : 0,
      estimatedCredit: itemCredit,
    };
  }, [mode, selectedItems, cancellableItems, order, isPaid]);

  const handleItemToggle = (itId, remaining) => {
    setSelectedItems((prev) => {
      const next = { ...prev };
      if (next[itId]) {
        delete next[itId];
      } else {
        next[itId] = 1;
      }
      return next;
    });
  };

  const handleQtyChange = (itId, qty, max) => {
    const val = Math.max(1, Math.min(max, Number(qty) || 1));
    setSelectedItems((prev) => ({ ...prev, [itId]: val }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!reason) {
      setError("Please select a cancellation reason.");
      return;
    }

    setSubmitting(true);
    try {
      const orderNumber = order.orderNumber || order.id;
      let endpoint = `/api/v1/orders/${encodeURIComponent(orderNumber)}/cancel`;
      let body = { reason, customerNote };

      if (mode === "partial") {
        endpoint = `/api/v1/orders/${encodeURIComponent(orderNumber)}/cancel-items`;
        const itemsToCancel = Object.entries(selectedItems)
          .filter(([, qty]) => Number(qty) > 0)
          .map(([orderItemId, quantity]) => ({ orderItemId, quantity }));

        if (itemsToCancel.length === 0) {
          setError("Please select at least one item to cancel.");
          setSubmitting(false);
          return;
        }
        body.items = itemsToCancel;
      }

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("divyam_access_token") || ""}`,
        },
        body: JSON.stringify(body),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.error?.message || "Failed to process cancellation request.");
      }

      setSuccessResult(json.data || json);
      if (onCancelled) onCancelled(json.data || json);
    } catch (err) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-xs"
      onClick={onClose}
    >
      <div
        data-lenis-prevent="true"
        className="bg-white rounded-t-3xl sm:rounded-3xl max-w-xl w-full shadow-2xl max-h-[92vh] overflow-y-auto overscroll-contain flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 bg-white flex items-center justify-between px-6 py-4 border-b border-[#E5E7DF]">
          <div>
            <span className="text-[10px] font-bold text-[#386B40] uppercase tracking-wider">Order Management</span>
            <h3 className="font-heading text-lg font-bold text-[#171A17]">Cancel Order #{order.orderNumber || order.id}</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-xs text-stone-700">
          {successResult ? (
            <div className="py-6 text-center space-y-4">
              <div className="w-14 h-14 mx-auto rounded-full bg-emerald-50 text-[#386B40] flex items-center justify-center border border-emerald-200">
                <CheckCircle2 size={32} />
              </div>
              <h4 className="text-base font-bold text-[#173D2A]">
                {successResult.status === "requested" ? "Cancellation Request Submitted" : "Cancellation Processed"}
              </h4>
              <p className="text-stone-600 max-w-md mx-auto text-xs leading-relaxed">
                {successResult.message ||
                  (successResult.status === "requested"
                    ? "Your cancellation request has been submitted for review. Our team will update you shortly."
                    : "Your order cancellation has been successfully confirmed.")}
              </p>

              {isPaid && refundSummary.estimatedRefund > 0 && (
                <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-left space-y-1">
                  <div className="font-bold text-emerald-900 text-xs">Refund Information</div>
                  <div className="text-[11px] text-emerald-800">
                    Estimated refund of <span className="font-bold">{formatINR(refundSummary.estimatedRefund)}</span> has been initiated via Cashfree to your original payment method.
                  </div>
                </div>
              )}

              <div className="pt-3">
                <button
                  onClick={onClose}
                  className="px-6 py-2.5 rounded-xl bg-[#173D2A] text-white font-semibold hover:bg-[#0B2416] transition-colors"
                >
                  Done
                </button>
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-2.5">
                  <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-600" />
                  <div className="text-[11px] leading-relaxed">{error}</div>
                </div>
              )}

              {/* Mode switch (if multiple cancellable items) */}
              {cancellableItems.length > 1 && (
                <div className="flex rounded-xl bg-stone-100 p-1 border border-[#E5E7DF]">
                  <button
                    type="button"
                    onClick={() => setMode("full")}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      mode === "full" ? "bg-white text-[#173D2A] shadow-xs" : "text-stone-600 hover:text-stone-900"
                    }`}
                  >
                    Cancel Entire Order
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("partial")}
                    className={`flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      mode === "partial" ? "bg-white text-[#173D2A] shadow-xs" : "text-stone-600 hover:text-stone-900"
                    }`}
                  >
                    Cancel Selected Products
                  </button>
                </div>
              )}

              {/* Items List */}
              <div className="rounded-2xl border border-[#E5E7DF] p-3.5 space-y-3 bg-[#FBFAF6]">
                <div className="flex items-center justify-between font-bold text-stone-800 text-xs">
                  <span>{mode === "full" ? "Items in this order" : "Select products to cancel"}</span>
                  <span className="text-stone-400 font-normal">
                    {mode === "full" ? `${cancellableItems.length} active` : "Choose quantity"}
                  </span>
                </div>

                <div className="divide-y divide-stone-200/60 max-h-48 overflow-y-auto pr-1">
                  {cancellableItems.map((it) => {
                    const itId = it.orderItemId || it.id || it._id;
                    const remaining = Math.max(0, (it.quantity || 0) - (it.cancelledQuantity || 0));
                    const isSelected = mode === "full" || Boolean(selectedItems[itId]);

                    return (
                      <div key={itId} className="py-2.5 flex items-center gap-3">
                        {mode === "partial" && (
                          <input
                            type="checkbox"
                            checked={Boolean(selectedItems[itId])}
                            onChange={() => handleItemToggle(itId, remaining)}
                            className="rounded border-stone-300 text-[#386B40] focus:ring-[#386B40] h-4 w-4"
                          />
                        )}
                        <OrderItemImage src={it.image} name={it.name} size={40} className="rounded-lg shrink-0" />
                        <div className="flex-1 min-w-0">
                          <span className="font-semibold text-stone-900 block truncate">{it.name}</span>
                          <span className="text-[11px] text-stone-500 block">
                            {it.size} &bull; {formatINR(it.price || it.unitPrice || 0)} (Active: {remaining})
                          </span>
                        </div>

                        {mode === "partial" && isSelected ? (
                          <div className="flex items-center gap-1 shrink-0">
                            <span className="text-stone-500 text-[10px]">Cancel:</span>
                            <select
                              value={selectedItems[itId] || 1}
                              onChange={(e) => handleQtyChange(itId, e.target.value, remaining)}
                              className="px-2 py-1 bg-white border border-[#E5E7DF] rounded-md text-xs font-semibold focus:outline-none focus:border-[#386B40]"
                            >
                              {Array.from({ length: remaining }, (_, i) => i + 1).map((n) => (
                                <option key={n} value={n}>
                                  {n}
                                </option>
                              ))}
                            </select>
                          </div>
                        ) : (
                          <span className="font-bold text-xs text-stone-800 shrink-0">
                            Qty: {remaining}
                          </span>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Cancellation Reason Dropdown */}
              <div className="space-y-1.5">
                <label className="block font-semibold text-stone-800 text-xs">
                  Reason for Cancellation <span className="text-rose-600">*</span>
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-xl border border-[#E5E7DF] bg-white text-xs font-medium focus:outline-none focus:border-[#386B40]"
                  required
                >
                  {CANCELLATION_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
              </div>

              {/* Optional Explanation */}
              <div className="space-y-1.5">
                <label className="block font-semibold text-stone-800 text-xs">
                  Additional Notes <span className="text-stone-400 font-normal">(optional)</span>
                </label>
                <textarea
                  value={customerNote}
                  onChange={(e) => setCustomerNote(e.target.value)}
                  placeholder="Provide any additional details or feedback..."
                  rows={2}
                  maxLength={300}
                  className="w-full px-3 py-2 rounded-xl border border-[#E5E7DF] bg-white text-xs focus:outline-none focus:border-[#386B40] resize-none"
                />
              </div>

              {/* Financial & Refund Preview Card */}
              <div className="p-4 rounded-2xl border border-[#E5E7DF] bg-[#FBFAF6] space-y-2 text-xs">
                <div className="flex justify-between items-center text-stone-600">
                  <span>Payment Method:</span>
                  <span className="font-bold uppercase tracking-wider text-stone-900">{order.paymentMethod || "COD"}</span>
                </div>
                {isPaid ? (
                  <>
                    <div className="flex justify-between items-center text-stone-600">
                      <span>Cancelled Items Value:</span>
                      <span className="font-medium text-stone-800">{formatINR(refundSummary.grossCancelled)}</span>
                    </div>
                    <div className="pt-2 border-t border-stone-200 flex justify-between items-center text-sm font-bold">
                      <span className="text-stone-900">Estimated Cash Refund:</span>
                      <span className="text-[#173D2A]">{formatINR(refundSummary.estimatedRefund)}</span>
                    </div>
                    {refundSummary.estimatedCredit > 0 && (
                      <div className="flex justify-between items-center text-[11px] text-emerald-800 font-medium">
                        <span>Store Credit to be returned:</span>
                        <span>{formatINR(refundSummary.estimatedCredit)}</span>
                      </div>
                    )}
                    <p className="text-[10px] text-stone-500 pt-1 leading-relaxed">
                      Refunds are automatically processed to your original payment method via Cashfree upon cancellation.
                    </p>
                  </>
                ) : (
                  <div className="pt-1 text-[11px] text-stone-600">
                    <span className="font-semibold text-stone-800">Cash on Delivery: </span>
                    No payment has been collected, so no monetary refund is necessary. Your order items will be cancelled directly.
                  </div>
                )}
              </div>

              {/* Footer Buttons */}
              <div className="pt-2 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={submitting}
                  className="px-4 py-2.5 rounded-xl border border-stone-200 text-stone-700 hover:bg-stone-50 font-semibold text-xs transition-colors"
                >
                  Keep Order
                </button>
                <button
                  type="submit"
                  disabled={submitting || (mode === "partial" && Object.keys(selectedItems).length === 0)}
                  className="px-5 py-2.5 rounded-xl bg-rose-700 hover:bg-rose-800 text-white font-semibold text-xs inline-flex items-center gap-1.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {submitting ? (
                    <>
                      <Loader2 size={14} className="animate-spin" /> Processing...
                    </>
                  ) : (
                    <>Confirm Cancellation</>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
