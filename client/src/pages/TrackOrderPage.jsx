import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useSearchParams, useParams, Link, useNavigate } from "react-router-dom";
import {
  Search,
  Truck,
  CheckCircle2,
  MapPin,
  Copy,
  Check,
  ExternalLink,
  AlertCircle,
  XCircle,
  RotateCcw,
  Loader2,
  CreditCard,
  Package,
} from "lucide-react";
import { Breadcrumbs } from "../components/common/Breadcrumbs";
import { OrderItemImage } from "../components/common/OrderItemImage";
import { useOrders } from "../context/OrderContext";
import { useAuth } from "../context/AuthContext";
import { orderService } from "../services/api";
import { getGuestOrders, getGuestOrder } from "../utils/guestOrders";
import { formatINR, formatDate } from "../utils/formatters";
import { toStatusKey } from "../utils/orderStatus";

// The customer-facing journey. Each step is reached when the order's status is at or past it.
const MILESTONES = [
  { name: "Order Placed", keys: ["pending_payment"] },
  { name: "Confirmed", keys: ["confirmed"] },
  { name: "Processing", keys: ["processing", "packed"] },
  { name: "Shipped", keys: ["dispatched", "shipped"] },
  { name: "Out for Delivery", keys: ["out_for_delivery"] },
  { name: "Delivered", keys: ["delivered", "return_requested", "returned"] },
];

const levelOf = (rawStatus) => {
  const key = toStatusKey(rawStatus);
  const idx = MILESTONES.findIndex((m) => m.keys.includes(key));
  return idx < 0 ? 0 : idx;
};

const badgeColor = (rawStatus) => {
  const s = toStatusKey(rawStatus);
  if (s === "delivered") return "bg-emerald-100 text-emerald-800 border-emerald-200";
  if (s === "dispatched" || s === "out_for_delivery") return "bg-blue-100 text-blue-800 border-blue-200";
  if (s === "processing" || s === "confirmed") return "bg-amber-100 text-amber-800 border-amber-200";
  if (s === "cancelled") return "bg-rose-100 text-rose-800 border-rose-200";
  if (s === "partially_cancelled") return "bg-amber-100 text-amber-900 border-amber-300";
  if (s === "return_requested" || s === "returned") return "bg-violet-100 text-violet-800 border-violet-200";
  return "bg-stone-100 text-stone-800 border-stone-200";
};

const paymentLabel = (order) => {
  const status = String(order.paymentStatus || "").toLowerCase();
  const cod = String(order.paymentMethod || "").toLowerCase().includes("cash");
  if (status === "paid") return { text: "Paid", tone: "bg-emerald-100 text-emerald-800" };
  if (status === "refunded" || status === "partially_refunded") return { text: "Refunded", tone: "bg-violet-100 text-violet-800" };
  if (status === "failed") return { text: "Payment failed", tone: "bg-rose-100 text-rose-800" };
  return cod ? { text: "Pay on delivery", tone: "bg-stone-100 text-stone-700" } : { text: "Payment pending", tone: "bg-amber-100 text-amber-800" };
};

