import { Router } from "express";
import * as checkoutController from "../../controllers/checkout.controller.js";
import { validate } from "../../middleware/validate.js";
import { quoteSchema, couponValidateSchema, discountPreviewSchema } from "../../validators/checkout.validator.js";
import { optionalAuthenticate } from "../../middleware/auth.js";

const router = Router();

router.post("/quote", optionalAuthenticate, validate(quoteSchema), checkoutController.getQuote);
router.get("/coupons/public", checkoutController.listPublicCoupons);
router.post("/discounts", optionalAuthenticate, validate(discountPreviewSchema), checkoutController.previewDiscounts);
router.post("/coupons/validate", optionalAuthenticate, validate(couponValidateSchema), checkoutController.validateCoupon);
router.get("/shipping/serviceability", checkoutController.checkServiceability);

export default router;

