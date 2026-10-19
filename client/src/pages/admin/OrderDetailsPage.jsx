import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import {
  ArrowLeft,
  Printer,
  Truck,
  CheckCircle2,
  Clock,
  AlertCircle,
  Package,
  MapPin,
  CreditCard,
  User,
  Plus,
  Send,
  Copy,
  Check,
  ExternalLink,
  FileText,
  RefreshCw,
  Zap,
} from "lucide-react";
import { useAdmin } from "../../context/AdminContext";
import { AdminCard } from "../../components/admin/common/AdminCard";
import { formatCurrency, formatDate } from "../../utils/formatters";
import { getStatusLevel } from "../../utils/orderStatus";

export const OrderDetailsPage = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const {
    orders,
    updateOrderStatus,
    updatePaymentStatus,
    refreshOrders,
    dispatchShipment,
    advanceShipment,
    updateTrackingInfo,
    getOrderShipment,
  } = useAdmin();

  useEffect(() => {
    if (refreshOrders) {
      refreshOrders();
    }
  }, []);

  const order = orders.find((o) => o.id === orderId || o.orderNumber === orderId);

  const [trackingNumber, setTrackingNumber] = useState(order?.trackingNumber || "");
  const [carrier, setCarrier] = useState(order?.carrier || "");
  const [shipment, setShipment] = useState(null);
  const [isShippingLoading, setIsShippingLoading] = useState(false);
  const [actionNotice, setActionNotice] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (order) {
      if (order.trackingNumber) setTrackingNumber(order.trackingNumber);
      if (order.carrier) setCarrier(order.carrier);
    }
  }, [order?.trackingNumber, order?.carrier]);

  useEffect(() => {
    const fetchShipment = async () => {
      if (orderId && getOrderShipment) {
        const data = await getOrderShipment(orderId);
        if (data) setShipment(data);
      }
    };
    fetchShipment();
  }, [orderId]);
  const [internalNotes, setInternalNotes] = useState(
    order?.internalNotes || [
      {
        id: 1,
        text: "Order placed by customer via website storefront.",
        author: "System",
        time: order?.date || "2026-10-12 10:30 AM",
      },
    ]
  );
  const [newNote, setNewNote] = useState("");

  if (!order) {
    return (
      <div className="py-12 text-center">
        <h2 className="text-xl font-bold text-stone-900">Order Not Found</h2>
        <p className="text-xs text-stone-500 mt-1">
          The requested order ID "{orderId}" does not exist in the database.
        </p>
        <Link
          to="/admin/orders"
          className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-[#173D2A] text-white rounded-xl text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Orders List</span>
        </Link>
      </div>
    );
  }

  const currentStatus = order.orderStatus || order.status || "Pending";

  const customerName =
    order.customerName || order.customer?.name || "Valued Customer";
  const customerEmail =
    order.email || order.customer?.email || "customer@example.com";
  const customerPhone =
    order.phone || order.customer?.phone || "+91 98765 43210";
  const grandTotal =
    Number(order.totalAmount || order.pricing?.total || order.total || 0);

  let streetAddress = "Flat 402, Lotus Residency, Baner Road";
  let city = order.city || "Pune";
  let state = order.state || "Maharashtra";
  let pincode = order.pincode || "411045";

  if (typeof order.shippingAddress === "string") {
    streetAddress = order.shippingAddress;
  } else if (order.shippingAddress && typeof order.shippingAddress === "object") {
    streetAddress = order.shippingAddress.street || order.shippingAddress.address || streetAddress;
    city = order.shippingAddress.city || city;
    state = order.shippingAddress.state || state;
    pincode = order.shippingAddress.pincode || pincode;
  }

  streetAddress = typeof streetAddress === "string" ? streetAddress : String(streetAddress || "");
  city = typeof city === "string" ? city : String(city || "");
  state = typeof state === "string" ? state : String(state || "");
  pincode = typeof pincode === "string" || typeof pincode === "number" ? String(pincode) : "";

  const handleStatusChange = async (newStatus) => {
    try {
      await updateOrderStatus(order.id, newStatus);
      setActionNotice(`Order status updated to "${newStatus}" in database.`);
      setTimeout(() => setActionNotice(""), 3500);
      const addedNote = {
        id: Date.now(),
        text: `Order status updated to "${newStatus}".`,
        author: "Admin Staff",
        time: new Date().toLocaleString(),
      };
      setInternalNotes((prev) => [addedNote, ...prev]);
    } catch (err) {
      alert(`Status update failed: ${err.message}`);
    }
  };

  const handlePaymentStatusChange = async (newPayStatus) => {
    try {
      await updatePaymentStatus(order.id, newPayStatus);
      setActionNotice(`Payment status updated to "${newPayStatus}".`);
      setTimeout(() => setActionNotice(""), 3500);
      const addedNote = {
        id: Date.now(),
        text: `Payment status updated to "${newPayStatus}".`,
        author: "Admin Staff",
        time: new Date().toLocaleString(),
      };
      setInternalNotes((prev) => [addedNote, ...prev]);
    } catch (err) {
      alert(`Payment update failed: ${err.message}`);
    }
  };

  const handleDispatchShiprocket = async () => {
    setIsShippingLoading(true);
    try {
      const res = await dispatchShipment(order.id);
      if (res.shipment) setShipment(res.shipment);
      if (res.order?.trackingNumber) setTrackingNumber(res.order.trackingNumber);
      if (res.order?.carrier) setCarrier(res.order.carrier);
      setActionNotice("Order dispatched via Shiprocket! Airway Bill (AWB) generated.");
      setTimeout(() => setActionNotice(""), 4000);
    } catch (err) {
      alert(`Shiprocket dispatch failed: ${err.message}`);
    } finally {
      setIsShippingLoading(false);
    }
  };

  const handleAdvanceCourier = async (stage) => {
    setIsShippingLoading(true);
    try {
      const res = await advanceShipment(order.id, stage);
      if (res.shipment) setShipment(res.shipment);
      setActionNotice(`Shipment progressed to: ${stage.replace(/_/g, " ")}`);
      setTimeout(() => setActionNotice(""), 4000);
    } catch (err) {
      alert(`Courier progression failed: ${err.message}`);
    } finally {
      setIsShippingLoading(false);
    }
  };

  const handleSaveTracking = async (e) => {
    e.preventDefault();
    setIsShippingLoading(true);
    try {
      await updateTrackingInfo(order.id, {
        carrier,
        trackingNumber,
      });
      setActionNotice("Courier partner and AWB tracking code saved to database.");
      setTimeout(() => setActionNotice(""), 3500);
    } catch (err) {
      alert(`Failed to save tracking: ${err.message}`);
    } finally {
      setIsShippingLoading(false);
    }
  };

  const handleCopyAWB = () => {
    if (!trackingNumber) return;
    navigator.clipboard.writeText(trackingNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleAddNote = (e) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    const added = {
      id: Date.now(),
      text: newNote.trim(),
      author: "Admin Staff",
      time: new Date().toLocaleString(),
    };
    setInternalNotes((prev) => [added, ...prev]);
    setNewNote("");
  };

  const handlePrint = () => {
    window.print();
  };

  // Stepper helper: 5 standard milestones
  const steps = ["Placed", "Packed", "Dispatched", "Out for Delivery", "Delivered"];
  const getStepIndex = getStatusLevel;
  const currentStepIndex = getStepIndex(currentStatus);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/admin/orders"
            className="p-2 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center gap-2.5">
              <h1 className="text-2xl font-bold text-stone-900 font-sans tracking-tight font-mono">
                {order.id}
              </h1>
              <span
                className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                  String(currentStatus).toLowerCase() === "delivered"
                    ? "bg-emerald-100 text-emerald-800"
                    : String(currentStatus).toLowerCase() === "dispatched" || String(currentStatus).toLowerCase() === "shipped"
                    ? "bg-blue-100 text-blue-800"
                    : String(currentStatus).toLowerCase() === "processing" || String(currentStatus).toLowerCase() === "packed"
                    ? "bg-amber-100 text-amber-800"
                    : String(currentStatus).toLowerCase() === "confirmed"
                    ? "bg-teal-100 text-teal-800"
                    : String(currentStatus).toLowerCase() === "cancelled"
                    ? "bg-rose-100 text-rose-800"
                    : "bg-stone-100 text-stone-800"
                }`}
              >
                {currentStatus}
              </span>
            </div>
            <div className="text-xs text-stone-500 mt-1 flex flex-wrap items-center gap-2">
              <span>Placed on {formatDate(order.date || order.orderDate)} • Payment:</span>
              <select
                value={order.paymentStatus || "Pending"}
                onChange={(e) => handlePaymentStatusChange(e.target.value)}
                className={`px-2 py-0.5 text-xs font-semibold rounded-md border cursor-pointer ${
                  order.paymentStatus === "Paid"
                    ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                    : order.paymentStatus === "Refunded"
                    ? "bg-purple-50 text-purple-800 border-purple-200"
                    : order.paymentStatus === "Failed"
                    ? "bg-rose-50 text-rose-800 border-rose-200"
                    : "bg-amber-50 text-amber-800 border-amber-200"
                }`}
              >
                <option value="Paid">Paid</option>
                <option value="Pending">Pending</option>
                <option value="Refunded">Refunded</option>
                <option value="Failed">Failed</option>
              </select>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 text-xs font-semibold shadow-xs transition-colors"
          >
            <Printer className="w-4 h-4 text-stone-500" />
            <span>Print Invoice / Slip</span>
          </button>
        </div>
      </div>

      {/* Action Notification Banner */}
      {actionNotice && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl flex items-center justify-between text-xs font-semibold shadow-xs animate-in fade-in duration-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{actionNotice}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionNotice("")}
            className="text-emerald-700 hover:text-emerald-900"
          >
            &times;
          </button>
        </div>
      )}

      {/* Fulfillment Stepper */}
      <AdminCard title="Fulfillment Progression" subtitle="Track and advance warehouse delivery stages">
        <div className="py-2">
          <div className="grid grid-cols-5 gap-2 relative">
            {steps.map((st, idx) => {
              const isPassed = currentStepIndex >= idx;
              const isCurrent = currentStepIndex === idx;

              return (
                <div key={st} className="flex flex-col items-center text-center">
                  <div
                    className={`w-9 h-9 rounded-full flex items-center justify-center font-bold text-xs mb-2 transition-colors ${
                      isPassed
                        ? "bg-[#173D2A] text-white shadow-xs"
                        : "bg-stone-200 text-stone-500"
                    }`}
                  >
                    {isPassed ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                  </div>
                  <span
                    className={`text-xs font-semibold ${
                      isCurrent
                        ? "text-[#173D2A] font-bold"
                        : isPassed
                        ? "text-stone-800"
                        : "text-stone-400"
                    }`}
                  >
                    {st}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Quick Advancement Buttons */}
          <div className="mt-6 pt-4 border-t border-stone-100 flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs text-stone-500 font-medium">
              Update order fulfillment stage:
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {[
                { label: "Mark Packed / Processing", status: "Processing", step: 1, idle: "bg-amber-50 text-amber-800 hover:bg-amber-100 border-amber-200", active: "bg-amber-500 border-amber-600 text-white ring-amber-300" },
                { label: "Mark Dispatched", status: "Dispatched", step: 2, idle: "bg-blue-50 text-blue-800 hover:bg-blue-100 border-blue-200", active: "bg-blue-600 border-blue-700 text-white ring-blue-300" },
                { label: "Mark Out for Delivery", status: "Out for Delivery", step: 3, idle: "bg-indigo-50 text-indigo-800 hover:bg-indigo-100 border-indigo-200", active: "bg-indigo-600 border-indigo-700 text-white ring-indigo-300" },
                { label: "Mark Delivered", status: "Delivered", step: 4, idle: "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border-emerald-200", active: "bg-emerald-600 border-emerald-700 text-white ring-emerald-300" },
              ].map((btn) => {
                // The current stage is shown as a solid, ringed button with a check mark
                const isActive = currentStepIndex === btn.step && String(currentStatus).toLowerCase() !== "cancelled";
                return (
                  <button
                    key={btn.status}
                    type="button"
                    onClick={() => handleStatusChange(btn.status)}
                    aria-pressed={isActive}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg border transition-all ${
                      isActive
                        ? `${btn.active} font-bold ring-4 shadow-md`
                        : `${btn.idle} font-semibold`
                    }`}
                  >
                    {isActive && <CheckCircle2 className="w-3.5 h-3.5" />}
                    {btn.label}
                  </button>
                );
              })}

              {String(currentStatus).toLowerCase() !== "cancelled" && (
                <button
                  type="button"
                  onClick={() => handleStatusChange("Cancelled")}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200 transition-colors"
                >
                  Cancel Order
                </button>
              )}
            </div>
          </div>
        </div>
      </AdminCard>

      {/* Main Grid: Order Items & Customer / Notes */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Line Items (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          <AdminCard title="Order Items" subtitle="Herbal remedies included in this shipment" noPadding={true}>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-stone-700">
                <thead className="bg-stone-50/80 text-[11px] font-semibold uppercase tracking-wider text-stone-500 border-b border-stone-200">
                  <tr>
                    <th className="px-4 py-3">Product</th>
                    <th className="px-4 py-3 text-right">Price</th>
                    <th className="px-4 py-3 text-center">Qty</th>
                    <th className="px-4 py-3 text-right">Subtotal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {(order.items || []).map((item, idx) => (
                    <tr key={idx} className="hover:bg-stone-50/50">
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <img
                            src={
                              item.image ||
                              "/images/ProductImages/PureHimalayanShilajit.jpeg"
                            }
                            alt={item.title}
                            className="w-12 h-12 rounded-lg object-contain border border-stone-200 flex-shrink-0"
                          />
                          <div>
                            <div className="font-semibold text-stone-900 text-sm">
                              {item.title}
                            </div>
                            <div className="text-[11px] text-stone-400">
                              SKU: {item.sku || "N/A"} • Variant: {item.variant || "Standard"}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-right font-medium text-stone-800">
                        {formatCurrency(item.price)}
                      </td>
                      <td className="px-4 py-3.5 text-center font-bold text-stone-900">
                        {item.quantity}
                      </td>
                      <td className="px-4 py-3.5 text-right font-bold text-stone-900">
                        {formatCurrency(item.price * item.quantity)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Price Calculations */}
            <div className="p-4 bg-stone-50/60 border-t border-stone-100">
              <div className="max-w-xs ml-auto space-y-1.5 text-xs">
                <div className="flex justify-between text-stone-600">
                  <span>Subtotal:</span>
                  <span className="font-medium text-stone-900">
                    {formatCurrency(order.pricing?.subtotal || Math.max(0, grandTotal - (order.pricing?.shipping || 0)))}
                  </span>
                </div>
                <div className="flex justify-between text-stone-600">
                  <span>Shipping ({order.pricing?.zone || (order.state === "Karnataka" ? "Zone 1 Local" : "Zone 2 Regional")}):</span>
                  <span className="font-medium text-emerald-800">
                    {order.pricing?.shipping === 0 || !order.pricing?.shipping ? "FREE" : formatCurrency(order.pricing?.shipping)}
                  </span>
                </div>
                {order.pricing?.discount > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Discount Coupon:</span>
                    <span className="font-medium">-{formatCurrency(order.pricing.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-stone-600">
                  <span>
                    {order.pricing?.taxLabel || (order.state === "Karnataka" ? "GST (CGST+SGST 12% Included):" : "GST (IGST 12% Included):")}
                  </span>
                  <span className="font-medium text-stone-900">
                    {formatCurrency(order.pricing?.tax || Math.round(grandTotal * 0.107))}
                  </span>
                </div>
                <div className="pt-2 border-t border-stone-200 flex justify-between text-sm font-bold text-stone-900">
                  <span>Grand Total:</span>
                  <span className="font-sans text-base text-[#173D2A]">
                    {formatCurrency(grandTotal)}
                  </span>
                </div>
              </div>
            </div>
          </AdminCard>

          {/* Internal Notes & Fulfillment Timeline */}
          <AdminCard title="Internal Admin Fulfillment Notes" subtitle="Collaborative staff notes and timeline">
            <div className="space-y-4">
              <form onSubmit={handleAddNote} className="flex gap-2">
                <input
                  type="text"
                  placeholder="Add private note (e.g. BlueDart pickup scheduled for 3 PM)..."
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-stone-300 bg-white"
                />
                <button
                  type="submit"
                  className="px-4 py-2 bg-[#173D2A] text-white rounded-xl text-xs font-semibold hover:bg-[#0B2416] transition-colors inline-flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Add Note</span>
                </button>
              </form>

              <div className="space-y-2.5 pt-2">
                {internalNotes.map((note) => (
                  <div
                    key={note.id}
                    className="p-3 rounded-xl border border-stone-200/80 bg-stone-50/50 text-xs"
                  >
                    <div className="flex justify-between items-center text-[10px] text-stone-400 mb-1">
                      <span className="font-semibold text-stone-700">{note.author}</span>
                      <span>{note.time}</span>
                    </div>
                    <p className="text-stone-700">{note.text}</p>
                  </div>
                ))}
              </div>
            </div>
          </AdminCard>
        </div>

        {/* Right Column: Customer & Shipping (1 Col) */}
        <div className="space-y-6">
          {/* Customer Details */}
          <AdminCard title="Customer Information" subtitle="Customer contact and account">
            <div className="space-y-3 text-xs">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-sm">
                  {customerName ? customerName.charAt(0) : "C"}
                </div>
                <div>
                  <div className="font-semibold text-stone-900 text-sm">
                    {customerName}
                  </div>
                  <div className="text-stone-500">{customerEmail}</div>
                </div>
              </div>

              <div className="pt-3 border-t border-stone-100 space-y-1.5">
                <div>
                  <span className="text-stone-500">Phone: </span>
                  <span className="font-medium text-stone-800">{customerPhone}</span>
                </div>
                <div>
                  <span className="text-stone-500">Customer Group: </span>
                  <span className="font-medium text-stone-800">Verified Buyer</span>
                </div>
              </div>
            </div>
          </AdminCard>

          {/* Payment & Settlement */}
          <AdminCard title="Payment & Financials" subtitle="Gateway details & transaction status">
            <div className="space-y-3 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-stone-500">Payment Method:</span>
                <span className="font-semibold text-stone-800">{order.paymentMethod || "Cash on Delivery"}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-stone-500">Payment Status:</span>
                <select
                  value={order.paymentStatus || "Pending"}
                  onChange={(e) => handlePaymentStatusChange(e.target.value)}
                  className={`px-2.5 py-1 text-xs font-semibold rounded-lg border cursor-pointer ${
                    order.paymentStatus === "Paid"
                      ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                      : order.paymentStatus === "Refunded"
                      ? "bg-purple-50 text-purple-800 border-purple-200"
                      : order.paymentStatus === "Failed"
                      ? "bg-rose-50 text-rose-800 border-rose-200"
                      : "bg-amber-50 text-amber-800 border-amber-200"
                  }`}
                >
                  <option value="Paid">Paid</option>
                  <option value="Pending">Pending</option>
                  <option value="Refunded">Refunded</option>
                  <option value="Failed">Failed</option>
                </select>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-stone-100">
                <span className="text-stone-500">Total Charged:</span>
                <span className="font-bold text-stone-900">{formatCurrency(grandTotal)}</span>
              </div>
            </div>
          </AdminCard>

          {/* Shipping Address */}
          <AdminCard title="Delivery Address" subtitle="Destination for shipment dispatch">
            <div className="flex items-start gap-2.5 text-xs text-stone-700 leading-relaxed">
              <MapPin className="w-4 h-4 text-emerald-800 flex-shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-stone-900">{customerName}</p>
                <p>{streetAddress}</p>
                <p>{city}, {state} - {pincode}</p>
                <p>India</p>
              </div>
            </div>
          </AdminCard>

          {/* Shiprocket Courier & Logistics Integration */}
          <AdminCard
            title="Shiprocket Logistics"
            subtitle="Real-time courier fulfillment & AWB tracking"
          >
            <div className="space-y-4 text-xs">
              {/* Status Header */}
              <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                <div className="flex items-center gap-1.5 font-semibold text-stone-700">
                  <Truck className="w-4 h-4 text-[#173D2A]" />
                  <span>Fulfillment Provider:</span>
                </div>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#173D2A]/10 text-[#173D2A] border border-[#173D2A]/20 flex items-center gap-1">
                  <Zap className="w-3 h-3" />
                  <span>Shiprocket (Auto / Dev)</span>
                </span>
              </div>

              {/* Courier Partner & AWB Inputs */}
              <form onSubmit={handleSaveTracking} className="space-y-3">
                <div>
                  <label className="block text-stone-500 font-medium mb-1">
                    Courier Partner
                  </label>
                  <input
                    type="text"
                    value={carrier}
                    onChange={(e) => setCarrier(e.target.value)}
                    placeholder="e.g. Bluedart Air / Delhivery Surface"
                    className="w-full px-3 py-1.5 rounded-lg border border-stone-300 bg-white text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-700"
                  />
                </div>

                <div>
                  <label className="block text-stone-500 font-medium mb-1">
                    Tracking Number (AWB)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={trackingNumber}
                      onChange={(e) => setTrackingNumber(e.target.value)}
                      placeholder="e.g. AWB94810294821"
                      className="flex-1 px-3 py-1.5 rounded-lg border border-stone-300 bg-white font-mono text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-emerald-700"
                    />
                    {trackingNumber && (
                      <button
                        type="button"
                        onClick={handleCopyAWB}
                        className="px-2.5 py-1.5 rounded-lg border border-stone-300 bg-stone-50 hover:bg-stone-100 text-stone-700 font-medium flex items-center gap-1"
                        title="Copy AWB to clipboard"
                      >
                        {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copied ? "Copied" : "Copy"}</span>
                      </button>
                    )}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isShippingLoading}
                  className="w-full py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 font-semibold rounded-lg text-xs transition-colors"
                >
                  Save Tracking Info
                </button>
              </form>

              {/* Action Buttons: Dispatch & Advance */}
              <div className="pt-2 border-t border-stone-100 space-y-2">
                <span className="block font-semibold text-stone-600 text-[11px] uppercase tracking-wider">
                  Shiprocket Courier Actions:
                </span>

                {/* Dispatch Button if not yet shipped */}
                {!trackingNumber || String(currentStatus).toLowerCase() === "confirmed" || String(currentStatus).toLowerCase() === "processing" ? (
                  <button
                    type="button"
                    onClick={handleDispatchShiprocket}
                    disabled={isShippingLoading}
                    className="w-full py-2 bg-[#173D2A] hover:bg-[#0B2416] text-white font-semibold rounded-xl flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                  >
                    <Truck className="w-4 h-4" />
                    <span>{trackingNumber ? "Re-dispatch with Shiprocket" : "Dispatch with Shiprocket (Generate AWB)"}</span>
                  </button>
                ) : null}

                {/* Simulation Stage Buttons */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => handleAdvanceCourier("out_for_delivery")}
                    disabled={isShippingLoading}
                    className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-200 font-semibold rounded-lg text-center transition-colors cursor-pointer"
                  >
                    🚚 Out for Delivery
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAdvanceCourier("delivered")}
                    disabled={isShippingLoading}
                    className="px-2.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-200 font-semibold rounded-lg text-center transition-colors cursor-pointer"
                  >
                    ✅ Mark Delivered
                  </button>
                </div>
              </div>

              {/* Links: Label & Tracking URL */}
              {(trackingNumber || order.trackingUrl) && (
                <div className="pt-2 border-t border-stone-100 flex flex-wrap items-center justify-between gap-2">
                  <a
                    href={order.trackingUrl || `https://shiprocket.co/tracking/${trackingNumber}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-semibold text-[#173D2A] hover:underline inline-flex items-center gap-1"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Public Courier Link</span>
                  </a>

                  {order.shippingLabelUrl && (
                    <a
                      href={order.shippingLabelUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-semibold text-stone-600 hover:text-stone-900 inline-flex items-center gap-1"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Shipping Label PDF</span>
                    </a>
                  )}
                </div>
              )}

              {/* Live Tracking Events if present */}
              {shipment && shipment.trackingEvents && shipment.trackingEvents.length > 0 && (
                <div className="pt-2 border-t border-stone-100">
                  <span className="block font-semibold text-stone-600 text-[11px] mb-2">
                    Recent Courier Scans:
                  </span>
                  <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                    {shipment.trackingEvents.slice(-4).reverse().map((ev, i) => (
                      <div key={i} className="p-2 rounded-lg bg-stone-50 border border-stone-200/60 text-[11px]">
                        <div className="font-semibold text-stone-900 flex justify-between">
                          <span>{ev.status}</span>
                          <span className="text-stone-400 font-normal">{formatDate(ev.time)}</span>
                        </div>
                        {ev.activity && <div className="text-stone-600 mt-0.5">{ev.activity}</div>}
                        {ev.location && <div className="text-stone-400 text-[10px]">{ev.location}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </AdminCard>
        </div>
      </div>
    </div>
  );
};

