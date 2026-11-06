import React, { useRef, useState } from "react";
import { MessageSquare } from "lucide-react";
import { useAdmin } from "../../context/AdminContext";
import { AdminCard } from "../../components/admin/common/AdminCard";
import { AdminTable } from "../../components/admin/common/AdminTable";
import { AdminModal } from "../../components/admin/common/AdminModal";
import { Thread, ReplyBox } from "../../components/admin/support/ReplyThread";
import { formatDate } from "../../utils/formatters";

const STATUS_STYLE = {
  Open: "bg-amber-100 text-amber-800",
  "In Progress": "bg-blue-100 text-blue-800",
  Resolved: "bg-emerald-100 text-emerald-800",
  Closed: "bg-stone-100 text-stone-600",
};

export const SupportTicketsPage = () => {
  const { adminTableState, supportTickets, updateTicket } = useAdmin();
  const [openId, setOpenId] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [notes, setNotes] = useState("");
  const [sending, setSending] = useState(false);
  const busyRef = useRef(false);
  const [error, setError] = useState("");

  // Always the latest copy from the list, so a saved reply shows up straight away
  const ticket = supportTickets.find((t) => t.id === openId) || null;

  const open = (row) => {
    setOpenId(row.id);
    setReplyText("");
    setNotes(row.internalNotes || "");
    setError("");
  };

  const save = async (fields, onDone) => {
    if (busyRef.current || !ticket) return;
    busyRef.current = true;
    setSending(true);
    setError("");
    try {
      await updateTicket(ticket.id, fields);
      onDone?.();
    } catch (err) {
      setError(err.message || "That could not be saved. Please try again.");
    } finally {
      busyRef.current = false;
      setSending(false);
    }
  };

  const sendReply = (e) => {
    e.preventDefault();
    save({ reply: replyText.trim() }, () => setReplyText(""));
  };

  const entries = ticket
    ? (ticket.messages || []).map((m, i) => ({
        key: `m${i}`,
        who: m.senderRole === "customer" ? ticket.customerName : m.sender || "Support team",
        fromCustomer: m.senderRole === "customer",
        text: m.message,
        time: m.time,
      }))
    : [];

  const columns = [
    {
      header: "Ticket",
      render: (row) => (
        <div>
          <span className="font-mono font-bold text-xs text-stone-900">{row.ticketNumber}</span>
          <div className="text-[11px] text-stone-500">{formatDate(row.createdAt)}</div>
        </div>
      ),
    },
    {
      header: "Customer",
      render: (row) => (
        <div>
          <div className="font-semibold text-stone-900 text-xs">{row.customerName}</div>
          <div className="text-[11px] text-stone-500 break-all">{row.customerEmail}</div>
        </div>
      ),
    },
    {
      header: "Subject & Issue",
      cellClassName: "max-w-md",
      render: (row) => (
        <div>
          <div className="font-semibold text-stone-900 text-xs">
            {row.subject}
            {row.orderNumber && <span className="ml-1.5 font-mono text-[10px] text-stone-500">{row.orderNumber}</span>}
          </div>
          <p className="text-xs text-stone-600 line-clamp-2 mt-0.5">"{row.messages?.[0]?.message || ""}"</p>
          <div className="text-[10px] text-stone-400 mt-0.5">{row.category} · {row.messages?.length || 0} message(s)</div>
        </div>
      ),
    },
    {
      header: "Status",
      render: (row) => (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLE[row.status] || "bg-stone-100 text-stone-700"}`}>{row.status}</span>
      ),
    },
    {
      header: "Action",
      align: "right",
      render: (row) => (
        <button
          type="button"
          onClick={() => open(row)}
          className="inline-flex items-center gap-1 px-3 py-1 text-xs font-semibold rounded-lg bg-[#173D2A] text-white hover:bg-[#0B2416] transition-colors"
        >
          <MessageSquare className="w-3.5 h-3.5" />
          <span>Open</span>
        </button>
      ),
    },
  ];

  const statusButton = (label, status, tone) => (
    <button
      type="button"
      disabled={sending || ticket?.status === status}
      onClick={() => save({ status })}
      className={`px-3 py-1.5 text-xs font-semibold rounded-xl border disabled:opacity-40 ${tone}`}
    >
      {label}
    </button>
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900 font-sans tracking-tight">Customer Support Tickets</h1>
        <p className="text-xs sm:text-sm text-stone-500 mt-1">
          Tickets raised by signed-in customers. Replies appear in their account under Help &amp; Support.
        </p>
      </div>

      <AdminCard noPadding={true}>
        <AdminTable
          {...adminTableState("supportTickets", supportTickets)}
          columns={columns}
          data={supportTickets}
          keyField="id"
          emptyMessage="No customer support tickets found."
        />
      </AdminCard>

      <AdminModal
        isOpen={Boolean(ticket)}
        onClose={() => !sending && setOpenId(null)}
        title={ticket ? `${ticket.ticketNumber}: ${ticket.subject}` : ""}
        subtitle={ticket ? `${ticket.customerName} · ${ticket.customerEmail}${ticket.orderNumber ? ` · Order ${ticket.orderNumber}` : ""}` : ""}
        maxWidth="max-w-xl"
        footer={
          <button type="button" onClick={() => setOpenId(null)} disabled={sending} className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl">
            Close
          </button>
        }
      >
        {ticket && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLE[ticket.status] || "bg-stone-100"}`}>{ticket.status}</span>
              <span className="text-[11px] text-stone-500">{ticket.category}</span>
              <div className="ml-auto flex flex-wrap gap-2">
                {statusButton("Mark resolved", "Resolved", "border-emerald-300 text-emerald-800 hover:bg-emerald-50")}
                {statusButton("Close", "Closed", "border-stone-300 text-stone-700 hover:bg-stone-50")}
                {ticket.status === "Resolved" || ticket.status === "Closed" ? statusButton("Reopen", "In Progress", "border-blue-300 text-blue-800 hover:bg-blue-50") : null}
              </div>
            </div>

            <Thread entries={entries} />

            <ReplyBox
              id="ticket-reply"
              value={replyText}
              onChange={setReplyText}
              onSend={sendReply}
              sending={sending}
              error={error}
              label="Reply to the customer"
              help="The customer reads this in My Account > Help & Support. Replying moves an Open ticket to In Progress; use Mark resolved when it's done."
              disabled={ticket.status === "Closed"}
            />

            <div className="pt-3 border-t border-stone-100 space-y-2">
              <label htmlFor="ticket-notes" className="block text-xs font-semibold text-stone-700">Internal notes <span className="font-normal text-stone-400">(never shown to the customer)</span></label>
              <textarea id="ticket-notes" rows={2} maxLength={2000} value={notes} onChange={(e) => setNotes(e.target.value)} className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 bg-white" />
              <button
                type="button"
                disabled={sending || notes === (ticket.internalNotes || "")}
                onClick={() => save({ internalNotes: notes })}
                className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-stone-300 text-stone-700 hover:bg-stone-50 disabled:opacity-40"
              >
                Save note
              </button>
            </div>
          </div>
        )}
      </AdminModal>
    </div>
  );
};
