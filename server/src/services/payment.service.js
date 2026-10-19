import { Order } from "../models/Order.js";
import { Payment } from "../models/Payment.js";
import { WebhookEvent } from "../models/WebhookEvent.js";
import { Quote } from "../models/Quote.js";
import { cashfree } from "../integrations/cashfree/cashfree.adapter.js";
import { orderService } from "./order.service.js";
import { inventoryService } from "./inventory.service.js";
import { couponService } from "./coupon.service.js";
import { ORDER_STATUS } from "../constants/orderStatus.js";
import { PAYMENT_STATUS } from "../constants/paymentStatus.js";
import { sha256 } from "../utils/crypto.js";
import { ApiError } from "../utils/apiError.js";
import { logger } from "../config/logger.js";

export class PaymentService {
  /**
   * Create or reuse a pending internal order and create a Cashfree PG session
   */
  async createCashfreeSession({ quoteId, returnUrl = null, user = null, idempotencyKey = null }) {
    const quote = await Quote.findById(quoteId);
    if (!quote) throw ApiError.badRequest("Invalid or expired checkout quote.");

    // Check if an order already exists for this quote to prevent duplicates
    let order = await Order.findOne({ quoteId: quote._id, status: ORDER_STATUS.PENDING_PAYMENT });

    if (!order) {
      // Create pending order and reserve stock
      order = await orderService.createOrder({
        quoteId: quote._id,
        paymentMethod: "cashfree",
        notes: "Online Cashfree Payment",
        user,
      });
    }

    const orderNumber = order.orderNumber;
    const amountPaise = order.pricing?.totalPaise || quote.totalPaise;

    // Call Cashfree adapter
    const cfResult = await cashfree.createPaymentSession({
      orderNumber,
      amountPaise,
      customer: order.customer,
      returnUrl,
    });

    // Create or update Payment record
    await Payment.findOneAndUpdate(
      { orderNumber },
      {
        orderId: order._id || order.id,
        orderNumber,
        provider: "cashfree",
        providerOrderId: cfResult.cfOrderId,
        paymentSessionId: cfResult.paymentSessionId,
        amountPaise,
        currency: "INR",
        status: PAYMENT_STATUS.PENDING,
        idempotencyKey,
      },
      { upsert: true, new: true }
    );

    return {
      paymentSessionId: cfResult.paymentSessionId,
      orderNumber,
      cfOrderId: cfResult.cfOrderId,
      amount: amountPaise / 100,
      environment: cfResult.environment,
    };
  }

