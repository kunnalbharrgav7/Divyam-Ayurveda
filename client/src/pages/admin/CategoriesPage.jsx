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

  const defaultCategoryForm = {
    name: "",
    slug: "",
    description: "",
    image: "/images/ProductImages/Ashuwaganda.png",
    order: 1,
    featured: true,
  };

  const [formData, setFormData] = useState(defaultCategoryForm);

  const handleOpenAdd = () => {
    setSelectedCategory(null);
    setFormData({
      ...defaultCategoryForm,
      order: categories.length + 1,
    });
    setModalOpen(true);
  };

  const handleOpenEdit = (cat) => {
    setSelectedCategory(cat);
    setFormData({
      name: cat.name,
      slug: cat.slug,
      description: cat.description || "",
      image: cat.image || "",
      order: cat.order || 1,
      featured: cat.featured ?? true,
    });
    setModalOpen(true);
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

  const handleSave = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    const payload = {
      ...formData,
      id: selectedCategory ? selectedCategory.id : "cat-" + Date.now(),
      order: Number(formData.order),
    };

    saveCategory(payload);
    setModalOpen(false);
  };

  const handleDeleteConfirm = () => {
    if (categoryToDelete) {
      deleteCategory(categoryToDelete);
      setCategoryToDelete(null);
      setDeleteConfirmOpen(false);
    }
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

                <div className="p-4">
                  <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed">
                    {cat.description || "Holistic Ayurvedic formulations and therapeutic remedies."}
                  </p>
                </div>
              </div>

              <div className="px-4 py-3 bg-stone-50/80 border-t border-stone-100 flex items-center justify-between">
                <Link
                  to={`/category/${cat.slug}`}
                  className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-800 hover:underline"
                >
                  <span>View in Store</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </Link>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(cat)}
                    className="p-1.5 text-stone-500 hover:text-emerald-800 hover:bg-white rounded-lg transition-colors"
                    title="Edit category"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setCategoryToDelete(cat.id);
                      setDeleteConfirmOpen(true);
                    }}
                    className="p-1.5 text-stone-500 hover:text-rose-600 hover:bg-white rounded-lg transition-colors"
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
        title={selectedCategory ? `Edit: ${selectedCategory.name}` : "Create New Category"}
        subtitle="Categories group products and power top navigation in the store"
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
              {selectedCategory ? "Update Category" : "Create Category"}
            </button>
          </>
        }
      >
        <form onSubmit={handleSave} className="space-y-4">
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
              className="w-full px-3 py-2 text-sm rounded-xl border border-stone-300 bg-white focus:ring-[#173D2A]"
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
              className="w-full px-3 py-2 text-sm rounded-xl border border-stone-300 bg-white font-mono text-xs focus:ring-[#173D2A]"
            />
          </div>

          <AdminImageUpload
            label="Banner / Thumbnail Image"
            value={formData.image}
            onChange={(img) => setFormData({ ...formData, image: img })}
            helperText="Upload category banner or card artwork (PNG, JPG, WEBP)"
          />

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Description
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Category overview displayed on catalog pages..."
              className="w-full px-3 py-2 text-sm rounded-xl border border-stone-300 bg-white"
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
        </form>
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

