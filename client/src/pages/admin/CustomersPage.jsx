import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { Users, Search, Eye, UserX, UserCheck, Shield } from "lucide-react";
import { useAdmin } from "../../context/AdminContext";
import { AdminCard } from "../../components/admin/common/AdminCard";
import { AdminTable } from "../../components/admin/common/AdminTable";
import { formatCurrency, formatDate } from "../../utils/formatters";

export const CustomersPage = () => {
  const { customers, saveCustomer } = useAdmin();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const matchSearch =
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.phone?.includes(searchTerm) ||
        c.city?.toLowerCase().includes(searchTerm.toLowerCase());

      const matchStatus = statusFilter === "all" || c.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [customers, searchTerm, statusFilter]);

  const totalItems = filteredCustomers.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredCustomers.slice(start, start + pageSize);
  }, [filteredCustomers, currentPage, pageSize]);

  const handleToggleBlock = (c) => {
    const newStatus = c.status === "Blocked" ? "Active" : "Blocked";
    saveCustomer({
      ...c,
      status: newStatus,
    });
  };

  const columns = [
    {
      header: "Customer",
      render: (row) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-sm flex-shrink-0">
            {row.name ? row.name.charAt(0) : "C"}
          </div>
          <div>
            <Link
              to={`/admin/customers/${row.id}`}
              className="font-semibold text-stone-900 hover:text-emerald-800 transition-colors"
            >
              {row.name}
            </Link>
            <div className="text-[11px] text-stone-400">{row.email}</div>
          </div>
        </div>
      ),
    },
    {
      header: "Phone & Location",
      render: (row) => (
        <div>
          <div className="text-xs text-stone-800">{row.phone || "+91 98765 43210"}</div>
          <div className="text-[11px] text-stone-400">
            {row.city || "Mumbai"}, {row.state || "Maharashtra"}
          </div>
        </div>
      ),
    },
    {
      header: "Orders Placed",
      render: (row) => (
        <span className="font-semibold text-stone-900 text-xs">
          {row.totalOrders || 0} orders
        </span>
      ),
    },
    {
      header: "Lifetime Spent",
      render: (row) => (
        <span className="font-bold text-stone-900 text-xs sm:text-sm">
          {formatCurrency(row.totalSpent || 0)}
        </span>
      ),
    },
    {
      header: "Joined Date",
      render: (row) => (
        <span className="text-xs text-stone-500">
          {formatDate(row.joinedAt || row.createdAt || "2026-01-15")}
        </span>
      ),
    },
    {
      header: "Status",
      render: (row) => (
        <span
          className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
            row.status === "Blocked"
              ? "bg-rose-100 text-rose-800"
              : "bg-emerald-100 text-emerald-800"
          }`}
        >
          {row.status || "Active"}
        </span>
      ),
    },
    {
      header: "Action",
      align: "right",
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <Link
            to={`/admin/customers/${row.id}`}
            title="View customer profile & orders"
            className="p-1.5 text-stone-500 hover:text-emerald-800 hover:bg-stone-100 rounded-lg transition-colors"
          >
            <Eye className="w-4 h-4" />
          </Link>

          <button
            type="button"
            onClick={() => handleToggleBlock(row)}
            title={row.status === "Blocked" ? "Unblock customer" : "Block customer"}
            className={`p-1.5 rounded-lg transition-colors ${
              row.status === "Blocked"
                ? "text-emerald-700 hover:bg-emerald-50"
                : "text-stone-400 hover:text-rose-600 hover:bg-rose-50"
            }`}
          >
            {row.status === "Blocked" ? (
              <UserCheck className="w-4 h-4" />
            ) : (
              <UserX className="w-4 h-4" />
            )}
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-stone-900 font-sans tracking-tight">
          Customer Directory & Profiles
        </h1>
        <p className="text-xs sm:text-sm text-stone-500 mt-1">
          Manage verified buyers, lifetime order volume, and customer relationship records.
        </p>
      </div>

      <AdminCard noPadding={true}>
        <div className="p-4 border-b border-stone-100 flex flex-wrap items-center justify-between gap-3 bg-stone-50/50">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              type="text"
              placeholder="Search by customer name, email, phone, or city..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-stone-300 bg-white"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 text-xs rounded-xl border border-stone-300 bg-white text-stone-700"
            >
              <option value="all">All Customer Statuses</option>
              <option value="Active">Active</option>
              <option value="Blocked">Blocked</option>
            </select>
          </div>
        </div>

        <AdminTable
          columns={columns}
          data={paginatedData}
          keyField="id"
          emptyMessage="No customer records found matching your filters."
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

