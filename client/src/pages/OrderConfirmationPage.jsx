import React, { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
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
} from "lucide-react";
import { load } from "@cashfreepayments/cashfree-js";
import { useOrders } from "../context/OrderContext";
import { formatINR, formatDate } from "../utils/formatters";

export const OrderConfirmationPage = () => {
  const { orderId } = useParams();
  const { getOrderById } = useOrders();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [verifyingPayment, setVerifyingPayment] = useState(false);
  const [retryingPayment, setRetryingPayment] = useState(false);

  const checkPaymentStatus = async (ordNum) => {
    if (!ordNum) return;
    try {
      setVerifyingPayment(true);
      const res = await fetch(`/api/v1/payment/cashfree/orders/${encodeURIComponent(ordNum)}/status?_t=${Date.now()}`, {
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

  const handleRetryPayment = async () => {
    if (!order) return;
    const ordNum = order.orderNumber || order.id;
    setRetryingPayment(true);
    try {
      const sessRes = await fetch("/api/v1/payment/cashfree/session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ orderNumber: ordNum }),
      });
      const sessData = await sessRes.json();
      if (!sessData.success || !sessData.data?.paymentSessionId) {
        throw new Error(sessData.error?.message || "Could not initialize Cashfree session.");
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
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div className="animate-spin w-8 h-8 border-4 border-[#173D2A] border-t-transparent rounded-full mx-auto mb-4" />
        <p className="text-sm text-stone-500">Retrieving your order details...</p>
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
              <p>{order.shippingAddress?.street}</p>
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
                  <img
                    src={item.image}
                    alt={item.name}
                    className="w-12 h-12 rounded-xl object-contain bg-[#FBFAF6] border p-1"
                  />
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
              to={`/track-order?orderId=${order.id}`}
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
