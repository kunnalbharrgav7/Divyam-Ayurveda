import { Order } from "../models/Order.js";
import { Product } from "../models/Product.js";
import { ProductVariant } from "../models/ProductVariant.js";
import { Category } from "../models/Category.js";
import { Brand } from "../models/Brand.js";
import { Collection } from "../models/Collection.js";
import { Ingredient } from "../models/Ingredient.js";
import { User } from "../models/User.js";
import { Role } from "../models/Role.js";
import { Coupon } from "../models/Coupon.js";
import { Review } from "../models/Review.js";
import { ReturnRequest } from "../models/ReturnRequest.js";
import { analyticsService } from "./analytics.service.js";
import { Refund } from "../models/Refund.js";
import { SupportTicket } from "../models/SupportTicket.js";
import { ContactEnquiry } from "../models/ContactEnquiry.js";
import { Subscriber } from "../models/Subscriber.js";
import { StoreSettings } from "../models/StoreSettings.js";
import { HomepageConfig } from "../models/HomepageConfig.js";
import { AuditLog } from "../models/AuditLog.js";
import { logAudit } from "./audit.service.js";
import { ApiError } from "../utils/apiError.js";
import { toRupees, toPaise } from "../utils/currency.js";
import { hashPassword } from "../utils/crypto.js";
import { inventoryService } from "./inventory.service.js";
import { invalidateCache } from "../middleware/cache.js";
import { toPublicImages, resolveStoredImages } from "../utils/productImages.js";
import { compressImages } from "../utils/imageCompression.js";

/** Drop cached public catalog/taxonomy responses so storefront reflects admin changes immediately. */
export const invalidateStorefrontCache = () =>
  Promise.all([invalidateCache("catalog"), invalidateCache("taxonomy")]);

/** Admin-facing product shape: product doc + variants + aggregated available stock. */
export const formatAdminProduct = (product, variants = []) => {
  const json = typeof product.toJSON === "function" ? product.toJSON() : { ...product };
  const vars = variants.map((v) => (typeof v.toJSON === "function" ? v.toJSON() : v));
  const stock = vars.reduce(
    (sum, v) => sum + Math.max(0, (v.stockOnHand || 0) - (v.reservedStock || 0)),
    0
  );
  const publicImages = toPublicImages({ ...json, id: json.id || String(json._id) });
  return {
    ...json,
    id: json.id || String(json._id),
    images: publicImages,
    image: publicImages[0] || "",
    price: toRupees(json.basePricePaise),
    compareAtPrice: toRupees(json.compareAtPricePaise),
    stock,
    stockQuantity: stock,
    reorderThreshold: vars[0]?.reorderThreshold ?? 10,
    variants: vars.map((v) => ({
      id: v.id,
      sku: v.sku,
      label: v.label,
      size: v.label,
      price: toRupees(v.pricePaise),
      stock: Math.max(0, (v.stockOnHand || 0) - (v.reservedStock || 0)),
    })),
  };
};

/** Admin-facing customer shape: account + real order stats + default address (no fabricated values). */
const serializeCustomer = (user, stats = {}) => {
  const addresses = (user.addresses || []).map((a) => {
    const { _id, ...rest } = a;
    return { id: String(_id), ...rest };
  });
  const primary = addresses.find((a) => a.isDefault) || addresses[0] || null;
  return {
    id: String(user._id),
    name: user.name,
    email: user.email,
    phone: user.phone || "",
    avatarUrl: user.avatarUrl || "",
    status: user.status === "suspended" ? "Blocked" : "Active",
    accountStatus: user.status,
    joinedAt: user.createdAt,
    lastLoginAt: user.lastLoginAt || null,
    totalOrders: stats.orders || 0,
    totalSpent: toRupees(stats.spentPaise || 0),
    lastOrderAt: stats.lastOrderAt || null,
    addresses,
    // Flattened default address for lists
    address: primary?.street || "",
    addressLine2: primary?.line2 || "",
    addressName: primary?.fullName || "",
    addressPhone: primary?.phone || "",
    city: primary?.city || "",
    state: primary?.state || "",
    pincode: primary?.pincode || "",
  };
};

