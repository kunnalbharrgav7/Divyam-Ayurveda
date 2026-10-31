import mongoose from "mongoose";
import { Order } from "../models/Order.js";
import { Payment } from "../models/Payment.js";
import { WebhookEvent } from "../models/WebhookEvent.js";
import { Quote } from "../models/Quote.js";
import { cashfree } from "../integrations/cashfree/cashfree.adapter.js";
import { orderService } from "./order.service.js";
import { shipmentService } from "./shipment.service.js";
import { Refund } from "../models/Refund.js";
import { inventoryService } from "./inventory.service.js";
import { couponService } from "./coupon.service.js";
import { referralService } from "./referral.service.js";
import { ORDER_STATUS } from "../constants/orderStatus.js";
import { PAYMENT_STATUS } from "../constants/paymentStatus.js";
import { sha256 } from "../utils/crypto.js";
import { ApiError } from "../utils/apiError.js";
import { logger } from "../config/logger.js";

// A webhook still marked "processing" after this long belongs to a crashed attempt and may be retried
const STALE_PROCESSING_MS = 60 * 1000;

const SETTLED_PAYMENT_STATUSES = [
  PAYMENT_STATUS.SUCCEEDED,
  PAYMENT_STATUS.REFUNDED,
  PAYMENT_STATUS.PARTIALLY_REFUNDED,
];

export class PaymentService {
  /**
   * Create or reuse a pending internal order and create a Cashfree PG session
   */
  async createCashfreeSession({ orderNumber = null, quoteId = null, returnUrl = null, user = null, idempotencyKey = null }) {
    let order = null;

    if (orderNumber) {
      const isObjectId = mongoose.Types.ObjectId.isValid(orderNumber);
      order = await Order.findOne({
        $or: [
          { orderNumber },
          ...(isObjectId ? [{ _id: orderNumber }] : []),
        ],
      });
      if (!order) throw ApiError.notFound("Order not found.");
      if (order.paymentStatus === PAYMENT_STATUS.SUCCEEDED) {
        return {
          alreadyPaid: true,
          orderNumber: order.orderNumber,
          orderStatus: order.status,
          paymentStatus: order.paymentStatus,
        };
      }
      if (order.status === ORDER_STATUS.CANCELLED) {
        throw ApiError.badRequest("This order was cancelled, so it can no longer be paid. Please place a new order.");
      }
    } else if (quoteId) {
      const quote = await Quote.findById(quoteId);
      if (!quote) throw ApiError.badRequest("Invalid or expired checkout quote.");

      order = await Order.findOne({ quoteId: quote._id, status: ORDER_STATUS.PENDING_PAYMENT });
      if (!order) {
        order = await orderService.createOrder({
          quoteId: quote._id,
          paymentMethod: "cashfree",
          notes: "Online Cashfree Payment",
          user,
        });
      }
    } else {
      throw ApiError.badRequest("Either orderNumber or quoteId is required to create a payment session.");
    }

    const orderNum = order.orderNumber;
    const amountPaise = order.pricing?.totalPaise || 0;
    if (amountPaise <= 0) {
      throw ApiError.badRequest("Invalid order total amount.");
    }

    // Call Cashfree adapter (it reuses the open session when this order already exists at Cashfree)
    const cfResult = await cashfree.createPaymentSession({
      orderNumber: orderNum,
      amountPaise,
      customer: order.customer,
      returnUrl,
    });

    // Create or update Payment record
    await Payment.findOneAndUpdate(
      { orderNumber: orderNum },
      {
        orderId: order._id || order.id,
        orderNumber: orderNum,
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
      orderNumber: orderNum,
      cfOrderId: cfResult.cfOrderId,
      amount: amountPaise / 100,
      environment: cfResult.environment,
    };
  }

  /**
   * Mark an order paid exactly once, no matter how many requests race (webhook, status check, retries).
   * Only the request that actually flips paymentStatus goes on to confirm the order, deduct stock and
   * count the coupon/referral; every other caller gets `false` and does nothing.
   */
  async #markPaid(order, { providerPaymentId, label }) {
    const won = await Order.findOneAndUpdate(
      { _id: order._id, paymentStatus: { $ne: PAYMENT_STATUS.SUCCEEDED } },
      {
        $set: { paymentStatus: PAYMENT_STATUS.SUCCEEDED },
        $push: {
          timeline: { status: label, time: new Date(), note: `Payment ID: ${providerPaymentId}`, completed: true },
        },
      },
      { new: true }
    );
    if (!won) return false;

    if (won.status === ORDER_STATUS.CANCELLED) {
      // The money arrived after the order was cancelled: keep it cancelled and flag it for a refund
      await Order.updateOne(
        { _id: won._id },
        {
          $push: {
            timeline: {
              status: "Payment received after cancellation",
              time: new Date(),
              note: "This order was cancelled before the payment arrived. Issue a refund.",
              completed: false,
            },
          },
        }
      );
      logger.warn({ orderNumber: won.orderNumber }, "Cashfree payment received for a cancelled order; refund required");
      return true;
    }

    const confirmed = await Order.findOneAndUpdate(
      { _id: won._id, status: ORDER_STATUS.PENDING_PAYMENT },
      { $set: { status: ORDER_STATUS.CONFIRMED } },
      { new: true }
    );
    if (!confirmed) return true; // already past pending (e.g. staff moved it on)

    // Stock: the reservation becomes a sale once. stockState is claimed atomically so delivery cannot deduct it again.
    const claim = await Order.findOneAndUpdate(
      { _id: confirmed._id, stockState: { $in: ["reserved", "none"] } }, // "none": orders saved before stock states existed
      { $set: { stockState: "committed" } }
    );
    if (claim) {
      const lines = (confirmed.items || [])
        .filter((i) => i.variantId)
        .map((i) => ({ variantId: i.variantId, productId: i.productId, sku: i.sku, quantity: i.quantity }));
      await inventoryService.commitSoldStock(lines, confirmed.orderNumber, "cashfree_payment_commit");
    }

    if (confirmed.pricing?.appliedCoupon) {
      await couponService.recordUsage(confirmed.pricing.appliedCoupon);
    }
    if (confirmed.pricing?.referralCode && confirmed.userId) {
      await referralService.recordOrder(confirmed, { _id: confirmed.userId });
    }

    // Book the courier in the background; the webhook response must not wait for Shiprocket
    setImmediate(() => shipmentService.autoCreateForOrder(confirmed.orderNumber));
    return true;
  }

