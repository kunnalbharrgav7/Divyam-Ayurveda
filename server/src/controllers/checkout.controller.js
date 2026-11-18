import { quoteService } from "../services/quote.service.js";
import { couponService } from "../services/coupon.service.js";
import { shipmentService } from "../services/shipment.service.js";
import { pincodeService } from "../services/pincode.service.js";
import { pricingService, priceBasket, toClientView } from "../services/pricing.service.js";
import { settingsService } from "../services/settings.service.js";
import { referralService } from "../services/referral.service.js";
import { canonicalState } from "../utils/indianStates.js";
import { isValidPin } from "../utils/shippingRules.js";
import { ApiError } from "../utils/apiError.js";
import { sendSuccess } from "../utils/response.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { toPaise } from "../utils/currency.js";

export const getQuote = asyncHandler(async (req, res) => {
  const quote = await quoteService.calculateQuote({
    items: req.body.items,
    address: req.body.address,
    deliveryMethod: req.body.deliveryMethod || "standard",
    couponCode: req.body.couponCode || null,
    referralCode: req.body.referralCode || null,
    userId: req.user ? req.user._id : null,
    guestEmail: req.body.address?.email || null,
  });

  return sendSuccess(res, quote);
});

export const validateCoupon = asyncHandler(async (req, res) => {
  const { code, subtotal } = req.body;
  const subtotalPaise = subtotal !== undefined ? toPaise(Number(subtotal)) : 100000;
  const userId = req.user ? req.user._id : null;

  const result = await couponService.validateCoupon(code, subtotalPaise, userId, [], { items: req.body.items || null });
  return sendSuccess(res, result);
});

// Which offer (auto-applied or typed coupon) applies to this cart, and how much it takes off
export const previewDiscounts = asyncHandler(async (req, res) => {
  const result = await couponService.previewDiscounts({
    items: req.body.items,
    couponCode: req.body.couponCode,
    userId: req.user ? req.user._id : null,
  });
  return sendSuccess(res, result);
});

export const listPublicCoupons = asyncHandler(async (req, res) => {
  const coupons = await couponService.listPublicCoupons();
  return sendSuccess(res, coupons);
});

export const checkServiceability = asyncHandler(async (req, res) => {
  const { deliveryPincode, weightGrams, cod } = req.query;
  const result = await shipmentService.checkServiceability({
    deliveryPincode,
    weightGrams: weightGrams ? Number(weightGrams) : 250,
    cod: cod === "true" || cod === true || cod === "1",
  });

  return sendSuccess(res, result);
});


// City / state for a PIN code, to pre-fill the checkout address (never blocks checkout)
export const lookupPincode = asyncHandler(async (req, res) => {
  res.set("Cache-Control", "public, max-age=86400");
  return sendSuccess(res, await pincodeService.lookup(req.params.pincode));
});

// What the basket costs for this address and delivery choice. The storefront displays exactly this; checkout,
// payment, the saved order and invoices use the same engine, so the numbers cannot drift apart.
const ADDRESS_PROBLEMS = new Set(["UNKNOWN_STATE", "ZONE_DISABLED", "NO_ZONE"]);

export const priceCheckout = asyncHandler(async (req, res) => {
  res.set("Cache-Control", "no-store");
  const { items, address, deliveryMethod, couponCode, referralCode } = req.body;
  const settingsDoc = await settingsService.get();
  const settings = settingsDoc.toObject();
  const user = req.user || null;

  const lines = await pricingService.resolveLines(items);
  const goodsPaise = lines.reduce((sum, l) => sum + l.unitPricePaise * l.quantity, 0);
  const state = canonicalState(address.state) || address.state;
  const pincode = address.pincode && isValidPin(address.pincode) ? address.pincode : null;

  // Offer / coupon: verified here, the same way order placement verifies it
  let offerDiscountPaise = 0;
  let offer = null;
  if (couponCode && couponCode.trim()) {
    try {
      const verified = await couponService.validateCoupon(couponCode, goodsPaise, user?._id || null, [], {
        items: lines.map((l) => ({ productId: l.productId, unitPricePaise: l.unitPricePaise, quantity: l.quantity })),
        guestContact: user?._id ? null : { email: address.email, phone: address.phone },
      });
      offerDiscountPaise = verified.discountPaise;
      offer = { code: verified.code, discount: verified.discountPaise / 100 };
    } catch (err) {
      offer = { code: couponCode.trim().toUpperCase(), discount: 0, error: err.message };
    }
  }

  // Referral: a first-order discount for signed-in customers, never combined with an offer
  let referralDiscountPaise = 0;
  let referral = null;
  if (referralCode && referralCode.trim()) {
    if (offerDiscountPaise > 0) {
      referral = { code: referralCode.trim().toUpperCase(), discount: 0, reason: "A referral code cannot be combined with a coupon or offer." };
    } else if (!user?._id) {
      referral = { code: referralCode.trim().toUpperCase(), discount: 0, reason: "Sign in or create an account to use your friend's referral code." };
    } else {
      try {
        const r = await referralService.computeDiscount({ code: referralCode, user, goodsPaise });
        referralDiscountPaise = r.discountPaise;
        referral = { code: r.code, discount: r.discountPaise / 100 };
      } catch (err) {
        referral = { code: referralCode.trim().toUpperCase(), discount: 0, reason: err.message };
      }
    }
  }

  const base = { settings, lines, address: { state, pincode }, offerDiscountPaise, referralDiscountPaise };
  const express = await pricingService.expressInfo({ settings, pincode });
  const requestedExpress = deliveryMethod === "express";
  const method = requestedExpress && express.available ? "express" : "standard";

  let addressIssue = null;
  if (pincode) {
    try {
      await pricingService.assertPinMatchesState({ state, pincode });
    } catch (err) {
      addressIssue = { field: "pincode", message: err.message };
    }
  }

  let chosen;
  let standardOption;
  let expressOption;
  try {
    chosen = priceBasket({ ...base, deliveryMethod: method, expressAvailable: express.available });
    standardOption = method === "standard" ? chosen : priceBasket({ ...base, deliveryMethod: "standard" });
    // Shown even when express is unavailable here, so the customer sees what it would cost
    expressOption = express.enabled ? priceBasket({ ...base, deliveryMethod: "express", expressAvailable: true }) : null;
  } catch (err) {
    if (err instanceof ApiError && ADDRESS_PROBLEMS.has(err.details?.code)) {
      return sendSuccess(res, { deliverable: false, message: err.message, code: err.details.code, addressIssue });
    }
    throw err;
  }

  const delivery = await pricingService.deliveryInfo({ settings, pincode });
  const rupees = (paise) => paise / 100;
  return sendSuccess(res, {
    deliverable: delivery.serviceable !== false,
    message: delivery.serviceable === false ? `Sorry, we can't deliver to PIN code ${pincode} yet.` : "",
    delivery,
    addressIssue,
    pricing: toClientView(chosen),
    options: {
      selected: method,
      standard: { total: rupees(standardOption.shipping.totalPaise), estimate: standardOption.shipping.estimate, free: standardOption.shipping.freeApplied },
      express: {
        enabled: express.enabled,
        available: express.available,
        reason: express.reason,
        total: expressOption ? rupees(expressOption.shipping.totalPaise) : null,
        surcharge: expressOption ? rupees(expressOption.shipping.expressSurchargePaise) : null,
        estimate: expressOption ? expressOption.shipping.estimate : null,
      },
    },
    expressAdjusted: requestedExpress && method === "standard" ? express.reason || "Express delivery isn't available for this address." : "",
    offer,
    referral,
  });
});
