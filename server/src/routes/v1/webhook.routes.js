import { Router } from "express";
import * as webhookController from "../../controllers/webhook.controller.js";

const router = Router();

router.post("/cashfree", webhookController.handleCashfreeWebhook);
router.post("/shiprocket", webhookController.handleShiprocketWebhook);

export default router;

