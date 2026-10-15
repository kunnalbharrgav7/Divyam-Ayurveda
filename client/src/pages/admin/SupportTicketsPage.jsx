import React, { useState } from "react";
import { LifeBuoy, CheckCircle2, Clock, AlertTriangle, Send } from "lucide-react";
import { useAdmin } from "../../context/AdminContext";
import { AdminCard } from "../../components/admin/common/AdminCard";
import { AdminTable } from "../../components/admin/common/AdminTable";
import { AdminModal } from "../../components/admin/common/AdminModal";
import { formatDate } from "../../utils/formatters";

export const SupportTicketsPage = () => {
  const { supportTickets, updateTicketStatus } = useAdmin();
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [replyModalOpen, setReplyModalOpen] = useState(false);

  const handleOpenReply = (ticket) => {
    setSelectedTicket(ticket);
    setReplyText(`Hello ${ticket.customerName},\n\nRegarding ticket #${ticket.id} (${ticket.subject}):\n\n`);
    setReplyModalOpen(true);
  };

  const handleSendReply = (e) => {
    e.preventDefault();
    if (selectedTicket) {
      updateTicketStatus(selectedTicket.id, "Resolved");
      alert(`Response sent for Ticket #${selectedTicket.id}!`);
      setReplyModalOpen(false);
    }
  };

  const columns = [
    {
      header: "Ticket ID",
      render: (row) => (
        <span className="font-mono font-bold text-xs text-stone-900">
          {row.id}
        </span>
      ),
    },
    {
      header: "Customer",
      render: (row) => (
        <div>
          <div className="font-semibold text-stone-900 text-xs">
            {row.customerName}
          </div>
          <div className="text-[11px] text-stone-500">{row.email}</div>
        </div>
      ),
    },
    {
      header: "Subject & Issue",
      cellClassName: "max-w-md",
      render: (row) => (
        <div>
          <div className="font-semibold text-stone-900 text-xs">{row.subject}</div>
          <p className="text-xs text-stone-600 line-clamp-2 mt-0.5">
            "{row.message}"
          </p>
        </div>
      ),
    },
    {
      header: "Priority",
      render: (row) => (
        <span
          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
            row.priority === "Urgent"
              ? "bg-rose-100 text-rose-800"
              : row.priority === "High"
              ? "bg-amber-100 text-amber-800"
              : "bg-stone-100 text-stone-700"
          }`}
        >
          {row.priority}
        </span>
      ),
    },
    {
      header: "Status",
      render: (row) => (
        <span
          className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
            row.status === "Resolved"
              ? "bg-emerald-100 text-emerald-800"
              : row.status === "In Progress"
              ? "bg-blue-100 text-blue-800"
              : "bg-amber-100 text-amber-800"
          }`}
        >
          {row.status}
        </span>
      ),
    },
    {
      header: "Action",
      align: "right",
      render: (row) => (
        <button
          type="button"
          onClick={() => handleOpenReply(row)}
          className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-lg bg-[#173D2A] text-white hover:bg-[#0B2416] transition-colors"
        >
          <span>Respond</span>
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900 font-sans tracking-tight">
          Customer Support Tickets
        </h1>
        <p className="text-xs sm:text-sm text-stone-500 mt-1">
          Resolve order issues, physician consultations, and product queries.
        </p>
      </div>

      <AdminCard noPadding={true}>
        <AdminTable
          columns={columns}
          data={supportTickets}
          keyField="id"
          emptyMessage="No customer support tickets found."
        />
      </AdminCard>

      {/* Reply Modal */}
      {selectedTicket && (
        <AdminModal
          isOpen={replyModalOpen}
          onClose={() => setReplyModalOpen(false)}
          title={`Ticket #${selectedTicket.id}: ${selectedTicket.subject}`}
          subtitle={`Customer: ${selectedTicket.customerName} (${selectedTicket.email})`}
          footer={
            <>
              <button
                type="button"
                onClick={() => setReplyModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSendReply}
                className="px-4 py-2 text-xs font-semibold bg-[#173D2A] text-white hover:bg-[#0B2416] rounded-xl shadow-xs inline-flex items-center gap-1.5"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Submit Resolution & Email Customer</span>
              </button>
            </>
          }
        >
          <form onSubmit={handleSendReply} className="space-y-4">
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs text-stone-700">
              <span className="font-semibold text-stone-900 block mb-1">
                Customer Issue Details:
              </span>
              "{selectedTicket.message}"
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Fulfillment Resolution & Response
              </label>
              <textarea
                rows={6}
                value={replyText}
                onChange={(e) => setReplyText(e.target.value)}
                required
                className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 bg-white"
              />
            </div>
          </form>
        </AdminModal>
      )}
    </div>
  );
};

