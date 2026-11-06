import { Router } from "express";
import * as contentController from "../../controllers/content.controller.js";
import { optionalAuthenticate } from "../../middleware/auth.js";
import { validate } from "../../middleware/validate.js";
import { contactLimiter } from "../../middleware/rateLimiter.js";
import { contactSchema } from "../../validators/support.validator.js";

const router = Router();

// Store Configuration
router.get("/store/settings/public", contentController.getPublicSettings);
router.get("/store/homepage", contentController.getHomepage);

// Blog
router.get("/blog", contentController.getBlogPosts);
router.get("/blog/:slug", contentController.getBlogPostBySlug);

// Faqs & Testimonials
router.get("/faqs", contentController.getFaqs);
router.get("/content-pages/:slug", contentController.getContentPage);
router.get("/testimonials", contentController.getTestimonials);

// Contact form (anyone; a signed-in customer's message is linked to their account)
router.post("/contact", contactLimiter, optionalAuthenticate, validate(contactSchema), contentController.submitContact);

export default router;

