import React, { createContext, useContext, useState, useEffect } from "react";
import { storage } from "../utils/storage";
import { products as seedProducts } from "../data/products";
import { categories as seedCategories } from "../data/categories";
import { collections as seedCollections } from "../data/collections";
import { blogPosts as seedBlogPosts } from "../data/blogPosts";
import { ingredients as seedIngredients } from "../data/ingredients";
import { initialBrands } from "../data/brands";
import { initialCustomers } from "../data/customers";
import { initialReviews } from "../data/reviews";
import { initialCoupons } from "../data/coupons";
import { initialAdminUsers, ROLE_DEFINITIONS } from "../data/adminUsers";
import {
  initialSupportTickets,
  initialContactEnquiries,
  initialSubscribers,
} from "../data/supportTickets";
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
};

// Seed initial orders if empty
const INITIAL_SEED_ORDERS = [
  {
    id: "DA-981240-312",
    createdAt: "2025-10-12T08:30:00Z",
    status: "Delivered",
    estimatedDelivery: "2025-10-15T18:00:00Z",
    customer: {
      name: "Priya S.",
      email: "priya.s@example.com",
      phone: "+91 98450 12345",
    },
    shippingAddress: {
      street: "Villa 14, Palm Meadows, Whitefield",
      city: "Bengaluru",
      state: "Karnataka",
      pincode: "560066",
    },
    items: [
      {
        productId: "prod-001",
        name: "Organic Turmeric Powder",
        slug: "organic-turmeric-powder-lakadong",
        image: "/images/ProductImages/PureHimalayanShilajit.jpeg",
        size: "250g",
        price: 249,
        quantity: 2,
        total: 498,
      },
      {
        productId: "prod-002",
        name: "Pure Wild Forest Honey",
        slug: "pure-wild-forest-honey",
        image: "/images/ProductImages/PureHimalayanShilajit2.jpeg",
        size: "500g",
        price: 389,
        quantity: 1,
        total: 389,
      },
    ],
    pricing: {
      subtotal: 887,
      shipping: 0,
      discount: 0,
      total: 887,
    },
    paymentMethod: "Cash on Delivery",
    paymentStatus: "Paid on Delivery",
    deliveryMethod: "standard",
    timeline: [
      { status: "Order Placed", time: "2025-10-12T08:30:00Z", completed: true },
      { status: "Packed at Dispensary", time: "2025-10-12T14:00:00Z", completed: true },
      { status: "Dispatched", time: "2025-10-13T10:00:00Z", completed: true },
      { status: "Out for Delivery", time: "2025-10-15T09:00:00Z", completed: true },
      { status: "Delivered", time: "2025-10-15T15:30:00Z", completed: true },
    ],
    notes: "Leave with security if not available.",
  },
  {
    id: "DA-981241-584",
    createdAt: "2025-10-13T11:45:00Z",
    status: "Processing",
    estimatedDelivery: "2025-10-17T18:00:00Z",
    customer: {
      name: "Rahul Mehta",
      email: "rahul.m@example.com",
      phone: "+91 97110 88990",
    },
    shippingAddress: {
      street: "Plot 88, Model Colony, Shivajinagar",
      city: "Pune",
      state: "Maharashtra",
      pincode: "411016",
    },
    items: [
      {
        productId: "prod-003",
        name: "Organic Ashwagandha Extract",
        slug: "organic-ashwagandha-capsules",
        image: "/images/ProductImages/Ashuwaganda.png",
        size: "60 Capsules",
        price: 499,
        quantity: 2,
        total: 998,
      },
    ],
    pricing: {
      subtotal: 998,
      shipping: 0,
      discount: 100,
      total: 898,
    },
    paymentMethod: "Online Payment (Demo UPI)",
    paymentStatus: "Paid (Demo)",
    deliveryMethod: "standard",
    timeline: [
      { status: "Order Placed", time: "2025-10-13T11:45:00Z", completed: true },
      { status: "Packed at Dispensary", time: "2025-10-13T16:00:00Z", completed: true },
      { status: "Dispatched", time: null, completed: false },
      { status: "Out for Delivery", time: null, completed: false },
      { status: "Delivered", time: null, completed: false },
    ],
    notes: "",
  },
  {
    id: "DA-981242-710",
    createdAt: "2025-10-14T09:10:00Z",
    status: "Pending",
    estimatedDelivery: "2025-10-18T18:00:00Z",
    customer: {
      name: "Aarav Sharma",
      email: "aarav.sharma@example.com",
      phone: "+91 98765 43210",
    },
    shippingAddress: {
      street: "Flat 402, Nilgiri Heights, Indiranagar",
      city: "Bengaluru",
      state: "Karnataka",
      pincode: "560038",
    },
    items: [
      {
        productId: "prod-009",
        name: "Authentic Kumkumadi Miraculous Tailam",
        slug: "kumkumadi-tailam-saffron-facial-oil",
        image: "/images/ProductImages/VitaminC.png",
        size: "30ml",
        price: 799,
        quantity: 1,
        total: 799,
      },
      {
        productId: "prod-006",
        name: "Classical Triphala Churna",
        slug: "triphala-churna-classical",
        image: "/images/ProductImages/PureHimalayanShilajit3.jpeg",
        size: "200g",
        price: 199,
        quantity: 1,
        total: 199,
      },
    ],
    pricing: {
      subtotal: 998,
      shipping: 0,
      discount: 0,
      total: 998,
    },
    paymentMethod: "Cash on Delivery",
    paymentStatus: "Pending on Delivery",
    deliveryMethod: "standard",
    timeline: [
      { status: "Order Placed", time: "2025-10-14T09:10:00Z", completed: true },
      { status: "Packed at Dispensary", time: null, completed: false },
      { status: "Dispatched", time: null, completed: false },
      { status: "Out for Delivery", time: null, completed: false },
      { status: "Delivered", time: null, completed: false },
    ],
    notes: "Call before arrival.",
  },
];

