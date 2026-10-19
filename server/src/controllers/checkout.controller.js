import { quoteService } from "../services/quote.service.js";
import { couponService } from "../services/coupon.service.js";
import { shipmentService } from "../services/shipment.service.js";
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

