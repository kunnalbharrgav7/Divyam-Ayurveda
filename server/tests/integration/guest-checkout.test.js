import { describe, it, expect, beforeAll, afterAll, afterEach, vi } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { User } from "../../src/models/User.js";
import { Role } from "../../src/models/Role.js";
import { Order } from "../../src/models/Order.js";
import { Payment } from "../../src/models/Payment.js";
import { Product } from "../../src/models/Product.js";
import { ProductVariant } from "../../src/models/ProductVariant.js";
import { Coupon } from "../../src/models/Coupon.js";
import { WebhookEvent } from "../../src/models/WebhookEvent.js";
import { ROLES } from "../../src/constants/roles.js";
import { ALL_PERMISSIONS } from "../../src/constants/permissions.js";
import { generateAccessToken } from "../../src/utils/token.js";
import { hmacSha256 } from "../../src/utils/crypto.js";
import { config } from "../../src/config/index.js";
import { hashToken, normalizeTrackingCode } from "../../src/utils/guestAccess.js";
import { marketingService } from "../../src/services/marketing.service.js";
import { metaCapi } from "../../src/integrations/meta/metaCapi.adapter.js";

/**
 * Guest checkout: placing orders without an account, private tracking, linking an order to an account later,
 * guest online payment, staff tools and the Meta Purchase event. No OTP anywhere.
 */
