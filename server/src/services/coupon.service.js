import { Coupon } from "../models/Coupon.js";
import { Order } from "../models/Order.js";
import { ApiError } from "../utils/apiError.js";
import { toRupees, toPaise } from "../utils/currency.js";

/**
 * Cart lines as the discount engine sees them: { productId, unitPricePaise, quantity }.
 * Accepts rupee prices from the storefront ({ price }) or paise ({ unitPricePaise }).
 */
export const normalizeCartItems = (items = []) =>
  (Array.isArray(items) ? items : [])
    .map((item) => ({
      productId: item.productId ? String(item.productId) : "",
      unitPricePaise:
        item.unitPricePaise !== undefined ? Math.round(Number(item.unitPricePaise) || 0) : toPaise(Number(item.price) || 0),
      quantity: Math.max(1, Math.floor(Number(item.quantity) || 1)),
    }))
    .filter((item) => item.unitPricePaise > 0);

const sumLines = (items) => items.reduce((sum, item) => sum + item.unitPricePaise * item.quantity, 0);

export class CouponService {
  /**
   * Items of the cart a coupon applies to ("all products" or only the products the admin selected).
   */
  eligibleItems(coupon, items) {
    if (coupon.appliesTo !== "products") return items;
    const allowed = new Set((coupon.applicableProducts || []).map(String));
    return items.filter((item) => allowed.has(item.productId));
  }

  /**
   * Validate coupon eligibility and calculate the discount (in paise).
   * `items` lets product-specific coupons discount only their eligible products; without items the
   * whole `subtotalPaise` is the base (legacy callers), which product-specific coupons cannot use.
   */
  async validateCoupon(code, subtotalPaise, userId = null, categoryIds = [], { items = null } = {}) {
    if (!code || typeof code !== "string") {
      throw ApiError.badRequest("Coupon code is required");
    }

    const coupon = await Coupon.findOne({ code: code.trim().toUpperCase(), isActive: true });
    if (!coupon) {
      throw ApiError.notFound("Invalid or expired coupon code.");
    }

    const now = new Date();
    if (coupon.validFrom && coupon.validFrom > now) {
      throw ApiError.badRequest("This offer has not started yet.");
    }

    if (coupon.validUntil && coupon.validUntil < now) {
      throw ApiError.badRequest("This offer has expired.");
    }

    if (coupon.usageLimitTotal && coupon.usedCount >= coupon.usageLimitTotal) {
      throw ApiError.badRequest("This offer has reached its maximum redemptions.");
    }

    if (userId && coupon.usageLimitPerUser) {
      const userRedemptions = await Order.countDocuments({
        userId,
        "pricing.appliedCoupon": coupon.code,
        status: { $ne: "cancelled" },
      });

      if (userRedemptions >= coupon.usageLimitPerUser) {
        throw ApiError.badRequest("You have already used this offer.");
      }
    }

    // Category restriction check
    if (coupon.applicableCategories && coupon.applicableCategories.length > 0) {
      const matchesCategory = categoryIds.some((catId) => coupon.applicableCategories.includes(catId));
      if (!matchesCategory) {
        throw ApiError.badRequest("This offer is only valid for select botanical categories.");
      }
    }

    // Discount base: eligible products only
    let base;
    if (items) {
      const eligible = this.eligibleItems(coupon, normalizeCartItems(items));
      if (eligible.length === 0) {
        throw ApiError.badRequest("This offer does not apply to any product in your cart.");
      }
      base = sumLines(eligible);
    } else {
      if (coupon.appliesTo === "products") {
        throw ApiError.badRequest("This offer applies to specific products. Add them to your cart to use it.");
      }
      base = subtotalPaise;
    }

    if (coupon.minimumOrderPaise > 0 && base < coupon.minimumOrderPaise) {
      throw ApiError.badRequest(
        `This offer needs ${coupon.appliesTo === "products" ? "eligible products worth" : "a minimum cart value of"} ₹${toRupees(coupon.minimumOrderPaise)}.`
      );
    }

    // Calculate discount amount in paise
    let discountPaise = 0;
    if (coupon.type === "percentage") {
      // Whole rupees: the store shows and charges whole-rupee amounts (e.g. 10% of ₹599 = ₹60, not ₹59.90)
      discountPaise = Math.round((base * coupon.value) / 10000) * 100;
      if (coupon.maximumDiscountPaise > 0) {
        discountPaise = Math.min(discountPaise, coupon.maximumDiscountPaise);
      }
    } else if (coupon.type === "fixed_amount") {
      discountPaise = Math.min(coupon.value, base);
    }

    return {
      code: coupon.code,
      title: coupon.title || "",
      occasion: coupon.occasion || "",
      autoApply: Boolean(coupon.autoApply),
      appliesTo: coupon.appliesTo || "all",
      type: coupon.type,
      value: coupon.value,
      discountPaise,
      discount: toRupees(discountPaise),
      description: coupon.description,
    };
  }

