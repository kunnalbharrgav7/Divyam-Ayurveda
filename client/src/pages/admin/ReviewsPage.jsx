import React, { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Star,
  CheckCircle2,
  XCircle,
  Trash2,
  Search,
  Filter,
  Eye,
} from "lucide-react";
import { useAdmin } from "../../context/AdminContext";
import { AdminCard } from "../../components/admin/common/AdminCard";
import { AdminTable } from "../../components/admin/common/AdminTable";
import { ConfirmDialog } from "../../components/admin/common/AdminModal";
import { formatDate } from "../../utils/formatters";

export const ReviewsPage = () => {
  const { reviews, moderateReview, deleteReview, fetchAdminReviews } = useAdmin();

  // New customer reviews arrive at any time: load the latest list once when the page opens
  useEffect(() => {
    fetchAdminReviews?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [ratingFilter, setRatingFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState([]);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [reviewToDelete, setReviewToDelete] = useState(null);

  const filteredReviews = useMemo(() => {
    return (reviews || []).filter((r) => {
      if (!r) return false;
      const userName = (r.userName || r.customerName || r.author || "Customer").toLowerCase();
      const productTitle = (r.productTitle || r.productName || r.product || "").toLowerCase();
      const comment = (r.comment || r.content || r.review || "").toLowerCase();
      const title = (r.title || "").toLowerCase();
      const term = (searchTerm || "").toLowerCase().trim();

      const matchSearch =
        !term ||
        userName.includes(term) ||
        productTitle.includes(term) ||
        comment.includes(term) ||
        title.includes(term);

      const matchStatus =
        statusFilter === "all" ||
        (r.status || "").toLowerCase() === statusFilter.toLowerCase();
      const matchRating =
        ratingFilter === "all" || Number(r.rating) === Number(ratingFilter);

      return matchSearch && matchStatus && matchRating;
    });
  }, [reviews, searchTerm, statusFilter, ratingFilter]);

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedIds(filteredReviews.map((r) => r.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id, checked) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((i) => i !== id));
    }
  };

  const handleBulkModerate = (status) => {
    selectedIds.forEach((id) => moderateReview(id, status));
    setSelectedIds([]);
  };

  const handleDeleteConfirm = () => {
    if (reviewToDelete) {
      deleteReview(reviewToDelete);
      setReviewToDelete(null);
      setDeleteConfirmOpen(false);
    }
  };

  const columns = [
    {
      header: "Product & Customer",
      cellClassName: "min-w-[220px]",
      render: (row) => (
        <div>
          <div className="font-semibold text-stone-900 line-clamp-1">
            {row.productTitle || row.productName || "Ayurvedic Product"}
          </div>
          <div className="text-xs text-stone-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
            <span>By <span className="font-medium text-stone-800">{row.userName || row.customerName || "Customer"}</span></span>
            {row.verifiedPurchase && (
              <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 text-[10px] font-semibold">
                ✓ Verified Buyer
              </span>
            )}
            <span>• {formatDate(row.date)}</span>
          </div>
        </div>
      ),
    },
    {
      header: "Rating",
      render: (row) => (
        <div className="flex items-center gap-1">
          <div className="flex text-amber-400 text-xs">
            {"★".repeat(Math.max(1, Math.min(5, Number(row.rating) || 5)))}
          </div>
          <span className="text-xs font-bold text-stone-700 ml-1">
            {row.rating || 5}.0
          </span>
        </div>
      ),
    },
    {
      header: "Review Feedback",
      cellClassName: "max-w-md",
      render: (row) => (
        <div>
          {row.title && (
            <div className="font-semibold text-stone-900 text-xs mb-0.5">
              {row.title}
            </div>
          )}
          <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed">
            "{row.comment || row.content || "Customer did not provide written remarks."}"
          </p>
        </div>
      ),
    },
    {
      header: "Status",
      render: (row) => (
        <span
          className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${
            row.status === "Approved"
              ? "bg-emerald-100 text-emerald-800"
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
      header: "Moderation Actions",
      align: "right",
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          {row.status !== "Approved" && (
            <button
              type="button"
              onClick={() => moderateReview(row.id, "Approved")}
              className="p-1.5 text-stone-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors"
              title="Approve review for public storefront"
            >
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            </button>
          )}

          {row.status !== "Rejected" && (
            <button
              type="button"
              onClick={() => moderateReview(row.id, "Rejected")}
              className="p-1.5 text-stone-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors"
              title="Reject review"
            >
              <XCircle className="w-4 h-4 text-rose-500" />
            </button>
          )}

          <button
            type="button"
            onClick={() => {
              setReviewToDelete(row.id);
              setDeleteConfirmOpen(true);
            }}
            className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-stone-100 rounded-lg transition-colors"
            title="Delete review"
          >
            <Trash2 className="w-4 h-4" />
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
          Customer Product Reviews Moderation
        </h1>
        <p className="text-xs sm:text-sm text-stone-500 mt-1">
          Review authentic user feedback, approve testimonials, and maintain community trust.
        </p>
      </div>

      <AdminCard noPadding={true}>
        <div className="p-4 border-b border-stone-100 flex flex-wrap items-center justify-between gap-3 bg-stone-50/50">
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              type="text"
              placeholder="Search by reviewer, product, or review text..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-stone-300 bg-white focus:ring-[#173D2A]"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-stone-300 bg-white text-stone-700"
            >
              <option value="all">All Moderation Statuses</option>
              <option value="Pending">Pending Moderation</option>
              <option value="Approved">Approved (Public)</option>
              <option value="Rejected">Rejected</option>
            </select>

            <select
              value={ratingFilter}
              onChange={(e) => setRatingFilter(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-stone-300 bg-white text-stone-700"
            >
              <option value="all">All Star Ratings</option>
              <option value="5">5 Stars</option>
              <option value="4">4 Stars</option>
              <option value="3">3 Stars</option>
              <option value="2">2 Stars</option>
              <option value="1">1 Star</option>
            </select>
          </div>
        </div>

        {/* Bulk Action Bar */}
        {selectedIds.length > 0 && (
          <div className="bg-emerald-50 px-4 py-2.5 flex items-center justify-between border-b border-emerald-100 text-xs">
            <span className="font-semibold text-emerald-900">
              {selectedIds.length} review(s) selected
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleBulkModerate("Approved")}
                className="px-3 py-1 bg-[#173D2A] text-white rounded-lg font-semibold hover:bg-[#0B2416] transition-colors"
              >
                Approve Selected
              </button>
              <button
                type="button"
                onClick={() => handleBulkModerate("Rejected")}
                className="px-3 py-1 bg-rose-600 text-white rounded-lg font-semibold hover:bg-rose-700 transition-colors"
              >
                Reject Selected
              </button>
            </div>
          </div>
        )}

        <AdminTable
          columns={columns}
          data={filteredReviews}
          keyField="id"
          selectable={true}
          selectedIds={selectedIds}
          onSelectAll={handleSelectAll}
          onSelectRow={handleSelectRow}
          emptyMessage="No customer reviews found matching your criteria."
        />
      </AdminCard>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Review"
        message="Are you sure you want to permanently delete this customer review?"
      />
    </div>
  );
};

