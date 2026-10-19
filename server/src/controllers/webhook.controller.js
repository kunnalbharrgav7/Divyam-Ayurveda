import { paymentService } from "../services/payment.service.js";
import { shipmentService } from "../services/shipment.service.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const handleCashfreeWebhook = asyncHandler(async (req, res) => {
  // Use rawBody captured by raw body middleware
  const rawBody = req.rawBody || JSON.stringify(req.body);
  const result = await paymentService.handleCashfreeWebhook({
    rawBody,
    headers: req.headers,
    payload: req.body,
  });

  return res.status(200).json({ success: true, result });
});

export const handleShiprocketWebhook = asyncHandler(async (req, res) => {
  const result = await shipmentService.handleShiprocketWebhook(req);
  return res.status(200).json({ success: true, result });
});