  /**
   * The best currently-running auto-applied offer (no code needed) for this cart, or null.
   */
  async findBestAutoOffer(items, userId = null) {
    const now = new Date();
    const offers = await Coupon.find({
      isActive: true,
      autoApply: true,
      validFrom: { $lte: now },
      $or: [{ validUntil: null }, { validUntil: { $gte: now } }],
    }).lean();

    const subtotalPaise = sumLines(normalizeCartItems(items));
    let best = null;
    for (const offer of offers) {
      try {
        const result = await this.validateCoupon(offer.code, subtotalPaise, userId, [], { items });
        if (result.discountPaise > 0 && (!best || result.discountPaise > best.discountPaise)) best = result;
      } catch (_) {
        // not applicable to this cart / customer: skip
      }
    }
    return best;
  }

  /**
   * What discount applies to this cart: the best auto offer and/or a typed coupon code.
   * Offers do not stack: the customer always gets whichever is larger.
   */
  async previewDiscounts({ items, couponCode = null, userId = null }) {
    const cartItems = normalizeCartItems(items);
    if (cartItems.length === 0) {
      return { subtotal: 0, applied: null, autoOffer: null, coupon: null, couponError: null, note: null };
    }
    const subtotalPaise = sumLines(cartItems);

    const autoOffer = await this.findBestAutoOffer(cartItems, userId);

    let coupon = null;
    let couponError = null;
    if (couponCode && String(couponCode).trim()) {
      try {
        coupon = await this.validateCoupon(String(couponCode), subtotalPaise, userId, [], { items: cartItems });
      } catch (err) {
        couponError = err.message;
      }
    }

    // Coupon wins ties (the customer deliberately typed it)
    let applied = null;
    let source = null;
    if (coupon && (!autoOffer || coupon.discountPaise >= autoOffer.discountPaise)) {
      applied = coupon;
      source = "coupon";
    } else if (autoOffer) {
      applied = autoOffer;
      source = "auto";
    }

    let note = null;
    if (coupon && autoOffer) {
      note =
        source === "coupon"
          ? `Coupon ${coupon.code} gives a bigger saving than "${autoOffer.title || autoOffer.code}", so it was applied. Only one offer applies per order.`
          : `"${autoOffer.title || autoOffer.code}" already gives a bigger saving than ${coupon.code}. Only one offer applies per order.`;
    }

    const summarize = (offer) =>
      offer && {
        code: offer.code,
        title: offer.title,
        occasion: offer.occasion,
        autoApply: offer.autoApply,
        appliesTo: offer.appliesTo,
        discountPaise: offer.discountPaise,
        discount: offer.discount,
      };

    return {
      subtotal: toRupees(subtotalPaise),
      applied: applied && { ...summarize(applied), source },
      autoOffer: summarize(autoOffer),
      coupon: summarize(coupon),
      couponError,
      note,
    };
  }

  /**
   * Offers shown on the storefront Offers page: active, public, started, not expired, not used up.
   */
  async listPublicCoupons() {
    const now = new Date();
    const coupons = await Coupon.find({
      isActive: true,
      isPublic: { $ne: false },
      validFrom: { $lte: now },
      $or: [{ validUntil: null }, { validUntil: { $gte: now } }],
    })
      .sort({ autoApply: -1, createdAt: -1 })
      .lean();

    return coupons
      .filter((c) => !(c.usageLimitTotal && c.usedCount >= c.usageLimitTotal))
      .map((c) => ({
        id: c._id.toString(),
        // Auto-applied offers have no code for customers to type
        code: c.autoApply ? "" : c.code,
        autoApply: Boolean(c.autoApply),
        title: c.title || "",
        occasion: c.occasion || "",
        description: c.description || "",
        type: c.type,
        discountValue: c.type === "fixed_amount" ? toRupees(c.value) : c.value,
        minOrder: toRupees(c.minimumOrderPaise || 0),
        maxDiscount: toRupees(c.maximumDiscountPaise || 0),
        appliesTo: c.appliesTo || "all",
        applicableProductIds: c.appliesTo === "products" ? (c.applicableProducts || []).map(String) : [],
        validUntil: c.validUntil || null,
      }));
  }

  /**
   * Increment usage count on order confirmation
   */
  async recordUsage(code) {
    if (!code) return;
    await Coupon.findOneAndUpdate({ code: code.toUpperCase() }, { $inc: { usedCount: 1 } });
  }
}

export const couponService = new CouponService();
