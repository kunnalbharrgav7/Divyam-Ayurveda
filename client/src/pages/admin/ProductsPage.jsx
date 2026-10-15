import React, { useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Plus,
  Search,
  Filter,
  Download,
  Trash2,
  Edit,
  Eye,
  ExternalLink,
  CheckCircle2,
  XCircle,
  Copy,
  AlertTriangle,
} from "lucide-react";
import { useAdmin } from "../../context/AdminContext";
import { AdminCard } from "../../components/admin/common/AdminCard";
import { AdminTable } from "../../components/admin/common/AdminTable";
import { ConfirmDialog } from "../../components/admin/common/AdminModal";
import { ProductQuickViewModal } from "../../components/admin/products/ProductQuickViewModal";
import { formatCurrency } from "../../utils/formatters";

export const ProductsPage = () => {
  const {
    products,
    categories,
    deleteProduct,
    saveProduct,
    deleteBulkProducts,
  } = useAdmin();
  const navigate = useNavigate();

  // Filters & State
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [stockFilter, setStockFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState([]);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState(null);
  const [quickViewProduct, setQuickViewProduct] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;

  // Filtered products list
  const filteredProducts = useMemo(() => {
    return (products || []).filter((p) => {
      const title = (p.title || p.name || "").toLowerCase();
      const sku = (p.sku || "").toLowerCase();
      const search = (searchTerm || "").trim().toLowerCase();

      // Resolve friendly category name for display/search
      const catObj = (categories || []).find(
        (c) =>
          c.id === p.categoryId ||
          c.slug === p.categoryId ||
          c.id === p.category ||
          c.slug === p.category ||
          c.name?.toLowerCase() === (p.category || "").toLowerCase()
      );
      const categoryDisplayName = (catObj?.name || p.category || p.categoryId || "").toLowerCase();
      const categoryRaw = (p.category || p.categoryId || "").toLowerCase();

      const matchSearch =
        !search ||
        title.includes(search) ||
        sku.includes(search) ||
        categoryRaw.includes(search) ||
        categoryDisplayName.includes(search);

      // Robust Category Filter
      let matchCategory = true;
      if (categoryFilter !== "all") {
        const filterKey = categoryFilter.toLowerCase();
        const selectedCat = (categories || []).find(
          (c) =>
            c.id?.toLowerCase() === filterKey ||
            c.slug?.toLowerCase() === filterKey ||
            c.name?.toLowerCase() === filterKey
        );

        const pCatName = (p.category || "").toLowerCase();
        const pCatId = (p.categoryId || "").toLowerCase();

        if (selectedCat) {
          const targetId = selectedCat.id?.toLowerCase();
          const targetSlug = selectedCat.slug?.toLowerCase();
          const targetName = selectedCat.name?.toLowerCase();

          matchCategory =
            pCatId === targetId ||
            pCatId === targetSlug ||
            pCatName === targetName ||
            pCatName === targetId ||
            pCatName === targetSlug;
        } else {
          matchCategory =
            pCatName === filterKey ||
            pCatId === filterKey ||
            categoryDisplayName === filterKey;
        }
      }

      // Status Filter
      const currentStatus = p.status || "Active";
      const matchStatus =
        statusFilter === "all" ||
        (statusFilter === "Active" &&
          currentStatus.toLowerCase() !== "draft" &&
          currentStatus.toLowerCase() !== "archived") ||
        currentStatus.toLowerCase() === statusFilter.toLowerCase();

      // Stock Level Filter
      const currentStock = p.stock !== undefined ? p.stock : (p.stockQuantity ?? 0);
      const threshold = p.reorderThreshold || 10;
      let matchStock = true;
      if (stockFilter === "low") {
        matchStock = currentStock > 0 && currentStock <= threshold;
      } else if (stockFilter === "out") {
        matchStock = currentStock <= 0;
      } else if (stockFilter === "in") {
        matchStock = currentStock > 0;
      }

      return matchSearch && matchCategory && matchStatus && matchStock;
    });
  }, [products, categories, searchTerm, categoryFilter, statusFilter, stockFilter]);

  // Pagination calculation
  const totalItems = filteredProducts.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredProducts.slice(start, start + pageSize);
  }, [filteredProducts, currentPage, pageSize]);

  // Selection handlers
  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedIds(paginatedData.map((p) => p.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleSelectRow = (id, checked) => {
    if (checked) {
      setSelectedIds((prev) => [...prev, id]);
    } else {
      setSelectedIds((prev) => prev.filter((item) => item !== id));
    }
  };

  // Actions
  const handleDeleteConfirm = () => {
    if (productToDelete) {
      deleteProduct(productToDelete);
      setProductToDelete(null);
      setDeleteConfirmOpen(false);
    }
  };

  const handleBulkDelete = () => {
    if (
      window.confirm(
        `Are you sure you want to delete ${selectedIds.length} selected products?`
      )
    ) {
      deleteBulkProducts(selectedIds);
      setSelectedIds([]);
    }
  };

  const handleToggleFeatured = (product) => {
    saveProduct({
      ...product,
      isFeatured: !product.isFeatured,
    });
    if (quickViewProduct && quickViewProduct.id === product.id) {
      setQuickViewProduct((prev) => ({
        ...prev,
        isFeatured: !prev.isFeatured,
      }));
    }
  };

  const handleDuplicate = (product) => {
    const duplicated = {
      ...product,
      id: "prod-" + Date.now(),
      title: `${product.title || product.name} (Copy)`,
      name: `${product.name || product.title} (Copy)`,
      sku: `${product.sku || "SKU"}-COPY`,
      createdAt: new Date().toISOString(),
    };
    saveProduct(duplicated);
  };

  const handleExportCSV = () => {
    const headers = ["ID", "Title", "SKU", "Category", "Price", "Stock", "Status"];
    const rows = filteredProducts.map((p) => [
      p.id,
      `"${(p.title || p.name || "").replace(/"/g, '""')}"`,
      p.sku || "",
      `"${p.category || p.categoryId || ""}"`,
      p.price,
      p.stock ?? p.stockQuantity ?? 0,
      p.status || "Active",
    ]);

    const csvContent =
      "data:text/csv;charset=utf-8," +
      [headers.join(","), ...rows.map((e) => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `divyam_products_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Define Table Columns
  const columns = [
    {
      header: "Product",
      cellClassName: "min-w-[240px]",
      render: (row) => (
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setQuickViewProduct(row)}
            className="group relative w-11 h-11 rounded-lg overflow-hidden border border-stone-200 flex-shrink-0 cursor-pointer text-left"
            title="Click to view product details"
          >
            <img
              src={row.image || (Array.isArray(row.images) ? row.images[0] : "") || "/images/ProductImages/Ashuwaganda.png"}
              alt={row.title || row.name || "Product"}
              className="w-full h-full object-cover transition-transform group-hover:scale-105"
            />
          </button>
          <div>
            <button
              type="button"
              onClick={() => setQuickViewProduct(row)}
              className="font-semibold text-stone-900 hover:text-emerald-800 transition-colors line-clamp-1 text-left cursor-pointer"
              title="Click to view product details"
            >
              {row.title || row.name || "Untitled Product"}
            </button>
            <div className="text-xs text-stone-400 mt-0.5">
              SKU: <span className="font-mono text-stone-600">{row.sku || "N/A"}</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      header: "Category",
      accessor: "category",
      render: (row) => {
        const catObj = (categories || []).find(
          (c) =>
            c.id === row.categoryId ||
            c.slug === row.categoryId ||
            c.id === row.category ||
            c.slug === row.category ||
            c.name?.toLowerCase() === (row.category || "").toLowerCase()
        );
        const displayName = catObj?.name || row.category || row.categoryId || "Ayurvedic Herbs";

        return (
          <span className="inline-block px-2.5 py-1 rounded-md text-xs font-medium bg-stone-100 text-stone-700">
            {displayName}
          </span>
        );
      },
    },
    {
      header: "Price",
      render: (row) => (
        <div>
          <span className="font-semibold text-stone-900">
            {formatCurrency(row.price)}
          </span>
          {row.compareAtPrice && (
            <span className="text-xs text-stone-400 line-through ml-1.5">
              {formatCurrency(row.compareAtPrice)}
            </span>
          )}
        </div>
      ),
    },
    {
      header: "Inventory",
      render: (row) => {
        const isLow = row.stock > 0 && row.stock <= (row.reorderThreshold || 10);
        const isOut = row.stock === 0;

        return (
          <div className="flex items-center gap-1.5">
            <span
              className={`font-semibold text-xs px-2 py-0.5 rounded-full ${
                isOut
                  ? "bg-rose-100 text-rose-800"
                  : isLow
                  ? "bg-amber-100 text-amber-800"
                  : "bg-emerald-100 text-emerald-800"
              }`}
            >
              {row.stock} in stock
            </span>
            {isLow && <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />}
          </div>
        );
      },
    },
    {
      header: "Status",
      render: (row) => (
        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${
            row.status === "Draft"
              ? "bg-stone-100 text-stone-600"
              : row.status === "Archived"
              ? "bg-rose-50 text-rose-700"
              : "bg-emerald-50 text-emerald-700"
          }`}
        >
          {row.status || "Active"}
        </span>
      ),
    },
    {
      header: "Featured",
      render: (row) => (
        <button
          type="button"
          onClick={() => handleToggleFeatured(row)}
          className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
            row.isFeatured
              ? "bg-amber-100 text-amber-900 border border-amber-200"
              : "bg-stone-100 text-stone-500 hover:bg-stone-200"
          }`}
        >
          {row.isFeatured ? "★ Featured" : "Standard"}
        </button>
      ),
    },
    {
      header: "Actions",
      align: "right",
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          {/* Quick View in Dashboard Modal */}
          <button
            type="button"
            onClick={() => setQuickViewProduct(row)}
            title="Quick view product details (Modal)"
            className="p-1.5 text-stone-400 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
          >
            <Eye className="w-4 h-4" />
          </button>

          {/* View Live on Website Storefront */}
          <Link
            to={`/products/${row.slug}`}
            title="View live on website storefront"
            className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
          </Link>

          {/* Duplicate Product */}
          <button
            type="button"
            onClick={() => handleDuplicate(row)}
            title="Duplicate product"
            className="p-1.5 text-stone-400 hover:text-stone-700 hover:bg-stone-100 rounded-lg transition-colors cursor-pointer"
          >
            <Copy className="w-4 h-4" />
          </button>

          {/* Edit Product Formulation */}
          <Link
            to={`/admin/products/${row.id}/edit`}
            title="Edit product"
            className="p-1.5 text-stone-400 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg transition-colors"
          >
            <Edit className="w-4 h-4" />
          </Link>

          {/* Delete Product */}
          <button
            type="button"
            onClick={() => {
              setProductToDelete(row.id);
              setDeleteConfirmOpen(true);
            }}
            title="Delete product"
            className="p-1.5 text-stone-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 font-sans tracking-tight">
            Product Catalog Management
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Manage your Ayurvedic remedies, pricing, inventory stock, and storefront visibility.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-stone-300 bg-white hover:bg-stone-50 text-stone-700 text-xs font-semibold shadow-xs transition-colors"
          >
            <Download className="w-4 h-4 text-stone-500" />
            <span>Export CSV</span>
          </button>

          <Link
            to="/admin/products/new"
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#173D2A] text-white hover:bg-[#0B2416] text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span>Add New Product</span>
          </Link>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <AdminCard noPadding={true}>
        <div className="p-4 border-b border-stone-100 flex flex-wrap items-center justify-between gap-3 bg-stone-50/50">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              type="text"
              placeholder="Search by title, SKU, or category..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-stone-300 bg-white focus:outline-hidden focus:ring-1 focus:ring-[#173D2A] focus:border-[#173D2A]"
            />
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Category */}
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 text-xs rounded-xl border border-stone-300 bg-white text-stone-700 focus:ring-[#173D2A]"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Stock Level */}
            <select
              value={stockFilter}
              onChange={(e) => {
                setStockFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 text-xs rounded-xl border border-stone-300 bg-white text-stone-700 focus:ring-[#173D2A]"
            >
              <option value="all">All Stock Levels</option>
              <option value="in">In Stock</option>
              <option value="low">Low Stock (≤ 10)</option>
              <option value="out">Out of Stock (0)</option>
            </select>

            {/* Publishing Status */}
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="px-3 py-2 text-xs rounded-xl border border-stone-300 bg-white text-stone-700 focus:ring-[#173D2A]"
            >
              <option value="all">All Statuses</option>
              <option value="Active">Active</option>
              <option value="Draft">Draft</option>
              <option value="Archived">Archived</option>
            </select>

            {/* Clear Filters Button */}
            {(searchTerm ||
              categoryFilter !== "all" ||
              stockFilter !== "all" ||
              statusFilter !== "all") && (
              <button
                type="button"
                onClick={() => {
                  setSearchTerm("");
                  setCategoryFilter("all");
                  setStockFilter("all");
                  setStatusFilter("all");
                  setCurrentPage(1);
                }}
                className="inline-flex items-center gap-1 px-3 py-2 text-xs font-semibold rounded-xl text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition-colors cursor-pointer"
                title="Reset all search & filter criteria"
              >
                <XCircle className="w-3.5 h-3.5 text-rose-500" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>

        {/* Bulk Action Toolbar if items are selected */}
        {selectedIds.length > 0 && (
          <div className="bg-emerald-50 px-4 py-2.5 flex items-center justify-between border-b border-emerald-100 text-xs">
            <span className="font-semibold text-emerald-900">
              {selectedIds.length} product(s) selected
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleBulkDelete}
                className="inline-flex items-center gap-1 px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg font-semibold shadow-xs transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete Selected</span>
              </button>
            </div>
          </div>
        )}

        {/* Data Table */}
        <AdminTable
          columns={columns}
          data={paginatedData}
          keyField="id"
          selectable={true}
          selectedIds={selectedIds}
          onSelectAll={handleSelectAll}
          onSelectRow={handleSelectRow}
          emptyMessage="No products match your search or filter criteria."
          pagination={{
            currentPage,
            pageSize,
            totalItems,
            totalPages,
            onPageChange: setCurrentPage,
          }}
        />
      </AdminCard>

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        isOpen={deleteConfirmOpen}
        onClose={() => setDeleteConfirmOpen(false)}
        onConfirm={handleDeleteConfirm}
        title="Delete Ayurvedic Product"
        message="Are you sure you want to delete this product? It will immediately be removed from the catalog and customer storefront."
        confirmText="Delete Product"
        confirmVariant="danger"
      />

      {/* Product Quick View Modal */}
      <ProductQuickViewModal
        isOpen={Boolean(quickViewProduct)}
        onClose={() => setQuickViewProduct(null)}
        product={quickViewProduct}
        onToggleFeatured={handleToggleFeatured}
      />
    </div>
  );
};

