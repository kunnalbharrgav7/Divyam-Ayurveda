import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { User } from "../../src/models/User.js";
import { Role } from "../../src/models/Role.js";
import { Order } from "../../src/models/Order.js";
import { Product } from "../../src/models/Product.js";
import { ProductVariant } from "../../src/models/ProductVariant.js";
import { ROLES } from "../../src/constants/roles.js";
import { ALL_PERMISSIONS } from "../../src/constants/permissions.js";
import { generateAccessToken } from "../../src/utils/token.js";

// Other suites share this database, so every figure is checked as a change from a baseline taken first
describe("Revenue reporting", () => {
  const stamp = Date.now();
  let staff, createdRole, customer, product, adminAuth, custAuth;
  const email = `rev.${stamp}@example.test`;

  const report = async (query = "days=all&months=1") => (await request(app).get(`/api/v1/admin/reports/revenue?${query}`).set(adminAuth)).body.data;

  const place = async (price) => {
    const res = await request(app).post("/api/v1/orders").set(custAuth).send({
      customer: { name: "Rev Customer", email, phone: "7000000000" },
      shippingAddress: { street: "1 Road", city: "Pune", state: "Maharashtra", pincode: "411001" },
      items: [{ productId: String(product._id), name: product.name, size: "Standard", price, quantity: 1 }],
      pricing: { subtotal: price, total: price, tax: Math.round(price * 0.05) },
      paymentMethod: "Cash on Delivery (COD)",
    });
    return res.body.data.orderNumber;
  };

  beforeAll(async () => {
    let role = await Role.findOne({ name: ROLES.SUPER_ADMIN });
    if (!role) role = createdRole = await Role.create({ name: ROLES.SUPER_ADMIN, permissions: ALL_PERMISSIONS });
    staff = await User.create({ name: "Rev Admin", email: `revadmin.${stamp}@example.test`, passwordHash: "x", isStaff: true, roles: [role._id], status: "active" });
    adminAuth = { Authorization: `Bearer ${generateAccessToken({ id: staff._id, email: staff.email, isStaff: true })}` };
    const reg = await request(app).post("/api/v1/auth/register").send({ name: "Rev Customer", email, phone: `5${String(stamp).slice(-9)}`, password: "Secret123" });
    customer = reg.body.data.user;
    custAuth = { Authorization: `Bearer ${reg.body.data.tokens.accessToken}` };
    product = await Product.create({ name: `Rev Prod ${stamp}`, slug: `rev-prod-${stamp}`, sku: `REV-${stamp}`, categoryId: "wellness-essentials", description: "x", status: "active", basePricePaise: 50000 });
    await ProductVariant.create({ productId: product._id, sku: `REV-${stamp}-S`, label: "Standard", pricePaise: 50000, stockOnHand: 50, isActive: true });
  });

  afterAll(async () => {
    await Order.deleteMany({ "customer.email": email });
    await ProductVariant.deleteMany({ productId: product._id });
    await Product.deleteOne({ _id: product._id });
    await User.deleteMany({ email: { $in: [email, staff.email] } });
    if (createdRole) await Role.deleteOne({ _id: createdRole._id });
  });

  it("counts only money actually received, subtracts refunds and shows pending separately", async () => {
    const before = {};
    for (const basis of ["collected", "delivered", "booked"]) before[basis] = (await report(`days=all&months=1&basis=${basis}`)).summary;

    // The store owner's example: 1 order awaiting payment, 2 delivered and paid, 1 paid then refunded
    const pending = await place(1218);
    const paidOnline = await place(659);
    const refunded = await place(659);
    const paidCod = await place(629);
    await Order.updateOne({ orderNumber: pending }, { status: "out_for_delivery", paymentStatus: "pending" });
    await Order.updateOne({ orderNumber: paidOnline }, { status: "delivered", paymentStatus: "paid", paymentMethod: "Online Payment" });
    await Order.updateOne({ orderNumber: refunded }, { status: "returned", paymentStatus: "refunded", refundedPaise: 65900, paymentMethod: "Online Payment" });
    await Order.updateOne({ orderNumber: paidCod }, { status: "delivered", paymentStatus: "paid" });

    const collected = (await report("days=all&months=1")).summary;
    expect(collected.grossRevenue - before.collected.grossRevenue).toBe(659 + 659 + 629);
    expect(collected.refunds - before.collected.refunds).toBe(659);
    expect(collected.netRevenue - before.collected.netRevenue).toBe(659 + 629);
    expect(Math.round(collected.pendingCollection - before.collected.pendingCollection)).toBe(1218);
    expect(collected.orders - before.collected.orders).toBe(3);
    expect(collected.refundedOrders - before.collected.refundedOrders).toBe(1);

    const delivered = (await report("days=all&months=1&basis=delivered")).summary;
    expect(delivered.netRevenue - before.delivered.netRevenue).toBe(659 + 629);

    const booked = (await report("days=all&months=1&basis=booked")).summary;
    expect(booked.grossRevenue - before.booked.grossRevenue).toBe(1218 + 659 + 659 + 629); // the old, misleading "gross"
    expect(booked.netRevenue - before.booked.netRevenue).toBe(1218 + 659 + 629);

    // Cancelling the unpaid order removes it from pending and from "booked"
    await Order.updateOne({ orderNumber: pending }, { status: "cancelled" });
    expect((await report("days=all&months=1")).summary.pendingCollection - before.collected.pendingCollection).toBe(0);
    expect((await report("days=all&months=1&basis=booked")).summary.grossRevenue - before.booked.grossRevenue).toBe(659 + 659 + 629);
  });

  it("reports the dashboard KPI, the trend, payment split and top products from the same figures", async () => {
    const full = await report("days=30&months=3&basis=collected");
    expect(full.basis).toBe("collected");
    expect(full.bases.map((b) => b.key)).toEqual(["collected", "delivered", "booked"]);
    expect(full.trend).toHaveLength(3);
    const thisMonth = full.trend[2];
    expect(thisMonth.net).toBe(thisMonth.gross - thisMonth.refunds);
    expect(full.summary.netRevenue).toBeCloseTo(full.summary.grossRevenue - full.summary.refunds, 2);
    expect(full.paymentMethods.reduce((s, m) => s + m.net, 0)).toBeCloseTo(full.summary.netRevenue, 1);
    expect(full.topProducts.length).toBeGreaterThan(0);

    const dash = (await request(app).get("/api/v1/admin/dashboard").set(adminAuth)).body.data.kpis;
    const all = (await report("days=all&months=1")).summary;
    expect(dash.totalRevenue).toBe(all.netRevenue);
    expect(dash.grossRevenue).toBe(all.grossRevenue);

    expect((await request(app).get("/api/v1/admin/reports/revenue?basis=nonsense").set(adminAuth)).status).toBe(400);
    expect((await request(app).get("/api/v1/admin/reports/revenue").set(custAuth)).status).toBe(403);
  });
});
