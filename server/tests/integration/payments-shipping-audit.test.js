import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import mongoose from "mongoose";
import request from "supertest";
import app from "../../src/app.js";
import { Order } from "../../src/models/Order.js";
import { Payment } from "../../src/models/Payment.js";
import { Shipment } from "../../src/models/Shipment.js";
import { WebhookEvent } from "../../src/models/WebhookEvent.js";
import { Product } from "../../src/models/Product.js";
import { ProductVariant } from "../../src/models/ProductVariant.js";
import { config } from "../../src/config/index.js";
import { cashfree } from "../../src/integrations/cashfree/cashfree.adapter.js";
import { shiprocket } from "../../src/integrations/shiprocket/shiprocket.adapter.js";
import { shipmentService } from "../../src/services/shipment.service.js";
import { orderService } from "../../src/services/order.service.js";
import { returnUrlFor } from "../../src/utils/allowedOrigins.js";
import { remainingQuantity, stockLinesOf, cancelledValuePaise, amountDueAfterCancellationsPaise } from "../../src/utils/orderLines.js";
import { ORDER_STATUS } from "../../src/constants/orderStatus.js";

/**
 * Found by the Cashfree / Shiprocket audit: where the payment returns to, courier bookings after a partial
 * cancellation (items, COD amount, stock), webhooks without an AWB, and the amounts sent to the courier.
 */