describe.sequential("Guest checkout", () => {
  const stamp = Date.now();
  const guestEmail = `guest.${stamp}@example.test`;
  const created = { users: [], orders: [] };
  let product;
  let adminAuth;

  const register = async (name, email, n) => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({ name, email, phone: `9${String(stamp + n).slice(-9)}`, phoneCountryCode: "+91", password: "Secret123", confirmPassword: "Secret123" });
    expect(res.status).toBe(201);
    created.users.push(email);
    return { Authorization: `Bearer ${res.body.data.tokens.accessToken}` };
  };

  const guestPayload = (overrides = {}) => ({
    customer: { name: "Guest Buyer", email: guestEmail, phone: "9876501234" },
    shippingAddress: { street: "12 Private Lane, Indiranagar", line2: "Near Metro", city: "Bengaluru", state: "Karnataka", pincode: "560038" },
    items: [{ productId: String(product._id), name: product.name, size: "Standard", price: 500, quantity: 1 }],
    pricing: { subtotal: 500, total: 500 },
    paymentMethod: "Cash on Delivery (COD)",
    attribution: { fbp: "fb.1.1700000000000.123", fbc: "fb.1.1700000000000.abc", utmSource: "facebook", utmCampaign: "launch" },
    ...overrides,
  });

  const placeGuestOrder = async (overrides = {}) => {
    const res = await request(app).post("/api/v1/orders").send(guestPayload(overrides));
    expect(res.status).toBe(201);
    created.orders.push(res.body.data.orderNumber);
    return res.body.data;
  };

  beforeAll(async () => {
    product = await Product.create({
      name: `Guest Product ${stamp}`,
      slug: `guest-product-${stamp}`,
      sku: `GUEST-${stamp}`,
      categoryId: "wellness-essentials",
      description: "x",
      status: "active",
      basePricePaise: 50000,
    });
    await ProductVariant.create({ productId: product._id, sku: `GUEST-${stamp}-S`, label: "Standard", pricePaise: 50000, stockOnHand: 100, isActive: true });

    let role = await Role.findOne({ name: ROLES.SUPER_ADMIN });
    if (!role) role = await Role.create({ name: ROLES.SUPER_ADMIN, description: "Super Administrator", permissions: ALL_PERMISSIONS });
    let admin = await User.findOne({ email: "admin@divyamayurveda.demo" });
    if (!admin) {
      admin = await User.create({ name: "Super Admin", email: "admin@divyamayurveda.demo", passwordHash: "testHash123", isStaff: true, isOwner: true, roles: [role._id] });
    }
    adminAuth = { Authorization: `Bearer ${generateAccessToken({ id: admin._id, email: admin.email, isStaff: true })}` };
  });

  afterAll(async () => {
    await Payment.deleteMany({ orderNumber: { $in: created.orders } });
    await WebhookEvent.deleteMany({ "rawPayload.data.order.order_id": { $in: created.orders } });
    await Order.deleteMany({ orderNumber: { $in: created.orders } });
    await ProductVariant.deleteMany({ productId: product._id });
    await Product.deleteOne({ _id: product._id });
    await Coupon.deleteMany({ code: `GUESTONCE${stamp}` });
    await User.deleteMany({ email: { $in: created.users } });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("placing an order without an account", () => {
    it("creates a guest order and returns a private tracking code and claim token exactly once", async () => {
      const order = await placeGuestOrder();
      expect(order.orderNumber).toMatch(/^DA-/);
      expect(order.isGuest).toBe(true);
      expect(order.userId).toBeNull();
      expect(order.guestAccess.trackingCode).toMatch(/^[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}-[0-9A-Z]{4}$/);
      expect(order.guestAccess.claimToken).toMatch(/^[A-Za-z0-9_-]{43}$/);

      // Stored as hashes only; secrets, ad data and staff notes never appear in normal order JSON
      const stored = await Order.findOne({ orderNumber: order.orderNumber }).lean();
      const code = normalizeTrackingCode(order.guestAccess.trackingCode);
      expect(stored.guestAccess.trackingTokenHash).toBe(hashToken(code));
      expect(stored.guestAccess.claimTokenHash).toBe(hashToken(order.guestAccess.claimToken));
      expect(JSON.stringify(stored)).not.toContain(code);
      expect(stored.checkoutType).toBe("guest");
      expect(stored.attribution.utmSource).toBe("facebook");
      const json = (await Order.findOne({ orderNumber: order.orderNumber })).toJSON();
      expect(json.guestAccess).toBeUndefined();
      expect(json.attribution).toBeUndefined();
      expect(json.adminNotes).toBeUndefined();
    });

    it("ignores any user id sent in the request body (ownership comes from the session only)", async () => {
      const victimAuth = await register("Victim", `victim.${stamp}@example.test`, 11);
      const victim = await User.findOne({ email: `victim.${stamp}@example.test` });
      const order = await placeGuestOrder({ userId: String(victim._id), user: { _id: String(victim._id) } });
      expect(order.userId).toBeNull();
      const mine = await request(app).get("/api/v1/me/orders").set(victimAuth);
      expect(mine.body.data.map((o) => o.orderNumber)).not.toContain(order.orderNumber);
    });

    it("still validates contact and address details for guests", async () => {
      const noPhone = await request(app).post("/api/v1/orders").send(guestPayload({ customer: { name: "G", email: guestEmail, phone: "12" } }));
      expect(noPhone.status).toBe(400);
      const noPin = await request(app).post("/api/v1/orders").send(guestPayload({ shippingAddress: { street: "x", city: "y", state: "Karnataka", pincode: "12" } }));
      expect(noPin.status).toBe(400);
    });

    it("prices guest orders on the server (a forged price is ignored)", async () => {
      const order = await placeGuestOrder({ items: [{ productId: String(product._id), name: product.name, size: "Standard", price: 1, quantity: 2 }] });
      expect(order.pricing.total).toBe(1000);
    });

    it("signed-in checkout still links the order to the account and returns no guest credentials", async () => {
      const auth = await register("Account Buyer", `account.${stamp}@example.test`, 12);
      const res = await request(app).post("/api/v1/orders").set(auth).send(guestPayload({ customer: { name: "Account Buyer", email: `account.${stamp}@example.test`, phone: "9876501299" } }));
      expect(res.status).toBe(201);
      created.orders.push(res.body.data.orderNumber);
      expect(res.body.data.isGuest).toBe(false);
      expect(res.body.data.guestAccess).toBeUndefined();
      const mine = await request(app).get("/api/v1/me/orders").set(auth);
      expect(mine.body.data.map((o) => o.orderNumber)).toContain(res.body.data.orderNumber);
    });
  });

  describe("private tracking", () => {
    it("works with the tracking code alone, and with the order number + code", async () => {
      const order = await placeGuestOrder();
      const byCode = await request(app).post("/api/v1/orders/track").send({ code: order.guestAccess.trackingCode });
      expect(byCode.status).toBe(200);
      expect(byCode.body.data.orderNumber).toBe(order.orderNumber);
      expect(byCode.body.data.claimable).toBe(true);

      // People type codes in lower case, without dashes, or with O for 0
      const typed = order.guestAccess.trackingCode.replace(/-/g, "").toLowerCase().replace(/0/g, "o");
      const byBoth = await request(app).post("/api/v1/orders/track").send({ code: typed, orderNumber: order.orderNumber.toLowerCase() });
      expect(byBoth.status).toBe(200);
    });

    it("returns only what tracking needs: no street, full phone or email, no internal ids", async () => {
      const order = await placeGuestOrder();
      const res = await request(app).post("/api/v1/orders/track").send({ code: order.guestAccess.trackingCode });
      const body = JSON.stringify(res.body);
      expect(body).not.toContain("Private Lane");
      expect(body).not.toContain("9876501234");
      expect(body).not.toContain(guestEmail);
      expect(body).not.toContain("claimToken");
      expect(body).not.toContain("trackingTokenHash");
      expect(res.body.data.userId).toBeUndefined();
      expect(res.body.data.customer.phone).toBe("******1234");
      expect(res.body.data.shippingAddress).toEqual({ city: "Bengaluru", state: "Karnataka", pincode: "560038" });
      expect(res.body.data.items[0].productId).toBeUndefined();
    });

    it("refuses wrong codes, a code for a different order, and malformed input with the same answer", async () => {
      const a = await placeGuestOrder();
      const b = await placeGuestOrder();
      const wrong = await request(app).post("/api/v1/orders/track").send({ code: "ABCD-EFGH-JKMN-PQRS" });
      const mismatched = await request(app).post("/api/v1/orders/track").send({ code: a.guestAccess.trackingCode, orderNumber: b.orderNumber });
      const malformed = await request(app).post("/api/v1/orders/track").send({ code: "short" });
      for (const res of [wrong, mismatched, malformed]) {
        expect(res.status).toBe(404);
        expect(res.body.error.message).toMatch(/couldn't find an order/i);
      }
      const empty = await request(app).post("/api/v1/orders/track").send({});
      expect(empty.status).toBe(400);
    });

    it("an order number alone gives a signed-out visitor nothing", async () => {
      const order = await placeGuestOrder();
      const res = await request(app).get(`/api/v1/orders/${order.orderNumber}`);
      expect(res.status).toBe(404);
      expect(JSON.stringify(res.body)).not.toContain("Guest Buyer");
    });

    it("the old order-number + email lookup is gone", async () => {
      const order = await placeGuestOrder();
      const res = await request(app).get("/api/v1/orders/track").query({ orderNumber: order.orderNumber, email: guestEmail });
      expect(res.status).not.toBe(200);
    });
  });

  describe("linking a guest order to an account", () => {
    it("needs a signed-in account", async () => {
      const order = await placeGuestOrder();
      const res = await request(app).post("/api/v1/orders/claim").send({ claimToken: order.guestAccess.claimToken });
      expect(res.status).toBe(401);
    });

    it("links the order once; the token cannot be reused, nor claimed by another account", async () => {
      const order = await placeGuestOrder();
      const authA = await register("Claimer A", `claimer.a.${stamp}@example.test`, 21);
      const authB = await register("Claimer B", `claimer.b.${stamp}@example.test`, 22);

      const claimed = await request(app).post("/api/v1/orders/claim").set(authA).send({ claimToken: order.guestAccess.claimToken });
      expect(claimed.status).toBe(200);
      expect(claimed.body.data.orderNumber).toBe(order.orderNumber);
      expect(claimed.body.data.isGuest).toBe(true); // still shows how it was placed

      const listA = await request(app).get("/api/v1/me/orders").set(authA);
      expect(listA.body.data.map((o) => o.orderNumber)).toContain(order.orderNumber);
      const full = await request(app).get(`/api/v1/orders/${order.orderNumber}`).set(authA);
      expect(full.status).toBe(200);
      expect(full.body.data.shippingAddress.street).toContain("Private Lane");

      const again = await request(app).post("/api/v1/orders/claim").set(authA).send({ claimToken: order.guestAccess.claimToken });
      expect(again.status).toBe(400);
      const stolen = await request(app).post("/api/v1/orders/claim").set(authB).send({ claimToken: order.guestAccess.claimToken });
      expect(stolen.status).toBe(400);
      const listB = await request(app).get("/api/v1/me/orders").set(authB);
      expect(listB.body.data.map((o) => o.orderNumber)).not.toContain(order.orderNumber);

      const stored = await Order.findOne({ orderNumber: order.orderNumber }).lean();
      expect(stored.guestAccess.claimTokenHash).toBeUndefined();
      expect(stored.checkoutType).toBe("guest");
      expect(stored.timeline.map((t) => t.status)).toContain("Linked to customer account");

      // Tracking keeps working after linking, and reports it is no longer claimable
      const tracked = await request(app).post("/api/v1/orders/track").send({ code: order.guestAccess.trackingCode });
      expect(tracked.body.data.claimable).toBe(false);
      expect(tracked.body.data.linkedToAccount).toBe(true);
    });

    it("two accounts racing for the same token: exactly one wins", async () => {
      const order = await placeGuestOrder();
      const authC = await register("Racer C", `racer.c.${stamp}@example.test`, 31);
      const authD = await register("Racer D", `racer.d.${stamp}@example.test`, 32);
      const results = await Promise.all([
        request(app).post("/api/v1/orders/claim").set(authC).send({ claimToken: order.guestAccess.claimToken }),
        request(app).post("/api/v1/orders/claim").set(authD).send({ claimToken: order.guestAccess.claimToken }),
      ]);
      expect(results.map((r) => r.status).sort()).toEqual([200, 400]);
    });

    it("an expired claim token is refused", async () => {
      const order = await placeGuestOrder();
      await Order.updateOne({ orderNumber: order.orderNumber }, { $set: { "guestAccess.claimExpiresAt": new Date(Date.now() - 1000) } });
      const auth = await register("Late Claimer", `late.${stamp}@example.test`, 41);
      const res = await request(app).post("/api/v1/orders/claim").set(auth).send({ claimToken: order.guestAccess.claimToken });
      expect(res.status).toBe(400);
      expect((await Order.findOne({ orderNumber: order.orderNumber })).userId).toBeNull();
    });

    it("registering with the same email does NOT hand over guest orders (no email matching)", async () => {
      const email = `same.email.${stamp}@example.test`;
      const order = await placeGuestOrder({ customer: { name: "Same Email", email, phone: "9876501777" } });
      const auth = await register("Same Email", email, 51);
      const mine = await request(app).get("/api/v1/me/orders").set(auth);
      expect(mine.body.data.map((o) => o.orderNumber)).not.toContain(order.orderNumber);
      expect((await request(app).get(`/api/v1/orders/${order.orderNumber}`).set(auth)).status).toBe(404);
    });

    it("staff accounts cannot claim customer orders", async () => {
      const order = await placeGuestOrder();
      const res = await request(app).post("/api/v1/orders/claim").set(adminAuth).send({ claimToken: order.guestAccess.claimToken });
      expect(res.status).toBe(403);
    });
  });

  describe("guest online payment (Cashfree mock)", () => {
    const postCashfree = (payload) => {
      const rawBody = JSON.stringify(payload);
      const timestamp = Date.now().toString();
      return request(app)
        .post("/api/v1/webhooks/cashfree")
        .set("x-webhook-signature", hmacSha256(`${timestamp}${rawBody}`, config.CASHFREE_SECRET_KEY || "TEST_CF_SECRET_KEY"))
        .set("x-webhook-timestamp", timestamp)
        .set("x-webhook-id", `evt_guest_${Date.now()}_${Math.random()}`)
        .set("Content-Type", "application/json")
        .send(rawBody);
    };

    it("starts a payment session, confirms only after the verified webhook, and ignores a duplicate", async () => {
      const order = await placeGuestOrder({ paymentMethod: "Online Payment" });
      expect(order.status).toBe("pending_payment");
      expect(order.paymentSession?.paymentSessionId).toBeTruthy();

      const payload = {
        type: "PAYMENT_SUCCESS_WEBHOOK",
        data: { order: { order_id: order.orderNumber }, payment: { cf_payment_id: `cf_guest_${stamp}`, payment_status: "SUCCESS", payment_amount: 500 } },
      };
      expect((await postCashfree(payload)).status).toBe(200);
      expect((await postCashfree(payload)).status).toBe(200);

      const tracked = await request(app).post("/api/v1/orders/track").send({ code: order.guestAccess.trackingCode });
      expect(tracked.body.data.paymentStatus).toBe("paid");
      expect(tracked.body.data.status).toBe("confirmed");
      const paidEntries = (await Order.findOne({ orderNumber: order.orderNumber })).timeline.filter((t) => /payment/i.test(t.status) && /success|received|paid/i.test(t.status));
      expect(paidEntries.length).toBeLessThanOrEqual(1);
    });

    it("a forged webhook signature does not mark a guest order paid", async () => {
      const order = await placeGuestOrder({ paymentMethod: "Online Payment" });
      const rawBody = JSON.stringify({
        type: "PAYMENT_SUCCESS_WEBHOOK",
        data: { order: { order_id: order.orderNumber }, payment: { cf_payment_id: "forged", payment_status: "SUCCESS", payment_amount: 500 } },
      });
      const res = await request(app)
        .post("/api/v1/webhooks/cashfree")
        .set("x-webhook-signature", "forged-signature")
        .set("x-webhook-timestamp", Date.now().toString())
        .set("x-webhook-id", `evt_forged_${stamp}`)
        .set("Content-Type", "application/json")
        .send(rawBody);
      expect(res.status).toBeGreaterThanOrEqual(400);
      expect((await Order.findOne({ orderNumber: order.orderNumber })).paymentStatus).toBe("pending");
    });
  });

  describe("offers limited to once per customer", () => {
    it("are counted by email / mobile for guests", async () => {
      await Coupon.create({ code: `GUESTONCE${stamp}`, type: "fixed_amount", value: 5000, isActive: true, usageLimitPerUser: 1, minimumOrderPaise: 0 });
      const withOffer = (email, phone) =>
        request(app)
          .post("/api/v1/orders")
          .send(guestPayload({ customer: { name: "Offer Guest", email, phone }, pricing: { subtotal: 500, total: 450, couponCode: `GUESTONCE${stamp}`, offerDiscount: 50 } }));

      const first = await withOffer(`offer.${stamp}@example.test`, "9876502001");
      expect(first.status).toBe(201);
      created.orders.push(first.body.data.orderNumber);

      const sameEmail = await withOffer(`offer.${stamp}@example.test`, "9876502002");
      expect(sameEmail.status).toBe(400);
      const samePhone = await withOffer(`other.${stamp}@example.test`, "9876502001");
      expect(samePhone.status).toBe(400);
    });
  });

  describe("staff tools", () => {
    it("admin sees guest orders with the guest flag, can add private notes, and can replace or switch off the tracking link", async () => {
      const order = await placeGuestOrder();

      const list = await request(app).get("/api/v1/admin/orders").query({ q: order.orderNumber }).set(adminAuth);
      expect(list.status).toBe(200);
      expect(list.body.data[0].isGuest).toBe(true);

      const note = await request(app).post(`/api/v1/admin/orders/${order.orderNumber}/notes`).set(adminAuth).send({ text: "Customer asked for evening delivery" });
      expect(note.status).toBe(201);
      const detail = await request(app).get(`/api/v1/admin/orders/${order.orderNumber}`).set(adminAuth);
      expect(detail.status).toBe(200);
      expect(detail.body.data.customer.email).toBe(guestEmail); // staff see full details
      expect(detail.body.data.adminNotes[0].text).toBe("Customer asked for evening delivery");
      expect(detail.body.data.guestTracking.active).toBe(true);

      // Customers never see staff notes
      const tracked = await request(app).post("/api/v1/orders/track").send({ code: order.guestAccess.trackingCode });
      expect(JSON.stringify(tracked.body)).not.toContain("evening delivery");

      const regen = await request(app).post(`/api/v1/admin/orders/${order.orderNumber}/tracking-code`).set(adminAuth);
      expect(regen.status).toBe(200);
      const oldCode = await request(app).post("/api/v1/orders/track").send({ code: order.guestAccess.trackingCode });
      expect(oldCode.status).toBe(404);
      const newCode = await request(app).post("/api/v1/orders/track").send({ code: regen.body.data.trackingCode });
      expect(newCode.status).toBe(200);

      const revoke = await request(app).delete(`/api/v1/admin/orders/${order.orderNumber}/tracking-code`).set(adminAuth);
      expect(revoke.status).toBe(200);
      expect((await request(app).post("/api/v1/orders/track").send({ code: regen.body.data.trackingCode })).status).toBe(404);
    });

    it("customers cannot use the staff endpoints", async () => {
      const order = await placeGuestOrder();
      const auth = await register("Nosy", `nosy.${stamp}@example.test`, 61);
      expect((await request(app).post(`/api/v1/admin/orders/${order.orderNumber}/tracking-code`).set(auth)).status).toBe(403);
      expect((await request(app).post(`/api/v1/admin/orders/${order.orderNumber}/notes`).set(auth).send({ text: "x" })).status).toBe(403);
      expect((await request(app).post(`/api/v1/admin/orders/${order.orderNumber}/tracking-code`)).status).toBe(401);
    });
  });

  describe("Meta Purchase event (Conversions API)", () => {
    it("is off unless configured", async () => {
      const order = await placeGuestOrder();
      expect(await marketingService.sendPurchase(order.orderNumber)).toEqual({ sent: false, reason: "disabled" });
    });

    it("is sent once per order, hashed, with the dedup event id, and without the street address or tokens", async () => {
      const order = await placeGuestOrder();
      vi.spyOn(metaCapi, "enabled", "get").mockReturnValue(true);
      const send = vi.spyOn(metaCapi, "sendEvent").mockResolvedValue({ sent: true });

      await marketingService.sendPurchase(order.orderNumber);
      await marketingService.sendPurchase(order.orderNumber);
      expect(send).toHaveBeenCalledTimes(1);

      const event = send.mock.calls[0][0];
      expect(event.event_name).toBe("Purchase");
      expect(event.event_id).toBe(`purchase.${order.orderNumber}`);
      expect(event.custom_data.value).toBe(500);
      expect(event.custom_data.currency).toBe("INR");
      expect(event.user_data.em[0]).toMatch(/^[a-f0-9]{64}$/);
      expect(event.user_data.fbp).toBe("fb.1.1700000000000.123");
      const text = JSON.stringify(event);
      expect(text).not.toContain(guestEmail);
      expect(text).not.toContain("Private Lane");
      expect(text).not.toContain(order.guestAccess.claimToken);
      expect(text).not.toContain(normalizeTrackingCode(order.guestAccess.trackingCode));
    });

    it("is not sent for an unpaid online order", async () => {
      const order = await placeGuestOrder({ paymentMethod: "Online Payment" });
      vi.spyOn(metaCapi, "enabled", "get").mockReturnValue(true);
      const send = vi.spyOn(metaCapi, "sendEvent").mockResolvedValue({ sent: true });
      await marketingService.sendPurchase(order.orderNumber);
      expect(send).not.toHaveBeenCalled();
    });
  });
});