  /**
   * Apply a final Cashfree status to a refund we issued when cancelling a paid order. Safe to call any
   * number of times (webhook, poller): only a refund that is still pending changes.
   * Refunds that belong to a return request are finished by the returns flow, not here.
   */
  async applyCancelRefundStatus({ refundId, status }) {
    const cfStatus = String(status || "").toUpperCase();
    const finalStatus = cfStatus === "SUCCESS" ? "succeeded" : ["FAILED", "CANCELLED"].includes(cfStatus) ? "failed" : null;
    if (!refundId || !finalStatus) return { updated: false };

    const refund = await Refund.findOneAndUpdate(
      { refundId, status: "pending", returnRequestId: null },
      { status: finalStatus, ...(finalStatus === "failed" ? { errorMessage: `Cashfree reported the refund as ${cfStatus}.` } : {}) },
      { new: true }
    );
    if (!refund) return { updated: false };

    if (finalStatus === "succeeded") {
      await Order.updateOne(
        { orderNumber: refund.orderNumber },
        {
          $set: { paymentStatus: PAYMENT_STATUS.REFUNDED },
          $push: { timeline: { status: "Refund completed", time: new Date(), note: `₹${refund.amountPaise / 100} reached the original payment method.`, completed: true } },
        }
      );
    } else {
      await Order.updateOne(
        { orderNumber: refund.orderNumber },
        {
          $inc: { refundedPaise: -refund.amountPaise },
          $push: {
            timeline: {
              status: "Refund failed",
              time: new Date(),
              note: `Cashfree could not complete the refund of ₹${refund.amountPaise / 100} (${cfStatus}). Refund this order manually.`,
              completed: false,
            },
          },
        }
      );
      logger.error({ orderNumber: refund.orderNumber, refundId, status: cfStatus }, "Refund for cancelled order failed at Cashfree");
    }
    return { updated: true, status: finalStatus };
  }