describe.sequential("Cashfree & Shiprocket audit fixes", () => {
  const stamp = Date.now();
  const created = { orders: [], products: [], variants: [] };
  const srToken = config.SHIPROCKET_WEBHOOK_SECRET || "test_shiprocket_webhook_secret_999";
  let product;
  let counter = 0;

  beforeAll(async () => {
    product = await Product.create({
      name: `Audit ${stamp}`, slug: `audit-${stamp}`, sku: `AUDIT-${stamp}`, categoryId: "wellness-essentials",
      description: "x", status: "active", basePricePaise: 50000,
    });
    created.products.push(product._id);
  });

  afterAll(async () => {
    const numbers = created.orders;
    await Shipment.deleteMany({ orderNumber: { $in: numbers } });
    await Payment.deleteMany({ orderNumber: { $in: numbers } });
    await WebhookEvent.deleteMany({ provider: "shiprocket", "rawPayload.audit": stamp });
    await Order.deleteMany({ orderNumber: { $in: numbers } });
    await ProductVariant.deleteMany({ _id: { $in: created.variants } });
    await Product.deleteMany({ _id: { $in: created.products } });
  });

  afterEach(() => vi.restoreAllMocks());

  const makeVariant = async (stockOnHand = 20, reservedStock = 0) => {
    counter += 1;
    const v = await ProductVariant.create({
      productId: product._id, sku: `AUD-${stamp}-${counter}`, label: `Pack ${counter}`, pricePaise: 50000,
      stockOnHand, reservedStock, reorderThreshold: 2, isActive: true,
    });
    created.variants.push(v._id);
    return v;
  };

  /** An order with a pricing snapshot: line A (qty 2, ₹500 each, ₹100 discount share), line B (qty 1, ₹300) */
  const makeOrder = async ({ method = "Cash on Delivery (COD)", status = ORDER_STATUS.CONFIRMED, cancelledA = 0, gstMode = "inclusive", withVariant = false } = {}) => {
    counter += 1;
    const orderNumber = `DA-AUD-${stamp}-${counter}`;
    const vA = withVariant ? await makeVariant(20, 2 - cancelledA) : null;
    const items = [
      { variantId: vA?._id, productId: product._id, sku: "A", name: "Item A", size: "Std", unitPricePaise: 50000, quantity: 2, lineTotalPaise: 100000, mrpUnitPaise: 50000, discountPaise: 10000, gstRate: 12, taxablePaise: 80357, taxPaise: 9643, cancelledQuantity: cancelledA, weightGrams: 200 },
      { productId: product._id, sku: "B", name: "Item B", size: "Std", unitPricePaise: 30000, quantity: 1, lineTotalPaise: 30000, mrpUnitPaise: 30000, discountPaise: 0, gstRate: 12, taxablePaise: 26786, taxPaise: 3214, weightGrams: 100 },
    ];
    const order = await Order.create({
      orderNumber,
      customer: { name: "Audit Buyer", email: "audit@example.test", phone: "9876543210" },
      shippingAddress: { fullName: "Audit Buyer", phone: "9876543210", street: "1 Audit Road", city: "Pune", state: "Maharashtra", pincode: "411001" },
      items,
      // goods 1,300 - ₹100 offer + ₹50 delivery = ₹1,250
      pricing: { subtotalPaise: 130000, couponDiscountPaise: 10000, shippingPaise: 5000, taxPaise: 12857, totalPaise: 125000, sellingSubtotalPaise: 130000, gstMode },
      paymentMethod: method,
      status,
      stockState: withVariant ? "reserved" : "none",
      paymentStatus: method.includes("Online") ? "paid" : "pending",
      timeline: [{ status: "Order Placed", time: new Date(), completed: true }],
    });
    created.orders.push(orderNumber);
    return order;
  };

  describe("where the customer returns after paying", () => {
    it("only our own storefront addresses are accepted, www or not", () => {
      expect(returnUrlFor("https://divyamayurveda.in", "DA-1")).toBe("https://divyamayurveda.in/order-confirmation/DA-1?order_id={order_id}");
      expect(returnUrlFor("https://www.divyamayurveda.in/", "DA-1")).toBe("https://www.divyamayurveda.in/order-confirmation/DA-1?order_id={order_id}");
      expect(returnUrlFor("https://evil.example.com", "DA-1")).toBeNull();
      expect(returnUrlFor("https://divyamayurveda.in.evil.com", "DA-1")).toBeNull();
      expect(returnUrlFor("javascript:alert(1)", "DA-1")).toBeNull();
      expect(returnUrlFor("", "DA-1")).toBeNull();
    });

    it("the order's payment session carries the customer's own site as the return address, never a stranger's", async () => {
      const v = await makeVariant(20);
      const place = (returnOrigin) =>
        request(app).post("/api/v1/orders").send({
          customer: { name: "Return Buyer", email: "return@example.test", phone: "9876543210" },
          shippingAddress: { street: "1 Road", city: "Mumbai", state: "Maharashtra", pincode: "400001" },
          items: [{ productId: String(product._id), name: product.name, size: v.label, price: 500, quantity: 1 }],
          pricing: {},
          paymentMethod: "Online Payment",
          returnOrigin,
        });
      const spy = vi.spyOn(cashfree, "createPaymentSession");

      const www = await place("https://www.divyamayurveda.in");
      expect(www.status).toBe(201);
      created.orders.push(www.body.data.orderNumber);
      expect(spy.mock.calls.at(-1)[0].returnUrl).toBe(`https://www.divyamayurveda.in/order-confirmation/${www.body.data.orderNumber}?order_id={order_id}`);

      const evil = await place("https://evil.example.com");
      expect(evil.status).toBe(201);
      created.orders.push(evil.body.data.orderNumber);
      expect(spy.mock.calls.at(-1)[0].returnUrl).toBeNull(); // falls back to the configured storefront address
    });
  });

  describe("Shiprocket tracking webhook", () => {
    it("an event without an AWB is acknowledged but never applied to some other shipment", async () => {
      const order = await makeOrder({ status: ORDER_STATUS.CONFIRMED });
      // A shipment that exists at Shiprocket but has no courier assigned yet: it has no AWB
      const shipment = await Shipment.create({ orderId: order._id, orderNumber: order.orderNumber, shiprocketOrderId: `sr-${stamp}`, shipmentId: `ship-${stamp}`, status: "PROCESSING" });

      const res = await request(app).post("/api/v1/webhooks/courier").set("x-api-key", srToken).send({ audit: stamp, current_status: "DELIVERED" });
      expect(res.status).toBe(200);
      expect(res.body.result.status).toBe("ignored");

      expect((await Shipment.findById(shipment._id)).status).toBe("PROCESSING");
      expect((await Order.findById(order._id)).status).toBe(ORDER_STATUS.CONFIRMED);
    });

    it("an event with a wrong token is still refused", async () => {
      const res = await request(app).post("/api/v1/webhooks/courier").set("x-api-key", "wrong").send({ awb: "X", current_status: "DELIVERED" });
      expect(res.status).toBe(401);
    });
  });

  describe("orders that were partly cancelled", () => {
    it("remaining quantity and the value still owed are worked out from the saved snapshot", async () => {
      const none = await makeOrder();
      expect(remainingQuantity(none.items[0])).toBe(2);
      expect(cancelledValuePaise(none)).toBe(0);
      expect(amountDueAfterCancellationsPaise(none)).toBe(125000);

      // one of the two ₹500 units cancelled: ₹500 less its half of the ₹100 discount = ₹450
      const part = await makeOrder({ cancelledA: 1, status: ORDER_STATUS.PARTIALLY_CANCELLED });
      expect(remainingQuantity(part.items[0])).toBe(1);
      expect(cancelledValuePaise(part)).toBe(45000);
      expect(amountDueAfterCancellationsPaise(part)).toBe(80000); // ₹1,250 − ₹450 (delivery stays)
      expect(stockLinesOf({ items: [{ ...part.items[0].toObject(), variantId: new mongoose.Types.ObjectId() }] })[0].quantity).toBe(1);

      // GST added on top: the cancelled unit's tax comes back too
      const exclusive = await makeOrder({ cancelledA: 1, gstMode: "exclusive" });
      expect(cancelledValuePaise(exclusive)).toBe(45000 + Math.round(9643 / 2));

      // an order saved before the pricing snapshot: unit price only
      const legacy = await makeOrder({ cancelledA: 1 });
      legacy.items.forEach((i) => (i.mrpUnitPaise = 0));
      expect(cancelledValuePaise(legacy)).toBe(50000);
    });

    it("can still be dispatched; the courier gets only the remaining items and a COD amount that excludes the cancelled unit", async () => {
      const order = await makeOrder({ cancelledA: 1, status: ORDER_STATUS.PARTIALLY_CANCELLED });
      const spy = vi.spyOn(shiprocket, "createShipment").mockResolvedValue({
        shiprocketOrderId: "sr-p", shipmentId: "ship-p", awbCode: `AWB-P-${stamp}`, courierName: "Delhivery", courierId: "5",
        trackingUrl: "https://t/p", labelUrl: "https://l/p.pdf", status: "AWB_ASSIGNED", pickupRequested: true,
      });

      await shipmentService.createShipmentForOrder(order.orderNumber);

      expect(spy).toHaveBeenCalledTimes(1);
      const sent = spy.mock.calls[0][0];
      expect(sent.items.map((i) => [i.sku, i.quantity])).toEqual([["A", 1], ["B", 1]]);
      expect(sent.pricing.totalPaise).toBe(80000);
      expect(sent.weightGrams).toBe(200 + 100); // one unit of A + B, not both units of A
      expect((await Order.findById(order._id)).status).toBe(ORDER_STATUS.DISPATCHED);
    });

    it("an order with every unit cancelled has nothing to ship", async () => {
      const order = await makeOrder({ status: ORDER_STATUS.PARTIALLY_CANCELLED });
      await Order.updateOne({ _id: order._id }, { $set: { "items.0.cancelledQuantity": 2, "items.1.cancelledQuantity": 1 } });
      vi.spyOn(shiprocket, "createShipment");
      await expect(shipmentService.createShipmentForOrder(order.orderNumber)).rejects.toThrow(/nothing to ship/i);
    });

    it("cancelling the rest of a partly cancelled order releases only the units that are left", async () => {
      // 2 ordered, 1 already cancelled (released earlier): only 1 is still reserved
      const order = await makeOrder({ cancelledA: 1, withVariant: true, status: ORDER_STATUS.PARTIALLY_CANCELLED });
      const variantId = order.items[0].variantId;
      await orderService.cancelOrder(order.orderNumber, "Rest cancelled", { _id: new mongoose.Types.ObjectId(), id: "staff", isStaff: true });
      const v = await ProductVariant.findById(variantId);
      expect(v.reservedStock).toBe(0); // not -1: the cancelled unit is not released twice
      expect(v.stockOnHand).toBe(20);
    });

    it("delivery deducts only the units that are left; cancelled units are not deducted twice", async () => {
      // 2 ordered, 1 cancelled earlier (its reservation was already released): 1 unit still reserved
      const order = await makeOrder({ cancelledA: 1, withVariant: true });
      const variantId = order.items[0].variantId;
      expect((await ProductVariant.findById(variantId)).reservedStock).toBe(1);

      await orderService.updateOrderStatus(order.orderNumber, "delivered", "", { _id: new mongoose.Types.ObjectId(), id: "staff", isStaff: true });

      const v = await ProductVariant.findById(variantId);
      expect(v.stockOnHand).toBe(19); // 20 − the one delivered unit
      expect(v.reservedStock).toBe(0);
    });
  });

  describe("amounts sent to Shiprocket", () => {
    const stubFetch = () => {
      const calls = [];
      vi.stubGlobal("fetch", async (url, init = {}) => {
        const u = String(url);
        calls.push({ url: u, body: init.body ? JSON.parse(init.body) : null });
        const json = (data) => ({ ok: true, status: 200, json: async () => data });
        if (u.includes("auth/login")) return json({ token: "t" });
        if (u.includes("orders/create/adhoc")) return json({ order_id: 11, shipment_id: 22, awb_code: "AWB-X", courier_name: "Delhivery", courier_company_id: 5 });
        if (u.includes("generate/label")) return json({ label_created: 1, label_url: "https://l/x.pdf" });
        return json({});
      });
      return calls;
    };
    const live = () => {
      const original = shiprocket.isMock;
      shiprocket.isMock = false;
      shiprocket.cachedToken = null;
      return () => {
        shiprocket.isMock = original;
        vi.unstubAllGlobals();
      };
    };
    const base = (totalPaise, method = "Cash on Delivery (COD)") => ({
      orderNumber: "DA-SR-1",
      items: [{ name: "A", sku: "A", quantity: 1, unitPricePaise: 100000 }],
      customer: { name: "N", email: "n@example.test", phone: "9876543210" },
      shippingAddress: { fullName: "N", phone: "9876543210", street: "1 Road", city: "Pune", state: "Maharashtra", pincode: "411001" },
      paymentMethod: method,
      pricing: { shippingPaise: 5000, totalPaise },
      weightGrams: 250,
    });

    it("COD collects exactly the total: a discount reduces it, GST added on top is sent as a charge", async () => {
      const restore = live();
      try {
        const calls = stubFetch();
        await shiprocket.createShipment(base(100000)); // goods 1,000 + delivery 50, customer owes 1,000 (₹50 off)
        let body = calls.find((c) => c.url.includes("orders/create/adhoc")).body;
        expect(body).toMatchObject({ payment_method: "COD", sub_total: 1000, shipping_charges: 50, total_discount: 50 });
        expect(body.transaction_charges).toBeUndefined();

        calls.length = 0;
        await shiprocket.createShipment(base(112000)); // GST of ₹70 added on top of goods + delivery
        body = calls.find((c) => c.url.includes("orders/create/adhoc")).body;
        expect(body.total_discount).toBe(0);
        expect(body.transaction_charges).toBe(70);
        expect(body.sub_total + body.shipping_charges - body.total_discount + body.transaction_charges).toBe(1120);
      } finally {
        restore();
      }
    });

    it("a prepaid order is sent as Prepaid", async () => {
      const restore = live();
      try {
        const calls = stubFetch();
        await shiprocket.createShipment(base(105000, "Online Payment"));
        expect(calls.find((c) => c.url.includes("orders/create/adhoc")).body.payment_method).toBe("Prepaid");
      } finally {
        restore();
      }
    });
  });
});

