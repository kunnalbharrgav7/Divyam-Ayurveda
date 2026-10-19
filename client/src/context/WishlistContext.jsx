import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { storage } from "../utils/storage";
import { useAuth } from "./AuthContext";
import { compactWishlistItems } from "../utils/productSnapshot";

const WishlistContext = createContext();

// Saved wishlists may hold oversized legacy product snapshots; shrink them as they are read
const readWishlistItems = (key) => compactWishlistItems(storage.get(key, []));

/**
 * Returns a user-scoped storage key.
 * - When not logged in (guest): 'divyam_ayurveda_wishlist_guest'
 * - When logged in (customer/admin): 'divyam_ayurveda_wishlist_{userId}'
 */
const getWishlistStorageKey = (user) => {
  if (!user) return "divyam_ayurveda_wishlist_guest";
  const identifier = user.id || user._id || user.email?.toLowerCase().replace(/[^a-z0-9]/g, "_");
  return `divyam_ayurveda_wishlist_${identifier}`;
};

export const WishlistProvider = ({ children }) => {
  const { user } = useAuth();
  const currentKey = getWishlistStorageKey(user);
  const prevUserKeyRef = useRef(currentKey);

  // Initialize wishlist state from current user (or guest) storage
  const [wishlistItems, setWishlistItems] = useState(() => {
    // Migration: clear stale un-scoped global key if present so it doesn't pollute guests
    if (typeof window !== "undefined") {
      try {
        localStorage.removeItem("divyam_ayurveda_wishlist");
      } catch (e) {
        // ignore
      }
    }
    const key = getWishlistStorageKey(user);
    const stored = readWishlistItems(key);
    return Array.isArray(stored) ? stored : [];
  });

  // Handle user login / logout / switch transitions
  useEffect(() => {
    const prevKey = prevUserKeyRef.current;
    const activeKey = getWishlistStorageKey(user);

    if (prevKey !== activeKey) {
      if (prevKey === "divyam_ayurveda_wishlist_guest" && user) {
        // CASE 1: Guest -> Logged in Customer
        const guestItems = readWishlistItems("divyam_ayurveda_wishlist_guest");
        const userSavedWishlist = readWishlistItems(activeKey);

        let merged = Array.isArray(userSavedWishlist) ? [...userSavedWishlist] : [];
        if (Array.isArray(guestItems) && guestItems.length > 0) {
          guestItems.forEach((gItem) => {
            if (!merged.some((m) => m.id === gItem.id)) {
              merged.push(gItem);
            }
          });
          // Clear guest wishlist once merged into user account
          storage.remove("divyam_ayurveda_wishlist_guest");
        }

        storage.set(activeKey, merged);
        setWishlistItems(merged);
      } else if (!user) {
        // CASE 2: Logged out -> now Guest
        // Clear active session wishlist and clean up guest storage
        storage.remove("divyam_ayurveda_wishlist_guest");
        setWishlistItems([]);
      } else {
        // CASE 3: Switched between different users
        const userWishlist = readWishlistItems(activeKey);
        setWishlistItems(Array.isArray(userWishlist) ? userWishlist : []);
      }
      prevUserKeyRef.current = activeKey;
    }
  }, [user]);

  // Persist wishlist items to current user's (or guest's) scoped storage key
  useEffect(() => {
    const key = getWishlistStorageKey(user);
    storage.set(key, compactWishlistItems(wishlistItems));
  }, [wishlistItems, user]);

  const isInWishlist = (productId) => {
    return wishlistItems.some((item) => item.id === productId);
  };

  const toggleWishlist = (product) => {
    setWishlistItems((prev) => {
      const exists = prev.some((item) => item.id === product.id);
      if (exists) {
        return prev.filter((item) => item.id !== product.id);
      } else {
        return [...prev, product];
      }
    });
  };

  const removeFromWishlist = (productId) => {
    setWishlistItems((prev) => prev.filter((item) => item.id !== productId));
  };

  const clearWishlist = () => {
    setWishlistItems([]);
    const key = getWishlistStorageKey(user);
    storage.remove(key);
  };

  const wishlistCount = wishlistItems.length;

  return (
    <WishlistContext.Provider
      value={{
        wishlistItems,
        isInWishlist,
        toggleWishlist,
        removeFromWishlist,
        clearWishlist,
        wishlistCount,
      }}
    >
      {children}
    </WishlistContext.Provider>
  );
};

export const useWishlist = () => {
  const context = useContext(WishlistContext);
  if (!context) {
    throw new Error("useWishlist must be used within a WishlistProvider");
  }
  return context;
};
