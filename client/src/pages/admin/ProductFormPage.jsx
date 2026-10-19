import React, { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  Save,
  ArrowLeft,
  Upload,
  Plus,
  Trash2,
  Sparkles,
  Check,
  Eye,
  AlertCircle,
  Star,
  Image as ImageIcon,
  Link2,
} from "lucide-react";
import { useAdmin } from "../../context/AdminContext";
import { AdminCard } from "../../components/admin/common/AdminCard";
import { formatCurrency } from "../../utils/formatters";
import { compressImageFile } from "../../utils/imageCompressor";

export const ProductFormPage = () => {
  const { productId } = useParams();
  const isEdit = Boolean(productId);
  const navigate = useNavigate();
  const { products, categories, brands, collections, saveProduct } = useAdmin();

  // Initial state template
  const defaultFormData = {
    title: "",
    subtitle: "",
    slug: "",
    sku: "",
    category: categories[0]?.name || "Digestive Health",
    subcategory: "",
    subcategoryId: "",
    brand: "Divyam Ayurveda",
    price: 499,
    compareAtPrice: 699,
    costPrice: 200,
    taxRate: 12,
    stock: 50,
    reorderThreshold: 10,
    image: "/images/ProductImages/Ashuwaganda.png",
    images: [
      "/images/ProductImages/Ashuwaganda.png",
    ],
    gallery: [],
    rating: 4.8,
    reviewCount: 24,
    status: "Active",
    isFeatured: false,
    isBestseller: false,
    isTrending: false,
    isNewArrival: true,
    dosha: ["Vata", "Pitta"],
    benefits: [
      "Promotes deep vitality and rejuvenation",
      "Balances internal natural digestive fire (Agni)",
      "Supports daily immune resilience",
    ],
    ingredients: [
      { name: "Ashwagandha", sanskrit: "Withania somnifera", ratio: "40%" },
      { name: "Shatavari", sanskrit: "Asparagus racemosus", ratio: "30%" },
    ],
    dosage: "1-2 tablets twice daily with warm milk or water after meals, or as directed by an Ayurvedic physician.",
    certifications: ["AYUSH Certified", "GMP Certified", "100% Organic", "Lab Tested"],
    variants: [
      { name: "60 Tablets", price: 499, stock: 35 },
      { name: "120 Tablets", price: 899, stock: 15 },
    ],
    metaTitle: "",
    metaDescription: "",
    description: "Formulated according to classical Ayurvedic texts, this authentic preparation combines potent botanical extracts to restore natural systemic balance.",
  };

  const [formData, setFormData] = useState(defaultFormData);
  const [newImageUrl, setNewImageUrl] = useState("");
  const [showUrlInput, setShowUrlInput] = useState(false);
  const [newBenefit, setNewBenefit] = useState("");
  const [newIngredientName, setNewIngredientName] = useState("");
  const [newIngredientSanskrit, setNewIngredientSanskrit] = useState("");
  const [toastMessage, setToastMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState("");

  // Load existing product if editing
  useEffect(() => {
    if (isEdit) {
      const existing = products.find((p) => p.id === productId);
      if (existing) {
        let existingImages = [];
        if (Array.isArray(existing.images) && existing.images.length > 0) {
          existingImages = [...existing.images];
        } else if (existing.image) {
          existingImages = [existing.image];
        } else {
          existingImages = [defaultFormData.image];
        }

        const primaryImage = existing.image || existingImages[0] || defaultFormData.image;
        if (!existingImages.includes(primaryImage)) {
          existingImages = [primaryImage, ...existingImages];
        }

        setFormData({
          ...defaultFormData,
          ...existing,
          title: existing.title || existing.name || "",
          name: existing.name || existing.title || "",
          sku: existing.sku || `DIV-${existing.id}`,
          image: primaryImage,
          images: existingImages,
          gallery: existingImages,
          stock: existing.stock !== undefined ? existing.stock : (existing.stockQuantity ?? 50),
          category: (() => {
            const catObj = categories.find(
              (c) =>
                c.id === existing.categoryId ||
                c.slug === existing.categoryId ||
                c.id === existing.category ||
                c.slug === existing.category ||
                c.name?.toLowerCase() === (existing.category || "").toLowerCase()
            );
            return catObj?.name || existing.category || defaultFormData.category;
          })(),
          benefits: existing.benefits || defaultFormData.benefits,
          subcategory: existing.subcategory || "",
          subcategoryId: existing.subcategoryId || "",
          ingredients: existing.ingredients || defaultFormData.ingredients,
          dosha: existing.dosha || defaultFormData.dosha,
          variants: existing.variants || defaultFormData.variants,
          certifications: existing.certifications || defaultFormData.certifications,
        });
      }
    }
  }, [productId, products, isEdit]);

  // Image Upload Handlers
  const handleImageUpload = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    // Resize + re-encode each photo (WebP, max 1600px) before it is stored
    const readers = files.map((file) => compressImageFile(file, { maxDimension: 1600 }));

    Promise.all(readers).then((newUploads) => {
      setFormData((prev) => {
        const currentImages = Array.isArray(prev.images) && prev.images.length > 0
          ? prev.images
          : (prev.image ? [prev.image] : []);
        const combined = [...currentImages, ...newUploads];
        return {
          ...prev,
          images: combined,
          gallery: combined,
          image: prev.image || combined[0],
        };
      });
      e.target.value = "";
    });
  };

  const handleAddImageUrl = () => {
    if (!newImageUrl.trim()) return;
    const url = newImageUrl.trim();
    setFormData((prev) => {
      const currentImages = Array.isArray(prev.images) && prev.images.length > 0
        ? prev.images
        : (prev.image ? [prev.image] : []);
      const combined = [...currentImages, url];
      return {
        ...prev,
        images: combined,
        gallery: combined,
        image: prev.image || combined[0],
      };
    });
    setNewImageUrl("");
  };

  const handleSetPrimary = (selectedUrl) => {
    setFormData((prev) => {
      const currentImages = Array.isArray(prev.images) ? prev.images : [];
      const reordered = [
        selectedUrl,
        ...currentImages.filter((img) => img !== selectedUrl),
      ];
      return {
        ...prev,
        image: selectedUrl,
        images: reordered,
        gallery: reordered,
      };
    });
  };

  const handleRemoveImage = (indexToRemove) => {
    setFormData((prev) => {
      const currentImages = Array.isArray(prev.images) ? prev.images : [];
      const removedUrl = currentImages[indexToRemove];
      const filtered = currentImages.filter((_, idx) => idx !== indexToRemove);
      let newPrimary = prev.image;
      if (prev.image === removedUrl) {
        newPrimary = filtered[0] || "";
      }
      return {
        ...prev,
        images: filtered,
        gallery: filtered,
        image: newPrimary,
      };
    });
  };

  // Form input change helper
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  // Auto generate slug from title
  const handleTitleChange = (e) => {
    const title = e.target.value;
    const generatedSlug = title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");

    setFormData((prev) => ({
      ...prev,
      title,
      slug: isEdit ? prev.slug : generatedSlug,
      sku: isEdit ? prev.sku : `DIV-${title.slice(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`,
    }));
  };

  // Benefit handlers
  const handleAddBenefit = () => {
    if (newBenefit.trim()) {
      setFormData((prev) => ({
        ...prev,
        benefits: [...prev.benefits, newBenefit.trim()],
      }));
      setNewBenefit("");
    }
  };

  const handleRemoveBenefit = (idx) => {
    setFormData((prev) => ({
      ...prev,
      benefits: prev.benefits.filter((_, i) => i !== idx),
    }));
  };

  // Ingredient handlers
  const handleAddIngredient = () => {
    if (newIngredientName.trim()) {
      setFormData((prev) => ({
        ...prev,
        ingredients: [
          ...prev.ingredients,
          {
            name: newIngredientName.trim(),
            sanskrit: newIngredientSanskrit.trim() || newIngredientName.trim(),
          },
        ],
      }));
      setNewIngredientName("");
      setNewIngredientSanskrit("");
    }
  };

  const handleRemoveIngredient = (idx) => {
    setFormData((prev) => ({
      ...prev,
      ingredients: prev.ingredients.filter((_, i) => i !== idx),
    }));
  };

  // Dosha toggle
  const toggleDosha = (doshaName) => {
    setFormData((prev) => {
      const exists = prev.dosha.includes(doshaName);
      return {
        ...prev,
        dosha: exists
          ? prev.dosha.filter((d) => d !== doshaName)
          : [...prev.dosha, doshaName],
      };
    });
  };

  // Variant handlers
  const handleAddVariant = () => {
    setFormData((prev) => ({
      ...prev,
      variants: [
        ...prev.variants,
        { name: "New Size / Pack", price: prev.price, stock: 20 },
      ],
    }));
  };

  const handleUpdateVariant = (index, field, value) => {
    const updated = [...formData.variants];
    updated[index][field] = field === "price" || field === "stock" ? Number(value) : value;
    setFormData((prev) => ({ ...prev, variants: updated }));
  };

  const handleRemoveVariant = (index) => {
    setFormData((prev) => ({
      ...prev,
      variants: prev.variants.filter((_, i) => i !== index),
    }));
  };

  // Submit Handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError("");
    if (!formData.title) {
      setSubmitError("Please provide a product title.");
      return;
    }

    const primaryImg = formData.image || formData.images?.[0] || "";
    const imagesList = Array.isArray(formData.images) && formData.images.length > 0
      ? formData.images
      : (primaryImg ? [primaryImg] : []);

    // Ensure primary image is at index 0 of allImages
    const orderedImages = primaryImg && imagesList.includes(primaryImg)
      ? [primaryImg, ...imagesList.filter((img) => img !== primaryImg)]
      : imagesList;

    const matchedCategoryObj = categories.find(
      (c) =>
        c.name?.toLowerCase() === (formData.category || "").toLowerCase() ||
        c.id === formData.category ||
        c.slug === formData.category
    );
    const resolvedCatName = matchedCategoryObj?.name || formData.category;
    const resolvedCatId = matchedCategoryObj?.slug || matchedCategoryObj?.id || "ayurvedic-herbs";

    const matchedSubcategoryObj = matchedCategoryObj?.subcategories?.find(
      (s) =>
        s.name?.toLowerCase() === (formData.subcategory || "").toLowerCase() ||
        s.id === formData.subcategoryId ||
        s.slug === formData.subcategoryId ||
        s.id === formData.subcategory ||
        s.slug === formData.subcategory
    );
    const resolvedSubcategoryName = matchedSubcategoryObj?.name || formData.subcategory || "";
    const resolvedSubcategoryId = matchedSubcategoryObj?.slug || matchedSubcategoryObj?.id || formData.subcategoryId || "";

    const payload = {
      ...formData,
      id: isEdit ? productId : undefined,
      title: formData.title,
      name: formData.title,
      category: resolvedCatName,
      categoryId: resolvedCatId,
      subcategory: resolvedSubcategoryName,
      subcategoryId: resolvedSubcategoryId,
      image: primaryImg,
      images: orderedImages,
      gallery: orderedImages,
      price: Number(formData.price),
      originalPrice: Number(formData.compareAtPrice) || Number(formData.price),
      compareAtPrice: Number(formData.compareAtPrice) || null,
      stock: Number(formData.stock),
      stockQuantity: Number(formData.stock),
      // Send the API field names explicitly; formData may still hold stale copies of them
      isFeatured: Boolean(formData.isFeatured),
      isBestSeller: Boolean(formData.isBestseller),
      isBestseller: Boolean(formData.isBestseller),
      isTrending: Boolean(formData.isTrending),
      isNew: Boolean(formData.isNewArrival),
      isNewArrival: Boolean(formData.isNewArrival),
      reorderThreshold: Number(formData.reorderThreshold),
      costPrice: Number(formData.costPrice),
      updatedAt: new Date().toISOString(),
    };

    setSaving(true);
    try {
      await saveProduct(payload);
      setToastMessage(isEdit ? "Product updated in database successfully!" : "Product saved to database successfully!");
      setTimeout(() => {
        navigate("/admin/products");
      }, 700);
    } catch (err) {
      console.error("Save product failed:", err);
      setSubmitError(err.message || "Failed to save product to database. Please check your network or login.");
    } finally {
      setSaving(false);
    }
  };

  const selectedCategoryObj = categories.find(
    (c) =>
      c.name?.toLowerCase() === (formData.category || "").toLowerCase() ||
      c.id === formData.category ||
      c.slug === formData.category
  );
  const currentSubcategories = selectedCategoryObj?.subcategories || [];

  return (
    <form onSubmit={handleSubmit} className="space-y-6 pb-12">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to="/admin/products"
            className="p-2 rounded-xl border border-stone-200 bg-white hover:bg-stone-50 text-stone-600 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-stone-900 font-sans tracking-tight">
              {isEdit ? `Edit: ${formData.title}` : "Create New Ayurvedic Product"}
            </h1>
            <p className="text-xs text-stone-500 mt-0.5">
              Configure formulation, pricing, botanical ingredients, and publishing status.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate("/admin/products")}
            className="px-4 py-2 text-xs font-semibold rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-xl bg-[#173D2A] text-white hover:bg-[#0B2416] shadow-sm transition-colors disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? "Saving to Database..." : (isEdit ? "Update Formulation" : "Save Formulation")}</span>
          </button>
        </div>
      </div>

      {submitError && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-semibold flex items-center gap-2.5 animate-in fade-in">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{submitError}</span>
        </div>
      )}

      {toastMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center gap-2">
          <Check className="w-4 h-4" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Grid: Left Column (Form Fields) & Right Column (Live Card Preview) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Form (2 Columns wide) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Section 1: Basic Information */}
          <AdminCard title="1. Basic Information" subtitle="Primary product title and identifiers">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Product Title *
                </label>
                <input
                  type="text"
                  name="title"
                  value={formData.title}
                  onChange={handleTitleChange}
                  placeholder="e.g. Triphala Churna Organic Digestive Powder"
                  required
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-stone-300 bg-white focus:ring-[#173D2A] focus:border-[#173D2A]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Short Subtitle / Tagline
                </label>
                <input
                  type="text"
                  name="subtitle"
                  value={formData.subtitle}
                  onChange={handleChange}
                  placeholder="e.g. Traditional 3-Fruit Blend for Colon Health & Detox"
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-stone-300 bg-white focus:ring-[#173D2A] focus:border-[#173D2A]"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    URL Slug
                  </label>
                  <input
                    type="text"
                    name="slug"
                    value={formData.slug}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-stone-300 bg-white font-mono text-xs focus:ring-[#173D2A]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-stone-700 mb-1">
                    SKU (Stock Keeping Unit)
                  </label>
                  <input
                    type="text"
                    name="sku"
                    value={formData.sku}
                    onChange={handleChange}
                    className="w-full px-3.5 py-2 text-sm rounded-xl border border-stone-300 bg-white font-mono text-xs focus:ring-[#173D2A]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Detailed Product Description
                </label>
                <textarea
                  name="description"
                  rows={4}
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Full Ayurvedic medicinal description..."
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-stone-300 bg-white focus:ring-[#173D2A]"
                />
              </div>
            </div>
          </AdminCard>

          {/* Section 2: Pricing & Inventory */}
          <AdminCard title="2. Pricing & Warehouse Inventory" subtitle="Price points, cost margin, and stock counters">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Selling Price (₹) *
                </label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  required
                  min="0"
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-stone-300 bg-white focus:ring-[#173D2A]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Compare At / MRP (₹)
                </label>
                <input
                  type="number"
                  name="compareAtPrice"
                  value={formData.compareAtPrice}
                  onChange={handleChange}
                  min="0"
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-stone-300 bg-white focus:ring-[#173D2A]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Cost per Item (₹)
                </label>
                <input
                  type="number"
                  name="costPrice"
                  value={formData.costPrice}
                  onChange={handleChange}
                  min="0"
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-stone-300 bg-white focus:ring-[#173D2A]"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4 pt-4 border-t border-stone-100">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Current Stock Available (Units) *
                </label>
                <input
                  type="number"
                  name="stock"
                  value={formData.stock}
                  onChange={handleChange}
                  required
                  min="0"
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-stone-300 bg-white focus:ring-[#173D2A]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Low Stock Alert Threshold
                </label>
                <input
                  type="number"
                  name="reorderThreshold"
                  value={formData.reorderThreshold}
                  onChange={handleChange}
                  min="1"
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-stone-300 bg-white focus:ring-[#173D2A]"
                />
              </div>
            </div>
          </AdminCard>

          {/* Section 3: Ayurvedic Formulation & Doshas */}
          <AdminCard
            title="3. Ayurvedic Formulation & Dosha Profile"
            subtitle="Authentic botanical parameters, benefits, and dosha balance"
          >
            {/* Dosha Selector */}
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-stone-700">
                Primary Doshas Balanced:
              </label>
              <div className="flex flex-wrap gap-2">
                {["Vata", "Pitta", "Kapha", "Tridoshic"].map((dosha) => {
                  const active = formData.dosha.includes(dosha);
                  return (
                    <button
                      key={dosha}
                      type="button"
                      onClick={() => toggleDosha(dosha)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                        active
                          ? "bg-[#173D2A] text-white shadow-xs"
                          : "bg-stone-100 text-stone-600 hover:bg-stone-200"
                      }`}
                    >
                      {active ? `✓ ${dosha}` : `+ ${dosha}`}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Ayurvedic Benefits */}
            <div className="mt-5 space-y-2">
              <label className="block text-xs font-semibold text-stone-700">
                Key Ayurvedic Benefits (Bullet Points)
              </label>
              <div className="space-y-2">
                {formData.benefits.map((b, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-700 flex-shrink-0" />
                    <span className="text-xs text-stone-800 flex-1">{b}</span>
                    <button
                      type="button"
                      onClick={() => handleRemoveBenefit(idx)}
                      className="text-stone-400 hover:text-rose-600 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

                <div className="flex items-center gap-2 pt-1">
                  <input
                    type="text"
                    value={newBenefit}
                    onChange={(e) => setNewBenefit(e.target.value)}
                    placeholder="Add benefit (e.g. Supports healthy digestion & gut lining)..."
                    className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-stone-300 bg-white"
                  />
                  <button
                    type="button"
                    onClick={handleAddBenefit}
                    className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg text-xs font-semibold"
                  >
                    Add
                  </button>
                </div>
              </div>
            </div>

            {/* Botanical Ingredients */}
            <div className="mt-5 space-y-2 pt-4 border-t border-stone-100">
              <label className="block text-xs font-semibold text-stone-700">
                Key Herbal Ingredients
              </label>
              <div className="space-y-2">
                {formData.ingredients.map((ing, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between p-2 rounded-lg bg-stone-50 border border-stone-200/80 text-xs"
                  >
                    <div>
                      <span className="font-semibold text-stone-900">{ing.name}</span>
                      <span className="text-stone-500 italic ml-2">
                        ({ing.sanskrit || ing.name})
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveIngredient(idx)}
                      className="text-stone-400 hover:text-rose-600 p-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}

                <div className="flex flex-col sm:flex-row gap-2 pt-1">
                  <input
                    type="text"
                    value={newIngredientName}
                    onChange={(e) => setNewIngredientName(e.target.value)}
                    placeholder="Herb Name (e.g. Amalaki)"
                    className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-stone-300 bg-white"
                  />
                  <input
                    type="text"
                    value={newIngredientSanskrit}
                    onChange={(e) => setNewIngredientSanskrit(e.target.value)}
                    placeholder="Botanical / Sanskrit Name"
                    className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-stone-300 bg-white"
                  />
                  <button
                    type="button"
                    onClick={handleAddIngredient}
                    className="px-3 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-800 rounded-lg text-xs font-semibold"
                  >
                    Add Herb
                  </button>
                </div>
              </div>
            </div>
          </AdminCard>

          {/* Section 4: Dosage & Warnings */}
          <AdminCard title="4. Dosage & Safety Instructions" subtitle="Clinical guidelines for safe customer consumption">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Recommended Dosage & Anupana (Vehicle)
                </label>
                <textarea
                  name="dosage"
                  rows={2}
                  value={formData.dosage}
                  onChange={handleChange}
                  placeholder="e.g. 1-2 teaspoons with warm water twice daily before meals."
                  className="w-full px-3.5 py-2 text-sm rounded-xl border border-stone-300 bg-white focus:ring-[#173D2A]"
                />
              </div>
            </div>
          </AdminCard>

          {/* Section 5: Variants & Sizes */}
          <AdminCard
            title="5. Product Variants (Sizes & Pack Options)"
            subtitle="Different weights, volumes, or tablet counts"
            action={
              <button
                type="button"
                onClick={handleAddVariant}
                className="text-xs font-semibold text-emerald-800 hover:underline inline-flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Variant</span>
              </button>
            }
          >
            <div className="space-y-3">
              {formData.variants.map((v, idx) => (
                <div
                  key={idx}
                  className="flex flex-wrap items-center gap-3 p-3 rounded-xl border border-stone-200 bg-stone-50/60"
                >
                  <div className="flex-1 min-w-[140px]">
                    <label className="block text-[10px] font-semibold text-stone-500 uppercase">
                      Variant Name
                    </label>
                    <input
                      type="text"
                      value={v.name}
                      onChange={(e) => handleUpdateVariant(idx, "name", e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-stone-300 bg-white"
                    />
                  </div>

                  <div className="w-28">
                    <label className="block text-[10px] font-semibold text-stone-500 uppercase">
                      Price (₹)
                    </label>
                    <input
                      type="number"
                      value={v.price}
                      onChange={(e) => handleUpdateVariant(idx, "price", e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-stone-300 bg-white"
                    />
                  </div>

                  <div className="w-24">
                    <label className="block text-[10px] font-semibold text-stone-500 uppercase">
                      Stock
                    </label>
                    <input
                      type="number"
                      value={v.stock}
                      onChange={(e) => handleUpdateVariant(idx, "stock", e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-stone-300 bg-white"
                    />
                  </div>

                  <button
                    type="button"
                    onClick={() => handleRemoveVariant(idx)}
                    className="p-1.5 text-stone-400 hover:text-rose-600 self-end mb-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </AdminCard>
        </div>

        {/* Right Sidebar (1 Column wide) */}
        <div className="space-y-6">
          {/* Card: Publishing & Placement */}
          <AdminCard title="Publishing & Visibility" subtitle="Storefront placement options">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Product Status
                </label>
                <select
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 bg-white focus:ring-[#173D2A]"
                >
                  <option value="Active">Active (Published)</option>
                  <option value="Draft">Draft (Hidden from store)</option>
                  <option value="Archived">Archived</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Primary Category *
                </label>
                <select
                  name="category"
                  value={formData.category}
                  onChange={(e) => {
                    const newCatName = e.target.value;
                    setFormData((prev) => ({
                      ...prev,
                      category: newCatName,
                      subcategory: "",
                      subcategoryId: "",
                    }));
                  }}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 bg-white focus:ring-[#173D2A]"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Subcategory
                </label>
                <select
                  name="subcategory"
                  value={formData.subcategory || ""}
                  onChange={(e) => {
                    const selectedName = e.target.value;
                    const selectedSub = currentSubcategories.find(
                      (s) => s.name === selectedName || s.slug === selectedName
                    );
                    setFormData((prev) => ({
                      ...prev,
                      subcategory: selectedName,
                      subcategoryId: selectedSub?.slug || selectedSub?.id || "",
                    }));
                  }}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 bg-white focus:ring-[#173D2A]"
                >
                  <option value="">-- None / Select Subcategory --</option>
                  {currentSubcategories.map((sub) => (
                    <option key={sub.id} value={sub.name}>
                      {sub.name}
                    </option>
                  ))}
                </select>
                {currentSubcategories.length === 0 && (
                  <p className="text-[10px] text-stone-400 mt-1 italic">
                    No subcategories defined for this category.
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-stone-700 mb-1">
                  Brand Line
                </label>
                <select
                  name="brand"
                  value={formData.brand}
                  onChange={handleChange}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 bg-white focus:ring-[#173D2A]"
                >
                  {brands.map((b) => (
                    <option key={b.id} value={b.name}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Toggles */}
              <div className="space-y-2.5 pt-3 border-t border-stone-100">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="isFeatured"
                    checked={formData.isFeatured}
                    onChange={handleChange}
                    className="w-4 h-4 rounded border-stone-300 text-[#173D2A] focus:ring-[#173D2A]"
                  />
                  <span className="text-xs font-medium text-stone-800">
                    Featured on Homepage
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="isBestseller"
                    checked={formData.isBestseller}
                    onChange={handleChange}
                    className="w-4 h-4 rounded border-stone-300 text-[#173D2A] focus:ring-[#173D2A]"
                  />
                  <span className="text-xs font-medium text-stone-800">
                    Bestseller Badge
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="isTrending"
                    checked={formData.isTrending}
                    onChange={handleChange}
                    className="w-4 h-4 rounded border-stone-300 text-[#173D2A] focus:ring-[#173D2A]"
                  />
                  <span className="text-xs font-medium text-stone-800">
                    Trending in Ayurveda
                  </span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="isNewArrival"
                    checked={formData.isNewArrival}
                    onChange={handleChange}
                    className="w-4 h-4 rounded border-stone-300 text-[#173D2A] focus:ring-[#173D2A]"
                  />
                  <span className="text-xs font-medium text-stone-800">
                    New Arrival Badge
                  </span>
                </label>
              </div>
            </div>
          </AdminCard>

          {/* Card: Media & Images Manager */}
          <AdminCard
            title="Product Media & Image Gallery"
            subtitle="Upload multiple images and designate one primary image"
          >
            <div className="space-y-4">
              {/* Upload Dropzone */}
              <label className="group flex flex-col items-center justify-center p-4 border-2 border-dashed border-stone-300 hover:border-[#173D2A] rounded-2xl bg-stone-50/80 hover:bg-emerald-50/40 transition-all cursor-pointer text-center">
                <div className="w-10 h-10 rounded-xl bg-white shadow-xs border border-stone-200 flex items-center justify-center text-emerald-800 mb-2 group-hover:scale-105 transition-transform">
                  <Upload className="w-5 h-5" />
                </div>
                <span className="text-xs font-semibold text-stone-800">
                  Upload Product Images
                </span>
                <span className="text-[10px] text-stone-500 mt-0.5">
                  Click or drag files (PNG, JPG, WEBP) • Multiple files allowed
                </span>
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />
              </label>

              {/* URL Input Alternative (Collapsible) */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowUrlInput(!showUrlInput)}
                  className="text-[11px] text-[#173D2A] hover:underline flex items-center gap-1 font-medium cursor-pointer"
                >
                  <Link2 className="w-3 h-3" />
                  <span>{showUrlInput ? "Hide image URL field" : "Or add by image URL"}</span>
                </button>

                {showUrlInput && (
                  <div className="flex gap-2 mt-2 animate-in fade-in duration-200">
                    <input
                      type="url"
                      value={newImageUrl}
                      onChange={(e) => setNewImageUrl(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddImageUrl();
                        }
                      }}
                      placeholder="https://images.unsplash.com/..."
                      className="flex-1 px-3 py-1.5 text-xs rounded-xl border border-stone-300 bg-white focus:outline-hidden focus:ring-1 focus:ring-[#173D2A]"
                    />
                    <button
                      type="button"
                      onClick={handleAddImageUrl}
                      className="px-3 py-1.5 bg-[#173D2A] hover:bg-[#0B2416] text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                    >
                      Add
                    </button>
                  </div>
                )}
              </div>

              {/* Gallery Grid */}
              <div className="pt-2 border-t border-stone-100">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-xs font-bold text-stone-700">
                    Product Gallery ({formData.images?.length || 0})
                  </label>
                  <span className="text-[10px] text-stone-400">
                    ★ Click button to set Primary
                  </span>
                </div>

                {formData.images && formData.images.length > 0 ? (
                  <div className="grid grid-cols-2 gap-2.5">
                    {formData.images.map((imgUrl, idx) => {
                      const isPrimary = formData.image === imgUrl || idx === 0;
                      return (
                        <div
                          key={idx}
                          className={`group relative rounded-xl overflow-hidden border-2 bg-stone-100 transition-all ${
                            isPrimary
                              ? "border-[#173D2A] ring-2 ring-[#A9D18E]/60 shadow-xs"
                              : "border-stone-200 hover:border-stone-400"
                          }`}
                        >
                          <div className="aspect-square w-full overflow-hidden flex items-center justify-center p-1 bg-white">
                            <img
                              src={imgUrl}
                              alt={`Product upload ${idx + 1}`}
                              className="w-full h-full object-contain"
                              onError={(e) => {
                                e.target.src =
                                  "/images/ProductImages/Ashuwaganda.png";
                              }}
                            />
                          </div>

                          {/* Primary Badge */}
                          {isPrimary ? (
                            <div className="absolute top-1.5 left-1.5 px-2 py-0.5 rounded-md text-[9px] font-bold bg-[#173D2A] text-white shadow-sm flex items-center gap-1">
                              <Star className="w-2.5 h-2.5 fill-amber-300 text-amber-300" />
                              <span>Primary</span>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleSetPrimary(imgUrl)}
                              className="absolute bottom-1.5 inset-x-1.5 py-1 px-1.5 bg-white/95 hover:bg-[#173D2A] hover:text-white text-[#173D2A] text-[10px] font-semibold rounded-md shadow-xs transition-colors flex items-center justify-center gap-1 cursor-pointer"
                              title="Make this the primary product image"
                            >
                              <Star className="w-3 h-3" />
                              <span>Set as Primary</span>
                            </button>
                          )}

                          {/* Remove button */}
                          <button
                            type="button"
                            onClick={() => handleRemoveImage(idx)}
                            className="absolute top-1.5 right-1.5 p-1 rounded-md bg-stone-900/60 hover:bg-rose-600 text-white shadow-xs transition-colors cursor-pointer"
                            title="Remove this image"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-4 text-center rounded-xl bg-stone-50 border border-stone-200 text-stone-400 text-xs">
                    No images added yet. Upload files above or add an image URL.
                  </div>
                )}

                <p className="text-[10px] text-stone-400 mt-2 leading-tight">
                  The <strong>Primary image</strong> is used as the main thumbnail in product cards, catalog lists, and search results. Secondary images appear in the product page gallery.
                </p>
              </div>
            </div>
          </AdminCard>

          {/* Card: Live Storefront Card Preview */}
          <AdminCard title="Storefront Card Preview" subtitle="How this product looks to customers">
            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
              <div className="bg-white rounded-xl border border-stone-200 overflow-hidden shadow-xs">
                <div className="relative aspect-square overflow-hidden bg-stone-100 flex items-center justify-center p-2">
                  <img
                    src={
                      formData.image ||
                      formData.images?.[0] ||
                      "/images/ProductImages/Ashuwaganda.png"
                    }
                    alt={formData.title}
                    className="w-full h-full object-contain"
                  />
                  {formData.isBestseller && (
                    <span className="absolute top-2 left-2 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500 text-white">
                      Bestseller
                    </span>
                  )}
                  {formData.isFeatured && (
                    <span className="absolute top-2 right-2 px-2 py-0.5 rounded text-[10px] font-bold bg-[#173D2A] text-white">
                      Featured
                    </span>
                  )}
                  {formData.isNewArrival && (
                    <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-600 text-white">
                      New
                    </span>
                  )}
                </div>

                {/* Multiple image thumbnails in preview */}
                {formData.images && formData.images.length > 1 && (
                  <div className="flex items-center gap-1.5 p-2 bg-stone-50/70 border-t border-stone-100 overflow-x-auto">
                    {formData.images.map((img, idx) => (
                      <div
                        key={idx}
                        className={`w-6 h-6 rounded border overflow-hidden shrink-0 ${
                          img === formData.image
                            ? "border-[#173D2A] ring-1 ring-[#173D2A]"
                            : "border-stone-200 opacity-60"
                        }`}
                      >
                        <img src={img} alt="" className="w-full h-full object-cover" />
                      </div>
                    ))}
                    <span className="text-[10px] text-stone-400 ml-auto whitespace-nowrap">
                      {formData.images.length} views
                    </span>
                  </div>
                )}

                <div className="p-3 border-t border-stone-100">
                  <span className="text-[10px] uppercase tracking-wider text-stone-400 font-semibold">
                    {formData.category}
                  </span>
                  <h4 className="font-semibold text-stone-900 text-xs line-clamp-1 mt-0.5">
                    {formData.title || "Product Title"}
                  </h4>
                  <div className="flex items-center gap-1.5 mt-2">
                    <span className="font-bold text-stone-900 text-sm">
                      {formatCurrency(formData.price)}
                    </span>
                    {Number(formData.compareAtPrice) > 0 && (
                      <span className="text-[11px] text-stone-400 line-through">
                        {formatCurrency(formData.compareAtPrice)}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </AdminCard>
        </div>
      </div>
    </form>
  );
};

