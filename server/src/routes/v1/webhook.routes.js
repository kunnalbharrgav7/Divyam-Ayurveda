import { Router } from "express";
import * as webhookController from "../../controllers/webhook.controller.js";

const router = Router();

router.post("/cashfree", webhookController.handleCashfreeWebhook);
router.post("/shiprocket", webhookController.handleShiprocketWebhook);
// Shiprocket is reported to refuse webhook URLs that contain its own brand words, so register this neutral path
// in the Shiprocket panel instead of /shiprocket.
router.post("/courier", webhookController.handleShiprocketWebhook);

export default router;

