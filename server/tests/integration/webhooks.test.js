import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { Order } from "../../src/models/Order.js";
import { Payment } from "../../src/models/Payment.js";
import { Shipment } from "../../src/models/Shipment.js";
import { ProductVariant } from "../../src/models/ProductVariant.js";
import { Product } from "../../src/models/Product.js";
import { hmacSha256 } from "../../src/utils/crypto.js";
import { config } from "../../src/config/index.js";
import { ORDER_STATUS } from "../../src/constants/orderStatus.js";
import { PAYMENT_STATUS } from "../../src/constants/paymentStatus.js";

describe.sequential("Webhooks & Idempotent Event Processing Integration", () => {
  let testOrder = null;
  let testVariant = null;
  let testShipment = null;
  let createdProduct = null;
  const cfSecret = config.CASHFREE_SECRET_KEY || "TEST_CF_SECRET_KEY";
  const srSecret = config.SHIPROCKET_WEBHOOK_SECRET || "test_shiprocket_webhook_secret_999";

  beforeAll(async () => {
    // 1. Create variant with initial stock
    let product = await Product.findOne();
    if (!product) {
      const stamp = Date.now();
      product = await Product.create({
        name: "Webhook Test Product",
        slug: `webhook-test-${stamp}`,
        sku: `WH-TEST-${stamp}`,
        categoryId: "ayurvedic-herbs",
        status: "active",
        basePricePaise: 49900,
      });
      createdProduct = product;
    }

    testVariant = await ProductVariant.create({
      productId: product._id,
      sku: `WEBHOOK-TEST-${Date.now()}`,
      label: "Webhook Pack",
      pricePaise: 49900, // ₹499
      stockOnHand: 10,
      reservedStock: 1,
      reorderThreshold: 2,
      isActive: true,
    });

    // 2. Create pending order for Cashfree webhook test
    const orderNumber = `DA-WH-${Date.now().toString().slice(-6)}`;
    testOrder = await Order.create({
      orderNumber,
      customer: {
        name: "Webhook Customer",
        email: "webhook.tester@divyamayurveda.test",
        phone: "9876543210",
      },
      shippingAddress: {
        fullName: "Webhook Customer",
        phone: "9876543210",
        street: "777 MG Road",
        city: "Bengaluru",
        state: "Karnataka",
        pincode: "560001",
      },
      items: [
        {
          productId: product._id,
          variantId: testVariant._id,
          sku: testVariant.sku,
          name: product.name || "Ayurvedic Product",
          size: "500g",
          unitPricePaise: 49900,
          quantity: 1,
          lineTotalPaise: 49900,
        },
      ],
      pricing: {
        subtotalPaise: 49900,
        couponDiscountPaise: 0,
        referralDiscountPaise: 0,
        shippingPaise: 0,
        taxPaise: 5988,
        totalPaise: 49900,
      },
      paymentMethod: "cashfree",
      status: ORDER_STATUS.PENDING_PAYMENT,
      paymentStatus: PAYMENT_STATUS.PENDING,
      timeline: [
        { status: "Order Placed", time: new Date(), completed: true, note: "Awaiting Cashfree payment" },
      ],
    });

    await Payment.create({
      orderId: testOrder._id,
      orderNumber: testOrder.orderNumber,
      amountPaise: 49900,
      method: "cashfree",
      status: PAYMENT_STATUS.PENDING,
    });

    // 3. Create a test shipment for Shiprocket webhook
    testShipment = await Shipment.create({
      orderId: testOrder._id,
      orderNumber: testOrder.orderNumber,
      awbCode: `AWB-TEST-${Date.now()}`,
      courierName: "Delhivery",
      status: "SHIPPED",
      trackingEvents: [],
    });
  });

  describe("Cashfree Payment Webhook", () => {
    it("should reject Cashfree webhook with invalid signature with 401 Unauthorized", async () => {
      const payload = {
        type: "PAYMENT_SUCCESS_WEBHOOK",
        data: {
          order: { order_id: testOrder.orderNumber },
          payment: {
            cf_payment_id: "cf_mock_pay_1",
            payment_status: "SUCCESS",
            payment_amount: 499,
          },
        },
      };

      const res = await request(app)
        .post("/api/v1/webhooks/cashfree")
        .set("x-webhook-signature", "invalid_forged_signature_hex")
        .set("x-webhook-timestamp", Date.now().toString())
        .send(payload);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it("should reject Cashfree webhook missing signature header with 401 Unauthorized", async () => {
      const payload = {
        type: "PAYMENT_SUCCESS_WEBHOOK",
        data: {
          order: { order_id: testOrder.orderNumber },
        },
      };

      const res = await request(app)
        .post("/api/v1/webhooks/cashfree")
        .send(payload);

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it("should process valid Cashfree webhook, mark order confirmed, and commit inventory", async () => {
      const payload = {
        type: "PAYMENT_SUCCESS_WEBHOOK",
        data: {
          order: { order_id: testOrder.orderNumber },
          payment: {
            cf_payment_id: "cf_pay_valid_108",
            payment_status: "SUCCESS",
            payment_amount: 499,
          },
        },
      };

      const rawBody = JSON.stringify(payload);
      const timestamp = Date.now().toString();
      const validSignature = hmacSha256(`${timestamp}${rawBody}`, cfSecret);

      const res = await request(app)
        .post("/api/v1/webhooks/cashfree")
        .set("x-webhook-signature", validSignature)
        .set("x-webhook-timestamp", timestamp)
        .set("x-webhook-id", `evt_cf_${Date.now()}`)
        .set("Content-Type", "application/json")
        .send(rawBody);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.result.status).toBe("processed");

      // Verify order updated in DB
      const updatedOrder = await Order.findOne({ orderNumber: testOrder.orderNumber });
      expect(updatedOrder.status).toBe(ORDER_STATUS.CONFIRMED);
      expect(updatedOrder.paymentStatus).toBe(PAYMENT_STATUS.SUCCEEDED);

      // Verify payment record updated
      const updatedPayment = await Payment.findOne({ orderNumber: testOrder.orderNumber });
      expect(updatedPayment.status).toBe(PAYMENT_STATUS.SUCCEEDED);
      expect(updatedPayment.providerPaymentId).toBe("cf_pay_valid_108");

      // Verify inventory committed (reserved decremented, stockOnHand decremented)
      const freshVariant = await ProductVariant.findById(testVariant._id);
      expect(freshVariant.stockOnHand).toBe(9);
      expect(freshVariant.reservedStock).toBe(0);
    });

    it("should handle duplicate Cashfree webhook idempotently without double-processing", async () => {
      const payload = {
        type: "PAYMENT_SUCCESS_WEBHOOK",
        data: {
          order: { order_id: testOrder.orderNumber },
          payment: {
            cf_payment_id: "cf_pay_valid_108",
            payment_status: "SUCCESS",
            payment_amount: 499,
          },
        },
      };

      const rawBody = JSON.stringify(payload);
      const timestamp = Date.now().toString();
      const validSignature = hmacSha256(`${timestamp}${rawBody}`, cfSecret);

      const res = await request(app)
        .post("/api/v1/webhooks/cashfree")
        .set("x-webhook-signature", validSignature)
        .set("x-webhook-timestamp", timestamp)
        .set("Content-Type", "application/json")
        .send(rawBody);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.result.status).toBe("duplicate");

      // Ensure inventory was NOT decremented a second time
      const freshVariant = await ProductVariant.findById(testVariant._id);
      expect(freshVariant.stockOnHand).toBe(9);
      expect(freshVariant.reservedStock).toBe(0);
    });
  });

  describe("Shiprocket Tracking Webhook", () => {
    it("should reject Shiprocket webhook with invalid token with 401 Unauthorized", async () => {
      const res = await request(app)
        .post("/api/v1/webhooks/shiprocket")
        .set("x-shiprocket-token", "bad_sr_token")
        .send({
          awb: testShipment.awbCode,
          current_status: "DELIVERED",
        });

      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    it("should process valid Shiprocket DELIVERED webhook and transition order to delivered", async () => {
      const payload = {
        awb: testShipment.awbCode,
        current_status: "DELIVERED",
        activity: "Delivered to recipient",
        location: "Bengaluru",
      };

      const res = await request(app)
        .post("/api/v1/webhooks/shiprocket")
        .set("x-shiprocket-token", srSecret)
        .send(payload);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.result.status).toBe("processed");

      // Verify shipment updated
      const freshShipment = await Shipment.findById(testShipment._id);
      expect(freshShipment.status).toBe("DELIVERED");
      expect(freshShipment.trackingEvents.length).toBeGreaterThan(0);

      // Verify order updated
      const freshOrder = await Order.findById(testOrder._id);
      expect(freshOrder.status).toBe(ORDER_STATUS.DELIVERED);
    });

    it("should handle duplicate Shiprocket webhook event idempotently", async () => {
      const payload = {
        awb: testShipment.awbCode,
        current_status: "DELIVERED",
        activity: "Delivered to recipient",
        location: "Bengaluru",
      };

      const res = await request(app)
        .post("/api/v1/webhooks/shiprocket")
        .set("x-shiprocket-token", srSecret)
        .send(payload);

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.result.status).toBe("duplicate");
    });
  });

  afterAll(async () => {
    if (testShipment) await Shipment.deleteOne({ _id: testShipment._id });
    if (testOrder) {
      await Payment.deleteMany({ orderId: testOrder._id });
      await Order.deleteOne({ _id: testOrder._id });
    }
    if (testVariant) await ProductVariant.deleteOne({ _id: testVariant._id });
    if (createdProduct) await Product.deleteOne({ _id: createdProduct._id });
    const mongoose = (await import("mongoose")).default;
    await mongoose.connection.db.collection("webhookevents").deleteMany({});
    await mongoose.connection.db.collection("inventorymovements").deleteMany({});
  });
});
