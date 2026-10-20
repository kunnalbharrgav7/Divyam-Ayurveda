/**
 * Centralized API & Service Layer for Divyam Ayurveda
 * Interacts with backend REST endpoints and provides dynamic empty state handling.
 */

import { storage } from "../utils/storage";
import { apiUrl } from "../config/api";

export const normalizeProductImages = (p) => {
  if (!p) return p;
  if (Array.isArray(p)) return p.map(normalizeProductImages);
  if (typeof p !== "object") return p;
  const fixUrl = (u) => (typeof u === "string" && u.startsWith("/api/") ? apiUrl(u) : u);
  const images = Array.isArray(p.images) && p.images.length > 0 
    ? p.images.map(fixUrl) 
    : (p.image ? [fixUrl(p.image)] : []);
  const image = fixUrl(p.image) || images[0] || "/images/ProductImages/Ashuwaganda.png";
  return { ...p, image, images };
};

const PRODUCTS_KEY = "divyam_ayurveda_products";
const CATEGORIES_KEY = "divyam_ayurveda_categories";
const COLLECTIONS_KEY = "divyam_ayurveda_collections";
const BLOG_KEY = "divyam_ayurveda_blog";
const INGREDIENTS_KEY = "divyam_ayurveda_ingredients";
// Orders placed in this tab, so the confirmation page can show full details (never persisted)
const recentOrders = new Map();

const getLiveProducts = () => storage.get(PRODUCTS_KEY, []);
const getLiveCategories = () => storage.get(CATEGORIES_KEY, []);
const getLiveCollections = () => storage.get(COLLECTIONS_KEY, []);
const getLiveBlogPosts = () => storage.get(BLOG_KEY, []);
const getLiveIngredients = () => storage.get(INGREDIENTS_KEY, []);

