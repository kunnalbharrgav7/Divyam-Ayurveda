import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Edit, Trash2, FolderTree, Package, ExternalLink } from "lucide-react";
import { useAdmin } from "../../context/AdminContext";
import { AdminCard } from "../../components/admin/common/AdminCard";
import { AdminModal, ConfirmDialog } from "../../components/admin/common/AdminModal";
import { AdminImageUpload } from "../../components/admin/common/AdminImageUpload";

export const CategoriesPage = () => {
  const { categories, products, saveCategory, deleteCategory } = useAdmin();
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [categoryToDelete, setCategoryToDelete] = useState(null);

  const [newSubName, setNewSubName] = useState("");
  const [newSubDesc, setNewSubDesc] = useState("");
  const [activeTab, setActiveTab] = useState("general"); // "general" | "subcategories"

  const AYURVEDIC_SUGGESTIONS = [
    "Classical Churnas",
    "Herbal Tailams",
    "Daily Rasayanas",
    "Single Extracts",
    "Swara Juices",
    "Digestive Vati",
    "Organic Infusions",
    "Face & Skin Serums",
    "Detox Formulations",
  ];

  const defaultCategoryForm = {
    name: "",
    slug: "",
    description: "",
    image: "/images/ProductImages/Ashuwaganda.png",
    order: 1,
    featured: true,
    subcategories: [],
  };

  const [formData, setFormData] = useState(defaultCategoryForm);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const handleOpenAdd = () => {
    setSelectedCategory(null);
    setNewSubName("");
    setNewSubDesc("");
    setActiveTab("general");
    setSaveError("");
    setFormData({
      ...defaultCategoryForm,
      order: categories.length + 1,
      subcategories: [],
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (cat, initialTab = "general") => {
    setSelectedCategory(cat);
    setNewSubName("");
    setNewSubDesc("");
    setActiveTab(initialTab);
    setSaveError("");
    setFormData({
      name: cat.name,
      slug: cat.slug,
      description: cat.description || "",
      image: cat.image || "",
      order: cat.displayOrder ?? cat.order ?? 1,
      featured: cat.isFeatured ?? cat.featured ?? true,
      subcategories: Array.isArray(cat.subcategories) ? [...cat.subcategories] : [],
    });
    setModalOpen(true);
  };

  const handleAddSubcategory = () => {
    if (!newSubName.trim()) return;
    const name = newSubName.trim();
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");

    const exists = (formData.subcategories || []).some(
      (s) => s.slug === slug || s.name.toLowerCase() === name.toLowerCase()
    );
    if (exists) {
      alert(`Subcategory "${name}" is already added to this category.`);
      return;
    }

    const newSub = {
      id: "sub-" + Date.now(),
      name,
      slug,
      description: newSubDesc.trim(),
    };
    setFormData((prev) => ({
      ...prev,
      subcategories: [...(prev.subcategories || []), newSub],
    }));
    setNewSubName("");
    setNewSubDesc("");
  };

  const handleRemoveSubcategory = (subId) => {
    setFormData((prev) => ({
      ...prev,
      subcategories: (prev.subcategories || []).filter((s) => s.id !== subId),
    }));
  };

  const handleNameChange = (e) => {
    const name = e.target.value;
    const slug = name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");
    setFormData((prev) => ({
      ...prev,
      name,
      slug: selectedCategory ? prev.slug : slug,
    }));
  };

  const handleSave = async (e) => {
    if (e && e.preventDefault) e.preventDefault();
    if (saving) return;
    if (!formData.name.trim()) {
      alert("Please provide a category name.");
      setActiveTab("general");
      return;
    }

    const payload = {
      ...formData,
      id: selectedCategory ? selectedCategory.id : "cat-" + Date.now(),
      order: Number(formData.order) || 1,
      subcategories: Array.isArray(formData.subcategories) ? formData.subcategories : [],
    };

    setSaving(true);
    setSaveError("");
    try {
      await saveCategory(payload);
      setModalOpen(false);
    } catch (err) {
      setSaveError(err.message || "Failed to save category.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteConfirm = async () => {
    if (!categoryToDelete) return;
    try {
      await deleteCategory(categoryToDelete);
    } catch (err) {
      alert(err.message || "Failed to delete category.");
    }
    setCategoryToDelete(null);
    setDeleteConfirmOpen(false);
  };

  // Helper to count products in a category
  const getProductCount = (categoryName, catId) => {
    return (products || []).filter((p) => {
      const pCat = (p.category || "").toLowerCase();
      const pId = (p.categoryId || "").toLowerCase();
      const targetName = (categoryName || "").toLowerCase();
      const targetId = (catId || "").toLowerCase();
      return (
        pCat === targetName ||
        pCat === targetId ||
        pId === targetId ||
        pId === targetName
      );
    }).length;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 font-sans tracking-tight">
            Category Management
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Organize your Ayurvedic catalog into therapeutic health classifications.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#173D2A] text-white hover:bg-[#0B2416] text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Category</span>
        </button>
      </div>

      {/* Categories Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {categories.map((cat) => {
          const count = getProductCount(cat.name, cat.id);
          return (
            <div
              key={cat.id}
              className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs hover:shadow-md transition-all group flex flex-col justify-between"
            >
              <div>
                <div className="relative h-40 bg-stone-100 overflow-hidden">
                  <img
                    src={cat.image}
                    alt={cat.name}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  <div className="absolute bottom-3 left-4 right-4 flex items-center justify-between text-white">
                    <div>
                      <h3 className="font-sans font-bold text-lg text-white">
                        {cat.name}
                      </h3>
                      <span className="text-xs text-stone-300">
                        Slug: /{cat.slug}
                      </span>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-white/20 backdrop-blur-md text-white border border-white/30">
                      {count} Products
                    </span>
                  </div>
                </div>

                <div className="p-4 space-y-3">
                  <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed">
                    {cat.description || "Holistic Ayurvedic formulations and therapeutic remedies."}
                  </p>

                  <div>
                    <div className="flex items-center justify-between text-[11px] font-semibold text-stone-500 uppercase tracking-wider mb-1.5">
                      <span>Subcategories</span>
                      <span className="text-emerald-700 font-bold">{cat.subcategories?.length || 0}</span>
                    </div>
                    {cat.subcategories && cat.subcategories.length > 0 ? (
                      <div className="flex flex-wrap gap-1.5">
                        {cat.subcategories.map((sub) => (
                          <span
                            key={sub.id}
                            className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200/60"
                          >
                            {sub.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-[11px] text-stone-400 italic">No subcategories defined</span>
                    )}
                  </div>
                </div>
              </div>

              <div className="px-4 py-3 bg-stone-50/80 border-t border-stone-100 flex items-center justify-between gap-2 flex-wrap">
                <Link
                  to={`/category/${cat.slug}`}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-800 hover:underline"
                >
                  <span>View in Store</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(cat, "subcategories")}
                    className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/80 rounded-lg transition-colors cursor-pointer"
                    title="Manage subcategories for this category"
                  >
                    <Package className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Subcategories ({cat.subcategories?.length || 0})</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(cat, "general")}
                    className="p-1.5 text-stone-500 hover:text-emerald-800 hover:bg-white rounded-lg transition-colors cursor-pointer"
                    title="Edit category details"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCategoryToDelete(cat.id);
                      setDeleteConfirmOpen(true);
                    }}
                    className="p-1.5 text-stone-500 hover:text-rose-600 hover:bg-white rounded-lg transition-colors cursor-pointer"
                    title="Delete category"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add / Edit Category Modal */}
      <AdminModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        maxWidth="max-w-3xl"
        title={selectedCategory ? `Edit: ${selectedCategory.name}` : "Create New Category"}
        subtitle="Configure therapeutic category classifications and storefront subcategories"
        footer={
          <div className="flex items-center justify-between w-full flex-wrap gap-3">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-lg">
                {formData.subcategories?.length || 0} subcategories configured
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              {activeTab === "general" ? (
                <button
                  type="button"
                  onClick={() => setActiveTab("subcategories")}
                  className="px-4 py-2 text-xs font-semibold bg-emerald-50 text-emerald-900 border border-emerald-200 hover:bg-emerald-100 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Package className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Configure Subcategories ({formData.subcategories?.length || 0}) &rarr;</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setActiveTab("general")}
                  className="px-4 py-2 text-xs font-semibold bg-stone-100 text-stone-700 hover:bg-stone-200 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <FolderTree className="w-3.5 h-3.5 text-stone-600" />
                  <span>&larr; Category Details</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleSave}
                disabled={saving}
                className="px-5 py-2 text-xs font-bold bg-[#173D2A] text-white hover:bg-[#0B2416] rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {saving ? "Saving..." : selectedCategory ? "Update Category" : "Create Category"}
              </button>
            </div>
          </div>
        }
      >
        <div className="space-y-4">
          {saveError && (
            <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 text-xs text-rose-700">
              {saveError}
            </div>
          )}

          {/* Prominent Navigation Tabs Header */}
          <div className="flex items-center gap-2 border-b border-stone-200 pb-3">
            <button
              type="button"
              onClick={() => setActiveTab("general")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === "general"
                  ? "bg-[#173D2A] text-white shadow-xs"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200/70"
              }`}
            >
              <FolderTree className="w-3.5 h-3.5" />
              <span>1. Category Details</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab("subcategories")}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
                activeTab === "subcategories"
                  ? "bg-[#173D2A] text-white shadow-xs"
                  : "bg-stone-100 text-stone-600 hover:bg-stone-200/70"
              }`}
            >
              <Package className="w-3.5 h-3.5" />
              <span>2. Subcategories</span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  activeTab === "subcategories"
                    ? "bg-white/20 text-white"
                    : "bg-emerald-100 text-emerald-800"
                }`}
              >
                {formData.subcategories?.length || 0}
              </span>
            </button>
          </div>

          {activeTab === "general" ? (
            /* TAB 1: General Category Details */
            <div className="space-y-4">
              {/* Direct Callout linking directly to Subcategories */}
              <div className="p-3 bg-emerald-50/80 border border-emerald-200/80 rounded-xl flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-800 text-white flex items-center justify-center font-bold text-xs shrink-0">
                    {formData.subcategories?.length || 0}
                  </div>
                  <div>
                    <span className="text-xs font-bold text-emerald-950 block">
                      Subcategories: {formData.subcategories?.length || 0} Defined
                    </span>
                    <span className="text-[11px] text-emerald-700 line-clamp-1">
                      {formData.subcategories?.length > 0
                        ? formData.subcategories.map((s) => s.name).join(", ")
                        : "No subcategories yet. Click button to add subcategories for this category."}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab("subcategories")}
                  className="px-3 py-1.5 bg-[#173D2A] hover:bg-[#0B2416] text-white text-xs font-semibold rounded-lg transition-colors flex items-center gap-1 cursor-pointer shadow-xs whitespace-nowrap shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Manage Subcategories ({formData.subcategories?.length || 0})</span>
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Category Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={handleNameChange}
                    required
                    placeholder="e.g. Respiratory & Prana Care"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-stone-300 bg-white focus:outline-hidden focus:ring-1 focus:ring-[#173D2A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    URL Slug
                  </label>
                  <input
                    type="text"
                    value={formData.slug}
                    onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-stone-300 bg-white font-mono text-xs focus:outline-hidden focus:ring-1 focus:ring-[#173D2A]"
                  />
                </div>
              </div>

              <AdminImageUpload
                label="Banner / Thumbnail Image"
                value={formData.image}
                onChange={(img) => setFormData({ ...formData, image: img })}
                helperText="Upload category banner or card artwork (PNG, JPG, WEBP)"
                compact={true}
              />

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Description
                </label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Category overview displayed on catalog pages..."
                  className="w-full px-3 py-2 text-sm rounded-xl border border-stone-300 bg-white focus:outline-hidden focus:ring-1 focus:ring-[#173D2A]"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    Display Sort Order
                  </label>
                  <input
                    type="number"
                    value={formData.order}
                    onChange={(e) => setFormData({ ...formData, order: e.target.value })}
                    className="w-full px-3 py-2 text-sm rounded-xl border border-stone-300 bg-white"
                  />
                </div>
                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.featured}
                      onChange={(e) => setFormData({ ...formData, featured: e.target.checked })}
                      className="w-4 h-4 rounded border-stone-300 text-[#173D2A] focus:ring-[#173D2A]"
                    />
                    <span className="text-xs font-medium text-stone-700">
                      Feature in Top Nav Bar
                    </span>
                  </label>
                </div>
              </div>
            </div>
          ) : (
            /* TAB 2: Subcategories Dedicated Workspace */
            <div className="space-y-4">
              <div className="bg-emerald-50/60 border border-emerald-100 rounded-xl p-3 flex items-start gap-3">
                <Package className="w-5 h-5 text-emerald-800 shrink-0 mt-0.5" />
                <div>
                  <h4 className="text-xs font-bold text-emerald-950">
                    Subcategories for {formData.name || "This Category"}
                  </h4>
                  <p className="text-[11px] text-emerald-800 leading-relaxed mt-0.5">
                    Subcategories power the storefront mega menu, category filter chips, catalog sidebar, and admin product forms.
                  </p>
                </div>
              </div>

              {/* Add New Subcategory Box */}
              <div className="bg-stone-50 border border-stone-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-stone-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Add New Subcategory</span>
                  </span>
                  <span className="text-[11px] text-stone-400">Press Enter or click Add</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
                  <div className="sm:col-span-5">
                    <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                      Subcategory Name *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Hair & Scalp Tailams"
                      value={newSubName}
                      onChange={(e) => setNewSubName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddSubcategory();
                        }
                      }}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 bg-white focus:outline-hidden focus:ring-1 focus:ring-[#173D2A]"
                    />
                  </div>
                  <div className="sm:col-span-7">
                    <label className="block text-[11px] font-semibold text-stone-600 mb-1">
                      Description (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="Short therapeutic benefits or formulations..."
                      value={newSubDesc}
                      onChange={(e) => setNewSubDesc(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddSubcategory();
                        }
                      }}
                      className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 bg-white focus:outline-hidden focus:ring-1 focus:ring-[#173D2A]"
                    />
                  </div>
                </div>

                {/* Quick suggestions chips */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-stone-500 font-medium">Quick suggestions:</span>
                  {AYURVEDIC_SUGGESTIONS.map((sug) => (
                    <button
                      key={sug}
                      type="button"
                      onClick={() => {
                        setNewSubName(sug);
                        setNewSubDesc(`Authentic classical Ayurvedic ${sug.toLowerCase()}`);
                      }}
                      className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-white hover:bg-emerald-50 text-stone-600 hover:text-emerald-800 border border-stone-200 transition-colors cursor-pointer"
                    >
                      + {sug}
                    </button>
                  ))}
                </div>

                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={handleAddSubcategory}
                    disabled={!newSubName.trim()}
                    className="px-4 py-2 bg-[#173D2A] disabled:bg-stone-300 text-white rounded-xl text-xs font-bold hover:bg-[#0B2416] transition-colors inline-flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Subcategory</span>
                  </button>
                </div>
              </div>

              {/* List of Configured Subcategories */}
              <div>
                <div className="flex items-center justify-between mb-2 px-1">
                  <span className="text-xs font-bold text-stone-700">
                    Current Subcategories ({formData.subcategories?.length || 0})
                  </span>
                  <span className="text-[10px] text-stone-400">
                    Saved directly into this category definition
                  </span>
                </div>

                {formData.subcategories && formData.subcategories.length > 0 ? (
                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {formData.subcategories.map((sub, idx) => (
                      <div
                        key={sub.id || idx}
                        className="flex items-center justify-between bg-white border border-stone-200 rounded-xl p-3 shadow-2xs hover:border-emerald-300 transition-colors"
                      >
                        <div className="flex items-center gap-3 flex-1 min-w-0 pr-3">
                          <span className="w-6 h-6 rounded-lg bg-emerald-50 border border-emerald-200/60 text-emerald-800 font-bold text-[11px] flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-bold text-stone-900">{sub.name}</span>
                              <span className="font-mono text-[10px] px-2 py-0.5 rounded-md bg-stone-100 text-stone-600">
                                /{sub.slug}
                              </span>
                            </div>
                            {sub.description && (
                              <p className="text-[11px] text-stone-500 truncate mt-0.5">
                                {sub.description}
                              </p>
                            )}
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveSubcategory(sub.id)}
                          className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer shrink-0"
                          title="Delete subcategory"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-8 text-center bg-stone-50 border border-dashed border-stone-300 rounded-2xl">
                    <Package className="w-8 h-8 text-stone-300 mx-auto mb-2" />
                    <p className="text-xs font-semibold text-stone-700">No subcategories defined yet</p>
                    <p className="text-[11px] text-stone-400 mt-1 max-w-sm mx-auto">
                      Type a subcategory name above (e.g., &quot;Daily Immunity Swaras&quot; or &quot;Single Classical Herbs&quot;) and click &quot;Add Subcategory&quot;.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </AdminModal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Category"
        message="Are you sure you want to delete this category? Associated products will need to be reassigned."
      />
    </div>
  );
};

