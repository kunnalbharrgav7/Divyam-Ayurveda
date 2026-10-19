import { ProductVariant } from "../models/ProductVariant.js";
import { toPublicImages } from "../utils/productImages.js";
import { Product } from "../models/Product.js";
import { StoreSettings } from "../models/StoreSettings.js";
import { Quote } from "../models/Quote.js";
import { couponService } from "./coupon.service.js";
import { referralService } from "./referral.service.js";
import { ApiError } from "../utils/apiError.js";
import { toRupees } from "../utils/currency.js";

export class QuoteService {
  /**
   * Determine shipping fee and zone based on destination state and subtotal
   */
  getShippingDetails(destinationState, subtotalPaise, deliveryMethod, settings) {
    const originState = (settings?.shipping?.originState || "Karnataka").toLowerCase();
    const dest = (destinationState || "").toLowerCase();
    const isLocal = dest === originState;

    // Check free shipping threshold
    const freeThresholdPaise = (settings?.shipping?.freeShippingThreshold || 499) * 100;
    const isFreeEligible = subtotalPaise >= freeThresholdPaise;

    let baseFeePaise = (settings?.shipping?.standardShippingFee || 40) * 100;
    let zoneName = "Standard National Delivery";

    if (isLocal) {
      baseFeePaise = 4000; // ₹40
      zoneName = "Zone 1 (Local / Intra-State Karnataka)";
    } else {
      baseFeePaise = 6500; // ₹65
      zoneName = "Zone 2 (Regional / Inter-State)";
    }

    let shippingFeePaise = isFreeEligible ? 0 : baseFeePaise;

    // Express delivery adds express fee
    if (deliveryMethod === "express") {
      const expressExtraPaise = (settings?.shipping?.expressShippingFee || 99) * 100;
      shippingFeePaise += expressExtraPaise;
      zoneName += " [Express Air]";
    }

    return {
      shippingFeePaise,
      zoneName,
      isFreeEligible,
    };
  }

  /**
   * Calculate 12% GST breakdown (CGST/SGST for Karnataka, IGST for other states)
   * Tax is included in retail MRP price per store settings
   */
  calculateTaxBreakdown(taxableBasePaise, destinationState, settings) {
    const originState = (settings?.tax?.originState || "Karnataka").toLowerCase();
    const dest = (destinationState || "").toLowerCase();
    const isIntraState = dest === originState;
    const gstRate = (settings?.tax?.standardGstRate || 12) / 100;

    // Tax included calculation: Total = Base * (1 + rate) => Tax = Total - (Total / (1 + rate))
    const totalTaxPaise = Math.round(taxableBasePaise - taxableBasePaise / (1 + gstRate));

    if (isIntraState) {
      const halfTax = Math.round(totalTaxPaise / 2);
      return {
        totalTaxPaise,
        cgstPaise: halfTax,
        sgstPaise: totalTaxPaise - halfTax,
        igstPaise: 0,
        taxType: "intra_state",
      };
    } else {
      return {
        totalTaxPaise,
        cgstPaise: 0,
        sgstPaise: 0,
        igstPaise: totalTaxPaise,
        taxType: "inter_state",
      };
    }
  }

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

    // Load store settings for rules
    let settings = await StoreSettings.findOne();
    if (!settings) {
      settings = await StoreSettings.create({});
    }

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

    // 4. Calculate Shipping
    const netGoodsPaise = Math.max(0, subtotalPaise - couponDiscountPaise - referralDiscountPaise);
    const shipping = this.getShippingDetails(
      address.state,
      netGoodsPaise,
      deliveryMethod,
      settings
    );

    // 5. Calculate Tax
    const tax = this.calculateTaxBreakdown(netGoodsPaise, address.state, settings);

    // 6. Calculate Final Total
    const totalPaise = netGoodsPaise + shipping.shippingFeePaise;

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
        state: address.state,
        pincode: address.pincode,
      },
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

