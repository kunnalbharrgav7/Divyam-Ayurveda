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
import { StoreSettings } from "../models/StoreSettings.js";
import { HomepageConfig } from "../models/HomepageConfig.js";
import { AuditLog } from "../models/AuditLog.js";
import { logAudit } from "./audit.service.js";
import { readPhoneInput } from "../utils/phone.js";
import { ApiError } from "../utils/apiError.js";
import { toRupees, toPaise } from "../utils/currency.js";
import { hashPassword, generateTemporaryPassword } from "../utils/crypto.js";
import { ROLES } from "../constants/roles.js";
import { inventoryService } from "./inventory.service.js";
import { InventoryMovement } from "../models/InventoryMovement.js";
import { INVENTORY_REASONS } from "../constants/inventoryReasons.js";
import { PRODUCT_TYPES, PRODUCT_TYPE_KEYS, buildPackLabel } from "../constants/productTypes.js";
import { toPublicImages, resolveStoredImages } from "../utils/productImages.js";
import { compressImages } from "../utils/imageCompression.js";

/** Admin-facing product shape: product doc + variants + aggregated available stock. */
// Parcel numbers from the admin form: blanks and invalid values become "not set", never zero
const cleanParcel = (parcel = {}) => {
  const num = (v) => {
    const n = Number(v);
    return v === "" || v === null || v === undefined || !Number.isFinite(n) || n <= 0 ? null : Math.round(n * 100) / 100;
  };
  return {
    weightGrams: num(parcel.weightGrams),
    lengthCm: num(parcel.lengthCm),
    breadthCm: num(parcel.breadthCm),
    heightCm: num(parcel.heightCm),
  };
};

export const formatAdminProduct = (product, variants = []) => {
  const json = typeof product.toJSON === "function" ? product.toJSON() : { ...product };
  // Pack sizes that were removed from the product stay in the database (order history) but are not shown
  const vars = variants
    .map((v) => (typeof v.toJSON === "function" ? v.toJSON() : v))
    .filter((v) => v.isActive !== false);
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
      packQuantity: v.packQuantity ?? null,
      packUnit: v.packUnit || "",
      price: toRupees(v.pricePaise),
      compareAtPrice: toRupees(v.compareAtPricePaise || 0),
      costPrice: toRupees(v.costPricePaise || 0),
      reorderThreshold: v.reorderThreshold ?? 10,
      stock: Math.max(0, (v.stockOnHand || 0) - (v.reservedStock || 0)),
    })),
  };
};

const rupeesToPaise = (value) => {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? toPaise(n) : 0;
};
const wholeNumber = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? Math.floor(n) : fallback;
};

/**
 * Turns what the admin form sent into the list of pack sizes to store.
 * "single": one fixed pack taken from the product's own price/stock fields.
 * "multiple": the list the admin built, each with its own price and stock.
 * A request without a usable list (older callers) falls back to one default pack.
 */
const buildVariantInputs = (data, productType) => {
  const unit = PRODUCT_TYPES[productType]?.unit ?? "";
  const soldAs = data.soldAs === "single" ? "single" : "multiple";
  const listed = Array.isArray(data.variants) ? data.variants : [];

  const toInput = (v, defaults = {}) => {
    const packUnit = String(v.packUnit ?? unit).trim();
    const packQuantity = Number(v.packQuantity);
    const label =
      buildPackLabel(packQuantity, packUnit) ||
      String(v.label || v.size || v.name || defaults.label || "").trim() ||
      "Standard";
    return {
      id: v.id ? String(v.id) : "",
      sku: v.sku ? String(v.sku).trim() : "",
      label,
      packQuantity: Number.isFinite(packQuantity) && packQuantity > 0 ? packQuantity : null,
      packUnit,
      pricePaise: v.pricePaise ?? rupeesToPaise(v.price ?? defaults.price),
      compareAtPricePaise: v.compareAtPricePaise ?? rupeesToPaise(v.compareAtPrice ?? v.originalPrice ?? defaults.compareAtPrice),
      costPricePaise: rupeesToPaise(v.costPrice ?? defaults.costPrice),
      stock: v.stockOnHand ?? v.stock ?? defaults.stock,
      reorderThreshold: wholeNumber(v.reorderThreshold ?? defaults.reorderThreshold, 10) || 10,
    };
  };

  if (soldAs === "single") {
    const first = listed[0] || {};
    return [
      toInput(
        { ...first, price: data.price, compareAtPrice: data.compareAtPrice, costPrice: data.costPrice, stock: data.stock ?? data.stockQuantity, reorderThreshold: data.reorderThreshold },
        { label: "Single Pack" }
      ),
    ];
  }
  if (listed.length > 0) {
    return listed.map((v) => toInput(v, { price: data.price, stock: 0, reorderThreshold: data.reorderThreshold }));
  }
  return [
    toInput(
      { price: data.price, compareAtPrice: data.compareAtPrice, costPrice: data.costPrice, stock: data.stock ?? data.stockQuantity, reorderThreshold: data.reorderThreshold },
      { label: String(data.packSize || "Standard").trim() }
    ),
  ];
};

