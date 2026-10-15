import React, { useState } from "react";
import { Plus, Edit, Trash2, Ticket, Check, Copy } from "lucide-react";
import { useAdmin } from "../../context/AdminContext";
import { AdminCard } from "../../components/admin/common/AdminCard";
import { AdminModal, ConfirmDialog } from "../../components/admin/common/AdminModal";
import { formatCurrency, formatDate } from "../../utils/formatters";

export const CouponsPage = () => {
  const { coupons, saveCoupon, deleteCoupon } = useAdmin();
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState(null);
  const [couponToDelete, setCouponToDelete] = useState(null);
  const [copiedCode, setCopiedCode] = useState("");

  const defaultForm = {
    code: "",
    type: "percentage", // "percentage" | "fixed"
    discountValue: 15,
    minOrderValue: 999,
    maxDiscount: 300,
    validUntil: "2026-12-31",
    usageCount: 0,
    isActive: true,
  };

  const [formData, setFormData] = useState(defaultForm);

  const handleOpenAdd = () => {
    setSelectedCoupon(null);
    setFormData(defaultForm);
    setModalOpen(true);
  };

  const handleOpenEdit = (c) => {
    setSelectedCoupon(c);
    setFormData({
      code: c.code,
      type: c.type || "percentage",
      discountValue: c.discountValue || 10,
      minOrderValue: c.minOrderValue || 0,
      maxDiscount: c.maxDiscount || 500,
      validUntil: c.validUntil || "2026-12-31",
      usageCount: c.usageCount || 0,
      isActive: c.isActive ?? true,
    });
    setModalOpen(true);
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!formData.code.trim()) return;

    const payload = {
      ...formData,
      id: selectedCoupon ? selectedCoupon.id : "coup-" + Date.now(),
      code: formData.code.toUpperCase().trim(),
      discountValue: Number(formData.discountValue),
      minOrderValue: Number(formData.minOrderValue),
      maxDiscount: Number(formData.maxDiscount),
    };

    saveCoupon(payload);
    setModalOpen(false);
  };

  const handleDeleteConfirm = () => {
    if (couponToDelete) {
      deleteCoupon(couponToDelete);
      setCouponToDelete(null);
      setDeleteConfirmOpen(false);
    }
  };

  const handleToggleActive = (c) => {
    saveCoupon({
      ...c,
      isActive: !c.isActive,
    });
  };

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(""), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 font-sans tracking-tight">
            Discount Coupons & Promotional Offers
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Create promotional coupon codes redeemable at checkout by customers.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#173D2A] text-white hover:bg-[#0B2416] text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Create Coupon Code</span>
        </button>
      </div>

      {/* Coupons Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {coupons.map((coupon) => (
          <div
            key={coupon.id}
            className={`bg-white rounded-2xl border p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between ${
              coupon.isActive ? "border-stone-200" : "border-stone-200 opacity-60"
            }`}
          >
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-base px-3 py-1 rounded-lg bg-emerald-50 text-emerald-900 border border-emerald-200 tracking-wider">
                    {coupon.code}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyCode(coupon.code)}
                    className="p-1.5 text-stone-400 hover:text-stone-700 rounded transition-colors"
                    title="Copy promo code"
                  >
                    {copiedCode === coupon.code ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => handleToggleActive(coupon)}
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    coupon.isActive
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-stone-200 text-stone-600"
                  }`}
                >
                  {coupon.isActive ? "Active" : "Inactive"}
                </button>
              </div>

              <div className="mt-4 space-y-1">
                <div className="text-xl font-bold font-sans text-stone-900">
                  {coupon.type === "percentage"
                    ? `${coupon.discountValue}% OFF`
                    : `₹${coupon.discountValue} FLAT OFF`}
                </div>
                <div className="text-xs text-stone-500">
                  Min. Order Value:{" "}
                  <span className="font-semibold text-stone-700">
                    {formatCurrency(coupon.minOrderValue || 0)}
                  </span>
                </div>
                {coupon.maxDiscount > 0 && (
                  <div className="text-xs text-stone-500">
                    Max Discount Cap: {formatCurrency(coupon.maxDiscount)}
                  </div>
                )}
                <div className="text-xs text-stone-400 pt-1">
                  Valid until: {formatDate(coupon.validUntil)}
                </div>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
              <span>{coupon.usageCount || 0} times applied</span>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleOpenEdit(coupon)}
                  className="p-1.5 text-stone-400 hover:text-emerald-800 rounded transition-colors"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCouponToDelete(coupon.id);
                    setDeleteConfirmOpen(true);
                  }}
                  className="p-1.5 text-stone-400 hover:text-rose-600 rounded transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Coupon Modal */}
      <AdminModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={selectedCoupon ? `Edit Coupon: ${selectedCoupon.code}` : "Create Promotional Coupon"}
        subtitle="Configure discount rates, min spending limits, and expiration"
        footer={
          <>
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="px-4 py-2 text-xs font-semibold bg-[#173D2A] text-white hover:bg-[#0B2416] rounded-xl shadow-xs"
            >
              {selectedCoupon ? "Update Coupon" : "Create Coupon"}
            </button>
          </>
        }
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Coupon Code *
              </label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) =>
                  setFormData({ ...formData, code: e.target.value.toUpperCase() })
                }
                required
                placeholder="e.g. DIWALI25"
                className="w-full px-3 py-2 text-sm rounded-xl border border-stone-300 bg-white font-mono uppercase"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Discount Type
              </label>
              <select
                value={formData.type}
                onChange={(e) =>
                  setFormData({ ...formData, type: e.target.value })
                }
                className="w-full px-3 py-2 text-sm rounded-xl border border-stone-300 bg-white text-stone-700"
              >
                <option value="percentage">Percentage (%)</option>
                <option value="fixed">Fixed Amount (₹)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Discount Value *
              </label>
              <input
                type="number"
                min="1"
                value={formData.discountValue}
                onChange={(e) =>
                  setFormData({ ...formData, discountValue: e.target.value })
                }
                required
                className="w-full px-3 py-2 text-sm rounded-xl border border-stone-300 bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Min Order (₹)
              </label>
              <input
                type="number"
                min="0"
                value={formData.minOrderValue}
                onChange={(e) =>
                  setFormData({ ...formData, minOrderValue: e.target.value })
                }
                className="w-full px-3 py-2 text-sm rounded-xl border border-stone-300 bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Max Cap (₹)
              </label>
              <input
                type="number"
                min="0"
                value={formData.maxDiscount}
                onChange={(e) =>
                  setFormData({ ...formData, maxDiscount: e.target.value })
                }
                className="w-full px-3 py-2 text-sm rounded-xl border border-stone-300 bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Valid Until
              </label>
              <input
                type="date"
                value={formData.validUntil}
                onChange={(e) =>
                  setFormData({ ...formData, validUntil: e.target.value })
                }
                className="w-full px-3 py-2 text-sm rounded-xl border border-stone-300 bg-white"
              />
            </div>
            <div className="flex items-center pt-5">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) =>
                    setFormData({ ...formData, isActive: e.target.checked })
                  }
                  className="w-4 h-4 rounded border-stone-300 text-[#173D2A] focus:ring-[#173D2A]"
                />
                <span className="text-xs font-semibold text-stone-700">
                  Active immediately
                </span>
              </label>
            </div>
          </div>
        </form>
      </AdminModal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Coupon"
        message="Are you sure you want to delete this promotional coupon code?"
      />
    </div>
  );
};