  /** Ask Cashfree about cancel-refunds that are still pending (covers a missed refund webhook) */
  async syncPendingCancelRefunds({ olderThanMs = 5 * 60 * 1000 } = {}) {
    const pending = await Refund.find({
      status: "pending",
      provider: "cashfree",
      returnRequestId: null,
      createdAt: { $lt: new Date(Date.now() - olderThanMs) },
    }).limit(50);

    let updated = 0;
    for (const refund of pending) {
      try {
        const info = await cashfree.getRefund({ orderNumber: refund.orderNumber, refundId: refund.refundId });
        const result = await this.applyCancelRefundStatus({ refundId: refund.refundId, status: info.status });
        if (result.updated) updated += 1;
      } catch (err) {
        logger.warn({ refundId: refund.refundId, err: err.message }, "Could not check pending refund");
      }
    }
    return { checked: pending.length, updated };
  }

  /** A failed attempt must never overwrite a payment that already succeeded or was refunded */
  async #markFailed(order, note) {
    await Order.updateOne(
      { _id: order._id, paymentStatus: { $nin: SETTLED_PAYMENT_STATUSES } },
      {
        $set: { paymentStatus: PAYMENT_STATUS.FAILED },
        $push: { timeline: { status: "Payment Failed", time: new Date(), note, completed: false } },
      }
    );
    await Payment.updateOne({ orderNumber: order.orderNumber, status: { $ne: PAYMENT_STATUS.SUCCEEDED } }, { status: PAYMENT_STATUS.FAILED });
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
    const refundData = data.refund || {};

    const orderNumber = orderData.order_id || refundData.order_id || payload.order_id;
    const payloadHash = sha256(rawBody);
    const providerPaymentId = paymentData.cf_payment_id ? String(paymentData.cf_payment_id) : String(data.cf_payment_id || payloadHash.slice(0, 16));
    const eventId = headers["x-webhook-id"] || `${orderNumber}_${providerPaymentId}_${eventType}`;

    // 3. Idempotency: a processed event is skipped; a failed or abandoned one is retried in place
    const existingEvent = await WebhookEvent.findOne({
      provider: "cashfree",
      $or: [{ eventId }, { payloadHash }],
    });

    if (existingEvent && existingEvent.status === "processed") {
      logger.info({ eventId, orderNumber }, "Duplicate Cashfree webhook event received, skipping.");
      return { status: "duplicate", message: "Event already processed" };
    }
    if (
      existingEvent &&
      existingEvent.status === "processing" &&
      Date.now() - new Date(existingEvent.updatedAt).getTime() < STALE_PROCESSING_MS
    ) {
      return { status: "duplicate", message: "Event is already being processed" };
    }

    let webhookRecord = existingEvent;
    if (webhookRecord) {
      webhookRecord.status = "processing";
      webhookRecord.error = null;
      await webhookRecord.save();
    } else {
      try {
        webhookRecord = await WebhookEvent.create({
          provider: "cashfree",
          eventId,
          eventType,
          payloadHash,
          rawPayload: payload,
          status: "processing",
        });
      } catch (err) {
        if (err.code === 11000) return { status: "duplicate", message: "Event is already being processed" };
        throw err;
      }
    }

