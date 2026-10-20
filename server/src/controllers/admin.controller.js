import mongoose from "mongoose";
import { adminService, formatAdminProduct, invalidateStorefrontCache } from "../services/admin.service.js";
import { inventoryService } from "../services/inventory.service.js";
import { orderService } from "../services/order.service.js";
import { shipmentService } from "../services/shipment.service.js";
import { logAudit } from "../services/audit.service.js";
import { Product } from "../models/Product.js";
import { ProductVariant } from "../models/ProductVariant.js";
import { Category } from "../models/Category.js";
import { Brand } from "../models/Brand.js";
import { Collection } from "../models/Collection.js";
import { Ingredient } from "../models/Ingredient.js";
import { Order } from "../models/Order.js";
import { User } from "../models/User.js";
import { Role } from "../models/Role.js";
import { Coupon } from "../models/Coupon.js";
import { Review } from "../models/Review.js";
import { ReturnRequest } from "../models/ReturnRequest.js";
import { Refund } from "../models/Refund.js";
import { SupportTicket } from "../models/SupportTicket.js";
import { ContactEnquiry } from "../models/ContactEnquiry.js";
import { Subscriber } from "../models/Subscriber.js";
import { StoreSettings } from "../models/StoreSettings.js";
import { HomepageConfig } from "../models/HomepageConfig.js";
import { referralService } from "../services/referral.service.js";
import { analyticsService } from "../services/analytics.service.js";
import { ReferralProgram } from "../models/ReferralProgram.js";
import { AuditLog } from "../models/AuditLog.js";
import { contentService } from "../services/content.service.js";
import { sendSuccess } from "../utils/response.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";
import { toRupees, toPaise } from "../utils/currency.js";

export const getDashboard = asyncHandler(async (req, res) => {
  const data = await adminService.getDashboardMetrics();
  return sendSuccess(res, data);
});

export const getRevenueReport = asyncHandler(async (req, res) => {
  const { days, basis, months } = req.query;
  return sendSuccess(res, await analyticsService.getRevenueReport({ days, basis, months }));
});

export const getSalesReport = asyncHandler(async (req, res) => {
  const data = await adminService.getSalesReport(req.query);
  return sendSuccess(res, data);
});

// Catalog Admin
export const listAdminProducts = asyncHandler(async (req, res) => {
  const { q, status, category, brand, lowStock, page = 1, limit = 20 } = req.query;
  // A product deletion is an archive operation so order history can still
  // reference the product. Do not return archived rows in the normal admin
  // catalogue, otherwise a row that was removed optimistically reappears on
  // the next refresh.
  const filter = { status: { $ne: "archived" } };

  if (status && status !== "all") filter.status = status;
  if (category && category !== "all") filter.categoryId = category;
  if (brand && brand !== "all") filter.brand = { $regex: brand, $options: "i" };
  if (q) filter.name = { $regex: q.trim(), $options: "i" };

  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20));
  const skip = (safePage - 1) * safeLimit;

  const [products, total] = await Promise.all([
    Product.find(filter).sort({ createdAt: -1 }).skip(skip).limit(safeLimit).lean(),
    Product.countDocuments(filter),
  ]);

  const pIds = products.map((p) => p._id);
  const variants = await ProductVariant.find({ productId: { $in: pIds } }).sort({ createdAt: 1 }).lean();

  const formatted = products.map((p) => {
    const pVars = variants
      .filter((v) => v.productId.toString() === p._id.toString())
      .map((v) => ({ ...v, id: v._id.toString() }));
    return formatAdminProduct({ ...p, id: p._id.toString() }, pVars);
  });

  return sendSuccess(res, formatted, { page: safePage, limit: safeLimit, total });
});

export const createProduct = asyncHandler(async (req, res) => {
  const product = await adminService.createProduct(req.body, req.user);
  return sendSuccess(res, product, undefined, 201);
});

export const updateProduct = asyncHandler(async (req, res) => {
  const product = await adminService.updateProduct(req.params.id, req.body, req.user);
  return sendSuccess(res, product);
});

export const deleteProduct = asyncHandler(async (req, res) => {
  const result = await adminService.deleteProduct(req.params.id, req.user);
  return sendSuccess(res, result);
});

export const adjustInventory = asyncHandler(async (req, res) => {
  const { productId, variantId, operation = "add", quantity, reason, note } = req.body;
  const common = {
    operation,
    quantity: Number(quantity),
    reason,
    note,
    actorId: req.user ? req.user.id || req.user._id : "staff",
    idempotencyKey: req.header("Idempotency-Key") || null,
  };

  // Product-level adjustment (admin inventory screen) vs. single-variant adjustment
  const result = productId
    ? await inventoryService.adjustProductStock({ productId, ...common })
    : await inventoryService.adjustStock({ variantId, ...common });

  await invalidateStorefrontCache();
  return sendSuccess(res, result);
});

