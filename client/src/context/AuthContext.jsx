import React, { createContext, useContext, useState, useEffect } from "react";
import { storage } from "../utils/storage";
import { ROLE_DEFINITIONS } from "../data/adminUsers";

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
  avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80",
};

const DEFAULT_ADMIN = {
  id: "admin-01",
  name: "Divyam Store Administrator",
  email: "admin@divyamayurveda.demo",
  phone: "+91 98765 00001",
  role: "Super Admin",
  avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=200&q=80",
};

const DEFAULT_ADDRESSES = [
  {
    id: "addr-01",
    fullName: "Aarav Sharma",
    phone: "9876543210",
    street: "Flat 402, Nilgiri Heights, 12th Main Road, Indiranagar",
    city: "Bengaluru",
    state: "Karnataka",
    pincode: "560038",
    type: "Home",
    isDefault: true,
  },
  {
    id: "addr-02",
    fullName: "Aarav Sharma",
    phone: "9876543210",
    street: "Tower B, Level 6, Tech Village, Outer Ring Road",
    city: "Bengaluru",
    state: "Karnataka",
    pincode: "560103",
    type: "Work",
    isDefault: false,
  },
];

export const AuthProvider = ({ children }) => {
  // Customer user
  const [user, setUser] = useState(() => {
    return storage.get(AUTH_STORAGE_KEY, null);
  });

  // Admin user
  const [adminUser, setAdminUser] = useState(() => {
    return storage.get(ADMIN_AUTH_STORAGE_KEY, null);
  });

  const [addresses, setAddresses] = useState(() => {
    return storage.get(ADDRESSES_STORAGE_KEY, DEFAULT_ADDRESSES);
  });

  useEffect(() => {
    if (user) {
      storage.set(AUTH_STORAGE_KEY, user);
    } else {
      storage.remove(AUTH_STORAGE_KEY);
    }
  }, [user]);

  useEffect(() => {
    if (adminUser) {
      storage.set(ADMIN_AUTH_STORAGE_KEY, adminUser);
    } else {
      storage.remove(ADMIN_AUTH_STORAGE_KEY);
    }
  }, [adminUser]);

  useEffect(() => {
    storage.set(ADDRESSES_STORAGE_KEY, addresses);
  }, [addresses]);

  // Customer authentication
  const login = (email, password) => {
    setAdminUser(null);
    storage.remove(ADMIN_AUTH_STORAGE_KEY);

    const loggedUser = {
      id: "user-101",
      name:
        email.split("@")[0].replace(/[._]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase()) ||
        "Ayurveda Wellness Seeker",
      email: email,
      phone: "+91 98765 43210",
      memberSince: "Recently Joined",
      avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80",
    };
    setUser(loggedUser);
    return { success: true, user: loggedUser };
  };

  const register = (userData) => {
    setAdminUser(null);
    storage.remove(ADMIN_AUTH_STORAGE_KEY);

    const newUser = {
      id: `user-${Date.now().toString().slice(-4)}`,
      name: userData.name || "Ayurvedic Seeker",
      email: userData.email,
      phone: userData.phone || "+91 98765 43210",
      memberSince: "New Member",
      avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=200&q=80",
    };
    setUser(newUser);
    return { success: true, user: newUser };
  };

  const logout = () => {
    setUser(null);
    setAdminUser(null);
    storage.remove(AUTH_STORAGE_KEY);
    storage.remove(ADMIN_AUTH_STORAGE_KEY);
  };

  // Admin authentication
  const loginAsAdmin = (customEmail = null, role = "Super Admin") => {
    setUser(null);
    storage.remove(AUTH_STORAGE_KEY);

    const adminIdentity = {
      ...DEFAULT_ADMIN,
      email: customEmail || DEFAULT_ADMIN.email,
      role: role || "Super Admin",
    };
    setAdminUser(adminIdentity);
    return { success: true, admin: adminIdentity };
  };

  const logoutAdmin = () => {
    setAdminUser(null);
    storage.remove(ADMIN_AUTH_STORAGE_KEY);
  };

  const hasPermission = (permissionId) => {
    if (!adminUser) return false;
    if (adminUser.role === "Super Admin") return true;
    const roleConfig = ROLE_DEFINITIONS[adminUser.role];
    if (!roleConfig) return false;
    return roleConfig.permissions.includes(permissionId);
  };

  const updateProfile = (updatedData) => {
    setUser((prev) => ({
      ...prev,
      ...updatedData,
    }));
  };

  const addAddress = (newAddr) => {
    const created = {
      ...newAddr,
      id: `addr-${Date.now()}`,
      isDefault: addresses.length === 0 || newAddr.isDefault,
    };
    if (created.isDefault) {
      setAddresses((prev) =>
        prev.map((a) => ({ ...a, isDefault: false })).concat(created)
      );
    } else {
      setAddresses((prev) => [...prev, created]);
    }
    return created;
  };

  const deleteAddress = (addressId) => {
    setAddresses((prev) => prev.filter((a) => a.id !== addressId));
  };

  const setDefaultAddress = (addressId) => {
    setAddresses((prev) =>
      prev.map((a) => ({
        ...a,
        isDefault: a.id === addressId,
      }))
    );
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        updateProfile,

        // Admin Auth
        adminUser,
        isAdmin: !!adminUser,
        loginAsAdmin,
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
