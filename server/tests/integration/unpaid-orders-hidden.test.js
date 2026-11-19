import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { Order } from "../../src/models/Order.js";
import { User } from "../../src/models/User.js";
import { Role } from "../../src/models/Role.js";
import { ROLES } from "../../src/constants/roles.js";
import { ALL_PERMISSIONS } from "../../src/constants/permissions.js";
import { generateAccessToken } from "../../src/utils/token.js";
import { PAYMENT_WINDOW_MS } from "../../src/integrations/cashfree/cashfree.adapter.js";

describe("An unpaid online checkout is not an order yet", () => {
  let auth;
  const stamp = Date.now();
  const unpaid = `DA-UNPAID-${stamp}`;
  const paid = `DA-PAID-${stamp}`;

  beforeAll(async () => {
    let role = await Role.findOne({ name: ROLES.SUPER_ADMIN });
    if (!role) role = await Role.create({ name: ROLES.SUPER_ADMIN, description: "Super Administrator", permissions: ALL_PERMISSIONS });
    let admin = await User.findOne({ email: "admin@divyamayurveda.demo" });
    if (!admin) admin = await User.create({ name: "Super Admin", email: "admin@divyamayurveda.demo", passwordHash: "testHash123", isStaff: true, isOwner: true, roles: [role._id] });
    auth = { Authorization: `Bearer ${generateAccessToken({ id: admin._id, email: admin.email, isStaff: true })}` };
    // raw inserts: only the fields this test is about
    await Order.collection.insertMany([
      { orderNumber: unpaid, status: "pending_payment", paymentStatus: "pending", customer: { name: "Unpaid Buyer", email: "u@example.test" }, createdAt: new Date(), updatedAt: new Date() },
      { orderNumber: paid, status: "confirmed", paymentStatus: "paid", customer: { name: "Paid Buyer", email: "p@example.test" }, createdAt: new Date(), updatedAt: new Date() },
    ]);
  });

  afterAll(async () => {
    await Order.collection.deleteMany({ orderNumber: { $in: [unpaid, paid] } });
  });

  it("the staff order list leaves it out until it is paid", async () => {
    const res = await request(app).get("/api/v1/admin/orders?limit=100").set(auth);
    const numbers = res.body.data.map((o) => o.orderNumber);
    expect(numbers).toContain(paid);
    expect(numbers).not.toContain(unpaid);
  });

  it("but staff can still ask for those checkouts on purpose", async () => {
    const res = await request(app).get("/api/v1/admin/orders?status=pending_payment&limit=100").set(auth);
    expect(res.body.data.map((o) => o.orderNumber)).toContain(unpaid);
  });

  it("holds the goods for a short time only (30 minutes unless configured)", () => {
    expect(PAYMENT_WINDOW_MS).toBeGreaterThanOrEqual(15 * 60 * 1000);
    expect(PAYMENT_WINDOW_MS).toBeLessThanOrEqual(60 * 60 * 1000);
  });
});