const customerStatsByEmail = async (emails) => {
  const rows = await Order.aggregate([
    { $match: { status: { $ne: "cancelled" }, "customer.email": { $in: emails } } },
    {
      $group: {
        _id: "$customer.email",
        orders: { $sum: 1 },
        // Lifetime spend = money actually received, minus refunds (unpaid and cancelled orders are not spend)
        spentPaise: {
          $sum: {
            $cond: [
              { $in: ["$paymentStatus", ["paid", "partially_refunded", "refunded"]] },
              {
                $subtract: [
                  "$pricing.totalPaise",
                  { $cond: [{ $gt: ["$refundedPaise", 0] }, "$refundedPaise", { $cond: [{ $eq: ["$paymentStatus", "refunded"] }, "$pricing.totalPaise", 0] }] },
                ],
              },
              0,
            ],
          },
        },
        lastOrderAt: { $max: "$createdAt" },
      },
    },
  ]);
  return new Map(rows.map((r) => [r._id, r]));
};

export class AdminService {
  /** Customer directory with order totals computed from real orders */
  async listCustomers() {
    const users = await User.find({ isStaff: false })
      .select("-passwordHash -refreshTokenHash -adminNotes")
      .sort({ createdAt: -1 })
      .lean();
    const stats = await customerStatsByEmail(users.map((u) => u.email));
    return users.map((u) => serializeCustomer(u, stats.get(u.email)));
  }

  /** One customer, including internal staff notes (newest first) */
  async getCustomer(id) {
    const user = await User.findOne({ _id: id, isStaff: false })
      .select("-passwordHash -refreshTokenHash")
      .lean();
    if (!user) throw ApiError.notFound("Customer not found");
    const stats = await customerStatsByEmail([user.email]);
    return {
      ...serializeCustomer(user, stats.get(user.email)),
      notes: (user.adminNotes || [])
        .map((n) => ({ id: String(n._id), text: n.text, authorName: n.authorName, createdAt: n.createdAt }))
        .reverse(),
    };
  }

  /** Block ("Blocked") or unblock ("Active") a customer account */
  async setCustomerStatus(id, status, staffUser) {
    if (!["Active", "Blocked"].includes(status)) {
      throw ApiError.badRequest('Status must be "Active" or "Blocked".');
    }
    const user = await User.findOne({ _id: id, isStaff: false });
    if (!user) throw ApiError.notFound("Customer not found");

    user.status = status === "Blocked" ? "suspended" : "active";
    if (status === "Blocked") user.refreshTokenHash = null; // ends existing sessions
    await user.save();

    await logAudit({
      actorId: staffUser?._id,
      actorName: staffUser?.name,
      actorRole: staffUser?.roles?.[0]?.name || "Staff",
      action: "customers.status",
      module: "Customers",
      targetId: user.id,
      details: `${status === "Blocked" ? "Blocked" : "Unblocked"} customer ${user.email}`,
    });

    return this.getCustomer(id);
  }

  async addCustomerNote(id, text, staffUser) {
    const clean = String(text || "").trim();
    if (!clean) throw ApiError.badRequest("Note text is required.");
    const user = await User.findOne({ _id: id, isStaff: false });
    if (!user) throw ApiError.notFound("Customer not found");

    user.adminNotes.push({ text: clean, authorId: staffUser?._id || null, authorName: staffUser?.name || "Staff" });
    await user.save();
    return (await this.getCustomer(id)).notes;
  }

  /**
   * Aggregate Admin Dashboard Analytics
   */
  async getDashboardMetrics() {
    const [
      totalOrders,
      pendingOrders,
      lowStockVariants,
      totalCustomers,
      pendingReviews,
      openTickets,
      revenueReport,
      recentOrders,
    ] = await Promise.all([
      Order.countDocuments({ status: { $ne: "cancelled" } }),
      Order.countDocuments({ status: { $in: ["pending_payment", "confirmed", "processing"] } }),
      ProductVariant.countDocuments({
        $expr: { $lte: [{ $subtract: ["$stockOnHand", "$reservedStock"] }, "$reorderThreshold"] },
        isActive: true,
      }),
      User.countDocuments({ isStaff: false }),
      Review.countDocuments({ status: "pending" }),
      SupportTicket.countDocuments({ status: { $in: ["Open", "In Progress"] } }),
      analyticsService.getRevenueReport({ days: "all", months: 1 }),
      Order.find().sort({ createdAt: -1 }).limit(5).lean(),
    ]);

    return {
      kpis: {
        totalRevenue: revenueReport.summary.netRevenue, // payment received, minus refunds
        grossRevenue: revenueReport.summary.grossRevenue,
        refunds: revenueReport.summary.refunds,
        pendingCollection: revenueReport.summary.pendingCollection,
        totalOrders,
        totalCustomers,
        averageOrderValue: revenueReport.summary.averageOrderValue,
        pendingOrders,
        lowStockItems: lowStockVariants,
        pendingReviews,
        openTickets,
      },
      recentOrders: recentOrders.map((o) => ({
        id: o.orderNumber,
        orderNumber: o.orderNumber,
        customerName: o.customer.name,
        amount: toRupees(o.pricing.totalPaise),
        status: o.status,
        paymentStatus: o.paymentStatus,
        createdAt: o.createdAt,
      })),
    };
  }

