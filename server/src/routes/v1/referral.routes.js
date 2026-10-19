import { Router } from "express";
import * as referralController from "../../controllers/referral.controller.js";
import { authenticate, optionalAuthenticate } from "../../middleware/auth.js";
import { referralLimiter } from "../../middleware/rateLimiter.js";

const router = Router();

router.get("/me", authenticate, referralController.getMyReferral);
router.get("/wallet", authenticate, referralController.getMyWallet);
router.get("/code/:code", referralLimiter, referralController.lookupCode);
router.post("/preview", referralLimiter, optionalAuthenticate, referralController.previewDiscount);

export default router;
