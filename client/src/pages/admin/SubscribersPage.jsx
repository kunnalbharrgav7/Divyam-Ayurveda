import React, { useState } from "react";
import { Send, Download, Trash2, Mail, CheckCircle2 } from "lucide-react";
import { useAdmin } from "../../context/AdminContext";
import { AdminCard } from "../../components/admin/common/AdminCard";
import { AdminTable } from "../../components/admin/common/AdminTable";
import { formatDate } from "../../utils/formatters";

export const SubscribersPage = () => {
  const { subscribers, deleteSubscriber } = useAdmin();
  const [searchTerm, setSearchTerm] = useState("");

  const filtered = subscribers.filter((s) =>
    s.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleExportCSV = () => {
    const headers = ["Email", "Subscribed Date", "Source", "Status"];
    const rows = filtered.map((s) => [
      s.email,
      s.date || "",
      s.source || "Homepage Footer",
      s.status || "Active",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute(
      "download",
      `divyam_subscribers_${new Date().toISOString().split("T")[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const columns = [
    {
      header: "Subscriber Email",
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <Mail className="w-4 h-4 text-emerald-800" />
          <span className="font-semibold text-stone-900 text-xs sm:text-sm">
            {row.email}
          </span>
        </div>
      ),
    },
    {
      header: "Subscription Source",
      render: (row) => (
        <span className="text-xs text-stone-600 bg-stone-100 px-2 py-0.5 rounded">
          {row.source || "Storefront Footer"}
        </span>
      ),
    },
    {
      header: "Joined Date",
      render: (row) => (
        <span className="text-xs text-stone-500">{formatDate(row.date)}</span>
      ),
    },
    {
      header: "Status",
      render: (row) => (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
          <CheckCircle2 className="w-3 h-3" />
          <span>{row.status || "Subscribed"}</span>
        </span>
      ),
    },
    {
      header: "Action",
      align: "right",
      render: (row) => (
        <button
          type="button"
          onClick={() => deleteSubscriber(row.id)}
          className="p-1.5 text-stone-400 hover:text-rose-600 rounded-lg transition-colors"
          title="Remove subscriber"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 font-sans tracking-tight">
            Newsletter Subscribers & Audience
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Opted-in email subscribers for Ayurvedic wellness tips, product launches, and seasonal discounts.
          </p>
        </div>

        <button
          type="button"
          onClick={handleExportCSV}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto"
        >
          <Download className="w-4 h-4 text-stone-500" />
          <span>Export Audience CSV</span>
        </button>
      </div>

      <AdminCard noPadding={true}>
        <div className="p-4 border-b border-stone-100 flex items-center justify-between bg-stone-50/50">
          <input
            type="text"
            placeholder="Search email subscribers..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full max-w-sm px-3.5 py-2 text-xs rounded-xl border border-stone-300 bg-white"
          />
          <span className="text-xs text-stone-500 font-semibold">
            {filtered.length} Active Subscribers
          </span>
        </div>

        <AdminTable
          columns={columns}
          data={filtered}
          keyField="id"
          emptyMessage="No newsletter subscribers found."
        />
      </AdminCard>
    </div>
  );
};

