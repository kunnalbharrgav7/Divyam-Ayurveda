import { describe, it, expect, afterAll } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { User } from "../../src/models/User.js";

describe.sequential("Authentication & User API Integration", () => {
  const testEmail = `testuser_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@example.test`;
  const testPhone = "9" + Math.floor(100000000 + Math.random() * 900000000);
  let customerToken = "";
  let refreshToken = "";

  it("should register a new customer account with tokens", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({
        name: "Test Customer",
        email: testEmail,
        phone: testPhone,
        password: "StrongPass!123",
      });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.data.user.email).toBe(testEmail);
    expect(res.body.data.tokens.accessToken).toBeDefined();
    expect(res.body.data.tokens.refreshToken).toBeDefined();

    customerToken = res.body.data.tokens.accessToken;
    refreshToken = res.body.data.tokens.refreshToken;
  });

  it("should prevent duplicate registration with same email", async () => {
    const res = await request(app)
      .post("/api/v1/auth/register")
      .send({
        name: "Test Customer 2",
        email: testEmail,
        password: "StrongPass!123",
      });

    expect(res.status).toBe(409);
    expect(res.body.success).toBe(false);
  });

  it("should authenticate customer with valid credentials", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: testEmail,
        password: "StrongPass!123",
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.tokens.accessToken).toBeDefined();
    refreshToken = res.body.data.tokens.refreshToken;
  });

  it("should reject customer login with invalid password", async () => {
    const res = await request(app)
      .post("/api/v1/auth/login")
      .send({
        email: testEmail,
        password: "WrongPassword999!",
      });

    expect(res.status).toBe(401);
    expect(res.body.success).toBe(false);
  });

  it("should refresh access token using valid refresh token", async () => {
    const res = await request(app)
      .post("/api/v1/auth/refresh")
      .send({ refreshToken });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.accessToken).toBeDefined();
  });

  it("should retrieve authenticated customer profile", async () => {
    const res = await request(app)
      .get("/api/v1/me")
      .set("Authorization", `Bearer ${customerToken}`);

    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe(testEmail);
    expect(res.body.data.passwordHash).toBeUndefined(); // Verify hash never leaks
  });

  it("should add and retrieve customer shipping address", async () => {
    const res = await request(app)
      .post("/api/v1/me/addresses")
      .set("Authorization", `Bearer ${customerToken}`)
      .send({
        fullName: "Test Customer",
        phone: "9876543299",
        street: "108 Green Lane",
        city: "Bengaluru",
        state: "Karnataka",
        pincode: "560001",
        isDefault: true,
      });

    expect(res.status).toBe(201);
    expect(res.body.data.city).toBe("Bengaluru");
    expect(res.body.data.isDefault).toBe(true);
  });

  afterAll(async () => {
    await User.deleteMany({ email: testEmail });
  });
});
