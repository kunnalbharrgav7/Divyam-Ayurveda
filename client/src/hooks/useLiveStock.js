import { useCallback, useEffect, useMemo, useState } from "react";
import { productService } from "../services/api";

/**
 * Keeps a { [productId]: { available, stockQuantity, variants } } map fresh for the given products.
 * Cart and wishlist hold snapshots taken when the item was added, so this is the source of truth
 * for "is it still in stock?". Refreshes on mount, when the id set changes, and when the tab regains focus.
 */
export const useLiveStock = (products) => {
  const idsKey = useMemo(
    () => [...new Set((products || []).map((p) => p?.id).filter(Boolean))].sort().join(","),
    [products]
  );
  const [stockMap, setStockMap] = useState({});

  const refresh = useCallback(async () => {
    if (!idsKey) {
      setStockMap({});
      return;
    }
    const rows = await productService.getStockByIds(idsKey.split(","));
    if (rows) setStockMap(Object.fromEntries(rows.map((r) => [r.id, r])));
  }, [idsKey]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    window.addEventListener("focus", refresh);
    return () => window.removeEventListener("focus", refresh);
  }, [refresh]);

  return { stockMap, refresh };
};

/**
 * Units available for a product (optionally a specific pack size), preferring live data over the
 * snapshot stored on the product. Returns Infinity when stock is unknown.
 */
export const getAvailableUnits = (product, selectedSize, live) => {
  if (live) {
    if (live.available === false) return 0;
    const variant = live.variants?.find((v) => (v.size || v.label) === selectedSize);
    if (variant && Number.isFinite(variant.stock)) return variant.stock;
    if (Number.isFinite(live.stockQuantity)) return live.stockQuantity;
  }
  const snapshot = product?.stockQuantity ?? product?.stock;
  return Number.isFinite(snapshot) ? snapshot : Infinity;
};