export const productService = {
  /**
   * Fetch all products with optional filtering, search, sorting and pagination
   */
  async getProducts(params = {}) {
    const {
      category,
      subcategory,
      search,
      sort = "featured",
      minPrice,
      maxPrice,
      minRating,
      inStockOnly,
      tag,
      collection,
      page = 1,
      limit = 12,
    } = params;

    // 1. Attempt fetching from real backend MongoDB API
    try {
      const searchParams = new URLSearchParams();
      if (page) searchParams.set("page", String(page));
      if (limit) searchParams.set("limit", String(limit));
      if (search && search.trim()) searchParams.set("q", search.trim());
      if (category && category !== "all") searchParams.set("category", category);
      if (subcategory && subcategory !== "all") searchParams.set("subcategory", subcategory);
      if (sort) searchParams.set("sort", sort);
      if (minPrice !== undefined && minPrice !== "") searchParams.set("minPrice", String(minPrice));
      if (maxPrice !== undefined && maxPrice !== "") searchParams.set("maxPrice", String(maxPrice));
      if (minRating) searchParams.set("minRating", String(minRating));
      if (inStockOnly) searchParams.set("inStock", "true");
      if (tag) searchParams.set("tag", tag);
      if (collection) searchParams.set("collection", collection);

      const res = await fetch(`/api/v1/products?${searchParams.toString()}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          const total = json.meta?.total ?? json.data.length;
          const safePage = json.meta?.page ?? Number(page);
          const safeLimit = json.meta?.limit ?? Number(limit);
          const totalPages = json.meta?.totalPages ?? (total > 0 ? Math.ceil(total / safeLimit) : 0);
          return {
            products: json.data.map(normalizeProductImages),
            total,
            page: safePage,
            totalPages,
            hasMore: Boolean(json.meta?.hasMore ?? safePage < totalPages),
          };
        }
      }
    } catch (err) {
      console.warn("Backend products API unreachable, using local storage fallback:", err.message);
    }

    // 2. Offline / local fallback logic
    let filtered = [...getLiveProducts()].filter((p) => !p.isArchived);

    // Filter by Category
    if (category && category !== "all") {
      filtered = filtered.filter(
        (p) =>
          p.categoryId?.toLowerCase() === category.toLowerCase() ||
          p.category?.toLowerCase() === category.toLowerCase()
      );
    }

    // Filter by Subcategory
    if (subcategory && subcategory !== "all") {
      filtered = filtered.filter(
        (p) =>
          p.subcategoryId?.toLowerCase() === subcategory.toLowerCase() ||
          p.subcategory?.toLowerCase() === subcategory.toLowerCase()
      );
    }

    // Filter by Collection / Tag
    if (collection) {
      const collections = getLiveCollections();
      const col = collections.find((c) => c.slug === collection);
      if (col && col.filterTag) {
        filtered = filtered.filter((p) =>
          p.tags?.some((t) => t.toLowerCase().includes(col.filterTag.toLowerCase()))
        );
      }
    }

    if (tag) {
      filtered = filtered.filter((p) =>
        p.tags?.some((t) => t.toLowerCase() === tag.toLowerCase())
      );
    }

    // Filter by Search Query
    if (search && search.trim() !== "") {
      const query = search.trim().toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name?.toLowerCase().includes(query) ||
          p.shortDescription?.toLowerCase().includes(query) ||
          p.description?.toLowerCase().includes(query) ||
          p.ingredients?.some((ing) => ing.toLowerCase().includes(query)) ||
          p.tags?.some((t) => t.toLowerCase().includes(query))
      );
    }

    // Filter by Price
    if (minPrice !== undefined && minPrice !== "") {
      filtered = filtered.filter((p) => p.price >= Number(minPrice));
    }
    if (maxPrice !== undefined && maxPrice !== "") {
      filtered = filtered.filter((p) => p.price <= Number(maxPrice));
    }

    // Filter by Minimum Rating
    if (minRating) {
      filtered = filtered.filter((p) => p.rating >= Number(minRating));
    }

    // Filter by Stock
    if (inStockOnly) {
      filtered = filtered.filter((p) => p.stockQuantity > 0);
    }

    // Sorting
    switch (sort) {
      case "price-low-high":
        filtered.sort((a, b) => a.price - b.price);
        break;
      case "price-high-low":
        filtered.sort((a, b) => b.price - a.price);
        break;
      case "newest":
        filtered.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        break;
      case "rating":
        filtered.sort((a, b) => b.rating - a.rating || b.reviewCount - a.reviewCount);
        break;
      case "featured":
      default:
        filtered.sort((a, b) => (b.isFeatured ? 1 : 0) - (a.isFeatured ? 1 : 0));
        break;
    }

    const total = filtered.length;
    const startIndex = (page - 1) * limit;
    const paginatedItems = filtered.slice(startIndex, startIndex + limit);

    return {
      products: paginatedItems,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      hasMore: startIndex + limit < total,
    };
  },

  /**
   * Get single product by slug
   */
  async getProductBySlug(slug) {
    if (!slug) return null;
    try {
      const res = await fetch(`/api/v1/products/${encodeURIComponent(slug)}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          return normalizeProductImages(json.data);
        }
      }
    } catch (e) {
      console.warn("Could not fetch product by slug from backend:", e.message);
    }
    const list = getLiveProducts();
    const product = list.find((p) => p.slug === slug);
    return product || null;
  },

  /**
   * Get single product by ID
   */
  async getProductById(id) {
    if (!id) return null;
    const list = getLiveProducts();
    const product = list.find((p) => p.id === id || p._id === id);
    if (product) return product;
    try {
      const res = await fetch(`/api/v1/products/${encodeURIComponent(id)}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) return json.data;
      }
    } catch (_) {}
    return null;
  },

  /**
   * Get Best Seller products
   */
  async getBestSellers(limit = 6) {
    try {
      const res = await fetch(`/api/v1/products?bestSeller=true&limit=${limit}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          return normalizeProductImages(json.data);
        }
      }
    } catch (_) {}
    return getLiveProducts().filter((p) => p.isBestSeller && !p.isArchived).slice(0, limit);
  },

  /**
   * Get Trending products
   */
  async getTrendingProducts(limit = 6) {
    try {
      const res = await fetch(`/api/v1/products?trending=true&limit=${limit}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          return normalizeProductImages(json.data);
        }
      }
    } catch (_) {}
    return getLiveProducts().filter((p) => p.isTrending && !p.isArchived).slice(0, limit);
  },

  /**
   * Get New Arrivals
   */
  async getNewArrivals(limit = 6) {
    try {
      const res = await fetch(`/api/v1/products?new=true&limit=${limit}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          return normalizeProductImages(json.data);
        }
      }
    } catch (_) {}
    return getLiveProducts().filter((p) => p.isNew && !p.isArchived).slice(0, limit);
  },

  /**
   * Get Featured Products
   */
  async getFeaturedProducts(limit = 8) {
    try {
      const res = await fetch(`/api/v1/products?featured=true&limit=${limit}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          return normalizeProductImages(json.data);
        }
      }
    } catch (_) {}
    return getLiveProducts().filter((p) => p.isFeatured && !p.isArchived).slice(0, limit);
  },

  /**
   * Live availability for products already held in the cart / wishlist.
   * Returns null when the API can't be reached, so callers keep their last known data.
   */
  async getStockByIds(ids = []) {
    if (!ids.length) return [];
    try {
      const res = await fetch(`/api/v1/products/stock?ids=${encodeURIComponent(ids.join(","))}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) return json.data;
      }
    } catch (_) {}
    return null;
  },

  /**
   * Get related products for a given product
   */
  async getRelatedProducts(currentProductId, categoryId, limit = 4) {
    const list = getLiveProducts();
    const current = list.find((p) => p.id === currentProductId || p._id === currentProductId);
    if (current?.slug) {
      try {
        const res = await fetch(`/api/v1/products/${encodeURIComponent(current.slug)}/related?limit=${limit}`);
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data)) {
            return normalizeProductImages(json.data);
          }
        }
      } catch (_) {}
    }
    return list
      .filter((p) => p.id !== currentProductId && p.categoryId === categoryId && !p.isArchived)
      .slice(0, limit);
  },
};

