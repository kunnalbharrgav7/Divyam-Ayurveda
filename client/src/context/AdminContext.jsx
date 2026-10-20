import React, { createContext, useContext, useState, useEffect } from "react";
import { storage } from "../utils/storage";
import { compactProduct } from "../utils/productSnapshot";
import { getStatusLabel } from "../utils/orderStatus";
import { ROLE_DEFINITIONS } from "../data/adminUsers";
import { apiUrl } from "../config/api";
import {
  initialHomepageContent,
  initialStoreSettings,
} from "../data/storeSettings";

const AdminContext = createContext();

// Storage keys for persistence
export const STORAGE_KEYS = {
  PRODUCTS: "divyam_ayurveda_products",
  CATEGORIES: "divyam_ayurveda_categories",
  COLLECTIONS: "divyam_ayurveda_collections",
  BRANDS: "divyam_ayurveda_brands",
  ORDERS: "divyam_ayurveda_orders",
  CUSTOMERS: "divyam_ayurveda_customers",
  REVIEWS: "divyam_ayurveda_reviews",
  COUPONS: "divyam_ayurveda_coupons",
  BLOG: "divyam_ayurveda_blog",
  INGREDIENTS: "divyam_ayurveda_ingredients",
  SUPPORT: "divyam_ayurveda_support",
  ENQUIRIES: "divyam_ayurveda_enquiries",
  SUBSCRIBERS: "divyam_ayurveda_subscribers",
  ADMIN_USERS: "divyam_ayurveda_admin_users",
  HOMEPAGE: "divyam_ayurveda_homepage",
  SETTINGS: "divyam_ayurveda_settings",
  AUDIT: "divyam_ayurveda_audit",
  RETURNS: "divyam_ayurveda_returns",
  REFERRALS: "divyam_ayurveda_referrals",
  REFERRAL_SETTINGS: "divyam_ayurveda_referral_settings",
};

// Seed initial orders if empty
const INITIAL_SEED_ORDERS = [];

export const normalizeProduct = (p) => {
  if (!p) return null;
  const title = p.title || p.name || "Untitled Product";
  const name = p.name || p.title || "Untitled Product";
  const sku = p.sku || `DIV-${p.id ? String(p.id).replace("prod-", "") : "101"}`;
  let image =
    p.image ||
    (Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : "") ||
    "/images/ProductImages/Ashuwaganda.png";
  const fixUrl = (u) => (typeof u === "string" && u.startsWith("/api/") ? apiUrl(u) : u);
  image = fixUrl(image);
  let images = (Array.isArray(p.images) && p.images.length > 0 ? p.images : [image]).map(fixUrl);
  const stock =
    p.stock !== undefined ? p.stock : (p.stockQuantity !== undefined ? p.stockQuantity : 0);
  const stockQuantity = stock;

  const category = p.category || "Ayurvedic Herbs";
  const categoryId = p.categoryId || "ayurvedic-herbs";
  const subcategoryId = p.subcategoryId || "";
  const subcategory = p.subcategory || "";
  const price = Number(p.price) || 0;
  const compareAtPrice = p.compareAtPrice || p.originalPrice || null;
  const originalPrice = compareAtPrice;
  const status = p.status || "Active";
  const reorderThreshold = p.reorderThreshold || 10;

  // The API uses isBestSeller / isNew while the admin form uses isBestseller / isNewArrival.
  // Expose both spellings, always in sync, so the checkboxes reflect what is saved.
  const isBestSeller = Boolean(p.isBestSeller ?? p.isBestseller);
  const isNew = Boolean(p.isNew ?? p.isNewArrival);

  return {
    ...p,
    isBestSeller,
    isBestseller: isBestSeller,
    isNew,
    isNewArrival: isNew,
    title,
    name,
    sku,
    image,
    images,
    stock,
    stockQuantity,
    category,
    categoryId,
    subcategoryId,
    subcategory,
    price,
    compareAtPrice,
    originalPrice,
    status,
    reorderThreshold,
  };
};

export const normalizeOrder = (o) => {
  if (!o) return null;
  // Always use the human-readable orderNumber (e.g. DA-20261018-XXXXXX) as the canonical id
  const orderNumber =
    o.orderNumber ||
    (typeof o.id === "string" && o.id.startsWith("DA-") ? o.id : null) ||
    (typeof o._id === "string" && o._id.startsWith("DA-") ? o._id : null) ||
    o.id ||
    (o._id ? String(o._id) : `DA-${Date.now()}`);
  const id = orderNumber;
  const _id = o._id ? String(o._id) : (o.id && /^[0-9a-fA-F]{24}$/.test(o.id) ? o.id : undefined);
  const customerName = o.customerName || o.customer?.name || "Customer";
  const email = o.email || o.customer?.email || "";
  const phone = o.phone || o.customer?.phone || "";

  let street = "Flat 402, Lotus Residency, Baner Road";
  let city = o.city || "Pune";
  let state = o.state || "Maharashtra";
  let pincode = o.pincode || "411045";

  if (typeof o.shippingAddress === "string") {
    street = o.shippingAddress;
  } else if (o.shippingAddress && typeof o.shippingAddress === "object") {
    street = o.shippingAddress.street || street;
    city = o.shippingAddress.city || city;
    state = o.shippingAddress.state || state;
    pincode = o.shippingAddress.pincode || pincode;
  }

  const totalAmount = Number(o.totalAmount || o.pricing?.total || o.total || 0);
  const status = getStatusLabel(o.orderStatus || o.status);

  const date = o.date || o.orderDate || o.createdAt || new Date().toISOString();

  const rawMethod = String(o.paymentMethod || "").toLowerCase().trim();
  const isOnline =
    rawMethod.includes("online") ||
    rawMethod.includes("card") ||
    rawMethod.includes("upi") ||
    rawMethod.includes("cashfree") ||
    rawMethod === "prepaid";

  const paymentMethod = isOnline ? "Online Payment" : "Cash on Delivery (COD)";

  const rawPay = String(o.paymentStatus || "").toLowerCase().trim();
  let paymentStatus = "Pending";
  if (rawPay === "paid" || rawPay.includes("paid") || rawPay.includes("succeed")) {
    paymentStatus = "Paid";
  } else if (rawPay === "refunded" || rawPay.includes("refund")) {
    paymentStatus = "Refunded";
  } else if (rawPay === "failed" || rawPay.includes("fail")) {
    paymentStatus = "Failed";
  } else if (isOnline) {
    paymentStatus = "Paid";
  } else {
    paymentStatus = "Pending";
  }

  const items = (o.items || []).map((item) => ({
    ...item,
    title: item.title || item.name || "Ayurvedic Product",
    name: item.name || item.title || "Ayurvedic Product",
    image:
      item.image ||
      (Array.isArray(item.images) ? item.images[0] : "") ||
      "/images/ProductImages/PureHimalayanShilajit.jpeg",
    price: Number(item.price) || 0,
    quantity: Number(item.quantity) || 1,
  }));

  const shippingAddressObj =
    typeof o.shippingAddress === "object" && o.shippingAddress !== null
      ? {
          street: o.shippingAddress.street || street,
          city: o.shippingAddress.city || city,
          state: o.shippingAddress.state || state,
          pincode: o.shippingAddress.pincode || pincode,
        }
      : {
          street,
          city,
          state,
          pincode,
        };

  return {
    ...o,
    id,
    _id,
    orderNumber,
    customerName,
    email,
    phone,
    paymentMethod,
    paymentStatus,
    shippingAddress: shippingAddressObj,
    shippingAddressText: `${street}, ${city}, ${state} - ${pincode}`,
    city,
    state,
    pincode,
    totalAmount,
    total: totalAmount,
    orderStatus: status,
    status,
    date,
    items,
  };
};

export const deduplicateOrders = (orderList) => {
  if (!Array.isArray(orderList)) return [];
  const result = [];
  const seenOrderNumbers = new Set();
  const seenMongoIds = new Set();

  for (const raw of orderList) {
    if (!raw) continue;
    const norm = normalizeOrder(raw);
    if (!norm) continue;

    const num = norm.orderNumber || norm.id;
    const mongoId = norm._id ? String(norm._id) : (norm.id && /^[0-9a-fA-F]{24}$/.test(norm.id) ? norm.id : null);

    if (num && seenOrderNumbers.has(num)) {
      continue;
    }
    if (mongoId && seenMongoIds.has(mongoId)) {
      continue;
    }

    if (num) seenOrderNumbers.add(num);
    if (mongoId) seenMongoIds.add(mongoId);
    result.push(norm);
  }
  return result;
};

