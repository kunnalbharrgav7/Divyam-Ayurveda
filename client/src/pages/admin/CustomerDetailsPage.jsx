import React, { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import {
  ArrowLeft,
  Mail,
  Phone,
  MapPin,
  ShoppingBag,
  DollarSign,
  UserCheck,
  UserX,
  Clock,
  Send,
} from "lucide-react";
import { useAdmin } from "../../context/AdminContext";
import { AdminCard, StatCard } from "../../components/admin/common/AdminCard";
import { formatCurrency, formatDate } from "../../utils/formatters";

export const CustomerDetailsPage = () => {
  const { customerId } = useParams();
  const { customers, orders, saveCustomer, fetchAdminCustomer, addCustomerNote } = useAdmin();

  const customer = customers.find((c) => c.id === customerId);

  // Orders placed by this customer (matched by account email, never by display name)
  const customerOrders = orders.filter(
    (o) =>
      o.userId === customerId ||
      o.customerId === customerId ||
      (customer?.email && o.email?.toLowerCase() === customer.email.toLowerCase())
  );

  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState("");
  const [actionError, setActionError] = useState("");

  // Load the latest profile and the staff notes stored in the database
  useEffect(() => {
    let isMounted = true;
    fetchAdminCustomer(customerId)
      .then((fresh) => {
        if (isMounted) setNotes(fresh.notes || []);
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, [customerId]);

  if (!customer) {
    return (
      <div className="py-12 text-center">
        <h2 className="text-xl font-bold text-stone-900">Customer Not Found</h2>
        <p className="text-xs text-stone-500 mt-1">
          The requested customer profile does not exist.
        </p>
        <Link
          to="/admin/customers"
          className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-[#173D2A] text-white rounded-xl text-xs font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Customers</span>
        </Link>
      </div>
    );
  }

  const handleToggleBlock = async () => {
    setActionError("");
    try {
      await saveCustomer({ id: customer.id, status: customer.status === "Blocked" ? "Active" : "Blocked" });
    } catch (err) {
      setActionError(err.message || "Could not update this customer.");
    }
  };

  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    setActionError("");
    try {
      setNotes(await addCustomerNote(customer.id, newNote.trim()));
      setNewNote("");
    } catch (err) {
      setActionError(err.message || "Could not save the note.");
    }
  };

  // Totals come from the customer's real (non-cancelled) orders in the database
  const orderCount = customer.totalOrders ?? customerOrders.length;
  const avgOrderValue = orderCount > 0 ? (customer.totalSpent || 0) / orderCount : 0;
  const location = [customer.city, customer.state].filter(Boolean).join(", ");

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/admin/customers"
            className="p-2 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-lg">
              {(customer.name || "C").charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-stone-900 font-sans tracking-tight">
                  {customer.name || "Valued Customer"}
                </h1>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    customer.status === "Blocked"
                      ? "bg-rose-100 text-rose-800"
                      : "bg-emerald-100 text-emerald-800"
                  }`}
                >
                  {customer.status || "Active"}
                </span>
              </div>
              <p className="text-xs text-stone-500 mt-0.5">
                {customer.joinedAt ? `Member since ${formatDate(customer.joinedAt)}` : "Registered customer"}
              </p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleToggleBlock}
          className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold transition-colors self-start sm:self-auto ${
            customer.status === "Blocked"
              ? "bg-emerald-600 hover:bg-emerald-700 text-white"
              : "bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200"
          }`}
        >
          {customer.status === "Blocked" ? (
            <>
              <UserCheck className="w-4 h-4" />
              <span>Unblock Account</span>
            </>
          ) : (
            <>
              <UserX className="w-4 h-4" />
              <span>Block Account</span>
            </>
          )}
        </button>
      </div>

      {actionError && (
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">{actionError}</div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <StatCard
          title="Lifetime Revenue (LTV)"
          value={formatCurrency(customer.totalSpent || 0)}
          subtitle="across all completed orders"
          icon={DollarSign}
          color="emerald"
        />

        <StatCard
          title="Total Orders Placed"
          value={orderCount}
          subtitle="lifetime remedies orders"
          icon={ShoppingBag}
          color="blue"
        />

        <StatCard
          title="Average Order Value"
          value={formatCurrency(avgOrderValue)}
          subtitle="per transaction spend"
          icon={DollarSign}
          color="stone"
        />
      </div>

      {/* Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Orders history (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          <AdminCard
            title="Customer Order History"
            subtitle="All remedies orders placed by this customer"
            noPadding={true}
          >
            {customerOrders.length === 0 ? (
              <div className="py-8 text-center text-xs text-stone-400">
                No orders recorded for this customer yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-stone-700">
                  <thead className="bg-stone-50/80 text-[11px] font-semibold uppercase tracking-wider text-stone-500 border-b border-stone-200">
                    <tr>
                      <th className="px-4 py-3">Order ID</th>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Items</th>
                      <th className="px-4 py-3">Total Amount</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-stone-100">
                    {customerOrders.map((ord) => (
                      <tr key={ord.id} className="hover:bg-stone-50/50">
                        <td className="px-4 py-3 font-semibold text-stone-900 font-mono">
                          {ord.id}
                        </td>
                        <td className="px-4 py-3 text-stone-500">
                          {formatDate(ord.date || ord.orderDate)}
                        </td>
                        <td className="px-4 py-3">
                          {ord.items?.length || 1} items
                        </td>
                        <td className="px-4 py-3 font-bold text-stone-900">
                          {formatCurrency(ord.totalAmount || ord.total)}
                        </td>
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                            {ord.orderStatus || ord.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right">
                          <Link
                            to={`/admin/orders/${ord.id}`}
                            className="text-xs font-semibold text-emerald-800 hover:underline"
                          >
                            View Order →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </AdminCard>

          {/* CRM Internal Notes */}
          <AdminCard title="Customer CRM Notes" subtitle="Internal customer relationship records">
            <form onSubmit={handleAddNote} className="flex gap-2 mb-4">
              <input
                type="text"
                placeholder="Add note (e.g. Inquired about customized Vata dosha diet)..."
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

            <div className="space-y-2.5">
              {notes.length === 0 && (
                <p className="text-xs text-stone-400 text-center py-3">No notes yet for this customer.</p>
              )}
              {notes.map((n) => (
                <div
                  key={n.id}
                  className="p-3 rounded-xl border border-stone-200/80 bg-stone-50/50 text-xs"
                >
                  <div className="flex justify-between items-center text-[10px] text-stone-400 mb-1">
                    <span className="font-semibold text-stone-700">{n.authorName || "Staff"}</span>
                    <span>{n.createdAt ? formatDate(n.createdAt) : ""}</span>
                  </div>
                  <p className="text-stone-700">{n.text}</p>
                </div>
              ))}
            </div>
          </AdminCard>
        </div>

        {/* Right: Contact & Delivery Addresses (1 Col) */}
        <div className="space-y-6">
          <AdminCard title="Contact Coordinates" subtitle="Email and communication phone">
            <div className="space-y-3 text-xs">
              <div className="flex items-center gap-2.5 text-stone-700">
                <Mail className="w-4 h-4 text-emerald-800 flex-shrink-0" />
                <span>{customer.email}</span>
              </div>
              <div className="flex items-center gap-2.5 text-stone-700">
                <Phone className="w-4 h-4 text-emerald-800 flex-shrink-0" />
                <span>{customer.phone || "No phone number provided"}</span>
              </div>
              <div className="flex items-center gap-2.5 text-stone-700">
                <MapPin className="w-4 h-4 text-emerald-800 flex-shrink-0" />
                <span>{location || "No address saved yet"}</span>
              </div>
            </div>
          </AdminCard>

          <AdminCard title="Default Delivery Address" subtitle="Registered shipping destination">
            {customer.address ? (
              <div className="text-xs text-stone-700 leading-relaxed">
                <p className="font-semibold text-stone-900">{customer.addressName || customer.name}</p>
                <p>{customer.address}</p>
                {customer.addressLine2 && <p>{customer.addressLine2}</p>}
                <p>
                  {[customer.city, customer.state].filter(Boolean).join(", ")}
                  {customer.pincode ? ` - ${customer.pincode}` : ""}
                </p>
                {customer.addressPhone && <p className="text-stone-500">Phone: {customer.addressPhone}</p>}
                <p>India</p>
              </div>
            ) : (
              <p className="text-xs text-stone-400">This customer hasn't saved a delivery address yet.</p>
            )}
          </AdminCard>
        </div>
      </div>
    </div>
  );
};

