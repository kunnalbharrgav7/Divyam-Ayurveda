import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { User } from "../../src/models/User.js";
import { Role } from "../../src/models/Role.js";
import { ROLES } from "../../src/constants/roles.js";
import { generateAccessToken } from "../../src/utils/token.js";

describe("RBAC Permissions and Access Control Integration", () => {
  let customerToken = "";
  let superAdminToken = "";
  let unprivilegedStaffToken = "";
  let createdCustomer = null;
  let createdStaffUser = null;

  beforeAll(async () => {
    // 1. Customer token
    let customer = await User.findOne({ isStaff: false });
    if (!customer) {
      customer = await User.create({
        name: "RBAC Customer",
        email: `rbac.cust.${Date.now()}@example.test`,
        passwordHash: "testHash123",
        isStaff: false,
      });
      createdCustomer = customer;
    }
    customerToken = generateAccessToken({
      id: customer._id,
      email: customer.email,
      isStaff: false,
    });

    // 2. Super Admin token
    const admin = await User.findOne({ email: "admin@divyamayurveda.demo" });
    superAdminToken = generateAccessToken({
      id: admin._id,
      email: admin.email,
      isStaff: true,
    });

    // 3. Create an unprivileged staff user without Super Admin role
    let staffUser = await User.findOne({ email: "unprivileged.staff@divyamayurveda.test" });
    if (!staffUser) {
      staffUser = await User.create({
        name: "Unprivileged Staff",
        email: "unprivileged.staff@divyamayurveda.test",
        passwordHash: "testHash123",
        isStaff: true,
        roles: [],
        status: "active",
      });
      createdStaffUser = staffUser;
    }

    unprivilegedStaffToken = generateAccessToken({
      id: staffUser._id,
      email: staffUser.email,
      isStaff: true,
    });
  });

  afterAll(async () => {
    if (createdCustomer) await User.deleteOne({ _id: createdCustomer._id });
    if (createdStaffUser) await User.deleteOne({ _id: createdStaffUser._id });
  });

  it("should reject unauthenticated access to admin routes with 401", async () => {
    const res = await request(app).get("/api/v1/admin/dashboard");
    expect(res.status).toBe(401);
  });

  it("should deny non-staff customer from accessing admin dashboard with 403", async () => {
    const res = await request(app)
      .get("/api/v1/admin/dashboard")
      .set("Authorization", `Bearer ${customerToken}`);

    expect(res.status).toBe(403);
    expect(res.body.success).toBe(false);
  });

  it("should allow Super Admin to access admin dashboard and users", async () => {
    const res = await request(app)
      .get("/api/v1/admin/dashboard")
      .set("Authorization", `Bearer ${superAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.kpis).toBeDefined();

    const usersRes = await request(app)
      .get("/api/v1/admin/users")
      .set("Authorization", `Bearer ${superAdminToken}`);

    expect(usersRes.status).toBe(200);
  });

  it("should deny unprivileged staff from accessing admin users management with 403", async () => {
    const res = await request(app)
      .get("/api/v1/admin/users")
      .set("Authorization", `Bearer ${unprivilegedStaffToken}`);

    expect(res.status).toBe(403);
    expect(res.body.error.message).toContain("Missing required permission");
  });

  it("should confirm only one role exists in the system (Super Admin) with all permissions", async () => {
    const res = await request(app)
      .get("/api/v1/admin/roles")
      .set("Authorization", `Bearer ${superAdminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBe(1);
    expect(res.body.data[0].name).toBe("Super Admin");
    expect(res.body.data[0].permissions.length).toBe(20);
  });
});