export const normalizeReview = (r) => {
  if (!r) return null;
  const userName = r.userName || r.customerName || "Verified Customer";
  const customerName = userName;
  const productTitle = r.productTitle || r.productName || "Ayurvedic Remedy";
  const productName = productTitle;
  const comment = r.comment || r.review || "";
  const title = r.title || "";
  const rating = Number(r.rating) || 5;
  const rawStatus = (r.status || "approved").toLowerCase();
  const status =
    rawStatus === "approved"
      ? "Approved"
      : rawStatus === "rejected"
      ? "Rejected"
      : "Pending";
  const date = r.date || new Date().toISOString();

  return {
    ...r,
    userName,
    customerName,
    productTitle,
    productName,
    comment,
    title,
    rating,
    status,
    date,
  };
};

export const AdminProvider = ({ children }) => {
  // 1. Products
  const [products, setProducts] = useState(() => {
    const raw = storage.get(STORAGE_KEYS.PRODUCTS, []);
    return (raw || []).map(normalizeProduct).filter(Boolean).map(compactProduct);
  });
  useEffect(() => {
    storage.set(STORAGE_KEYS.PRODUCTS, products);
  }, [products]);

  // 2. Categories
  const [categories, setCategories] = useState(() =>
    storage.get(STORAGE_KEYS.CATEGORIES, [])
  );
  useEffect(() => {
    storage.set(STORAGE_KEYS.CATEGORIES, categories);
  }, [categories]);

  // 3. Brands
  const [brands, setBrands] = useState(() =>
    storage.get(STORAGE_KEYS.BRANDS, [])
  );
  useEffect(() => {
    storage.set(STORAGE_KEYS.BRANDS, brands);
  }, [brands]);

  // 4. Collections
  const [collections, setCollections] = useState(() =>
    storage.get(STORAGE_KEYS.COLLECTIONS, [])
  );
  useEffect(() => {
    storage.set(STORAGE_KEYS.COLLECTIONS, collections);
  }, [collections]);

  // 5. Orders (Synced with backend MongoDB API and browser storage)
  const [orders, setOrders] = useState(() => {
    const raw = storage.get(STORAGE_KEYS.ORDERS, INITIAL_SEED_ORDERS);
    return deduplicateOrders(raw || []);
  });
  useEffect(() => {
    storage.set(STORAGE_KEYS.ORDERS, orders);
  }, [orders]);

  // 6. Customers
  const [customers, setCustomers] = useState(() =>
    storage.get(STORAGE_KEYS.CUSTOMERS, [])
  );
  useEffect(() => {
    storage.set(STORAGE_KEYS.CUSTOMERS, customers);
  }, [customers]);

  // 7. Reviews
  const [reviews, setReviews] = useState(() => {
    const raw = storage.get(STORAGE_KEYS.REVIEWS, []);
    return (raw || []).map(normalizeReview).filter(Boolean);
  });
  useEffect(() => {
    storage.set(STORAGE_KEYS.REVIEWS, reviews);
  }, [reviews]);

  // 8. Coupons
  const [coupons, setCoupons] = useState(() =>
    storage.get(STORAGE_KEYS.COUPONS, [])
  );
  useEffect(() => {
    storage.set(STORAGE_KEYS.COUPONS, coupons);
  }, [coupons]);

  // 9. Blog posts
  const [blogPosts, setBlogPosts] = useState(() =>
    storage.get(STORAGE_KEYS.BLOG, [])
  );
  useEffect(() => {
    storage.set(STORAGE_KEYS.BLOG, blogPosts);
  }, [blogPosts]);

  // 10. Ingredients
  const [ingredients, setIngredients] = useState(() =>
    storage.get(STORAGE_KEYS.INGREDIENTS, [])
  );
  useEffect(() => {
    storage.set(STORAGE_KEYS.INGREDIENTS, ingredients);
  }, [ingredients]);

  // 11. Support Tickets
  const [supportTickets, setSupportTickets] = useState(() =>
    storage.get(STORAGE_KEYS.SUPPORT, [])
  );
  useEffect(() => {
    storage.set(STORAGE_KEYS.SUPPORT, supportTickets);
  }, [supportTickets]);

  // 12. Contact Enquiries
  const [contactEnquiries, setContactEnquiries] = useState(() =>
    storage.get(STORAGE_KEYS.ENQUIRIES, [])
  );
  useEffect(() => {
    storage.set(STORAGE_KEYS.ENQUIRIES, contactEnquiries);
  }, [contactEnquiries]);

  // 13. Subscribers
  const [subscribers, setSubscribers] = useState(() =>
    storage.get(STORAGE_KEYS.SUBSCRIBERS, [])
  );
  useEffect(() => {
    storage.set(STORAGE_KEYS.SUBSCRIBERS, subscribers);
  }, [subscribers]);

  // 14. Admin Users
  const [adminUsers, setAdminUsers] = useState(() =>
    storage.get(STORAGE_KEYS.ADMIN_USERS, [])
  );
  useEffect(() => {
    storage.set(STORAGE_KEYS.ADMIN_USERS, adminUsers);
  }, [adminUsers]);

  // 15. Homepage Content
  const [homepageContent, setHomepageContent] = useState(() =>
    storage.get(STORAGE_KEYS.HOMEPAGE, initialHomepageContent)
  );
  useEffect(() => {
    storage.set(STORAGE_KEYS.HOMEPAGE, homepageContent);
  }, [homepageContent]);

  // 16. Store Settings
  const [storeSettings, setStoreSettings] = useState(() =>
    storage.get(STORAGE_KEYS.SETTINGS, initialStoreSettings)
  );
  useEffect(() => {
    storage.set(STORAGE_KEYS.SETTINGS, storeSettings);
  }, [storeSettings]);

  // 17. Audit Logs
  const [auditLogs, setAuditLogs] = useState(() =>
    // Audit logs are loaded from the server on demand and never cached in localStorage (they can be large)
    (storage.remove(STORAGE_KEYS.AUDIT), [])
  );

  // 18. Returns & Refunds
  // Not persisted: requests carry evidence photos, which would blow the localStorage quota
  const [returns, setReturns] = useState(() => {
    storage.remove(STORAGE_KEYS.RETURNS);
    return [];
  });

  // 19. Referrals & Rewards (live from the API; not persisted because it lists customers' emails)
  const [referralsData, setReferralsData] = useState(() => {
    storage.remove(STORAGE_KEYS.REFERRALS);
    storage.remove(STORAGE_KEYS.REFERRAL_SETTINGS);
    return { items: [], metrics: {}, topReferrers: [] };
  });
  const [referralSettings, setReferralSettings] = useState(null);

  const getAdminAuth = () => {
    let adminUser = storage.get("divyam_ayurveda_admin_user", null);
    if (!adminUser || !(adminUser.isStaff || adminUser.role === "admin" || adminUser.role === "Super Admin")) {
      const fallback = storage.get("divyam_ayurveda_user", null);
      if (fallback && (fallback.isStaff || fallback.role === "admin" || fallback.role === "Super Admin")) {
        adminUser = fallback;
      }
    }
    const isStaff = Boolean(
      adminUser &&
      (adminUser.isStaff ||
        adminUser.role === "admin" ||
        adminUser.role === "Super Admin")
    );
    const token = adminUser?.accessToken || adminUser?.tokens?.accessToken;
    const headers = { "Content-Type": "application/json" };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
    return { headers, token, isStaff, adminUser };
  };

  const adminApiFetch = async (url, options = {}) => {
    const { headers: authHeaders, token: initialToken, adminUser: initialAdminUser } = getAdminAuth();
    let token = initialToken;
    let adminUser = initialAdminUser;

    const headers = {
      ...authHeaders,
      ...(options.headers || {}),
    };
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    let res = await fetch(apiUrl(url), {
      ...options,
      headers,
      credentials: "include",
    });

    if (res.status === 401) {
      try {
        const refreshRes = await fetch(apiUrl("/api/v1/auth/refresh"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
        });
        if (refreshRes.ok) {
          const refreshJson = await refreshRes.json();
          const newToken = refreshJson.data?.tokens?.accessToken || refreshJson.data?.accessToken;
          if (newToken) {
            token = newToken;
            headers["Authorization"] = `Bearer ${token}`;
            if (adminUser) {
              adminUser = { ...adminUser, accessToken: token };
              if (adminUser.isStaff || adminUser.role === "admin" || adminUser.role === "Super Admin") {
                storage.set("divyam_ayurveda_admin_user", adminUser);
              }
            }
            res = await fetch(apiUrl(url), {
              ...options,
              headers,
              credentials: "include",
            });
          }
        }
      } catch (_) {}
    }

    if (!res.ok) {
      let errorMsg = `Server error (${res.status})`;
      try {
        const errJson = await res.json();
        errorMsg = errJson?.error?.message || errJson?.message || errorMsg;
      } catch (_) {}
      throw new Error(errorMsg);
    }

    return await res.json();
  };

  const fetchAdminOrders = async () => {
    try {
      const json = await adminApiFetch("/api/v1/admin/orders?limit=100");
      if (json.success && Array.isArray(json.data)) {
        const backendOrders = deduplicateOrders(json.data);
        setOrders(backendOrders);
        storage.set(STORAGE_KEYS.ORDERS, backendOrders);
        return backendOrders;
      }
    } catch (_) {}
  };

  const fetchAdminProducts = async () => {
    try {
      const json = await adminApiFetch("/api/v1/admin/products?limit=100");
      if (json.success && Array.isArray(json.data)) {
        const formatted = json.data.map(normalizeProduct).filter(Boolean);
        setProducts(formatted);
        storage.set(STORAGE_KEYS.PRODUCTS, formatted);
        return formatted;
      }
    } catch (_) {}
  };

  const fetchAdminCategories = async () => {
    try {
      const { headers, isStaff } = getAdminAuth();
      if (!isStaff) return;
      const res = await fetch("/api/v1/admin/categories", {
        headers,
        credentials: "include",
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setCategories(json.data);
          storage.set(STORAGE_KEYS.CATEGORIES, json.data);
        }
      }
    } catch (_) {}
  };

  const fetchAdminBrands = async () => {
    try {
      const { headers, isStaff } = getAdminAuth();
      if (!isStaff) return;
      const res = await fetch("/api/v1/admin/brands", {
        headers,
        credentials: "include",
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setBrands(json.data);
          storage.set(STORAGE_KEYS.BRANDS, json.data);
        }
      }
    } catch (_) {}
  };

  const fetchAdminCollections = async () => {
    try {
      const { headers, isStaff } = getAdminAuth();
      if (!isStaff) return;
      const res = await fetch("/api/v1/admin/collections", {
        headers,
        credentials: "include",
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setCollections(json.data);
          storage.set(STORAGE_KEYS.COLLECTIONS, json.data);
        }
      }
    } catch (_) {}
  };

  const fetchAdminIngredients = async () => {
    try {
      const res = await fetch("/api/v1/ingredients");
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setIngredients(json.data);
          storage.set(STORAGE_KEYS.INGREDIENTS, json.data);
        }
      }
    } catch (_) {}
  };

  const fetchAdminCoupons = async () => {
    try {
      const { headers, isStaff } = getAdminAuth();
      if (!isStaff) return;
      const res = await fetch("/api/v1/admin/coupons", {
        headers,
        credentials: "include",
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setCoupons(json.data);
          storage.set(STORAGE_KEYS.COUPONS, json.data);
        }
      }
    } catch (_) {}
  };

  const fetchAdminBlogPosts = async () => {
    try {
      const { headers, isStaff } = getAdminAuth();
      if (!isStaff) return;
      const res = await fetch("/api/v1/admin/blog", {
        headers,
        credentials: "include",
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          let backendPosts = json.data;

          // Auto-migrate any unpersisted local blog posts (e.g. created previously offline or in localStorage)
          const localPosts = storage.get(STORAGE_KEYS.BLOG, []);
          const unpersisted = localPosts.filter(
            (lp) => lp.title && !backendPosts.some((bp) => bp.slug === lp.slug || bp.id === lp.id)
          );

          if (unpersisted.length > 0) {
            for (const p of unpersisted) {
              try {
                const saveRes = await fetch("/api/v1/admin/blog", {
                  method: "POST",
                  headers: { ...headers, "Content-Type": "application/json" },
                  credentials: "include",
                  body: JSON.stringify(p),
                });
                if (saveRes.ok) {
                  const saveJson = await saveRes.json();
                  if (saveJson.data) {
                    backendPosts = [saveJson.data, ...backendPosts];
                  }
                }
              } catch (_) {}
            }
          }

          setBlogPosts(backendPosts);
          storage.set(STORAGE_KEYS.BLOG, backendPosts);
          return backendPosts;
        }
      }
    } catch (err) {
      console.warn("fetchAdminBlogPosts warning:", err);
    }
  };

  const fetchAdminReviews = async () => {
    try {
      const { headers, isStaff } = getAdminAuth();
      if (!isStaff) return;
      const res = await fetch("/api/v1/admin/reviews", {
        headers,
        credentials: "include",
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          const formatted = json.data.map(normalizeReview).filter(Boolean);
          setReviews(formatted);
          storage.set(STORAGE_KEYS.REVIEWS, formatted);
        }
      }
    } catch (_) {}
  };

  const fetchAdminCustomers = async () => {
    try {
      const { headers, isStaff } = getAdminAuth();
      if (!isStaff) return;
      const res = await fetch("/api/v1/admin/customers", {
        headers,
        credentials: "include",
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setCustomers(json.data);
          storage.set(STORAGE_KEYS.CUSTOMERS, json.data);
        }
      }
    } catch (_) {}
  };

  const fetchAdminEnquiries = async () => {
    try {
      const { headers, isStaff } = getAdminAuth();
      if (!isStaff) return;
      const res = await fetch("/api/v1/admin/enquiries", {
        headers,
        credentials: "include",
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setContactEnquiries(json.data);
          storage.set(STORAGE_KEYS.ENQUIRIES, json.data);
        }
      }
    } catch (_) {}
  };

  const fetchAdminSupportTickets = async () => {
    try {
      const { headers, isStaff } = getAdminAuth();
      if (!isStaff) return;
      const res = await fetch("/api/v1/admin/support-tickets", {
        headers,
        credentials: "include",
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setSupportTickets(json.data);
          storage.set(STORAGE_KEYS.SUPPORT, json.data);
        }
      }
    } catch (_) {}
  };

  const fetchAdminSubscribers = async () => {
    try {
      const { headers, isStaff } = getAdminAuth();
      if (!isStaff) return;
      const res = await fetch("/api/v1/admin/subscribers", {
        headers,
        credentials: "include",
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setSubscribers(json.data);
          storage.set(STORAGE_KEYS.SUBSCRIBERS, json.data);
        }
      }
    } catch (_) {}
  };

  const fetchAdminUsers = async () => {
    try {
      const { headers, isStaff } = getAdminAuth();
      if (!isStaff) return;
      const res = await fetch("/api/v1/admin/users", {
        headers,
        credentials: "include",
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setAdminUsers(json.data);
          storage.set(STORAGE_KEYS.ADMIN_USERS, json.data);
        }
      }
    } catch (_) {}
  };

  const fetchAdminAuditLogs = async () => {
    try {
      const { headers, isStaff } = getAdminAuth();
      if (!isStaff) return;
      const res = await fetch("/api/v1/admin/audit-logs", {
        headers,
        credentials: "include",
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setAuditLogs(json.data);
        }
      }
    } catch (_) {}
  };

  const fetchAdminHomepage = async () => {
    try {
      const { headers, isStaff } = getAdminAuth();
      if (!isStaff) return;
      const res = await fetch("/api/v1/admin/homepage", {
        headers,
        credentials: "include",
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setHomepageContent(json.data);
          storage.set(STORAGE_KEYS.HOMEPAGE, json.data);
        }
      }
    } catch (_) {}
  };

  const fetchAdminSettings = async () => {
    try {
      const { headers, isStaff } = getAdminAuth();
      if (!isStaff) return;
      const res = await fetch("/api/v1/admin/settings", {
        headers,
        credentials: "include",
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setStoreSettings(json.data);
          storage.set(STORAGE_KEYS.SETTINGS, json.data);
        }
      }
    } catch (_) {}
  };

  const fetchAdminReturns = async () => {
    try {
      const { isStaff } = getAdminAuth();
      if (!isStaff) return;
      const json = await adminApiFetch("/api/v1/admin/returns");
      if (json?.success && Array.isArray(json.data)) setReturns(json.data);
    } catch (_) {}
  };

  // One call per workflow step; the server returns the updated request, which replaces the row in place.
  const runReturnAction = async (id, action, body = {}) => {
    const json = await adminApiFetch(`/api/v1/admin/returns/${id}/${action}`, {
      method: "POST",
      body: JSON.stringify(body),
    });
    const updated = json?.data;
    if (updated) {
      setReturns((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
      // The order status (return_requested / returned) and payment status changed too
      fetchAdminOrders?.();
    }
    return updated;
  };

  const approveReturnRequest = (id, body) => runReturnAction(id, "approve", body);
  const rejectReturnRequest = (id, body) => runReturnAction(id, "reject", body);
  const receiveReturnRequest = (id, body) => runReturnAction(id, "receive", body);
  const refundReturnRequest = (id, body) => runReturnAction(id, "refund", body);
  const refreshReturnRefund = (id) => runReturnAction(id, "refund/refresh");

  const fetchAdminReferrals = async () => {
    try {
      const { isStaff } = getAdminAuth();
      if (!isStaff) return;
      const [overview, settings] = await Promise.all([
        adminApiFetch("/api/v1/admin/referrals"),
        adminApiFetch("/api/v1/admin/referrals/settings"),
      ]);
      if (overview?.data) setReferralsData(overview.data);
      if (settings?.data) setReferralSettings(settings.data);
    } catch (_) {}
  };

  // Saved to the database; throws on failure so the page never reports a save that didn't happen
  const saveReferralSettings = async (newSettings) => {
    const json = await adminApiFetch("/api/v1/admin/referrals/settings", {
      method: "PUT",
      body: JSON.stringify(newSettings),
    });
    setReferralSettings(json.data);
    logAction("Updated Referral Program", "Configuration", "Updated referral program rules.");
    return json.data;
  };

  // Approve (pay now) or void a referral reward; refreshes the list so statuses and metrics stay true
  const runReferralAction = async (id, action, body = {}) => {
    const json = await adminApiFetch(`/api/v1/admin/referrals/${id}/${action}`, { method: "POST", body: JSON.stringify(body) });
    await fetchAdminReferrals();
    return json.data;
  };
  const approveReferral = (id) => runReferralAction(id, "approve");
  const voidReferral = (id, reason) => runReferralAction(id, "void", { reason });

  const downloadReferralsCsv = async () => {
    const { headers } = getAdminAuth();
    const res = await fetch("/api/v1/admin/referrals/export", { headers, credentials: "include" });
    if (!res.ok) throw new Error("Could not export the referrals.");
    const url = URL.createObjectURL(await res.blob());
    const a = document.createElement("a");
    a.href = url;
    a.download = "referrals.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    // Trigger background admin fetches if user is logged in as staff/admin
    const { isStaff } = getAdminAuth();
    if (isStaff) {
      fetchAdminOrders();
      fetchAdminProducts();
      fetchAdminCategories();
      fetchAdminBrands();
      fetchAdminCollections();
      fetchAdminIngredients();
      fetchAdminCoupons();
      fetchAdminReviews();
      fetchAdminCustomers();
      fetchAdminEnquiries();
      fetchAdminSupportTickets();
      fetchAdminSubscribers();
      fetchAdminUsers();
      fetchAdminAuditLogs();
      fetchAdminHomepage();
      fetchAdminSettings();
      fetchAdminReturns();
      fetchAdminReferrals();
      fetchAdminBlogPosts();
    }

    const handleOrderCreated = (e) => {
      if (e.detail) {
        const newOrder = normalizeOrder(e.detail);
        setOrders((prev) => deduplicateOrders([newOrder, ...prev]));
        const existing = storage.get(STORAGE_KEYS.ORDERS, []);
        storage.set(
          STORAGE_KEYS.ORDERS,
          deduplicateOrders([newOrder, ...existing])
        );
      }
    };

    const handleStorageChange = (e) => {
      if (e.key === STORAGE_KEYS.ORDERS && e.newValue) {
        try {
          const parsed = JSON.parse(e.newValue);
          if (Array.isArray(parsed)) {
            setOrders(deduplicateOrders(parsed));
          }
        } catch (_) {}
      }
    };

    window.addEventListener("divyam_order_created", handleOrderCreated);
    window.addEventListener("storage", handleStorageChange);
    return () => {
      window.removeEventListener("divyam_order_created", handleOrderCreated);
      window.removeEventListener("storage", handleStorageChange);
    };
  }, []);

  const logAction = (action, module, details) => {
    const newLog = {
      id: `log-${Date.now()}`,
      action,
      module,
      performedBy: "Divyam Store Administrator",
      timestamp: new Date().toISOString(),
      details,
    };
    setAuditLogs((prev) => [newLog, ...prev.slice(0, 99)]);
  };

  // ================= PRODUCTS CRUD =================
  const addProduct = async (productData) => {
    const title = productData.title || productData.name || "New Product";
    const slug =
      productData.slug ||
      title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

    const imagesList = Array.isArray(productData.images) && productData.images.length > 0
      ? productData.images
      : productData.image
      ? [productData.image]
      : [];

    const primaryImg = productData.image || imagesList[0] || "";

    const payload = {
      ...productData,
      name: title,
      title: title,
      slug,
      image: primaryImg,
      images: imagesList,
      gallery: imagesList,
      price: Number(productData.price) || 0,
      compareAtPrice: Number(productData.compareAtPrice || productData.originalPrice) || null,
      originalPrice: Number(productData.originalPrice || productData.compareAtPrice) || Number(productData.price) || 0,
      stock: Number(productData.stock ?? productData.stockQuantity) || 0,
      stockQuantity: Number(productData.stockQuantity ?? productData.stock) || 0,
      reorderThreshold: Number(productData.reorderThreshold) || 10,
      status: productData.status || "active",
      isFeatured: Boolean(productData.isFeatured),
      isBestseller: Boolean(productData.isBestseller || productData.isBestSeller),
      isTrending: Boolean(productData.isTrending),
      isNewArrival: Boolean(productData.isNewArrival || productData.isNew),
    };

    // Save to real MongoDB backend API
    const json = await adminApiFetch("/api/v1/admin/products", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    const createdProduct = normalizeProduct(json.data || json);
    setProducts((prev) => [createdProduct, ...prev.filter((p) => p.id !== createdProduct.id)]);
    logAction("Created Product", "Catalog", `Added new formulation: ${createdProduct.name}`);

    // Update storage
    const currentStorage = storage.get(STORAGE_KEYS.PRODUCTS, []);
    storage.set(STORAGE_KEYS.PRODUCTS, [createdProduct, ...currentStorage.filter((p) => p.id !== createdProduct.id)]);

    return createdProduct;
  };

  const updateProduct = async (productId, updatedData) => {
    const payload = { ...updatedData };
    if (payload.price !== undefined) payload.price = Number(payload.price);
    if (payload.compareAtPrice !== undefined) payload.compareAtPrice = Number(payload.compareAtPrice);
    if (payload.stock !== undefined || payload.stockQuantity !== undefined) {
      payload.stock = Number(payload.stock ?? payload.stockQuantity);
      payload.stockQuantity = payload.stock;
    }

    const json = await adminApiFetch(`/api/v1/admin/products/${productId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });

    const updated = normalizeProduct(json.data || json);
    setProducts((prev) =>
      prev.map((p) => (p.id === productId || p._id === productId ? updated : p))
    );
    logAction("Updated Product", "Catalog", `Modified product ID: ${productId}`);

    const currentStorage = storage.get(STORAGE_KEYS.PRODUCTS, []);
    storage.set(
      STORAGE_KEYS.PRODUCTS,
      currentStorage.map((p) => (p.id === productId || p._id === productId ? updated : p))
    );

    return updated;
  };

  const deleteProduct = async (productId) => {
    await adminApiFetch(`/api/v1/admin/products/${productId}`, {
      method: "DELETE",
    });

    const prod = products.find((p) => p.id === productId || p._id === productId);
    setProducts((prev) => prev.filter((p) => p.id !== productId && p._id !== productId));
    logAction("Deleted Product", "Catalog", `Removed formulation: ${prod?.name || productId}`);

    const currentStorage = storage.get(STORAGE_KEYS.PRODUCTS, []);
    storage.set(
      STORAGE_KEYS.PRODUCTS,
      currentStorage.filter((p) => p.id !== productId && p._id !== productId)
    );
  };

  const duplicateProduct = (productId) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;
    const duplicated = {
      ...prod,
      id: `prod-${Date.now().toString().slice(-4)}`,
      name: `${prod.name} (Copy)`,
      slug: `${prod.slug}-copy-${Date.now().toString().slice(-4)}`,
      createdAt: new Date().toISOString(),
    };
    setProducts((prev) => [duplicated, ...prev]);
    logAction("Duplicated Product", "Catalog", `Cloned ${prod.name}`);
    return duplicated;
  };

  const toggleProductStatus = (productId) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, isArchived: !p.isArchived } : p))
    );
    logAction("Toggled Product Status", "Catalog", `Toggled archive status for ID: ${productId}`);
  };

  const toggleProductFeatured = (productId) => {
    setProducts((prev) =>
      prev.map((p) => (p.id === productId ? { ...p, isFeatured: !p.isFeatured } : p))
    );
  };

  const adjustStock = (productId, adjustmentAmount, reason) => {
    const prod = products.find((p) => p.id === productId || p._id === productId);
    const current = prod?.stock ?? prod?.stockQuantity ?? 0;
    return updateProductStock(productId, current + adjustmentAmount, reason);
  };

  const bulkDeleteProducts = (productIds) => {
    setProducts((prev) => prev.filter((p) => !productIds.includes(p.id)));
    logAction("Bulk Deleted Products", "Catalog", `Removed ${productIds.length} products`);
  };

  // ================= CATEGORIES CRUD =================
  // Categories are persisted in MongoDB first, so the storefront navigation reads the same data.
  // These throw on server errors (e.g. duplicate slug) so the admin form can show the message.
  const addCategory = async (categoryData) => {
    const json = await adminApiFetch("/api/v1/admin/categories", {
      method: "POST",
      body: JSON.stringify(categoryData),
    });
    const created = json.data;
    setCategories((prev) => [...prev, created]);
    logAction("Created Category", "Catalog", `Added category: ${created.name}`);
    return created;
  };

  const updateCategory = async (categoryId, updatedData) => {
    const json = await adminApiFetch(`/api/v1/admin/categories/${categoryId}`, {
      method: "PATCH",
      body: JSON.stringify(updatedData),
    });
    setCategories((prev) =>
      prev.map((c) => (c.id === categoryId || c.slug === categoryId ? json.data : c))
    );
    logAction("Updated Category", "Catalog", `Modified category: ${json.data.name}`);
    return json.data;
  };

  const deleteCategory = async (categoryId) => {
    await adminApiFetch(`/api/v1/admin/categories/${categoryId}`, { method: "DELETE" });
    setCategories((prev) => prev.filter((c) => c.id !== categoryId && c.slug !== categoryId));
    logAction("Deleted Category", "Catalog", `Removed category: ${categoryId}`);
  };

  // ================= BRANDS & COLLECTIONS =================
  // Brands are persisted in MongoDB first, so they survive a refresh and are shared with every admin.
  // These throw on server errors (e.g. duplicate name) so the admin form can show the message.
  const addBrand = async (brandData) => {
    const json = await adminApiFetch("/api/v1/admin/brands", {
      method: "POST",
      body: JSON.stringify(brandData),
    });
    const created = json.data;
    setBrands((prev) => [...prev, created]);
    logAction("Created Brand", "Catalog", `Added brand: ${created.name}`);
    return created;
  };

  const updateBrand = async (id, data) => {
    const json = await adminApiFetch(`/api/v1/admin/brands/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
    setBrands((prev) => prev.map((b) => (b.id === id ? json.data : b)));
    logAction("Updated Brand", "Catalog", `Updated brand: ${json.data.name}`);
    return json.data;
  };

  const deleteBrand = async (id) => {
    await adminApiFetch(`/api/v1/admin/brands/${id}`, { method: "DELETE" });
    setBrands((prev) => prev.filter((b) => b.id !== id));
    logAction("Deleted Brand", "Catalog", `Removed brand: ${id}`);
  };

  const addCollection = async (data) => {
    const json = await adminApiFetch("/api/v1/admin/collections", {
      method: "POST",
      body: JSON.stringify(data),
    });
    const created = json.data;
    setCollections((prev) => [...prev, created]);
    logAction("Created Collection", "Catalog", `Added collection: ${created.name}`);
    return created;
  };

  const updateCollection = async (id, data) => {
    const json = await adminApiFetch(`/api/v1/admin/collections/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
    setCollections((prev) => prev.map((c) => (c.id === id ? json.data : c)));
    logAction("Updated Collection", "Catalog", `Updated collection: ${json.data.name}`);
    return json.data;
  };

  const deleteCollection = async (id) => {
    await adminApiFetch(`/api/v1/admin/collections/${id}`, { method: "DELETE" });
    setCollections((prev) => prev.filter((c) => c.id !== id));
    logAction("Deleted Collection", "Catalog", `Removed collection: ${id}`);
  };

  // ================= INGREDIENTS =================
  const addIngredient = async (newIng) => {
    const slug = newIng.slug || (newIng.name || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
    const herb = { ...newIng, id: newIng.id || `herb-${Date.now()}`, slug };
    setIngredients((prev) => [herb, ...prev]);
    logAction("Created Botanical Herb", "Catalog", `Added herb: ${newIng.name}`);
    try {
      const { headers, isStaff } = getAdminAuth();
      if (isStaff) {
        const res = await fetch("/api/v1/admin/ingredients", {
          method: "POST",
          headers,
          body: JSON.stringify(newIng),
          credentials: "include",
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            setIngredients((prev) => prev.map((item) => (item.id === herb.id ? json.data : item)));
          }
        }
      }
    } catch (_) {}
  };

  const updateIngredient = async (id, updatedData) => {
    setIngredients((prev) =>
      prev.map((item) => (item.id === id || item._id === id ? { ...item, ...updatedData } : item))
    );
    logAction("Updated Botanical Herb", "Catalog", `Modified herb: ${updatedData.name || id}`);
    try {
      const { headers, isStaff } = getAdminAuth();
      if (isStaff) {
        await fetch(`/api/v1/admin/ingredients/${id}`, {
          method: "PATCH",
          headers,
          body: JSON.stringify(updatedData),
          credentials: "include",
        });
      }
    } catch (_) {}
  };

  const deleteIngredient = async (id) => {
    setIngredients((prev) => prev.filter((item) => item.id !== id && item._id !== id));
    logAction("Deleted Botanical Herb", "Catalog", `Removed herb: ${id}`);
    try {
      const { headers, isStaff } = getAdminAuth();
      if (isStaff) {
        await fetch(`/api/v1/admin/ingredients/${id}`, {
          method: "DELETE",
          headers,
          credentials: "include",
        });
      }
    } catch (_) {}
  };

  // ================= ORDERS & SHIPMENTS MANAGEMENT =================
  const updateOrderStatus = async (orderId, newStatus, trackingNotes) => {
    let freshOrder = null;
    // UI labels ("Out for Delivery", "Pending") -> API statuses ("out_for_delivery", "pending_payment")
    let cleanStatus = String(newStatus || "").toLowerCase().trim().replace(/[\s-]+/g, "_");
    if (cleanStatus === "pending") cleanStatus = "pending_payment";

    try {
      const res = await adminApiFetch(`/api/v1/admin/orders/${encodeURIComponent(orderId)}/status`, {
        method: "PATCH",
        body: JSON.stringify({ status: cleanStatus, note: trackingNotes || "" }),
      });

      if (res && res.data) {
        freshOrder = normalizeOrder(res.data);
      }
    } catch (err) {
      console.error("Backend order status update failed:", err);
      throw err;
    }

    if (freshOrder) {
      setOrders((prev) => {
        const updated = prev.map((o) =>
          o.id === orderId || o.orderNumber === orderId || o._id === freshOrder._id
            ? { ...o, ...freshOrder }
            : o
        );
        storage.set(STORAGE_KEYS.ORDERS, updated);
        storage.set("divyam_ayurveda_orders", updated);
        return updated;
      });

      if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("divyam_order_updated", { detail: freshOrder }));
      }
    }

    // Delivering / cancelling an order changes inventory on the server: reload the stock figures
    fetchAdminProducts();

    logAction("Updated Order Status", "Sales", `Order ${orderId} marked as ${newStatus}`);
    return freshOrder;
  };

  const dispatchShipment = async (orderId) => {
    const res = await adminApiFetch(`/api/v1/admin/orders/${encodeURIComponent(orderId)}/shipments`, {
      method: "POST",
    });
    const orderData = res.data?.order || res.data;
    const shipmentData = res.data?.shipment || res.data;
    const freshOrder = normalizeOrder(orderData);

    setOrders((prev) => {
      const updated = prev.map((o) =>
        o.id === orderId || o.orderNumber === orderId ? { ...o, ...freshOrder } : o
      );
      storage.set(STORAGE_KEYS.ORDERS, updated);
      storage.set("divyam_ayurveda_orders", updated);
      return updated;
    });

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("divyam_order_updated", { detail: freshOrder }));
    }
    logAction(
      "Dispatched with Shiprocket",
      "Logistics",
      `Order ${orderId} dispatched with AWB ${shipmentData?.awbCode || freshOrder?.trackingNumber}`
    );
    return { order: freshOrder, shipment: shipmentData };
  };

  const advanceShipment = async (orderId, nextStage, customNote = "") => {
    const res = await adminApiFetch(
      `/api/v1/admin/orders/${encodeURIComponent(orderId)}/shipments/advance`,
      {
        method: "POST",
        body: JSON.stringify({ stage: nextStage, note: customNote }),
      }
    );
    const orderData = res.data?.order || res.data;
    const shipmentData = res.data?.shipment || res.data;
    const freshOrder = normalizeOrder(orderData);

    setOrders((prev) => {
      const updated = prev.map((o) =>
        o.id === orderId || o.orderNumber === orderId ? { ...o, ...freshOrder } : o
      );
      storage.set(STORAGE_KEYS.ORDERS, updated);
      storage.set("divyam_ayurveda_orders", updated);
      return updated;
    });

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("divyam_order_updated", { detail: freshOrder }));
    }
    logAction("Advanced Courier Status", "Logistics", `Order ${orderId} progressed to ${nextStage}`);
    return { order: freshOrder, shipment: shipmentData };
  };

  const updateTrackingInfo = async (orderId, trackingPayload) => {
    const res = await adminApiFetch(
      `/api/v1/admin/orders/${encodeURIComponent(orderId)}/tracking`,
      {
        method: "PATCH",
        body: JSON.stringify(trackingPayload),
      }
    );
    const freshOrder = normalizeOrder(res.data);

    setOrders((prev) => {
      const updated = prev.map((o) =>
        o.id === orderId || o.orderNumber === orderId ? { ...o, ...freshOrder } : o
      );
      storage.set(STORAGE_KEYS.ORDERS, updated);
      storage.set("divyam_ayurveda_orders", updated);
      return updated;
    });

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("divyam_order_updated", { detail: freshOrder }));
    }
    logAction("Updated Courier Tracking", "Logistics", `Order ${orderId} tracking details updated`);
    return freshOrder;
  };

  const getOrderShipment = async (orderId) => {
    try {
      const res = await adminApiFetch(
        `/api/v1/admin/orders/${encodeURIComponent(orderId)}/shipment`
      );
      return res.data || null;
    } catch (_) {
      return null;
    }
  };

  const updatePaymentStatus = async (orderId, newPaymentStatus, notes) => {
    let freshOrder = null;
    const cleanPay = String(newPaymentStatus || "").toLowerCase().trim();

    try {
      const res = await adminApiFetch(`/api/v1/admin/orders/${encodeURIComponent(orderId)}/payment-status`, {
        method: "PATCH",
        body: JSON.stringify({
          paymentStatus: cleanPay,
          note: notes || `Payment status changed to ${newPaymentStatus}`,
        }),
      });

      if (res && res.data) {
        freshOrder = normalizeOrder(res.data);
      }
    } catch (err) {
      console.warn("Backend payment status update failed:", err);
    }

    setOrders((prev) => {
      const updated = prev.map((o) => {
        if (o.id === orderId || o.orderNumber === orderId || (freshOrder && o._id === freshOrder._id)) {
          if (freshOrder) return { ...o, ...freshOrder };
          return {
            ...o,
            paymentStatus: newPaymentStatus,
            timeline: [
              ...(o.timeline || []),
              {
                status: `Payment ${newPaymentStatus}`,
                time: new Date().toISOString(),
                completed: true,
              },
            ],
          };
        }
        return o;
      });
      storage.set(STORAGE_KEYS.ORDERS, updated);
      const customerOrders = storage.get("divyam_ayurveda_orders", []);
      const syncedCustomerOrders = customerOrders.map((o) => {
        if (o.id === orderId || o.orderNumber === orderId) {
          return freshOrder ? { ...o, ...freshOrder } : { ...o, paymentStatus: newPaymentStatus };
        }
        return o;
      });
      storage.set("divyam_ayurveda_orders", syncedCustomerOrders);
      return updated;
    });

    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("divyam_order_updated", { detail: freshOrder || { id: orderId, paymentStatus: newPaymentStatus } }));
    }

    logAction("Updated Payment Status", "Sales", `Order ${orderId} payment marked as ${newPaymentStatus}`);
    return freshOrder;
  };

  // ================= CUSTOMERS MANAGEMENT =================
  // Block / unblock a customer account in the database ("Blocked" accounts cannot sign in).
  // Throws on server errors so the page can tell the admin.
  const updateCustomerStatus = async (customerId, newStatus) => {
    const json = await adminApiFetch(`/api/v1/admin/customers/${customerId}`, {
      method: "PATCH",
      body: JSON.stringify({ status: newStatus }),
    });
    setCustomers((prev) => prev.map((c) => (c.id === customerId ? { ...c, ...json.data } : c)));
    logAction("Updated Customer Status", "Customers", `Customer ${json.data.email} status set to ${newStatus}`);
    return json.data;
  };

  // Fresh profile for one customer, including internal staff notes
  const fetchAdminCustomer = async (customerId) => {
    const json = await adminApiFetch(`/api/v1/admin/customers/${customerId}`);
    setCustomers((prev) => prev.map((c) => (c.id === customerId ? { ...c, ...json.data } : c)));
    return json.data;
  };

  const addCustomerNote = async (customerId, text) => {
    const json = await adminApiFetch(`/api/v1/admin/customers/${customerId}/notes`, {
      method: "POST",
      body: JSON.stringify({ text }),
    });
    return json.data; // updated notes list, newest first
  };

  // ================= REVIEWS MODERATION =================
  // Moderation is saved in the database first; failures are reported instead of silently kept in the browser
  const moderateReview = async (reviewId, newStatus) => {
    try {
      const json = await adminApiFetch(`/api/v1/admin/reviews/${reviewId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: String(newStatus).toLowerCase() }),
      });
      const updated = normalizeReview(json.data);
      setReviews((prev) => prev.map((r) => (r.id === reviewId ? updated : r)));
      logAction("Moderated Review", "Customers", `Review ${reviewId} marked as ${newStatus}`);
      return true;
    } catch (err) {
      window.alert(err.message || "Could not update this review.");
      return false;
    }
  };

  const deleteReview = async (reviewId) => {
    try {
      await adminApiFetch(`/api/v1/admin/reviews/${reviewId}`, { method: "DELETE" });
      setReviews((prev) => prev.filter((r) => r.id !== reviewId));
      logAction("Deleted Review", "Customers", `Deleted review: ${reviewId}`);
      return true;
    } catch (err) {
      window.alert(err.message || "Could not delete this review.");
      return false;
    }
  };

  const addReview = (reviewData) => {
    const newReview = normalizeReview({
      ...reviewData,
      id: reviewData.id || `rev-${Date.now().toString().slice(-6)}`,
      date: reviewData.date || new Date().toISOString(),
      status: reviewData.status || (storeSettings?.store?.enableReviewModeration ? "Pending" : "Approved"),
      verifiedPurchase: reviewData.verifiedPurchase !== false,
    });

    setReviews((prev) => [newReview, ...prev]);
    logAction("Customer Review Submitted", "Customers", `New review for ${newReview.productTitle} by ${newReview.userName}`);
    return newReview;
  };

  // ================= COUPONS =================
  // Coupons are persisted in MongoDB first so the storefront Offers page and checkout use the same data.
  // These throw on server errors (e.g. duplicate code) so the admin form can show the message.
  const addCoupon = async (couponData) => {
    const json = await adminApiFetch("/api/v1/admin/coupons", {
      method: "POST",
      body: JSON.stringify(couponData),
    });
    const created = json.data;
    setCoupons((prev) => [created, ...prev]);
    logAction("Created Coupon", "Sales", `Added coupon: ${created.code}`);
    return created;
  };

  const updateCoupon = async (id, data) => {
    const json = await adminApiFetch(`/api/v1/admin/coupons/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
    setCoupons((prev) => prev.map((c) => (c.id === id ? json.data : c)));
    logAction("Updated Coupon", "Sales", `Updated coupon: ${json.data.code}`);
    return json.data;
  };

  const toggleCouponStatus = (id) => {
    const coupon = coupons.find((c) => c.id === id);
    return coupon ? updateCoupon(id, { isActive: !coupon.isActive }) : undefined;
  };

  const deleteCoupon = async (id) => {
    await adminApiFetch(`/api/v1/admin/coupons/${id}`, { method: "DELETE" });
    setCoupons((prev) => prev.filter((c) => c.id !== id));
    logAction("Deleted Coupon", "Sales", `Removed coupon: ${id}`);
  };

  // ================= HOMEPAGE & CONTENT BUILDER =================
  const updateHomepageBuilder = (newContent) => {
    const updated = { ...homepageContent, ...newContent };
    setHomepageContent(updated);
    logAction("Updated Homepage Builder", "Storefront", "Updated hero and section display parameters.");

    try {
      const { headers, isStaff } = getAdminAuth();
      if (isStaff) {
        fetch("/api/v1/admin/homepage", {
          method: "PATCH",
          headers,
          body: JSON.stringify(updated),
          credentials: "include",
        }).catch((err) => console.warn("Admin update homepage backend sync warning:", err));
      }
    } catch (_) {}
  };

  const addBlogPost = async (postData) => {
    const json = await adminApiFetch("/api/v1/admin/blog", {
      method: "POST",
      body: JSON.stringify(postData),
    });
    const created = json.data;
    setBlogPosts((prev) => [created, ...prev.filter((p) => p.id !== created.id && p._id !== created.id)]);
    storage.set(STORAGE_KEYS.BLOG, [created, ...blogPosts.filter((p) => p.id !== created.id && p._id !== created.id)]);
    logAction("Created Blog Post", "Storefront", `Published article: ${created.title}`);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("divyam_blog_updated", { detail: created }));
    }
    return created;
  };

  const updateBlogPost = async (id, data) => {
    const json = await adminApiFetch(`/api/v1/admin/blog/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
    const updated = json.data;
    setBlogPosts((prev) => prev.map((p) => (p.id === id || p._id === id ? updated : p)));
    storage.set(STORAGE_KEYS.BLOG, blogPosts.map((p) => (p.id === id || p._id === id ? updated : p)));
    logAction("Updated Blog Post", "Storefront", `Edited article: ${updated.title}`);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("divyam_blog_updated", { detail: updated }));
    }
    return updated;
  };

  const deleteBlogPost = async (id) => {
    await adminApiFetch(`/api/v1/admin/blog/${id}`, {
      method: "DELETE",
    });
    setBlogPosts((prev) => prev.filter((p) => p.id !== id && p._id !== id));
    storage.set(STORAGE_KEYS.BLOG, blogPosts.filter((p) => p.id !== id && p._id !== id));
    logAction("Deleted Blog Post", "Storefront", `Removed article ID: ${id}`);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("divyam_blog_updated", { detail: { id, deleted: true } }));
    }
  };

  // ================= SUPPORT & ENQUIRIES =================
  const updateEnquiryStatus = (id, status, notes) => {
    setContactEnquiries((prev) =>
      prev.map((e) =>
        e.id === id ? { ...e, status, internalNotes: notes || e.internalNotes } : e
      )
    );
  };

  const updateTicketStatus = (id, status, notes) => {
    setSupportTickets((prev) =>
      prev.map((t) =>
        t.id === id ? { ...t, status, internalNotes: notes || t.internalNotes } : t
      )
    );
  };

  // ================= ADMIN USERS & ROLES =================
  const addAdminUser = (userData) => {
    const newUser = {
      ...userData,
      id: `admin-${Date.now().toString().slice(-4)}`,
      createdAt: new Date().toISOString(),
      lastLogin: "Never",
      status: "active",
    };
    setAdminUsers((prev) => [...prev, newUser]);
    logAction("Added Admin User", "Administration", `Created user ${newUser.name} with role ${newUser.role}`);
  };

  const updateAdminUser = (id, data) => {
    setAdminUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...data } : u)));
  };

  const deleteAdminUser = (id) => {
    setAdminUsers((prev) => prev.filter((u) => u.id !== id));
  };

  // ================= SETTINGS =================
  const updateSettings = (section, values) => {
    const updated = {
      ...storeSettings,
      [section]: {
        ...storeSettings[section],
        ...values,
      },
    };
    setStoreSettings(updated);
    logAction("Updated Settings", "Configuration", `Modified ${section} parameters.`);

    try {
      const { headers, isStaff } = getAdminAuth();
      if (isStaff) {
        fetch("/api/v1/admin/settings", {
          method: "PATCH",
          headers,
          body: JSON.stringify(updated),
          credentials: "include",
        }).catch((err) => console.warn("Admin update settings backend sync warning:", err));
      }
    } catch (_) {}
  };

  // ================= RESET / CLEAN LOCAL STORAGE =================
  const resetDemoData = () => {
    setProducts([]);
    setCategories([]);
    setCollections([]);
    setBrands([]);
    setOrders([]);
    setCustomers([]);
    setReviews([]);
    setCoupons([]);
    setBlogPosts([]);
    setIngredients([]);
    setSupportTickets([]);
    setContactEnquiries([]);
    setSubscribers([]);
    setAdminUsers([]);
    setAuditLogs([]);

    // Clear storage keys
    storage.set(STORAGE_KEYS.PRODUCTS, []);
    storage.set(STORAGE_KEYS.CATEGORIES, []);
    storage.set(STORAGE_KEYS.COLLECTIONS, []);
    storage.set(STORAGE_KEYS.BRANDS, []);
    storage.set(STORAGE_KEYS.ORDERS, []);
    storage.set(STORAGE_KEYS.CUSTOMERS, []);
    storage.set(STORAGE_KEYS.REVIEWS, []);
    storage.set(STORAGE_KEYS.COUPONS, []);
    storage.set(STORAGE_KEYS.BLOG, []);
    storage.set(STORAGE_KEYS.INGREDIENTS, []);
    storage.set(STORAGE_KEYS.SUPPORT, []);
    storage.set(STORAGE_KEYS.ENQUIRIES, []);
    storage.set(STORAGE_KEYS.SUBSCRIBERS, []);
    storage.set(STORAGE_KEYS.ADMIN_USERS, []);
    storage.set(STORAGE_KEYS.AUDIT, []);

    // Re-fetch clean database records
    const { isStaff } = getAdminAuth();
    if (isStaff) {
      fetchAdminOrders();
      fetchAdminProducts();
      fetchAdminCategories();
      fetchAdminBrands();
      fetchAdminCollections();
      fetchAdminIngredients();
      fetchAdminCoupons();
      fetchAdminReviews();
      fetchAdminCustomers();
      fetchAdminEnquiries();
      fetchAdminSupportTickets();
      fetchAdminSubscribers();
      fetchAdminUsers();
      fetchAdminAuditLogs();
      fetchAdminHomepage();
      fetchAdminSettings();
      fetchAdminBlogPosts();
    }
    logAction("Reset Storage", "System", "Cleaned local state and synchronized with database.");
  };

  // Revenue report computed by the server (what counts as revenue is decided there, in one place)
  const fetchRevenueReport = async ({ days = "30", basis = "collected", months = 6 } = {}) => {
    const json = await adminApiFetch(`/api/v1/admin/reports/revenue?days=${encodeURIComponent(days)}&basis=${encodeURIComponent(basis)}&months=${months}`);
    return json.data;
  };

  // ================= CALCULATED KPIS & METRICS =================
  // Net revenue = orders whose payment was received, minus refunds (pending/unpaid and cancelled orders do not count)
  const totalRevenue = orders.reduce((sum, o) => {
    const pay = String(o.paymentStatus || "").toLowerCase();
    const received = pay === "paid" || pay.includes("refund");
    if (!received || String(o.orderStatus || o.status).toLowerCase() === "cancelled") return sum;
    const total = Number(o.pricing?.total || o.totalAmount || o.total || 0);
    const refunded = Number(o.refunded) > 0 ? Number(o.refunded) : pay === "refunded" ? total : 0;
    return sum + Math.max(0, total - refunded);
  }, 0);
  const totalOrders = orders.length;
  const totalCustomers = customers.length;
  const totalProductsCount = products.length;
  const pendingOrdersCount = orders.filter(
    (o) => (o.orderStatus || o.status) === "Pending" || (o.orderStatus || o.status) === "Processing"
  ).length;
  const lowStockCount = products.filter(
    (p) => (p.stock ?? p.stockQuantity ?? 0) <= (p.reorderThreshold || storeSettings?.store?.lowStockThreshold || 10)
  ).length;
  const pendingReviewsCount = reviews.filter(
    (r) => (r.status || "").toLowerCase() === "pending"
  ).length;
  const openTicketsCount = supportTickets.filter(
    (t) =>
      (t.status || "").toLowerCase() === "new" ||
      (t.status || "").toLowerCase() === "in_progress" ||
      (t.status || "").toLowerCase() === "open"
  ).length;

  const kpis = {
    totalRevenue,
    totalOrders,
    totalCustomers,
    totalProducts: totalProductsCount,
    totalProductsCount,
    pendingOrders: pendingOrdersCount,
    pendingOrdersCount,
    lowStockCount,
    pendingReviews: pendingReviewsCount,
    pendingReviewsCount,
    openTickets: openTicketsCount,
    openTicketsCount,
  };

  // Convenience Aliases for all Admin Pages
  const saveProduct = async (productData) => {
    const isExisting = Boolean(
      productData.id &&
      !String(productData.id).startsWith("prod-") &&
      products.some((p) => p.id === productData.id || p._id === productData.id)
    );
    if (isExisting) {
      return await updateProduct(productData.id, productData);
    } else {
      return await addProduct(productData);
    }
  };

  // Persists the new stock level to the backend first, so the storefront (which reads
  // from the API) and a page refresh both see it. Throws if the server rejects the change.
  const updateProductStock = async (productId, newStock, reason = "") => {
    const target = Math.max(0, Math.floor(Number(newStock)));
    if (!Number.isFinite(target)) throw new Error("Please enter a valid stock quantity.");

    const json = await adminApiFetch("/api/v1/admin/inventory/adjustments", {
      method: "POST",
      body: JSON.stringify({ productId, operation: "set", quantity: target, reason }),
    });

    const stockQuantity = json.data?.stockQuantity ?? target;
    const reorderThreshold = json.data?.reorderThreshold;
    const applyStock = (p) =>
      p.id === productId || p._id === productId
        ? {
            ...p,
            stock: stockQuantity,
            stockQuantity,
            ...(reorderThreshold !== undefined ? { reorderThreshold } : {}),
          }
        : p;
    setProducts((prev) => prev.map(applyStock));
    storage.set(STORAGE_KEYS.PRODUCTS, storage.get(STORAGE_KEYS.PRODUCTS, []).map(applyStock));

    logAction("Adjusted Stock", "Inventory", `Set stock for ${productId} to ${stockQuantity}. ${reason}`);
    return stockQuantity;
  };

  const deleteBulkProducts = (ids) => {
    bulkDeleteProducts(ids);
  };

  const saveCategory = (catData) => {
    // Match by id only: a new category reusing an existing slug must be rejected by the server, not overwrite it
    const target = categories.find((c) => c.id === catData.id);
    return target ? updateCategory(target.id, catData) : addCategory(catData);
  };

  const saveBrand = (brandData) => {
    const exists = brands.some((b) => b.id === brandData.id);
    return exists ? updateBrand(brandData.id, brandData) : addBrand(brandData);
  };

  const saveCollection = (colData) => {
    const exists = collections.some((c) => c.id === colData.id);
    return exists ? updateCollection(colData.id, colData) : addCollection(colData);
  };

  const saveCoupon = (couponData) => {
    const exists = coupons.some((c) => c.id === couponData.id);
    return exists ? updateCoupon(couponData.id, couponData) : addCoupon(couponData);
  };

  const saveCustomer = (customerData) => updateCustomerStatus(customerData.id, customerData.status);

  const saveBlogPost = async (postData) => {
    const target = blogPosts.find(
      (b) => (b.id && b.id === postData.id) || (b._id && b._id === postData.id)
    );
    const isMongoId = postData.id && /^[a-f\d]{24}$/i.test(postData.id);
    if (target && isMongoId) {
      return await updateBlogPost(postData.id, postData);
    } else {
      return await addBlogPost(postData);
    }
  };

  const saveAdminUser = (userData) => {
    const exists = adminUsers.some((u) => u.id === userData.id);
    if (exists) {
      updateAdminUser(userData.id, userData);
    } else {
      addAdminUser(userData);
    }
  };

  const saveStoreSettings = (newSettings) => {
    setStoreSettings(newSettings);
    logAction("Updated Settings", "Configuration", "Updated global store configuration.");
  };

  const saveHomepageContent = (newContent) => {
    setHomepageContent(newContent);
    logAction("Updated Homepage", "Storefront", "Updated storefront layout and hero parameters.");
  };

  const deleteSubscriber = (id) => {
    setSubscribers((prev) => prev.filter((s) => s.id !== id && s.email !== id));
  };

  return (
    <AdminContext.Provider
      value={{
        // Datasets
        products,
        categories,
        brands,
        collections,
        orders,
        customers,
        reviews,
        coupons,
        blogPosts,
        ingredients,
        supportTickets,
        contactEnquiries,
        enquiries: contactEnquiries,
        subscribers,
        adminUsers,
        roles: ROLE_DEFINITIONS,
        homepageContent,
        storeSettings,
        auditLogs,
        returns,
        referralsData,
        referrals: referralsData?.items || [],
        referralMetrics: referralsData?.metrics || {
          totalAttributed: 0,
          qualifyingOrders: 0,
          totalRevenue: 0,
          pendingRewards: 0,
          creditedRewards: 0,
        },
        referralSettings,

        // Returns & Referrals actions
        fetchAdminReturns,
        fetchRevenueReport,
        approveReturnRequest,
        rejectReturnRequest,
        receiveReturnRequest,
        refundReturnRequest,
        refreshReturnRefund,
        fetchAdminReferrals,
        saveReferralSettings,
        approveReferral,
        voidReferral,
        downloadReferralsCsv,

        // KPIs & Metrics
        kpis,
        metrics: kpis,
        lowStockCount,
        pendingOrdersCount,
        pendingReviewsCount,
        openTicketsCount,

        // Actions & Aliases
        addProduct,
        updateProduct,
        saveProduct,
        deleteProduct,
        duplicateProduct,
        toggleProductStatus,
        toggleProductFeatured,
        adjustStock,
        updateProductStock,
        bulkDeleteProducts,
        deleteBulkProducts,

        addCategory,
        updateCategory,
        saveCategory,
        deleteCategory,

        addBrand,
        updateBrand,
        saveBrand,
        deleteBrand,

        addCollection,
        updateCollection,
        saveCollection,
        deleteCollection,

        addIngredient,
        updateIngredient,
        deleteIngredient,
        fetchAdminIngredients,
        fetchAdminProducts,
        fetchAdminCategories,
        fetchAdminBrands,
        fetchAdminCollections,
        fetchAdminCoupons,
        fetchAdminReviews,
        fetchAdminCustomers,
        fetchAdminEnquiries,
        fetchAdminSupportTickets,
        fetchAdminSubscribers,
        fetchAdminUsers,
        fetchAdminAuditLogs,
        fetchAdminHomepage,
        fetchAdminSettings,

        updateOrderStatus,
        updatePaymentStatus,
        fetchAdminOrders,
        refreshOrders: fetchAdminOrders,
        dispatchShipment,
        advanceShipment,
        updateTrackingInfo,
        getOrderShipment,

        updateCustomerStatus,
        fetchAdminCustomer,
        addCustomerNote,
        saveCustomer,

        addReview,
        submitReview: addReview,
        moderateReview,
        deleteReview,

        addCoupon,
        updateCoupon,
        saveCoupon,
        toggleCouponStatus,
        deleteCoupon,

        updateHomepageBuilder,
        saveHomepageContent,
        fetchAdminBlogPosts,
        addBlogPost,
        updateBlogPost,
        saveBlogPost,
        deleteBlogPost,

        updateEnquiryStatus,
        updateTicketStatus,
        deleteSubscriber,

        addAdminUser,
        updateAdminUser,
        saveAdminUser,
        deleteAdminUser,

        updateSettings,
        saveStoreSettings,
        resetDemoData,
        logAction,
      }}
    >
      {children}
    </AdminContext.Provider>
  );
};

export const useAdmin = () => {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error("useAdmin must be used within an AdminProvider");
  }
  return context;
};

