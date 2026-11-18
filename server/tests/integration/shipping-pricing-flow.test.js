import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { User } from "../../src/models/User.js";
import { Role } from "../../src/models/Role.js";
import { Order } from "../../src/models/Order.js";
import { Payment } from "../../src/models/Payment.js";
import { Product } from "../../src/models/Product.js";
import { ProductVariant } from "../../src/models/ProductVariant.js";
import { Coupon } from "../../src/models/Coupon.js";
import { StoreSettings } from "../../src/models/StoreSettings.js";
import { ROLES } from "../../src/constants/roles.js";
import { ALL_PERMISSIONS } from "../../src/constants/permissions.js";
import { generateAccessToken } from "../../src/utils/token.js";
import { settingsService } from "../../src/services/settings.service.js";
import { adminService } from "../../src/services/admin.service.js";
import { cancellationService } from "../../src/services/cancellation.service.js";
import { defaultZones } from "../../src/constants/shippingDefaults.js";

/**
 * Shipping & tax end to end: what the storefront previews = what checkout sends = what the payment request
 * carries = what is saved on the order = what the invoice shows.
 */
describe.sequential("Shipping & tax: preview, order, payment, invoice, refund", () => {
  const stamp = Date.now();
  const created = { orders: [], users: [] };
  let original;
  let p5; // 5% GST, ₹500
  let p18; // 18% GST, ₹1,180 (MRP ₹1,500)
  let pDefault; // no GST rate of its own, ₹1,000
  let adminAuth;

  const item = (product, quantity = 1, size = "Standard") => ({ productId: String(product._id), name: product.name, size, quantity });
  const preview = (body) => request(app).post("/api/v1/checkout/pricing").send(body);
  const addr = (state, pincode, extra = {}) => ({ state, pincode, ...extra });

  const register = async (name, email, n) => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({ name, email, phone: `9${String(stamp + n).slice(-9)}`, phoneCountryCode: "+91", password: "Secret123", confirmPassword: "Secret123" });
    expect(res.status).toBe(201);
    created.users.push(email);
    return { Authorization: `Bearer ${res.body.data.tokens.accessToken}` };
  };

  const orderBody = ({ items, state = "Uttar Pradesh", pincode = "201301", method = "Cash on Delivery (COD)", deliveryMethod = "standard", pricing = {}, email }) => ({
    customer: { name: "Pricing Buyer", email: email || `buyer.${stamp}@example.test`, phone: "9876543210" },
    shippingAddress: { street: "12 Test Lane", city: "Testville", state, pincode },
    items: items.map((i) => ({ ...i, price: 1 })), // a forged price: ignored
    pricing: { total: 1, ...pricing },
    deliveryMethod,
    paymentMethod: method,
  });

  const place = async (opts, headers = {}) => {
    const res = await request(app).post("/api/v1/orders").set(headers).send(orderBody(opts));
    if (res.status === 201) created.orders.push(res.body.data.orderNumber);
    return res;
  };

  const saveSettings = async (patch) => {
    await StoreSettings.updateOne({}, { $set: patch });
  };

  beforeAll(async () => {
    const doc = await settingsService.get();
    original = { shipping: doc.toObject().shipping, tax: doc.toObject().tax };

    // The recommended three-zone setup, dispatching from Uttar Pradesh
    await saveSettings({
      "shipping.originState": "Uttar Pradesh",
      "shipping.originCity": "Noida",
      "shipping.originPincode": "201301",
      "shipping.zones": defaultZones(),
      "shipping.pinExceptions": [],
      "shipping.expressShippingFee": 99,
      "shipping.expressEnabled": true,
      "shipping.expressRequiresCourierSupport": true,
      "shipping.expressMaxCourierDays": 2,
      "tax.originState": "Uttar Pradesh",
      "tax.taxIncludedInPrice": true,
      "tax.standardGstRate": 12,
      "tax.shippingTaxMode": "none",
      "tax.shippingGstRate": 0,
    });

    const make = async (label, pricePaise, extra = {}, compareAtPricePaise = 0) => {
      const product = await Product.create({
        name: `${label} ${stamp}`,
        slug: `${label.toLowerCase()}-${stamp}`,
        sku: `${label.toUpperCase()}-${stamp}`,
        categoryId: "wellness-essentials",
        description: "x",
        status: "active",
        basePricePaise: pricePaise,
        ...extra,
      });
      await ProductVariant.create({ productId: product._id, sku: `${label.toUpperCase()}-${stamp}-S`, label: "Standard", pricePaise, compareAtPricePaise, stockOnHand: 500, isActive: true });
      return product;
    };
    p5 = await make("Gst5", 50000, { gstRate: 5, hsnCode: "3004" });
    p18 = await make("Gst18", 118000, { gstRate: 18, hsnCode: "3304" }, 150000);
    pDefault = await make("GstDefault", 100000);

    let role = await Role.findOne({ name: ROLES.SUPER_ADMIN });
    if (!role) role = await Role.create({ name: ROLES.SUPER_ADMIN, description: "Super Administrator", permissions: ALL_PERMISSIONS });
    let admin = await User.findOne({ email: "admin@divyamayurveda.demo" });
    if (!admin) admin = await User.create({ name: "Super Admin", email: "admin@divyamayurveda.demo", passwordHash: "testHash123", isStaff: true, isOwner: true, roles: [role._id] });
    adminAuth = { Authorization: `Bearer ${generateAccessToken({ id: admin._id, email: admin.email, isStaff: true })}` };
  });

  afterAll(async () => {
    await saveSettings({ "shipping": original.shipping, "tax": original.tax });
    await Payment.deleteMany({ orderNumber: { $in: created.orders } });
    await Order.deleteMany({ orderNumber: { $in: created.orders } });
    const products = [p5, p18, pDefault].filter(Boolean).map((p) => p._id);
    await ProductVariant.deleteMany({ productId: { $in: products } });
    await Product.deleteMany({ _id: { $in: products } });
    await Coupon.deleteMany({ code: `SHIP${stamp}` });
    await User.deleteMany({ email: { $in: created.users } });
  });

  describe("storefront price preview", () => {
    it("Local: ₹500 of goods ships free, with the product's own GST split CGST + SGST", async () => {
      const res = await preview({ items: [item(p5)], address: addr("Uttar Pradesh", "201301") });
      expect(res.status).toBe(200);
      const { pricing } = res.body.data;
      expect(pricing.zone.tier).toBe("Local");
      expect(pricing.shipping.total).toBe(0);
      expect(pricing.shipping.freeApplied).toBe(true);
      expect(pricing.total).toBe(500);
      expect(pricing.lines[0].gstRate).toBe(5);
      expect(pricing.tax.goods).toBe(23.81); // 5% contained in ₹500
      expect(pricing.tax.type).toBe("intra_state");
      expect(pricing.tax.cgst + pricing.tax.sgst).toBeCloseTo(23.81, 2);
      expect(pricing.tax.igst).toBe(0);
    });

    it("Rest of India: ₹80 delivery and IGST; the answer never depends on figures from the browser", async () => {
      const res = await preview({ items: [item(p5)], address: addr("Madhya Pradesh", "452001") });
      const { pricing } = res.body.data;
      expect(pricing.zone.tier).toBe("Rest of India");
      expect(pricing.shipping.total).toBe(80);
      expect(pricing.total).toBe(580);
      expect(pricing.tax.type).toBe("inter_state");
      expect(pricing.tax.igst).toBe(23.81);
      expect(pricing.amountNeededForFree).toBe(299); // ₹799 - ₹500
    });

    it("Remote: ₹120 delivery", async () => {
      const res = await preview({ items: [item(p5)], address: addr("Ladakh", "194101") });
      expect(res.body.data.pricing.zone.tier).toBe("Remote");
      expect(res.body.data.pricing.shipping.total).toBe(120);
    });

    it("uses each product's own GST rate and the store default for a product without one", async () => {
      const res = await preview({ items: [item(p5), item(p18), item(pDefault)], address: addr("Maharashtra", "411001") });
      const { pricing } = res.body.data;
      expect(pricing.lines.map((l) => l.gstRate)).toEqual([5, 18, 12]);
      expect(pricing.total).toBe(2680); // 500 + 1180 + 1000, delivery free above ₹799
      expect(pricing.tax.goods).toBe(23.81 + 180 + 107.14);
    });

    it("express costs the zone fee + surcharge, or only the surcharge once delivery is free; unsupported PINs fall back", async () => {
      const paid = await preview({ items: [item(p5)], address: addr("Delhi", "110001"), deliveryMethod: "express" });
      expect(paid.body.data.options.express.available).toBe(true);
      expect(paid.body.data.pricing.shipping.total).toBe(179); // 80 + 99
      expect(paid.body.data.options.standard.total).toBe(80);

      const free = await preview({ items: [item(p5, 2)], address: addr("Delhi", "110001"), deliveryMethod: "express" });
      expect(free.body.data.pricing.shipping.standard).toBe(0);
      expect(free.body.data.pricing.shipping.total).toBe(99);

      // Madhya Pradesh PIN: the mock courier's quickest service takes 5 days, so express is not offered
      const no = await preview({ items: [item(p5)], address: addr("Madhya Pradesh", "452001"), deliveryMethod: "express" });
      expect(no.body.data.options.express.available).toBe(false);
      expect(no.body.data.options.selected).toBe("standard");
      expect(no.body.data.expressAdjusted).toMatch(/isn't available/i);
      expect(no.body.data.pricing.shipping.total).toBe(80);
      expect(no.body.data.options.express.total).toBe(179); // what it would cost, shown for transparency
    });

    it("an unknown state is refused with a message, never priced at the cheapest rate", async () => {
      const res = await preview({ items: [item(p5)], address: addr("Atlantis", "452001") });
      expect(res.status).toBe(200);
      expect(res.body.data.deliverable).toBe(false);
      expect(res.body.data.code).toBe("UNKNOWN_STATE");
      expect(res.body.data.pricing).toBeUndefined();
    });

    it("verifies an offer on the server and judges free delivery after it", async () => {
      await Coupon.create({ code: `SHIP${stamp}`, type: "fixed_amount", value: 5000, isActive: true, minimumOrderPaise: 0 });
      const res = await preview({ items: [item(p5)], address: addr("Uttar Pradesh", "201301"), couponCode: `SHIP${stamp}` });
      const { pricing, offer } = res.body.data;
      expect(offer.discount).toBe(50);
      expect(pricing.eligibleSubtotal).toBe(450);
      expect(pricing.shipping.total).toBe(40); // ₹450 is under the ₹499 Local minimum after the offer
      expect(pricing.total).toBe(490);
      expect(pricing.lines[0].discount).toBe(50);

      const bad = await preview({ items: [item(p5)], address: addr("Uttar Pradesh", "201301"), couponCode: "NOSUCHCODE" });
      expect(bad.body.data.offer.error).toBeTruthy();
      expect(bad.body.data.pricing.total).toBe(500);
    });

    it("rejects an empty basket and forged shapes", async () => {
      expect((await preview({ items: [], address: addr("Uttar Pradesh", "201301") })).status).toBe(400);
      expect((await preview({ items: [{ productId: "nope", quantity: 1 }], address: addr("Uttar Pradesh", "201301") })).status).toBe(400);
    });
  });

  describe("placing the order", () => {
    it("COD: the saved order equals the preview, with a complete pricing snapshot", async () => {
      const items = [item(p5, 1), item(p18, 1)];
      const pv = (await preview({ items, address: addr("Madhya Pradesh", "452001") })).body.data.pricing;
      const res = await place({ items, state: "Madhya Pradesh", pincode: "452001", pricing: { expectedTotal: pv.total } });
      expect(res.status).toBe(201);
      const order = await Order.findOne({ orderNumber: res.body.data.orderNumber }).lean();

      expect(order.pricing.totalPaise).toBe(Math.round(pv.total * 100));
      expect(order.pricing.shippingPaise).toBe(0); // 1,680 ≥ 799
      expect(order.pricing.zoneName).toMatch(/rest of india/i);
      expect(order.pricing.zoneId).toBe("zone-rest");
      expect(order.pricing.freeShippingApplied).toBe(true);
      expect(order.pricing.freeShippingThresholdPaise).toBe(79900);
      expect(order.pricing.eligibleSubtotalPaise).toBe(168000);
      expect(order.pricing.gstMode).toBe("inclusive");
      expect(order.pricing.taxType).toBe("inter_state");
      expect(order.shippingAddress.state).toBe("Madhya Pradesh");

      // MRP, selling price, GST per line
      expect(order.items.map((i) => i.gstRate)).toEqual([5, 18]);
      expect(order.items.map((i) => i.hsnCode)).toEqual(["3004", "3304"]);
      expect(order.items[1].mrpUnitPaise).toBe(150000);
      expect(order.items.reduce((s, i) => s + i.taxPaise, 0)).toBe(order.pricing.goodsTaxPaise);
      expect(order.pricing.taxPaise).toBe(order.pricing.goodsTaxPaise + order.pricing.shippingTaxPaise);
      expect(order.pricing.igstPaise).toBe(order.pricing.taxPaise);
      for (const i of order.items) expect(i.taxablePaise + i.taxPaise).toBe(i.lineTotalPaise - i.discountPaise);
    });

    it("the total the customer saw must be the total charged: a stale total asks them to review", async () => {
      const items = [item(p5)];
      const before = await Order.countDocuments({ "customer.email": `stale.${stamp}@example.test` });
      const res = await place({ items, state: "Madhya Pradesh", pincode: "452001", email: `stale.${stamp}@example.test`, pricing: { expectedTotal: 500 } }); // forgot the ₹80 delivery
      expect(res.status).toBe(409);
      expect(res.body.error.message).toMatch(/price changed/i);
      expect(await Order.countDocuments({ "customer.email": `stale.${stamp}@example.test` })).toBe(before);
    });

    it("a forged price or total from the browser is ignored", async () => {
      const res = await place({ items: [item(p5, 2)], state: "Uttar Pradesh", pincode: "201301" });
      expect(res.status).toBe(201);
      expect(res.body.data.pricing.total).toBe(1000);
    });

    it("express is refused at placement where the courier cannot do it, and priced correctly where it can", async () => {
      const refused = await place({ items: [item(p5)], state: "Madhya Pradesh", pincode: "452001", deliveryMethod: "express" });
      expect(refused.status).toBe(400);
      expect(refused.body.error.message).toMatch(/express/i);

      const pv = (await preview({ items: [item(p5)], address: addr("Delhi", "110001"), deliveryMethod: "express" })).body.data.pricing;
      const ok = await place({ items: [item(p5)], state: "Delhi", pincode: "110001", deliveryMethod: "express", pricing: { expectedTotal: pv.total } });
      expect(ok.status).toBe(201);
      expect(ok.body.data.pricing.shipping).toBe(179);
      expect(ok.body.data.deliveryMethod).toBe("express");
      const saved = await Order.findOne({ orderNumber: ok.body.data.orderNumber }).lean();
      expect(saved.pricing.standardShippingPaise).toBe(8000);
      expect(saved.pricing.expressSurchargePaise).toBe(9900);
    });

    it("an unknown state or a switched-off zone cannot be ordered", async () => {
      expect((await place({ items: [item(p5)], state: "Atlantis", pincode: "452001" })).status).toBe(400);

      const zones = defaultZones().map((z) => (z.tier === "Remote" ? { ...z, enabled: false } : z));
      await saveSettings({ "shipping.zones": zones });
      const res = await place({ items: [item(p5)], state: "Ladakh", pincode: "194101" });
      expect(res.status).toBe(400);
      expect(res.body.error.message).toMatch(/don't deliver/i);
      await saveSettings({ "shipping.zones": defaultZones() });
    });

    it("online payment: preview = order = payment amount", async () => {
      const items = [item(p5), item(pDefault)];
      const pv = (await preview({ items, address: addr("Madhya Pradesh", "452001") })).body.data.pricing;
      const res = await place({ items, state: "Madhya Pradesh", pincode: "452001", method: "Online Payment", pricing: { expectedTotal: pv.total } });
      expect(res.status).toBe(201);
      expect(res.body.data.pricing.total).toBe(pv.total);
      expect(res.body.data.paymentSession.amount).toBe(pv.total);
      const payment = await Payment.findOne({ orderNumber: res.body.data.orderNumber }).lean();
      expect(payment.amountPaise).toBe(Math.round(pv.total * 100));
      expect(res.body.data.status).toBe("pending_payment");
    });

    it("exclusive GST: the order total includes tax that was added on top", async () => {
      await saveSettings({ "tax.taxIncludedInPrice": false });
      try {
        const items = [item(p18)]; // ₹1,180 + 18% = ₹1,392.40, delivery free
        const pv = (await preview({ items, address: addr("Uttar Pradesh", "201301") })).body.data.pricing;
        expect(pv.priceMode).toBe("exclusive");
        expect(pv.total).toBe(1392.4);
        const res = await place({ items, pricing: { expectedTotal: pv.total } });
        expect(res.status).toBe(201);
        expect(res.body.data.pricing.total).toBe(1392.4);
        const saved = await Order.findOne({ orderNumber: res.body.data.orderNumber }).lean();
        expect(saved.pricing.gstMode).toBe("exclusive");
        expect(saved.pricing.goodsTaxPaise).toBe(21240);
      } finally {
        await saveSettings({ "tax.taxIncludedInPrice": true });
      }
    });

    it("history is kept: changing the settings later does not touch an existing order", async () => {
      const res = await place({ items: [item(p5)], state: "Madhya Pradesh", pincode: "452001" });
      const orderNumber = res.body.data.orderNumber;
      const before = (await Order.findOne({ orderNumber }).lean()).pricing;
      expect(before.shippingPaise).toBe(8000);

      await saveSettings({
        "shipping.zones": defaultZones().map((z) => ({ ...z, baseFee: 999 })),
        "shipping.expressShippingFee": 500,
        "tax.standardGstRate": 28,
      });
      try {
        const after = (await Order.findOne({ orderNumber }).lean()).pricing;
        expect(after).toEqual(before);
      } finally {
        await saveSettings({ "shipping.zones": defaultZones(), "shipping.expressShippingFee": 99, "tax.standardGstRate": 12 });
      }
    });
  });

  describe("invoice data", () => {
    it("matches the order exactly, for the owner and for staff only", async () => {
      const email = `invoice.${stamp}@example.test`;
      const auth = await register("Invoice Buyer", email, 1);
      const items = [item(p5, 2), item(p18, 1)];
      const res = await place({ items, state: "Madhya Pradesh", pincode: "452001", email }, auth);
      expect(res.status).toBe(201);
      const orderNumber = res.body.data.orderNumber;
      const order = await Order.findOne({ orderNumber }).lean();

      const inv = await request(app).get(`/api/v1/me/orders/${orderNumber}/invoice`).set(auth);
      expect(inv.status).toBe(200);
      const d = inv.body.data;
      expect(d.snapshot).toBe(true);
      expect(d.placeOfSupply).toBe("Madhya Pradesh");
      expect(d.taxType).toBe("inter_state");
      expect(d.lines.map((l) => l.hsnCode)).toEqual(["3004", "3304"]);
      expect(d.lines.reduce((s, l) => s + l.totalPaise, 0) + d.shipping.totalPaise).toBe(d.totals.grossTotalPaise);
      expect(d.totals.grossTotalPaise).toBe(order.pricing.totalPaise + order.pricing.storeCreditPaise);
      expect(d.totals.amountPayablePaise).toBe(order.pricing.totalPaise);
      expect(d.totals.totalTaxPaise).toBe(order.pricing.taxPaise);
      expect(d.totals.igstPaise).toBe(order.pricing.igstPaise);
      expect(d.totals.cgstPaise + d.totals.sgstPaise + d.totals.igstPaise).toBe(d.totals.totalTaxPaise);
      expect(d.lines.reduce((s, l) => s + l.taxPaise, 0)).toBe(order.pricing.goodsTaxPaise);
      // inclusive prices: taxable value + tax = what was billed for the goods
      expect(d.totals.taxableValuePaise + d.totals.totalTaxPaise).toBe(d.lines.reduce((s, l) => s + l.totalPaise, 0));

      expect((await request(app).get(`/api/v1/admin/orders/${orderNumber}/invoice`).set(adminAuth)).status).toBe(200);
      const other = await register("Other Buyer", `other.${stamp}@example.test`, 2);
      expect((await request(app).get(`/api/v1/me/orders/${orderNumber}/invoice`).set(other)).status).toBe(404);
      expect((await request(app).get(`/api/v1/me/orders/${orderNumber}/invoice`)).status).toBe(401);
    });

    it("also works for an order placed before the pricing snapshot existed", async () => {
      const email = `legacy.${stamp}@example.test`;
      const auth = await register("Legacy Buyer", email, 3);
      const res = await place({ items: [item(p5)], email }, auth);
      const orderNumber = res.body.data.orderNumber;
      await Order.updateOne({ orderNumber }, { $set: { "pricing.sellingSubtotalPaise": 0 } }); // looks like an older order
      const inv = await request(app).get(`/api/v1/me/orders/${orderNumber}/invoice`).set(auth);
      expect(inv.status).toBe(200);
      expect(inv.body.data.snapshot).toBe(false);
      expect(inv.body.data.lines[0].taxablePaise).toBeNull();
    });
  });

  describe("cancellation refunds", () => {
    it("a partial refund returns the line's price less its own share of the offer, and all lines add up to the amount paid", async () => {
      const items = [item(p5, 2), item(p18, 1)];
      const res = await place({ items, method: "Online Payment" });
      const orderNumber = res.body.data.orderNumber;
      await Order.updateOne({ orderNumber }, { $set: { paymentStatus: "paid", status: "confirmed" } });
      const order = await Order.findOne({ orderNumber });
      expect(order.pricing.totalPaise).toBe(218000); // ₹1,000 + ₹1,180, delivery free

      // one unit of the ₹500 product
      const one = cancellationService.calculatePartialRefund(order, [{ orderItemId: order.items[0]._id.toString(), quantity: 1 }]);
      expect(one.itemBreakdown[0].refundAmountPaise).toBe(50000);

      // cancelling every line returns exactly what was paid (here delivery was free)
      const all = cancellationService.calculatePartialRefund(order, order.items.map((i) => ({ orderItemId: i._id.toString(), quantity: i.quantity })));
      expect(all.isFullCancellation).toBe(true);
      expect(all.totalRefundPaise).toBe(order.pricing.totalPaise);
      expect(all.itemBreakdown.reduce((s, i) => s + i.refundAmountPaise, 0)).toBe(order.pricing.totalPaise);
    });

    it("with an offer, each line's refund carries its own discount share and the parts sum to the total", async () => {
      await Coupon.updateOne({ code: `SHIP${stamp}` }, { $set: { value: 10000 } }); // ₹100 off
      const items = [item(p5, 2), item(p18, 1)];
      const res = await place({ items, method: "Online Payment", pricing: { couponCode: `SHIP${stamp}`, offerDiscount: 100 } });
      expect(res.status).toBe(201);
      const orderNumber = res.body.data.orderNumber;
      await Order.updateOne({ orderNumber }, { $set: { paymentStatus: "paid", status: "confirmed" } });
      const order = await Order.findOne({ orderNumber });
      expect(order.pricing.totalPaise).toBe(208000);
      expect(order.items.reduce((s, i) => s + i.discountPaise, 0)).toBe(10000);

      const all = cancellationService.calculatePartialRefund(order, order.items.map((i) => ({ orderItemId: i._id.toString(), quantity: i.quantity })));
      expect(all.itemBreakdown.reduce((s, i) => s + i.refundAmountPaise, 0)).toBe(order.pricing.totalPaise);
      const unit = cancellationService.calculatePartialRefund(order, [{ orderItemId: order.items[0]._id.toString(), quantity: 1 }]);
      expect(unit.itemBreakdown[0].refundAmountPaise).toBe(50000 - Math.round(order.items[0].discountPaise / 2));
    });
  });

  describe("admin settings", () => {
    it("saves PIN-code exceptions and rejects overlapping ranges or unknown zones", async () => {
      const zones = (await settingsService.get()).toObject().shipping.zones;
      const remote = zones.find((z) => z.tier === "Remote").id;
      const patchEx = (pinExceptions, extra = {}) => settingsService.update({ shipping: { pinExceptions, ...extra } });

      await expect(patchEx([{ from: "110001", to: "110050", zoneId: remote }, { from: "110050", to: "110099", zoneId: remote }])).rejects.toThrow(/overlap/i);
      await expect(patchEx([{ from: "110001", to: "110050", zoneId: "zone-nope" }])).rejects.toThrow(/zone/i);
      await expect(patchEx([{ from: "11001", to: "110050", zoneId: remote }])).rejects.toThrow(/6 digits/i);
      await expect(patchEx([{ from: "110050", to: "110001", zoneId: remote }])).rejects.toThrow(/higher/i);

      const { settings } = await patchEx([{ from: "194101", to: "194199", zoneId: remote, note: "Leh" }]);
      expect(settings.shipping.pinExceptions[0].zoneId).toBe(remote);

      // removing a zone that an exception still uses is refused
      await expect(settingsService.update({ shipping: { zones: zones.filter((z) => z.id !== remote) } })).rejects.toThrow(/zone/i);
      await patchEx([]);
    });

    it("a PIN exception changes the price for that PIN only", async () => {
      const zones = (await settingsService.get()).toObject().shipping.zones;
      const remote = zones.find((z) => z.tier === "Remote").id;
      await settingsService.update({ shipping: { pinExceptions: [{ from: "201305", to: "201305", zoneId: remote }] } });
      try {
        const special = await preview({ items: [item(p5)], address: addr("Uttar Pradesh", "201305") });
        expect(special.body.data.pricing.zone.tier).toBe("Remote");
        expect(special.body.data.pricing.shipping.total).toBe(120);
        const normal = await preview({ items: [item(p5)], address: addr("Uttar Pradesh", "201301") });
        expect(normal.body.data.pricing.zone.tier).toBe("Local");
      } finally {
        await settingsService.update({ shipping: { pinExceptions: [] } });
      }
    });

    it("validates zone, express and tax options", async () => {
      const upd = (patch) => settingsService.update(patch);
      const zones = (await settingsService.get()).toObject().shipping.zones;
      await expect(upd({ shipping: { zones: zones.map((z) => (z.matchType === "rest" ? { ...z, enabled: false } : z)) } })).rejects.toThrow(/must stay switched on/i);
      await expect(upd({ shipping: { expressMaxCourierDays: 0 } })).rejects.toThrow(/between 1 and 14/);
      await expect(upd({ shipping: { expressEstimate: "" } })).rejects.toThrow(/required/i);
      await expect(upd({ shipping: { originCountry: "Nepal" } })).rejects.toThrow(/India/);
      await expect(upd({ tax: { shippingTaxMode: "fixed", shippingGstRate: 0 } })).rejects.toThrow(/GST rate/i);
      await expect(upd({ tax: { shippingTaxMode: "banana" } })).rejects.toThrow(/Choose how GST/);
      await expect(upd({ tax: { invoicePrefix: "bad pre!" } })).rejects.toThrow(/letters, numbers/);

      const ok = await upd({ shipping: { expressEnabled: false, expressEstimate: "Next day", expressMaxCourierDays: 3 }, tax: { invoicePrefix: "div", legalName: "Divyam Ayurveda Pvt Ltd" } });
      expect(ok.settings.shipping.expressEnabled).toBe(false);
      expect(ok.settings.tax.invoicePrefix).toBe("DIV");
      const pv = await preview({ items: [item(p5)], address: addr("Delhi", "110001"), deliveryMethod: "express" });
      expect(pv.body.data.options.express.enabled).toBe(false);
      expect(pv.body.data.options.selected).toBe("standard");
      await upd({ shipping: { expressEnabled: true, expressEstimate: "1–2 business days", expressMaxCourierDays: 2 }, tax: { invoicePrefix: "DA" } });
    });

    it("a product's GST rate and HSN code are validated and saved", async () => {
      const staff = { _id: new (await import("mongoose")).default.Types.ObjectId(), name: "Staff", roles: [] };
      await expect(adminService.updateProduct(String(pDefault._id), { gstRate: 55 }, staff)).rejects.toThrow(/between 0 and 40/);
      await expect(adminService.updateProduct(String(pDefault._id), { hsnCode: "12" }, staff)).rejects.toThrow(/4 to 8 digits/);
      await adminService.updateProduct(String(pDefault._id), { gstRate: 18, hsnCode: "33049910" }, staff);
      let fresh = await Product.findById(pDefault._id).lean();
      expect([fresh.gstRate, fresh.hsnCode]).toEqual([18, "33049910"]);
      const pv = await preview({ items: [item(pDefault)], address: addr("Uttar Pradesh", "201301") });
      expect(pv.body.data.pricing.lines[0].gstRate).toBe(18);
      await adminService.updateProduct(String(pDefault._id), { gstRate: "", hsnCode: "" }, staff); // back to the store default
      fresh = await Product.findById(pDefault._id).lean();
      expect(fresh.gstRate).toBeNull();
    });
  });
});
