import { paymentService } from "../services/payment.service.js";
import { sendSuccess } from "../utils/response.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const createCashfreeSession = asyncHandler(async (req, res) => {
  const result = await paymentService.createCashfreeSession({
    quoteId: req.body.quoteId,
    orderNumber: req.body.orderNumber,
    returnUrl: req.body.returnUrl,
    user: req.user || null,
    idempotencyKey: req.header("Idempotency-Key") || null,
  });

  return sendSuccess(res, result);
});

export const getPaymentStatus = asyncHandler(async (req, res) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  const result = await paymentService.refreshPaymentStatus(req.params.orderNumber);
  return sendSuccess(res, result);
});

export const verifyPayment = asyncHandler(async (req, res) => {
  res.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  const orderNumber = req.body.orderNumber || req.params.orderNumber || req.query.orderNumber;
  const result = await paymentService.refreshPaymentStatus(orderNumber);
  return sendSuccess(res, result);
});

