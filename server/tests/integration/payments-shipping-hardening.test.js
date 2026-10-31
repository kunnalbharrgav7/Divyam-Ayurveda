import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import mongoose from "mongoose";
import request from "supertest";
import app from "../../src/app.js";
import { Order } from "../../src/models/Order.js";
import { Payment } from "../../src/models/Payment.js";
import { Shipment } from "../../src/models/Shipment.js";
import { WebhookEvent } from "../../src/models/WebhookEvent.js";
import { Refund } from "../../src/models/Refund.js";
import { ProductVariant } from "../../src/models/ProductVariant.js";
import { Product } from "../../src/models/Product.js";
import { hmacSha256 } from "../../src/utils/crypto.js";
import { config } from "../../src/config/index.js";
import { ORDER_STATUS } from "../../src/constants/orderStatus.js";
import { PAYMENT_STATUS } from "../../src/constants/paymentStatus.js";
import { orderService } from "../../src/services/order.service.js";
import { shipmentService } from "../../src/services/shipment.service.js";
import { paymentService } from "../../src/services/payment.service.js";
import { cashfree } from "../../src/integrations/cashfree/cashfree.adapter.js";
import { shiprocket } from "../../src/integrations/shiprocket/shiprocket.adapter.js";
import { ShiprocketAdapter } from "../../src/integrations/shiprocket/shiprocket.adapter.js";

const cfSecret = config.CASHFREE_SECRET_KEY || "TEST_CF_SECRET_KEY";
const srSecret = config.SHIPROCKET_WEBHOOK_SECRET || "test_shiprocket_webhook_secret_999";
const stamp = Date.now();

