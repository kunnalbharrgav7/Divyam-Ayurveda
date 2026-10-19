import { Router } from "express";
import * as authController from "../../controllers/auth.controller.js";
import { validate } from "../../middleware/validate.js";
import { registerSchema, loginSchema, refreshSchema } from "../../validators/auth.validator.js";
import { authLimiter } from "../../middleware/rateLimiter.js";
import { authenticate, optionalAuthenticate } from "../../middleware/auth.js";

const router = Router();

router.post("/register", authLimiter, validate(registerSchema), authController.register);
router.post("/login", authLimiter, validate(loginSchema), authController.login);
router.post("/staff/login", authLimiter, validate(loginSchema), authController.staffLogin);
router.post("/refresh", validate(refreshSchema), authController.refreshToken);
router.post("/logout", optionalAuthenticate, authController.logout);

export default router;

