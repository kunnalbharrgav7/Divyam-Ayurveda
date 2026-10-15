import React, { createContext, useContext, useState, useEffect } from "react";
import { orderService } from "../services/api";

const OrderContext = createContext();

export const OrderProvider = ({ children }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const data = await orderService.getAllOrders();
        setOrders(data);
      } catch (err) {
        console.error("Failed to load orders:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchOrders();
  }, []);

  const placeOrder = async (orderPayload) => {
    const newOrder = await orderService.createOrder(orderPayload);
    setOrders((prev) => [newOrder, ...prev]);
    return newOrder;
  };

  const getOrderById = async (orderId) => {
    const order = orders.find((o) => o.id === orderId);
    if (order) return order;
    return await orderService.getOrderById(orderId);
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