    try {
      const order = await Order.findOne({ orderNumber });
      if (!order) {
        logger.error({ orderNumber }, "Received Cashfree webhook for unknown order number");
        webhookRecord.status = "failed";
        webhookRecord.error = "Order not found";
        await webhookRecord.save();
        return { status: "ignored" };
      }

      // Refund updates settle the refund we issued on cancellation
      if (refundData.refund_id || /REFUND/i.test(eventType)) {
        const outcome = await this.applyCancelRefundStatus({ refundId: refundData.refund_id, status: refundData.refund_status });
        webhookRecord.status = "processed";
        webhookRecord.processedAt = new Date();
        await webhookRecord.save();
        return { status: "processed", orderNumber, refund: outcome };
      }

      // Only payment events change an order; settlement and dispute events carry no payment status
      const paymentStatus = paymentData.payment_status || data.payment_status;
      if (!paymentStatus) {
        webhookRecord.status = "processed";
        webhookRecord.processedAt = new Date();
        await webhookRecord.save();
        return { status: "ignored", reason: "not a payment event", eventType };
      }
      const paymentAmount = paymentData.payment_amount ?? data.payment_amount;

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

        await Payment.findOneAndUpdate(
          { orderNumber },
          {
            status: PAYMENT_STATUS.SUCCEEDED,
            providerPaymentId,
            verifiedAt: new Date(),
            rawWebhookPayload: payload,
          },
          { upsert: true }
        );

        await this.#markPaid(order, { providerPaymentId, label: "Payment Confirmed via Cashfree" });
      } else {
        // FAILED, USER_DROPPED, CANCELLED...: the customer can still retry, and a success later wins
        await this.#markFailed(order, `Failure reason: ${paymentData.payment_message || paymentStatus}`);
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
   * Refresh and verify payment status by querying Cashfree API server-to-server
   */
  async refreshPaymentStatus(orderNumber) {
    const isObjectId = mongoose.Types.ObjectId.isValid(orderNumber);
    const order = await Order.findOne({
      $or: [
        { orderNumber },
        ...(isObjectId ? [{ _id: orderNumber }] : []),
      ],
    });
    if (!order) throw ApiError.notFound("Order not found.");

    const orderNum = order.orderNumber;
    const cfStatus = await cashfree.getOrderStatus(orderNum);
    const payments = await cashfree.getOrderPayments(orderNum);

    const successfulPayment =
      payments.find((p) => p.payment_status === "SUCCESS") ||
      (Array.isArray(cfStatus.payments) && cfStatus.payments.find((p) => p.payment_status === "SUCCESS"));

    let isPaid = cfStatus.orderStatus === "PAID" || Boolean(successfulPayment);

    // The order and amount Cashfree holds must be the ones we created
    if (isPaid) {
      const expectedRupees = (order.pricing?.totalPaise || 0) / 100;
      const idMismatch = cfStatus.orderId && String(cfStatus.orderId) !== orderNum;
      const amountMismatch =
        cfStatus.orderAmount !== undefined && Math.abs(Number(cfStatus.orderAmount) - expectedRupees) > 0.01;
      if (idMismatch || amountMismatch) {
        logger.error(
          { orderNumber: orderNum, cashfreeOrderId: cfStatus.orderId, cashfreeAmount: cfStatus.orderAmount, expected: expectedRupees },
          "Cashfree order does not match our order; not marking it paid"
        );
        isPaid = false;
      }
    }

    if (isPaid) {
      const providerPaymentId = successfulPayment?.cf_payment_id ? String(successfulPayment.cf_payment_id) : `cf_pay_${Date.now()}`;

      await Payment.findOneAndUpdate(
        { orderNumber: orderNum },
        {
          status: PAYMENT_STATUS.SUCCEEDED,
          providerPaymentId,
          verifiedAt: new Date(),
        },
        { upsert: true }
      );

      await this.#markPaid(order, { providerPaymentId, label: "Payment Verified via Cashfree API" });
    } else {
      const lastPayment = payments[payments.length - 1];
      if (lastPayment && ["FAILED", "USER_DROPPED", "CANCELLED"].includes(lastPayment.payment_status)) {
        await this.#markFailed(order, `Failure reason: ${lastPayment.payment_message || lastPayment.payment_status}`);
      }
    }

    const fresh = await Order.findById(order._id).select("status paymentStatus");

    return {
      orderNumber: orderNum,
      orderStatus: fresh?.status || order.status,
      paymentStatus: fresh?.paymentStatus || order.paymentStatus,
      cashfreeStatus: cfStatus.orderStatus,
      isPaid,
    };
  }
}

export const paymentService = new PaymentService();