describe.sequential("Sign-in at checkout and refund status", () => {
  const stamp = Date.now() + 7;
  const created = { orders: [], emails: [], variants: [], products: [] };
  let product;
  let variant;

  beforeAll(async () => {
    product = await Product.create({ name: `Cookie ${stamp}`, slug: `cookie-${stamp}`, sku: `COOKIE-${stamp}`, categoryId: "wellness-essentials", description: "x", status: "active", basePricePaise: 50000 });
    variant = await ProductVariant.create({ productId: product._id, sku: `COOKIE-${stamp}-S`, label: "Std", pricePaise: 50000, stockOnHand: 50, isActive: true });
  });

  afterAll(async () => {
    const { User } = await import("../../src/models/User.js");
    const { Refund } = await import("../../src/models/Refund.js");
    await Refund.deleteMany({ orderNumber: { $in: created.orders } });
    await Payment.deleteMany({ orderNumber: { $in: created.orders } });
    await Order.deleteMany({ orderNumber: { $in: created.orders } });
    await ProductVariant.deleteMany({ productId: product._id });
    await Product.deleteOne({ _id: product._id });
    await User.deleteMany({ email: { $in: created.emails } });
  });

  const register = async (n) => {
    const email = `cookie.${stamp}.${n}@example.test`;
    created.emails.push(email);
    const res = await request(app).post("/api/v1/auth/register").send({ name: "Cookie Buyer", email, phone: `9${String(stamp + n).slice(-9)}`, phoneCountryCode: "+91", password: "Secret123", confirmPassword: "Secret123" });
    expect(res.status).toBe(201);
    const cookies = res.headers["set-cookie"] || [];
    return { res, cookies, email, token: res.body.data.tokens.accessToken };
  };
  const body = (email, method = "Cash on Delivery (COD)") => ({
    customer: { name: "Cookie Buyer", email, phone: "9876543210" },
    shippingAddress: { street: "1 Road", city: "Mumbai", state: "Maharashtra", pincode: "400001" },
    items: [{ productId: String(product._id), name: product.name, size: "Std", price: 500, quantity: 1 }],
    pricing: {},
    paymentMethod: method,
  });

  it("registering signs the customer in: both session cookies are set", async () => {
    const { cookies } = await register(1);
    expect(cookies.some((c) => c.startsWith("accessToken="))).toBe(true);
    expect(cookies.some((c) => c.startsWith("refreshToken="))).toBe(true);
  });

  it("an order placed right after registering belongs to the account (cookie only, as the storefront sends it)", async () => {
    const { cookies, email } = await register(2);
    const cookieHeader = cookies.map((c) => c.split(";")[0]).join("; ");
    const res = await request(app).post("/api/v1/orders").set("Cookie", cookieHeader).send(body(email));
    expect(res.status).toBe(201);
    created.orders.push(res.body.data.orderNumber);
    expect(res.body.data.isGuest).toBe(false);
    expect(res.body.data.guestAccess).toBeUndefined();
  });

  it("a stale header token does not turn a signed-in customer into a guest when their cookie is still good", async () => {
    const { cookies, email } = await register(3);
    const cookieHeader = cookies.map((c) => c.split(";")[0]).join("; ");
    const res = await request(app).post("/api/v1/orders").set("Authorization", "Bearer not.a.valid.token").set("Cookie", cookieHeader).send(body(email));
    expect(res.status).toBe(201);
    created.orders.push(res.body.data.orderNumber);
    expect(res.body.data.isGuest).toBe(false);
  });

  it("with no session at all it is still a guest order", async () => {
    const res = await request(app).post("/api/v1/orders").send(body(`nobody.${stamp}@example.test`));
    expect(res.status).toBe(201);
    created.orders.push(res.body.data.orderNumber);
    expect(res.body.data.isGuest).toBe(true);
  });

  it("cancelling a paid online order refunds it and the order shows the refund as completed", async () => {
    const { token, email } = await register(4);
    const placed = await request(app).post("/api/v1/orders").set("Authorization", `Bearer ${token}`).send(body(email, "Online Payment"));
    expect(placed.status).toBe(201);
    const orderNumber = placed.body.data.orderNumber;
    created.orders.push(orderNumber);
    await Order.updateOne({ orderNumber }, { $set: { paymentStatus: "paid", status: "confirmed" } });

    const staff = { _id: new mongoose.Types.ObjectId(), id: "staff", name: "Staff", isStaff: true };
    await orderService.cancelOrder(orderNumber, "Customer asked", staff);

    const order = await Order.findOne({ orderNumber }).lean();
    expect(order.status).toBe("cancelled");
    expect(order.refundedPaise).toBe(order.pricing.totalPaise);
    expect(order.paymentStatus).toBe("refunded");
    expect(order.refundStatus).toBe("completed");
  });
});
