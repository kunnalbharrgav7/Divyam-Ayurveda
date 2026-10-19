import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { orderService } from "../services/api";
import { useAuth } from "./AuthContext";
import { getStatusLabel } from "../utils/orderStatus";

export const OrderContext = createContext();

export const OrderProvider = ({ children }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user, authFetch, hasBackendSession } = useAuth();
  const fetchRef = useRef(authFetch);
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
    const newOrder = await orderService.createOrder(orderPayload);
    setOrders((prev) => [newOrder, ...prev]);
    return newOrder;
  };

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