export const TrackOrderPage = () => {
  const { code: codeParam } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const queryOrderId = searchParams.get("orderId") || "";
  const { getOrderById } = useOrders();
  const { isAuthenticated } = useAuth();

  const [orderIdInput, setOrderIdInput] = useState(queryOrderId);
  const [codeInput, setCodeInput] = useState(codeParam || "");
  const [trackedOrder, setTrackedOrder] = useState(null);
  const [lookup, setLookup] = useState(null); // how to refresh: { code, orderNumber } or { ownOrder }
  const [status, setStatus] = useState("idle"); // idle | loading | found | error
  const [errorMessage, setErrorMessage] = useState("");
  const [copiedAwb, setCopiedAwb] = useState(false);
  const deviceOrders = useMemo(() => getGuestOrders(), [trackedOrder?.orderNumber]);

  const runLookup = useCallback(
    async (target, { quiet = false } = {}) => {
      if (!quiet) {
        setStatus("loading");
        setErrorMessage("");
      }
      try {
        let found = null;
        if (target.code) {
          found = await orderService.trackOrder({ code: target.code, orderNumber: target.orderNumber || null });
        } else if (target.ownOrder) {
          found = await getOrderById(target.ownOrder);
          if (!found) throw new Error("We couldn't find this order in your account. Guests: enter the tracking code from your confirmation page.");
        }
        setTrackedOrder(found);
        setLookup(target);
        setStatus("found");
      } catch (err) {
        if (quiet) return; // background refresh: keep showing what we have
        setTrackedOrder(null);
        setStatus("error");
        setErrorMessage(err.message || "We couldn't find an order with these details.");
      }
    },
    [getOrderById]
  );

  // Arriving with a private link (/track/:code), or ?orderId= (own order, or a guest order saved on this device)
  useEffect(() => {
    if (codeParam) {
      setCodeInput(codeParam);
      runLookup({ code: codeParam });
      return;
    }
    if (queryOrderId) {
      const saved = getGuestOrder(queryOrderId);
      if (saved) {
        setCodeInput(saved.trackingCode);
        runLookup({ code: saved.trackingCode, orderNumber: saved.orderNumber });
      } else if (isAuthenticated) {
        runLookup({ ownOrder: queryOrderId });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [codeParam, queryOrderId, isAuthenticated]);

  // Keep the status fresh while the page is open (every 30 s, only when visible)
  useEffect(() => {
    if (!lookup) return undefined;
    const tick = () => document.visibilityState === "visible" && runLookup(lookup, { quiet: true });
    const timer = setInterval(tick, 30000);
    return () => clearInterval(timer);
  }, [lookup, runLookup]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const orderNumber = orderIdInput.trim();
    const code = codeInput.trim();
    if (code) {
      runLookup({ code, orderNumber: orderNumber || null });
      return;
    }
    if (orderNumber && isAuthenticated) {
      runLookup({ ownOrder: orderNumber });
      return;
    }
    setStatus("error");
    setErrorMessage(
      orderNumber
        ? "Please enter the tracking code from your order confirmation as well (or sign in if the order is in your account)."
        : "Please enter your order ID and tracking code."
    );
  };

  const timeline = useMemo(() => {
    if (!trackedOrder) return [];
    const raw = trackedOrder.rawStatus || trackedOrder.status;
    const level = levelOf(raw);
    const stopped = ["cancelled"].includes(toStatusKey(raw));
    const history = trackedOrder.timeline || [];
    return MILESTONES.map((m, idx) => {
      const reached = stopped ? idx === 0 : idx <= level;
      const entry = history.find((t) => String(t.status || "").toLowerCase().includes(m.name.toLowerCase()));
      return {
        name: m.name,
        reached,
        current: !stopped && idx === level,
        time: reached ? entry?.time || (idx === 0 ? trackedOrder.createdAt : null) : null,
      };
    });
  }, [trackedOrder]);

  const raw = trackedOrder ? toStatusKey(trackedOrder.rawStatus || trackedOrder.status) : "";
  const payment = trackedOrder ? paymentLabel(trackedOrder) : null;

  return (
    <div className="bg-[#FBFAF6] min-h-screen py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <Breadcrumbs items={[{ label: "Track Your Order" }]} />

        <div className="text-center max-w-xl mx-auto py-6">
          <div className="w-12 h-12 rounded-full bg-[#173D2A]/10 text-[#173D2A] flex items-center justify-center mx-auto mb-3">
            <Truck size={24} />
          </div>
          <h1 className="font-heading tracking-tight text-3xl font-bold text-[#171A17]">Track Your Order</h1>
          <p className="text-xs sm:text-sm text-[#666B64] mt-1.5 leading-relaxed">
            Open the private tracking link from your order confirmation, or enter your order ID and tracking code below.
          </p>
        </div>

        {/* Lookup form */}
        <div className="bg-white rounded-3xl border border-[#E5E7DF] p-4 sm:p-6 shadow-xs mb-8 max-w-xl mx-auto">
          <form onSubmit={handleSubmit} className="space-y-3 text-xs" noValidate>
            <div>
              <label htmlFor="trk-order" className="block font-semibold text-[#171A17] mb-1">Order ID</label>
              <input
                id="trk-order"
                type="text"
                autoComplete="off"
                autoCapitalize="characters"
                value={orderIdInput}
                onChange={(e) => setOrderIdInput(e.target.value.toUpperCase())}
                placeholder="e.g. DA-20261116-123456"
                className="w-full px-4 py-2.5 text-sm sm:text-xs bg-stone-50 border border-[#E5E7DF] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#386B40] font-mono"
              />
            </div>
            <div>
              <label htmlFor="trk-code" className="block font-semibold text-[#171A17] mb-1">
                Tracking code {isAuthenticated && <span className="font-normal text-stone-400">(not needed for orders in your account)</span>}
              </label>
              <input
                id="trk-code"
                type="text"
                autoComplete="off"
                autoCapitalize="characters"
                spellCheck={false}
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                placeholder="XXXX-XXXX-XXXX-XXXX"
                className="w-full px-4 py-2.5 text-sm sm:text-xs bg-stone-50 border border-[#E5E7DF] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#386B40] font-mono tracking-wider"
              />
            </div>
            <button
              type="submit"
              disabled={status === "loading"}
              className="w-full py-3 bg-[#173D2A] hover:bg-[#0B2416] text-white text-sm font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors shadow-xs disabled:opacity-60 cursor-pointer"
            >
              {status === "loading" ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
              <span>{status === "loading" ? "Looking up..." : "Track Order"}</span>
            </button>
          </form>

          {deviceOrders.length > 0 && (
            <div className="mt-4 pt-4 border-t border-[#E5E7DF] text-xs">
              <span className="text-stone-400 block mb-1.5">Orders placed on this device:</span>
              <div className="flex flex-wrap gap-2">
                {deviceOrders.slice(0, 5).map((o) => (
                  <button
                    key={o.orderNumber}
                    type="button"
                    onClick={() => navigate(`/track/${o.trackingCode.replace(/-/g, "")}`)}
                    className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-[#A9D18E]/30 text-[#173D2A] font-mono text-xs font-semibold cursor-pointer"
                  >
                    {o.orderNumber}
                  </button>
                ))}
              </div>
            </div>
          )}
          {isAuthenticated && (
            <p className="mt-3 text-[11px] text-stone-500">
              Signed in? All your account orders are in{" "}
              <Link to="/account/orders" className="font-semibold text-[#173D2A] underline">My Orders</Link>.
            </p>
          )}
        </div>

        {status === "error" && (
          <div role="alert" className="bg-white rounded-3xl border border-[#E5E7DF] p-6 sm:p-8 text-center max-w-md mx-auto">
            <AlertCircle size={28} className="text-amber-600 mx-auto mb-2" />
            <p className="text-sm font-semibold text-[#171A17] mb-1">Order not found</p>
            <p className="text-xs text-[#666B64]">{errorMessage}</p>
            <p className="text-[11px] text-stone-400 mt-3">
              Lost your tracking code? <Link to="/contact" className="underline">Contact us</Link> with your order ID and we'll help.
            </p>
          </div>
        )}

        {status === "loading" && !trackedOrder && (
          <div className="flex justify-center py-10" aria-live="polite">
            <Loader2 size={24} className="animate-spin text-[#386B40]" />
          </div>
        )}

        {status === "found" && trackedOrder && (
          <div className="bg-white rounded-3xl border border-[#E5E7DF] p-5 sm:p-10 shadow-xs space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-[#E5E7DF] gap-4">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-[#386B40]">Order</span>
                <h2 className="font-heading tracking-tight text-xl sm:text-2xl font-bold text-[#171A17] font-mono break-all">
                  {trackedOrder.orderNumber || trackedOrder.id}
                </h2>
                <p className="text-xs text-[#666B64] mt-0.5">Placed on {formatDate(trackedOrder.createdAt)}</p>
              </div>
              <div className="sm:text-right space-y-1.5">
                <span className={`inline-block px-3 py-1 rounded-full text-xs font-bold border ${badgeColor(raw)}`}>{trackedOrder.status}</span>
                <div>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold ${payment.tone}`}>
                    <CreditCard size={11} /> {payment.text}
                  </span>
                </div>
                {raw !== "cancelled" && raw !== "delivered" && trackedOrder.estimatedDelivery && (
                  <p className="text-xs text-stone-500">
                    Est. arrival: <strong>{formatDate(trackedOrder.estimatedDelivery)}</strong>
                  </p>
                )}
              </div>
            </div>

            {raw === "cancelled" && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-800 flex items-start gap-2">
                <XCircle size={16} className="shrink-0 mt-0.5" />
                <span>
                  This order was cancelled.
                  {String(trackedOrder.paymentStatus).toLowerCase().includes("refund")
                    ? " Your payment has been refunded to the original payment method."
                    : String(trackedOrder.paymentStatus).toLowerCase() === "paid"
                      ? " Any amount paid online will be refunded to the original payment method."
                      : ""}
                </span>
              </div>
            )}
            {raw === "partially_cancelled" && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>
                  Certain items in this order were cancelled.
                  {String(trackedOrder.paymentStatus).toLowerCase().includes("refund") || trackedOrder.refundStatus === "completed"
                    ? " The refund for the cancelled items has been processed to your original payment method."
                    : String(trackedOrder.paymentStatus).toLowerCase() === "paid"
                      ? " The refund for the cancelled items is being processed."
                      : ""}
                </span>
              </div>
            )}
            {(raw === "return_requested" || raw === "returned") && (
              <div className="p-4 rounded-2xl bg-violet-50 border border-violet-200 text-xs text-violet-800 flex items-start gap-2">
                <RotateCcw size={16} className="shrink-0 mt-0.5" />
                <span>{raw === "returned" ? "This order has been returned." : "A return has been requested for this order."}</span>
              </div>
            )}
            {raw === "pending_payment" && (
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2">
                <AlertCircle size={16} className="shrink-0 mt-0.5" />
                <span>
                  We're waiting for your online payment to be confirmed.{" "}
                  {getGuestOrder(trackedOrder.orderNumber) || !trackedOrder.isGuestView ? (
                    <Link to={`/order-confirmation/${trackedOrder.orderNumber}`} className="font-semibold underline">
                      Check or complete payment
                    </Link>
                  ) : (
                    "If you paid, this updates automatically within a few minutes."
                  )}
                </span>
              </div>
            )}

            {/* Timeline */}
            <div className="space-y-6">
              <h3 className="font-heading tracking-tight text-lg font-bold text-[#171A17]">Order Progress</h3>
              <ol className="relative pl-6 space-y-7 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#E5E7DF]">
                {timeline.map((step) => (
                  <li key={step.name} className="relative flex items-start gap-4" aria-current={step.current ? "step" : undefined}>
                    <div
                      className={`absolute -left-6 w-5 h-5 rounded-full flex items-center justify-center text-white ring-4 ring-white ${
                        step.reached ? "bg-[#173D2A]" : "bg-stone-300"
                      }`}
                    >
                      {step.reached ? <CheckCircle2 size={13} /> : <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                    </div>
                    <div className="flex-1">
                      <h4 className={`text-sm ${step.reached ? "font-bold text-[#171A17]" : "font-medium text-stone-400"}`}>
                        {step.name}
                        {step.current && <span className="ml-2 text-[10px] font-semibold text-[#386B40] uppercase">Current</span>}
                      </h4>
                      {step.time && <p className="text-xs text-stone-400 mt-0.5">{formatDate(step.time)}</p>}
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            {/* Courier */}
            {(trackedOrder.carrier || trackedOrder.trackingNumber) && (
              <div className="p-4 bg-emerald-50/50 rounded-2xl border border-emerald-200/70 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-[#173D2A]/10 text-[#173D2A] flex items-center justify-center shrink-0">
                    <Truck size={20} />
                  </div>
                  <div>
                    <div className="font-bold text-[#171A17] text-sm">{trackedOrder.carrier || "Courier partner"}</div>
                    {trackedOrder.trackingNumber && (
                      <div className="text-stone-500 font-mono mt-0.5 flex items-center gap-1.5">
                        <span>AWB: {trackedOrder.trackingNumber}</span>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText(trackedOrder.trackingNumber);
                            setCopiedAwb(true);
                            setTimeout(() => setCopiedAwb(false), 2000);
                          }}
                          className="text-[#173D2A] hover:underline flex items-center gap-1 font-sans text-xs font-semibold ml-1 cursor-pointer"
                          aria-label="Copy AWB number"
                        >
                          {copiedAwb ? <Check size={13} className="text-emerald-700" /> : <Copy size={13} />}
                          <span>{copiedAwb ? "Copied" : "Copy"}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                {(trackedOrder.trackingUrl || trackedOrder.trackingNumber) && (
                  <a
                    href={trackedOrder.trackingUrl || `https://shiprocket.co/tracking/${trackedOrder.trackingNumber}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#173D2A] text-white rounded-xl text-xs font-semibold hover:bg-[#0B2416] transition-colors shrink-0 shadow-xs"
                  >
                    <ExternalLink size={14} />
                    <span>Live courier tracking</span>
                  </a>
                )}
              </div>
            )}

            {trackedOrder.shipment?.trackingEvents?.length > 0 && (
              <div className="pt-4 border-t border-[#E5E7DF] space-y-3">
                <h4 className="font-heading tracking-tight text-sm font-bold text-[#171A17] flex items-center gap-2">
                  <Truck size={16} className="text-[#386B40]" />
                  <span>Courier updates</span>
                </h4>
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1" data-lenis-prevent="true">
                  {trackedOrder.shipment.trackingEvents.slice().reverse().map((ev, i) => (
                    <div key={i} className="p-3 rounded-xl bg-stone-50 border border-stone-200/70 text-xs">
                      <div className="flex items-center justify-between gap-2 font-semibold text-[#171A17]">
                        <span>{ev.status}</span>
                        <span className="text-stone-400 font-normal text-[11px] shrink-0">{formatDate(ev.time)}</span>
                      </div>
                      {ev.activity && <p className="text-stone-600 mt-1">{ev.activity}</p>}
                      {ev.location && <p className="text-stone-400 text-[11px] mt-0.5">{ev.location}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Items */}
            {trackedOrder.items?.length > 0 && (
              <div className="space-y-3">
                <h4 className="font-heading tracking-tight text-sm font-bold text-[#171A17] flex items-center gap-2">
                  <Package size={16} className="text-[#386B40]" />
                  <span>Items</span>
                </h4>
                <ul className="divide-y divide-stone-100">
                  {trackedOrder.items.map((item, idx) => (
                    <li key={idx} className="py-2.5 flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-3 min-w-0">
                        <OrderItemImage src={item.image} name={item.name} size={40} className="rounded-lg" />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-[#171A17] block truncate">{item.name}</span>
                            {(item.isCancelled || item.cancelledQuantity > 0) && (
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-100 text-rose-700 shrink-0">
                                Cancelled {item.cancelledQuantity ? `(${item.cancelledQuantity})` : ""}
                              </span>
                            )}
                          </div>
                          <span className="text-stone-500">
                            {item.size} &times; {item.quantity}
                          </span>
                        </div>
                      </div>
                      {item.total !== undefined && <span className="font-semibold shrink-0">{formatINR(item.total)}</span>}
                    </li>
                  ))}
                </ul>
                {trackedOrder.pricing?.total !== undefined && (
                  <div className="flex justify-between text-sm font-bold text-[#171A17] pt-2 border-t border-[#E5E7DF]">
                    <span>Order total</span>
                    <span>{formatINR(trackedOrder.pricing.total)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Destination (no street address on the private tracking view) */}
            <div className="p-4 bg-[#FBFAF6] rounded-2xl border border-[#E5E7DF] flex items-start gap-3 text-xs sm:text-sm">
              <MapPin size={20} className="text-[#386B40] shrink-0 mt-0.5" />
              <div>
                <h4 className="font-bold text-[#171A17]">Delivering to</h4>
                <p className="text-stone-600 mt-0.5">
                  {trackedOrder.customer?.name}
                  {trackedOrder.shippingAddress?.street && !trackedOrder.isGuestView ? ` • ${trackedOrder.shippingAddress.street}` : ""} &bull;{" "}
                  {[trackedOrder.shippingAddress?.city, trackedOrder.shippingAddress?.state].filter(Boolean).join(", ")}
                  {trackedOrder.shippingAddress?.pincode ? ` - ${trackedOrder.shippingAddress.pincode}` : ""}
                </p>
                {trackedOrder.isGuestView && trackedOrder.customer?.phone && (
                  <p className="text-[11px] text-stone-400 mt-0.5">Contact: {trackedOrder.customer.phone}</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
