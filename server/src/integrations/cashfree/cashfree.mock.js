import crypto from "crypto";

export class CashfreeMock {
  constructor() {
    this.sessions = new Map();
  }

  async createPaymentSession({ orderNumber, amountPaise, customer }) {
    const paymentSessionId = `session_mock_${crypto.randomBytes(12).toString("hex")}`;
    const cfOrderId = `cf_${Date.now()}`;

    this.sessions.set(orderNumber, {
      orderId: orderNumber,
      cfOrderId,
      paymentSessionId,
      amountPaise,
      status: "ACTIVE",
      customer,
    });

    return {
      paymentSessionId,
      orderId: orderNumber,
      cfOrderId,
      environment: "sandbox",
    };
  }

  // Sandbox/mock refunds succeed immediately
  async createRefund({ orderNumber, refundId, amountPaise }) {
    return {
      refundId,
      cfRefundId: `cf_rf_${Date.now()}`,
      status: "SUCCESS",
      amountPaise,
      orderNumber,
    };
  }

  async getRefund({ refundId }) {
    return { refundId, cfRefundId: `cf_rf_${refundId}`, status: "SUCCESS" };
  }

  async getOrderStatus(orderNumber) {
    const session = this.sessions.get(orderNumber);
    if (!session) {
      return {
        orderId: orderNumber,
        orderStatus: "PAID", // Default to paid for demo check
        orderAmount: 100,
      };
    }

    return {
      orderId: session.orderId,
      orderStatus: session.status,
      orderAmount: session.amountPaise / 100,
    };
  }

  markPaid(orderNumber) {
    const session = this.sessions.get(orderNumber);
    if (session) {
      session.status = "PAID";
    }
  }
}

