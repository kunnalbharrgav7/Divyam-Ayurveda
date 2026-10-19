import { Router } from "express";
import { authenticate } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import * as authController from "../../controllers/auth.controller.js";
import * as orderController from "../../controllers/order.controller.js";
import * as cartController from "../../controllers/cart.controller.js";
import * as returnController from "../../controllers/return.controller.js";
import { addressSchema, changePasswordSchema } from "../../validators/auth.validator.js";

const router = Router();

router.use(authenticate);

// Profile
router.get("/", authController.getProfile);
router.patch("/", authController.updateProfile);
router.patch("/password", validate(changePasswordSchema), authController.changePassword);

// Addresses
router.get("/addresses", authController.getAddresses);
router.post("/addresses", validate(addressSchema), authController.addAddress);
router.patch("/addresses/:addressId", authController.updateAddress);
router.delete("/addresses/:addressId", authController.deleteAddress);
router.patch("/addresses/:addressId/default", authController.setDefaultAddress);

// Customer Reviews
router.get("/reviews", orderController.getMyReviews);

// Returns, refunds & store credit
router.get("/return-options", returnController.getReturnOptions);
router.get("/returns/eligibility", returnController.getEligibilityMap);
router.get("/returns", returnController.listMyReturns);
router.get("/returns/:id", returnController.getMyReturn);
router.post("/returns/:id/cancel", returnController.cancelMyReturn);
router.get("/orders/:orderNumber/return-eligibility", returnController.getEligibility);
router.post("/orders/:orderNumber/returns", returnController.createReturn);
router.get("/store-credit", returnController.getStoreCredit);

// Customer Orders
router.get("/orders", orderController.getMyOrders);
router.get("/orders/:orderNumber", orderController.getMyOrder);

// Customer Cart
router.get("/cart", cartController.getCart);
router.post("/cart/items", cartController.addItem);
router.patch("/cart/items/:variantId", cartController.updateItem);
router.delete("/cart/items/:variantId", cartController.removeItem);
router.delete("/cart", cartController.clearCart);

export default router;

