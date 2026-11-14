import { describe, it, expect, afterAll } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { User } from "../../src/models/User.js";
import { hashPassword } from "../../src/utils/crypto.js";

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
        phoneCountryCode: "+91",
        phone: testPhone,
        password: "StrongPass!123",
        confirmPassword: "StrongPass!123",
      });

    expect(res.status).toBe(201);
    // Stored in the canonical form: international number + separate country code and national digits
    expect(res.body.data.user.phone).toBe(`+91${testPhone}`);
    expect(res.body.data.user.phoneCountryCode).toBe("+91");
    expect(res.body.data.user.phoneNumber).toBe(testPhone);
    expect(res.body.data.user.phoneVerified).toBe(false);
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
        phoneCountryCode: "+91",
        phone: "9" + Math.floor(100000000 + Math.random() * 900000000),
        password: "StrongPass!123",
        confirmPassword: "StrongPass!123",
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

  describe("mobile number accounts", () => {
    const post = (path, body) => request(app).post(path).send(body);
    const otherEmail = `mobile_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@example.test`;
    const otherEmail2 = `mobile2_${Date.now()}_${Math.random().toString(36).slice(2, 8)}@example.test`;
    const base = {
      name: "Mobile Person",
      phoneCountryCode: "+91",
      password: "StrongPass!123",
      confirmPassword: "StrongPass!123",
    };

    it("rejects a sign-up whose confirm password does not match", async () => {
      const res = await post("/api/v1/auth/register", {
        ...base,
        email: otherEmail,
        phone: "9" + Math.floor(100000000 + Math.random() * 900000000),
        confirmPassword: "Different!123",
      });
      expect(res.status).toBe(400);
    });

    it("rejects a weak password and a number that is not valid for the country", async () => {
      const weak = await post("/api/v1/auth/register", {
        ...base,
        email: otherEmail,
        phone: "9876501234",
        password: "short",
        confirmPassword: "short",
      });
      expect(weak.status).toBe(400);

      const badNumber = await post("/api/v1/auth/register", { ...base, email: otherEmail, phone: "12345" });
      expect(badNumber.status).toBe(400);
      const notMobile = await post("/api/v1/auth/register", { ...base, email: otherEmail, phone: "5555555555" });
      expect(notMobile.status).toBe(400);
    });

    it("treats spaces and a leading 0 as formatting, and refuses a second account with the same number", async () => {
      const digits = "9" + Math.floor(100000000 + Math.random() * 900000000);
      const spaced = `0${digits.slice(0, 5)} ${digits.slice(5)}`;
      const first = await post("/api/v1/auth/register", { ...base, email: otherEmail, phone: spaced });
      expect(first.status).toBe(201);
      expect(first.body.data.user.phone).toBe(`+91${digits}`);

      const dupe = await post("/api/v1/auth/register", { ...base, email: otherEmail2, phone: digits });
      expect(dupe.status).toBe(409);

      // Same digits under a different country code are a different identity, so this one is allowed to register
      // only when the digits are a valid number there; +1 needs a US-style number, so use one that is valid
      const otherCountry = await post("/api/v1/auth/register", {
        ...base,
        email: otherEmail2,
        phoneCountryCode: "+1",
        phone: "2025550" + String(100 + Math.floor(Math.random() * 800)),
      });
      expect(otherCountry.status).toBe(201);
      expect(otherCountry.body.data.user.phone.startsWith("+1")).toBe(true);

      // Sign in by mobile: country code AND number must both match
      globalThis.__mobileDigits = digits;
    });

    it("signs in with country code + mobile number, and refuses the wrong country code or password", async () => {
      const digits = globalThis.__mobileDigits;
      const ok = await post("/api/v1/auth/login", { phoneCountryCode: "+91", phone: digits, password: "StrongPass!123" });
      expect(ok.status).toBe(200);
      expect(ok.body.data.user.email).toBe(otherEmail);

      // Number typed with spaces / trunk zero still resolves to the same account
      const spaced = await post("/api/v1/auth/login", { phoneCountryCode: "+91", phone: `0${digits.slice(0, 5)} ${digits.slice(5)}`, password: "StrongPass!123" });
      expect(spaced.status).toBe(200);

      // Same national digits under another country code must NOT sign in to this account
      const wrongCountry = await post("/api/v1/auth/login", { phoneCountryCode: "+44", phone: digits, password: "StrongPass!123" });
      expect(wrongCountry.status).toBe(401);
      expect(wrongCountry.body.error.message).toBe("Invalid mobile number or password.");

      const wrongPassword = await post("/api/v1/auth/login", { phoneCountryCode: "+91", phone: digits, password: "Nope!12345" });
      expect(wrongPassword.status).toBe(401);
      // Unknown number gives the identical message, so numbers cannot be probed
      const unknown = await post("/api/v1/auth/login", { phoneCountryCode: "+91", phone: "9000000001", password: "StrongPass!123" });
      expect(unknown.status).toBe(401);
      expect(unknown.body.error.message).toBe(wrongPassword.body.error.message);

      const nothing = await post("/api/v1/auth/login", { password: "StrongPass!123" });
      expect(nothing.status).toBe(400);
    });

    it("does not allow staff to sign in with a mobile number", async () => {
      const staffPhone = `+9188${String(Date.now()).slice(-8)}`;
      const staff = await User.create({
        name: "Phone Staff",
        email: `phonestaff_${Date.now()}@example.test`,
        phone: staffPhone,
        phoneCountryCode: "+91",
        phoneNumber: staffPhone.slice(3),
        passwordHash: await hashPassword("StaffPass!123"),
        isStaff: true,
        status: "active",
      });
      const res = await post("/api/v1/auth/login", { phoneCountryCode: "+91", phone: staffPhone.slice(3), password: "StaffPass!123" });
      expect(res.status).toBe(401);
      await User.deleteOne({ _id: staff._id });
    });

    it("changes the mobile number only with the current password", async () => {
      const login = await post("/api/v1/auth/login", { email: testEmail, password: "StrongPass!123" });
      const token = login.body.data.tokens.accessToken;
      const newDigits = "9" + Math.floor(100000000 + Math.random() * 900000000);
      const change = (body) => request(app).patch("/api/v1/me/phone").set("Authorization", `Bearer ${token}`).send(body);

      expect((await change({ phoneCountryCode: "+91", phone: newDigits, currentPassword: "WrongPass!123" })).status).toBe(400);
      // Taking a number another account already uses is refused
      expect((await change({ phoneCountryCode: "+91", phone: globalThis.__mobileDigits, currentPassword: "StrongPass!123" })).status).toBe(409);
      expect((await change({ phoneCountryCode: "+91", phone: "123", currentPassword: "StrongPass!123" })).status).toBe(400);

      const ok = await change({ phoneCountryCode: "+91", phone: newDigits, currentPassword: "StrongPass!123" });
      expect(ok.status).toBe(200);
      expect(ok.body.data.phone).toBe(`+91${newDigits}`);

      // The old number no longer signs in; the new one does
      expect((await post("/api/v1/auth/login", { phoneCountryCode: "+91", phone: testPhone, password: "StrongPass!123" })).status).toBe(401);
      expect((await post("/api/v1/auth/login", { phoneCountryCode: "+91", phone: newDigits, password: "StrongPass!123" })).status).toBe(200);

      // Editing the profile can no longer change the number
      const profile = await request(app).patch("/api/v1/me").set("Authorization", `Bearer ${token}`).send({ name: "Test Customer", phone: "9000000002" });
      expect(profile.status).toBe(200);
      expect(profile.body.data.phone).toBe(`+91${newDigits}`);
    });
  });

  afterAll(async () => {
    await User.deleteMany({ email: { $in: [testEmail, `mobile_${"%"}`] } });
    await User.deleteMany({ email: /^mobile2?_.*@example\.test$/ });
  });
});
