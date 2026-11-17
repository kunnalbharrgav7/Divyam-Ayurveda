import { cancellationService } from "../services/cancellation.service.js";
import { settingsService } from "../services/settings.service.js";
import { Refund } from "../models/Refund.js";
import { Order } from "../models/Order.js";
import { sendSuccess } from "../utils/response.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { ApiError } from "../utils/apiError.js";

// Customer pre-flight eligibility check
export const getEligibility = asyncHandler(async (req, res) => {
  const result = await cancellationService.checkEligibility(
    req.params.orderNumber,
    req.user || null,
    false
  );
  return sendSuccess(res, result);
});

// Full order cancellation by customer
export const requestCancelOrder = asyncHandler(async (req, res) => {
  const { reason, customerNote } = req.body || {};
  const result = await cancellationService.requestCancellation(
    req.params.orderNumber,
    { cancellationType: "full", reason, customerNote },
    req.user || null,
    false
  );
  return sendSuccess(res, result, "Cancellation request processed successfully.", 201);
});

// Partial item cancellation by customer
export const requestCancelItems = asyncHandler(async (req, res) => {
  const { reason, customerNote, items } = req.body || {};
  const result = await cancellationService.requestCancellation(
    req.params.orderNumber,
    { cancellationType: "partial", reason, customerNote, items },
    req.user || null,
    false
  );
  return sendSuccess(res, result, "Selected items cancellation processed successfully.", 201);
});

// Get cancellation request for an order
export const getOrderCancellation = asyncHandler(async (req, res) => {
  const cancellation = await cancellationService.getCancellation(req.params.orderNumber);
  return sendSuccess(res, cancellation);
});

// List signed-in customer's cancellations
export const listMyCancellations = asyncHandler(async (req, res) => {
  const list = await cancellationService.listUserCancellations(req.user._id);
  return sendSuccess(res, list);
});

// Customer refund status tracking for an order
export const getOrderRefundStatus = asyncHandler(async (req, res) => {
  const order = await Order.findOne({ orderNumber: req.params.orderNumber });
  if (!order) throw ApiError.notFound("Order not found.");

  if (req.user && order.userId && order.userId.toString() !== req.user._id.toString()) {
    throw ApiError.forbidden("You do not have access to this order.");
  }

  const refunds = await Refund.find({ orderNumber: req.params.orderNumber }).sort({ createdAt: -1 });

  return sendSuccess(res, {
    orderNumber: order.orderNumber,
    paymentStatus: order.paymentStatus,
    refundStatus: order.refundStatus,
    refunded: order.toJSON().refunded,
    refunds: refunds.map((r) => r.toJSON()),
  });
});

// ================= ADMIN CONTROLLERS =================

// List cancellations for admin dashboard
export const listAdminCancellations = asyncHandler(async (req, res) => {
  const result = await cancellationService.listAdminCancellations(req.query);
  return sendSuccess(res, result);
});

// Get single cancellation details for admin
export const getAdminCancellation = asyncHandler(async (req, res) => {
  const result = await cancellationService.getCancellation(req.params.id);
  return sendSuccess(res, result);
});

// Approve cancellation request
export const approveCancellation = asyncHandler(async (req, res) => {
  const result = await cancellationService.approveCancellation(req.params.id, req.user);
  return sendSuccess(res, result, "Cancellation request approved and processed.");
});

// Reject cancellation request
export const rejectCancellation = asyncHandler(async (req, res) => {
  const { reason } = req.body || {};
  const result = await cancellationService.rejectCancellation(req.params.id, reason, req.user);
  return sendSuccess(res, result, "Cancellation request rejected.");
});

// List refunds for admin
export const listAdminRefunds = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, status = "all", search = "" } = req.query;
  const filter = {};
  if (status && status !== "all") filter.status = status;
  if (search && search.trim()) {
    const q = search.trim();
    filter.$or = [
      { orderNumber: new RegExp(q, "i") },
      { refundId: new RegExp(q, "i") },
      { providerRefundId: new RegExp(q, "i") },
    ];
  }
  const skip = (Math.max(1, Number(page)) - 1) * Math.max(1, Number(limit));
  const [refunds, total] = await Promise.all([
    Refund.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
    Refund.countDocuments(filter),
  ]);

  return sendSuccess(res, {
    refunds: refunds.map((r) => r.toJSON()),
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / Number(limit)) || 1,
    },
  });
});

// Retry a failed refund
export const retryAdminRefund = asyncHandler(async (req, res) => {
  const result = await cancellationService.retryRefund(req.params.id, req.user);
  return sendSuccess(res, result, "Refund retry initiated successfully.");
});

// Get cancellation policy settings
export const getCancellationSettings = asyncHandler(async (req, res) => {
  const settings = await settingsService.get();
  return sendSuccess(res, settings.cancellationPolicy || {});
});

// Update cancellation policy settings
export const updateCancellationSettings = asyncHandler(async (req, res) => {
  const result = await settingsService.update({ cancellationPolicy: req.body });
  return sendSuccess(res, result.settings.cancellationPolicy, "Cancellation policy settings updated.");
});
