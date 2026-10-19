import { Router } from "express";
import * as paymentController from "../../controllers/payment.controller.js";
import { requireIdempotency } from "../../middleware/idempotency.js";
import { optionalAuthenticate } from "../../middleware/auth.js";

const router = Router();

router.post(
  "/cashfree/session",
  optionalAuthenticate,
  requireIdempotency(false),
  paymentController.createCashfreeSession
);
router.get(
  "/cashfree/orders/:orderNumber/status",
  optionalAuthenticate,
  paymentController.getPaymentStatus
);

export default router;

