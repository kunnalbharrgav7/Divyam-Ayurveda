import React, { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Sparkles, Search } from "lucide-react";
import { useAdmin } from "../../context/AdminContext";
import { AdminCard } from "../../components/admin/common/AdminCard";
import { AdminModal, ConfirmDialog } from "../../components/admin/common/AdminModal";
import { AdminImageUpload } from "../../components/admin/common/AdminImageUpload";

export const IngredientsAdminPage = () => {
  const {
    ingredients: herbs = [],
    addIngredient,
    updateIngredient,
    deleteIngredient,
    fetchAdminIngredients,
  } = useAdmin();

  // Load once on open (the context function is re-created on every update, so depending on it loops)
  useEffect(() => {
    fetchAdminIngredients?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [searchTerm, setSearchTerm] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedHerb, setSelectedHerb] = useState(null);
  const [herbToDelete, setHerbToDelete] = useState(null);

  const defaultForm = {
    name: "",
    sanskritName: "",
    botanicalName: "",
    dosha: "Tridoshic",
    partUsed: "Root Extract",
    benefits: "Deep vitality, natural stress relief, and cellular rejuvenation.",
    image: "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800&auto=format&fit=crop&q=80",
  };

  const [formData, setFormData] = useState(defaultForm);

  const handleOpenAdd = () => {
    setSelectedHerb(null);
    setFormData(defaultForm);
    setModalOpen(true);
  };

  const handleOpenEdit = (herb) => {
    setSelectedHerb(herb);
    setFormData({
      name: herb.name || "",
      sanskritName: herb.sanskritName || "",
      botanicalName: herb.botanicalName || "",
      dosha: herb.dosha || herb.doshaEffect || herb.doshaBalance || "Tridoshic",
      partUsed: herb.partUsed || "Leaves / Herb",
      benefits: Array.isArray(herb.benefits) ? herb.benefits.join(", ") : (herb.benefits || herb.traditionalUses || ""),
      image: herb.image || defaultForm.image,
    });
    setModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    if (selectedHerb) {
      await updateIngredient(selectedHerb.id || selectedHerb._id, formData);
    } else {
      await addIngredient(formData);
    }
    setModalOpen(false);
  };

  const handleDeleteConfirm = async () => {
    if (herbToDelete) {
      await deleteIngredient(herbToDelete);
      setHerbToDelete(null);
      setDeleteConfirmOpen(false);
    }
  };

  const filteredHerbs = herbs.filter(
    (h) =>
      h.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      h.botanicalName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      h.sanskritName?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 font-sans tracking-tight">
            Botanical Directory & Herb Profiles
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Maintain the Ayurvedic botanical library referenced across products, dosage, and education.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#173D2A] text-white hover:bg-[#0B2416] text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add Botanical Herb</span>
        </button>
      </div>

      {/* Search Input */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
        <input
          type="text"
          placeholder="Search by Common, Sanskrit, or Botanical name..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-stone-300 bg-white focus:ring-[#173D2A]"
        />
      </div>

      {/* Botanical Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredHerbs.map((herb) => (
          <div
            key={herb.id}
            className="bg-white rounded-2xl border border-stone-200 p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-sans font-bold text-base text-stone-900">
                    {herb.name}
                  </h3>
                  <div className="text-xs text-emerald-800 font-medium italic mt-0.5">
                    {herb.botanicalName}
                  </div>
                  {herb.sanskritName && (
                    <div className="text-[11px] text-stone-400">
                      Sanskrit: {herb.sanskritName}
                    </div>
                  )}
                </div>

                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200/80">
                  {herb.dosha || "Tridoshic"}
                </span>
              </div>

              <div className="mt-3 pt-3 border-t border-stone-100 text-xs text-stone-600 space-y-1">
                <div>
                  <span className="font-semibold text-stone-700">Part Used: </span>
                  <span>{herb.partUsed || "Root / Rhizome"}</span>
                </div>
                <p className="line-clamp-3 leading-relaxed mt-1 text-stone-600">
                  {Array.isArray(herb.benefits)
                    ? herb.benefits.join(" • ")
                    : herb.benefits || "Supports balance and natural vitality."}
                </p>
              </div>
            </div>

            <div className="pt-4 mt-4 border-t border-stone-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => handleOpenEdit(herb)}
                className="px-3 py-1.5 text-xs font-medium text-stone-600 hover:text-emerald-800 hover:bg-stone-50 rounded-lg transition-colors inline-flex items-center gap-1"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>Edit Herb</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setHerbToDelete(herb.id);
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

      {/* Add / Edit Herb Modal */}
      <AdminModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={selectedHerb ? `Edit: ${selectedHerb.name}` : "Add Botanical Herb"}
        subtitle="Catalog classical herbs with botanical classifications"
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
              {selectedHerb ? "Update Botanical" : "Save Botanical"}
            </button>
          </>
        }
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Common Name *
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="e.g. Ashwagandha"
                className="w-full px-3 py-2 text-sm rounded-xl border border-stone-300 bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Botanical Name
              </label>
              <input
                type="text"
                value={formData.botanicalName}
                onChange={(e) => setFormData({ ...formData, botanicalName: e.target.value })}
                placeholder="e.g. Withania somnifera"
                className="w-full px-3 py-2 text-sm rounded-xl border border-stone-300 bg-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Sanskrit / Classical Name
              </label>
              <input
                type="text"
                value={formData.sanskritName}
                onChange={(e) => setFormData({ ...formData, sanskritName: e.target.value })}
                placeholder="e.g. अश्वगंधा (Vajigandha)"
                className="w-full px-3 py-2 text-sm rounded-xl border border-stone-300 bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Dosha Association
              </label>
              <select
                value={formData.dosha}
                onChange={(e) => setFormData({ ...formData, dosha: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-xl border border-stone-300 bg-white text-stone-700"
              >
                <option value="Tridoshic">Tridoshic (Balances All 3)</option>
                <option value="Vata - Kapha">Vata & Kapha Pacifying</option>
                <option value="Pitta - Kapha">Pitta & Kapha Pacifying</option>
                <option value="Vata - Pitta">Vata & Pitta Pacifying</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Part Used
            </label>
            <input
              type="text"
              value={formData.partUsed}
              onChange={(e) => setFormData({ ...formData, partUsed: e.target.value })}
              placeholder="e.g. Dried Roots, Whole Aerial Herb, Fruit Pericarp"
              className="w-full px-3 py-2 text-sm rounded-xl border border-stone-300 bg-white"
            />
          </div>

          <AdminImageUpload
            label="Herb Photograph / Botanical Illustration"
            value={formData.image}
            onChange={(img) => setFormData({ ...formData, image: img })}
            helperText="Upload herb photo or classical botanical artwork (PNG, JPG, WEBP)"
          />

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Therapeutic Benefits & Indications
            </label>
            <textarea
              rows={3}
              value={formData.benefits}
              onChange={(e) => setFormData({ ...formData, benefits: e.target.value })}
              placeholder="Classical Ayurvedic actions and therapeutic indications..."
              className="w-full px-3 py-2 text-sm rounded-xl border border-stone-300 bg-white"
            />
          </div>
        </form>
      </AdminModal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Botanical Herb"
        message="Are you sure you want to delete this botanical herb from the directory?"
      />
    </div>
  );
};