export const categoryService = {
  async getCategories() {
    try {
      const res = await fetch("/api/v1/categories");
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          return normalizeProductImages(json.data);
        }
      }
    } catch (e) {
      console.warn("Could not fetch categories from backend:", e.message);
    }
    return getLiveCategories();
  },
  async getCategoryBySlug(slug) {
    if (!slug) return null;
    try {
      const res = await fetch(`/api/v1/categories/${encodeURIComponent(slug)}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          return normalizeProductImages(json.data);
        }
      }
    } catch (e) {
      console.warn("Could not fetch category by slug from backend:", e.message);
    }
    return getLiveCategories().find((c) => c.slug === slug) || null;
  },
  async getSubcategoriesByCategory(categorySlugOrId) {
    if (!categorySlugOrId) return [];
    try {
      const categories = await categoryService.getCategories();
      const cat = categories.find(
        (c) =>
          c.slug === categorySlugOrId ||
          c.id === categorySlugOrId ||
          c._id === categorySlugOrId ||
          c.name?.toLowerCase() === categorySlugOrId.toLowerCase()
      );
      return cat?.subcategories || [];
    } catch (_) {
      return [];
    }
  },
};

export const collectionService = {
  async getCollections() {
    try {
      const res = await fetch("/api/v1/collections");
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          return normalizeProductImages(json.data);
        }
      }
    } catch (e) {
      console.warn("Could not fetch collections from backend:", e.message);
    }
    return getLiveCollections();
  },
};

export const couponService = {
  /** Active, public coupons for the Offers page (empty when none or the API is unreachable) */
  async getPublicCoupons() {
    try {
      const res = await fetch("/api/v1/checkout/coupons/public");
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) return json.data;
      }
    } catch (_) {}
    return [];
  },
};

export const reviewService = {
  /** Saves a customer review in the database (it appears publicly once an admin approves it). Throws with the server's message. */
  async submit(productId, { rating, title, comment }, accessToken) {
    const res = await fetch(`/api/v1/products/${encodeURIComponent(productId)}/reviews`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      },
      credentials: "include",
      body: JSON.stringify({ rating, title, comment }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok || !json.success) {
      if (res.status === 401) throw new Error("Please sign in to write a review.");
      throw new Error(json?.error?.details?.[0]?.message || json?.error?.message || "Could not submit your review.");
    }
    return json.data;
  },

  /** The signed-in customer's own reviews for a product, including ones awaiting moderation. */
  async getMine(productId, accessToken) {
    if (!accessToken) return [];
    try {
      const res = await fetch(`/api/v1/me/reviews?productId=${encodeURIComponent(productId)}`, {
        headers: { Authorization: `Bearer ${accessToken}` },
        credentials: "include",
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) return json.data;
      }
    } catch (_) {}
    return [];
  },
};

export const contentService = {
  async getTestimonials() {
    try {
      const res = await fetch("/api/v1/testimonials");
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          return normalizeProductImages(json.data);
        }
      }
    } catch (_) {}
    return [];
  },
  normalizeBlogPost(post) {
    if (!post) return null;
    const id = post.id || post._id || `blog-${post.slug}`;
    const date = post.date || (post.publishedAt ? new Date(post.publishedAt).toISOString().split("T")[0] : (post.createdAt ? new Date(post.createdAt).toISOString().split("T")[0] : ""));
    return {
      ...post,
      id,
      date,
      status: (post.status || "published").toLowerCase(),
    };
  },
  async getBlogPosts() {
    try {
      const res = await fetch(`/api/v1/blog?_t=${Date.now()}`, { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          const normalized = json.data.map(contentService.normalizeBlogPost);
          if (normalized.length > 0) {
            storage.set(BLOG_KEY, normalized);
            return normalized;
          }
          // If server returns empty array and local storage has unmigrated posts, return local as fallback
          const local = getLiveBlogPosts();
          if (local.length > 0) return local.map(contentService.normalizeBlogPost);
          return [];
        }
      }
    } catch (_) {}
    return getLiveBlogPosts().map(contentService.normalizeBlogPost);
  },
  async getBlogPostBySlug(slug) {
    if (!slug) return null;
    try {
      const res = await fetch(`/api/v1/blog/${encodeURIComponent(slug)}?_t=${Date.now()}`, { cache: "no-store" });
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          return contentService.normalizeBlogPost(json.data);
        }
      }
    } catch (_) {}
    const local = getLiveBlogPosts().find((b) => b.slug === slug);
    return local ? contentService.normalizeBlogPost(local) : null;
  },
  async getIngredients() {
    try {
      const res = await fetch("/api/v1/ingredients");
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          return normalizeProductImages(json.data);
        }
      }
    } catch (_) {}
    return getLiveIngredients();
  },
  async getFaqs() {
    try {
      const res = await fetch("/api/v1/faqs");
      if (res.ok) {
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          return normalizeProductImages(json.data);
        }
      }
    } catch (_) {}
    return [];
  },
};

export const orderService = {
  /**
   * Save a completed order to backend MongoDB API and persist into browser storage
   */
  async createOrder(orderPayload) {
    let created = null;

    // 1. Try persisting order to backend MongoDB API
    try {
      const response = await fetch("/api/v1/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(orderPayload),
        credentials: "include",
      });

      if (!response.ok) {
        // Surface the server's reason (e.g. out-of-stock item) instead of a generic failure
        let reason = "";
        try {
          reason = (await response.json())?.error?.message || "";
        } catch (_) {}
        if (reason) throw new Error(reason);
      }

      if (response.ok) {
        const json = await response.json();
        if (json.success && json.data) {
          const backendOrder = json.data;
          created = {
            ...orderPayload,
            ...backendOrder,
            id: backendOrder.orderNumber || backendOrder.id || `DA-${Date.now().toString().slice(-6)}`,
            orderNumber: backendOrder.orderNumber || backendOrder.id,
            status: backendOrder.status || "Confirmed",
            createdAt: backendOrder.createdAt || new Date().toISOString(),
          };
        }
      }
    } catch (err) {
      console.warn("Backend API error for order creation:", err);
      if (err.message && !/fetch|network/i.test(err.message)) throw err;
    }

    if (!created) {
      throw new Error("Unable to place order. Backend order service returned an error.");
    }

    // Keep it in memory only: localStorage is shared by every account in this browser (and by the admin panel)
    recentOrders.set(created.orderNumber, created);

    // Notify all listening contexts (OrderContext, AdminContext)
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("divyam_order_created", { detail: created }));
    }

    // Synchronize inventory reduction
    const liveProds = getLiveProducts();
    const updatedProds = liveProds.map((prod) => {
      const purchased = orderPayload.items?.find((item) => item.productId === prod.id);
      if (purchased) {
        return {
          ...prod,
          stockQuantity: Math.max(0, (prod.stockQuantity || 0) - purchased.quantity),
        };
      }
      return prod;
    });
    storage.set(PRODUCTS_KEY, updatedProds);

    return created;
  },

  /**
   * Get order by ID or orderNumber
   */
  async getOrderById(orderId) {
    if (!orderId) return null;
    const localMatch = recentOrders.get(orderId) || null;

    // Always attempt fetching the freshest live order status from backend API first
    try {
      const response = await fetch(`/api/v1/orders/${encodeURIComponent(orderId)}?_t=${Date.now()}`, {
        cache: "no-store",
        credentials: "include",
      });
      if (response.ok) {
        const json = await response.json();
        if (json.success && json.data) {
          const raw = json.data;
          const rawStatus = String(raw.status || raw.orderStatus || "confirmed").toLowerCase();
          let displayStatus = "Confirmed";
          if (rawStatus === "delivered") displayStatus = "Delivered";
          else if (rawStatus === "dispatched" || rawStatus === "shipped") displayStatus = "Dispatched";
          else if (rawStatus === "out_for_delivery") displayStatus = "Out for Delivery";
          else if (rawStatus === "processing" || rawStatus === "packed") displayStatus = "Processing";
          else if (rawStatus === "cancelled") displayStatus = "Cancelled";
          else if (rawStatus === "pending_payment" || rawStatus === "pending") displayStatus = "Pending";

          const fetched = {
            ...localMatch,
            ...raw,
            id: raw.orderNumber || raw.id || orderId,
            orderNumber: raw.orderNumber || raw.id || orderId,
            status: displayStatus,
            rawStatus: raw.status,
            timeline: raw.timeline || localMatch?.timeline,
          };
          return fetched;
        }
      }
    } catch (e) {
      console.warn("Could not retrieve order from backend:", e);
    }

    // Fallback to local storage only if offline or backend unavailable
    return localMatch || null;
  },

  /**
   * Get all orders
   */
  async getAllOrders() {
    return []; // the signed-in customer's orders come from /api/v1/me/orders (see OrderContext)
  },

  /**
   * Mock PIN code delivery check
   */
  async checkPinCode(pincode) {
    if (!pincode || pincode.length !== 6 || isNaN(pincode)) {
      return { serviceable: false, message: "Please enter a valid 6-digit Indian PIN code." };
    }
    const isFastZone = ["11", "40", "56", "70", "60", "50", "38", "41", "30"].includes(
      pincode.substring(0, 2)
    );
    return {
      serviceable: true,
      deliveryDays: isFastZone ? "2-3 business days" : "4-5 business days",
      codAvailable: true,
      message: `Delivery available in ${isFastZone ? "2-3" : "4-5"} business days. Free delivery above ₹499.`,
    };
  },
};
