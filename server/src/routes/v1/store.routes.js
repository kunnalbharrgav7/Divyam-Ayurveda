import { Router } from "express";
import * as contentController from "../../controllers/content.controller.js";
import { optionalAuthenticate } from "../../middleware/auth.js";

const router = Router();

// Store Configuration
router.get("/store/settings/public", contentController.getPublicSettings);
router.get("/store/homepage", contentController.getHomepage);

// Blog
router.get("/blog", contentController.getBlogPosts);
router.get("/blog/:slug", contentController.getBlogPostBySlug);

// Faqs & Testimonials
router.get("/faqs", contentController.getFaqs);
router.get("/testimonials", contentController.getTestimonials);

// Inquiries & Subscriptions
router.post("/contact", contentController.submitContact);
router.post("/support/tickets", optionalAuthenticate, contentController.submitSupportTicket);
router.post("/newsletter/subscriptions", contentController.subscribeNewsletter);

export default router;

