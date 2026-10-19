import { Router } from "express";
import * as contentController from "../../controllers/content.controller.js";
import { cacheMiddleware } from "../../middleware/cache.js";
import { optionalAuthenticate } from "../../middleware/auth.js";

const router = Router();

// Store Configuration
router.get("/store/settings/public", cacheMiddleware(300, "settings"), contentController.getPublicSettings);
router.get("/store/homepage", cacheMiddleware(300, "homepage"), contentController.getHomepage);

// Blog
router.get("/blog", cacheMiddleware(180, "content"), contentController.getBlogPosts);
router.get("/blog/:slug", cacheMiddleware(180, "content"), contentController.getBlogPostBySlug);

// Faqs & Testimonials
router.get("/faqs", cacheMiddleware(300, "content"), contentController.getFaqs);
router.get("/testimonials", cacheMiddleware(300, "content"), contentController.getTestimonials);

// Inquiries & Subscriptions
router.post("/contact", contentController.submitContact);
router.post("/support/tickets", optionalAuthenticate, contentController.submitSupportTicket);
router.post("/newsletter/subscriptions", contentController.subscribeNewsletter);

export default router;

