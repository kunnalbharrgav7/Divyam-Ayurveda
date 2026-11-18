import { ProductVariant } from "../models/ProductVariant.js";
import { toPublicImages } from "../utils/productImages.js";
import { Product } from "../models/Product.js";
import { settingsService } from "./settings.service.js";
import { pricingService, toOrderPricing, toOrderLine } from "./pricing.service.js";
import { canonicalState } from "../utils/indianStates.js";
import { Quote } from "../models/Quote.js";
import { couponService } from "./coupon.service.js";
import { referralService } from "./referral.service.js";
import { ApiError } from "../utils/apiError.js";
import { toRupees } from "../utils/currency.js";

export class QuoteService {
  /**
   * Calculate server-authoritative checkout quote
   */
  async calculateQuote({
    items,
    address,
    deliveryMethod = "standard",
    couponCode = null,
    referralCode = null,
    userId = null,
    guestEmail = null,
  }) {
    if (!Array.isArray(items) || items.length === 0) {
      throw ApiError.badRequest("At least one cart item is required for checkout calculation.");
    }

    if (!address || !address.state || !address.pincode) {
      throw ApiError.badRequest("Complete delivery address including state and PIN code is required.");
    }
    const stateName = canonicalState(address.state) || address.state;
    await pricingService.assertPinMatchesState({ state: stateName, pincode: address.pincode });

    // Load store settings for rules
    const settings = await settingsService.get();

    // 1. Reload all variants from database to ensure price & stock integrity
    const variantIds = items.map((it) => it.variantId);
    const variants = await ProductVariant.find({
      _id: { $in: variantIds },
      isActive: true,
    }).populate("productId");

    if (variants.length !== items.length) {
      throw ApiError.badRequest("One or more selected items or variants are no longer available.");
    }

    let subtotalPaise = 0;
    const quoteItems = [];
    const categoryIds = [];

    for (const requestedItem of items) {
      const variant = variants.find((v) => v._id.toString() === requestedItem.variantId.toString());
      if (!variant) {
        throw ApiError.notFound(`Variant ${requestedItem.variantId} not found.`);
      }

      const availableStock = Math.max(0, (variant.stockOnHand || 0) - (variant.reservedStock || 0));
      if (requestedItem.quantity > availableStock) {
        throw ApiError.conflict(
          `Insufficient stock for "${variant.productId.name} (${variant.label})". Available: ${availableStock}.`
        );
      }

      const lineTotalPaise = variant.pricePaise * requestedItem.quantity;
      subtotalPaise += lineTotalPaise;

      const p = variant.productId;
      if (p.categoryId) categoryIds.push(p.categoryId);

      quoteItems.push({
        variantId: variant._id,
        productId: p._id,
        sku: variant.sku,
        name: p.name,
        label: variant.label,
        image: toPublicImages(p)[0] || "",
        unitPricePaise: variant.pricePaise,
        quantity: requestedItem.quantity,
        lineTotalPaise,
        weightGrams: variant.weightGrams || 250,
        mrpUnitPaise: variant.compareAtPricePaise > variant.pricePaise ? variant.compareAtPricePaise : variant.pricePaise,
        gstRate: p.gstRate ?? null,
        hsnCode: p.hsnCode || "",
      });
    }

    // 2. Validate & apply Coupon Discount if provided
    let couponDiscountPaise = 0;
    let appliedCoupon = null;
    if (couponCode && couponCode.trim()) {
      try {
        const couponResult = await couponService.validateCoupon(
          couponCode,
          subtotalPaise,
          userId,
          categoryIds
        );
        couponDiscountPaise = couponResult.discountPaise;
        appliedCoupon = couponResult.code;
      } catch (err) {
        throw ApiError.badRequest(err.message);
      }
    }

    // 3. Validate & apply Referral Discount if provided
    let referralDiscountPaise = 0;
    let appliedReferralCode = null;
    if (referralCode && referralCode.trim()) {
      const targetEmail = address.email || guestEmail;
      try {
        const referralResult = await referralService.validateReferralCode(
          referralCode,
          subtotalPaise,
          targetEmail,
          userId
        );
        referralDiscountPaise = referralResult.discountPaise;
        appliedReferralCode = referralResult.code;
      } catch (err) {
        throw ApiError.badRequest(err.message);
      }
    }

    // 4-6. Delivery, GST and the total, all from the one pricing engine
    const breakdown = await pricingService.price({
      settings,
      lines: quoteItems.map((it) => ({
        productId: it.productId,
        variantId: it.variantId,
        name: it.name,
        size: it.label,
        quantity: it.quantity,
        unitPricePaise: it.unitPricePaise,
        mrpUnitPaise: it.mrpUnitPaise,
        gstRate: it.gstRate,
        hsnCode: it.hsnCode,
      })),
      address: { state: stateName, pincode: address.pincode },
      deliveryMethod,
      offerDiscountPaise: couponDiscountPaise,
      referralDiscountPaise,
    });
    const shipping = { shippingFeePaise: breakdown.shipping.totalPaise, zoneName: breakdown.zone.name };
    const tax = {
      totalTaxPaise: breakdown.tax.totalPaise,
      cgstPaise: breakdown.tax.cgstPaise,
      sgstPaise: breakdown.tax.sgstPaise,
      igstPaise: breakdown.tax.igstPaise,
      taxType: breakdown.tax.type,
    };
    const totalPaise = breakdown.totalPaise;
    const pricingSnapshot = {
      pricing: toOrderPricing(breakdown, { appliedCoupon, referralCode: appliedReferralCode }),
      lines: breakdown.lines.map(toOrderLine),
    };

    // 7. Store expiring quote in DB
    const quote = await Quote.create({
      userId: userId || null,
      guestEmail: address.email || guestEmail || null,
      items: quoteItems,
      deliveryMethod,
      shippingAddress: {
        fullName: address.fullName,
        phone: address.phone,
        line1: address.line1 || address.street || "",
        line2: address.line2 || "",
        city: address.city,
        state: breakdown.destinationState,
        pincode: address.pincode,
      },
      pricingSnapshot,
      subtotalPaise,
      couponDiscountPaise,
      appliedCoupon,
      referralDiscountPaise,
      appliedReferralCode,
      shippingPaise: shipping.shippingFeePaise,
      taxPaise: tax.totalTaxPaise,
      cgstPaise: tax.cgstPaise,
      sgstPaise: tax.sgstPaise,
      igstPaise: tax.igstPaise,
      taxType: tax.taxType,
      totalPaise,
      zoneName: shipping.zoneName,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000), // 15 min expiration
    });

    return quote.toJSON();
  }
}

export const quoteService = new QuoteService();

