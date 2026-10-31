import { Router } from "express";
import * as paymentController from "../../controllers/payment.controller.js";
import { requireIdempotency } from "../../middleware/idempotency.js";
import { optionalAuthenticate } from "../../middleware/auth.js";
import { checkoutLimiter } from "../../middleware/rateLimiter.js";

const router = Router();

router.use(checkoutLimiter);

router.post(
  "/cashfree/session",
  optionalAuthenticate,
  requireIdempotency(false),
  paymentController.createCashfreeSession
);
router.post(
  "/cashfree/verify",
  optionalAuthenticate,
  paymentController.verifyPayment
);
router.get(
  "/cashfree/orders/:orderNumber/status",
  optionalAuthenticate,
  paymentController.getPaymentStatus
);

export default router;

