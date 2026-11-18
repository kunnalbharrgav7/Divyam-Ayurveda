import mongoose from "mongoose";
import { orderService } from "../services/order.service.js";
import { Product } from "../models/Product.js";
import { Review } from "../models/Review.js";
import { ReturnRequest } from "../models/ReturnRequest.js";
import { Order } from "../models/Order.js";
import { sendSuccess } from "../utils/response.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";

// The visitor's address as seen by Meta: the first X-Forwarded-For hop (Render sits in front of the app).
// Used only for ad matching, never for security decisions.
const clientIpOf = (req) => String(req.headers["x-forwarded-for"] || "").split(",")[0].trim() || req.ip || "";

export const createOrder = asyncHandler(async (req, res) => {
  // Guest and signed-in checkout share this one path; ownership comes only from the session, never the body
  const { user: _ignoredUser, userId: _ignoredUserId, ...body } = req.body || {};
  const order = await orderService.createOrder({
    ...body,
    quoteId: body.quoteId,
    paymentMethod: body.paymentMethod || "cod",
    notes: body.notes || "",
    user: req.user || null,
    requestMeta: { ip: clientIpOf(req), userAgent: req.get("user-agent") || "" },
  });

  res.set("Cache-Control", "no-store, private"); // carries one-time guest credentials
  return sendSuccess(res, order, undefined, 201);
});

export const getOrder = asyncHandler(async (req, res) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  const order = await orderService.getOrder(req.params.orderNumber, req.user || null);
  return sendSuccess(res, order);
});

export const getMyOrder = asyncHandler(async (req, res) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  return sendSuccess(res, await orderService.getOwnedOrder(req.params.orderNumber, req.user));
});

// Invoice data for an order (owner or staff)
export const getInvoice = asyncHandler(async (req, res) => {
  res.set("Cache-Control", "no-store, private");
  return sendSuccess(res, await orderService.getInvoice(req.params.orderNumber, req.user));
});

export const getMyOrders = asyncHandler(async (req, res) => {
  const orders = await orderService.getCustomerOrders(req.user._id);
  return sendSuccess(res, orders);
});

// Private tracking for guest orders (code in the body, so it stays out of URLs and access logs)
export const trackOrder = asyncHandler(async (req, res) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  const order = await orderService.trackByCode({ code: req.body.code, orderNumber: req.body.orderNumber || null });
  return sendSuccess(res, order);
});

// Link a guest order to the signed-in account (one-time claim token)
export const claimOrder = asyncHandler(async (req, res) => {
  const order = await orderService.claimGuestOrder({ claimToken: req.body.claimToken, user: req.user });
  return sendSuccess(res, order);
});

export const submitReview = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const { rating, title, comment } = req.body;

  if (!mongoose.Types.ObjectId.isValid(productId) || !(await Product.exists({ _id: productId }))) {
    throw ApiError.notFound("Product not found.");
  }
  const stars = Number(rating);
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) {
    throw ApiError.badRequest("Please choose a rating between 1 and 5 stars.");
  }
  if (!String(comment || "").trim()) {
    throw ApiError.badRequest("Please write a short review.");
  }
  if (await Review.exists({ productId, userId: req.user._id })) {
    throw ApiError.conflict("You have already reviewed this product.");
  }

  // Verified purchase: the customer has an order containing this product
  const purchasedOrder = await Order.findOne({
    userId: req.user._id,
    "items.productId": productId,
    status: { $in: ["delivered", "shipped", "dispatched", "out_for_delivery", "confirmed"] },
  });

  const review = await Review.create({
    productId,
    userId: req.user._id,
    userName: req.user.name,
    orderId: purchasedOrder ? purchasedOrder._id : null,
    rating: stars,
    title: String(title || "").trim() || "Remarkable Botanical Quality",
    comment: String(comment).trim(),
    verifiedPurchase: Boolean(purchasedOrder),
    status: "pending", // appears on the storefront once an admin approves it
  });

  return sendSuccess(res, review.toJSON(), undefined, 201);
});

// The signed-in customer's own reviews (including ones still awaiting moderation)
export const getMyReviews = asyncHandler(async (req, res) => {
  const filter = { userId: req.user._id };
  if (req.query.productId && mongoose.Types.ObjectId.isValid(req.query.productId)) {
    filter.productId = req.query.productId;
  }
  const reviews = await Review.find(filter).sort({ createdAt: -1 });
  return sendSuccess(res, reviews.map((r) => r.toJSON()));
});
