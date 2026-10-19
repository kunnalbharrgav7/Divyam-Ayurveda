import { Router } from "express";
import authRoutes from "./auth.routes.js";
import meRoutes from "./me.routes.js";
import catalogRoutes from "./catalog.routes.js";
import storeRoutes from "./store.routes.js";
import checkoutRoutes from "./checkout.routes.js";
import orderRoutes from "./order.routes.js";
import paymentRoutes from "./payment.routes.js";
import referralRoutes from "./referral.routes.js";
import webhookRoutes from "./webhook.routes.js";
import adminRoutes from "./admin.routes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/me", meRoutes);
router.use("/", catalogRoutes);
router.use("/", storeRoutes);
router.use("/checkout", checkoutRoutes);
router.use("/orders", orderRoutes);
router.use("/payments", paymentRoutes);
router.use("/referrals", referralRoutes);
router.use("/webhooks", webhookRoutes);
router.use("/admin", adminRoutes);

export default router;

