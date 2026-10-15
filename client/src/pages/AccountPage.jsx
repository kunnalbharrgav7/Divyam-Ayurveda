import React, { useState, useEffect } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import {
  User,
  Package,
  MapPin,
  Settings,
  LogOut,
  Plus,
  Trash2,
  CheckCircle2,
  Clock,
  ArrowRight,
  ShieldCheck,
  Eye,
  X,
  Star,
} from "lucide-react";
import { Breadcrumbs } from "../components/common/Breadcrumbs";
import { useAuth } from "../context/AuthContext";
import { useOrders } from "../context/OrderContext";
import { formatINR, formatDate } from "../utils/formatters";

export const AccountPage = () => {
  const { user, isAuthenticated, logout, updateProfile, addresses, addAddress, deleteAddress, setDefaultAddress } = useAuth();
  const { orders } = useOrders();
  const navigate = useNavigate();
  const location = useLocation();

  // Tab management: "overview" | "orders" | "addresses" | "profile"
  const getInitialTab = () => {
    if (location.pathname.includes("/orders")) return "orders";
    if (location.pathname.includes("/addresses")) return "addresses";
    if (location.pathname.includes("/profile")) return "profile";
    return "overview";
  };

  const [activeTab, setActiveTab] = useState(getInitialTab);

  // Address Modal State
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [newAddr, setNewAddr] = useState({
    fullName: user?.name || "",
    phone: user?.phone || "",
    street: "",
    city: "",
    state: "Karnataka",
    pincode: "",
    type: "Home",
  });

  // Profile Form State
  const [profileForm, setProfileForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
  });
  const [profileSuccess, setProfileSuccess] = useState(false);

  // Selected Order for detail modal
  const [selectedOrder, setSelectedOrder] = useState(null);

  // Redirect if not authenticated
  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
    }
  }, [isAuthenticated, navigate]);

  if (!user) return null;

  const handleLogout = () => {
    logout();
    navigate("/");
  };

  const handleProfileSubmit = (e) => {
    e.preventDefault();
    updateProfile(profileForm);
    setProfileSuccess(true);
    setTimeout(() => setProfileSuccess(false), 2500);
  };

  const handleCreateAddress = (e) => {
    e.preventDefault();
    if (!newAddr.street || !newAddr.city || !newAddr.pincode) return;
    addAddress(newAddr);
    setShowAddressModal(false);
    setNewAddr({
      fullName: user?.name || "",
      phone: user?.phone || "",
      street: "",
      city: "",
      state: "Karnataka",
      pincode: "",
      type: "Home",
    });
  };

  return (
    <div className="bg-[#FBFAF6] min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Breadcrumbs items={[{ label: "My Account" }]} />

        {/* User Welcome Banner */}
        <div className="bg-[#173D2A] text-white rounded-3xl p-6 sm:p-8 mb-8 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xs">
          <div className="flex items-center gap-4 text-center sm:text-left">
            <div className="w-16 h-16 rounded-full bg-white/10 border-2 border-[#A9D18E] flex items-center justify-center overflow-hidden shrink-0">
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
              ) : (
                <User size={30} className="text-[#A9D18E]" />
              )}
            </div>
            <div>
              <span className="text-xs font-semibold uppercase tracking-wider text-[#A9D18E]">
                Ayurveda Wellness Member
              </span>
              <h1 className="font-serif text-2xl sm:text-3xl font-bold">{user.name}</h1>
              <p className="text-xs text-stone-200 mt-0.5">
                {user.email} &bull; Member since {user.memberSince || "2025"}
              </p>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors shrink-0"
          >
            <LogOut size={14} />
            <span>Sign Out</span>
          </button>
        </div>

        {/* Dashboard Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Navigation Sidebar (3 cols) */}
          <aside className="lg:col-span-3 bg-white rounded-3xl border border-[#E5E7DF] p-3 shadow-xs space-y-1">
            {[
              { id: "overview", label: "Dashboard Overview", icon: ShieldCheck },
              { id: "orders", label: `My Orders (${orders.length})`, icon: Package },
              { id: "addresses", label: `Saved Addresses (${addresses.length})`, icon: MapPin },
              { id: "profile", label: "Profile Settings", icon: Settings },
            ].map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-xs font-semibold transition-all ${
                    activeTab === tab.id
                      ? "bg-[#173D2A] text-white shadow-xs"
                      : "text-stone-700 hover:bg-stone-50"
                  }`}
                >
                  <Icon size={16} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </aside>

          {/* Content Pane (9 cols) */}
          <main className="lg:col-span-9 bg-white rounded-3xl border border-[#E5E7DF] p-6 sm:p-8 shadow-xs min-h-[400px]">
            {/* 1. OVERVIEW TAB */}
            {activeTab === "overview" && (
              <div className="space-y-8">
                <div>
                  <h2 className="font-serif text-2xl font-bold text-[#171A17]">
                    Account Overview
                  </h2>
                  <p className="text-xs sm:text-sm text-[#666B64] mt-1">
                    Manage your active dispensary orders, delivery addresses, and personal details.
                  </p>
                </div>

                {/* Stat Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="p-4 rounded-2xl bg-[#FBFAF6] border border-[#E5E7DF]">
                    <span className="text-xs text-stone-500 block">Total Orders</span>
                    <span className="text-2xl font-bold text-[#173D2A]">{orders.length}</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-[#FBFAF6] border border-[#E5E7DF]">
                    <span className="text-xs text-stone-500 block">Saved Addresses</span>
                    <span className="text-2xl font-bold text-[#173D2A]">{addresses.length}</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-[#FBFAF6] border border-[#E5E7DF]">
                    <span className="text-xs text-stone-500 block">Wellness Tier</span>
                    <span className="text-2xl font-bold text-[#386B40]">Prana Silver</span>
                  </div>
                </div>

                {/* Recent Orders Preview */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="font-serif text-lg font-bold text-[#171A17]">
                      Recent Orders
                    </h3>
                    <button
                      onClick={() => setActiveTab("orders")}
                      className="text-xs font-semibold text-[#173D2A] hover:underline"
                    >
                      View All &rarr;
                    </button>
                  </div>

                  {orders.length === 0 ? (
                    <div className="p-6 text-center bg-stone-50 rounded-2xl text-xs text-stone-500">
                      No orders placed yet. Explore our authentic Ayurvedic catalog!
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {orders.slice(0, 2).map((ord) => (
                        <div
                          key={ord.id}
                          className="p-4 rounded-2xl border border-[#E5E7DF] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-xs"
                        >
                          <div>
                            <span className="font-mono font-bold text-[#171A17] block">
                              {ord.id}
                            </span>
                            <span className="text-stone-500">
                              Placed on {formatDate(ord.createdAt)} &bull; {ord.items?.length} items
                            </span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="px-2.5 py-0.5 rounded-full font-bold bg-emerald-100 text-emerald-800">
                              {ord.status}
                            </span>
                            <span className="font-bold text-[#171A17]">
                              {formatINR(ord.pricing?.total)}
                            </span>
                            <button
                              onClick={() => setSelectedOrder(ord)}
                              className="p-1.5 rounded-lg bg-stone-100 text-stone-700 hover:bg-stone-200"
                              title="View Details"
                            >
                              <Eye size={15} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 2. ORDERS TAB */}
            {activeTab === "orders" && (
              <div className="space-y-6">
                <div>
                  <h2 className="font-serif text-2xl font-bold text-[#171A17]">
                    Order History
                  </h2>
                  <p className="text-xs sm:text-sm text-[#666B64] mt-1">
                    Complete record of all orders placed through Divyam Ayurveda.
                  </p>
                </div>

                {orders.length === 0 ? (
                  <div className="p-10 text-center bg-stone-50 rounded-2xl">
                    <p className="text-sm font-semibold text-[#171A17] mb-2">
                      No order history found
                    </p>
                    <p className="text-xs text-stone-500 mb-4">
                      When you place an order in this demo store, it will appear here immediately.
                    </p>
                    <Link
                      to="/products"
                      className="px-5 py-2 bg-[#173D2A] text-white text-xs font-semibold rounded-xl"
                    >
                      Browse Catalog
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {orders.map((ord) => (
                      <div
                        key={ord.id}
                        className="p-5 rounded-2xl border border-[#E5E7DF] space-y-4 hover:border-[#386B40]/60 transition-colors"
                      >
                        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-3 border-b border-[#E5E7DF] gap-2 text-xs">
                          <div>
                            <span className="text-stone-400 block">Order ID</span>
                            <span className="font-mono font-bold text-sm text-[#171A17]">
                              {ord.id}
                            </span>
                          </div>
                          <div>
                            <span className="text-stone-400 block">Date</span>
                            <span className="font-semibold text-stone-700">
                              {formatDate(ord.createdAt)}
                            </span>
                          </div>
                          <div>
                            <span className="text-stone-400 block">Total</span>
                            <span className="font-bold text-[#173D2A] text-sm">
                              {formatINR(ord.pricing?.total)}
                            </span>
                          </div>
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800">
                            {ord.status}
                          </span>
                        </div>

                        {/* Items in order */}
                        <div className="space-y-2">
                          {ord.items?.map((it, idx) => (
                            <div key={idx} className="flex items-center gap-3 text-xs">
                              <img
                                src={it.image}
                                alt={it.name}
                                className="w-10 h-10 rounded-lg object-contain bg-[#FBFAF6] border p-1"
                              />
                              <div className="flex-1">
                                <span className="font-semibold text-[#171A17]">{it.name}</span>
                                <span className="text-stone-500 block">
                                  {it.size} &bull; Qty: {it.quantity}
                                </span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="font-semibold">{formatINR(it.total)}</span>
                                {(ord.status === "Delivered" || ord.orderStatus === "Delivered") && (
                                  <Link
                                    to={`/products/${it.slug || it.productId}?tab=reviews&writeReview=true`}
                                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200 transition-colors"
                                    title="Write verified review for this remedy"
                                  >
                                    <Star size={11} className="fill-emerald-700 text-emerald-700" />
                                    <span>Rate &amp; Review</span>
                                  </Link>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>

                        <div className="pt-2 flex items-center justify-between">
                          <Link
                            to={`/track-order?orderId=${ord.id}`}
                            className="text-xs font-semibold text-[#386B40] hover:underline"
                          >
                            Track Shipment &rarr;
                          </Link>
                          <button
                            onClick={() => setSelectedOrder(ord)}
                            className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-lg text-xs font-semibold"
                          >
                            View Order Details
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 3. ADDRESSES TAB */}
            {activeTab === "addresses" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="font-serif text-2xl font-bold text-[#171A17]">
                      Saved Addresses
                    </h2>
                    <p className="text-xs sm:text-sm text-[#666B64] mt-1">
                      Manage your delivery locations for faster checkout.
                    </p>
                  </div>
                  <button
                    onClick={() => setShowAddressModal(true)}
                    className="px-4 py-2 bg-[#173D2A] hover:bg-[#0B2416] text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors shadow-xs"
                  >
                    <Plus size={14} />
                    <span>Add Address</span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {addresses.map((addr) => (
                    <div
                      key={addr.id}
                      className={`p-5 rounded-2xl border relative flex flex-col justify-between ${
                        addr.isDefault
                          ? "border-[#173D2A] bg-[#FBFAF6] ring-1 ring-[#173D2A]"
                          : "border-[#E5E7DF] bg-white"
                      }`}
                    >
                      <div className="space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm text-[#171A17]">
                            {addr.fullName}
                          </span>
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-stone-100 text-stone-600">
                            {addr.type}
                          </span>
                        </div>
                        <p className="text-stone-600 leading-relaxed">{addr.street}</p>
                        <p className="text-stone-600">
                          {addr.city}, {addr.state} - {addr.pincode}
                        </p>
                        <p className="text-stone-500 pt-1">Phone: {addr.phone}</p>
                      </div>

                      <div className="pt-4 mt-4 border-t border-[#E5E7DF] flex items-center justify-between text-xs">
                        {addr.isDefault ? (
                          <span className="text-emerald-700 font-bold flex items-center gap-1 text-[11px]">
                            <CheckCircle2 size={13} /> Default Address
                          </span>
                        ) : (
                          <button
                            onClick={() => setDefaultAddress(addr.id)}
                            className="text-[#386B40] font-semibold hover:underline"
                          >
                            Set as Default
                          </button>
                        )}
                        <button
                          onClick={() => deleteAddress(addr.id)}
                          className="text-stone-400 hover:text-rose-600 transition-colors p-1"
                          title="Delete Address"
                        >
                          <Trash2 size={15} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 4. PROFILE TAB */}
            {activeTab === "profile" && (
              <div className="space-y-6 max-w-xl">
                <div>
                  <h2 className="font-serif text-2xl font-bold text-[#171A17]">
                    Personal Information
                  </h2>
                  <p className="text-xs sm:text-sm text-[#666B64] mt-1">
                    Update your account contact details.
                  </p>
                </div>

                {profileSuccess && (
                  <div className="p-3 rounded-xl bg-emerald-50 text-emerald-800 text-xs border border-emerald-200">
                    Profile successfully updated!
                  </div>
                )}

                <form onSubmit={handleProfileSubmit} className="space-y-4 text-xs">
                  <div>
                    <label className="block font-semibold text-[#171A17] mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={profileForm.name}
                      onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                      className="w-full p-2.5 bg-stone-50 border border-[#E5E7DF] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#386B40]"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-[#171A17] mb-1">
                      Email Address
                    </label>
                    <input
                      type="email"
                      value={profileForm.email}
                      onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                      className="w-full p-2.5 bg-stone-50 border border-[#E5E7DF] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#386B40]"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-[#171A17] mb-1">
                      Contact Phone
                    </label>
                    <input
                      type="tel"
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                      className="w-full p-2.5 bg-stone-50 border border-[#E5E7DF] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#386B40]"
                    />
                  </div>

                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-[#173D2A] hover:bg-[#0B2416] text-white font-semibold rounded-xl text-xs shadow-xs transition-colors"
                  >
                    Save Changes
                  </button>
                </form>
              </div>
            )}
          </main>
        </div>
      </div>

      {/* Add Address Modal */}
      {showAddressModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E7DF]">
              <h3 className="font-serif text-lg font-bold text-[#171A17]">Add New Address</h3>
              <button
                onClick={() => setShowAddressModal(false)}
                className="p-1 rounded-lg hover:bg-stone-100 text-stone-500"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateAddress} className="space-y-3 text-xs">
              <div>
                <label className="block font-semibold text-[#171A17] mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  value={newAddr.fullName}
                  onChange={(e) => setNewAddr({ ...newAddr, fullName: e.target.value })}
                  className="w-full p-2 bg-stone-50 border rounded-xl"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#171A17] mb-1">Phone</label>
                <input
                  type="tel"
                  required
                  value={newAddr.phone}
                  onChange={(e) => setNewAddr({ ...newAddr, phone: e.target.value })}
                  className="w-full p-2 bg-stone-50 border rounded-xl"
                />
              </div>
              <div>
                <label className="block font-semibold text-[#171A17] mb-1">Street Address</label>
                <input
                  type="text"
                  required
                  value={newAddr.street}
                  onChange={(e) => setNewAddr({ ...newAddr, street: e.target.value })}
                  placeholder="Flat, building, street"
                  className="w-full p-2 bg-stone-50 border rounded-xl"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-[#171A17] mb-1">City</label>
                  <input
                    type="text"
                    required
                    value={newAddr.city}
                    onChange={(e) => setNewAddr({ ...newAddr, city: e.target.value })}
                    className="w-full p-2 bg-stone-50 border rounded-xl"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-[#171A17] mb-1">PIN Code</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    value={newAddr.pincode}
                    onChange={(e) =>
                      setNewAddr({ ...newAddr, pincode: e.target.value.replace(/\D/g, "") })
                    }
                    className="w-full p-2 bg-stone-50 border rounded-xl"
                  />
                </div>
              </div>

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddressModal(false)}
                  className="flex-1 py-2 rounded-xl bg-stone-100 text-stone-600 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2 rounded-xl bg-[#173D2A] text-white font-semibold"
                >
                  Save Address
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-lg w-full shadow-xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-[#E5E7DF]">
              <div>
                <span className="text-[11px] font-bold text-[#386B40] uppercase">Order Details</span>
                <h3 className="font-serif text-lg font-bold font-mono text-[#171A17]">
                  {selectedOrder.id}
                </h3>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                className="p-1 rounded-lg hover:bg-stone-100 text-stone-500"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-3 bg-stone-50 rounded-xl space-y-1">
                <p><strong>Customer:</strong> {selectedOrder.customer?.name}</p>
                <p><strong>Shipping To:</strong> {selectedOrder.shippingAddress?.street}, {selectedOrder.shippingAddress?.city} - {selectedOrder.shippingAddress?.pincode}</p>
                <p><strong>Payment:</strong> {selectedOrder.paymentMethod}</p>
              </div>

              <div className="space-y-2">
                <span className="font-bold block text-stone-700">Formulations:</span>
                {selectedOrder.items?.map((it, i) => (
                  <div key={i} className="flex justify-between items-center py-1.5 border-b border-stone-100">
                    <div>
                      <span className="font-medium text-stone-900 block">{it.name}</span>
                      <span className="text-[10px] text-stone-400">({it.size}) × {it.quantity}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold">{formatINR(it.total)}</span>
                      {(selectedOrder.status === "Delivered" || selectedOrder.orderStatus === "Delivered") && (
                        <Link
                          to={`/products/${it.slug || it.productId}?tab=reviews&writeReview=true`}
                          onClick={() => setSelectedOrder(null)}
                          className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded border border-emerald-200"
                        >
                          ★ Review
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className="pt-2 flex justify-between font-bold text-sm">
                <span>Total Amount:</span>
                <span className="text-[#173D2A]">{formatINR(selectedOrder.pricing?.total)}</span>
              </div>
            </div>

            <div className="pt-3">
              <button
                onClick={() => setSelectedOrder(null)}
                className="w-full py-2.5 rounded-xl bg-[#173D2A] text-white text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
