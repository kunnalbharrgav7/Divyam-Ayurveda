import React, { createContext, useContext, useState, useEffect, useRef, useCallback } from "react";
import { useAuth } from "./AuthContext";

const ReturnContext = createContext(null);

const POLL_MS = 20000;

// Customer returns: eligibility per order, my return requests, store credit. Kept live by polling + refresh on focus.
export const ReturnProvider = ({ children }) => {
  const { user, authFetch, hasBackendSession } = useAuth();
  const [returns, setReturns] = useState([]);
  const [eligibility, setEligibility] = useState({});
  const [options, setOptions] = useState({ windowDays: 7, reasons: [] });
  const [storeCredit, setStoreCredit] = useState(0);
  const [loading, setLoading] = useState(false);

  // authFetch is re-created every render; keep the latest in a ref so effects stay mount-only
  const fetchRef = useRef(authFetch);
  fetchRef.current = authFetch;

  const getJson = async (path) => {
    const res = await fetchRef.current(path);
    if (!res.ok) return null;
    const json = await res.json();
    return json.success ? json.data : null;
  };

  const refresh = useCallback(async () => {
    try {
      const [mine, map, credit] = await Promise.all([
        getJson("/api/v1/me/returns"),
        getJson("/api/v1/me/returns/eligibility"),
        getJson("/api/v1/me/store-credit"),
      ]);
      if (Array.isArray(mine)) setReturns(mine);
      if (map) setEligibility(map);
      if (credit) setStoreCredit(Number(credit.storeCredit) || 0);
    } catch (_) {}
  }, []);

  const session = hasBackendSession ? user?.id : null;

  useEffect(() => {
    if (!session) {
      setReturns([]);
      setEligibility({});
      setStoreCredit(0);
      return undefined;
    }
    setLoading(true);
    refresh().finally(() => setLoading(false));
    getJson("/api/v1/me/return-options").then((o) => o && setOptions(o)).catch(() => {});

    const tick = () => document.visibilityState === "visible" && refresh();
    const timer = setInterval(tick, POLL_MS);
    window.addEventListener("focus", tick);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", tick);
      document.removeEventListener("visibilitychange", tick);
    };
  }, [session]);

  const send = async (path, body) => {
    const res = await fetchRef.current(path, { method: "POST", body: JSON.stringify(body || {}) });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.success) throw new Error(json?.error?.message || "Something went wrong. Please try again.");
    return json.data;
  };

  const createReturn = async (orderNumber, payload) => {
    const created = await send(`/api/v1/me/orders/${encodeURIComponent(orderNumber)}/returns`, payload);
    await refresh();
    // The order is now "return requested": let the order list pick it up
    window.dispatchEvent(new CustomEvent("divyam_order_updated", { detail: { orderNumber, id: orderNumber, status: "Return Requested", rawStatus: "return_requested" } }));
    return created;
  };

  const cancelReturn = async (id, orderNumber) => {
    const updated = await send(`/api/v1/me/returns/${id}/cancel`);
    await refresh();
    window.dispatchEvent(new CustomEvent("divyam_order_updated", { detail: { orderNumber, id: orderNumber, status: "Delivered", rawStatus: "delivered" } }));
    return updated;
  };

  const getReturnForOrder = (orderNumber) =>
    returns.find((r) => r.orderNumber === orderNumber && r.status !== "cancelled") || null;

  return (
    <ReturnContext.Provider
      value={{ returns, eligibility, options, storeCredit, loading, refresh, createReturn, cancelReturn, getReturnForOrder }}
    >
      {children}
    </ReturnContext.Provider>
  );
};

export const useReturns = () => {
  const ctx = useContext(ReturnContext);
  if (!ctx) throw new Error("useReturns must be used within a ReturnProvider");
  return ctx;
};
