import mongoose from "mongoose";
import { Product } from "../models/Product.js";
import { ProductVariant } from "../models/ProductVariant.js";
import { Category } from "../models/Category.js";
import { Brand } from "../models/Brand.js";
import { Collection } from "../models/Collection.js";
import { Ingredient } from "../models/Ingredient.js";
import { Review } from "../models/Review.js";
import { ApiError } from "../utils/apiError.js";
import { toRupees } from "../utils/currency.js";
import { toPublicImages } from "../utils/productImages.js";

export class CatalogService {
  /**
   * Public filtered catalog with pagination, search, sorting and facet filters
   */
  async getProducts(params = {}) {
    const {
      q,
      category,
      subcategory,
      brand,
      collection,
      tag,
      minPrice,
      maxPrice,
      minRating,
      inStock,
      featured,
      bestSeller,
      trending,
      new: isNew,
      sort = "featured",
      page = 1,
      limit = 12,
    } = params;

    const query = { status: "active" };

    // Search query
    if (q && q.trim()) {
      const cleanQ = q.trim();
      query.$or = [
        { name: { $regex: cleanQ, $options: "i" } },
        { shortDescription: { $regex: cleanQ, $options: "i" } },
        { description: { $regex: cleanQ, $options: "i" } },
        { tags: { $regex: cleanQ, $options: "i" } },
        { ingredients: { $regex: cleanQ, $options: "i" } },
      ];
    }

    // Taxonomy filters
    if (category && category !== "all") {
      query.categoryId = category.toLowerCase();
    }
    if (subcategory && subcategory !== "all") {
      query.$or = query.$or || [];
      query.$or.push(
        { subcategoryId: subcategory.toLowerCase() },
        { subcategory: { $regex: subcategory, $options: "i" } }
      );
    }
    if (brand && brand !== "all") {
      query.brand = { $regex: brand, $options: "i" };
    }
    if (tag) {
      query.tags = { $in: [new RegExp(tag, "i")] };
    }

    // Collection filter (lookup collection filterTag)
    if (collection) {
      const col = await Collection.findOne({ slug: collection, status: "active" });
      if (col && col.filterTag) {
        query.tags = { $in: [new RegExp(col.filterTag, "i")] };
      }
    }

    // Flag filters
    if (featured === true || featured === "true") query.isFeatured = true;
    if (bestSeller === true || bestSeller === "true") query.isBestSeller = true;
    if (trending === true || trending === "true") query.isTrending = true;
    if (isNew === true || isNew === "true") query.isNew = true;

    // Price range (in paise)
    if (minPrice !== undefined && minPrice !== "") {
      const minPaise = Math.round(Number(minPrice) * 100);
      query.basePricePaise = { ...query.basePricePaise, $gte: minPaise };
    }
    if (maxPrice !== undefined && maxPrice !== "") {
      const maxPaise = Math.round(Number(maxPrice) * 100);
      query.basePricePaise = { ...query.basePricePaise, $lte: maxPaise };
    }

    // Rating filter
    if (minRating) {
      query.rating = { $gte: Number(minRating) };
    }

    // Sort mappings
    let sortOption = { isFeatured: -1, createdAt: -1 };
    switch (sort) {
      case "price_asc":
      case "price-low-high":
        sortOption = { basePricePaise: 1 };
        break;
      case "price_desc":
      case "price-high-low":
        sortOption = { basePricePaise: -1 };
        break;
      case "newest":
        sortOption = { createdAt: -1 };
        break;
      case "rating":
        sortOption = { rating: -1, reviewCount: -1 };
        break;
      case "popularity":
        sortOption = { isBestSeller: -1, reviewCount: -1 };
        break;
      case "featured":
      default:
        sortOption = { isFeatured: -1, createdAt: -1 };
        break;
    }

    const safePage = Math.max(1, Number(page) || 1);
    const safeLimit = Math.min(100, Math.max(1, Number(limit) || 12));
    const skip = (safePage - 1) * safeLimit;

    const [products, total] = await Promise.all([
      Product.find(query).sort(sortOption).skip(skip).limit(safeLimit).lean(),
      Product.countDocuments(query),
    ]);

    // Attach variants and format for frontend
    const productIds = products.map((p) => p._id);
    const variants = await ProductVariant.find({
      productId: { $in: productIds },
      isActive: true,
    })
      .sort({ createdAt: 1 })
      .lean();

    const variantsByProduct = {};
    variants.forEach((v) => {
      const pId = v.productId.toString();
      if (!variantsByProduct[pId]) variantsByProduct[pId] = [];
      variantsByProduct[pId].push({
        id: v._id.toString(),
        sku: v.sku,
        size: v.label,
        label: v.label,
        price: toRupees(v.pricePaise),
        originalPrice: toRupees(v.compareAtPricePaise),
        stock: Math.max(0, (v.stockOnHand || 0) - (v.reservedStock || 0)),
        stockOnHand: v.stockOnHand,
        reservedStock: v.reservedStock,
        weightGrams: v.weightGrams,
      });
    });

    const formattedProducts = products.map((p) => {
      const pId = p._id.toString();
      const pVariants = variantsByProduct[pId] || [];
      const totalStock = pVariants.reduce((sum, v) => sum + v.stock, 0);

      return {
        ...p,
        id: pId,
        price: toRupees(p.basePricePaise),
        originalPrice: toRupees(p.compareAtPricePaise),
        images: toPublicImages(p),
        image: toPublicImages(p)[0] || "",
        stockQuantity: totalStock,
        variants: pVariants,
        isArchived: p.status === "archived",
      };
    });

    const filteredResult = inStock === true || inStock === "true"
      ? formattedProducts.filter((p) => p.stockQuantity > 0)
      : formattedProducts;

    return {
      products: filteredResult,
      total,
      page: safePage,
      limit: safeLimit,
      totalPages: Math.ceil(total / safeLimit),
      hasMore: skip + safeLimit < total,
    };
  }

