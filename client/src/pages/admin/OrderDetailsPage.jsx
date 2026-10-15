import React, { useState } from "react";
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
} from "lucide-react";
import { useAdmin } from "../../context/AdminContext";
import { AdminCard } from "../../components/admin/common/AdminCard";
import { formatCurrency, formatDate } from "../../utils/formatters";

export const OrderDetailsPage = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const { orders, updateOrderStatus } = useAdmin();

  const order = orders.find((o) => o.id === orderId);

  const [trackingNumber, setTrackingNumber] = useState(order?.trackingNumber || "BLUEDART-88210948");
  const [carrier, setCarrier] = useState(order?.carrier || "BlueDart Express");
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

  const handleStatusChange = (newStatus) => {
    updateOrderStatus(order.id, newStatus);
    const addedNote = {
      id: Date.now(),
      text: `Order status updated to "${newStatus}".`,
      author: "Admin Staff",
      time: new Date().toLocaleString(),
    };
    setInternalNotes((prev) => [addedNote, ...prev]);
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

  // Stepper helper
  const steps = ["Pending", "Processing", "Dispatched", "Delivered"];
  const currentStepIndex = steps.indexOf(currentStatus);

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
                  currentStatus === "Delivered"
                    ? "bg-emerald-100 text-emerald-800"
                    : currentStatus === "Dispatched"
                    ? "bg-blue-100 text-blue-800"
                    : currentStatus === "Processing"
                    ? "bg-amber-100 text-amber-800"
                    : currentStatus === "Cancelled"
                    ? "bg-rose-100 text-rose-800"
                    : "bg-stone-100 text-stone-800"
                }`}
              >
                {currentStatus}
              </span>
            </div>
            <p className="text-xs text-stone-500 mt-0.5">
              Placed on {formatDate(order.date || order.orderDate)} • Payment:{" "}
              <span className="font-semibold text-stone-700">
                {order.paymentStatus || "Paid"}
              </span>
            </p>
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

      {/* Fulfillment Stepper */}
      <AdminCard title="Fulfillment Progression" subtitle="Track and advance warehouse delivery stages">
        <div className="py-2">
          <div className="grid grid-cols-4 gap-2 relative">
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
                        ? "text-[#173D2A]"
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
            <span className="text-xs text-stone-500">
              Update order fulfillment stage:
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {currentStatus !== "Processing" && currentStatus !== "Delivered" && (
                <button
                  type="button"
                  onClick={() => handleStatusChange("Processing")}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200 transition-colors"
                >
                  Mark Processing
                </button>
              )}

              {currentStatus !== "Dispatched" && currentStatus !== "Delivered" && (
                <button
                  type="button"
                  onClick={() => handleStatusChange("Dispatched")}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200 transition-colors"
                >
                  Mark Dispatched
                </button>
              )}

              {currentStatus !== "Delivered" && (
                <button
                  type="button"
                  onClick={() => handleStatusChange("Delivered")}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 transition-colors"
                >
                  Mark Delivered
                </button>
              )}

              {currentStatus !== "Cancelled" && (
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

          {/* Shipping Carrier Info */}
          <AdminCard title="Logistics & Tracking" subtitle="Airway bill & courier partner">
            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-stone-500 mb-1">Courier Partner</label>
                <input
                  type="text"
                  value={carrier}
                  onChange={(e) => setCarrier(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-stone-300 bg-white"
                />
              </div>

              <div>
                <label className="block text-stone-500 mb-1">Tracking Number (AWB)</label>
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-stone-300 bg-white font-mono text-xs"
                />
              </div>

              <div className="pt-2">
                <a
                  href={`https://www.bluedart.com/tracking?awb=${trackingNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-semibold text-emerald-800 hover:underline inline-flex items-center gap-1"
                >
                  <Truck className="w-3.5 h-3.5" />
                  <span>Track with Courier Partner →</span>
                </a>
              </div>
            </div>
          </AdminCard>
        </div>
      </div>
    </div>
  );
};

