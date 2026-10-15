import React, { useState } from "react";
import { Mail, CheckCircle2, Clock, Trash2, Send } from "lucide-react";
import { useAdmin } from "../../context/AdminContext";
import { AdminCard } from "../../components/admin/common/AdminCard";
import { AdminTable } from "../../components/admin/common/AdminTable";
import { AdminModal } from "../../components/admin/common/AdminModal";
import { formatDate } from "../../utils/formatters";

export const EnquiriesPage = () => {
  const { enquiries, updateEnquiryStatus } = useAdmin();
  const [selectedEnquiry, setSelectedEnquiry] = useState(null);
  const [replyText, setReplyText] = useState("");
  const [replyModalOpen, setReplyModalOpen] = useState(false);

  const handleOpenReply = (enq) => {
    setSelectedEnquiry(enq);
    setReplyText(`Dear ${enq.name},\n\nThank you for reaching out to Divyam Ayurveda. Regarding your query about "${enq.subject || "our remedies"}":\n\n`);
    setReplyModalOpen(true);
  };

  const handleSendReply = (e) => {
    e.preventDefault();
    if (selectedEnquiry) {
      updateEnquiryStatus(selectedEnquiry.id, "Resolved");
      alert(`Reply email simulated sent to ${selectedEnquiry.email}!`);
      setReplyModalOpen(false);
    }
  };

  const columns = [
    {
      header: "Name & Contact",
      render: (row) => (
        <div>
          <div className="font-semibold text-stone-900">{row.name}</div>
          <div className="text-[11px] text-stone-500">
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
          <div className="font-semibold text-stone-800 text-xs mb-0.5">
            {row.subject}
          </div>
          <p className="text-xs text-stone-600 line-clamp-2">"{row.message}"</p>
        </div>
      ),
    },
    {
      header: "Received On",
      render: (row) => (
        <span className="text-xs text-stone-500">{formatDate(row.date)}</span>
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
          <Mail className="w-3.5 h-3.5" />
          <span>Reply</span>
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900 font-sans tracking-tight">
          Website Contact Form Enquiries
        </h1>
        <p className="text-xs sm:text-sm text-stone-500 mt-1">
          Messages sent via customer storefront contact page.
        </p>
      </div>

      <AdminCard noPadding={true}>
        <AdminTable
          columns={columns}
          data={enquiries}
          keyField="id"
          emptyMessage="No customer contact messages found."
        />
      </AdminCard>

      {/* Reply Modal */}
      {selectedEnquiry && (
        <AdminModal
          isOpen={replyModalOpen}
          onClose={() => setReplyModalOpen(false)}
          title={`Reply to ${selectedEnquiry.name}`}
          subtitle={`Replying to: ${selectedEnquiry.email}`}
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
                <span>Send Response Email</span>
              </button>
            </>
          }
        >
          <form onSubmit={handleSendReply} className="space-y-4">
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs text-stone-700">
              <span className="font-semibold text-stone-900 block mb-1">
                Customer Message:
              </span>
              "{selectedEnquiry.message}"
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Email Reply Content
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

