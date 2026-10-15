import React, { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { Search, Truck, CheckCircle2, Package, MapPin, Calendar, ArrowRight } from "lucide-react";
import { Breadcrumbs } from "../components/common/Breadcrumbs";
import { useOrders } from "../context/OrderContext";
import { formatINR, formatDate } from "../utils/formatters";

export const TrackOrderPage = () => {
  const [searchParams] = useSearchParams();
  const initialOrderId = searchParams.get("orderId") || "";

  const [orderIdInput, setOrderIdInput] = useState(initialOrderId);
  const [trackedOrder, setTrackedOrder] = useState(null);
  const [searched, setSearched] = useState(false);
  const { getOrderById, orders } = useOrders();

  useEffect(() => {
    if (initialOrderId) {
      handleSearch(initialOrderId);
    }
  }, [initialOrderId]);

  const handleSearch = async (idToSearch) => {
    const query = idToSearch || orderIdInput;
    if (!query) return;

    setSearched(true);
    const found = await getOrderById(query.trim());
    setTrackedOrder(found || null);
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    handleSearch(orderIdInput);
  };

  return (
    <div className="bg-[#FBFAF6] min-h-screen py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <Breadcrumbs items={[{ label: "Track Your Order" }]} />

        {/* Heading */}
        <div className="text-center max-w-xl mx-auto py-6">
          <div className="w-12 h-12 rounded-full bg-[#173D2A]/10 text-[#173D2A] flex items-center justify-center mx-auto mb-3">
            <Truck size={24} />
          </div>
          <h1 className="font-serif text-3xl font-bold text-[#171A17]">
            Track Your Order
          </h1>
          <p className="text-xs sm:text-sm text-[#666B64] mt-1.5 leading-relaxed">
            Enter your Divyam Ayurveda Order ID (e.g. DA-XXXXXX) to view current fulfillment status and delivery timeline.
          </p>
        </div>

        {/* Search Input Box */}
        <div className="bg-white rounded-3xl border border-[#E5E7DF] p-6 shadow-xs mb-8 max-w-xl mx-auto">
          <form onSubmit={handleFormSubmit} className="flex gap-2">
            <input
              type="text"
              value={orderIdInput}
              onChange={(e) => setOrderIdInput(e.target.value)}
              placeholder="Enter Order ID (e.g. DA-123456-789)"
              className="flex-1 px-4 py-2.5 text-xs sm:text-sm bg-stone-50 border border-[#E5E7DF] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#386B40]"
            />
            <button
              type="submit"
              className="px-6 py-2.5 bg-[#173D2A] hover:bg-[#0B2416] text-white text-xs sm:text-sm font-semibold rounded-xl flex items-center gap-1.5 transition-colors shadow-xs"
            >
              <Search size={15} />
              <span>Track</span>
            </button>
          </form>

          {/* Quick links to recent orders in demo if any */}
          {orders.length > 0 && (
            <div className="mt-4 pt-4 border-t border-[#E5E7DF] text-xs">
              <span className="text-stone-400 block mb-1">Recent demo orders:</span>
              <div className="flex flex-wrap gap-2">
                {orders.slice(0, 3).map((o) => (
                  <button
                    key={o.id}
                    onClick={() => {
                      setOrderIdInput(o.id);
                      handleSearch(o.id);
                    }}
                    className="px-2.5 py-1 rounded-lg bg-stone-100 hover:bg-[#A9D18E]/30 text-[#173D2A] font-mono text-xs font-semibold"
                  >
                    {o.id}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Results Box */}
        {searched && (
          <div>
            {trackedOrder ? (
              <div className="bg-white rounded-3xl border border-[#E5E7DF] p-6 sm:p-10 shadow-xs space-y-8">
                {/* Status Header */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-6 border-b border-[#E5E7DF] gap-4">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-wider text-[#386B40]">
                      Dispensary Order
                    </span>
                    <h2 className="font-serif text-2xl font-bold text-[#171A17] font-mono">
                      {trackedOrder.id}
                    </h2>
                    <p className="text-xs text-[#666B64] mt-0.5">
                      Placed on {formatDate(trackedOrder.createdAt)}
                    </p>
                  </div>
                  <div className="sm:text-right">
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                      {trackedOrder.status}
                    </span>
                    <p className="text-xs text-stone-500 mt-1">
                      Est. Arrival: <strong>{formatDate(trackedOrder.estimatedDelivery)}</strong>
                    </p>
                  </div>
                </div>

                {/* Stepper Timeline */}
                <div className="space-y-6">
                  <h3 className="font-serif text-lg font-bold text-[#171A17]">
                    Shipment Progress
                  </h3>

                  <div className="relative pl-6 space-y-8 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#E5E7DF]">
                    {trackedOrder.timeline?.map((step, idx) => (
                      <div key={idx} className="relative flex items-start gap-4">
                        <div
                          className={`absolute -left-6 w-5 h-5 rounded-full flex items-center justify-center text-white ring-4 ring-white ${
                            step.completed ? "bg-[#173D2A]" : "bg-stone-300"
                          }`}
                        >
                          {step.completed ? (
                            <CheckCircle2 size={13} />
                          ) : (
                            <div className="w-1.5 h-1.5 rounded-full bg-white" />
                          )}
                        </div>
                        <div className="flex-1">
                          <h4
                            className={`text-sm ${
                              step.completed
                                ? "font-bold text-[#171A17]"
                                : "font-medium text-stone-400"
                            }`}
                          >
                            {step.status}
                          </h4>
                          {step.time && (
                            <p className="text-xs text-stone-400 mt-0.5">
                              {formatDate(step.time)}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Shipping Destination */}
                <div className="p-4 bg-[#FBFAF6] rounded-2xl border border-[#E5E7DF] flex items-start gap-3 text-xs sm:text-sm">
                  <MapPin size={20} className="text-[#386B40] shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-bold text-[#171A17]">Shipping To</h4>
                    <p className="text-stone-600 mt-0.5">
                      {trackedOrder.customer?.name} &bull; {trackedOrder.shippingAddress?.street},{" "}
                      {trackedOrder.shippingAddress?.city}, {trackedOrder.shippingAddress?.state} -{" "}
                      {trackedOrder.shippingAddress?.pincode}
                    </p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-3xl border border-[#E5E7DF] p-8 text-center max-w-md mx-auto">
                <p className="text-sm font-semibold text-[#171A17] mb-1">
                  No order found with ID &ldquo;{orderIdInput}&rdquo;
                </p>
                <p className="text-xs text-[#666B64] mb-4">
                  Please verify your order number. In this demo environment, orders are tracked within the active browser session.
                </p>
                <Link
                  to="/products"
                  className="inline-block px-5 py-2 bg-[#173D2A] text-white text-xs font-semibold rounded-xl"
                >
                  Explore Products
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
