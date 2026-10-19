import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { storage } from "../utils/storage";
import { useAuth } from "./AuthContext";
import { useLiveStock, getAvailableUnits } from "../hooks/useLiveStock";
import { compactCartItems } from "../utils/productSnapshot";

const CartContext = createContext();

// Saved carts may hold oversized legacy product snapshots; shrink them as they are read
const readCartItems = (key) => compactCartItems(storage.get(key, []));

/**
 * Returns a user-scoped storage key.
 * - When not logged in (guest): 'divyam_ayurveda_cart_guest'
 * - When logged in (customer/admin): 'divyam_ayurveda_cart_{userId}'
 */
const getCartStorageKey = (user) => {
  if (!user) return "divyam_ayurveda_cart_guest";
  const identifier = user.id || user._id || user.email?.toLowerCase().replace(/[^a-z0-9]/g, "_");
  return `divyam_ayurveda_cart_${identifier}`;
};

export const CartProvider = ({ children }) => {
  const { user } = useAuth();
  const currentKey = getCartStorageKey(user);
  const prevUserKeyRef = useRef(currentKey);

  // Initialize cart state from current user (or guest) storage
  const [cartItems, setCartItems] = useState(() => {
    // Migration: clear stale un-scoped global key if present so it doesn't pollute guests
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("divyam_ayurveda_cart");
      } catch (e) {
        // ignore
      }
    }
    const key = getCartStorageKey(user);
    const stored = readCartItems(key);
    return Array.isArray(stored) ? stored : [];
  });

  // Handle user login / logout / switch transitions
  useEffect(() => {
    const prevKey = prevUserKeyRef.current;
    const activeKey = getCartStorageKey(user);

    if (prevKey !== activeKey) {
      if (prevKey === "divyam_ayurveda_cart_guest" && user) {
        // CASE 1: Guest -> Logged in Customer
        // 1. Get items added by guest before logging in
        const guestItems = readCartItems("divyam_ayurveda_cart_guest");
        // 2. Get this user's previously saved cart
        const userSavedCart = readCartItems(activeKey);

        // 3. Merge guest items into customer's saved cart without duplicates
        let mergedCart = Array.isArray(userSavedCart) ? [...userSavedCart] : [];
        if (Array.isArray(guestItems) && guestItems.length > 0) {
          guestItems.forEach((gItem) => {
            const existingIndex = mergedCart.findIndex(
              (item) =>
                item.product?.id === gItem.product?.id &&
                item.selectedSize === gItem.selectedSize
            );
            if (existingIndex > -1) {
              const maxStock = gItem.product?.stockQuantity || 99;
              mergedCart[existingIndex] = {
                ...mergedCart[existingIndex],
                quantity: Math.min(
                  mergedCart[existingIndex].quantity + gItem.quantity,
                  maxStock
                ),
              };
            } else {
              mergedCart.push(gItem);
            }
          });
          // Clear guest cart once merged into user account
          storage.remove("divyam_ayurveda_cart_guest");
        }

        storage.set(activeKey, mergedCart);
        setCartItems(mergedCart);
      } else if (!user) {
        // CASE 2: Logged out -> now Guest
        // Clear active session cart and clean up guest storage
        storage.remove("divyam_ayurveda_cart_guest");
        setCartItems([]);
      } else {
        // CASE 3: Switched between different users (e.g. Customer 1 -> Customer 2)
        const userCart = readCartItems(activeKey);
        setCartItems(Array.isArray(userCart) ? userCart : []);
      }
      prevUserKeyRef.current = activeKey;
    }
  }, [user]);

  // Persist cart items to current user's (or guest's) scoped storage key
  useEffect(() => {
    const key = getCartStorageKey(user);
    storage.set(key, compactCartItems(cartItems));
  }, [cartItems, user]);

  const addToCart = (product, quantity = 1, variant = null) => {
    setCartItems((prevItems) => {
      const selectedSize = variant ? variant.size : product.packSize;
      const selectedPrice = variant ? variant.price : product.price;
      const selectedOriginalPrice = variant ? variant.originalPrice : product.originalPrice;

      const existingIndex = prevItems.findIndex(
        (item) => item.product?.id === product.id && item.selectedSize === selectedSize
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

  // True when the product (optionally a specific pack size) is already in the cart
  const isInCart = (productId, selectedSize) =>
    cartItems.some(
      (item) =>
        item.product?.id === productId &&
        (selectedSize === undefined || item.selectedSize === selectedSize)
    );

  const removeFromCart = (productId, selectedSize) => {
    setCartItems((prevItems) =>
      prevItems.filter(
        (item) => !(item.product?.id === productId && item.selectedSize === selectedSize)
      )
    );
  };

  // maxStock (live availability from the caller) overrides the stale snapshot stored on the item
  const updateQuantity = (productId, selectedSize, quantity, maxStock) => {
    if (quantity <= 0) {
      removeFromCart(productId, selectedSize);
      return;
    }
    setCartItems((prevItems) =>
      prevItems.map((item) => {
        if (item.product?.id === productId && item.selectedSize === selectedSize) {
          const limit = Number.isFinite(maxStock) ? maxStock : item.product?.stockQuantity || 99;
          return {
            ...item,
            quantity: Math.min(quantity, Math.max(1, limit)),
          };
        }
        return item;
      })
    );
  };

  const clearCart = () => {
    setCartItems([]);
    const key = getCartStorageKey(user);
    storage.remove(key);
  };

  // Live stock for everything in the cart (cart items only hold a snapshot from when they were added)
  const { stockMap, refresh: refreshStock } = useLiveStock(cartItems.map((item) => item.product));

  const getItemStock = (item) =>
    getAvailableUnits(item.product, item.selectedSize, stockMap[item.product?.id]);

  // Out of stock (or no longer sold) vs. more units in the cart than are available
  const getItemStockStatus = (item) => {
    const available = getItemStock(item);
    if (available <= 0) return { status: "out", available: 0 };
    if (item.quantity > available) return { status: "exceeds", available };
    return { status: "ok", available };
  };

  const stockIssueItems = cartItems.filter((item) => getItemStockStatus(item).status !== "ok");
  const hasStockIssues = stockIssueItems.length > 0;

  // ---- Per-item selection for checkout ----
  // Items are selected by default; the choice to untick is stored on the item (so it persists with the cart).
  // Out-of-stock items (or quantities above availability) can never be selected.
  const isItemSelected = (item) => !item.unselected && getItemStockStatus(item).status === "ok";

  const toggleItemSelected = (productId, selectedSize, selected) => {
    setCartItems((prev) =>
      prev.map((item) =>
        item.product?.id === productId && item.selectedSize === selectedSize
          ? { ...item, unselected: !selected }
          : item
      )
    );
  };

  const setAllItemsSelected = (selected) => {
    setCartItems((prev) => prev.map((item) => ({ ...item, unselected: !selected })));
  };

  const checkoutItems = cartItems.filter(isItemSelected);
  const checkoutSubtotal = checkoutItems.reduce(
    (acc, item) => acc + (item.price || 0) * (item.quantity || 1),
    0
  );
  const checkoutOriginalSubtotal = checkoutItems.reduce(
    (acc, item) => acc + (item.originalPrice || item.price || 0) * (item.quantity || 1),
    0
  );
  const checkoutDiscountTotal = Math.max(0, checkoutOriginalSubtotal - checkoutSubtotal);

  // ---- Offers: auto-applied offers + an optional coupon code, evaluated by the server ----
  const EMPTY_OFFERS = { applied: null, autoOffer: null, coupon: null, couponError: null, note: null };
  const [couponCode, setCouponCode] = useState("");
  const [offerState, setOfferState] = useState(EMPTY_OFFERS);
  // Bumped to force a fresh look-up: admins can create/change offers at any time, so the cart must
  // not rely on whatever was true when the cart first loaded.
  const [offerRefreshTick, setOfferRefreshTick] = useState(0);
  const refreshOffers = () => setOfferRefreshTick((tick) => tick + 1);

  useEffect(() => {
    window.addEventListener("focus", refreshOffers);
    return () => window.removeEventListener("focus", refreshOffers);
  }, []);

  // A typed coupon belongs to one shopper's session: drop it when the account changes
  useEffect(() => {
    setCouponCode("");
  }, [user?.id]);

  const offerItemsKey = JSON.stringify(
    checkoutItems.map((item) => [item.product?.id, item.price, item.quantity])
  );
  const accessToken = user?.accessToken;

  useEffect(() => {
    if (checkoutItems.length === 0) {
      setOfferState(EMPTY_OFFERS);
      return undefined;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/v1/checkout/discounts", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
          credentials: "include",
          body: JSON.stringify({
            items: checkoutItems.map((item) => ({
              productId: item.product?.id ? String(item.product.id) : undefined,
              price: Number(item.price) || 0,
              quantity: item.quantity || 1,
            })),
            couponCode: couponCode || null,
          }),
        });
        const json = await res.json();
        if (!cancelled) setOfferState(res.ok && json.success ? json.data : EMPTY_OFFERS);
      } catch (_) {
        if (!cancelled) setOfferState(EMPTY_OFFERS);
      }
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [offerItemsKey, couponCode, accessToken, offerRefreshTick]);

  const applyCoupon = (code) => setCouponCode(String(code || "").trim().toUpperCase());
  const removeCoupon = () => setCouponCode("");
  const offerDiscount = offerState.applied?.discount || 0;

  // After an order is placed only the purchased (selected) items leave the cart
  const removeCheckedOutItems = () => {
    setCouponCode("");
    const keys = new Set(checkoutItems.map((item) => `${item.product?.id}|${item.selectedSize}`));
    setCartItems((prev) =>
      prev.filter((item) => !keys.has(`${item.product?.id}|${item.selectedSize}`))
    );
  };

  const cartCount = cartItems.reduce((acc, item) => acc + (item.quantity || 1), 0);

  const subtotal = cartItems.reduce(
    (acc, item) => acc + (item.price || 0) * (item.quantity || 1),
    0
  );

  const originalSubtotal = cartItems.reduce(
    (acc, item) =>
      acc + (item.originalPrice || item.price || 0) * (item.quantity || 1),
    0
  );

  const discountTotal = Math.max(0, originalSubtotal - subtotal);

  // Free shipping above ₹499
  const shippingFee = subtotal === 0 || subtotal >= 499 ? 0 : 49;

  const total = subtotal + shippingFee;

  return (
    <CartContext.Provider
      value={{
        cartItems,
        addToCart,
        isInCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        getItemStock,
        getItemStockStatus,
        stockIssueItems,
        hasStockIssues,
        isItemSelected,
        toggleItemSelected,
        setAllItemsSelected,
        checkoutItems,
        checkoutSubtotal,
        checkoutOriginalSubtotal,
        offerDiscount,
        appliedOffer: offerState.applied,
        autoOffer: offerState.autoOffer,
        couponCode,
        couponError: offerState.couponError,
        offerNote: offerState.note,
        applyCoupon,
        removeCoupon,
        refreshOffers,
        checkoutDiscountTotal,
        removeCheckedOutItems,
        refreshStock,
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