  /**
   * Sales Report Series
   */
  async getSalesReport({ from, to }) {
    const match = { status: { $ne: "cancelled" }, paymentStatus: { $in: ["paid", "partially_refunded", "refunded"] } };
    if (from || to) {
      match.createdAt = {};
      if (from) match.createdAt.$gte = new Date(from);
      if (to) match.createdAt.$lte = new Date(to);
    }

    const salesByDate = await Order.aggregate([
      { $match: match },
      {
        $group: {
          _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
          revenuePaise: { $sum: "$pricing.totalPaise" },
          ordersCount: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    return salesByDate.map((item) => ({
      date: item._id,
      orders: item.ordersCount,
      revenue: toRupees(item.revenuePaise),
    }));
  }

  /**
   * Admin Product Creation with Variants
   */
  async createProduct(data, staffUser) {
    const basePricePaise = toPaise(Number(data.price || data.basePrice || 249));
    const compareAtPricePaise = toPaise(Number(data.compareAtPrice || data.originalPrice || 0));

    let finalSlug = (data.slug || (data.name || data.title).toLowerCase().replace(/[^a-z0-9]+/g, "-")).trim();
    if (!finalSlug) finalSlug = `product-${Date.now()}`;
    const slugExists = await Product.findOne({ slug: finalSlug });
    if (slugExists) {
      finalSlug = `${finalSlug}-${Date.now().toString().slice(-4)}`;
    }

    let finalSku = (data.sku || `SKU-${Date.now()}`).trim().toUpperCase();
    const skuExists = await Product.findOne({ sku: finalSku });
    if (skuExists) {
      finalSku = `${finalSku}-${Math.floor(100 + Math.random() * 900)}`;
    }

    const product = await Product.create({
      name: data.name || data.title,
      slug: finalSlug,
      sku: finalSku,
      brand: data.brand || "Divyam Ayurveda",
      categoryId: data.categoryId || data.category || "wellness-essentials",
      subcategoryId: data.subcategoryId || "",
      subcategory: data.subcategory || "",
      shortDescription: data.shortDescription || data.subtitle || "",
      description: data.description || "",
      images: await compressImages(
        Array.isArray(data.images) && data.images.length > 0
          ? data.images
          : [data.image || "/images/ProductImages/Ashuwaganda.png"]
      ),
      packSize: data.packSize || "Standard Pack",
      productForm: data.productForm || "Classical Formulation",
      ingredients: Array.isArray(data.ingredients)
        ? data.ingredients.map((i) => (typeof i === "string" ? i : i.name))
        : [],
      basePricePaise,
      compareAtPricePaise,
      tags: data.tags || [],
      dosha: data.dosha || [],
      benefits: data.benefits || [],
      dosage: data.dosage || "",
      warnings: data.warnings || "",
      isFeatured: Boolean(data.isFeatured),
      isBestSeller: Boolean(data.isBestseller || data.isBestSeller),
      isTrending: Boolean(data.isTrending),
      isNew: Boolean(data.isNewArrival || data.isNew),
      status: (data.status || "active").toLowerCase(),
    });

    // Create variants if supplied
    const initialStock = Math.max(0, Number(data.stock ?? data.stockQuantity ?? 50) || 0);
    // An empty variants array from the form must not leave the product without stock-holding variants
    const variants = Array.isArray(data.variants) && data.variants.length > 0 ? data.variants : [
      {
        sku: product.sku,
        label: product.packSize || "Standard",
        pricePaise: basePricePaise,
        compareAtPricePaise,
        stockOnHand: initialStock,
        reorderThreshold: Number(data.reorderThreshold || 10),
      },
    ];

    const createdVariants = [];
    for (const v of variants) {
      const vPricePaise = v.pricePaise || toPaise(Number(v.price || data.price || 249));
      const vComparePaise = v.compareAtPricePaise || toPaise(Number(v.compareAtPrice || v.originalPrice || 0));
      const variantLabel = v.label || v.size || v.name || "Standard";
      const variantSku = (v.sku || `${product.sku}-${variantLabel.replace(/[^a-zA-Z0-9]/g, "")}`).toUpperCase();

      const variant = await ProductVariant.create({
        productId: product._id,
        sku: variantSku,
        label: variantLabel,
        pricePaise: vPricePaise,
        compareAtPricePaise: vComparePaise,
        stockOnHand: Math.max(0, Number(v.stockOnHand ?? v.stock ?? initialStock) || 0),
        reorderThreshold: Number(v.reorderThreshold || 10),
        weightGrams: Number(v.weightGrams || 250),
      });
      createdVariants.push(variant);
    }

    await logAudit({
      actorId: staffUser?._id,
      actorName: staffUser?.name,
      actorRole: staffUser?.roles?.[0]?.name || "Staff",
      action: "products.create",
      module: "Catalog",
      targetId: product.id,
      details: `Created product "${product.name}" with SKU ${product.sku}`,
      after: product.toJSON(),
    });

    await invalidateStorefrontCache();

    return formatAdminProduct(product, createdVariants);
  }

  /**
   * Update Product
   */
  async updateProduct(id, data, staffUser) {
    const product = await Product.findById(id);
    if (!product) throw ApiError.notFound("Product not found");

    const before = product.toJSON();
    const oldBasePricePaise = product.basePricePaise;

    if (data.name || data.title) product.name = String(data.name || data.title).trim();
    if (data.slug !== undefined) product.slug = String(data.slug).trim().toLowerCase();
    if (data.sku !== undefined) product.sku = String(data.sku).trim().toUpperCase();
    if (data.price !== undefined) product.basePricePaise = toPaise(Number(data.price));
    if (data.compareAtPrice !== undefined) product.compareAtPricePaise = toPaise(Number(data.compareAtPrice));
    if (data.status !== undefined) product.status = String(data.status).toLowerCase();

    // Keep every editable formulation field in sync with the admin form. The
    // prior implementation only persisted a small subset (name, price and a
    // few flags), which made successful edits appear to be lost after reload.
    for (const field of [
      "brand", "categoryId", "subcategoryId", "subcategory", "shortDescription",
      "description", "packSize", "productForm", "dosage", "warnings",
    ]) {
      if (data[field] !== undefined) product[field] = data[field];
    }
    for (const field of ["tags", "dosha", "benefits"]) {
      if (Array.isArray(data[field])) product[field] = data[field].map(String).filter(Boolean);
    }
    if (Array.isArray(data.ingredients)) {
      product.ingredients = data.ingredients
        .map((ingredient) => typeof ingredient === "string" ? ingredient : ingredient?.name)
        .filter(Boolean)
        .map(String);
    }
    if (data.productInformation && typeof data.productInformation === "object") {
      const currentInfo = product.productInformation?.toObject?.() || product.productInformation || {};
      product.productInformation = { ...currentInfo, ...data.productInformation };
    }
    if (data.seo && typeof data.seo === "object") {
      const currentSeo = product.seo?.toObject?.() || product.seo || {};
      product.seo = { ...currentSeo, ...data.seo };
    }
    // The form round-trips images it loaded as image-endpoint URLs; map those back to the stored data
    if (data.images) {
      const existingImages = [...product.images];
      const resolved = resolveStoredImages(data.images, existingImages, product._id);
      // Only newly uploaded photos are compressed; images already stored are left untouched so repeated
      // saves never re-encode (and degrade) them.
      product.images = (await Promise.all(
        resolved.map(async (img) => {
          if (existingImages.includes(img) && (!img.startsWith("data:") || img.length < 400000)) {
            return img;
          }
          return (await compressImages([img]))[0];
        })
      )).filter(Boolean);
    }
    if (data.isFeatured !== undefined) product.isFeatured = Boolean(data.isFeatured);
    if (data.isBestSeller !== undefined || data.isBestseller !== undefined) {
      product.isBestSeller = Boolean(data.isBestSeller ?? data.isBestseller);
    }
    if (data.isTrending !== undefined) product.isTrending = Boolean(data.isTrending);
    if (data.isNew !== undefined || data.isNewArrival !== undefined) {
      product.isNew = Boolean(data.isNew ?? data.isNewArrival);
    }

    await product.save();

    // Customers see each pack size's own price (quick view, product page, cart), so a price edit has to
    // reach the pack size that carries the product's price: the variant priced at the old base price,
    // or the first pack size when none matches (this also repairs products already out of sync).
    if (data.price !== undefined || data.compareAtPrice !== undefined) {
      const packSizes = await ProductVariant.find({ productId: product._id }).sort({ createdAt: 1 });
      if (packSizes.length > 0) {
        const matching = packSizes.filter((v) => v.pricePaise === oldBasePricePaise);
        for (const v of matching.length > 0 ? matching : [packSizes[0]]) {
          if (data.price !== undefined) v.pricePaise = product.basePricePaise;
          if (data.compareAtPrice !== undefined) v.compareAtPricePaise = product.compareAtPricePaise;
          await v.save();
        }
      }
    }

    // Stock lives on variants, so the edit form's stock/threshold must be applied there.
    // Products saved earlier without any variant are repaired here.
    await inventoryService.ensureDefaultVariant(product._id);

    const requestedStock = data.stock ?? data.stockQuantity;
    if (requestedStock !== undefined && requestedStock !== null && requestedStock !== "") {
      const target = Number(requestedStock);
      if (!Number.isFinite(target) || target < 0) {
        throw ApiError.badRequest("Stock must be a non-negative number.");
      }
      await inventoryService.adjustProductStock({
        productId: product._id,
        operation: "set",
        quantity: target,
        reason: "Product edit",
        actorId: staffUser?._id || staffUser?.id || "staff",
      });
    }

    const threshold = Number(data.reorderThreshold);
    if (data.reorderThreshold !== undefined && Number.isFinite(threshold) && threshold >= 0) {
      await ProductVariant.updateMany({ productId: product._id }, { reorderThreshold: threshold });
    }

    await logAudit({
      actorId: staffUser?._id,
      actorName: staffUser?.name,
      actorRole: staffUser?.roles?.[0]?.name || "Staff",
      action: "products.edit",
      module: "Catalog",
      targetId: product.id,
      details: `Updated product "${product.name}"`,
      before,
      after: product.toJSON(),
    });

    await invalidateStorefrontCache();

    const variants = await ProductVariant.find({ productId: product._id }).sort({ createdAt: 1 });
    return formatAdminProduct(product, variants);
  }

  /**
   * Permanently delete a product and its product-owned records.
   *
   * Orders, returns, inventory movements, and audit logs deliberately keep
   * their historical product ids/snapshots; deleting those would corrupt
   * financial and inventory history. Variants and reviews are dependent
   * catalog data, so they are removed together with the product.
   */
  async deleteProduct(id, staffUser) {
    const product = await Product.findById(id);
    if (!product) throw ApiError.notFound("Product not found");

    await logAudit({
      actorId: staffUser?._id,
      actorName: staffUser?.name,
      actorRole: staffUser?.roles?.[0]?.name || "Staff",
      action: "products.delete",
      module: "Catalog",
      targetId: product.id,
      details: `Permanently deleted product "${product.name}"`,
    });

    await Promise.all([
      ProductVariant.deleteMany({ productId: product._id }),
      Review.deleteMany({ productId: product._id }),
    ]);
    await Product.deleteOne({ _id: product._id });

    await invalidateStorefrontCache();

    return { message: "Product deleted permanently." };
  }

  /**
   * Admin Users Management
   */
  async createAdminUser(data, staffUser) {
    const existing = await User.findOne({ email: data.email.toLowerCase() });
    if (existing) throw ApiError.conflict("User with this email already exists.");

    const passwordHash = await hashPassword(data.password || "DivyamAdmin!2026");

    let roleIds = [];
    if (data.role) {
      const role = await Role.findOne({ name: data.role });
      if (role) roleIds.push(role._id);
    }

    const user = await User.create({
      name: data.name,
      email: data.email.toLowerCase(),
      phone: data.phone || undefined,
      passwordHash,
      isStaff: true,
      roles: roleIds,
      status: "active",
    });

    await logAudit({
      actorId: staffUser?._id,
      actorName: staffUser?.name,
      actorRole: staffUser?.roles?.[0]?.name || "Super Admin",
      action: "users.create",
      module: "Administration",
      targetId: user.id,
      details: `Created staff user ${user.name} (${user.email})`,
    });

    return user.toJSON();
  }
}

export const adminService = new AdminService();

