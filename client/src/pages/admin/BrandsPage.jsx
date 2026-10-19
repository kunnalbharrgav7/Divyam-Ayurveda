import React, { useState } from "react";
import { Plus, Edit, Trash2, Tag, CheckCircle } from "lucide-react";
import { useAdmin } from "../../context/AdminContext";
import { AdminCard } from "../../components/admin/common/AdminCard";
import { AdminModal, ConfirmDialog } from "../../components/admin/common/AdminModal";
import { AdminImageUpload } from "../../components/admin/common/AdminImageUpload";

export const BrandsPage = () => {
  const { brands, saveBrand, deleteBrand } = useAdmin();
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedBrand, setSelectedBrand] = useState(null);
  const [brandToDelete, setBrandToDelete] = useState(null);

  const defaultForm = {
    name: "",
    origin: "Haridwar, Uttarakhand, India",
    established: 1994,
    description: "",
    certified: true,
    logo: "",
  };

  const [formData, setFormData] = useState(defaultForm);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const handleOpenAdd = () => {
    setSelectedBrand(null);
    setFormData(defaultForm);
    setSaveError("");
    setModalOpen(true);
  };

  const handleOpenEdit = (b) => {
    setSelectedBrand(b);
    setFormData({
      name: b.name,
      origin: b.origin || "",
      established: b.established ?? "",
      description: b.description || "",
      certified: b.certified ?? true,
      logo: b.logo || "",
    });
    setSaveError("");
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name.trim() || saving) return;

    const payload = {
      ...formData,
      id: selectedBrand ? selectedBrand.id : "brand-" + Date.now(),
      established: formData.established === "" ? null : Number(formData.established),
    };

    setSaving(true);
    setSaveError("");
    try {
      await saveBrand(payload);
      setModalOpen(false);
    } catch (err) {
      setSaveError(err.message || "Failed to save brand.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!brandToDelete) return;
    try {
      await deleteBrand(brandToDelete);
    } catch (err) {
      window.alert(err.message || "Failed to delete brand.");
    }
    setBrandToDelete(null);
    setDeleteConfirmOpen(false);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 font-sans tracking-tight">
            Ayurvedic Brands & Formulations
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Manage manufacturer labels, origin authenticity, and quality certifications.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#173D2A] text-white hover:bg-[#0B2416] text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Brand</span>
        </button>
      </div>

      {/* Brands List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {brands.map((brand) => (
          <div
            key={brand.id}
            className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between">
                <div className="w-12 h-12 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center overflow-hidden">
                  {brand.logo ? (
                    <img src={brand.logo} alt={brand.name} className="w-full h-full object-contain p-1" />
                  ) : (
                    <span className="text-[#173D2A] font-bold text-lg">{brand.name.charAt(0)}</span>
                  )}
                </div>
                {brand.certified && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
                    <CheckCircle className="w-3 h-3" />
                    <span>AYUSH Certified</span>
                  </span>
                )}
              </div>

              <h3 className="font-sans font-bold text-base text-stone-900 mt-3">
                {brand.name}
              </h3>
              <p className="text-xs text-stone-500 mt-0.5">
                Origin: {brand.origin || "India"}
                {brand.established ? ` \u2022 Est. ${brand.established}` : ""}
              </p>

              <p className="text-xs text-stone-600 mt-3 leading-relaxed">
                {brand.description || "Authentic Ayurvedic manufacturer adhering to classical botanical extraction standards."}
              </p>
            </div>

            <div className="pt-4 mt-4 border-t border-stone-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => handleOpenEdit(brand)}
                className="px-3 py-1.5 text-xs font-medium text-stone-600 hover:text-emerald-800 hover:bg-stone-50 rounded-lg transition-colors inline-flex items-center gap-1"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>Edit</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setBrandToDelete(brand.id);
                  setDeleteConfirmOpen(true);
                }}
                className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Brand Modal */}
      <AdminModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={selectedBrand ? `Edit: ${selectedBrand.name}` : "Register New Brand"}
        subtitle="Specify botanical provenance and Ayurvedic certification"
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
              {saving ? "Saving..." : selectedBrand ? "Update Brand" : "Create Brand"}
            </button>
          </>
        }
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Brand / Manufacturer Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              placeholder="e.g. Divyam Pure Herbs"
              className="w-full px-3 py-2 text-sm rounded-xl border border-stone-300 bg-white"
            />
          </div>

          <AdminImageUpload
            label="Brand Logo / Insignia"
            value={formData.logo}
            onChange={(img) => setFormData({ ...formData, logo: img })}
            aspectRatio="square"
            helperText="Upload square brand emblem or logo (PNG, JPG, WEBP)"
          />

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Regional Origin
              </label>
              <input
                type="text"
                value={formData.origin}
                onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
                placeholder="e.g. Kerala, India"
                className="w-full px-3 py-2 text-sm rounded-xl border border-stone-300 bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Year Established
              </label>
              <input
                type="number"
                value={formData.established}
                onChange={(e) => setFormData({ ...formData, established: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-xl border border-stone-300 bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Brand Story / Description
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Heritage and classical manufacturing credentials..."
              className="w-full px-3 py-2 text-sm rounded-xl border border-stone-300 bg-white"
            />
          </div>

          <div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.certified}
                onChange={(e) => setFormData({ ...formData, certified: e.target.checked })}
                className="w-4 h-4 rounded border-stone-300 text-[#173D2A] focus:ring-[#173D2A]"
              />
              <span className="text-xs font-semibold text-stone-800">
                AYUSH / GMP Certified Facility
              </span>
            </label>
          </div>

          {saveError && (
            <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-xs text-rose-700">
              {saveError}
            </div>
          )}
        </form>
      </AdminModal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Brand"
        message="Are you sure you want to delete this brand?"
      />
    </div>
  );
};

