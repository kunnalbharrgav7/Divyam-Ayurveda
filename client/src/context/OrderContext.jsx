import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { orderService } from "../services/api";
import { useAuth } from "./AuthContext";
import { getStatusLabel } from "../utils/orderStatus";
import { getClaimToken, forgetClaimToken, takePendingClaim } from "../utils/guestOrders";

export const OrderContext = createContext();

export const OrderProvider = ({ children }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user, authFetch, hasBackendSession } = useAuth();
  const fetchRef = useRef(authFetch);
  const syncRef = useRef();
  fetchRef.current = authFetch;

  // Keep the signed-in customer's orders in step with the server (status, delivery date, returns)
  const session = hasBackendSession ? user?.id : null;
  useEffect(() => {
    // Never carry one account's orders over to another: start empty for every session change
    setOrders([]);
    if (!session) {
      setLoading(false);
      return undefined;
    }
    let cancelled = false;
    const sync = async () => {
      try {
        const res = await fetchRef.current("/api/v1/me/orders");
        if (!res.ok || cancelled) return;
        const json = await res.json();
        if (!json.success || !Array.isArray(json.data) || cancelled) return;
        setOrders((prev) => {
          const byId = new Map(prev.map((o) => [o.orderNumber || o.id, o]));
          return json.data.map((raw) => ({
            ...(byId.get(raw.orderNumber) || {}),
            ...raw,
            id: raw.orderNumber,
            status: getStatusLabel(raw.status),
            rawStatus: raw.status,
          }));
        });
      } catch (_) {
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    setLoading(true);
    sync();
    syncRef.current = sync;
    const tick = () => document.visibilityState === "visible" && sync();
    const timer = setInterval(tick, 20000);
    window.addEventListener("focus", tick);

    const handleOrderUpdate = (e) => {
      const updated = e.detail;
      if (!updated) return;
      setOrders((prev) =>
        prev.map((o) =>
          o.id === updated.id || o.orderNumber === updated.orderNumber || o.id === updated.orderNumber ? { ...o, ...updated } : o
        )
      );
    };
    window.addEventListener("divyam_order_updated", handleOrderUpdate);
    return () => {
      cancelled = true;
      clearInterval(timer);
      window.removeEventListener("focus", tick);
      window.removeEventListener("divyam_order_updated", handleOrderUpdate);
    };
  }, [session]);

  const placeOrder = async (orderPayload) => {
    // A signed-in customer's session may have just gone stale (access tokens are short-lived): this call renews it
    // when needed, so the order is saved to their account instead of as a guest order.
    if (hasBackendSession) {
      try {
        await fetchRef.current("/api/v1/me/orders");
      } catch (_) {}
    }
    const newOrder = await orderService.createOrder(orderPayload, { accessToken: hasBackendSession ? user?.accessToken : null });
    setOrders((prev) => [newOrder, ...prev]);
    return newOrder;
  };

  /**
   * Link a guest order placed on this device to the signed-in account (one-time claim token).
   * Only ever called because the customer asked for it. Returns { ok, message }.
   */
  const claimGuestOrder = async (orderNumber) => {
    const claimToken = getClaimToken(orderNumber);
    if (!claimToken) return { ok: false, message: "This order can no longer be added from this device. You can still track it with your tracking code." };
    if (!session) return { ok: false, message: "Please sign in first." };
    try {
      const res = await fetchRef.current("/api/v1/orders/claim", { method: "POST", body: JSON.stringify({ claimToken }) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json.success) {
        // Used, expired or already linked: the token is useless now either way
        if (res.status === 400) forgetClaimToken(orderNumber);
        return { ok: false, message: json?.error?.message || "Could not add this order to your account." };
      }
      forgetClaimToken(orderNumber);
      const raw = json.data;
      setOrders((prev) => [
        { ...raw, id: raw.orderNumber, status: getStatusLabel(raw.status), rawStatus: raw.status },
        ...prev.filter((o) => (o.orderNumber || o.id) !== raw.orderNumber),
      ]);
      return { ok: true, message: `Order ${raw.orderNumber} is now in your account.` };
    } catch (_) {
      return { ok: false, message: "Cannot reach the server. Please try again." };
    }
  };

  // "Save to my account" chosen before signing in: finish it once the customer has signed in / registered
  const [claimNotice, setClaimNotice] = useState(null);
  useEffect(() => {
    if (!session) return;
    const pending = takePendingClaim();
    if (!pending) return;
    claimGuestOrder(pending).then((result) => setClaimNotice({ orderNumber: pending, ...result }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session]);

  const getOrderById = async (orderId) => {
    if (!orderId) return null;
    try {
      const live = await orderService.getOrderById(orderId);
      if (live) {
        setOrders((prev) => {
          const idx = prev.findIndex((o) => o.id === orderId || o.orderNumber === orderId);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = live;
            return next;
          }
          return [live, ...prev];
        });
        return live;
      }
    } catch (err) {
      console.warn("Failed to fetch fresh order from API:", err);
    }
    const order = orders.find((o) => o.id === orderId || o.orderNumber === orderId);
    return order || null;
  };

  return (
    <OrderContext.Provider
      value={{
        orders,
        loading,
        placeOrder,
        getOrderById,
        claimGuestOrder,
        claimNotice,
        clearClaimNotice: () => setClaimNotice(null),
        refreshOrders: () => syncRef.current?.(),
      }}
    >
      {children}
    </OrderContext.Provider>
  );
};

export const useOrders = () => {
  const context = useContext(OrderContext);
  if (!context) {
    throw new Error("useOrders must be used within an OrderProvider");
  }
  return context;
};

export default OrderContext;
