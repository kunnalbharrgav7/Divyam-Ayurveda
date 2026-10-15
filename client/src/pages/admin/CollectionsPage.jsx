import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Edit, Trash2, Layers, ExternalLink } from "lucide-react";
import { useAdmin } from "../../context/AdminContext";
import { AdminModal, ConfirmDialog } from "../../components/admin/common/AdminModal";
import { AdminImageUpload } from "../../components/admin/common/AdminImageUpload";

export const CollectionsPage = () => {
  const { collections, saveCollection, deleteCollection } = useAdmin();
  const [modalOpen, setModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedCollection, setSelectedCollection] = useState(null);
  const [collectionToDelete, setCollectionToDelete] = useState(null);

  const defaultForm = {
    title: "",
    subtitle: "",
    slug: "",
    image: "/images/ProductImages/Himalya.png",
    description: "",
    featured: true,
  };

  const [formData, setFormData] = useState(defaultForm);

  const handleOpenAdd = () => {
    setSelectedCollection(null);
    setFormData(defaultForm);
    setModalOpen(true);
  };

  const handleOpenEdit = (col) => {
    setSelectedCollection(col);
    setFormData({
      title: col.title || col.name,
      subtitle: col.subtitle || "",
      slug: col.slug,
      image: col.image || "",
      description: col.description || "",
      featured: col.featured ?? true,
    });
    setModalOpen(true);
  };

  const handleTitleChange = (e) => {
    const title = e.target.value;
    const slug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");
    setFormData((prev) => ({
      ...prev,
      title,
      slug: selectedCollection ? prev.slug : slug,
    }));
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    const payload = {
      ...formData,
      id: selectedCollection ? selectedCollection.id : "col-" + Date.now(),
      name: formData.title,
    };

    saveCollection(payload);
    setModalOpen(false);
  };

  const handleDeleteConfirm = () => {
    if (collectionToDelete) {
      deleteCollection(collectionToDelete);
      setCollectionToDelete(null);
      setDeleteConfirmOpen(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 font-sans tracking-tight">
            Curated Collections
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Curate thematic product showcases featured on the homepage and seasonal promotions.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#173D2A] text-white hover:bg-[#0B2416] text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Collection</span>
        </button>
      </div>

      {/* Collections Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {collections.map((col) => (
          <div
            key={col.id}
            className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="relative h-44 bg-stone-100 overflow-hidden">
                <img
                  src={col.image}
                  alt={col.title || col.name}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                <div className="absolute bottom-3 left-4 right-4 text-white">
                  <h3 className="font-sans font-bold text-lg text-white">
                    {col.title || col.name}
                  </h3>
                  <span className="text-xs text-[#A9D18E]">
                    {col.subtitle || "Thematic Ayurvedic Edit"}
                  </span>
                </div>
              </div>

              <div className="p-4">
                <p className="text-xs text-stone-600 line-clamp-2 leading-relaxed">
                  {col.description || "Handpicked Ayurvedic combinations for targeted wellness."}
                </p>
              </div>
            </div>

            <div className="px-4 py-3 bg-stone-50/80 border-t border-stone-100 flex items-center justify-between">
              <span className="text-xs text-stone-400 font-mono">
                /{col.slug}
              </span>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleOpenEdit(col)}
                  className="p-1.5 text-stone-500 hover:text-emerald-800 hover:bg-white rounded-lg transition-colors"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setCollectionToDelete(col.id);
                    setDeleteConfirmOpen(true);
                  }}
                  className="p-1.5 text-stone-500 hover:text-rose-600 hover:bg-white rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Add / Edit Collection Modal */}
      <AdminModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={selectedCollection ? `Edit: ${selectedCollection.title || selectedCollection.name}` : "Create Collection"}
        subtitle="Group products into promotional seasonal sets"
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
              {selectedCollection ? "Update Collection" : "Create Collection"}
            </button>
          </>
        }
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Collection Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={handleTitleChange}
              required
              placeholder="e.g. Daily Immunity Boosters"
              className="w-full px-3 py-2 text-sm rounded-xl border border-stone-300 bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Subtitle / Caption
            </label>
            <input
              type="text"
              value={formData.subtitle}
              onChange={(e) => setFormData({ ...formData, subtitle: e.target.value })}
              placeholder="e.g. Strengthen your Ojas with classical Rasayanas"
              className="w-full px-3 py-2 text-sm rounded-xl border border-stone-300 bg-white"
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
              className="w-full px-3 py-2 text-sm rounded-xl border border-stone-300 bg-white font-mono text-xs"
            />
          </div>

          <AdminImageUpload
            label="Collection Banner Image"
            value={formData.image}
            onChange={(img) => setFormData({ ...formData, image: img })}
            helperText="Upload wide collection banner artwork (PNG, JPG, WEBP)"
          />

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Description
            </label>
            <textarea
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
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
        title="Delete Collection"
        message="Are you sure you want to delete this collection?"
      />
    </div>
  );
};

