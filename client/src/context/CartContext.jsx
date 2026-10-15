import React, { createContext, useContext, useState, useEffect } from "react";
import { storage } from "../utils/storage";

const CartContext = createContext();

const CART_STORAGE_KEY = "divyam_ayurveda_cart";

export const CartProvider = ({ children }) => {
  const [cartItems, setCartItems] = useState(() => {
    return storage.get(CART_STORAGE_KEY, []);
  });

  useEffect(() => {
    storage.set(CART_STORAGE_KEY, cartItems);
  }, [cartItems]);

  const addToCart = (product, quantity = 1, variant = null) => {
    setCartItems((prevItems) => {
      const selectedSize = variant ? variant.size : product.packSize;
      const selectedPrice = variant ? variant.price : product.price;
      const selectedOriginalPrice = variant ? variant.originalPrice : product.originalPrice;

      const existingIndex = prevItems.findIndex(
        (item) => item.product.id === product.id && item.selectedSize === selectedSize
      );

      if (existingIndex > -1) {
        const updated = [...prevItems];
        const newQty = Math.min(
          updated[existingIndex].quantity + quantity,
          product.stockQuantity || 99
        );
        updated[existingIndex] = {
          ...updated[existingIndex],
          quantity: newQty,
        };
        return updated;
      } else {
        return [
          ...prevItems,
          {
            product,
            selectedSize,
            price: selectedPrice,
            originalPrice: selectedOriginalPrice,
            quantity: Math.min(quantity, product.stockQuantity || 99),
          },
        ];
      }
    });
  };

  const removeFromCart = (productId, selectedSize) => {
    setCartItems((prevItems) =>
      prevItems.filter(
        (item) => !(item.product.id === productId && item.selectedSize === selectedSize)
      )
    );
  };

  const updateQuantity = (productId, selectedSize, quantity) => {
    if (quantity <= 0) {
      removeFromCart(productId, selectedSize);
      return;
    }
    setCartItems((prevItems) =>
      prevItems.map((item) => {
        if (item.product.id === productId && item.selectedSize === selectedSize) {
          const maxStock = item.product.stockQuantity || 99;
          return {
            ...item,
            quantity: Math.min(quantity, maxStock),
          };
        }
        return item;
      })
    );
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const cartCount = cartItems.reduce((acc, item) => acc + item.quantity, 0);

  const subtotal = cartItems.reduce(
    (acc, item) => acc + item.price * item.quantity,
    0
  );

  const originalSubtotal = cartItems.reduce(
    (acc, item) =>
      acc + (item.originalPrice || item.price) * item.quantity,
    0
  );

  const discountTotal = originalSubtotal - subtotal;

  // Free shipping above ₹499
  const shippingFee = subtotal === 0 || subtotal >= 499 ? 0 : 49;

  const total = subtotal + shippingFee;

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        cartCount,
        subtotal,
        originalSubtotal,
        discountTotal,
        shippingFee,
        total,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within a CartProvider");
  }
  return context;
};

