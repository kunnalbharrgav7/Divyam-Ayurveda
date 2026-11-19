import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { User } from "../../src/models/User.js";
import { Role } from "../../src/models/Role.js";
import { ROLES } from "../../src/constants/roles.js";
import { ALL_PERMISSIONS } from "../../src/constants/permissions.js";
import { generateAccessToken } from "../../src/utils/token.js";

describe("Admin: are payments and the courier real or fake on this server?", () => {
  let adminAuth;
  let customerAuth;
  let customerId;
  const stamp = Date.now();

  beforeAll(async () => {
    let role = await Role.findOne({ name: ROLES.SUPER_ADMIN });
    if (!role) role = await Role.create({ name: ROLES.SUPER_ADMIN, description: "Super Administrator", permissions: ALL_PERMISSIONS });
    let admin = await User.findOne({ email: "admin@divyamayurveda.demo" });
    if (!admin) admin = await User.create({ name: "Super Admin", email: "admin@divyamayurveda.demo", passwordHash: "testHash123", isStaff: true, isOwner: true, roles: [role._id] });
    adminAuth = { Authorization: `Bearer ${generateAccessToken({ id: admin._id, email: admin.email, isStaff: true })}` };
    const customer = await User.create({ name: "Plain Customer", email: `status.${stamp}@example.test`, passwordHash: "x", status: "active" });
    customerId = customer._id;
    customerAuth = { Authorization: `Bearer ${generateAccessToken({ id: customer._id, email: customer.email, isStaff: false })}` };
  });

  afterAll(async () => {
    await User.deleteOne({ _id: customerId });
  });

  it("staff see the mode (tests run on the fake adapters, and it says so) and no secrets", async () => {
    const res = await request(app).get("/api/v1/admin/system/integrations").set(adminAuth);
    expect(res.status).toBe(200);
    const d = res.body.data;
    expect(d.cashfree.live).toBe(false);
    expect(d.cashfree.mode).toMatch(/FAKE/);
    expect(d.shiprocket.live).toBe(false);
    expect(d.shiprocket.mode).toMatch(/FAKE/);
    expect(typeof d.cashfree.webhookUrlIsHttps).toBe("boolean");
    const text = JSON.stringify(res.body);
    for (const secret of ["TEST_CF_SECRET_KEY", "TestShiprocketPass", "test_shiprocket_webhook_secret", "JWT_", "PEPPER"]) expect(text).not.toContain(secret);
  });

  it("customers and signed-out visitors cannot read it", async () => {
    expect((await request(app).get("/api/v1/admin/system/integrations").set(customerAuth)).status).toBe(403);
    expect((await request(app).get("/api/v1/admin/system/integrations")).status).toBe(401);
  });
});
