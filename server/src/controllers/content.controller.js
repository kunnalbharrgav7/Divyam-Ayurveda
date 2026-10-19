import { contentService } from "../services/content.service.js";
import { sendSuccess } from "../utils/response.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const getHomepage = asyncHandler(async (req, res) => {
  const config = await contentService.getHomepageConfig();
  return sendSuccess(res, config);
});

export const getPublicSettings = asyncHandler(async (req, res) => {
  const settings = await contentService.getPublicStoreSettings();
  return sendSuccess(res, settings);
});

export const getBlogPosts = asyncHandler(async (req, res) => {
  const posts = await contentService.getBlogPosts();
  return sendSuccess(res, posts);
});

export const getBlogPostBySlug = asyncHandler(async (req, res) => {
  const post = await contentService.getBlogPostBySlug(req.params.slug);
  return sendSuccess(res, post);
});

export const getFaqs = asyncHandler(async (req, res) => {
  const faqs = await contentService.getFaqs();
  return sendSuccess(res, faqs);
});

export const getTestimonials = asyncHandler(async (req, res) => {
  const testimonials = await contentService.getTestimonials();
  return sendSuccess(res, testimonials);
});

export const submitContact = asyncHandler(async (req, res) => {
  const enquiry = await contentService.submitContact(req.body);
  return sendSuccess(res, enquiry, undefined, 201);
});

export const submitSupportTicket = asyncHandler(async (req, res) => {
  const ticket = await contentService.submitSupportTicket(req.body, req.user || null);
  return sendSuccess(res, ticket, undefined, 201);
});

export const subscribeNewsletter = asyncHandler(async (req, res) => {
  const result = await contentService.subscribeNewsletter(req.body.email);
  return sendSuccess(res, result);
});