  /**
   * Handle Cashfree Webhook with HMAC signature verification and idempotency deduplication
   */
  async handleCashfreeWebhook({ rawBody, headers, payload }) {
    // 1. Verify signature
    const isValidSignature = cashfree.verifyWebhookSignature(rawBody, headers);
    if (!isValidSignature) {
      logger.warn({ headers }, "Cashfree webhook signature verification failed");
      throw ApiError.unauthorized("Invalid webhook signature");
    }

    // 2. Extract event data
    const eventType = payload.type || payload.event || "PAYMENT_SUCCESS_WEBHOOK";
    const data = payload.data || {};
    const orderData = data.order || {};
    const paymentData = data.payment || {};

    const orderNumber = orderData.order_id || payload.order_id;
    const providerPaymentId = paymentData.cf_payment_id || String(data.cf_payment_id || Date.now());
    const eventId = headers["x-webhook-id"] || `${orderNumber}_${providerPaymentId}_${eventType}`;
    const payloadHash = sha256(rawBody);

    // 3. Idempotency deduplication check in WebhookEvent
    const existingEvent = await WebhookEvent.findOne({
      provider: "cashfree",
      $or: [{ eventId }, { payloadHash }],
    });

    if (existingEvent && existingEvent.status === "processed") {
      logger.info({ eventId, orderNumber }, "Duplicate Cashfree webhook event received, skipping.");
      return { status: "duplicate", message: "Event already processed" };
    }

    const webhookRecord = await WebhookEvent.create({
      provider: "cashfree",
      eventId,
      eventType,
      payloadHash,
      rawPayload: payload,
      status: "processing",
    });

    try {
      const order = await Order.findOne({ orderNumber });
      if (!order) {
        logger.error({ orderNumber }, "Received Cashfree webhook for unknown order number");
        webhookRecord.status = "failed";
        webhookRecord.error = "Order not found";
        await webhookRecord.save();
        return { status: "ignored" };
      }

      // Check payment status from payload
      const paymentStatus = paymentData.payment_status || data.payment_status || "SUCCESS";
      const paymentAmount = paymentData.payment_amount || data.payment_amount;

      if (paymentStatus === "SUCCESS") {
        // Verify payment amount matches order total exactly
        const expectedRupees = order.pricing.totalPaise / 100;
        if (paymentAmount !== undefined && Math.abs(Number(paymentAmount) - expectedRupees) > 0.01) {
          logger.error(
            { orderNumber, paid: paymentAmount, expected: expectedRupees },
            "Cashfree paid amount does not match order total!"
          );
          webhookRecord.status = "failed";
          webhookRecord.error = "Amount mismatch";
          await webhookRecord.save();
          throw ApiError.badRequest("Payment amount mismatch");
        }

        // Mark payment succeeded
        await Payment.findOneAndUpdate(
          { orderNumber },
          {
            status: PAYMENT_STATUS.SUCCEEDED,
            providerPaymentId,
            verifiedAt: new Date(),
            rawWebhookPayload: payload,
          }
        );

        // Transition order to confirmed if not already paid
        if (order.status === ORDER_STATUS.PENDING_PAYMENT) {
          order.status = ORDER_STATUS.CONFIRMED;
          order.paymentStatus = PAYMENT_STATUS.SUCCEEDED;
          order.timeline.push({
            status: "Payment Confirmed via Cashfree",
            time: new Date(),
            note: `Payment ID: ${providerPaymentId}`,
            completed: true,
          });
          await order.save();

          // Commit sold inventory
          await inventoryService.commitSoldStock(
            order.items,
            order.orderNumber,
            "cashfree_webhook_commit"
          );

          // Apply coupon usage
          if (order.pricing.appliedCoupon) {
            await couponService.recordUsage(order.pricing.appliedCoupon);
          }
        }
      } else {
        // Payment failed
        order.paymentStatus = PAYMENT_STATUS.FAILED;
        order.timeline.push({
          status: "Payment Failed",
          time: new Date(),
          note: `Failure reason: ${paymentData.payment_message || "Declined"}`,
          completed: false,
        });
        await order.save();
      }

      webhookRecord.status = "processed";
      webhookRecord.processedAt = new Date();
      await webhookRecord.save();

      return { status: "processed", orderNumber };
    } catch (err) {
      webhookRecord.status = "failed";
      webhookRecord.error = err.message;
      await webhookRecord.save();
      throw err;
    }
  }

  /**
   * Refresh payment status by querying Cashfree API server-to-server
   */
  async refreshPaymentStatus(orderNumber) {
    const order = await Order.findOne({ orderNumber });
    if (!order) throw ApiError.notFound("Order not found.");

    const cfStatus = await cashfree.getOrderStatus(orderNumber);
    if (cfStatus.orderStatus === "PAID" && order.status === ORDER_STATUS.PENDING_PAYMENT) {
      order.status = ORDER_STATUS.CONFIRMED;
      order.paymentStatus = PAYMENT_STATUS.SUCCEEDED;
      order.timeline.push({
        status: "Payment Verified via Cashfree API Refresh",
        time: new Date(),
        completed: true,
      });
      await order.save();

      await inventoryService.commitSoldStock(order.items, order.orderNumber);
      if (order.pricing.appliedCoupon) {
        await couponService.recordUsage(order.pricing.appliedCoupon);
      }
    }

    return {
      orderNumber,
      orderStatus: order.status,
      paymentStatus: order.paymentStatus,
      cashfreeStatus: cfStatus.orderStatus,
    };
  }
}

export const paymentService = new PaymentService();

