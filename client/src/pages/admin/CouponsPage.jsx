import React, { useState, useMemo } from "react";
import { Plus, Edit, Trash2, Ticket, Check, Copy, Search, Zap, Package } from "lucide-react";
import { useAdmin } from "../../context/AdminContext";
import { AdminModal, ConfirmDialog } from "../../components/admin/common/AdminModal";
import { formatCurrency, formatDate } from "../../utils/formatters";

const OCCASIONS = [
  "Diwali",
  "Dussehra",
  "Navratri",
  "Holi",
  "Raksha Bandhan",
  "Independence Day",
  "Summer",
  "Monsoon",
  "Winter",
  "New Year",
];

// YYYY-MM-DD in Indian time, which is how offer dates are stored (start/end of day IST)
const toDateInput = (value) =>
  value ? new Date(value).toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" }) : "";

const todayInput = () => toDateInput(new Date());

const productName = (p) => p.title || p.name || "Untitled product";
const productImage = (p) => p.image || (Array.isArray(p.images) ? p.images[0] : "") || "";

export const CouponsPage = () => {
  const { coupons, products, saveCoupon, deleteCoupon } = useAdmin();
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedCoupon, setSelectedCoupon] = useState(null);
  const [couponToDelete, setCouponToDelete] = useState(null);
  const [copiedCode, setCopiedCode] = useState("");
  const [productSearch, setProductSearch] = useState("");

  const defaultForm = {
    title: "",
    occasion: "",
    autoApply: false, // false = customers type a code, true = applied automatically
    code: "",
    description: "",
    type: "percentage", // "percentage" | "fixed_amount"
    discountValue: 10,
    minOrderValue: 0,
    maxDiscount: 0, // 0 = no cap
    appliesTo: "all", // "all" | "products"
    applicableProducts: [],
    validFrom: todayInput(),
    validUntil: "", // empty = never expires
    usageLimitTotal: "", // empty = unlimited
    usageLimitPerUser: 1, // 0 = unlimited
    isActive: true,
    isPublic: true,
  };

  const [formData, setFormData] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const set = (patch) => setFormData((prev) => ({ ...prev, ...patch }));

  const handleOpenAdd = () => {
    setSelectedCoupon(null);
    setFormData({ ...defaultForm, validFrom: todayInput() });
    setProductSearch("");
    setSaveError("");
    setModalOpen(true);
  };

  const handleOpenEdit = (c) => {
    setSelectedCoupon(c);
    setFormData({
      title: c.title || "",
      occasion: c.occasion || "",
      autoApply: Boolean(c.autoApply),
      code: c.autoApply ? "" : c.code,
      description: c.description || "",
      type: c.type || "percentage",
      discountValue: c.discountValue ?? 10,
      minOrderValue: c.minOrderValue ?? c.minOrder ?? 0,
      maxDiscount: c.maxDiscount ?? 0,
      appliesTo: c.appliesTo || "all",
      applicableProducts: (c.applicableProducts || []).map(String),
      validFrom: toDateInput(c.validFrom) || todayInput(),
      validUntil: toDateInput(c.validUntil),
      usageLimitTotal: c.usageLimitTotal ?? "",
      usageLimitPerUser: c.usageLimitPerUser ?? 0,
      isActive: c.isActive ?? true,
      isPublic: c.isPublic ?? true,
    });
    setProductSearch("");
    setSaveError("");
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (saving) return;

    if (formData.autoApply ? !formData.title.trim() : !formData.code.trim()) {
      setSaveError(formData.autoApply ? "Give this auto-applied offer a name." : "Enter a coupon code.");
      return;
    }
    if (formData.appliesTo === "products" && formData.applicableProducts.length === 0) {
      setSaveError('Select at least one product, or choose "All products".');
      return;
    }

    const payload = {
      id: selectedCoupon ? selectedCoupon.id : "coup-" + Date.now(),
      title: formData.title.trim(),
      occasion: formData.occasion.trim(),
      description: formData.description.trim(),
      autoApply: formData.autoApply,
      // Auto-applied offers have no customer-facing code (the server generates an internal one)
      ...(formData.autoApply ? {} : { code: formData.code.toUpperCase().trim() }),
      type: formData.type,
      discountValue: Number(formData.discountValue),
      minOrderValue: Number(formData.minOrderValue) || 0,
      maxDiscount: Number(formData.maxDiscount) || 0,
      appliesTo: formData.appliesTo,
      applicableProducts: formData.appliesTo === "products" ? formData.applicableProducts : [],
      validFrom: formData.validFrom,
      validUntil: formData.validUntil,
      usageLimitTotal: formData.usageLimitTotal === "" ? 0 : Number(formData.usageLimitTotal),
      ...(formData.autoApply ? {} : { usageLimitPerUser: Number(formData.usageLimitPerUser) || 0 }),
      isActive: formData.isActive,
      isPublic: formData.isPublic,
    };

    setSaving(true);
    setSaveError("");
    try {
      await saveCoupon(payload);
      setModalOpen(false);
    } catch (err) {
      setSaveError(err.message || "Failed to save coupon.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!couponToDelete) return;
    try {
      await deleteCoupon(couponToDelete);
    } catch (err) {
      window.alert(err.message || "Failed to delete coupon.");
    }
    setCouponToDelete(null);
    setDeleteConfirmOpen(false);
  };

  const handleToggleActive = async (c) => {
    try {
      await saveCoupon({ id: c.id, isActive: !c.isActive });
    } catch (err) {
      window.alert(err.message || "Failed to update coupon.");
    }
  };

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(""), 2000);
  };

  // ---- product picker ----
  const visibleProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    return (products || []).filter(
      (p) => !q || productName(p).toLowerCase().includes(q) || (p.sku || "").toLowerCase().includes(q)
    );
  }, [products, productSearch]);

  const toggleProduct = (id) =>
    set({
      applicableProducts: formData.applicableProducts.includes(id)
        ? formData.applicableProducts.filter((x) => x !== id)
        : [...formData.applicableProducts, id],
    });

  const selectAllShown = () =>
    set({ applicableProducts: [...new Set([...formData.applicableProducts, ...visibleProducts.map((p) => p.id)])] });

  const appliesToLabel = (c) =>
    c.appliesTo === "products"
      ? `${(c.applicableProducts || []).length} selected product${(c.applicableProducts || []).length === 1 ? "" : "s"}`
      : "All products";

  const windowLabel = (c) => {
    const from = c.validFrom ? formatDate(c.validFrom) : null;
    const to = c.validUntil ? formatDate(c.validUntil) : null;
    if (from && to) return `${from} → ${to}`;
    if (to) return `Until ${to}`;
    return "No expiry date";
  };

  const sectionTitle = "text-[11px] font-bold uppercase tracking-wider text-stone-500";
  const inputClass = "w-full px-3 py-2 text-sm rounded-xl border border-stone-300 bg-white";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 font-sans tracking-tight">
            Discount Coupons & Promotional Offers
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Create coupon codes or automatic seasonal / festive offers for all products or a chosen set.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#173D2A] text-white hover:bg-[#0B2416] text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Create Offer</span>
        </button>
      </div>

      {coupons.length === 0 && (
        <div className="p-10 rounded-2xl border border-dashed border-stone-300 bg-white text-center text-sm text-stone-500">
          <Ticket className="w-8 h-8 mx-auto mb-2 text-stone-300" />
          No offers yet. Create a coupon code, or an automatic festive offer.
        </div>
      )}

      {/* Offers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {coupons.map((coupon) => (
          <div
            key={coupon.id}
            className={`bg-white rounded-2xl border p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between ${
              coupon.isActive ? "border-stone-200" : "border-stone-200 opacity-60"
            }`}
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  {coupon.title && <h3 className="font-bold text-sm text-stone-900 truncate">{coupon.title}</h3>}
                  <div className="flex items-center gap-2 mt-1 flex-wrap">
                    {coupon.autoApply ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg bg-amber-100 text-amber-800 border border-amber-200">
                        <Zap className="w-3 h-3" /> AUTO-APPLIED
                      </span>
                    ) : (
                      <>
                        <span className="font-mono font-bold text-sm px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-900 border border-emerald-200 tracking-wider">
                          {coupon.code}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleCopyCode(coupon.code)}
                          className="p-1 text-stone-400 hover:text-stone-700 rounded transition-colors"
                          title="Copy promo code"
                        >
                          {copiedCode === coupon.code ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </>
                    )}
                    {coupon.occasion && (
                      <span className="text-[10px] font-semibold px-2 py-1 rounded-full bg-violet-100 text-violet-800">
                        {coupon.occasion}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => handleToggleActive(coupon)}
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${
                    coupon.isActive ? "bg-emerald-100 text-emerald-800" : "bg-stone-200 text-stone-600"
                  }`}
                >
                  {coupon.isActive ? "Active" : "Inactive"}
                </button>
              </div>

              <div className="mt-4 space-y-1">
                <div className="text-xl font-bold font-sans text-stone-900">
                  {coupon.type === "percentage" ? `${coupon.discountValue}% OFF` : `₹${coupon.discountValue} FLAT OFF`}
                </div>
                <div className="text-xs text-stone-500 flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5" />
                  <span className="font-semibold text-stone-700">{appliesToLabel(coupon)}</span>
                </div>
                <div className="text-xs text-stone-500">
                  Min. Order Value:{" "}
                  <span className="font-semibold text-stone-700">{formatCurrency(coupon.minOrderValue || 0)}</span>
                </div>
                {coupon.maxDiscount > 0 && (
                  <div className="text-xs text-stone-500">Max Discount Cap: {formatCurrency(coupon.maxDiscount)}</div>
                )}
                <div className="text-xs text-stone-400 pt-1">
                  {windowLabel(coupon)}
                  {coupon.isPublic === false && " • Hidden from Offers page"}
                </div>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
              <span>
                {coupon.usageCount ?? coupon.usedCount ?? 0}
                {coupon.usageLimitTotal ? ` / ${coupon.usageLimitTotal}` : ""} times applied
              </span>
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

      {/* Create / Edit Offer Modal */}
      <AdminModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        maxWidth="max-w-3xl"
        title={selectedCoupon ? `Edit Offer: ${selectedCoupon.title || selectedCoupon.code}` : "Create Offer"}
        subtitle="Choose how customers get it, what it discounts, and when it runs"
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
              disabled={saving}
              className="px-4 py-2 text-xs font-semibold bg-[#173D2A] text-white hover:bg-[#0B2416] rounded-xl shadow-xs disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {saving ? "Saving..." : selectedCoupon ? "Update Offer" : "Create Offer"}
            </button>
          </>
        }
      >
        <form onSubmit={handleSave} className="space-y-6">
          {/* 1. Name & occasion */}
          <section className="space-y-3">
            <h4 className={sectionTitle}>1. Offer name & occasion</h4>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Offer Name {formData.autoApply && "*"}
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => set({ title: e.target.value })}
                placeholder="e.g. Diwali Festive Sale"
                className={inputClass}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1.5">Season / Festival (optional)</label>
              <div className="flex flex-wrap gap-1.5">
                {OCCASIONS.map((o) => (
                  <button
                    key={o}
                    type="button"
                    onClick={() =>
                      set({
                        occasion: formData.occasion === o ? "" : o,
                        title: formData.title || `${o} Special`,
                      })
                    }
                    className={`px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-colors ${
                      formData.occasion === o
                        ? "bg-violet-600 text-white border-violet-600"
                        : "bg-white text-stone-600 border-stone-300 hover:border-violet-400"
                    }`}
                  >
                    {o}
                  </button>
                ))}
                <input
                  type="text"
                  value={OCCASIONS.includes(formData.occasion) ? "" : formData.occasion}
                  onChange={(e) => set({ occasion: e.target.value })}
                  placeholder="Other occasion..."
                  className="px-2.5 py-1 rounded-full text-[11px] border border-stone-300 bg-white w-32"
                />
              </div>
            </div>
          </section>

          {/* 2. How customers get it */}
          <section className="space-y-3">
            <h4 className={sectionTitle}>2. How customers get it</h4>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => set({ autoApply: false })}
                className={`p-3 rounded-xl border text-left transition-colors ${
                  !formData.autoApply
                    ? "border-[#173D2A] bg-emerald-50 ring-1 ring-[#173D2A]"
                    : "border-stone-300 bg-white hover:bg-stone-50"
                }`}
              >
                <div className="flex items-center gap-1.5 text-sm font-bold text-stone-900">
                  <Ticket className="w-4 h-4" /> Coupon code
                </div>
                <p className="text-[11px] text-stone-500 mt-0.5">Customers type a code at checkout.</p>
              </button>
              <button
                type="button"
                onClick={() => set({ autoApply: true })}
                className={`p-3 rounded-xl border text-left transition-colors ${
                  formData.autoApply
                    ? "border-amber-500 bg-amber-50 ring-1 ring-amber-500"
                    : "border-stone-300 bg-white hover:bg-stone-50"
                }`}
              >
                <div className="flex items-center gap-1.5 text-sm font-bold text-stone-900">
                  <Zap className="w-4 h-4" /> Auto-applied
                </div>
                <p className="text-[11px] text-stone-500 mt-0.5">Applied automatically to eligible carts. No code needed.</p>
              </button>
            </div>

            {!formData.autoApply && (
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Coupon Code *</label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => set({ code: e.target.value.toUpperCase() })}
                  placeholder="e.g. DIWALI25"
                  className={`${inputClass} font-mono uppercase`}
                />
              </div>
            )}
          </section>

          {/* 3. Discount */}
          <section className="space-y-3">
            <h4 className={sectionTitle}>3. Discount</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Type</label>
                <select
                  value={formData.type}
                  onChange={(e) => set({ type: e.target.value })}
                  className={`${inputClass} text-stone-700`}
                >
                  <option value="percentage">Percentage (%)</option>
                  <option value="fixed_amount">Fixed Amount (₹)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Value {formData.type === "percentage" ? "(%)" : "(₹)"} *
                </label>
                <input
                  type="number"
                  min="1"
                  max={formData.type === "percentage" ? 100 : undefined}
                  value={formData.discountValue}
                  onChange={(e) => set({ discountValue: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Min Spend (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.minOrderValue}
                  onChange={(e) => set({ minOrderValue: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Max Cap (₹)</label>
                <input
                  type="number"
                  min="0"
                  disabled={formData.type !== "percentage"}
                  value={formData.maxDiscount}
                  onChange={(e) => set({ maxDiscount: e.target.value })}
                  className={`${inputClass} disabled:bg-stone-100 disabled:text-stone-400`}
                />
              </div>
            </div>
          </section>

          {/* 4. Applies to */}
          <section className="space-y-3">
            <h4 className={sectionTitle}>4. Applies to</h4>
            <div className="flex gap-4">
              {[
                ["all", "All products"],
                ["products", "Selected products"],
              ].map(([value, label]) => (
                <label key={value} className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-stone-800">
                  <input
                    type="radio"
                    name="appliesTo"
                    checked={formData.appliesTo === value}
                    onChange={() => set({ appliesTo: value })}
                    className="w-4 h-4 text-[#173D2A] focus:ring-[#173D2A]"
                  />
                  {label}
                </label>
              ))}
            </div>
            <p className="text-[11px] text-stone-500">
              {formData.appliesTo === "all"
                ? "The discount applies to everything in the customer's cart."
                : "The discount applies only to the products you pick below; other items in the cart are not discounted."}
            </p>

            {formData.appliesTo === "products" && (
              <div className="rounded-xl border border-stone-300 overflow-hidden">
                <div className="flex items-center gap-2 p-2.5 bg-stone-50 border-b border-stone-200">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-stone-400" />
                    <input
                      type="text"
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      placeholder="Search products by name or SKU..."
                      className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-stone-300 bg-white"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={selectAllShown}
                    className="px-2.5 py-1.5 text-[11px] font-semibold text-emerald-800 hover:bg-emerald-50 rounded-lg"
                  >
                    Select all shown
                  </button>
                  <button
                    type="button"
                    onClick={() => set({ applicableProducts: [] })}
                    className="px-2.5 py-1.5 text-[11px] font-semibold text-stone-500 hover:bg-stone-100 rounded-lg"
                  >
                    Clear
                  </button>
                  <span className="text-[11px] font-bold text-stone-700 whitespace-nowrap">
                    {formData.applicableProducts.length} selected
                  </span>
                </div>
                <div className="max-h-56 overflow-y-auto divide-y divide-stone-100">
                  {visibleProducts.length === 0 && (
                    <p className="p-4 text-center text-xs text-stone-400">No products match your search.</p>
                  )}
                  {visibleProducts.map((p) => {
                    const checked = formData.applicableProducts.includes(p.id);
                    return (
                      <label
                        key={p.id}
                        className={`flex items-center gap-3 px-3 py-2 cursor-pointer hover:bg-stone-50 ${
                          checked ? "bg-emerald-50/50" : ""
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={() => toggleProduct(p.id)}
                          className="w-4 h-4 rounded border-stone-300 text-[#173D2A] focus:ring-[#173D2A]"
                        />
                        {productImage(p) && (
                          <img src={productImage(p)} alt="" className="w-8 h-8 rounded-md object-cover border border-stone-200" />
                        )}
                        <span className="flex-1 min-w-0">
                          <span className="block text-xs font-semibold text-stone-900 truncate">{productName(p)}</span>
                          <span className="block text-[10px] text-stone-400">{p.category || p.categoryId}</span>
                        </span>
                        <span className="text-xs font-semibold text-stone-600">{formatCurrency(p.price || 0)}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}
          </section>

          {/* 5. Schedule & limits */}
          <section className="space-y-3">
            <h4 className={sectionTitle}>5. Schedule & limits</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Starts</label>
                <input
                  type="date"
                  value={formData.validFrom}
                  onChange={(e) => set({ validFrom: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Ends (blank = never)</label>
                <input
                  type="date"
                  value={formData.validUntil}
                  min={formData.validFrom || undefined}
                  onChange={(e) => set({ validUntil: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">Total uses (blank = ∞)</label>
                <input
                  type="number"
                  min="0"
                  value={formData.usageLimitTotal}
                  onChange={(e) => set({ usageLimitTotal: e.target.value })}
                  className={inputClass}
                />
              </div>
              {!formData.autoApply && (
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">Uses per customer (0 = ∞)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.usageLimitPerUser}
                    onChange={(e) => set({ usageLimitPerUser: e.target.value })}
                    className={inputClass}
                  />
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-2 pt-1">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isActive}
                  onChange={(e) => set({ isActive: e.target.checked })}
                  className="w-4 h-4 rounded border-stone-300 text-[#173D2A] focus:ring-[#173D2A]"
                />
                <span className="text-xs font-semibold text-stone-700">Active</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.isPublic}
                  onChange={(e) => set({ isPublic: e.target.checked })}
                  className="w-4 h-4 rounded border-stone-300 text-[#173D2A] focus:ring-[#173D2A]"
                />
                <span className="text-xs font-semibold text-stone-700">Show on the public Offers page</span>
              </label>
            </div>
          </section>

          {saveError && (
            <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-xs text-rose-700">{saveError}</div>
          )}
        </form>
      </AdminModal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Offer"
        message="Are you sure you want to delete this offer? Customers will no longer be able to use it."
      />
    </div>
  );
};
