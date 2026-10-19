import React, { createContext, useContext, useState, useEffect } from "react";
import { storage } from "../utils/storage";
import { storeAttribution } from "../services/referralService";

const AuthContext = createContext();

const AUTH_STORAGE_KEY = "divyam_ayurveda_user";
const ADMIN_AUTH_STORAGE_KEY = "divyam_ayurveda_admin_user";
const ADDRESSES_STORAGE_KEY = "divyam_ayurveda_addresses";

const DEFAULT_CUSTOMER = {
  id: "user-101",
  name: "Aarav Sharma",
  email: "aarav.sharma@example.com",
  phone: "+91 98765 43210",
  memberSince: "January 2025",
  isStaff: false,
  role: "customer",
  avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80",
};

const DEFAULT_ADMIN = {
  id: "admin-01",
  name: "Divyam Store Administrator",
  email: "admin@divyamayurveda.demo",
  phone: "+91 98765 00001",
  isStaff: true,
  role: "admin",
  roleName: "Super Admin",
  avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80",
};

// Friendly message from an API error response (prefers field-level validation messages)
const readApiError = async (res) => {
  try {
    const json = await res.json();
    return json?.error?.details?.[0]?.message || json?.error?.message || json?.message || `Request failed (${res.status})`;
  } catch (_) {
    return `Request failed (${res.status})`;
  }
};

// Saved addresses are stored per customer (never shared between accounts or pre-filled with demo data)
const getAddressesStorageKey = (u) =>
  u ? `${ADDRESSES_STORAGE_KEY}_${u.id || u._id || u.email}` : null;


