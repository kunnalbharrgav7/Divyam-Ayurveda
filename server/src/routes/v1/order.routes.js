import { Router } from "express";
import * as orderController from "../../controllers/order.controller.js";
import * as returnController from "../../controllers/return.controller.js";
import * as cancellationController from "../../controllers/cancellation.controller.js";
import { validate } from "../../middleware/validate.js";
import { orderCreateSchema, trackOrderSchema, claimOrderSchema } from "../../validators/checkout.validator.js";
import { requireIdempotency } from "../../middleware/idempotency.js";
import { optionalAuthenticate, authenticate } from "../../middleware/auth.js";
import { checkoutLimiter, orderLookupLimiter, trackLimiter, claimLimiter } from "../../middleware/rateLimiter.js";

const router = Router();

// Private guest tracking (tracking code + optional order number) and linking a guest order to an account
router.post("/track", trackLimiter, validate(trackOrderSchema), orderController.trackOrder);
router.post("/claim", claimLimiter, authenticate, validate(claimOrderSchema), orderController.claimOrder);

// Order Creation & Retrieval
router.post(
  "/",
  checkoutLimiter,
  optionalAuthenticate,
  requireIdempotency(false),
  validate(orderCreateSchema),
  orderController.createOrder
);
router.get("/:orderNumber", orderLookupLimiter, optionalAuthenticate, orderController.getOrder);

// Customer Order Cancellations & Refunds
router.get("/:orderNumber/cancellation-eligibility", optionalAuthenticate, cancellationController.getEligibility);
router.post("/:orderNumber/cancel", authenticate, cancellationController.requestCancelOrder);
router.post("/:orderNumber/cancel-items", authenticate, cancellationController.requestCancelItems);
router.get("/:orderNumber/cancellation", authenticate, cancellationController.getOrderCancellation);
router.get("/:orderNumber/refund-status", optionalAuthenticate, cancellationController.getOrderRefundStatus);

// Customer Returns
router.post("/:orderNumber/returns", authenticate, returnController.createReturn);

export default router;

