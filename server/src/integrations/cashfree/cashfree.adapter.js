import { config } from "../../config/index.js";
import { logger } from "../../config/logger.js";
import { verifyHmacSignature, sha256 } from "../../utils/crypto.js";
import { toRupees } from "../../utils/currency.js";
import { CashfreeMock } from "./cashfree.mock.js";

export class CashfreeAdapter {
  constructor() {
    this.appId = config.CASHFREE_APP_ID;
    this.secretKey = config.CASHFREE_SECRET_KEY;
    this.apiVersion = config.CASHFREE_API_VERSION || "2025-01-01";
    this.baseUrl =
      config.CASHFREE_ENV === "production"
        ? "https://api.cashfree.com/pg"
        : "https://sandbox.cashfree.com/pg";

    this.isMock = config.NODE_ENV === "test" || !this.appId || this.appId === "TEST_CF_APP_ID";
    if (config.NODE_ENV === "production" && this.isMock) {
      throw new Error("Cannot run Cashfree mock payment adapter in production environment. Valid CASHFREE_APP_ID and CASHFREE_SECRET_KEY required.");
    }
    this.mock = new CashfreeMock();
  }

  /**
   * Create Cashfree Order and Payment Session
   */
  async createPaymentSession({ orderNumber, amountPaise, customer, returnUrl }) {
    if (this.isMock) {
      logger.info({ orderNumber, amountPaise }, "Using Cashfree Mock Adapter");
      return this.mock.createPaymentSession({ orderNumber, amountPaise, customer, returnUrl });
    }

    const rawId = String(customer?.id || customer?._id || customer?.email || "guest").replace(/[^a-zA-Z0-9._-]/g, "_");
    const customerId = rawId.length >= 3 ? rawId.slice(0, 50) : `cust_${rawId}`;
    const cleanPhone = String(customer?.phone || "").replace(/[^0-9]/g, "").slice(-10);
    const customerPhone = cleanPhone.length === 10 ? cleanPhone : "9876543210";
    const webhookUrl =
      config.CASHFREE_WEBHOOK_URL || `${config.API_URL.replace(/\/+$/, "")}/api/v1/webhooks/cashfree`;

    const payload = {
      order_id: String(orderNumber).trim(),
      order_amount: Number(toRupees(amountPaise)),
      order_currency: "INR",
      customer_details: {
        customer_id: customerId,
        customer_email: customer?.email || "customer@divyamayurveda.com",
        customer_phone: customerPhone,
        customer_name: customer?.name || "Customer",
      },
      order_meta: {
        return_url:
          returnUrl ||
          `${config.CLIENT_ORIGIN.replace(/\/+$/, "")}/order-confirmation/${orderNumber}?order_id={order_id}`,
        notify_url: webhookUrl,
      },
    };

    try {
      const response = await fetch(`${this.baseUrl}/orders`, {
        method: "POST",
        headers: {
          "x-client-id": this.appId,
          "x-client-secret": this.secretKey,
          "x-api-version": this.apiVersion,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        logger.error({ data, orderNumber }, "Cashfree PG create order returned error");
        throw new Error(data.message || "Failed to initialize Cashfree payment session");
      }

      return {
        paymentSessionId: data.payment_session_id,
        orderId: data.order_id,
        cfOrderId: data.cf_order_id,
        environment: config.CASHFREE_ENV,
      };
    } catch (err) {
      logger.error({ err: err.message, orderNumber }, "Cashfree API request exception");
      throw err;
    }
  }

  /**
   * Fetch order status from Cashfree server
   */
  async getOrderStatus(orderNumber) {
    if (this.isMock) {
      return this.mock.getOrderStatus(orderNumber);
    }

    try {
      const response = await fetch(`${this.baseUrl}/orders/${encodeURIComponent(orderNumber)}`, {
        headers: {
          "x-client-id": this.appId,
          "x-client-secret": this.secretKey,
          "x-api-version": this.apiVersion,
        },
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || "Failed to fetch Cashfree order status");
      }

      return {
        orderId: data.order_id,
        orderStatus: data.order_status, // PAID, ACTIVE, EXPIRED
        orderAmount: data.order_amount,
        payments: data.payments || [],
      };
    } catch (err) {
      logger.error({ err: err.message, orderNumber }, "Cashfree status check failed");
      throw err;
    }
  }

  /**
   * Fetch payment attempts from Cashfree for an order
   */
  async getOrderPayments(orderNumber) {
    if (this.isMock) {
      return this.mock.getOrderPayments ? this.mock.getOrderPayments(orderNumber) : [];
    }

    try {
      const response = await fetch(`${this.baseUrl}/orders/${encodeURIComponent(orderNumber)}/payments`, {
        headers: {
          "x-client-id": this.appId,
          "x-client-secret": this.secretKey,
          "x-api-version": this.apiVersion,
        },
      });

      const data = await response.json();
      if (!response.ok) {
        return [];
      }

      return Array.isArray(data) ? data : [];
    } catch (err) {
      logger.warn({ err: err.message, orderNumber }, "Cashfree get payments warning");
      return [];
    }
  }

  /**
   * Refund (part of) a paid order back to the customer's original payment method.
   */
  async createRefund({ orderNumber, refundId, amountPaise, note = "" }) {
    if (this.isMock) {
      logger.info({ orderNumber, refundId, amountPaise }, "Using Cashfree Mock Adapter (refund)");
      return this.mock.createRefund({ orderNumber, refundId, amountPaise });
    }

    const response = await fetch(`${this.baseUrl}/orders/${encodeURIComponent(orderNumber)}/refunds`, {
      method: "POST",
      headers: {
        "x-client-id": this.appId,
        "x-client-secret": this.secretKey,
        "x-api-version": this.apiVersion,
        "x-idempotency-key": refundId,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        refund_amount: Number(toRupees(amountPaise)),
        refund_id: refundId,
        refund_note: note.slice(0, 100),
        refund_speed: "STANDARD",
      }),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      logger.error({ data, orderNumber, refundId }, "Cashfree refund request failed");
      throw new Error(data.message || "Cashfree rejected the refund request.");
    }
    return { refundId: data.refund_id, cfRefundId: data.cf_refund_id, status: data.refund_status, raw: data };
  }

  /** Current status of a refund at Cashfree */
  async getRefund({ orderNumber, refundId }) {
    if (this.isMock) return this.mock.getRefund({ refundId });

    const response = await fetch(
      `${this.baseUrl}/orders/${encodeURIComponent(orderNumber)}/refunds/${encodeURIComponent(refundId)}`,
      { headers: { "x-client-id": this.appId, "x-client-secret": this.secretKey, "x-api-version": this.apiVersion } }
    );
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.message || "Could not fetch the refund status from Cashfree.");
    return { refundId: data.refund_id, cfRefundId: data.cf_refund_id, status: data.refund_status, raw: data };
  }

  /**
   * Verify Cashfree Webhook Signature (supports both Hex and Base64 signatures)
   */
  verifyWebhookSignature(rawBody, headers) {
    const signature = headers["x-webhook-signature"] || headers["x-cashfree-signature"];
    const timestamp = headers["x-webhook-timestamp"] || "";

    if (!signature) {
      return false;
    }

    const payloadToSign = `${timestamp}${rawBody}`;
    const secret = this.secretKey || config.CASHFREE_SECRET_KEY || "TEST_CF_SECRET_KEY";
    return verifyHmacSignature(payloadToSign, signature, secret);
  }
}

export const cashfree = new CashfreeAdapter();
