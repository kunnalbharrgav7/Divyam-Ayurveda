import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Edit, Trash2, BookOpen, Eye, ExternalLink } from "lucide-react";
import { useAdmin } from "../../context/AdminContext";
import { AdminCard } from "../../components/admin/common/AdminCard";
import { AdminModal, ConfirmDialog } from "../../components/admin/common/AdminModal";
import { AdminImageUpload } from "../../components/admin/common/AdminImageUpload";
import { formatDate } from "../../utils/formatters";

export const BlogAdminPage = () => {
  const { blogPosts, saveBlogPost, deleteBlogPost } = useAdmin();

  const [modalOpen, setModalOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState(null);
  const [postToDelete, setPostToDelete] = useState(null);

  const defaultForm = {
    title: "",
    slug: "",
    category: "Ayurvedic Lifestyle",
    author: "Dr. Ananya Sharma (BAMS, MD)",
    readTime: "5 min read",
    excerpt: "",
    content: "",
    image: "/images/ProductImages/Himalya.png",
    status: "Published",
    date: new Date().toISOString().split("T")[0],
  };

  const [formData, setFormData] = useState(defaultForm);

  const handleOpenAdd = () => {
    setSelectedPost(null);
    setFormData(defaultForm);
    setModalOpen(true);
  };

  const handleOpenEdit = (post) => {
    setSelectedPost(post);
    setFormData({
      title: post.title,
      slug: post.slug,
      category: post.category || "Ayurvedic Lifestyle",
      author: post.author || "Dr. Ananya Sharma",
      readTime: post.readTime || "5 min read",
      excerpt: post.excerpt || "",
      content: post.content || "",
      image: post.image || defaultForm.image,
      status: post.status || "Published",
      date: post.date || defaultForm.date,
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
      slug: selectedPost ? prev.slug : slug,
    }));
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    const payload = {
      ...formData,
      id: selectedPost ? selectedPost.id : "post-" + Date.now(),
    };

    saveBlogPost(payload);
    setModalOpen(false);
  };

  const handleDeleteConfirm = () => {
    if (postToDelete) {
      deleteBlogPost(postToDelete);
      setPostToDelete(null);
      setDeleteConfirmOpen(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 font-sans tracking-tight">
            Ayurvedic Education & Blog Articles
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Publish herbal guides, seasonal Ritucharya lifestyle tips, and clinical articles.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#173D2A] text-white hover:bg-[#0B2416] text-xs font-semibold shadow-xs transition-colors self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Write New Article</span>
        </button>
      </div>

      {/* Blog Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {blogPosts.map((post) => (
          <div
            key={post.id}
            className="bg-white rounded-2xl border border-stone-200 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="relative h-44 bg-stone-50 overflow-hidden flex items-center justify-center p-2 border-b border-stone-100">
                <img
                  src={post.image || "/images/ProductImages/Himalya.png"}
                  alt={post.title}
                  className="w-full h-full object-contain"
                  onError={(e) => {
                    e.target.src = "/images/ProductImages/Himalya.png";
                  }}
                />
                <span className="absolute top-3 left-3 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-[#173D2A]/90 text-white backdrop-blur-xs">
                  {post.category}
                </span>
              </div>

              <div className="p-4">
                <div className="text-[11px] text-stone-400 mb-1">
                  {formatDate(post.date)} • {post.readTime || "4 min read"}
                </div>
                <h3 className="font-sans font-bold text-base text-stone-900 line-clamp-2 leading-snug">
                  {post.title}
                </h3>
                <p className="text-xs text-stone-600 line-clamp-2 mt-2 leading-relaxed">
                  {post.excerpt || post.content}
                </p>
                <div className="text-xs text-stone-500 font-medium mt-3">
                  By {post.author}
                </div>
              </div>
            </div>

            <div className="px-4 py-3 bg-stone-50/80 border-t border-stone-100 flex items-center justify-between">
              <Link
                to={`/blog/${post.slug}`}
                className="text-xs font-semibold text-emerald-800 hover:underline inline-flex items-center gap-1"
              >
                <span>Read Public Article</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Link>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleOpenEdit(post)}
                  className="p-1.5 text-stone-400 hover:text-emerald-800 rounded transition-colors"
                >
                  <Edit className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPostToDelete(post.id);
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

      {/* Add / Edit Post Modal */}
      <AdminModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={selectedPost ? `Edit: ${selectedPost.title}` : "Write Ayurvedic Article"}
        subtitle="Publish educational wellness guides and classical insights"
        maxWidth="max-w-3xl"
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
              {selectedPost ? "Update Article" : "Publish Article"}
            </button>
          </>
        }
      >
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Article Title *
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={handleTitleChange}
              required
              placeholder="e.g. 5 Morning Dinacharya Rituals for Radiant Energy"
              className="w-full px-3 py-2 text-sm rounded-xl border border-stone-300 bg-white font-sans"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
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
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Category
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-xl border border-stone-300 bg-white text-stone-700"
              >
                <option value="Ayurvedic Lifestyle">Ayurvedic Lifestyle</option>
                <option value="Herbal Remedies">Herbal Remedies</option>
                <option value="Diet & Nutrition">Diet & Nutrition</option>
                <option value="Dosha Science">Dosha Science</option>
                <option value="Mind & Meditation">Mind & Meditation</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Author
              </label>
              <input
                type="text"
                value={formData.author}
                onChange={(e) => setFormData({ ...formData, author: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-xl border border-stone-300 bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Estimated Reading Time
              </label>
              <input
                type="text"
                value={formData.readTime}
                onChange={(e) => setFormData({ ...formData, readTime: e.target.value })}
                className="w-full px-3 py-2 text-sm rounded-xl border border-stone-300 bg-white"
              />
            </div>
          </div>

          <AdminImageUpload
            label="Article Cover Image"
            value={formData.image}
            onChange={(img) => setFormData({ ...formData, image: img })}
            helperText="Upload blog header cover photo (PNG, JPG, WEBP)"
          />

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Excerpt / Teaser
            </label>
            <textarea
              rows={2}
              value={formData.excerpt}
              onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
              placeholder="Short summary displayed on cards..."
              className="w-full px-3 py-2 text-sm rounded-xl border border-stone-300 bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-stone-700 mb-1">
              Full Article Body (Markdown supported)
            </label>
            <textarea
              rows={8}
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              placeholder="Write the complete educational article here..."
              className="w-full px-3 py-2 text-sm rounded-xl border border-stone-300 bg-white font-mono text-xs"
            />
          </div>
        </form>
      </AdminModal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Article"
        message="Are you sure you want to delete this blog post?"
      />
    </div>
  );
};