// Categories, Brands, Collections CRUD
export const listCategories = asyncHandler(async (req, res) => {
  const categories = await Category.find({ status: { $ne: "archived" } }).sort({ displayOrder: 1, name: 1 });
  return sendSuccess(res, categories);
});

const slugifyText = (text) =>
  String(text || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

// Maps the admin form payload (order/featured, loose subcategories) onto the Category schema
const toCategoryFields = (body = {}) => {
  const fields = {};
  if (body.name !== undefined) fields.name = String(body.name).trim();
  if (body.slug !== undefined) fields.slug = slugifyText(body.slug);
  for (const key of ["shortName", "description", "image", "bannerImage", "status"]) {
    if (body[key] !== undefined) fields[key] = body[key];
  }
  const order = body.displayOrder ?? body.order;
  if (order !== undefined && Number.isFinite(Number(order))) fields.displayOrder = Number(order);
  const featured = body.isFeatured ?? body.featured;
  if (featured !== undefined) fields.isFeatured = Boolean(featured);
  if (Array.isArray(body.subcategories)) {
    fields.subcategories = body.subcategories
      .filter((s) => s && String(s.name || "").trim())
      .map((s, i) => {
        const name = String(s.name).trim();
        return {
          id: String(s.id || `sub-${Date.now()}-${i}`),
          name,
          slug: slugifyText(s.slug || name),
          description: s.description || "",
          image: s.image || "",
        };
      });
  }
  return fields;
};

export const createCategory = asyncHandler(async (req, res) => {
  const fields = toCategoryFields(req.body);
  if (!fields.name) throw ApiError.badRequest("Category name is required.");
  fields.slug = fields.slug || slugifyText(fields.name);
  if (await Category.exists({ slug: fields.slug })) {
    throw ApiError.conflict(`A category with the slug "${fields.slug}" already exists.`);
  }

  const cat = await Category.create(fields);
  await logAudit({
    actorId: req.user._id,
    actorName: req.user.name,
    action: "categories.create",
    module: "Catalog",
    targetId: cat.id,
    details: `Created category ${cat.name}`,
  });
  await invalidateStorefrontCache();
  return sendSuccess(res, cat, undefined, 201);
});

export const updateCategory = asyncHandler(async (req, res) => {
  const fields = toCategoryFields(req.body);
  if (fields.slug && (await Category.exists({ slug: fields.slug, _id: { $ne: req.params.id } }))) {
    throw ApiError.conflict(`A category with the slug "${fields.slug}" already exists.`);
  }
  const cat = await Category.findByIdAndUpdate(req.params.id, fields, { new: true, runValidators: true });
  if (!cat) throw ApiError.notFound("Category not found");
  await invalidateStorefrontCache();
  return sendSuccess(res, cat);
});

export const deleteCategory = asyncHandler(async (req, res) => {
  const cat = await Category.findByIdAndDelete(req.params.id);
  if (!cat) throw ApiError.notFound("Category not found");
  await invalidateStorefrontCache();
  return sendSuccess(res, { message: "Category deleted" });
});

export const listBrands = asyncHandler(async (req, res) => {
  const brands = await Brand.find().sort({ name: 1 });
  return sendSuccess(res, brands);
});

// Maps the admin form payload onto the Brand schema
const toBrandFields = (body = {}) => {
  const fields = {};
  if (body.name !== undefined) fields.name = String(body.name).trim();
  if (body.slug !== undefined) fields.slug = slugifyText(body.slug);
  for (const key of ["description", "logo", "origin", "status"]) {
    if (body[key] !== undefined) fields[key] = body[key];
  }
  if (body.established !== undefined) {
    const year = Number(body.established);
    fields.established = Number.isFinite(year) && year > 0 ? year : null;
  }
  if (body.certified !== undefined) fields.certified = Boolean(body.certified);
  return fields;
};

export const createBrand = asyncHandler(async (req, res) => {
  const fields = toBrandFields(req.body);
  if (!fields.name) throw ApiError.badRequest("Brand name is required.");
  fields.slug = fields.slug || slugifyText(fields.name);
  if (await Brand.exists({ $or: [{ slug: fields.slug }, { name: fields.name }] })) {
    throw ApiError.conflict(`A brand named "${fields.name}" already exists.`);
  }
  const brand = await Brand.create(fields);
  await invalidateStorefrontCache();
  return sendSuccess(res, brand, undefined, 201);
});

export const updateBrand = asyncHandler(async (req, res) => {
  const fields = toBrandFields(req.body);
  const clash = [];
  if (fields.name) clash.push({ name: fields.name });
  if (fields.slug) clash.push({ slug: fields.slug });
  if (clash.length && (await Brand.exists({ $or: clash, _id: { $ne: req.params.id } }))) {
    throw ApiError.conflict("Another brand already uses this name.");
  }
  const brand = await Brand.findByIdAndUpdate(req.params.id, fields, { new: true, runValidators: true });
  if (!brand) throw ApiError.notFound("Brand not found");
  await invalidateStorefrontCache();
  return sendSuccess(res, brand);
});

export const deleteBrand = asyncHandler(async (req, res) => {
  const brand = await Brand.findByIdAndDelete(req.params.id);
  if (!brand) throw ApiError.notFound("Brand not found");
  await invalidateStorefrontCache();
  return sendSuccess(res, { message: "Brand deleted" });
});

export const listCollections = asyncHandler(async (req, res) => {
  const collections = await Collection.find().sort({ name: 1 });
  return sendSuccess(res, collections);
});

// Maps the admin form payload (title/featured) onto the Collection schema
const toCollectionFields = (body = {}) => {
  const fields = {};
  const name = body.name ?? body.title;
  if (name !== undefined) fields.name = String(name).trim();
  if (body.slug !== undefined) fields.slug = String(body.slug).trim().toLowerCase();
  for (const key of ["subtitle", "description", "image", "badge", "filterTag", "status"]) {
    if (body[key] !== undefined) fields[key] = body[key];
  }
  const featured = body.isFeatured ?? body.featured;
  if (featured !== undefined) fields.isFeatured = Boolean(featured);
  return fields;
};

const slugify = (text) =>
  String(text || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export const createCollection = asyncHandler(async (req, res) => {
  const fields = toCollectionFields(req.body);
  if (!fields.name) throw ApiError.badRequest("Collection title is required.");
  fields.slug = fields.slug || slugify(fields.name);
  if (await Collection.exists({ slug: fields.slug })) {
    throw ApiError.conflict(`A collection with the slug "${fields.slug}" already exists.`);
  }
  if (fields.isFeatured === undefined) fields.isFeatured = true;

  const col = await Collection.create(fields);
  await invalidateStorefrontCache();
  return sendSuccess(res, col, undefined, 201);
});

export const updateCollection = asyncHandler(async (req, res) => {
  const fields = toCollectionFields(req.body);
  if (fields.slug && (await Collection.exists({ slug: fields.slug, _id: { $ne: req.params.id } }))) {
    throw ApiError.conflict(`A collection with the slug "${fields.slug}" already exists.`);
  }
  const col = await Collection.findByIdAndUpdate(req.params.id, fields, { new: true, runValidators: true });
  if (!col) throw ApiError.notFound("Collection not found");
  await invalidateStorefrontCache();
  return sendSuccess(res, col);
});

export const deleteCollection = asyncHandler(async (req, res) => {
  const col = await Collection.findByIdAndDelete(req.params.id);
  if (!col) throw ApiError.notFound("Collection not found");
  await invalidateStorefrontCache();
  return sendSuccess(res, { message: "Collection deleted" });
});

// Catalog: Ingredients
export const listAdminIngredients = asyncHandler(async (req, res) => {
  const ingredients = await Ingredient.find().sort({ name: 1 });
  return sendSuccess(res, ingredients);
});

export const createIngredient = asyncHandler(async (req, res) => {
  const { name, sanskritName, botanicalName, dosha, doshaBalance, doshaEffect, partUsed, benefits, traditionalUses, image } = req.body;
  const slug = (req.body.slug || name || "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || `herb-${Date.now()}`;
  const benefitsArray = Array.isArray(benefits) ? benefits : (typeof benefits === "string" ? benefits.split(",").map(b => b.trim()).filter(Boolean) : []);
  const herb = await Ingredient.create({
    name,
    sanskritName,
    botanicalName,
    slug,
    partUsed: partUsed || "Leaves / Herb",
    doshaEffect: dosha || doshaBalance || doshaEffect || "Tridoshic",
    doshaBalance: dosha || doshaBalance || doshaEffect || "Tridoshic",
    benefits: benefitsArray,
    traditionalUses: traditionalUses || (benefitsArray.join(", ")),
    image: image || "https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=800&auto=format&fit=crop&q=80",
    status: "active",
  });
  return sendSuccess(res, herb, undefined, 201);
});

export const updateIngredient = asyncHandler(async (req, res) => {
  const herb = await Ingredient.findById(req.params.id);
  if (!herb) throw ApiError.notFound("Ingredient not found");

  const updates = { ...req.body };
  if (updates.dosha) {
    updates.doshaEffect = updates.dosha;
    updates.doshaBalance = updates.dosha;
  }
  if (typeof updates.benefits === "string") {
    updates.benefits = updates.benefits.split(",").map(b => b.trim()).filter(Boolean);
  }
  Object.assign(herb, updates);
  await herb.save();
  return sendSuccess(res, herb);
});

export const deleteIngredient = asyncHandler(async (req, res) => {
  await Ingredient.findByIdAndUpdate(req.params.id, { status: "archived" });
  return sendSuccess(res, { message: "Ingredient archived" });
});

// Sales & Orders Management
export const listAdminOrders = asyncHandler(async (req, res) => {
  const { q, status, paymentStatus, page = 1, limit = 20 } = req.query;
  const filter = {};
  if (status && status !== "all") filter.status = status;
  if (paymentStatus && paymentStatus !== "all") filter.paymentStatus = paymentStatus;
  if (q) {
    filter.$or = [
      { orderNumber: { $regex: q.trim(), $options: "i" } },
      { "customer.name": { $regex: q.trim(), $options: "i" } },
      { "customer.email": { $regex: q.trim(), $options: "i" } },
    ];
  }

  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.min(100, Math.max(1, Number(limit) || 20));
  const skip = (safePage - 1) * safeLimit;

  const [orders, total] = await Promise.all([
    Order.find(filter).sort({ createdAt: -1 }).skip(skip).limit(safeLimit),
    Order.countDocuments(filter),
  ]);

  return sendSuccess(res, orders.map((o) => o.toJSON()), { page: safePage, limit: safeLimit, total });
});

export const getAdminOrder = asyncHandler(async (req, res) => {
  const order = await orderService.getOrder(req.params.orderNumber);
  return sendSuccess(res, order);
});

export const updateOrderStatus = asyncHandler(async (req, res) => {
  const order = await orderService.updateOrderStatus(
    req.params.orderNumber,
    req.body.status,
    req.body.note,
    req.user,
    req.body.paymentStatus
  );
  return sendSuccess(res, order);
});

export const updatePaymentStatus = asyncHandler(async (req, res) => {
  const order = await orderService.updatePaymentStatus(
    req.params.orderNumber,
    req.body.paymentStatus,
    req.body.note,
    req.user
  );
  return sendSuccess(res, order);
});

export const createShipment = asyncHandler(async (req, res) => {
  const result = await shipmentService.createShipmentForOrder(
    req.params.orderNumber,
    req.user
  );
  return sendSuccess(res, result);
});

export const advanceShipment = asyncHandler(async (req, res) => {
  const result = await shipmentService.advanceShipmentStatus(
    req.params.orderNumber,
    req.body.stage || req.body.status,
    req.body.note || "",
    req.user
  );
  return sendSuccess(res, result);
});

export const updateOrderTracking = asyncHandler(async (req, res) => {
  const result = await shipmentService.updateCustomTracking(
    req.params.orderNumber,
    {
      carrier: req.body.carrier,
      trackingNumber: req.body.trackingNumber,
      trackingUrl: req.body.trackingUrl,
    },
    req.user
  );
  return sendSuccess(res, result);
});

export const getOrderShipment = asyncHandler(async (req, res) => {
  const shipment = await shipmentService.getShipmentForOrder(req.params.orderNumber);
  return sendSuccess(res, shipment);
});

export const cancelOrder = asyncHandler(async (req, res) => {
  const order = await orderService.cancelOrder(
    req.params.orderNumber,
    req.body.reason,
    req.user
  );
  return sendSuccess(res, order);
});

// Coupons CRUD
export const listCoupons = asyncHandler(async (req, res) => {
  const coupons = await Coupon.find().sort({ createdAt: -1 });
  return sendSuccess(res, coupons);
});

// Maps the admin form payload (rupees, "fixed", YYYY-MM-DD) onto the Coupon schema (paise, "fixed_amount", Date)
const istDate = (raw, endOfDay) => {
  if (!raw) return null;
  // A plain date means the whole day, in IST
  const date = /^\d{4}-\d{2}-\d{2}$/.test(String(raw))
    ? new Date(`${raw}T${endOfDay ? "23:59:59.999" : "00:00:00.000"}+05:30`)
    : new Date(raw);
  return Number.isNaN(date.getTime()) ? undefined : date;
};

const toCouponFields = (body = {}) => {
  const fields = {};
  if (body.code !== undefined) fields.code = String(body.code).trim().toUpperCase();
  if (body.type !== undefined) {
    fields.type = body.type === "fixed" || body.type === "fixed_amount" ? "fixed_amount" : "percentage";
  }
  const value = body.discountValue ?? body.value;
  if (value !== undefined && value !== "" && Number.isFinite(Number(value))) {
    // The stored unit depends on the type, so it is converted in the callers that know the final type
    fields._value = Number(value);
  }
  const minOrder = body.minOrderValue ?? body.minimumOrder ?? body.minOrder;
  if (minOrder !== undefined) fields.minimumOrderPaise = toPaise(Number(minOrder) || 0);
  const maxDiscount = body.maxDiscount ?? body.maximumDiscount;
  if (maxDiscount !== undefined) fields.maximumDiscountPaise = toPaise(Number(maxDiscount) || 0);
  if (body.validFrom !== undefined) {
    const from = istDate(body.validFrom, false);
    if (from) fields.validFrom = from;
    else if (!body.validFrom) fields.validFrom = new Date();
  }
  if (body.validUntil !== undefined) {
    const until = istDate(body.validUntil, true);
    if (until !== undefined) fields.validUntil = until;
  }
  if (body.usageLimitTotal !== undefined) {
    fields.usageLimitTotal = Number(body.usageLimitTotal) > 0 ? Number(body.usageLimitTotal) : null;
  }
  if (body.usageLimitPerUser !== undefined) {
    // 0 / blank = unlimited uses per customer
    fields.usageLimitPerUser = Number(body.usageLimitPerUser) > 0 ? Number(body.usageLimitPerUser) : null;
  }
  for (const key of ["title", "occasion", "description"]) {
    if (body[key] !== undefined) fields[key] = String(body[key]).trim();
  }
  if (body.autoApply !== undefined) fields.autoApply = Boolean(body.autoApply);
  if (body.appliesTo !== undefined) fields.appliesTo = body.appliesTo === "products" ? "products" : "all";
  if (body.applicableProducts !== undefined) {
    fields.applicableProducts = [...new Set((Array.isArray(body.applicableProducts) ? body.applicableProducts : []).map(String))];
  }
  if (body.isActive !== undefined) fields.isActive = Boolean(body.isActive);
  if (body.isPublic !== undefined) fields.isPublic = Boolean(body.isPublic);
  return fields;
};

const finalizeCouponValue = (fields, type) => {
  if (fields._value !== undefined) {
    fields.value = type === "fixed_amount" ? toPaise(fields._value) : fields._value;
  }
  delete fields._value;
  return fields;
};

// Rules shared by create and update, evaluated on the final (merged) coupon values
const assertCouponRules = ({ autoApply, code, title, appliesTo, applicableProducts, validFrom, validUntil }) => {
  if (!autoApply && !code) throw ApiError.badRequest("Coupon code is required.");
  if (autoApply && !title) throw ApiError.badRequest("Give auto-applied offers a name (e.g. \"Diwali Festive Sale\").");
  if (appliesTo === "products" && (!applicableProducts || applicableProducts.length === 0)) {
    throw ApiError.badRequest("Select at least one product, or choose \"All products\".");
  }
  if (validFrom && validUntil && validUntil < validFrom) {
    throw ApiError.badRequest("The end date must be after the start date.");
  }
};

export const createCoupon = asyncHandler(async (req, res) => {
  const fields = toCouponFields(req.body);
  fields.type = fields.type || "percentage";
  if (!(fields._value > 0)) throw ApiError.badRequest("Discount value must be greater than zero.");
  if (fields.type === "percentage" && fields._value > 100) {
    throw ApiError.badRequest("A percentage discount cannot exceed 100%.");
  }
  fields.appliesTo = fields.appliesTo || "all";
  assertCouponRules({
    ...fields,
    validFrom: fields.validFrom,
  });

  // Auto-applied offers have no code for customers to type, so one is generated for internal use
  if (fields.autoApply && !fields.code) {
    fields.code = `AUTO-${String(fields.title).toUpperCase().replace(/[^A-Z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 24)}-${Date.now().toString(36).toUpperCase()}`;
  }
  if (await Coupon.exists({ code: fields.code })) {
    throw ApiError.conflict(`A coupon with the code "${fields.code}" already exists.`);
  }
  // Auto offers apply to every shopper, so they are not limited per customer unless the admin says so
  if (fields.autoApply && req.body.usageLimitPerUser === undefined) fields.usageLimitPerUser = null;

  const coupon = await Coupon.create(finalizeCouponValue(fields, fields.type));
  return sendSuccess(res, coupon, undefined, 201);
});

export const updateCoupon = asyncHandler(async (req, res) => {
  const existing = await Coupon.findById(req.params.id);
  if (!existing) throw ApiError.notFound("Coupon not found");

  const fields = toCouponFields(req.body);
  const type = fields.type || existing.type;
  if (fields._value !== undefined && fields._value <= 0) {
    throw ApiError.badRequest("Discount value must be greater than zero.");
  }
  if (type === "percentage" && fields._value > 100) {
    throw ApiError.badRequest("A percentage discount cannot exceed 100%.");
  }
  if (fields.code && (await Coupon.exists({ code: fields.code, _id: { $ne: existing._id } }))) {
    throw ApiError.conflict(`A coupon with the code "${fields.code}" already exists.`);
  }

  // Changing the type without resending the value would leave the stored unit wrong (percent vs paise)
  if (fields.type && fields.type !== existing.type && fields._value === undefined) {
    throw ApiError.badRequest("Please re-enter the discount value when changing the discount type.");
  }

  assertCouponRules({
    autoApply: fields.autoApply ?? existing.autoApply,
    code: fields.code ?? existing.code,
    title: fields.title ?? existing.title,
    appliesTo: fields.appliesTo ?? existing.appliesTo,
    applicableProducts: fields.applicableProducts ?? existing.applicableProducts,
    validFrom: fields.validFrom ?? existing.validFrom,
    validUntil: fields.validUntil !== undefined ? fields.validUntil : existing.validUntil,
  });

  existing.set(finalizeCouponValue(fields, type));
  await existing.save();
  return sendSuccess(res, existing);
});

export const deleteCoupon = asyncHandler(async (req, res) => {
  const coupon = await Coupon.findByIdAndDelete(req.params.id);
  if (!coupon) throw ApiError.notFound("Coupon not found");
  return sendSuccess(res, { message: "Coupon deleted" });
});

// Reviews Moderation
const serializeReview = (r) => {
  const product = r.productId && typeof r.productId === "object" && r.productId.name ? r.productId : null;
  return {
    id: r._id.toString(),
    productId: String(product?._id || r.productId),
    productTitle: product?.name || "Removed product",
    productName: product?.name || "Removed product",
    productSlug: product?.slug || "",
    userName: r.userName,
    customerName: r.userName,
    rating: r.rating,
    title: r.title,
    comment: r.comment,
    verifiedPurchase: r.verifiedPurchase,
    status: r.status,
    date: r.createdAt,
    createdAt: r.createdAt,
  };
};

// A product's star rating / review count follow its approved reviews
const recalculateProductRating = async (productId) => {
  const [stats] = await Review.aggregate([
    { $match: { productId: new mongoose.Types.ObjectId(String(productId)), status: "approved" } },
    { $group: { _id: null, avg: { $avg: "$rating" }, count: { $sum: 1 } } },
  ]);
  await Product.findByIdAndUpdate(productId, {
    rating: stats ? Math.round(stats.avg * 10) / 10 : 5,
    reviewCount: stats ? stats.count : 0,
  });
};

export const listAdminReviews = asyncHandler(async (req, res) => {
  const reviews = await Review.find().populate("productId", "name slug").sort({ createdAt: -1 }).lean();
  return sendSuccess(res, reviews.map(serializeReview));
});

export const moderateReview = asyncHandler(async (req, res) => {
  const status = String(req.body.status || "").toLowerCase();
  if (!["approved", "rejected", "pending"].includes(status)) {
    throw ApiError.badRequest('Status must be "approved", "rejected" or "pending".');
  }
  const review = await Review.findByIdAndUpdate(
    req.params.id,
    { status, moderatedBy: req.user._id, moderatedAt: new Date() },
    { new: true }
  );
  if (!review) throw ApiError.notFound("Review not found");
  await recalculateProductRating(review.productId);
  await invalidateStorefrontCache();
  const populated = await Review.findById(review._id).populate("productId", "name slug").lean();
  return sendSuccess(res, serializeReview(populated));
});

export const deleteReview = asyncHandler(async (req, res) => {
  const review = await Review.findByIdAndDelete(req.params.id);
  if (!review) throw ApiError.notFound("Review not found");
  await recalculateProductRating(review.productId);
  await invalidateStorefrontCache();
  return sendSuccess(res, { message: "Review deleted" });
});

// Enquiries, Tickets, Subscribers
export const listEnquiries = asyncHandler(async (req, res) => {
  const enquiries = await ContactEnquiry.find().sort({ createdAt: -1 });
  return sendSuccess(res, enquiries);
});

export const listSupportTickets = asyncHandler(async (req, res) => {
  const tickets = await SupportTicket.find().sort({ createdAt: -1 });
  return sendSuccess(res, tickets);
});

export const listSubscribers = asyncHandler(async (req, res) => {
  const subscribers = await Subscriber.find().sort({ createdAt: -1 });
  return sendSuccess(res, subscribers);
});

// Customers & Users
export const listCustomers = asyncHandler(async (req, res) => {
  return sendSuccess(res, await adminService.listCustomers());
});

export const getCustomer = asyncHandler(async (req, res) => {
  return sendSuccess(res, await adminService.getCustomer(req.params.id));
});

export const updateCustomerStatus = asyncHandler(async (req, res) => {
  return sendSuccess(res, await adminService.setCustomerStatus(req.params.id, req.body.status, req.user));
});

export const addCustomerNote = asyncHandler(async (req, res) => {
  return sendSuccess(res, await adminService.addCustomerNote(req.params.id, req.body.text, req.user), undefined, 201);
});

// Admin Users & Roles
export const listAdminUsers = asyncHandler(async (req, res) => {
  const users = await User.find({ isStaff: true }).populate("roles");
  return sendSuccess(res, users);
});

export const createAdminUser = asyncHandler(async (req, res) => {
  const user = await adminService.createAdminUser(req.body, req.user);
  return sendSuccess(res, user, undefined, 201);
});

export const listRoles = asyncHandler(async (req, res) => {
  const roles = await Role.find();
  return sendSuccess(res, roles);
});

// Store Settings & Homepage
export const getSettings = asyncHandler(async (req, res) => {
  let settings = await StoreSettings.findOne();
  if (!settings) settings = await StoreSettings.create({});
  return sendSuccess(res, settings);
});

export const updateSettings = asyncHandler(async (req, res) => {
  let settings = await StoreSettings.findOne();
  if (!settings) settings = await StoreSettings.create({});
  Object.assign(settings, req.body);
  await settings.save();

  await logAudit({
    actorId: req.user._id,
    actorName: req.user.name,
    action: "settings.manage",
    module: "Configuration",
    details: "Updated global store configuration settings",
  });

  return sendSuccess(res, settings);
});

export const getHomepageAdmin = asyncHandler(async (req, res) => {
  let hp = await HomepageConfig.findOne();
  if (!hp) hp = await HomepageConfig.create({});
  return sendSuccess(res, hp);
});

export const updateHomepageAdmin = asyncHandler(async (req, res) => {
  let hp = await HomepageConfig.findOne();
  if (!hp) hp = await HomepageConfig.create({});
  Object.assign(hp, req.body);
  await hp.save();

  await logAudit({
    actorId: req.user._id,
    actorName: req.user.name,
    action: "content.manage",
    module: "Storefront",
    details: "Updated homepage content and section layout",
  });

  return sendSuccess(res, hp);
});

export const listAuditLogs = asyncHandler(async (req, res) => {
  const logs = await AuditLog.find().sort({ createdAt: -1 }).limit(100);
  return sendSuccess(res, logs);
});

// Referrals & Rewards Program
export const getReferralProgram = asyncHandler(async (req, res) => {
  let program = await ReferralProgram.findOne();
  if (!program) program = await ReferralProgram.create({});
  return sendSuccess(res, program.toJSON());
});

export const updateReferralProgram = asyncHandler(async (req, res) => {
  let program = await ReferralProgram.findOne();
  if (!program) program = await ReferralProgram.create({});

  const body = req.body || {};
  const readNumber = (value, label, { min = 0, max = Infinity, integer = false } = {}) => {
    const n = Number(value);
    if (value === "" || value === null || !Number.isFinite(n) || n < min || n > max || (integer && !Number.isInteger(n))) {
      throw ApiError.badRequest(`${label} must be ${integer ? "a whole " : "a "}number${max !== Infinity ? ` between ${min} and ${max}` : ` of at least ${min}`}.`);
    }
    return n;
  };

  if (body.enabled !== undefined) program.enabled = Boolean(body.enabled);
  if (body.programName !== undefined) program.programName = String(body.programName);
  if (body.refereeDiscountType !== undefined) {
    if (!["percentage", "fixed"].includes(body.refereeDiscountType)) {
      throw ApiError.badRequest('Friend discount type must be "percentage" or "fixed".');
    }
    program.refereeDiscountType = body.refereeDiscountType;
  }
  if (body.refereeDiscountPercent !== undefined) {
    // A percentage discount cannot exceed 100; a fixed amount is in rupees
    const cap = program.refereeDiscountType === "percentage" ? 100 : Infinity;
    program.refereeDiscountPercent = readNumber(body.refereeDiscountPercent, "Friend discount value", { max: cap });
  }
  if (body.minOrderValuePaise !== undefined) program.minOrderValuePaise = readNumber(body.minOrderValuePaise, "Minimum order");
  if (body.minOrderValue !== undefined) program.minOrderValuePaise = Math.round(readNumber(body.minOrderValue, "Minimum order") * 100);
  if (body.referrerRewardPaise !== undefined) program.referrerRewardPaise = readNumber(body.referrerRewardPaise, "Referrer reward");
  if (body.referrerReward !== undefined) program.referrerRewardPaise = Math.round(readNumber(body.referrerReward, "Referrer reward") * 100);
  if (body.refereeDiscountCap !== undefined) program.refereeDiscountCapPaise = Math.round(readNumber(body.refereeDiscountCap, "Friend discount cap") * 100);
  if (body.referrerRewardType !== undefined) {
    if (!["fixed", "percent"].includes(body.referrerRewardType)) throw ApiError.badRequest('Reward type must be "fixed" or "percent".');
    program.referrerRewardType = body.referrerRewardType;
  }
  if (body.referrerRewardPercent !== undefined) program.referrerRewardPercent = readNumber(body.referrerRewardPercent, "Reward percent", { max: 100 });
  if (body.referrerRewardCap !== undefined) program.referrerRewardCapPaise = Math.round(readNumber(body.referrerRewardCap, "Reward cap") * 100);
  if (body.holdDays !== undefined) program.holdDays = readNumber(body.holdDays, "Reward hold days", { max: 90, integer: true });
  if (body.maxRewardsPerMonth !== undefined) program.maxRewardsPerMonth = readNumber(body.maxRewardsPerMonth, "Monthly reward limit", { integer: true });
  if (body.cookieExpiryDays !== undefined) program.cookieExpiryDays = readNumber(body.cookieExpiryDays, "Attribution validity (days)", { min: 1, max: 365, integer: true });

  await program.save();

  await logAudit({
    actorId: req.user._id,
    actorName: req.user.name,
    action: "settings.manage",
    module: "Configuration",
    details: "Updated Referral & Rewards Program configuration",
  });

  return sendSuccess(res, program.toJSON());
});

export const listReferrals = asyncHandler(async (req, res) => sendSuccess(res, await referralService.adminOverview()));

export const approveReferral = asyncHandler(async (req, res) =>
  sendSuccess(res, (await referralService.approve(req.params.id, req.user)).toJSON())
);

export const voidReferral = asyncHandler(async (req, res) =>
  sendSuccess(res, (await referralService.void(req.params.id, req.body?.reason, req.user)).toJSON())
);

export const exportReferrals = asyncHandler(async (req, res) => {
  const { items } = await referralService.adminOverview();
  const esc = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  const header = ["Date", "Referrer", "Referrer email", "Code", "Friend", "Friend email", "Order", "Order amount", "Friend discount", "Reward", "Status", "Flags"];
  const lines = items.map((r) =>
    [r.createdAt?.toISOString?.() || r.createdAt, r.referrer?.name, r.referrer?.email, r.code, r.referee.name, r.referee.email, r.orderNumber, r.orderAmount, r.discount, r.rewardAmount, r.status, r.flags.join("|")].map(esc).join(",")
  );
  res.setHeader("Content-Type", "text/csv");
  res.setHeader("Content-Disposition", 'attachment; filename="referrals.csv"');
  return res.send([header.map(esc).join(","), ...lines].join("\r\n"));
});

// Blog & Education Admin
export const listAdminBlogPosts = asyncHandler(async (req, res) => {
  const posts = await contentService.listAdminBlogPosts();
  return sendSuccess(res, posts);
});

export const createBlogPost = asyncHandler(async (req, res) => {
  const post = await contentService.createBlogPost(req.body, req.user);
  await logAudit({
    actorId: req.user._id,
    actorName: req.user.name,
    action: "content.manage",
    module: "Storefront",
    details: `Created blog article: ${post.title}`,
  });
  return sendSuccess(res, post, undefined, 201);
});

export const updateBlogPost = asyncHandler(async (req, res) => {
  const post = await contentService.updateBlogPost(req.params.id, req.body, req.user);
  await logAudit({
    actorId: req.user._id,
    actorName: req.user.name,
    action: "content.manage",
    module: "Storefront",
    details: `Updated blog article: ${post.title}`,
  });
  return sendSuccess(res, post);
});

export const deleteBlogPost = asyncHandler(async (req, res) => {
  const result = await contentService.deleteBlogPost(req.params.id, req.user);
  await logAudit({
    actorId: req.user._id,
    actorName: req.user.name,
    action: "content.manage",
    module: "Storefront",
    details: `Deleted blog article ID: ${req.params.id}`,
  });
  return sendSuccess(res, result);
});



