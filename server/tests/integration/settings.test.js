import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { User } from "../../src/models/User.js";
import { Role } from "../../src/models/Role.js";
import { Product } from "../../src/models/Product.js";
import { ProductVariant } from "../../src/models/ProductVariant.js";
import { Order } from "../../src/models/Order.js";
import { ROLES } from "../../src/constants/roles.js";
import { PERMISSIONS } from "../../src/constants/permissions.js";
import { generateAccessToken } from "../../src/utils/token.js";
import { settingsService } from "../../src/services/settings.service.js";

const ALL_PERMISSIONS = Object.values(PERMISSIONS);

describe("Store settings", () => {
  const stamp = Date.now();
  const email = `settings.cust.${stamp}@example.test`;
  let staff, createdRole, adminAuth, custAuth, product;
  let original;

  const getAdmin = async () => (await request(app).get("/api/v1/admin/settings").set(adminAuth)).body.data;
  const patch = (body) => request(app).patch("/api/v1/admin/settings").set(adminAuth).send(body);
  const zonesOf = async () => (await getAdmin()).shipping.zones.map(({ _id, ...z }) => z);
  const setZones = (zones) => patch({ shipping: { zones } });

  const place = (overrides = {}) =>
    request(app)
      .post("/api/v1/orders")
      .set(custAuth)
      .send({
        customer: { name: "Settings Customer", email, phone: "7000000000" },
        shippingAddress: { street: "1 Road", city: "Pune", state: "Maharashtra", pincode: "411001" },
        // The browser's price and totals are deliberately wrong: the server must ignore them
        items: [{ productId: String(product._id), name: product.name, size: "Standard", price: 1, quantity: 1 }],
        pricing: { subtotal: 1, shipping: 0, tax: 0, total: 1 },
        paymentMethod: "Cash on Delivery (COD)",
        ...overrides,
      });

  beforeAll(async () => {
    let role = await Role.findOne({ name: ROLES.SUPER_ADMIN });
    if (!role) role = createdRole = await Role.create({ name: ROLES.SUPER_ADMIN, permissions: ALL_PERMISSIONS });
    staff = await User.create({ name: "Settings Admin", email: `settings.admin.${stamp}@example.test`, passwordHash: "x", isStaff: true, roles: [role._id], status: "active" });
    adminAuth = { Authorization: `Bearer ${generateAccessToken({ id: staff._id, email: staff.email, isStaff: true })}` };
    const reg = await request(app).post("/api/v1/auth/register").send({ name: "Settings Customer", email, phone: `92${String(stamp).slice(-8)}`, phoneCountryCode: "+91", password: "Secret123", confirmPassword: "Secret123" });
    custAuth = { Authorization: `Bearer ${reg.body.data.tokens.accessToken}` };
    product = await Product.create({ name: `Settings Prod ${stamp}`, slug: `settings-prod-${stamp}`, sku: `SET-${stamp}`, categoryId: "wellness-essentials", description: "x", status: "active", basePricePaise: 30000 });
    await ProductVariant.create({ productId: product._id, sku: `SET-${stamp}-S`, label: "Standard", pricePaise: 30000, stockOnHand: 50, isActive: true });
    original = (await settingsService.get()).toObject();
  });

  afterAll(async () => {
    await Order.deleteMany({ "customer.email": email });
    await ProductVariant.deleteMany({ productId: product._id });
    await Product.deleteOne({ _id: product._id });
    await User.deleteMany({ email: { $in: [email, staff.email] } });
    if (createdRole) await Role.deleteOne({ _id: createdRole._id });
    // Put the settings back the way the suite found them
    await patch({
      shipping: { zones: original.shipping.zones.map(({ _id, ...z }) => z), expressShippingFee: original.shipping.expressShippingFee },
      store: { enableCashOnDelivery: original.store.enableCashOnDelivery, enableOnlinePayments: original.store.enableOnlinePayments, maxCodLimit: original.store.maxCodLimit },
    });
  });

  it("keeps settings admin-only and exposes only safe fields to the storefront", async () => {
    expect((await request(app).get("/api/v1/admin/settings")).status).toBe(401);
    expect((await request(app).get("/api/v1/admin/settings").set(custAuth)).status).toBe(403);
    expect((await request(app).patch("/api/v1/admin/settings").set(custAuth).send({ general: { storeName: "Hacked" } })).status).toBe(403);

    const pub = await request(app).get("/api/v1/store/settings/public");
    expect(pub.status).toBe(200);
    expect(pub.body.data.general.contactEmail).toBeTruthy();
    expect(pub.body.data.shipping.zones.length).toBeGreaterThan(0);
    expect(pub.body.data.tax.gstinNumber).toBeUndefined();
    expect(pub.body.data.notifications).toBeUndefined();
  });

  it("validates what an admin saves and leaves other fields alone on a partial update", async () => {
    expect((await patch({ general: { contactEmail: "not-an-email" } })).status).toBe(400);
    expect((await patch({ general: { storeName: "  " } })).status).toBe(400);
    expect((await patch({ tax: { standardGstRate: 500 } })).status).toBe(400);
    expect((await patch({ tax: { gstinNumber: "BADGSTIN" } })).status).toBe(400);
    expect((await patch({ shipping: { originPincode: "123" } })).status).toBe(400);
    expect((await patch({ shipping: { originState: "Atlantis" } })).status).toBe(400);
    expect((await patch({ shipping: { expressShippingFee: -5 } })).status).toBe(400);
    expect((await patch({ store: { maxCodLimit: "abc" } })).status).toBe(400);
    expect((await patch({ store: { enableCashOnDelivery: false, enableOnlinePayments: false } })).status).toBe(400);

    const before = await getAdmin();
    const ok = await patch({ general: { storeTagline: `Tagline ${stamp}` } });
    expect(ok.status).toBe(200);
    const after = await getAdmin();
    expect(after.general.storeTagline).toBe(`Tagline ${stamp}`);
    expect(after.general.storeName).toBe(before.general.storeName);
    expect(after.shipping.zones.length).toBe(before.shipping.zones.length);
    expect((await request(app).get("/api/v1/store/settings/public")).body.data.general.storeTagline).toBe(`Tagline ${stamp}`);
  });

  it("lets the admin add and remove zones, and rejects rules that would leave a state without a rate", async () => {
    const zones = await zonesOf();
    const withNew = [
      ...zones.filter((z) => z.id !== "zone-2"),
      { id: "zone-south", name: "South Express", tier: "Regional", description: "", baseFee: 30, freeThreshold: 200, deliveryDays: "1 Business Day", matchType: "states", states: ["Maharashtra", "Goa"] },
    ];
    const added = await setZones(withNew);
    expect(added.status).toBe(200);
    expect(added.body.data.shipping.zones.some((z) => z.id === "zone-south")).toBe(true);
    expect(added.body.data.shipping.zones.some((z) => z.id === "zone-2")).toBe(false);

    // a state in two zones, no "rest" zone, and a zone with no states are all refused
    expect((await setZones([...withNew, { ...withNew[withNew.length - 1], id: "dup", name: "Dup", states: ["Goa"] }])).status).toBe(400);
    expect((await setZones(withNew.filter((z) => z.matchType !== "rest"))).status).toBe(400);
    expect((await setZones(withNew.map((z) => (z.id === "zone-south" ? { ...z, states: [] } : z)))).status).toBe(400);
    expect((await setZones([])).status).toBe(400);
    expect((await setZones(withNew.map((z) => (z.id === "zone-south" ? { ...z, baseFee: -1 } : z)))).status).toBe(400);

    expect((await setZones(zones)).status).toBe(200); // restore
  });

  it("prices an order from the saved zones, ignoring the price and totals the browser sends", async () => {
    // Maharashtra -> a ₹55 zone with ₹1,000 free-delivery minimum; the product costs ₹300 in the catalogue
    const zones = (await zonesOf()).map((z) => (z.matchType === "states" && z.states.includes("Maharashtra") ? { ...z, baseFee: 55, freeThreshold: 1000 } : z));
    expect((await setZones(zones)).status).toBe(200);

    const res = await place();
    expect(res.status).toBeLessThan(300);
    const pricing = res.body.data.pricing;
    expect(pricing.total).toBe(355); // 300 goods + 55 shipping, not the ₹1 the browser claimed
    expect(pricing.shipping).toBe(55);
    expect(res.body.data.items[0].unitPrice ?? res.body.data.items[0].price).toBe(300);

    // free delivery once the goods reach the zone's minimum
    expect((await setZones(zones.map((z) => (z.states?.includes("Maharashtra") ? { ...z, freeThreshold: 300 } : z)))).status).toBe(200);
    expect((await place()).body.data.pricing.shipping).toBe(0);

    // express adds the flat express fee on top
    expect((await patch({ shipping: { expressShippingFee: 120 } })).status).toBe(200);
    const express = await place({ deliveryMethod: "express" });
    expect(express.body.data.pricing.shipping).toBe(120);
  });

  it("enforces the COD / online switches and the COD limit on the server", async () => {
    expect((await setZones((await zonesOf()).map((z) => ({ ...z, baseFee: 0, freeThreshold: 0 })))).status).toBe(200);

    expect((await patch({ store: { maxCodLimit: 200 } })).status).toBe(200);
    const tooBig = await place(); // ₹300 > ₹200 limit
    expect(tooBig.status).toBe(400);
    expect(tooBig.body.error.message).toMatch(/up to/i);

    expect((await patch({ store: { maxCodLimit: 100000, enableCashOnDelivery: false } })).status).toBe(200);
    const noCod = await place();
    expect(noCod.status).toBe(400);
    expect(noCod.body.error.message).toMatch(/cash on delivery/i);

    expect((await patch({ store: { enableCashOnDelivery: true, enableOnlinePayments: false } })).status).toBe(200);
    const noOnline = await place({ paymentMethod: "Online Payment" });
    expect(noOnline.status).toBe(400);
    expect(noOnline.body.error.message).toMatch(/online payment/i);

    expect((await patch({ store: { enableOnlinePayments: true } })).status).toBe(200);
    expect((await place()).status).toBeLessThan(300);
  });
});