export const normalizeProduct = (p) => {
  if (!p) return null;
  const title = p.title || p.name || "Untitled Product";
  const name = p.name || p.title || "Untitled Product";
  const sku = p.sku || `DIV-${p.id ? String(p.id).replace("prod-", "") : "101"}`;
  let image =
    p.image ||
    (Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : "") ||
    "/images/ProductImages/Ashuwaganda.png";
  if (typeof image === "string" && image.includes("unsplash")) {
    const seed = (seedProducts || []).find((sp) => sp.id === p.id);
    image = seed ? seed.images[0] : "/images/ProductImages/Ashuwaganda.png";
  }
  let images = Array.isArray(p.images) && p.images.length > 0 ? p.images : [image];
  if (images.some((img) => typeof img === "string" && img.includes("unsplash"))) {
    const seed = (seedProducts || []).find((sp) => sp.id === p.id);
    images = seed ? seed.images : [image];
  }
  const stock =
    p.stock !== undefined ? p.stock : (p.stockQuantity !== undefined ? p.stockQuantity : 50);
  const stockQuantity = stock;
  // Resolve human-readable category name and slug categoryId
  let resolvedCategoryName = p.category;
  let resolvedCategoryId = p.categoryId;

  const matchedCat = (seedCategories || []).find(
    (c) =>
      c.id === p.categoryId ||
      c.slug === p.categoryId ||
      c.id === p.category ||
      c.slug === p.category ||
      c.name?.toLowerCase() === (p.category || "").toLowerCase()
  );

  if (matchedCat) {
    resolvedCategoryName = matchedCat.name;
    resolvedCategoryId = matchedCat.id || matchedCat.slug;
  } else if (!resolvedCategoryName && resolvedCategoryId) {
    resolvedCategoryName = resolvedCategoryId
      .split("-")
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(" ");
  }

  const category = resolvedCategoryName || "Ayurvedic Herbs";
  const categoryId = resolvedCategoryId || "ayurvedic-herbs";
  const price = Number(p.price) || 0;
  const compareAtPrice = p.compareAtPrice || p.originalPrice || null;
  const originalPrice = compareAtPrice;
  const status = p.status || "Active";
  const reorderThreshold = p.reorderThreshold || 10;

  return {
    ...p,
    title,
    name,
    sku,
    image,
    images,
    stock,
    stockQuantity,
    category,
    categoryId,
    price,
    compareAtPrice,
    originalPrice,
    status,
    reorderThreshold,
  };
};

