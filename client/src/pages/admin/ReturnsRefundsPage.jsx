import React, { useState } from "react";
import { Link } from "react-router-dom";
import { RotateCcw, CheckCircle2, XCircle, Search, Filter, Eye } from "lucide-react";
import { AdminCard } from "../../components/admin/common/AdminCard";
import { AdminTable } from "../../components/admin/common/AdminTable";
import { formatCurrency, formatDate } from "../../utils/formatters";

export const ReturnsRefundsPage = () => {
  const [returns, setReturns] = useState([
    {
      id: "RET-201",
      orderId: "ORD-1002",
      customerName: "Pooja Sharma",
      productTitle: "Triphala Churna Organic Detox Powder (200g)",
      reason: "Outer package seal was opened during transit",
      amount: 449,
      status: "Requested",
      requestedAt: "2026-10-12",
    },
    {
      id: "RET-202",
      orderId: "ORD-1004",
      customerName: "Vikram Malhotra",
      productTitle: "Brahmi Mind & Memory Tablets (60 Caps)",
      reason: "Ordered duplicate bottle by accident",
      amount: 599,
      status: "Approved",
      requestedAt: "2026-10-11",
    },
    {
      id: "RET-203",
      orderId: "ORD-1005",
      customerName: "Ananya Iyer",
      productTitle: "Kumkumadi Miraculous Radiant Face Oil (30ml)",
      reason: "Mild skin sensitivity observed on initial patch test",
      amount: 1499,
      status: "Refunded",
      requestedAt: "2026-10-09",
    },
  ]);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const handleUpdateStatus = (id, newStatus) => {
    setReturns((prev) =>
      prev.map((r) => (r.id === id ? { ...r, status: newStatus } : r))
    );
  };

  const filtered = returns.filter((r) => {
    const matchSearch =
      r.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.orderId.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.customerName.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = statusFilter === "all" || r.status === statusFilter;
    return matchSearch && matchStatus;
  });

  const columns = [
    {
      header: "Return ID",
      render: (row) => (
        <div>
          <span className="font-bold text-stone-900 font-mono text-xs">
            {row.id}
          </span>
          <div className="text-[11px] text-stone-400">
            For: <Link to={`/admin/orders/${row.orderId}`} className="text-emerald-800 underline">{row.orderId}</Link>
          </div>
        </div>
      ),
    },
    {
      header: "Customer",
      accessor: "customerName",
    },
    {
      header: "Product & Reason",
      render: (row) => (
        <div className="max-w-xs">
          <div className="font-semibold text-stone-900 line-clamp-1">
            {row.productTitle}
          </div>
          <div className="text-[11px] text-stone-500 italic mt-0.5">
            "{row.reason}"
          </div>
        </div>
      ),
    },
    {
      header: "Refund Amount",
      render: (row) => (
        <span className="font-bold text-stone-900">
          {formatCurrency(row.amount)}
        </span>
      ),
    },
    {
      header: "Status",
      render: (row) => (
        <span
          className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
            row.status === "Refunded"
              ? "bg-emerald-100 text-emerald-800"
              : row.status === "Approved"
              ? "bg-blue-100 text-blue-800"
              : row.status === "Rejected"
              ? "bg-rose-100 text-rose-800"
              : "bg-amber-100 text-amber-800"
          }`}
        >
          {row.status}
        </span>
      ),
    },
    {
      header: "Resolution Actions",
      align: "right",
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          {row.status === "Requested" && (
            <>
              <button
                type="button"
                onClick={() => handleUpdateStatus(row.id, "Approved")}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200 transition-colors"
              >
                Approve
              </button>
              <button
                type="button"
                onClick={() => handleUpdateStatus(row.id, "Rejected")}
                className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200 transition-colors"
              >
                Reject
              </button>
            </>
          )}

          {row.status === "Approved" && (
            <button
              type="button"
              onClick={() => handleUpdateStatus(row.id, "Refunded")}
              className="px-2.5 py-1 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200 transition-colors"
            >
              Issue Refund
            </button>
          )}

          {row.status === "Refunded" && (
            <span className="text-xs text-stone-400 italic">Settled</span>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-stone-900 font-sans tracking-tight">
          Returns & Refund Management
        </h1>
        <p className="text-xs sm:text-sm text-stone-500 mt-1">
          Review customer returns according to Divyam Ayurveda's 14-day botanical quality guarantee.
        </p>
      </div>

      <AdminCard noPadding={true}>
        <div className="p-4 border-b border-stone-100 flex flex-wrap items-center justify-between gap-3 bg-stone-50/50">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              type="text"
              placeholder="Search by Return ID, order ID, or customer name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-stone-300 bg-white"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-stone-300 bg-white text-stone-700"
            >
              <option value="all">All Request Statuses</option>
              <option value="Requested">Requested</option>
              <option value="Approved">Approved for Return</option>
              <option value="Refunded">Refunded / Closed</option>
              <option value="Rejected">Rejected</option>
            </select>
          </div>
        </div>

        <AdminTable
          columns={columns}
          data={filtered}
          keyField="id"
          emptyMessage="No return or refund requests found."
        />
      </AdminCard>
    </div>
  );
};

