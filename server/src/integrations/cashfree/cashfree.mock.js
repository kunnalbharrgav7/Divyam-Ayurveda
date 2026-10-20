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
        orderStatus: "ACTIVE",
        orderAmount: 100,
        payments: [],
      };
    }

    return {
      orderId: session.orderId,
      orderStatus: session.status,
      orderAmount: session.amountPaise / 100,
      payments: session.status === "PAID" ? [{ payment_status: "SUCCESS", cf_payment_id: `cf_mock_${Date.now()}` }] : [],
    };
  }

  async getOrderPayments(orderNumber) {
    const session = this.sessions.get(orderNumber);
    if (session && session.status === "PAID") {
      return [
        {
          payment_status: "SUCCESS",
          cf_payment_id: `cf_mock_pay_${Date.now()}`,
          payment_amount: session.amountPaise / 100,
          payment_currency: "INR",
          payment_time: new Date().toISOString(),
        },
      ];
    }
    return [];
  }

  markPaid(orderNumber) {
    const session = this.sessions.get(orderNumber);
    if (session) {
      session.status = "PAID";
    }
  }
}
