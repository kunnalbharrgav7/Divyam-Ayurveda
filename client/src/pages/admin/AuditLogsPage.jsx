import React, { useState, useMemo, useEffect } from "react";
import { History, Search, Filter, ShieldCheck, Download } from "lucide-react";
import { useAdmin } from "../../context/AdminContext";
import { AdminCard } from "../../components/admin/common/AdminCard";
import { AdminTable } from "../../components/admin/common/AdminTable";
import { formatDateTime } from "../../utils/formatters";

export const AuditLogsPage = () => {
  const { adminTableState, auditLogs, fetchAdminAuditLogs } = useAdmin();
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");

  // Always show the latest trail when the page is opened
  useEffect(() => {
    fetchAdminAuditLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredLogs = useMemo(() => {
    const term = searchTerm.toLowerCase();
    return auditLogs.filter((log) => {
      const matchSearch =
        (log.action || "").toLowerCase().includes(term) ||
        (log.details || "").toLowerCase().includes(term) ||
        (log.user || "").toLowerCase().includes(term);

      const matchCategory =
        categoryFilter === "all" ||
        `${log.action || ""} ${log.module || ""}`.toLowerCase().includes(categoryFilter.toLowerCase());

      return matchSearch && matchCategory;
    });
  }, [auditLogs, searchTerm, categoryFilter]);

  const handleExportCSV = () => {
    const headers = ["Timestamp (ISO)", "Action", "Details", "Staff User", "Role", "IP Address"];
    const q = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const rows = filteredLogs.map((l) => [
      l.timestamp ? new Date(l.timestamp).toISOString() : "",
      q(l.action),
      q(l.details),
      q(l.user),
      q(l.actorRole),
      q(l.ip),
    ]);

    // A Blob (not a data: URL) so characters like "#" in details don't truncate the file
    const csv = [headers.join(","), ...rows.map((e) => e.join(","))].join("\r\n");
    const url = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `divyam_audit_trail_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const columns = [
    {
      header: "Timestamp",
      render: (row) => (
        <span className="font-mono text-xs text-stone-500 whitespace-nowrap">
          {formatDateTime(row.timestamp)}
        </span>
      ),
    },
    {
      header: "Action Performed",
      render: (row) => (
        <span className="font-semibold text-stone-900 text-xs">
          {row.action}
        </span>
      ),
    },
    {
      header: "Activity Details",
      cellClassName: "max-w-md",
      render: (row) => (
        <span className="text-xs text-stone-600 leading-relaxed">
          {row.details}
          {row.ip && <span className="block text-[11px] text-stone-400 mt-0.5">IP {row.ip}</span>}
        </span>
      ),
    },
    {
      header: "Staff Member",
      render: (row) => (
        <span className="inline-flex items-start gap-1.5 text-xs">
          <ShieldCheck className="w-3.5 h-3.5 mt-0.5 shrink-0 text-emerald-800" />
          <span>
            <span className="block font-medium text-stone-800">{row.user || "System"}</span>
            {row.actorRole && row.actorRole !== "System" && <span className="block text-[11px] text-stone-400">{row.actorRole}</span>}
          </span>
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 font-sans tracking-tight">
            Security & Operational Audit Log
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Real-time chronological record of administrative actions, stock adjustments, and order state mutations.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportCSV}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto"
        >
          <Download className="w-4 h-4 text-stone-500" />
          <span>Export Audit Trail</span>
        </button>
      </div>

      <AdminCard noPadding={true}>
        <div className="p-4 border-b border-stone-100 flex flex-wrap items-center justify-between gap-3 bg-stone-50/50">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              type="text"
              placeholder="Search by action, details, or staff user..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-stone-300 bg-white"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-stone-300 bg-white text-stone-700"
            >
              <option value="all">All Action Categories</option>
              <option value="product">Products & Catalog</option>
              <option value="inventory">Inventory & Stock</option>
              <option value="order">Orders & Fulfillment</option>
              <option value="review">Reviews Moderation</option>
              <option value="settings">Store Settings</option>
            </select>
          </div>
        </div>

        <AdminTable
          {...adminTableState("auditLogs", filteredLogs)}
          columns={columns}
          data={filteredLogs}
          keyField="id"
          emptyMessage="No audit logs found matching your criteria."
        />
      </AdminCard>
    </div>
  );
};

