import React, { useRef, useState } from "react";
import { Mail, MessageSquare } from "lucide-react";
import { useAdmin } from "../../context/AdminContext";
import { AdminCard } from "../../components/admin/common/AdminCard";
import { AdminTable } from "../../components/admin/common/AdminTable";
import { AdminModal } from "../../components/admin/common/AdminModal";
import { Thread, ReplyBox } from "../../components/admin/support/ReplyThread";
import { formatDate } from "../../utils/formatters";

const STATUSES = ["New", "In Progress", "Replied", "Resolved", "Archived"];
const STATUS_STYLE = {
  New: "bg-amber-100 text-amber-800",
  "In Progress": "bg-blue-100 text-blue-800",
  Replied: "bg-indigo-100 text-indigo-800",
  Resolved: "bg-emerald-100 text-emerald-800",
  Archived: "bg-stone-100 text-stone-600",
};

export const EnquiriesPage = () => {
  const { adminTableState, enquiries, updateEnquiry } = useAdmin();
  const [openId, setOpenId] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [sending, setSending] = useState(false);
  const busyRef = useRef(false);
  const [error, setError] = useState("");

  // Always the latest copy from the list, so a saved reply shows up straight away
  const enquiry = enquiries.find((e) => e.id === openId) || null;

  const open = (row) => {
    setOpenId(row.id);
    setReplyText("");
    setError("");
  };

  const save = async (fields, onDone) => {
    if (busyRef.current || !enquiry) return;
    busyRef.current = true;
    setSending(true);
    setError("");
    try {
      await updateEnquiry(enquiry.id, fields);
      onDone?.();
    } catch (err) {
      setError(err.message || "That could not be saved. Please try again.");
    } finally {
      busyRef.current = false;
      setSending(false);
    }
  };

  const saveReply = (e) => {
    e.preventDefault();
    save({ reply: replyText.trim() }, () => setReplyText(""));
  };

  const entries = enquiry
    ? [
        { key: "first", who: enquiry.name, fromCustomer: true, text: enquiry.message, time: enquiry.createdAt },
        ...(enquiry.replies || []).map((r, i) => ({ key: `r${i}`, who: r.staffName || "Staff", fromCustomer: false, text: r.message, time: r.time })),
      ]
    : [];

  const columns = [
    {
      header: "Name & Contact",
      render: (row) => (
        <div>
          <div className="font-semibold text-stone-900">
            {row.name}
            {row.userId && <span className="ml-1.5 text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-full px-1.5 py-0.5">Customer</span>}
          </div>
          <div className="text-[11px] text-stone-500 break-all">
            {row.email} • {row.phone || "No phone"}
          </div>
        </div>
      ),
    },
    {
      header: "Subject & Message",
      cellClassName: "max-w-md",
      render: (row) => (
        <div>
          <div className="font-semibold text-stone-800 text-xs mb-0.5">{row.subject}</div>
          <p className="text-xs text-stone-600 line-clamp-2">"{row.message}"</p>
        </div>
      ),
    },
    {
      header: "Received On",
      render: (row) => <span className="text-xs text-stone-500">{formatDate(row.createdAt)}</span>,
    },
    {
      header: "Status",
      render: (row) => (
        <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${STATUS_STYLE[row.status] || "bg-stone-100 text-stone-700"}`}>
          {row.status}
          {row.replies?.length ? ` · ${row.replies.length} repl${row.replies.length === 1 ? "y" : "ies"}` : ""}
        </span>
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

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900 font-sans tracking-tight">Website Contact Form Enquiries</h1>
        <p className="text-xs sm:text-sm text-stone-500 mt-1">
          Messages sent from the storefront Contact Us page. A signed-in customer reads your reply in their account; for visitors who weren't signed in, also reply by email or phone using the details shown.
        </p>
      </div>

      <AdminCard noPadding={true}>
        <AdminTable
          {...adminTableState("enquiries", enquiries)}
          columns={columns}
          data={enquiries}
          keyField="id"
          emptyMessage="No customer contact messages found."
        />
      </AdminCard>

      <AdminModal
        isOpen={Boolean(enquiry)}
        onClose={() => !sending && setOpenId(null)}
        title={enquiry ? `Enquiry from ${enquiry.name}` : ""}
        subtitle={enquiry ? `${enquiry.subject} · ${enquiry.email}${enquiry.phone ? ` · ${enquiry.phone}` : ""}` : ""}
        maxWidth="max-w-xl"
        footer={
          <button type="button" onClick={() => setOpenId(null)} disabled={sending} className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl">
            Close
          </button>
        }
      >
        {enquiry && (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <label htmlFor="enq-status" className="text-xs font-semibold text-stone-700">Status</label>
              <select
                id="enq-status"
                value={enquiry.status}
                disabled={sending}
                onChange={(e) => save({ status: e.target.value })}
                className="px-3 py-1.5 text-xs rounded-xl border border-stone-300 bg-white"
              >
                {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
              <a href={`mailto:${enquiry.email}?subject=${encodeURIComponent(`Re: ${enquiry.subject}`)}`} className="ml-auto inline-flex items-center gap-1 text-xs font-semibold text-[#173D2A] hover:underline">
                <Mail className="w-3.5 h-3.5" /> Email them
              </a>
            </div>

            <Thread entries={entries} />

            <ReplyBox
              id="enq-reply"
              value={replyText}
              onChange={setReplyText}
              onSend={saveReply}
              sending={sending}
              error={error}
              label="Note your reply"
              help={
                enquiry.userId
                  ? "Saved on the enquiry and marks it Replied. This customer was signed in, so they can read your reply under My Account > Help & Support."
                  : "Saved on the enquiry and marks it Replied. This visitor was not signed in and can't see replies on the website: also send your answer by email or phone."
              }
            />
          </div>
        )}
      </AdminModal>
    </div>
  );
};
