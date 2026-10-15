/**
 * Centralized API & Mock Service Layer for Divyam Ayurveda
 * Connected to persistent browser storage so Admin edits and Customer interactions sync seamlessly.
 */

import { products as defaultProducts } from "../data/products";
import { categories as defaultCategories } from "../data/categories";
import { collections as defaultCollections } from "../data/collections";
import { testimonials as defaultTestimonials } from "../data/testimonials";
import { blogPosts as defaultBlogPosts } from "../data/blogPosts";
import { ingredients as defaultIngredients } from "../data/ingredients";
import { faqs as defaultFaqs } from "../data/faqs";
import { storage } from "../utils/storage";

const PRODUCTS_KEY = "divyam_ayurveda_products";
const CATEGORIES_KEY = "divyam_ayurveda_categories";
const COLLECTIONS_KEY = "divyam_ayurveda_collections";
const BLOG_KEY = "divyam_ayurveda_blog";
const INGREDIENTS_KEY = "divyam_ayurveda_ingredients";
const ORDERS_KEY = "divyam_ayurveda_orders";

const getLiveProducts = () => {
  const prods = storage.get(PRODUCTS_KEY, defaultProducts);
  return (prods || defaultProducts).map((p) => {
    const defaultP = defaultProducts.find((dp) => dp.id === p.id);
    if (defaultP && (!p.images || !p.images[0] || p.images[0].includes("unsplash"))) {
      return {
        ...p,
        images: defaultP.images,
        image: defaultP.images[0],
      };
    }
    return p;
  });
};

const getLiveCategories = () => {
  const cats = storage.get(CATEGORIES_KEY, defaultCategories);
  return (cats || defaultCategories).map((c) => {
    const defaultC = defaultCategories.find((dc) => dc.id === c.id);
    if (defaultC && (!c.image || c.image.includes("unsplash"))) {
      return {
        ...c,
        image: defaultC.image,
        bannerImage: defaultC.bannerImage,
      };
    }
    return c;
  });
};

const getLiveCollections = () => {
  const cols = storage.get(COLLECTIONS_KEY, defaultCollections);
  return (cols || defaultCollections).map((col) => {
    const defaultCol = defaultCollections.find((dc) => dc.id === col.id);
    if (defaultCol && (!col.image || col.image.includes("unsplash"))) {
      return {
        ...col,
        image: defaultCol.image,
      };
    }
    return col;
  });
};
const getLiveBlogPosts = () => {
  const posts = storage.get(BLOG_KEY, defaultBlogPosts);
  return (posts || defaultBlogPosts).map((post) => {
    const defaultPost = defaultBlogPosts.find((dp) => dp.id === post.id || dp.slug === post.slug);
    if (defaultPost && (!post.image || post.image.includes("unsplash"))) {
      return {
        ...post,
        image: defaultPost.image,
      };
    }
    return post;
  });
};
const getLiveIngredients = () => storage.get(INGREDIENTS_KEY, defaultIngredients);

export const productService = {
  /**
   * Fetch all products with optional filtering, search, sorting and pagination
   */
  async getProducts(params = {}) {
    const {
      category,
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

    let filtered = [...getLiveProducts()].filter((p) => !p.isArchived);

    // Filter by Category
    if (category && category !== "all") {
      filtered = filtered.filter(
        (p) => p.categoryId?.toLowerCase() === category.toLowerCase()
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
    const list = getLiveProducts();
    const product = list.find((p) => p.slug === slug);
    return product || null;
  },

  /**
   * Get single product by ID
   */
  async getProductById(id) {
    const list = getLiveProducts();
    const product = list.find((p) => p.id === id);
    return product || null;
  },

  /**
   * Get Best Seller products
   */
  async getBestSellers(limit = 6) {
    return getLiveProducts().filter((p) => p.isBestSeller && !p.isArchived).slice(0, limit);
  },

  /**
   * Get Trending products
   */
  async getTrendingProducts(limit = 6) {
    return getLiveProducts().filter((p) => p.isTrending && !p.isArchived).slice(0, limit);
  },

  /**
   * Get New Arrivals
   */
  async getNewArrivals(limit = 6) {
    return getLiveProducts().filter((p) => p.isNew && !p.isArchived).slice(0, limit);
  },

  /**
   * Get Featured Products
   */
  async getFeaturedProducts(limit = 8) {
    return getLiveProducts().filter((p) => p.isFeatured && !p.isArchived).slice(0, limit);
  },

  /**
   * Get related products for a given product
   */
  async getRelatedProducts(currentProductId, categoryId, limit = 4) {
    return getLiveProducts()
      .filter((p) => p.id !== currentProductId && p.categoryId === categoryId && !p.isArchived)
      .slice(0, limit);
  },
};

export const categoryService = {
  async getCategories() {
    return getLiveCategories();
  },
  async getCategoryBySlug(slug) {
    return getLiveCategories().find((c) => c.slug === slug) || null;
  },
};

export const collectionService = {
  async getCollections() {
    return getLiveCollections();
  },
};

export const contentService = {
  async getTestimonials() {
    return defaultTestimonials;
  },
  async getBlogPosts() {
    return getLiveBlogPosts();
  },
  async getBlogPostBySlug(slug) {
    return getLiveBlogPosts().find((b) => b.slug === slug) || null;
  },
  async getIngredients() {
    return getLiveIngredients();
  },
  async getFaqs() {
    return defaultFaqs;
  },
};

export const orderService = {
  /**
   * Save a completed mock order into demo storage and deduct inventory
   */
  async createOrder(orderPayload) {
    const existing = storage.get(ORDERS_KEY, []);
    const newOrder = {
      ...orderPayload,
      id: `DA-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`,
      createdAt: new Date().toISOString(),
      status: "Confirmed",
      estimatedDelivery: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
      timeline: [
        { status: "Order Placed", time: new Date().toISOString(), completed: true },
        { status: "Packed at Dispensary", time: null, completed: false },
        { status: "Dispatched", time: null, completed: false },
        { status: "Out for Delivery", time: null, completed: false },
        { status: "Delivered", time: null, completed: false },
      ],
    };

    const updated = [newOrder, ...existing];
    storage.set(ORDERS_KEY, updated);

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

    return newOrder;
  },

  /**
   * Get order by ID
   */
  async getOrderById(orderId) {
    const existing = storage.get(ORDERS_KEY, []);
    return existing.find((o) => o.id === orderId) || null;
  },

  /**
   * Get all orders
   */
  async getAllOrders() {
    return storage.get(ORDERS_KEY, []);
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