export const AuthProvider = ({ children }) => {
  // Single Unified User State
  // Only a session issued by the API (it carries an access token) counts as signed in;
  // identities left behind by older offline/demo logins are discarded.
  const [user, setUser] = useState(() => {
    const saved = storage.get(AUTH_STORAGE_KEY, null);
    if (saved && !saved.accessToken) {
      storage.remove(AUTH_STORAGE_KEY);
      return null;
    }
    return saved;
  });

  const [addresses, setAddresses] = useState(() => {
    // Remove the old shared (and demo-seeded) address list left behind by earlier versions
    storage.remove(ADDRESSES_STORAGE_KEY);
    const key = getAddressesStorageKey(storage.get(AUTH_STORAGE_KEY, null));
    return key ? storage.get(key, []) : [];
  });

  // Keep localStorage in sync with user state
  useEffect(() => {
    if (user) {
      storage.set(AUTH_STORAGE_KEY, user);
      if (user.isStaff || user.role === "admin" || user.role === "Super Admin") {
        storage.set(ADMIN_AUTH_STORAGE_KEY, user);
      }
      // Never wipe ADMIN_AUTH_STORAGE_KEY when customer logs in: preserves staff session across tabs
    } else {
      storage.remove(AUTH_STORAGE_KEY);
    }
  }, [user]);

  // Offline cache of this customer's addresses (the database is the source of truth)
  useEffect(() => {
    const key = getAddressesStorageKey(user);
    if (key) storage.set(key, addresses);
  }, [addresses, user]);

  // API call as the logged-in customer, with one token-refresh retry on 401
  const authFetch = async (path, options = {}) => {
    const send = (token) =>
      fetch(path, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...(options.headers || {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
      });

    let res = await send(user?.accessToken);
    if (res.status === 401) {
      try {
        const refreshRes = await fetch("/api/v1/auth/refresh", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        });
        if (refreshRes.ok) {
          const refreshJson = await refreshRes.json();
          const newToken = refreshJson.data?.tokens?.accessToken || refreshJson.data?.accessToken;
          if (newToken) {
            setUser((prev) => (prev ? { ...prev, accessToken: newToken } : prev));
            res = await send(newToken);
          }
        }
      } catch (_) {}
    }
    return res;
  };

  // Accounts created through the API carry an access token; offline dev identities do not
  const hasBackendSession = Boolean(user?.accessToken);

  const refreshAddresses = async () => {
    if (!hasBackendSession) return;
    try {
      const res = await authFetch("/api/v1/me/addresses");
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setAddresses(json.data.map((a) => ({ ...a, id: a.id || a._id })));
        }
      }
    } catch (_) {}
  };

  // Load the customer's real addresses when they sign in / the app starts with a saved session;
  // clear them on sign-out so the next visitor never sees them.
  useEffect(() => {
    if (!user) {
      setAddresses([]);
    } else {
      refreshAddresses();
    }
  }, [user?.id, user?.accessToken ? "session" : "offline"]);

  // Derived Admin Status
  const isAdmin = Boolean(user && user.isStaff === true);

  // adminUser projection for backwards-compatibility with admin dashboard layout/headers
  const adminUser = isAdmin
    ? {
        ...user,
        role: "Super Admin",
        roleName: "Super Admin",
        avatar: user.avatar || user.avatarUrl || DEFAULT_ADMIN.avatar,
      }
    : null;

  // Unified Single Login: authenticates via backend API or dev fallback
  const login = async (email, password) => {
    try {
      const response = await fetch("/api/v1/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
        credentials: "include",
      });

      const json = await response.json();

      if (response.ok && json.success) {
        const backendUser = json.data.user;
        const isStaffUser = backendUser.isStaff === true; // decided by the server only

        const unifiedUser = {
          ...backendUser,
          id: backendUser.id || backendUser._id,
          role: isStaffUser ? "admin" : "customer",
          isStaff: isStaffUser,
          avatar: backendUser.avatarUrl || (isStaffUser ? DEFAULT_ADMIN.avatar : DEFAULT_CUSTOMER.avatar),
          accessToken: json.data.tokens?.accessToken,
        };

        setAddresses((backendUser.addresses || []).map((a) => ({ ...a, id: a.id || a._id })));
        setUser(unifiedUser);
        return { success: true, user: unifiedUser, isAdmin: isStaffUser };
      } else {
        return {
          success: false,
          error: json.error?.message || "Invalid email address or password.",
        };
      }
    } catch (networkErr) {
      return { success: false, error: "Cannot reach the server. Please check your connection and try again." };
    }
  };

  // Unified Registration: creates customer account
  const register = async (userData) => {
    try {
      const response = await fetch("/api/v1/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: userData.name,
          email: userData.email.trim(),
          phone: userData.phone || undefined,
          password: userData.password,
          referralCode: userData.referralCode?.trim() || undefined,
        }),
        credentials: "include",
      });

      const json = await response.json();

      if (response.ok && json.success) {
        const backendUser = json.data.user;
        const unifiedUser = {
          ...backendUser,
          id: backendUser.id || backendUser._id,
          role: "customer",
          isStaff: false,
          avatar: backendUser.avatarUrl || DEFAULT_CUSTOMER.avatar,
          accessToken: json.data.tokens?.accessToken,
        };
        // A friend's code typed at signup carries on to checkout, just like an invitation link would
        if (json.data.referral?.applied && userData.referralCode) storeAttribution(userData.referralCode);
        setAddresses([]); // a brand-new account has no saved addresses
        setUser(unifiedUser);
        return { success: true, user: unifiedUser, isAdmin: false };
      } else {
        return {
          success: false,
          error: json.error?.message || "Failed to create account.",
        };
      }
    } catch (networkErr) {
      return { success: false, error: "Cannot reach the server. Please check your connection and try again." };
    }
  };

  // Unified Logout: clears session cleanly without unintentionally wiping separate admin sessions
  const logout = () => {
    const wasAdmin = user && (user.isStaff || user.role === "admin" || user.role === "Super Admin");
    setUser(null);
    storage.remove(AUTH_STORAGE_KEY);
    if (wasAdmin) {
      storage.remove(ADMIN_AUTH_STORAGE_KEY);
      storage.remove("divyam_ayurveda_orders"); // admin cache holds every customer's orders
    }

    // 2. Best-effort async notification to server
    try {
      fetch("/api/v1/auth/logout", {
        method: "POST",
        headers: user?.accessToken ? { Authorization: `Bearer ${user.accessToken}` } : {},
        credentials: "include",
      }).catch(() => {});
    } catch (err) {
      // Ignore network errors on logout
    }
  };

  const logoutAdmin = () => {
    storage.remove(ADMIN_AUTH_STORAGE_KEY);
    logout();
  };

  // With simplified single-admin model, any admin has full permissions
  const hasPermission = () => {
    return isAdmin;
  };

  // Name and phone are saved to the account; the email address is fixed once registered.
  const updateProfile = async (updatedData) => {
    if (!hasBackendSession) {
      setUser((prev) => ({ ...prev, ...updatedData }));
      return;
    }
    const res = await authFetch("/api/v1/me", {
      method: "PATCH",
      body: JSON.stringify({ name: updatedData.name, phone: updatedData.phone }),
    });
    if (!res.ok) throw new Error(await readApiError(res));
    const json = await res.json();
    const saved = json.data || {};
    setUser((prev) => ({ ...prev, name: saved.name ?? prev.name, phone: saved.phone ?? prev.phone }));
  };

  const addAddress = async (newAddr) => {
    if (!hasBackendSession) {
      const created = {
        ...newAddr,
        id: `addr-${Date.now()}`,
        isDefault: addresses.length === 0 || newAddr.isDefault,
      };
      setAddresses((prev) =>
        (created.isDefault ? prev.map((a) => ({ ...a, isDefault: false })) : prev).concat(created)
      );
      return created;
    }
    const res = await authFetch("/api/v1/me/addresses", {
      method: "POST",
      body: JSON.stringify({
        fullName: newAddr.fullName,
        phone: newAddr.phone,
        street: newAddr.street,
        line2: newAddr.line2 || undefined,
        city: newAddr.city,
        state: newAddr.state,
        pincode: newAddr.pincode,
        type: newAddr.type || "Home",
        isDefault: Boolean(newAddr.isDefault),
      }),
    });
    if (!res.ok) throw new Error(await readApiError(res));
    await refreshAddresses();
    return (await res.json()).data;
  };

  const deleteAddress = async (addressId) => {
    if (!hasBackendSession) {
      setAddresses((prev) => prev.filter((a) => a.id !== addressId));
      return;
    }
    const res = await authFetch(`/api/v1/me/addresses/${addressId}`, { method: "DELETE" });
    if (!res.ok) throw new Error(await readApiError(res));
    await refreshAddresses();
  };

  const setDefaultAddress = async (addressId) => {
    if (!hasBackendSession) {
      setAddresses((prev) => prev.map((a) => ({ ...a, isDefault: a.id === addressId })));
      return;
    }
    const res = await authFetch(`/api/v1/me/addresses/${addressId}/default`, { method: "PATCH" });
    if (!res.ok) throw new Error(await readApiError(res));
    await refreshAddresses();
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isAdmin,
        login,
        register,
        logout,
        updateProfile,
        authFetch,
        hasBackendSession,

        // Admin Auth projection
        adminUser,
        logoutAdmin,
        hasPermission,

        // Customer addresses
        addresses,
        addAddress,
        deleteAddress,
        setDefaultAddress,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