export const normalizeOrder = (o) => {
  if (!o) return null;
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
  const status = o.orderStatus || o.status || "Pending";
  const date = o.date || o.orderDate || o.createdAt || new Date().toISOString();

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
    customerName,
    email,
    phone,
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
    const raw = storage.get(STORAGE_KEYS.PRODUCTS, seedProducts);
    const upgraded = (raw || []).map((p) => {
      const seed = seedProducts.find((sp) => sp.id === p.id);
      if (seed && (!p.images || !p.images[0] || (typeof p.images[0] === "string" && p.images[0].includes("unsplash")))) {
        return {
          ...p,
          images: seed.images,
          image: seed.images[0],
        };
      }
      return p;
    });
    return upgraded.map(normalizeProduct).filter(Boolean);
  });
  useEffect(() => {
    storage.set(STORAGE_KEYS.PRODUCTS, products);
  }, [products]);

  // 2. Categories
  const [categories, setCategories] = useState(() => {
    const raw = storage.get(STORAGE_KEYS.CATEGORIES, seedCategories);
    return (raw || []).map((c) => {
      const seed = seedCategories.find((sc) => sc.id === c.id);
      if (seed && (!c.image || (typeof c.image === "string" && c.image.includes("unsplash")))) {
        return {
          ...c,
          image: seed.image,
          bannerImage: seed.bannerImage,
        };
      }
      return c;
    });
  });
  useEffect(() => {
    storage.set(STORAGE_KEYS.CATEGORIES, categories);
  }, [categories]);

  // 3. Brands
  const [brands, setBrands] = useState(() =>
    storage.get(STORAGE_KEYS.BRANDS, initialBrands)
  );
  useEffect(() => {
    storage.set(STORAGE_KEYS.BRANDS, brands);
  }, [brands]);

  // 4. Collections
  const [collections, setCollections] = useState(() => {
    const raw = storage.get(STORAGE_KEYS.COLLECTIONS, seedCollections);
    return (raw || []).map((col) => {
      const seed = seedCollections.find((sc) => sc.id === col.id);
      if (seed && (!col.image || (typeof col.image === "string" && col.image.includes("unsplash")))) {
        return {
          ...col,
          image: seed.image,
        };
      }
      return col;
    });
  });
  useEffect(() => {
    storage.set(STORAGE_KEYS.COLLECTIONS, collections);
  }, [collections]);

  // 5. Orders
  const [orders, setOrders] = useState(() => {
    const raw = storage.get(STORAGE_KEYS.ORDERS, INITIAL_SEED_ORDERS);
    return (raw || []).map(normalizeOrder).filter(Boolean);
  });
  useEffect(() => {
    storage.set(STORAGE_KEYS.ORDERS, orders);
  }, [orders]);

  // 6. Customers
  const [customers, setCustomers] = useState(() =>
    storage.get(STORAGE_KEYS.CUSTOMERS, initialCustomers)
  );
  useEffect(() => {
    storage.set(STORAGE_KEYS.CUSTOMERS, customers);
  }, [customers]);

  // 7. Reviews
  const [reviews, setReviews] = useState(() => {
    const raw = storage.get(STORAGE_KEYS.REVIEWS, initialReviews);
    return (raw || []).map(normalizeReview).filter(Boolean);
  });
  useEffect(() => {
    storage.set(STORAGE_KEYS.REVIEWS, reviews);
  }, [reviews]);

  // 8. Coupons
  const [coupons, setCoupons] = useState(() =>
    storage.get(STORAGE_KEYS.COUPONS, initialCoupons)
  );
  useEffect(() => {
    storage.set(STORAGE_KEYS.COUPONS, coupons);
  }, [coupons]);

  // 9. Blog posts
  const [blogPosts, setBlogPosts] = useState(() => {
    const cached = storage.get(STORAGE_KEYS.BLOG, seedBlogPosts);
    return (cached || seedBlogPosts).map((post) => {
      const seed = (seedBlogPosts || []).find((sp) => sp.id === post.id || sp.slug === post.slug);
      if (seed && (!post.image || (typeof post.image === "string" && post.image.includes("unsplash")))) {
        return { ...post, image: seed.image };
      }
      return post;
    });
  });
  useEffect(() => {
    storage.set(STORAGE_KEYS.BLOG, blogPosts);
  }, [blogPosts]);

  // 10. Ingredients
  const [ingredients, setIngredients] = useState(() =>
    storage.get(STORAGE_KEYS.INGREDIENTS, seedIngredients)
  );
  useEffect(() => {
    storage.set(STORAGE_KEYS.INGREDIENTS, ingredients);
  }, [ingredients]);

  // 11. Support Tickets
  const [supportTickets, setSupportTickets] = useState(() =>
    storage.get(STORAGE_KEYS.SUPPORT, initialSupportTickets)
  );
  useEffect(() => {
    storage.set(STORAGE_KEYS.SUPPORT, supportTickets);
  }, [supportTickets]);

  // 12. Contact Enquiries
  const [contactEnquiries, setContactEnquiries] = useState(() =>
    storage.get(STORAGE_KEYS.ENQUIRIES, initialContactEnquiries)
  );
  useEffect(() => {
    storage.set(STORAGE_KEYS.ENQUIRIES, contactEnquiries);
  }, [contactEnquiries]);

  // 13. Subscribers
  const [subscribers, setSubscribers] = useState(() =>
    storage.get(STORAGE_KEYS.SUBSCRIBERS, initialSubscribers)
  );
  useEffect(() => {
    storage.set(STORAGE_KEYS.SUBSCRIBERS, subscribers);
  }, [subscribers]);

  // 14. Admin Users
  const [adminUsers, setAdminUsers] = useState(() =>
    storage.get(STORAGE_KEYS.ADMIN_USERS, initialAdminUsers)
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
    storage.get(STORAGE_KEYS.AUDIT, [
      {
        id: "log-001",
        action: "Store Initialized",
        module: "System",
        performedBy: "Divyam Store Administrator",
        timestamp: "2025-10-14T09:00:00Z",
        details: "Centralized Ayurvedic database loaded with 24 seed formulations.",
      },
    ])
  );
  useEffect(() => {
    storage.set(STORAGE_KEYS.AUDIT, auditLogs);
  }, [auditLogs]);

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
  const addProduct = (productData) => {
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

    const newProduct = {
      ...productData,
      id: productData.id || `prod-${Date.now().toString().slice(-4)}`,
      name: title,
      title: title,
      slug,
      image: primaryImg,
      images: imagesList,
      gallery: imagesList,
      rating: productData.rating || 4.8,
      reviewCount: productData.reviewCount || 0,
      createdAt: new Date().toISOString(),
      variants: productData.variants || [
        { size: productData.packSize || "250g", price: productData.price, originalPrice: productData.originalPrice || productData.compareAtPrice },
      ],
      stock: Number(productData.stock ?? productData.stockQuantity) || 0,
      stockQuantity: Number(productData.stockQuantity ?? productData.stock) || 0,
      price: Number(productData.price) || 0,
      compareAtPrice: Number(productData.compareAtPrice || productData.originalPrice) || null,
      originalPrice: Number(productData.originalPrice || productData.compareAtPrice) || Number(productData.price) || 0,
      status: productData.status || "Active",
    };
    setProducts((prev) => [newProduct, ...prev]);
    logAction("Created Product", "Catalog", `Added new formulation: ${newProduct.name}`);
    return newProduct;
  };

  const updateProduct = (productId, updatedData) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === productId) {
          const updated = { ...p, ...updatedData };
          if (updatedData.title || updatedData.name) {
            updated.title = updatedData.title || updatedData.name;
            updated.name = updated.title;
          }
          if (updatedData.images !== undefined) {
            updated.images = updatedData.images;
            updated.gallery = updatedData.images;
          }
          if (updatedData.image !== undefined) {
            updated.image = updatedData.image;
          }
          if (updatedData.stock !== undefined || updatedData.stockQuantity !== undefined) {
            const stockVal = Number(updatedData.stock ?? updatedData.stockQuantity);
            updated.stock = stockVal;
            updated.stockQuantity = stockVal;
          }
          if (updatedData.price !== undefined) {
            updated.price = Number(updatedData.price);
          }
          if (updatedData.compareAtPrice !== undefined || updatedData.originalPrice !== undefined) {
            const originalVal = Number(updatedData.compareAtPrice || updatedData.originalPrice);
            updated.compareAtPrice = originalVal;
            updated.originalPrice = originalVal;
          }
          return updated;
        }
        return p;
      })
    );
    logAction("Updated Product", "Catalog", `Modified product ID: ${productId}`);
  };

  const deleteProduct = (productId) => {
    const prod = products.find((p) => p.id === productId);
    setProducts((prev) => prev.filter((p) => p.id !== productId));
    logAction("Deleted Product", "Catalog", `Removed formulation: ${prod?.name || productId}`);
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
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id === productId) {
          const newStock = Math.max(0, (p.stockQuantity || 0) + adjustmentAmount);
          return { ...p, stockQuantity: newStock };
        }
        return p;
      })
    );
    logAction(
      "Adjusted Inventory",
      "Inventory",
      `Adjusted stock for product ${productId} by ${adjustmentAmount > 0 ? "+" : ""}${adjustmentAmount}. Reason: ${reason}`
    );
  };

  const bulkDeleteProducts = (productIds) => {
    setProducts((prev) => prev.filter((p) => !productIds.includes(p.id)));
    logAction("Bulk Deleted Products", "Catalog", `Removed ${productIds.length} products`);
  };

  // ================= CATEGORIES CRUD =================
  const addCategory = (categoryData) => {
    const slug =
      categoryData.slug ||
      categoryData.name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const newCat = {
      ...categoryData,
      id: slug,
      slug,
      itemCount: 0,
      featured: true,
    };
    setCategories((prev) => [...prev, newCat]);
    logAction("Created Category", "Catalog", `Added category: ${newCat.name}`);
    return newCat;
  };

  const updateCategory = (categoryId, updatedData) => {
    setCategories((prev) =>
      prev.map((c) => (c.id === categoryId ? { ...c, ...updatedData } : c))
    );
    logAction("Updated Category", "Catalog", `Modified category: ${categoryId}`);
  };

  const deleteCategory = (categoryId) => {
    setCategories((prev) => prev.filter((c) => c.id !== categoryId));
    logAction("Deleted Category", "Catalog", `Removed category: ${categoryId}`);
  };

  // ================= BRANDS & COLLECTIONS =================
  const addBrand = (brandData) => {
    const newBrand = {
      ...brandData,
      id: `brand-${Date.now().toString().slice(-4)}`,
      productCount: 0,
      status: "active",
    };
    setBrands((prev) => [...prev, newBrand]);
    logAction("Created Brand", "Catalog", `Added brand: ${newBrand.name}`);
  };

  const updateBrand = (id, data) => {
    setBrands((prev) => prev.map((b) => (b.id === id ? { ...b, ...data } : b)));
    logAction("Updated Brand", "Catalog", `Updated brand: ${id}`);
  };

  const deleteBrand = (id) => {
    setBrands((prev) => prev.filter((b) => b.id !== id));
    logAction("Deleted Brand", "Catalog", `Removed brand: ${id}`);
  };

  const addCollection = (data) => {
    const newCol = {
      ...data,
      id: `col-${Date.now().toString().slice(-4)}`,
      slug: data.name.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
      itemCount: 0,
      badge: data.badge || "Featured",
    };
    setCollections((prev) => [...prev, newCol]);
    logAction("Created Collection", "Catalog", `Added collection: ${newCol.name}`);
  };

  const updateCollection = (id, data) => {
    setCollections((prev) => prev.map((c) => (c.id === id ? { ...c, ...data } : c)));
  };

  const deleteCollection = (id) => {
    setCollections((prev) => prev.filter((c) => c.id !== id));
  };

  // ================= ORDERS MANAGEMENT =================
  const updateOrderStatus = (orderId, newStatus, trackingNotes) => {
    setOrders((prev) =>
      prev.map((o) => {
        if (o.id === orderId) {
          const updatedTimeline = (o.timeline || []).map((step) => {
            if (step.status.toLowerCase() === newStatus.toLowerCase()) {
              return { ...step, completed: true, time: new Date().toISOString() };
            }
            return step;
          });
          return {
            ...o,
            status: newStatus,
            timeline: updatedTimeline,
            notes: trackingNotes ? `${o.notes ? o.notes + " | " : ""}${trackingNotes}` : o.notes,
          };
        }
        return o;
      })
    );
    logAction("Updated Order Status", "Sales", `Order ${orderId} marked as ${newStatus}`);
  };

  const approveReturn = (orderId, refundAmount) => {
    updateOrderStatus(orderId, "Refunded", `Return approved. Mock refund of ₹${refundAmount} processed.`);
  };

  const rejectReturn = (orderId, reason) => {
    updateOrderStatus(orderId, "Delivered", `Return rejected: ${reason}`);
  };

  // ================= CUSTOMERS MANAGEMENT =================
  const updateCustomerStatus = (customerId, newStatus) => {
    setCustomers((prev) =>
      prev.map((c) => (c.id === customerId ? { ...c, status: newStatus } : c))
    );
    logAction("Updated Customer Status", "Customers", `Customer ${customerId} status set to ${newStatus}`);
  };

  // ================= REVIEWS MODERATION =================
  const moderateReview = (reviewId, newStatus) => {
    setReviews((prev) =>
      prev.map((r) => (r.id === reviewId ? { ...r, status: newStatus } : r))
    );
    logAction("Moderated Review", "Customers", `Review ${reviewId} marked as ${newStatus}`);
  };

  const deleteReview = (reviewId) => {
    setReviews((prev) => prev.filter((r) => r.id !== reviewId));
    logAction("Deleted Review", "Customers", `Deleted review: ${reviewId}`);
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
  const addCoupon = (couponData) => {
    const newCoupon = {
      ...couponData,
      id: `coup-${Date.now().toString().slice(-4)}`,
      code: couponData.code.toUpperCase(),
      usageCount: 0,
      status: "active",
    };
    setCoupons((prev) => [newCoupon, ...prev]);
    logAction("Created Coupon", "Sales", `Added coupon: ${newCoupon.code}`);
  };

  const updateCoupon = (id, data) => {
    setCoupons((prev) => prev.map((c) => (c.id === id ? { ...c, ...data } : c)));
  };

  const toggleCouponStatus = (id) => {
    setCoupons((prev) =>
      prev.map((c) => (c.id === id ? { ...c, status: c.status === "active" ? "inactive" : "active" } : c))
    );
  };

  const deleteCoupon = (id) => {
    setCoupons((prev) => prev.filter((c) => c.id !== id));
  };

  // ================= HOMEPAGE & CONTENT BUILDER =================
  const updateHomepageBuilder = (newContent) => {
    setHomepageContent((prev) => ({ ...prev, ...newContent }));
    logAction("Updated Homepage Builder", "Storefront", "Updated hero and section display parameters.");
  };

  const addBlogPost = (postData) => {
    const slug =
      postData.slug ||
      postData.title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const newPost = {
      ...postData,
      id: `blog-${Date.now().toString().slice(-4)}`,
      slug,
      date: new Date().toISOString().split("T")[0],
    };
    setBlogPosts((prev) => [newPost, ...prev]);
    logAction("Created Blog Post", "Storefront", `Published article: ${newPost.title}`);
  };

  const updateBlogPost = (id, data) => {
    setBlogPosts((prev) => prev.map((p) => (p.id === id ? { ...p, ...data } : p)));
    logAction("Updated Blog Post", "Storefront", `Edited article ID: ${id}`);
  };

  const deleteBlogPost = (id) => {
    setBlogPosts((prev) => prev.filter((p) => p.id !== id));
    logAction("Deleted Blog Post", "Storefront", `Removed article ID: ${id}`);
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
    setStoreSettings((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        ...values,
      },
    }));
    logAction("Updated Settings", "Configuration", `Modified ${section} parameters.`);
  };

  // ================= RESET DEMO DATA =================
  const resetDemoData = () => {
    setProducts(seedProducts);
    setCategories(seedCategories);
    setCollections(seedCollections);
    setBrands(initialBrands);
    setOrders(INITIAL_SEED_ORDERS);
    setCustomers(initialCustomers);
    setReviews(initialReviews);
    setCoupons(initialCoupons);
    setBlogPosts(seedBlogPosts);
    setIngredients(seedIngredients);
    setSupportTickets(initialSupportTickets);
    setContactEnquiries(initialContactEnquiries);
    setSubscribers(initialSubscribers);
    setAdminUsers(initialAdminUsers);
    setHomepageContent(initialHomepageContent);
    setStoreSettings(initialStoreSettings);

    // Save defaults to storage
    storage.set(STORAGE_KEYS.PRODUCTS, seedProducts);
    storage.set(STORAGE_KEYS.CATEGORIES, seedCategories);
    storage.set(STORAGE_KEYS.COLLECTIONS, seedCollections);
    storage.set(STORAGE_KEYS.BRANDS, initialBrands);
    storage.set(STORAGE_KEYS.ORDERS, INITIAL_SEED_ORDERS);
    storage.set(STORAGE_KEYS.CUSTOMERS, initialCustomers);
    storage.set(STORAGE_KEYS.REVIEWS, initialReviews);
    storage.set(STORAGE_KEYS.COUPONS, initialCoupons);
    storage.set(STORAGE_KEYS.BLOG, seedBlogPosts);
    storage.set(STORAGE_KEYS.INGREDIENTS, seedIngredients);
    storage.set(STORAGE_KEYS.SUPPORT, initialSupportTickets);
    storage.set(STORAGE_KEYS.ENQUIRIES, initialContactEnquiries);
    storage.set(STORAGE_KEYS.SUBSCRIBERS, initialSubscribers);
    storage.set(STORAGE_KEYS.ADMIN_USERS, initialAdminUsers);
    storage.set(STORAGE_KEYS.HOMEPAGE, initialHomepageContent);
    storage.set(STORAGE_KEYS.SETTINGS, initialStoreSettings);

    logAction("Reset Demo State", "System", "Restored all store data to pristine factory demo seeds.");
  };

  // ================= CALCULATED KPIS & METRICS =================
  const totalRevenue = orders.reduce(
    (sum, o) => sum + (o.pricing?.total || o.totalAmount || o.total || 0),
    0
  );
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
  const saveProduct = (productData) => {
    const exists = products.some((p) => p.id === productData.id);
    if (exists) {
      updateProduct(productData.id, productData);
    } else {
      addProduct(productData);
    }
  };

  const updateProductStock = (productId, newStock, reason) => {
    setProducts((prev) =>
      prev.map((p) =>
        p.id === productId ? { ...p, stock: newStock, stockQuantity: newStock } : p
      )
    );
    logAction("Adjusted Stock", "Inventory", `Set stock for ${productId} to ${newStock}. ${reason || ""}`);
  };

  const deleteBulkProducts = (ids) => {
    bulkDeleteProducts(ids);
  };

  const saveCategory = (catData) => {
    const exists = categories.some((c) => c.id === catData.id);
    if (exists) {
      updateCategory(catData.id, catData);
    } else {
      addCategory(catData);
    }
  };

  const saveBrand = (brandData) => {
    const exists = brands.some((b) => b.id === brandData.id);
    if (exists) {
      updateBrand(brandData.id, brandData);
    } else {
      addBrand(brandData);
    }
  };

  const saveCollection = (colData) => {
    const exists = collections.some((c) => c.id === colData.id);
    if (exists) {
      updateCollection(colData.id, colData);
    } else {
      addCollection(colData);
    }
  };

  const saveCoupon = (couponData) => {
    const exists = coupons.some((c) => c.id === couponData.id);
    if (exists) {
      updateCoupon(couponData.id, couponData);
    } else {
      addCoupon(couponData);
    }
  };

  const saveCustomer = (customerData) => {
    setCustomers((prev) =>
      prev.map((c) => (c.id === customerData.id ? { ...c, ...customerData } : c))
    );
  };

  const saveBlogPost = (postData) => {
    const exists = blogPosts.some((b) => b.id === postData.id);
    if (exists) {
      updateBlogPost(postData.id, postData);
    } else {
      addBlogPost(postData);
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

        updateOrderStatus,
        approveReturn,
        rejectReturn,

        updateCustomerStatus,
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

