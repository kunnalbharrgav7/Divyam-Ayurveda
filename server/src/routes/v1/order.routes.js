import { Router } from "express";
import * as orderController from "../../controllers/order.controller.js";
import * as returnController from "../../controllers/return.controller.js";
import { validate } from "../../middleware/validate.js";
import { orderCreateSchema } from "../../validators/checkout.validator.js";
import { requireIdempotency } from "../../middleware/idempotency.js";
import { optionalAuthenticate, authenticate } from "../../middleware/auth.js";

const router = Router();

// Guest and Customer Tracking
router.get("/track", orderController.trackOrder);

// Order Creation & Retrieval
router.post(
  "/",
  optionalAuthenticate,
  requireIdempotency(false),
  validate(orderCreateSchema),
  orderController.createOrder
);
router.get("/:orderNumber", optionalAuthenticate, orderController.getOrder);

// Customer Returns
router.post("/:orderNumber/returns", authenticate, returnController.createReturn);

export default router;

