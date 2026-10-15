import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Boxes,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Plus,
  Minus,
  Search,
  Filter,
  ArrowUpDown,
  History,
} from "lucide-react";
import { useAdmin } from "../../context/AdminContext";
import { AdminCard, StatCard } from "../../components/admin/common/AdminCard";
import { AdminTable } from "../../components/admin/common/AdminTable";
import { AdminModal } from "../../components/admin/common/AdminModal";
import { formatCurrency } from "../../utils/formatters";

export const InventoryPage = () => {
  const { products, updateProductStock, auditLogs } = useAdmin();

  const [searchTerm, setSearchTerm] = useState("");
  const [filterHealth, setFilterHealth] = useState("all");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [adjustType, setAdjustType] = useState("add"); // "add", "subtract", "set"
  const [adjustAmount, setAdjustAmount] = useState(10);
  const [adjustReason, setAdjustReason] = useState("Warehouse Stock Inward (Supplier)");
  const [adjustNote, setAdjustNote] = useState("");

  // Filtered Inventory List
  const filteredInventory = useMemo(() => {
    return (products || []).filter((p) => {
      const title = (p.title || p.name || "").toLowerCase();
      const sku = (p.sku || "").toLowerCase();
      const category = (p.category || p.categoryId || "").toLowerCase();
      const search = (searchTerm || "").trim().toLowerCase();

      const matchSearch =
        !search ||
        title.includes(search) ||
        sku.includes(search) ||
        category.includes(search);

      const threshold = p.reorderThreshold || 10;
      const currentStock = p.stock !== undefined ? p.stock : (p.stockQuantity ?? 0);
      let matchHealth = true;
      if (filterHealth === "low") {
        matchHealth = currentStock > 0 && currentStock <= threshold;
      } else if (filterHealth === "out") {
        matchHealth = currentStock === 0;
      } else if (filterHealth === "good") {
        matchHealth = currentStock > threshold;
      }

      return matchSearch && matchHealth;
    });
  }, [products, searchTerm, filterHealth]);

  // Inventory KPI calculations
  const totalUnits = products.reduce((acc, p) => acc + (p.stock || 0), 0);
  const totalValue = products.reduce(
    (acc, p) => acc + (p.stock || 0) * (p.price || 0),
    0
  );
  const lowCount = products.filter(
    (p) => p.stock > 0 && p.stock <= (p.reorderThreshold || 10)
  ).length;
  const outCount = products.filter((p) => p.stock === 0).length;

  // Open adjustment modal for a product
  const handleOpenAdjust = (prod) => {
    setSelectedProduct(prod);
    setAdjustType("add");
    setAdjustAmount(10);
    setAdjustReason("Warehouse Stock Inward (Supplier)");
    setAdjustNote("");
    setAdjustModalOpen(true);
  };

  // Execute stock adjustment
  const handleExecuteAdjust = (e) => {
    e.preventDefault();
    if (!selectedProduct) return;

    let newStock = selectedProduct.stock;
    const qty = Number(adjustAmount);

    if (adjustType === "add") {
      newStock += qty;
    } else if (adjustType === "subtract") {
      newStock = Math.max(0, newStock - qty);
    } else if (adjustType === "set") {
      newStock = Math.max(0, qty);
    }

    const fullReason = `${adjustReason}${adjustNote ? ` - Note: ${adjustNote}` : ""}`;
    updateProductStock(selectedProduct.id, newStock, fullReason);
    setAdjustModalOpen(false);
  };

  const columns = [
    {
      header: "Product / SKU",
      cellClassName: "min-w-[240px]",
      render: (row) => (
        <div className="flex items-center gap-3">
          <img
            src={row.image || (Array.isArray(row.images) ? row.images[0] : "") || "/images/ProductImages/Ashuwaganda.png"}
            alt={row.title || row.name || "Product"}
            className="w-10 h-10 rounded-lg object-cover border border-stone-200 flex-shrink-0"
          />
          <div>
            <div className="font-semibold text-stone-900 line-clamp-1">
              {row.title || row.name || "Untitled Product"}
            </div>
            <div className="text-xs text-stone-400">
              SKU: <span className="font-mono text-stone-600">{row.sku || "N/A"}</span> • {row.category || row.categoryId}
            </div>
          </div>
        </div>
      ),
    },
    {
      header: "Unit Price",
      render: (row) => (
        <span className="font-semibold text-stone-900">
          {formatCurrency(row.price)}
        </span>
      ),
    },
    {
      header: "Available Stock",
      render: (row) => (
        <div className="flex items-center gap-2">
          <span className="font-bold text-stone-900 text-sm">{row.stock}</span>
          <span className="text-xs text-stone-400">units</span>
        </div>
      ),
    },
    {
      header: "Reorder Level",
      render: (row) => (
        <span className="text-xs text-stone-600 font-mono">
          {row.reorderThreshold || 10} units
        </span>
      ),
    },
    {
      header: "Stock Health",
      render: (row) => {
        const threshold = row.reorderThreshold || 10;
        if (row.stock === 0) {
          return (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800">
              <XCircle className="w-3.5 h-3.5" />
              <span>Out of Stock</span>
            </span>
          );
        }
        if (row.stock <= threshold) {
          return (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Low Inventory</span>
            </span>
          );
        }
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Optimal</span>
          </span>
        );
      },
    },
    {
      header: "Total Value",
      render: (row) => (
        <span className="text-xs font-semibold text-stone-700">
          {formatCurrency(row.stock * row.price)}
        </span>
      ),
    },
    {
      header: "Stock Action",
      align: "right",
      render: (row) => (
        <button
          type="button"
          onClick={() => handleOpenAdjust(row)}
          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-stone-200 bg-white hover:bg-stone-50 text-stone-800 text-xs font-semibold shadow-2xs hover:border-[#173D2A] transition-colors"
        >
          <ArrowUpDown className="w-3.5 h-3.5 text-stone-500" />
          <span>Adjust Stock</span>
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 font-sans tracking-tight">
            Inventory & Warehouse Control
          </h1>
          <p className="text-xs sm:text-sm text-stone-500 mt-1">
            Track real-time herbal extract inventory, trigger restocks, and log stock adjustments.
          </p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Total Units on Hand"
          value={totalUnits.toLocaleString()}
          subtitle="across all active SKUs"
          icon={Boxes}
          color="emerald"
        />

        <StatCard
          title="Inventory Valuation"
          value={formatCurrency(totalValue)}
          subtitle="retail market value"
          icon={Boxes}
          color="stone"
        />

        <StatCard
          title="Low Stock Alerts"
          value={lowCount}
          badgeText={lowCount > 0 ? "Requires Reorder" : "Healthy"}
          subtitle="SKUs ≤ minimum threshold"
          icon={AlertTriangle}
          color={lowCount > 0 ? "amber" : "emerald"}
        />

        <StatCard
          title="Stockouts (0 Units)"
          value={outCount}
          badgeText={outCount > 0 ? "Urgent Attention" : "None"}
          subtitle="unorderable products"
          icon={XCircle}
          color={outCount > 0 ? "rose" : "emerald"}
        />
      </div>

      {/* Main Table Card */}
      <AdminCard noPadding={true}>
        <div className="p-4 border-b border-stone-100 flex flex-wrap items-center justify-between gap-3 bg-stone-50/50">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[240px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
            <input
              type="text"
              placeholder="Search by SKU, herbal product title, or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-xs sm:text-sm rounded-xl border border-stone-300 bg-white focus:ring-[#173D2A]"
            />
          </div>

          {/* Health Filter */}
          <div className="flex items-center gap-2">
            <select
              value={filterHealth}
              onChange={(e) => setFilterHealth(e.target.value)}
              className="px-3 py-2 text-xs rounded-xl border border-stone-300 bg-white text-stone-700 focus:ring-[#173D2A]"
            >
              <option value="all">All Inventory Health</option>
              <option value="good">Optimal Stock (&gt; Threshold)</option>
              <option value="low">Low Inventory Warning (≤ Threshold)</option>
              <option value="out">Out of Stock (0 units)</option>
            </select>
          </div>
        </div>

        <AdminTable
          columns={columns}
          data={filteredInventory}
          keyField="id"
          emptyMessage="No inventory items found matching your filters."
        />
      </AdminCard>

      {/* Adjust Stock Modal */}
      {selectedProduct && (
        <AdminModal
          isOpen={adjustModalOpen}
          onClose={() => setAdjustModalOpen(false)}
          title={`Adjust Inventory: ${selectedProduct.title}`}
          subtitle={`Current stock: ${selectedProduct.stock} units (SKU: ${selectedProduct.sku || "N/A"})`}
          footer={
            <>
              <button
                type="button"
                onClick={() => setAdjustModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteAdjust}
                className="px-4 py-2 text-xs font-semibold bg-[#173D2A] text-white hover:bg-[#0B2416] rounded-xl shadow-xs"
              >
                Apply Inventory Adjustment
              </button>
            </>
          }
        >
          <form onSubmit={handleExecuteAdjust} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Adjustment Type
              </label>
              <div className="grid grid-cols-3 gap-2">
                <button
                  type="button"
                  onClick={() => setAdjustType("add")}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition-colors ${
                    adjustType === "add"
                      ? "bg-emerald-50 border-emerald-500 text-emerald-800"
                      : "bg-white border-stone-300 text-stone-700 hover:bg-stone-50"
                  }`}
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Units (+)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAdjustType("subtract")}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition-colors ${
                    adjustType === "subtract"
                      ? "bg-rose-50 border-rose-500 text-rose-800"
                      : "bg-white border-stone-300 text-stone-700 hover:bg-stone-50"
                  }`}
                >
                  <Minus className="w-3.5 h-3.5" />
                  <span>Deduct Units (-)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setAdjustType("set")}
                  className={`py-2 px-3 rounded-xl text-xs font-semibold border flex items-center justify-center gap-1.5 transition-colors ${
                    adjustType === "set"
                      ? "bg-blue-50 border-blue-500 text-blue-800"
                      : "bg-white border-stone-300 text-stone-700 hover:bg-stone-50"
                  }`}
                >
                  <span>Set Exactly (=)</span>
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Quantity
              </label>
              <input
                type="number"
                min="1"
                value={adjustAmount}
                onChange={(e) => setAdjustAmount(Math.max(1, Number(e.target.value)))}
                required
                className="w-full px-3.5 py-2 text-sm rounded-xl border border-stone-300 bg-white"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Reason for Adjustment
              </label>
              <select
                value={adjustReason}
                onChange={(e) => setAdjustReason(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 bg-white text-stone-700"
              >
                <option value="Warehouse Stock Inward (Supplier)">
                  Warehouse Stock Inward (Supplier Batch Restock)
                </option>
                <option value="Cycle Count / Physical Audit Reconciliation">
                  Cycle Count / Physical Audit Reconciliation
                </option>
                <option value="Damaged Goods / Packaging Defect">
                  Damaged Goods / Packaging Defect
                </option>
                <option value="Batch Expiry / Laboratory Disposal">
                  Batch Expiry / Laboratory Disposal
                </option>
                <option value="Customer Return Restocked">
                  Customer Return Restocked
                </option>
                <option value="Physician Clinical Sampling / Promotional">
                  Physician Clinical Sampling / Promotional
                </option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-stone-700 mb-1">
                Internal Audit Note (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Batch #HRD-2026-9 received via DHL freight"
                value={adjustNote}
                onChange={(e) => setAdjustNote(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 bg-white"
              />
            </div>

            <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 text-xs">
              <span className="text-stone-500">Resulting New Stock: </span>
              <span className="font-bold text-stone-900">
                {adjustType === "add"
                  ? selectedProduct.stock + Number(adjustAmount)
                  : adjustType === "subtract"
                  ? Math.max(0, selectedProduct.stock - Number(adjustAmount))
                  : Number(adjustAmount)}{" "}
                units
              </span>
            </div>
          </form>
        </AdminModal>
      )}
    </div>
  );
};

