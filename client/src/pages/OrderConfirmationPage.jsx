import React, { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  CheckCircle2,
  Package,
  Truck,
  MapPin,
  Calendar,
  CreditCard,
  Printer,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  Copy,
  Check,
  Share2,
  UserPlus,
  KeyRound,
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { getGuestOrder, getClaimToken, setPendingClaim, trackingLinkFor } from "../utils/guestOrders";
import { trackEvent, purchaseEventId, contentParams } from "../utils/metaPixel";
import { load } from "@cashfreepayments/cashfree-js";
import { useOrders } from "../context/OrderContext";
import { formatINR, formatDate } from "../utils/formatters";
import { Skeleton, SkeletonRegion } from "../components/common/Skeleton";
import { OrderItemImage } from "../components/common/OrderItemImage";

export const OrderConfirmationPage = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { getOrderById, claimGuestOrder, claimNotice, clearClaimNotice } = useOrders();
  const { isAuthenticated, isAdmin } = useAuth();
  const [copied, setCopied] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimResult, setClaimResult] = useState(null);
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [retryingPayment, setRetryingPayment] = useState(false);

  const checkPaymentStatus = async (ordNum) => {
    if (!ordNum) return;
    try {
      setVerifyingPayment(true);
      const res = await fetch(`/api/v1/payments/cashfree/orders/${encodeURIComponent(ordNum)}/status?_t=${Date.now()}`, {
        credentials: "include",
      });
      const data = await res.json();
      if (data.success && data.data) {
        setOrder((prev) =>
          prev
            ? {
                ...prev,
                paymentStatus: data.data.paymentStatus || prev.paymentStatus,
                status: data.data.orderStatus || prev.status,
              }
            : prev
        );
      }
    } catch (err) {
      console.warn("Could not check payment status:", err);
    } finally {
      setVerifyingPayment(false);
    }
  };

  useEffect(() => {
    const fetchOrder = async () => {
      setLoading(true);
      try {
        const found = await getOrderById(orderId);
        setOrder(found);
        if (found) {
          const isOnline =
            !String(found.paymentMethod || "").toLowerCase().includes("cod") &&
            !String(found.paymentMethod || "").toLowerCase().includes("cash");
          if (isOnline && String(found.paymentStatus || "").toLowerCase() !== "paid") {
            await checkPaymentStatus(found.orderNumber || found.id);
          }
        }
      } catch (err) {
        console.error("Error retrieving order:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId]);

  // Meta Ads purchase (browser side): COD orders at once, online orders only after the server confirms
  // payment. Same event id as the server's Conversions API event, and fired once per browser.
  useEffect(() => {
    if (!order) return;
    const method = String(order.paymentMethod || "").toLowerCase();
    const cod = method.includes("cod") || method.includes("cash");
    const paid = String(order.paymentStatus || "").toLowerCase() === "paid";
    const cancelled = String(order.rawStatus || order.status || "").toLowerCase() === "cancelled";
    if (cancelled || (!cod && !paid)) return;
    const orderNumber = order.orderNumber || order.id;
    const lines = (order.items || []).map((i) => ({ productId: i.productId || i.sku || i.name, price: Number(i.price) || 0, quantity: i.quantity }));
    trackEvent("Purchase", contentParams(lines, order.pricing?.total), {
      eventId: purchaseEventId(orderNumber),
      onceKey: purchaseEventId(orderNumber),
    });
  }, [order?.orderNumber, order?.paymentStatus]);

  const orderNumberForGuest = order?.orderNumber || order?.id;
  const guestRecord = orderNumberForGuest ? getGuestOrder(orderNumberForGuest) : null;
  const trackingLink = guestRecord ? trackingLinkFor(guestRecord.trackingCode) : "";
  const canClaim = Boolean(guestRecord && getClaimToken(orderNumberForGuest) && !order?.linkedToAccount && !claimResult?.ok);

  const copyTrackingLink = async () => {
    try {
      await navigator.clipboard.writeText(trackingLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch (_) {}
  };

  const shareTrackingLink = async () => {
    const text = `My Divyam Ayurveda order ${orderNumberForGuest}: track it here ${trackingLink}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Track my order", text, url: trackingLink });
        return;
      } catch (_) {
        return; // closed the share sheet
      }
    }
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  };

  const handleClaim = async () => {
    setClaiming(true);
    const result = await claimGuestOrder(orderNumberForGuest);
    setClaimResult(result);
    setClaiming(false);
    if (result.ok) {
      const fresh = await getOrderById(orderNumberForGuest);
      if (fresh) setOrder(fresh);
    }
  };

  // Not signed in: remember the choice, then finish linking right after sign-in / registration
  const goToAccount = (path) => {
    setPendingClaim(orderNumberForGuest);
    navigate(path, {
      state: {
        from: `/order-confirmation/${orderNumberForGuest}`,
        message:
          path === "/register"
            ? "Create a free account and this order will be added to My Orders."
            : "Sign in and this order will be added to your account.",
      },
    });
  };

  // Linking finished after sign-in (OrderContext did it): show the result here and refresh the order
  const notice = claimNotice && claimNotice.orderNumber === orderNumberForGuest ? claimNotice : null;
  useEffect(() => {
    if (!notice) return;
    setClaimResult({ ok: notice.ok, message: notice.message });
    clearClaimNotice();
    if (notice.ok) getOrderById(notice.orderNumber).then((fresh) => fresh && setOrder(fresh));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notice]);

  const handleRetryPayment = async () => {
    if (!order) return;
    const ordNum = order.orderNumber || order.id;
    setRetryingPayment(true);
    try {
      const sessRes = await fetch("/api/v1/payments/cashfree/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ orderNumber: ordNum }),
      });
      const sessData = await sessRes.json();
      if (!sessData.success || !sessData.data?.paymentSessionId) {
        throw new Error(sessData.error?.message || "Could not initialize Cashfree session.");
      }
      if (sessData.data.paymentSessionId.startsWith("session_mock_")) {
        throw new Error("Online payment is in test mode on this server, so no real payment can be taken.");
      }

      const cashfree = await load({
        mode: sessData.data.environment === "production" ? "production" : "sandbox",
      });
      await cashfree.checkout({
        paymentSessionId: sessData.data.paymentSessionId,
        redirectTarget: "_modal",
      });

      await checkPaymentStatus(ordNum);
    } catch (err) {
      alert(err.message || "Payment retry failed.");
    } finally {
      setRetryingPayment(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-[#FBFAF6] min-h-screen py-10">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <SkeletonRegion label="Retrieving your order details" className="space-y-6">
            <div className="flex flex-col items-center gap-3 py-4">
              <Skeleton className="h-16 w-16 rounded-full" />
              <Skeleton className="h-8 w-72 max-w-full" />
              <Skeleton className="h-4 w-96 max-w-full" />
            </div>
            <div className="bg-white rounded-3xl border border-[#E5E7DF] p-6 sm:p-8 space-y-4">
              <Skeleton className="h-5 w-40" />
              {[0, 1, 2].map((i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-16 w-16 rounded-xl shrink-0" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/5" />
                    <Skeleton className="h-3 w-1/4" />
                  </div>
                  <Skeleton className="h-5 w-16 shrink-0" />
                </div>
              ))}
            </div>
          </SkeletonRegion>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <h2 className="font-heading tracking-tight text-2xl font-bold mb-2">Order Not Found</h2>
        <p className="text-sm text-stone-500 mb-6">
          Could not locate order ID &ldquo;{orderId}&rdquo;.
        </p>
        <Link
          to="/products"
          className="px-6 py-2.5 bg-[#173D2A] text-white text-xs font-semibold rounded-xl"
        >
          Return to Catalog
        </Link>
      </div>
    );
  }

  const isOnline =
    !String(order.paymentMethod || "").toLowerCase().includes("cod") &&
    !String(order.paymentMethod || "").toLowerCase().includes("cash");
  const isPaid = String(order.paymentStatus || "").toLowerCase() === "paid";

  return (
    <div className="bg-[#FBFAF6] min-h-screen py-10">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Payment Pending Banner if Online & Not Paid */}
        {isOnline && !isPaid ? (
          <div className="bg-amber-50 rounded-3xl border border-amber-200 p-6 sm:p-10 text-center shadow-xs mb-8 animate-in fade-in duration-300">
            <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-700 flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={36} className="text-amber-700" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-amber-800">
              Payment Pending Verification
            </span>
            <h1 className="font-heading tracking-tight text-3xl font-bold text-[#171A17] mt-1 mb-2">
              Order Registered, Awaiting Payment Confirmation
            </h1>
            <p className="text-sm text-stone-600 max-w-lg mx-auto leading-relaxed">
              We received your order, but your online payment is currently pending confirmation from Cashfree Payment Gateway.
            </p>

            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={() => checkPaymentStatus(order.orderNumber || order.id)}
                disabled={verifyingPayment}
                className="px-5 py-2.5 bg-white border border-stone-300 hover:bg-stone-50 text-stone-700 text-xs font-semibold rounded-xl inline-flex items-center gap-2 cursor-pointer transition-colors shadow-xs"
              >
                <RefreshCw size={14} className={verifyingPayment ? "animate-spin text-stone-700" : ""} />
                <span>{verifyingPayment ? "Checking Gateway..." : "Refresh Payment Status"}</span>
              </button>
              <button
                type="button"
                onClick={handleRetryPayment}
                disabled={retryingPayment}
                className="px-6 py-2.5 bg-[#173D2A] hover:bg-[#0B2416] text-white text-xs font-semibold rounded-xl inline-flex items-center gap-2 cursor-pointer transition-colors shadow-xs"
              >
                <CreditCard size={14} />
                <span>{retryingPayment ? "Opening Gateway..." : "Complete Online Payment"}</span>
              </button>
            </div>
          </div>
        ) : (
          /* Success Card Header */
          <div className="bg-white rounded-3xl border border-[#E5E7DF] p-6 sm:p-10 text-center shadow-xs mb-8 animate-in fade-in duration-300">
            <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-4 animate-in zoom-in-75 duration-300">
              <CheckCircle2 size={36} className="text-emerald-700" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-[#386B40]">
              {isOnline ? "Payment Received & Order Confirmed" : "Order Successfully Placed (COD)"}
            </span>
            <h1 className="font-heading tracking-tight text-3xl sm:text-4xl font-bold text-[#171A17] mt-1 mb-2">
              Thank You, {order.customer?.name}!
            </h1>
            <p className="text-sm text-[#666B64] max-w-lg mx-auto leading-relaxed">
              Your authentic Ayurvedic formulation order has been received at our dispensary. We are preparing your fresh herbal batch for secure dispatch.
            </p>

            <div className="mt-6 inline-flex flex-wrap items-center justify-center gap-4 p-3 bg-[#FBFAF6] rounded-2xl border border-[#E5E7DF] text-xs">
              <div>
                <span className="text-stone-400 block">Order ID:</span>
                <strong className="text-[#171A17] font-mono text-sm">{order.id}</strong>
              </div>
              <div className="hidden sm:block text-stone-300">|</div>
              <div>
                <span className="text-stone-400 block">Estimated Delivery:</span>
                <strong className="text-[#173D2A]">{formatDate(order.estimatedDelivery)}</strong>
              </div>
              <div className="hidden sm:block text-stone-300">|</div>
              <div>
                <span className="text-stone-400 block">Status:</span>
                <span className="inline-block px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold">
                  {order.status}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Guest order: private tracking link + optional account */}
        {guestRecord && (
          <div className="bg-white rounded-3xl border border-[#E5E7DF] p-5 sm:p-6 shadow-xs mb-8 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-full bg-[#173D2A]/10 text-[#173D2A] flex items-center justify-center shrink-0">
                <KeyRound size={18} />
              </div>
              <div>
                <h2 className="font-heading tracking-tight text-lg font-bold text-[#171A17]">Your private tracking link</h2>
                <p className="text-xs text-stone-600 mt-0.5">
                  Save or share this link to follow your order without an account. Anyone with the link can see the order status,
                  so share it only with people you trust.
                </p>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-[#FBFAF6] border border-[#E5E7DF] text-xs space-y-1">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="text-stone-500">Tracking code</span>
                <strong className="font-mono text-sm tracking-wider text-[#171A17]">{guestRecord.trackingCode}</strong>
              </div>
              <p className="text-stone-500 break-all">{trackingLink}</p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={copyTrackingLink}
                className="px-4 py-2.5 rounded-xl border border-[#E5E7DF] bg-white hover:bg-stone-50 text-xs font-semibold text-[#173D2A] inline-flex items-center gap-1.5 cursor-pointer"
              >
                {copied ? <Check size={14} className="text-emerald-700" /> : <Copy size={14} />}
                <span>{copied ? "Link copied" : "Copy link"}</span>
              </button>
              <button
                type="button"
                onClick={shareTrackingLink}
                className="px-4 py-2.5 rounded-xl border border-[#E5E7DF] bg-white hover:bg-stone-50 text-xs font-semibold text-[#173D2A] inline-flex items-center gap-1.5 cursor-pointer"
              >
                <Share2 size={14} />
                <span>Share (WhatsApp)</span>
              </button>
              <Link
                to={`/track/${guestRecord.trackingCode.replace(/-/g, "")}`}
                className="px-4 py-2.5 rounded-xl bg-[#386B40] hover:bg-[#173D2A] text-white text-xs font-semibold inline-flex items-center gap-1.5"
              >
                <Truck size={14} />
                <span>Open tracking page</span>
              </Link>
            </div>

            {claimResult && (
              <p
                role="status"
                className={`text-xs rounded-xl px-3 py-2 border ${
                  claimResult.ok ? "bg-emerald-50 border-emerald-200 text-emerald-800" : "bg-amber-50 border-amber-200 text-amber-800"
                }`}
              >
                {claimResult.message}
                {claimResult.ok && (
                  <>
                    {" "}
                    <Link to="/account/orders" className="font-semibold underline">
                      View My Orders
                    </Link>
                  </>
                )}
              </p>
            )}

            {canClaim && !isAdmin && (
              <div className="pt-4 border-t border-[#E5E7DF] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-2 text-xs text-stone-600">
                  <UserPlus size={16} className="text-[#386B40] shrink-0 mt-0.5" />
                  <span>
                    {isAuthenticated
                      ? "Keep this order with your other orders in My Orders."
                      : "Optional: create a free account to see this and future orders in one place."}
                  </span>
                </div>
                {isAuthenticated ? (
                  <button
                    type="button"
                    onClick={handleClaim}
                    disabled={claiming}
                    className="px-5 py-2.5 rounded-xl bg-[#173D2A] hover:bg-[#0B2416] text-white text-xs font-semibold disabled:opacity-60 cursor-pointer shrink-0"
                  >
                    {claiming ? "Adding..." : "Save to my account"}
                  </button>
                ) : (
                  <div className="flex gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => goToAccount("/register")}
                      className="px-4 py-2.5 rounded-xl bg-[#173D2A] hover:bg-[#0B2416] text-white text-xs font-semibold cursor-pointer"
                    >
                      Create account
                    </button>
                    <button
                      type="button"
                      onClick={() => goToAccount("/login")}
                      className="px-4 py-2.5 rounded-xl border border-[#E5E7DF] bg-white hover:bg-stone-50 text-xs font-semibold text-[#173D2A] cursor-pointer"
                    >
                      Sign in
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Order Details & Summary Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {/* Shipping & Payment Box */}
          <div className="bg-white rounded-3xl border border-[#E5E7DF] p-6 space-y-4">
            <h3 className="font-heading tracking-tight text-lg font-bold text-[#171A17] flex items-center gap-2">
              <MapPin size={18} className="text-[#386B40]" />
              <span>Shipping Information</span>
            </h3>
            <div className="text-xs sm:text-sm text-stone-600 space-y-1">
              <p className="font-bold text-[#171A17]">{order.customer?.name}</p>
              {order.shippingAddress?.street && <p>{order.shippingAddress.street}</p>}
              {order.shippingAddress?.line2 && <p>{order.shippingAddress.line2}</p>}
              <p>
                {order.shippingAddress?.city}, {order.shippingAddress?.state} -{" "}
                {order.shippingAddress?.pincode}
              </p>
              <p className="pt-1 text-stone-500">Phone: {order.customer?.phone}</p>
              <p className="text-stone-500">Email: {order.customer?.email}</p>
            </div>

            <div className="pt-3 border-t border-[#E5E7DF] flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs font-semibold text-[#171A17] mb-1">
                  <CreditCard size={15} className="text-[#386B40]" />
                  <span>Payment Method</span>
                </div>
                <p className="text-xs text-stone-600">{order.paymentMethod}</p>
              </div>
              <span
                className={`px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider ${
                  isPaid ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
                }`}
              >
                {order.paymentStatus || "Pending"}
              </span>
            </div>
          </div>

          {/* Timeline & Dispatch Box */}
          <div className="bg-white rounded-3xl border border-[#E5E7DF] p-6 space-y-4">
            <h3 className="font-heading tracking-tight text-lg font-bold text-[#171A17] flex items-center gap-2">
              <Truck size={18} className="text-[#386B40]" />
              <span>Fulfillment Status</span>
            </h3>

            <div className="space-y-3 pt-2">
              {order.timeline?.map((step, idx) => (
                <div key={idx} className="flex items-center gap-3 text-xs">
                  <div
                    className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${
                      step.completed
                        ? "bg-[#173D2A] text-white"
                        : "bg-stone-100 text-stone-400"
                    }`}
                  >
                    {step.completed ? <CheckCircle2 size={14} /> : <span>{idx + 1}</span>}
                  </div>
                  <div className="flex-1 flex justify-between">
                    <span
                      className={
                        step.completed
                          ? "font-bold text-[#171A17]"
                          : "text-stone-500"
                      }
                    >
                      {step.status}
                    </span>
                    {step.time && (
                      <span className="text-[11px] text-stone-400">
                        {formatDate(step.time)}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Ordered Products Table */}
        <div className="bg-white rounded-3xl border border-[#E5E7DF] p-6 sm:p-8 shadow-xs mb-8">
          <h3 className="font-heading tracking-tight text-lg font-bold text-[#171A17] pb-4 mb-4 border-b border-[#E5E7DF]">
            Ordered Formulations
          </h3>

          <div className="divide-y divide-stone-100">
            {order.items?.map((item, idx) => (
              <div key={idx} className="py-3 flex items-center justify-between gap-4 text-xs sm:text-sm">
                <div className="flex items-center gap-3">
                  <OrderItemImage src={item.image} name={item.name} size={48} className="rounded-xl" />
                  <div>
                    <span className="font-bold text-[#171A17] block">{item.name}</span>
                    <span className="text-stone-500 text-xs">
                      {item.size} × {item.quantity}
                    </span>
                  </div>
                </div>
                <span className="font-bold text-[#171A17]">{formatINR(item.total)}</span>
              </div>
            ))}
          </div>

          <div className="border-t border-[#E5E7DF] pt-4 space-y-2 text-xs sm:text-sm mt-4">
            <div className="flex justify-between text-[#666B64]">
              <span>Items Subtotal</span>
              <span>{formatINR(order.pricing?.subtotal)}</span>
            </div>
            {order.pricing?.discount > 0 && (
              <div className="flex justify-between text-emerald-700">
                <span>Botanical Savings</span>
                <span>-{formatINR(order.pricing?.discount)}</span>
              </div>
            )}
            <div className="flex justify-between text-[#666B64]">
              <span>Shipping Charge</span>
              <span>
                {order.pricing?.shipping === 0 ? "FREE" : formatINR(order.pricing?.shipping)}
              </span>
            </div>
            <div className="border-t border-[#E5E7DF] pt-3 flex justify-between items-baseline">
              <span className="text-base font-heading tracking-tight font-bold text-[#171A17]">Total Paid</span>
              <span className="text-2xl font-bold text-[#173D2A]">
                {formatINR(order.pricing?.total)}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <button
            onClick={() => window.print()}
            className="px-5 py-2.5 bg-white border border-[#E5E7DF] hover:bg-stone-50 text-stone-700 text-xs font-semibold rounded-xl flex items-center gap-2"
          >
            <Printer size={15} />
            <span>Print Order Receipt</span>
          </button>

          <div className="flex items-center gap-3">
            <Link
              to={guestRecord ? `/track/${guestRecord.trackingCode.replace(/-/g, "")}` : `/track-order?orderId=${order.id}`}
              className="px-5 py-2.5 bg-[#386B40] hover:bg-[#173D2A] text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
            >
              <Truck size={15} />
              <span>Track Delivery Status</span>
            </Link>
            <Link
              to="/products"
              className="px-5 py-2.5 bg-[#173D2A] hover:bg-[#0B2416] text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors"
            >
              <span>Continue Shopping</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};