const validateVariantInputs = (inputs) => {
  if (inputs.length === 0) throw ApiError.badRequest("Add at least one pack size.");
  const seen = new Set();
  for (const v of inputs) {
    if (!(v.pricePaise > 0)) throw ApiError.badRequest(`Enter a selling price for "${v.label}".`);
    if (v.compareAtPricePaise && v.compareAtPricePaise < v.pricePaise) {
      throw ApiError.badRequest(`MRP for "${v.label}" cannot be lower than its selling price.`);
    }
    const key = v.label.toLowerCase();
    if (seen.has(key)) throw ApiError.badRequest(`Pack size "${v.label}" is listed twice.`);
    seen.add(key);
  }
};

const newVariantSku = async (productSku, label) => {
  const base = `${productSku}-${label.replace(/[^a-zA-Z0-9]/g, "")}`.toUpperCase();
  let sku = base;
  while (await ProductVariant.exists({ sku })) sku = `${base}-${Math.floor(100 + Math.random() * 900)}`;
  return sku;
};

/** Writes the product's pack sizes: updates matching ones, adds new ones, retires the ones no longer listed. */
const syncProductVariants = async (product, inputs, actorId) => {
  const existing = await ProductVariant.find({ productId: product._id }).sort({ createdAt: 1 });
  const byId = new Map(existing.map((v) => [String(v._id), v]));
  const byLabel = new Map(existing.filter((v) => v.isActive).map((v) => [v.label.toLowerCase(), v]));
  const kept = new Set();
  const saved = [];

  for (const input of inputs) {
    let variant = (input.id && byId.get(input.id)) || byLabel.get(input.label.toLowerCase()) || null;
    if (variant && kept.has(String(variant._id))) variant = null;
    const stockTarget = input.stock === undefined || input.stock === null || input.stock === "" ? null : wholeNumber(input.stock, 0);

    if (!variant) {
      variant = new ProductVariant({
        productId: product._id,
        sku: await newVariantSku(product.sku, input.label),
        label: input.label,
        stockOnHand: 0,
      });
    }
    const beforeStock = variant.stockOnHand || 0;
    variant.label = input.label;
    variant.packQuantity = input.packQuantity;
    variant.packUnit = input.packUnit;
    variant.pricePaise = input.pricePaise;
    variant.compareAtPricePaise = input.compareAtPricePaise;
    variant.costPricePaise = input.costPricePaise;
    variant.reorderThreshold = input.reorderThreshold;
    variant.isActive = true;
    if ((variant.reservedStock || 0) < 0) variant.reservedStock = 0;
    // The form shows available stock (on hand minus units held for open orders)
    if (stockTarget !== null) variant.stockOnHand = stockTarget + (variant.reservedStock || 0);
    await variant.save();
    kept.add(String(variant._id));
    saved.push(variant);

    if (variant.stockOnHand !== beforeStock) {
      await InventoryMovement.create({
        variantId: variant._id,
        productId: product._id,
        delta: variant.stockOnHand - beforeStock,
        beforeStock,
        afterStock: variant.stockOnHand,
        reason: INVENTORY_REASONS.WAREHOUSE_ADJUSTMENT,
        reference: "Product form",
        actorId: String(actorId || "staff"),
        note: beforeStock === 0 && existing.every((e) => String(e._id) !== String(variant._id)) ? "Opening stock" : "Product edit",
      });
    }
  }

  for (const variant of existing) {
    if (kept.has(String(variant._id)) || !variant.isActive) continue;
    if ((variant.reservedStock || 0) > 0) {
      throw ApiError.badRequest(`Pack size "${variant.label}" has units held for open orders and cannot be removed yet.`);
    }
    variant.isActive = false;
    await variant.save();
  }

  // The product card shows the first pack size's price and label
  const lead = saved[0];
  product.basePricePaise = lead.pricePaise;
  product.compareAtPricePaise = lead.compareAtPricePaise || 0;
  product.packSize = lead.label;
  await product.save();
  return saved;
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
    phoneCountryCode: user.phoneCountryCode || "",
    phoneNumber: user.phoneNumber || "",
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
    const productName = String(data.name || data.title || "").trim();
    if (!productName) throw ApiError.badRequest("Product title is required.");
    const productType = PRODUCT_TYPE_KEYS.includes(data.productType) ? data.productType : "other";
    const soldAs = data.soldAs === "single" ? "single" : "multiple";

    const variantInputs = buildVariantInputs(data, productType);
    validateVariantInputs(variantInputs);
    const basePricePaise = variantInputs[0].pricePaise;
    const compareAtPricePaise = variantInputs[0].compareAtPricePaise;

    let finalSlug = (data.slug || productName.toLowerCase().replace(/[^a-z0-9]+/g, "-")).trim();
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
      name: productName,
      slug: finalSlug,
      sku: finalSku,
      brand: data.brand || "Divyam Ayurveda",
      categoryId: data.categoryId || data.category || "wellness-essentials",
      subcategoryId: data.subcategoryId || "",
      subcategory: data.subcategory || "",
      shortDescription: data.shortDescription || data.subtitle || "",
      description: data.description || "",
      images: await compressImages(
        Array.isArray(data.images) && data.images.length > 0 ? data.images : data.image ? [data.image] : []
      ),
      packSize: variantInputs[0].label,
      productType,
      soldAs,
      productForm: String(data.productForm || "").trim() || (productType === "other" ? "" : PRODUCT_TYPES[productType].label),
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
      parcel: cleanParcel(data.parcel || {}),
      seo: {
        metaTitle: String(data.seo?.metaTitle ?? "").trim().slice(0, 120),
        metaDescription: String(data.seo?.metaDescription ?? "").trim().slice(0, 320),
      },
      status: (data.status || "active").toLowerCase(),
    });

    // Every product always has at least one pack size: stock and price live on them
    const createdVariants = await syncProductVariants(product, variantInputs, staffUser?._id);

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

    // The product form sends its pack sizes (or the single pack's details); price edits without them use the older path
    if (data.productType !== undefined && !PRODUCT_TYPE_KEYS.includes(data.productType)) {
      throw ApiError.badRequest("Unknown product type.");
    }
    const nextType = data.productType ?? product.productType;
    const structured = Array.isArray(data.variants) || data.soldAs !== undefined;
    const variantInputs = structured ? buildVariantInputs({ ...data, soldAs: data.soldAs ?? product.soldAs }, nextType) : null;
    if (variantInputs) validateVariantInputs(variantInputs);
    if (data.productType !== undefined) product.productType = data.productType;
    if (data.soldAs !== undefined) product.soldAs = data.soldAs === "single" ? "single" : "multiple";

    if (data.name || data.title) product.name = String(data.name || data.title).trim();
    if (data.slug !== undefined) product.slug = String(data.slug).trim().toLowerCase();
    if (data.sku !== undefined) product.sku = String(data.sku).trim().toUpperCase();
    if (!variantInputs && data.price !== undefined) product.basePricePaise = toPaise(Number(data.price));
    if (!variantInputs && data.compareAtPrice !== undefined) product.compareAtPricePaise = toPaise(Number(data.compareAtPrice));
    if (data.status !== undefined) product.status = String(data.status).toLowerCase();

    // Keep every editable formulation field in sync with the admin form. The
    // prior implementation only persisted a small subset (name, price and a
    // few flags), which made successful edits appear to be lost after reload.
    for (const field of [
      "brand", "categoryId", "subcategoryId", "subcategory", "shortDescription",
      "description", "productForm", "dosage", "warnings",
    ]) {
      if (data[field] !== undefined) product[field] = data[field];
    }
    if (!variantInputs && data.packSize !== undefined) product.packSize = data.packSize;
    if (!product.productForm && product.productType !== "other") product.productForm = PRODUCT_TYPES[product.productType].label;
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
    if (data.parcel && typeof data.parcel === "object") {
      product.parcel = cleanParcel(data.parcel);
    }
    // The form round-trips images it loaded as image-endpoint URLs; map those back to the stored data
    if (data.images) {
      const existingImages = [...product.images];
      const resolved = resolveStoredImages(data.images, existingImages, product._id);
      // Only newly uploaded photos are compressed; images already stored are left untouched so repeated
      // saves never re-encode (and degrade) them.
      product.images = await Promise.all(
        resolved.map(async (img) => (existingImages.includes(img) ? img : (await compressImages([img]))[0]))
      );
    }
    if (data.isFeatured !== undefined) product.isFeatured = Boolean(data.isFeatured);
    if (data.isBestSeller !== undefined || data.isBestseller !== undefined) {
      product.isBestSeller = Boolean(data.isBestSeller ?? data.isBestseller);
    }
    if (data.isTrending !== undefined) product.isTrending = Boolean(data.isTrending);
    if (data.isNew !== undefined || data.isNewArrival !== undefined) {
      product.isNew = Boolean(data.isNew ?? data.isNewArrival);
    }

    if (variantInputs) {
      await product.save();
      await syncProductVariants(product, variantInputs, staffUser?._id || staffUser?.id);
    } else {
      await product.save();
    }

    // Customers see each pack size's own price (quick view, product page, cart), so a price edit has to
    // reach the pack size that carries the product's price: the variant priced at the old base price,
    // or the first pack size when none matches (this also repairs products already out of sync).
    // Skipped when the whole pack-size list was saved above.
    if (!variantInputs && (data.price !== undefined || data.compareAtPrice !== undefined)) {
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

    const requestedStock = variantInputs ? undefined : data.stock ?? data.stockQuantity;
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
    if (!variantInputs && data.reorderThreshold !== undefined && Number.isFinite(threshold) && threshold >= 0) {
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

    const variants = await ProductVariant.find({ productId: product._id }).sort({ createdAt: 1 });
    return formatAdminProduct(product, variants);
  }

  /**
   * Delete a product. Products with past orders are archived (soft delete); the rest are removed
   * permanently along with their product-owned records.
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

    // A product that customers have bought is archived, not erased: past orders still show its
    // photo (served from the product record) and details. It disappears from the store and the
    // default admin list, and can be restored by setting its status back to active.
    const hasOrders = await Order.exists({ "items.productId": product._id });
    if (hasOrders) {
      product.status = "archived";
      await product.save();
      return {
        archived: true,
        id: product.id,
        message: "This product has past orders, so it was archived instead of deleted. It is hidden from the store.",
      };
    }

    await Promise.all([
      ProductVariant.deleteMany({ productId: product._id }),
      Review.deleteMany({ productId: product._id }),
    ]);
    await Product.deleteOne({ _id: product._id });

    return { archived: false, message: "Product deleted permanently." };
  }

  /**
   * Admin Users Management
   */
  async createAdminUser(data, staffUser) {
    const name = String(data.name || "").trim();
    const email = String(data.email || "").trim().toLowerCase();
    if (name.length < 2) throw ApiError.badRequest("Enter the staff member's full name.");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) throw ApiError.badRequest("Enter a valid email address.");

    // Optional for staff. Accepts a country code + number, or one "+91 ..." string; stored in the canonical form
    let phoneFields = null;
    try {
      phoneFields = readPhoneInput(data);
    } catch (err) {
      if (err.invalid) throw ApiError.badRequest("Enter a valid mobile number for the selected country, or leave it blank.");
      throw err;
    }

    if (await User.exists({ email })) throw ApiError.conflict("An account with this email address already exists.");
    if (phoneFields && (await User.exists({ phone: phoneFields.phone }))) {
      throw ApiError.conflict("This phone number is already used by another account.");
    }

    // Everyone on the team is an administrator with full access. A temporary password is generated unless the admin
    // typed one (which must meet the same rules as any password); either way the person must replace it at first sign-in.
    const supplied = String(data.password || "");
    if (supplied) {
      if (supplied.length < 8 || supplied.length > 128 || !/[A-Za-z]/.test(supplied) || !/\d/.test(supplied)) {
        throw ApiError.badRequest("The temporary password must be 8-128 characters with at least one letter and one number.");
      }
    }
    const temporaryPassword = supplied || generateTemporaryPassword();

    const role = await Role.findOne({ name: ROLES.SUPER_ADMIN });
    if (!role) throw ApiError.internal("The administrator role is missing. Run the admin setup script.");

    let user;
    try {
      user = await User.create({
        name,
        email,
        ...(phoneFields
          ? { phone: phoneFields.phone, phoneCountryCode: phoneFields.phoneCountryCode, phoneNumber: phoneFields.phoneNumber }
          : {}),
        passwordHash: await hashPassword(temporaryPassword),
        isStaff: true,
        roles: [role._id],
        status: "active",
        isOwner: false,
        mustChangePassword: true,
      });
    } catch (err) {
      if (err.code === 11000) throw ApiError.conflict("An account with this email address or phone number already exists.");
      throw err;
    }

    await logAudit({
      actorId: staffUser?._id,
      actorName: staffUser?.name,
      actorRole: staffUser?.roles?.[0]?.name || "Super Admin",
      action: "users.create",
      module: "Administration",
      targetId: user.id,
      details: `Created staff user ${user.name} (${user.email}) with a temporary password`,
    });

    // The temporary password is returned this once so the admin can pass it on; only its hash is stored
    return { ...user.toJSON(), temporaryPassword };
  }

  /**
   * Issue a new temporary password for a staff member (forgotten password). Signs them out everywhere and makes them
   * choose their own at next sign-in. Your own password is changed from Profile & Security instead.
   */
  async resetAdminUserPassword(id, staffUser) {
    const user = await User.findOne({ _id: id, isStaff: true });
    if (!user) throw ApiError.notFound("Staff user not found");
    if (user.isOwner) {
      throw ApiError.forbidden("The owner account can only be changed by the owner, from Profile & Security.");
    }
    if (String(user._id) === String(staffUser?._id)) {
      throw ApiError.forbidden("Change your own password from Profile & Security.");
    }

    const temporaryPassword = generateTemporaryPassword();
    await User.updateOne(
      { _id: user._id },
      {
        $set: {
          passwordHash: await hashPassword(temporaryPassword),
          mustChangePassword: true,
          refreshTokenHash: null,
          failedLoginAttempts: 0,
          lockUntil: null,
        },
        $inc: { tokenVersion: 1 },
      }
    );

    await logAudit({
      actorId: staffUser?._id,
      actorName: staffUser?.name,
      actorRole: staffUser?.roles?.[0]?.name || "Staff",
      action: "users.reset_password",
      module: "Administration",
      targetId: user.id,
      details: `Issued a temporary password for ${user.name} (${user.email}); their sessions were signed out.`,
    });
    return { id: String(user._id), email: user.email, temporaryPassword };
  }

  /**
   * Support inbox: enquiries and tickets
   */
  async updateEnquiry(id, data, staffUser) {
    const enquiry = await ContactEnquiry.findById(id);
    if (!enquiry) throw ApiError.notFound("Enquiry not found");
    const before = enquiry.status;
    const reply = String(data.reply ?? "").trim();
    if (reply) {
      if (reply.length > 2000) throw ApiError.badRequest("A reply can be at most 2000 characters.");
      enquiry.replies.push({ message: reply, staffName: staffUser?.name || "Staff", time: new Date() });
      // Replying moves it forward unless the staff member chose a status themselves
      if (data.status === undefined && ["New", "In Progress"].includes(enquiry.status)) enquiry.status = "Replied";
    }
    if (data.status !== undefined) enquiry.status = data.status;
    if (data.adminNotes !== undefined) enquiry.adminNotes = String(data.adminNotes);
    await enquiry.save();
    await logAudit({
      actorId: staffUser?._id,
      actorName: staffUser?.name,
      actorRole: staffUser?.roles?.[0]?.name || "Staff",
      action: "support.enquiry.update",
      module: "Customers",
      targetId: enquiry.id,
      details: `Enquiry from ${enquiry.email}: ${before} -> ${enquiry.status}${reply ? " (reply saved)" : ""}`,
    });
    return enquiry.toJSON();
  }

  async updateSupportTicket(id, data, staffUser) {
    const ticket = await SupportTicket.findById(id);
    if (!ticket) throw ApiError.notFound("Support ticket not found");
    const before = ticket.status;
    const reply = String(data.reply ?? "").trim();
    if (reply) {
      if (reply.length > 2000) throw ApiError.badRequest("A reply can be at most 2000 characters.");
      ticket.messages.push({ sender: staffUser?.name || "Support team", senderRole: "staff", message: reply, time: new Date() });
      // A reply means someone is on it; resolving stays a separate, deliberate step
      if (data.status === undefined && ticket.status === "Open") ticket.status = "In Progress";
    }
    if (data.status !== undefined) ticket.status = data.status;
    if (data.internalNotes !== undefined) ticket.internalNotes = String(data.internalNotes);
    await ticket.save();
    await logAudit({
      actorId: staffUser?._id,
      actorName: staffUser?.name,
      actorRole: staffUser?.roles?.[0]?.name || "Staff",
      action: "support.ticket.update",
      module: "Customers",
      targetId: ticket.id,
      details: `Ticket ${ticket.ticketNumber}: ${before} -> ${ticket.status}${reply ? " (reply sent)" : ""}`,
    });
    return ticket.toJSON();
  }

  async updateAdminUser(id, data, staffUser) {
    const user = await User.findOne({ _id: id, isStaff: true }).populate("roles");
    if (!user) throw ApiError.notFound("Staff user not found");
    if (user.isOwner) {
      throw ApiError.forbidden("The owner account can only be changed by the owner, from Profile & Security.");
    }

    const isSelf = String(user._id) === String(staffUser?._id);
    const wasSuperAdmin = user.roles.some((r) => r.name === ROLES.SUPER_ADMIN);

    if (data.status !== undefined && !["active", "suspended", "pending"].includes(data.status)) {
      throw ApiError.badRequest("Invalid status.");
    }
    if (isSelf && data.status && data.status !== "active") {
      throw ApiError.forbidden("You cannot deactivate your own account.");
    }

    const suspended = wasSuperAdmin && data.status && data.status !== "active";
    if (suspended) {
      const otherActive = await this._countOtherActiveSuperAdmins(user._id);
      if (otherActive === 0) throw ApiError.conflict("At least one active Super Admin is required.");
    }

    if (data.name !== undefined && String(data.name).trim()) user.name = String(data.name).trim();
    if (data.phone !== undefined) {
      let phoneFields = null;
      try {
        phoneFields = readPhoneInput(data);
      } catch (err) {
        if (err.invalid) throw ApiError.badRequest("Enter a valid mobile number for the selected country, or leave it blank.");
        throw err;
      }
      if (phoneFields && phoneFields.phone !== user.phone && (await User.exists({ phone: phoneFields.phone, _id: { $ne: user._id } }))) {
        throw ApiError.conflict("This phone number is already used by another account.");
      }
      if (phoneFields) {
        if (phoneFields.phone !== user.phone) user.phoneVerified = false;
        user.phone = phoneFields.phone;
        user.phoneCountryCode = phoneFields.phoneCountryCode;
        user.phoneNumber = phoneFields.phoneNumber;
      } else {
        user.phone = undefined;
        user.phoneCountryCode = undefined;
        user.phoneNumber = undefined;
        user.phoneVerified = false;
      }
    }
    if (data.status !== undefined) {
      if (data.status !== user.status && data.status !== "active") {
        user.refreshTokenHash = undefined; // end any open session...
        user.tokenVersion = (user.tokenVersion || 0) + 1; // ...including access tokens already issued
      }
      user.status = data.status;
    }
    await user.save();

    await logAudit({
      actorId: staffUser?._id,
      actorName: staffUser?.name,
      actorRole: staffUser?.roles?.[0]?.name || "Staff",
      action: "users.edit",
      module: "Administration",
      targetId: user.id,
      details: `Updated staff user ${user.name} (${user.email})`,
    });
    await user.populate("roles");
    return user.toJSON();
  }

  async deleteAdminUser(id, staffUser) {
    const user = await User.findOne({ _id: id, isStaff: true }).populate("roles");
    if (!user) throw ApiError.notFound("Staff user not found");
    if (user.isOwner) {
      throw ApiError.forbidden("The owner account can only be changed by the owner, from Profile & Security.");
    }
    if (String(user._id) === String(staffUser?._id)) throw ApiError.forbidden("You cannot delete your own account.");
    if (user.roles.some((r) => r.name === ROLES.SUPER_ADMIN)) {
      const otherActive = await this._countOtherActiveSuperAdmins(user._id);
      if (otherActive === 0) throw ApiError.conflict("At least one active Super Admin is required.");
    }
    await User.deleteOne({ _id: user._id });
    await logAudit({
      actorId: staffUser?._id,
      actorName: staffUser?.name,
      actorRole: staffUser?.roles?.[0]?.name || "Staff",
      action: "users.delete",
      module: "Administration",
      targetId: user.id,
      details: `Deleted staff user ${user.name} (${user.email})`,
    });
    return { message: "Staff user deleted." };
  }

  async _countOtherActiveSuperAdmins(excludeId) {
    const role = await Role.findOne({ name: ROLES.SUPER_ADMIN });
    if (!role) return 0;
    return User.countDocuments({ _id: { $ne: excludeId }, isStaff: true, status: "active", roles: role._id });
  }
}

export const adminService = new AdminService();

