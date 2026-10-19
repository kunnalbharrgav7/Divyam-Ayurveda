import { toStatusKey, getStatusLabel } from "../../utils/orderStatus";
import React, { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  ShoppingBag,
  Search,
  Filter,
  Download,
  Eye,
  Clock,
  CheckCircle2,
  Truck,
  RotateCcw,
  XCircle,
} from "lucide-react";
import { useAdmin } from "../../context/AdminContext";
import { AdminCard } from "../../components/admin/common/AdminCard";
import { AdminTable } from "../../components/admin/common/AdminTable";
import { formatCurrency, formatDate } from "../../utils/formatters";

export const OrdersPage = () => {
  const { orders, updateOrderStatus, updatePaymentStatus, refreshOrders } = useAdmin();

  useEffect(() => {
    if (refreshOrders) {
      refreshOrders();
    }
  }, []);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Filter orders
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const idStr = String(o.id || o.orderNumber || "").toLowerCase();
      const matchSearch =
        idStr.includes(searchTerm.toLowerCase()) ||
        o.customerName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.phone?.includes(searchTerm);

      const currentStatus = o.orderStatus || o.status;
      const matchStatus =
        statusFilter === "all" || currentStatus === statusFilter;

      return matchSearch && matchStatus;
    });
  }, [orders, searchTerm, statusFilter]);

  // Pagination
  const totalItems = filteredOrders.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedOrders = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredOrders.slice(start, start + pageSize);
  }, [filteredOrders, currentPage, pageSize]);

  // Export CSV
  const handleExportCSV = () => {
    const headers = [
      "Order ID",
      "Customer",
      "Email",
      "Phone",
      "Date",
      "Total",
      "Payment Status",
      "Fulfillment Status",
    ];
    const rows = filteredOrders.map((o) => [
      o.id,
      `"${o.customerName || ""}"`,
      o.email || "",
      o.phone || "",
      o.date || o.orderDate || "",
      o.totalAmount || o.total || 0,
      o.paymentStatus || "Paid",
      o.orderStatus || o.status || "Pending",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `divyam_orders_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Dropdown values are the display labels; unknown statuses fall back to Pending
  const normalizeSelectStatus = (st) => {
    const label = getStatusLabel(st);
    return ["Pending", "Confirmed", "Processing", "Dispatched", "Out for Delivery", "Delivered", "Cancelled"].includes(label)
      ? label
      : "Pending";
  };

  const getStatusBadge = (status) => {
    const s = toStatusKey(status);
    switch (s) {
      case "delivered":
        return "bg-emerald-100 text-emerald-800 border-emerald-200";
      case "out_for_delivery":
        return "bg-indigo-100 text-indigo-800 border-indigo-200";
      case "dispatched":
      case "shipped":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "processing":
      case "packed":
        return "bg-amber-100 text-amber-800 border-amber-200";
      case "confirmed":
        return "bg-teal-100 text-teal-800 border-teal-200";
      case "cancelled":
        return "bg-rose-100 text-rose-800 border-rose-200";
      case "return_requested":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "returned":
        return "bg-purple-100 text-purple-800 border-purple-200";
      default:
        return "bg-stone-100 text-stone-800 border-stone-200";
    }
  };

  const columns = [
    {
      header: "Order ID",
      render: (row) => (
        <div>
          <Link
            to={`/admin/orders/${row.id}`}
            className="font-bold text-stone-900 hover:text-emerald-800 hover:underline font-mono text-xs sm:text-sm"
          >
            {row.id}
          </Link>
          <div className="text-[11px] text-stone-400">
            {formatDate(row.date || row.orderDate)}
          </div>
        </div>
      ),
    },
    {
      header: "Customer",
      render: (row) => (
        <div>
          <div className="font-semibold text-stone-900 text-xs sm:text-sm">
            {row.customerName}
          </div>
          <div className="text-[11px] text-stone-400">
            {row.email} • {row.phone}
          </div>
        </div>
      ),
    },
    {
      header: "Items",
      render: (row) => (
        <span className="text-xs font-medium text-stone-600">
          {row.items?.length || 1} item(s)
        </span>
      ),
    },
    {
      header: "Amount",
      render: (row) => {
        const isOnline =
          String(row.paymentMethod || "").toLowerCase().includes("online") ||
          String(row.paymentMethod || "").toLowerCase().includes("card") ||
          String(row.paymentMethod || "").toLowerCase().includes("upi") ||
          String(row.paymentMethod || "").toLowerCase().includes("cashfree");
        const methodLabel = isOnline ? "Online Payment" : "Cash on Delivery (COD)";

        return (
          <div>
            <span className="font-bold text-stone-900 text-xs sm:text-sm">
              {formatCurrency(row.totalAmount || row.total)}
            </span>
            <div className="text-[11px] font-medium text-stone-500 mt-0.5">
              {methodLabel}
            </div>
          </div>
        );
      },
    },
    {
      header: "Payment",
      render: (row) => {
        const payStatus = row.paymentStatus || "Pending";
        const getPaymentBadge = (status) => {
          switch (status) {
            case "Paid":
              return "bg-emerald-50 text-emerald-800 border-emerald-200";
            case "Refunded":
              return "bg-purple-50 text-purple-800 border-purple-200";
            case "Failed":
              return "bg-rose-50 text-rose-800 border-rose-200";
            default:
              return "bg-amber-50 text-amber-800 border-amber-200";
          }
        };

        return (
          <select
            value={payStatus}
            onChange={(e) => updatePaymentStatus(row.id, e.target.value)}
            className={`px-2 py-0.5 text-xs font-semibold rounded-full border cursor-pointer ${getPaymentBadge(
              payStatus
            )} focus:outline-none focus:ring-1 focus:ring-emerald-700`}
            title="Update payment status"
          >
            <option value="Paid">Paid</option>
            <option value="Pending">Pending</option>
            <option value="Refunded">Refunded</option>
            <option value="Failed">Failed</option>
          </select>
        );
      },
    },
    {
      header: "Order Status",
      render: (row) => {
        const status = row.orderStatus || row.status;
        return (
          <span
            className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold border ${getStatusBadge(
              status
            )}`}
          >
            {status}
          </span>
        );
      },
    },
    {
      header: "Quick Action",
      align: "right",
      render: (row) => (
        <div className="flex items-center justify-end gap-2">
          {["Return Requested", "Returned"].includes(row.orderStatus || row.status) ? (
            <Link to="/admin/returns-refunds" className="px-2 py-1 text-xs rounded-lg border border-amber-200 bg-amber-50 text-amber-900 font-semibold">
              Manage in Returns
            </Link>
          ) : (
          <select
            value={normalizeSelectStatus(row.orderStatus || row.status)}
            onChange={async (e) => {
              try {
                await updateOrderStatus(row.id, e.target.value);
              } catch (err) {
                alert(`Status update failed: ${err.message}`);
              }
            }}
            className="px-2 py-1 text-xs rounded-lg border border-stone-200 bg-white hover:border-stone-400 text-stone-800"
          >
            <option value="Pending">Pending</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Processing">Processing</option>
            <option value="Dispatched">Dispatched</option>
            <option value="Out for Delivery">Out for Delivery</option>
            <option value="Delivered">Delivered</option>
            <option value="Cancelled">Cancelled</option>
          </select>
          )}

          <Link
            to={`/admin/orders/${row.id}`}
            title="View Full Order Details"
            className="p-1.5 rounded-lg text-stone-500 hover:text-emerald-800 hover:bg-stone-100 transition-colors"
          >
            <Eye className="w-4 h-4" />
          </Link>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 font-sans tracking-tight">
            Customer Orders & Fulfillment
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Track customer remedies orders, dispatch statuses, and delivery confirmations.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportCSV}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto"
        >
          <Download className="w-4 h-4 text-stone-500" />
          <span>Export Orders CSV</span>
        </button>
      </div>

      {/* Orders Filter Bar */}
      <AdminCard noPadding={true}>
        <div className="p-4 border-b border-stone-100 flex flex-wrap items-center justify-between gap-3 bg-stone-50/50">
          {/* Search */}
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              type="text"
              placeholder="Search by Order ID, customer name, email, phone..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-stone-300 bg-white focus:ring-[#173D2A]"
            />
          </div>

          {/* Status Tabs */}
          <div className="flex flex-wrap items-center gap-1">
            {[
              { id: "all", label: "All" },
              { id: "Pending", label: "Pending" },
              { id: "Processing", label: "Processing" },
              { id: "Dispatched", label: "Dispatched" },
              { id: "Delivered", label: "Delivered" },
              { id: "Cancelled", label: "Cancelled" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => {
                  setStatusFilter(tab.id);
                  setCurrentPage(1);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                  statusFilter === tab.id
                    ? "bg-[#173D2A] text-white"
                    : "text-stone-600 hover:bg-stone-200/60"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <AdminTable
          columns={columns}
          data={paginatedOrders}
          keyField="id"
          emptyMessage="No orders found matching your criteria."
          pagination={{
            currentPage,
            pageSize,
            totalItems,
            totalPages,
            onPageChange: setCurrentPage,
          }}
        />
      </AdminCard>
    </div>
  );
};

