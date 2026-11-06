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

export const getContentPage = asyncHandler(async (req, res) => {
  const page = await contentService.getContentPage(req.params.slug);
  return sendSuccess(res, page);
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
  // A filled-in hidden field means a bot: answer as if it worked, store nothing
  if (req.body.website) return sendSuccess(res, { id: "received", status: "New" }, undefined, 201);
  const enquiry = await contentService.submitContact(req.body, req.user || null);
  return sendSuccess(res, enquiry, undefined, 201);
});

export const listMyEnquiries = asyncHandler(async (req, res) => {
  return sendSuccess(res, await contentService.listMyEnquiries(req.user));
});

export const createMyTicket = asyncHandler(async (req, res) => {
  return sendSuccess(res, await contentService.createTicket(req.user, req.body), undefined, 201);
});

export const listMyTickets = asyncHandler(async (req, res) => {
  return sendSuccess(res, await contentService.listMyTickets(req.user));
});

export const getMyTicket = asyncHandler(async (req, res) => {
  return sendSuccess(res, await contentService.getMyTicket(req.user, req.params.ticketNumber));
});

export const addMyTicketMessage = asyncHandler(async (req, res) => {
  return sendSuccess(res, await contentService.addMyTicketMessage(req.user, req.params.ticketNumber, req.body.message), undefined, 201);
});