  /**
   * Retrieve single product by slug with all active variants and approved reviews
   */
  async getProductBySlug(slugOrId) {
    // Links and older cart/order records may carry the product's database id instead of its slug
    const key = String(slugOrId || "");
    const product = mongoose.Types.ObjectId.isValid(key) && /^[a-f0-9]{24}$/i.test(key)
      ? await Product.findOne({ $or: [{ _id: key }, { slug: key.toLowerCase() }] }).lean()
      : await Product.findOne({ slug: key.toLowerCase() }).lean();
    if (!product) return null;

    const variants = await ProductVariant.find({
      productId: product._id,
      isActive: true,
    })
      .sort({ createdAt: 1 })
      .lean();

    const reviews = await Review.find({
      productId: product._id,
      status: "approved",
    })
      .sort({ createdAt: -1 })
      .limit(10)
      .lean();

    const formattedVariants = variants.map((v) => ({
      id: v._id.toString(),
      sku: v.sku,
      size: v.label,
      label: v.label,
      price: toRupees(v.pricePaise),
      originalPrice: toRupees(v.compareAtPricePaise),
      stock: Math.max(0, (v.stockOnHand || 0) - (v.reservedStock || 0)),
      weightGrams: v.weightGrams,
    }));

    const totalStock = formattedVariants.reduce((sum, v) => sum + v.stock, 0);

    return {
      ...product,
      id: product._id.toString(),
      price: toRupees(product.basePricePaise),
      originalPrice: toRupees(product.compareAtPricePaise),
      images: toPublicImages(product),
      image: toPublicImages(product)[0] || "",
      stockQuantity: totalStock,
      variants: formattedVariants,
      recentReviews: reviews.map((r) => ({
        id: r._id.toString(),
        userName: r.userName,
        rating: r.rating,
        title: r.title,
        comment: r.comment,
        verifiedPurchase: r.verifiedPurchase,
        createdAt: r.createdAt,
      })),
    };
  }

  /**
   * Live availability for a set of product ids (used by cart / wishlist, never cached).
   * Products that are missing or no longer active come back as unavailable.
   */
  async getStockByIds(ids = []) {
    const validIds = [...new Set(ids)]
      .filter((id) => mongoose.Types.ObjectId.isValid(id))
      .slice(0, 100);
    if (validIds.length === 0) return [];

    const [products, variants] = await Promise.all([
      Product.find({ _id: { $in: validIds } }).select("status").lean(),
      ProductVariant.find({ productId: { $in: validIds }, isActive: true }).lean(),
    ]);
    const statusById = new Map(products.map((p) => [p._id.toString(), p.status]));

    return validIds.map((id) => {
      const pVariants = variants
        .filter((v) => v.productId.toString() === id)
        .map((v) => ({
          id: v._id.toString(),
          size: v.label,
          label: v.label,
          stock: Math.max(0, (v.stockOnHand || 0) - (v.reservedStock || 0)),
        }));
      const available = statusById.get(id) === "active";
      return {
        id,
        available,
        stockQuantity: available ? pVariants.reduce((sum, v) => sum + v.stock, 0) : 0,
        variants: available ? pVariants : [],
      };
    });
  }

  /**
   * Related products
   */
  async getRelatedProducts(slug, limit = 4) {
    const product = await Product.findOne(
      /^[a-f0-9]{24}$/i.test(String(slug)) ? { $or: [{ _id: slug }, { slug }] } : { slug }
    );
    if (!product) return [];

    const related = await Product.find({
      _id: { $ne: product._id },
      categoryId: product.categoryId,
      status: "active",
    })
      .limit(limit)
      .lean();

    return related.map((p) => ({
      ...p,
      id: p._id.toString(),
      price: toRupees(p.basePricePaise),
      originalPrice: toRupees(p.compareAtPricePaise),
      images: toPublicImages(p),
      image: toPublicImages(p)[0] || "",
    }));
  }

  /**
   * Categories
   */
  async getCategories() {
    return Category.find({ status: "active" }).sort({ displayOrder: 1, name: 1 });
  }

  async getCategoryBySlug(slug) {
    const cat = await Category.findOne({ slug: slug.toLowerCase() });
    if (!cat) throw ApiError.notFound("Category not found");
    return cat;
  }

  /**
   * Brands, Collections, Ingredients
   */
  async getBrands() {
    return Brand.find({ status: "active" }).sort({ name: 1 });
  }

  async getCollections() {
    return Collection.find({ status: "active" }).sort({ name: 1 });
  }

  async getIngredients() {
    return Ingredient.find({ status: "active" }).sort({ name: 1 });
  }
}

export const catalogService = new CatalogService();