describe.sequential("Payment and shipping hardening", () => {
  let product;
  const created = { orders: [], variants: [], products: [] };
  let counter = 0;

  beforeAll(async () => {
    await Shipment.syncIndexes(); // an older test database may still hold the non-unique index
    // Reuse an existing product (like the other suites) so no test ever leaves variants pointing at a deleted one
    product = await Product.findOne();
    if (!product) {
      product = await Product.create({
        name: "Hardening Test Product",
        slug: `hardening-${stamp}`,
        sku: `HARD-${stamp}`,
        categoryId: "ayurvedic-herbs",
        status: "active",
        basePricePaise: 49900,
      });
      created.products.push(product._id);
    }
  });

  afterAll(async () => {
    const numbers = created.orders.map((o) => o.orderNumber);
    await Shipment.deleteMany({ orderNumber: { $in: numbers } });
    await Payment.deleteMany({ orderNumber: { $in: numbers } });
    await Refund.deleteMany({ orderNumber: { $in: numbers } });
    await WebhookEvent.deleteMany({ "rawPayload.data.order.order_id": { $in: numbers } });
    await Order.deleteMany({ orderNumber: { $in: numbers } });
    await ProductVariant.deleteMany({ _id: { $in: created.variants } });
    await Product.deleteMany({ _id: { $in: created.products } });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  /** A pending online order whose stock is reserved (the state a real checkout leaves it in) */
  const makeOrder = async ({ paymentMethod = "Online Payment", status = ORDER_STATUS.PENDING_PAYMENT, stock = 10, reserved = 1 } = {}) => {
    counter += 1;
    const variant = await ProductVariant.create({
      productId: product._id,
      sku: `HARD-V-${stamp}-${counter}`,
      label: `Pack ${counter}`,
      pricePaise: 49900,
      stockOnHand: stock,
      reservedStock: reserved,
      reorderThreshold: 2,
      isActive: true,
    });
    created.variants.push(variant._id);

    const order = await Order.create({
      orderNumber: `DA-HD-${stamp}-${counter}`,
      customer: { name: "Hardening Customer", email: "hardening@example.test", phone: "9876543210" },
      shippingAddress: { fullName: "Hardening Customer", phone: "9876543210", street: "1 Test Street", city: "Bengaluru", state: "Karnataka", pincode: "560001" },
      items: [
        { productId: product._id, variantId: variant._id, sku: variant.sku, name: "Hardening Test Product", size: variant.label, unitPricePaise: 49900, quantity: 1, lineTotalPaise: 49900, weightGrams: 250 },
      ],
      pricing: { subtotalPaise: 59900, couponDiscountPaise: 10000, shippingPaise: 5000, totalPaise: 54900 },
      paymentMethod,
      status,
      stockState: "reserved",
      paymentStatus: PAYMENT_STATUS.PENDING,
      timeline: [{ status: "Order Placed", time: new Date(), completed: true }],
    });
    created.orders.push(order);
    return { order, variant };
  };

  const postCashfree = (payload, { eventId = `evt_${Date.now()}_${Math.random()}` } = {}) => {
    const rawBody = JSON.stringify(payload);
    const timestamp = Date.now().toString();
    return request(app)
      .post("/api/v1/webhooks/cashfree")
      .set("x-webhook-signature", hmacSha256(`${timestamp}${rawBody}`, cfSecret))
      .set("x-webhook-timestamp", timestamp)
      .set("x-webhook-id", eventId)
      .set("Content-Type", "application/json")
      .send(rawBody);
  };

  const paymentPayload = (orderNumber, status, id = "cf_pay_1", amount = 549) => ({
    type: status === "SUCCESS" ? "PAYMENT_SUCCESS_WEBHOOK" : "PAYMENT_FAILED_WEBHOOK",
    data: { order: { order_id: orderNumber }, payment: { cf_payment_id: id, payment_status: status, payment_amount: amount } },
  });

  describe("Cashfree webhook", () => {
    it("deducts stock exactly once when the same payment is delivered concurrently", async () => {
      const { order, variant } = await makeOrder();
      const payload = paymentPayload(order.orderNumber, "SUCCESS", "cf_pay_race");

      const results = await Promise.all([1, 2, 3].map((n) => postCashfree(payload, { eventId: `race_${stamp}_${n}` })));
      results.forEach((res) => expect([200, 400, 500]).toContain(res.status));

      const fresh = await Order.findOne({ orderNumber: order.orderNumber });
      expect(fresh.status).toBe(ORDER_STATUS.CONFIRMED);
      expect(fresh.paymentStatus).toBe(PAYMENT_STATUS.SUCCEEDED);
      expect(fresh.stockState).toBe("committed");

      const stock = await ProductVariant.findById(variant._id);
      expect(stock.stockOnHand).toBe(9);
      expect(stock.reservedStock).toBe(0);
    });

    it("does not deduct stock a second time when the paid order is later delivered", async () => {
      const { order, variant } = await makeOrder();
      expect((await postCashfree(paymentPayload(order.orderNumber, "SUCCESS", "cf_pay_deliver"))).status).toBe(200);

      await orderService.updateOrderStatus(order.orderNumber, ORDER_STATUS.DELIVERED, "Delivered");

      const stock = await ProductVariant.findById(variant._id);
      expect(stock.stockOnHand).toBe(9);
      expect(stock.reservedStock).toBe(0);
    });

    it("ignores a late FAILED attempt once the order is paid", async () => {
      const { order } = await makeOrder();
      await postCashfree(paymentPayload(order.orderNumber, "SUCCESS", "cf_pay_ok"));
      const res = await postCashfree(paymentPayload(order.orderNumber, "FAILED", "cf_pay_old_attempt"));
      expect(res.status).toBe(200);

      const fresh = await Order.findOne({ orderNumber: order.orderNumber });
      expect(fresh.paymentStatus).toBe(PAYMENT_STATUS.SUCCEEDED);
      expect(fresh.status).toBe(ORDER_STATUS.CONFIRMED);
    });

    it("marks an unpaid order failed on a FAILED event but lets a later success win", async () => {
      const { order, variant } = await makeOrder();
      await postCashfree(paymentPayload(order.orderNumber, "FAILED", "cf_pay_try1"));
      expect((await Order.findOne({ orderNumber: order.orderNumber })).paymentStatus).toBe(PAYMENT_STATUS.FAILED);

      await postCashfree(paymentPayload(order.orderNumber, "SUCCESS", "cf_pay_try2"));
      const fresh = await Order.findOne({ orderNumber: order.orderNumber });
      expect(fresh.paymentStatus).toBe(PAYMENT_STATUS.SUCCEEDED);
      expect(fresh.status).toBe(ORDER_STATUS.CONFIRMED);
      expect((await ProductVariant.findById(variant._id)).stockOnHand).toBe(9);
    });

    it("re-processes an event that failed earlier instead of failing forever", async () => {
      const { order } = await makeOrder();
      const payload = paymentPayload(order.orderNumber, "SUCCESS", "cf_pay_retry");
      const eventId = `retry_${stamp}`;
      await WebhookEvent.create({
        provider: "cashfree",
        eventId,
        eventType: payload.type,
        payloadHash: "previous-attempt-hash",
        rawPayload: payload,
        status: "failed",
        error: "temporary database error",
      });

      const res = await postCashfree(payload, { eventId });
      expect(res.status).toBe(200);
      expect(res.body.result.status).toBe("processed");
      expect((await Order.findOne({ orderNumber: order.orderNumber })).paymentStatus).toBe(PAYMENT_STATUS.SUCCEEDED);
    });

    it("ignores events that carry no payment status (settlements, disputes)", async () => {
      const { order } = await makeOrder();
      const res = await postCashfree({ type: "SETTLEMENT_WEBHOOK", data: { order: { order_id: order.orderNumber }, settlement: { status: "DONE" } } });
      expect(res.status).toBe(200);
      expect(res.body.result.status).toBe("ignored");
      expect((await Order.findOne({ orderNumber: order.orderNumber })).paymentStatus).toBe(PAYMENT_STATUS.PENDING);
    });

    it("rejects a payment whose amount differs from the order total", async () => {
      const { order } = await makeOrder();
      const res = await postCashfree(paymentPayload(order.orderNumber, "SUCCESS", "cf_pay_wrong", 1));
      expect(res.status).toBe(400);
      expect((await Order.findOne({ orderNumber: order.orderNumber })).paymentStatus).toBe(PAYMENT_STATUS.PENDING);
    });

    it("serves the payment status route the storefront calls", async () => {
      const res = await request(app).get("/api/v1/payments/cashfree/orders/DA-DOES-NOT-EXIST/status");
      expect(res.status).toBe(404);
      expect(res.body.error.message).toMatch(/order not found/i);
    });
  });

  describe("Cancelling orders", () => {
    it("puts stock back when a paid order is cancelled", async () => {
      const { order, variant } = await makeOrder();
      await postCashfree(paymentPayload(order.orderNumber, "SUCCESS", "cf_pay_cancel"));
      expect((await ProductVariant.findById(variant._id)).stockOnHand).toBe(9);

      await orderService.cancelOrder(order.orderNumber, "Customer changed mind");

      const stock = await ProductVariant.findById(variant._id);
      expect(stock.stockOnHand).toBe(10);
      expect(stock.reservedStock).toBe(0);
    });

    it("just un-reserves stock when an unpaid order is cancelled", async () => {
      const { order, variant } = await makeOrder();
      await orderService.cancelOrder(order.orderNumber, "Never paid");
      const stock = await ProductVariant.findById(variant._id);
      expect(stock.stockOnHand).toBe(10);
      expect(stock.reservedStock).toBe(0);
    });
  });

  describe("Cancellation side effects", () => {
    const staff = () => ({ _id: new mongoose.Types.ObjectId(), name: "Test Staff", roles: [] });

    it("refunds a paid online order to the original payment method, once", async () => {
      const { order } = await makeOrder();
      await postCashfree(paymentPayload(order.orderNumber, "SUCCESS", "cf_pay_refund"));

      await orderService.cancelOrder(order.orderNumber, "Customer request", staff());

      const fresh = await Order.findOne({ orderNumber: order.orderNumber });
      expect(fresh.status).toBe(ORDER_STATUS.CANCELLED);
      expect(fresh.paymentStatus).toBe(PAYMENT_STATUS.REFUNDED);
      expect(fresh.refundedPaise).toBe(54900);
      const refunds = await Refund.find({ orderNumber: order.orderNumber });
      expect(refunds).toHaveLength(1);
      expect(refunds[0].amountPaise).toBe(54900);
      expect(refunds[0].status).toBe("succeeded");
    });

    it("does not refund an order that was never paid", async () => {
      const { order } = await makeOrder();
      await orderService.cancelOrder(order.orderNumber, "Never paid", staff());
      expect(await Refund.countDocuments({ orderNumber: order.orderNumber })).toBe(0);
    });

    it("cancels the courier booking together with the order", async () => {
      const { order } = await makeOrder({ paymentMethod: "Cash on Delivery (COD)", status: ORDER_STATUS.DISPATCHED });
      await Shipment.create({ orderId: order._id, orderNumber: order.orderNumber, awbCode: `AWB-CX-${stamp}-${counter}`, status: "SHIPPED" });
      const spy = vi.spyOn(shiprocket, "cancelShipment").mockResolvedValue({ success: true });

      await orderService.updateOrderStatus(order.orderNumber, "Cancelled", "Customer request", staff());

      expect(spy).toHaveBeenCalledTimes(1);
      expect((await Shipment.findOne({ orderNumber: order.orderNumber })).status).toBe("CANCELLED");
      expect((await Order.findOne({ orderNumber: order.orderNumber })).status).toBe(ORDER_STATUS.CANCELLED);
    });

    it("keeps the order open when Shiprocket refuses to cancel the shipment", async () => {
      const { order } = await makeOrder({ paymentMethod: "Cash on Delivery (COD)", status: ORDER_STATUS.DISPATCHED });
      await Shipment.create({ orderId: order._id, orderNumber: order.orderNumber, awbCode: `AWB-CY-${stamp}-${counter}`, status: "SHIPPED" });
      vi.spyOn(shiprocket, "cancelShipment").mockResolvedValue({ success: false, message: "Already picked up" });

      await expect(orderService.cancelOrder(order.orderNumber, "Too late", staff())).rejects.toThrow(/did not cancel/i);
      expect((await Order.findOne({ orderNumber: order.orderNumber })).status).toBe(ORDER_STATUS.DISPATCHED);
    });
  });

  describe("Refunds that are still pending after a cancellation", () => {
    const staff = () => ({ _id: new mongoose.Types.ObjectId(), name: "Test Staff", roles: [] });

    const cancelPaidWithPendingRefund = async () => {
      const { order } = await makeOrder();
      await postCashfree(paymentPayload(order.orderNumber, "SUCCESS", `cf_pay_pr_${counter}`));
      vi.spyOn(cashfree, "createRefund").mockResolvedValue({ refundId: "x", cfRefundId: "cf_rf_1", status: "PENDING" });
      await orderService.cancelOrder(order.orderNumber, "Customer request", staff());
      vi.restoreAllMocks();
      const refund = await Refund.findOne({ orderNumber: order.orderNumber });
      const fresh = await Order.findOne({ orderNumber: order.orderNumber });
      expect(refund.status).toBe("pending");
      expect(fresh.paymentStatus).toBe(PAYMENT_STATUS.SUCCEEDED); // not "refunded" until Cashfree confirms
      expect(fresh.refundedPaise).toBe(54900);
      return { order, refund };
    };

    const refundEvent = (order, refund, status) => ({
      type: "REFUND_STATUS_WEBHOOK",
      data: { refund: { refund_id: refund.refundId, order_id: order.orderNumber, cf_refund_id: "cf_rf_1", refund_status: status, refund_amount: 549 } },
    });

    it("marks the order refunded when Cashfree's refund webhook reports success", async () => {
      const { order, refund } = await cancelPaidWithPendingRefund();
      const res = await postCashfree(refundEvent(order, refund, "SUCCESS"));
      expect(res.status).toBe(200);

      expect((await Refund.findById(refund._id)).status).toBe("succeeded");
      const fresh = await Order.findOne({ orderNumber: order.orderNumber });
      expect(fresh.paymentStatus).toBe(PAYMENT_STATUS.REFUNDED);
      expect(fresh.timeline.some((t) => t.status === "Refund completed")).toBe(true);

      // the same event again changes nothing
      await postCashfree(refundEvent(order, refund, "SUCCESS"));
      expect(fresh.refundedPaise).toBe(54900);
    });

    it("flags the order for a manual refund when Cashfree reports the refund failed", async () => {
      const { order, refund } = await cancelPaidWithPendingRefund();
      await postCashfree(refundEvent(order, refund, "FAILED"));

      expect((await Refund.findById(refund._id)).status).toBe("failed");
      const fresh = await Order.findOne({ orderNumber: order.orderNumber });
      expect(fresh.refundedPaise).toBe(0);
      expect(fresh.paymentStatus).toBe(PAYMENT_STATUS.SUCCEEDED);
      expect(fresh.timeline.some((t) => t.status === "Refund failed")).toBe(true);
    });

    it("finishes a pending refund by asking Cashfree when no webhook arrived", async () => {
      const { order, refund } = await cancelPaidWithPendingRefund();
      await Refund.collection.updateOne({ _id: refund._id }, { $set: { createdAt: new Date(Date.now() - 60 * 60 * 1000) } });

      const result = await paymentService.syncPendingCancelRefunds();
      expect(result.updated).toBeGreaterThanOrEqual(1);
      expect((await Refund.findById(refund._id)).status).toBe("succeeded");
      expect((await Order.findOne({ orderNumber: order.orderNumber })).paymentStatus).toBe(PAYMENT_STATUS.REFUNDED);
    });
  });

  describe("Automatic shipment creation", () => {
    const waitFor = async (check, ms = 2000) => {
      const end = Date.now() + ms;
      while (Date.now() < end) {
        const value = await check();
        if (value) return value;
        await new Promise((r) => setTimeout(r, 25));
      }
      return null;
    };

    const live = () => {
      const original = shiprocket.isMock;
      shiprocket.isMock = false;
      return () => {
        shiprocket.isMock = original;
      };
    };

    it("books the courier as soon as an online payment is confirmed", async () => {
      const restore = live();
      try {
        const spy = vi.spyOn(shiprocket, "createShipment").mockResolvedValue({
          shiprocketOrderId: "sr-auto", shipmentId: "ship-auto", awbCode: `AWB-AUTO-${stamp}`, courierName: "Delhivery",
          courierId: "5", trackingUrl: "https://t/x", labelUrl: "https://l/x.pdf", status: "AWB_ASSIGNED",
        });
        const { order } = await makeOrder();
        await postCashfree(paymentPayload(order.orderNumber, "SUCCESS", "cf_pay_auto"));

        const shipment = await waitFor(() => Shipment.findOne({ orderNumber: order.orderNumber, awbCode: { $exists: true } }));
        expect(shipment?.awbCode).toBe(`AWB-AUTO-${stamp}`);
        expect(spy).toHaveBeenCalledTimes(1);
        const dispatched = await waitFor(async () => (await Order.findOne({ orderNumber: order.orderNumber })).status === ORDER_STATUS.DISPATCHED);
        expect(dispatched).toBe(true);
      } finally {
        restore();
      }
    });

    it("never touches the courier while the mock adapter is in use", async () => {
      const spy = vi.spyOn(shiprocket, "createShipment");
      const { order } = await makeOrder();
      await postCashfree(paymentPayload(order.orderNumber, "SUCCESS", "cf_pay_nomock"));
      await new Promise((r) => setTimeout(r, 150));
      expect(spy).not.toHaveBeenCalled();
      expect(await Shipment.countDocuments({ orderNumber: order.orderNumber })).toBe(0);
    });

    it("leaves a note for staff instead of failing when Shiprocket rejects the order", async () => {
      const restore = live();
      try {
        vi.spyOn(shiprocket, "createShipment").mockRejectedValue(new Error("Pickup location not found."));
        const { order } = await makeOrder();
        await postCashfree(paymentPayload(order.orderNumber, "SUCCESS", "cf_pay_autofail"));

        const flagged = await waitFor(async () => {
          const o = await Order.findOne({ orderNumber: order.orderNumber });
          return o.timeline.find((t) => t.status === "Automatic dispatch needs attention");
        });
        expect(flagged?.note).toMatch(/Pickup location not found/);
        const fresh = await Order.findOne({ orderNumber: order.orderNumber });
        expect(fresh.paymentStatus).toBe(PAYMENT_STATUS.SUCCEEDED); // the payment itself is unaffected
        expect(fresh.status).toBe(ORDER_STATUS.CONFIRMED);
      } finally {
        restore();
      }
    });
  });

  describe("Shiprocket tracking webhook", () => {
    const sendTracking = (payload) => request(app).post("/api/v1/webhooks/shiprocket").set("x-api-key", srSecret).send(payload);

    const makeShippedOrder = async () => {
      const { order, variant } = await makeOrder({ paymentMethod: "Cash on Delivery (COD)", status: ORDER_STATUS.DISPATCHED, reserved: 1 });
      const awb = `AWB-HD-${stamp}-${counter}`;
      await Shipment.create({ orderId: order._id, orderNumber: order.orderNumber, awbCode: awb, courierName: "Delhivery", status: "SHIPPED" });
      return { order, variant, awb };
    };

    it("maps statuses with spaces and never moves a delivered order backwards", async () => {
      const { order, variant, awb } = await makeShippedOrder();

      expect((await sendTracking({ awb, current_status: "OUT FOR DELIVERY", current_timestamp: "2026-10-31 10:00:00" })).status).toBe(200);
      expect((await Order.findOne({ orderNumber: order.orderNumber })).status).toBe(ORDER_STATUS.OUT_FOR_DELIVERY);

      await sendTracking({ awb, current_status: "DELIVERED", current_timestamp: "2026-10-31 15:00:00" });
      const delivered = await Order.findOne({ orderNumber: order.orderNumber });
      expect(delivered.status).toBe(ORDER_STATUS.DELIVERED);
      expect(delivered.stockState).toBe("committed");
      expect((await ProductVariant.findById(variant._id)).stockOnHand).toBe(9);

      await sendTracking({ awb, current_status: "IN TRANSIT", current_timestamp: "2026-10-31 09:00:00" });
      expect((await Order.findOne({ orderNumber: order.orderNumber })).status).toBe(ORDER_STATUS.DELIVERED);
    });

    it("records return-to-origin without changing the order status", async () => {
      const { order, awb } = await makeShippedOrder();
      await sendTracking({ awb, current_status: "RTO INITIATED", current_timestamp: "2026-10-31 12:00:00" });
      const fresh = await Order.findOne({ orderNumber: order.orderNumber });
      expect(fresh.status).toBe(ORDER_STATUS.DISPATCHED);
      expect(fresh.timeline.some((t) => t.status === "Returning to origin")).toBe(true);
    });

    it("rejects a request with the wrong token", async () => {
      const res = await request(app).post("/api/v1/webhooks/shiprocket").set("x-api-key", "wrong").send({ awb: "x", current_status: "DELIVERED" });
      expect(res.status).toBe(401);
    });
  });

  describe("Shipment creation", () => {
    it("creates only one shipment when dispatch is triggered twice at once", async () => {
      const { order } = await makeOrder({ status: ORDER_STATUS.CONFIRMED });
      const results = await Promise.allSettled([
        shipmentService.createShipmentForOrder(order.orderNumber),
        shipmentService.createShipmentForOrder(order.orderNumber),
      ]);
      expect(results.some((r) => r.status === "fulfilled")).toBe(true);
      expect(await Shipment.countDocuments({ orderNumber: order.orderNumber })).toBe(1);
      expect((await Order.findOne({ orderNumber: order.orderNumber })).status).toBe(ORDER_STATUS.DISPATCHED);
    });

    it("does not mark an order dispatched when no courier could be assigned", async () => {
      const { order } = await makeOrder({ status: ORDER_STATUS.CONFIRMED });
      const { shiprocket } = await import("../../src/integrations/shiprocket/shiprocket.adapter.js");
      vi.spyOn(shiprocket, "createShipment").mockResolvedValue({
        orderNumber: order.orderNumber,
        shiprocketOrderId: "sr-1",
        shipmentId: "ship-1",
        awbCode: null,
        courierName: "",
        status: "PROCESSING",
      });

      await expect(shipmentService.createShipmentForOrder(order.orderNumber)).rejects.toThrow(/no courier/i);
      const fresh = await Order.findOne({ orderNumber: order.orderNumber });
      expect(fresh.status).toBe(ORDER_STATUS.CONFIRMED);
      const shipment = await Shipment.findOne({ orderNumber: order.orderNumber });
      expect(shipment.status).toBe("PROCESSING");
      expect(shipment.awbCode).toBeFalsy();
    });
  });

  describe("Shiprocket order payload", () => {
    const run = async (orderData) => {
      const adapter = new ShiprocketAdapter();
      adapter.isMock = false;
      adapter.cachedToken = "token";
      adapter.cachedTokenExpiresAt = Date.now() + 100000;
      const sent = [];
      vi.stubGlobal("fetch", async (url, init) => {
        sent.push({ url, body: init?.body ? JSON.parse(init.body) : null });
        if (String(url).includes("orders/create/adhoc")) {
          return new Response(JSON.stringify({ order_id: 11, shipment_id: 22 }), { status: 200 });
        }
        if (String(url).includes("assign/awb")) {
          return new Response(JSON.stringify({ response: { data: { awb_code: "AWB123", courier_name: "Delhivery", courier_company_id: 5 } } }), { status: 200 });
        }
        return new Response(JSON.stringify({ label_url: "https://x/label.pdf" }), { status: 200 });
      });
      const result = await adapter.createShipment(orderData);
      vi.unstubAllGlobals();
      return { result, sent };
    };

    const base = {
      orderNumber: "DA-PAYLOAD-1",
      items: [{ name: "Shilajit", sku: "SKU1", quantity: 2, unitPricePaise: 49900 }],
      customer: { name: "A", email: "a@example.test", phone: "+91 98765 43210" },
      shippingAddress: { fullName: "A B", street: "1 Street", city: "Pune", state: "Maharashtra", pincode: "411001", phone: "9876543210" },
      pricing: { subtotalPaise: 119800, shippingPaise: 5000, totalPaise: 94800 },
      weightGrams: 500,
    };

    it("sends a COD order as COD with the amount the courier must collect", async () => {
      const { result, sent } = await run({ ...base, paymentMethod: "Cash on Delivery (COD)" });
      const body = sent.find((s) => s.url.includes("orders/create/adhoc")).body;
      expect(body.payment_method).toBe("COD");
      expect(body.order_items[0].selling_price).toBe(499);
      expect(body.order_items[0].units).toBe(2);
      expect(body.sub_total + body.shipping_charges - body.total_discount).toBeCloseTo(948, 2);
      expect(body.pickup_location).toBe(config.SHIPROCKET_PICKUP_LOCATION);
      expect(body.order_date).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/);
      expect(body.billing_phone).toBe("9876543210");
      expect(body.weight).toBe(0.5);
      expect(result.awbCode).toBe("AWB123");
    });

    it("sends an online-paid order as Prepaid", async () => {
      const { sent } = await run({ ...base, paymentMethod: "Online Payment" });
      expect(sent.find((s) => s.url.includes("orders/create/adhoc")).body.payment_method).toBe("Prepaid");
    });

    it("refuses an item without a valid price", async () => {
      await expect(run({ ...base, paymentMethod: "Online Payment", items: [{ name: "X", sku: "S", quantity: 1 }] })).rejects.toThrow(/valid price/i);
    });
  });
});
