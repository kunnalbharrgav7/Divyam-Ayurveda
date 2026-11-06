import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { execFileSync, spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import app from "../../src/app.js";
import { User } from "../../src/models/User.js";
import { Role } from "../../src/models/Role.js";
import { ROLES } from "../../src/constants/roles.js";
import { ALL_PERMISSIONS } from "../../src/constants/permissions.js";
import { hashPassword } from "../../src/utils/crypto.js";
import { generateAccessToken } from "../../src/utils/token.js";

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const stamp = Date.now();
const created = [];
let superAdminRole;

const makeStaff = async (label, password) => {
  const user = await User.create({
    name: `Creds ${label}`,
    email: `creds.${label}.${stamp}@example.test`,
    phone: `+9199${String(stamp).slice(-6)}${label.length}${created.length}`,
    passwordHash: await hashPassword(password),
    isStaff: true,
    roles: [superAdminRole._id],
    status: "active",
  });
  created.push(user._id);
  return user;
};

const staffLogin = (email, password) => request(app).post("/api/v1/auth/staff/login").send({ email, password });
const profile = (token) => request(app).get("/api/v1/admin/profile").set("Authorization", `Bearer ${token}`);
const changeEmail = (token, body) => request(app).patch("/api/v1/admin/profile/email").set("Authorization", `Bearer ${token}`).send(body);
const changePassword = (token, body) => request(app).patch("/api/v1/admin/profile/password").set("Authorization", `Bearer ${token}`).send(body);

describe.sequential("Admin profile & security", () => {
  beforeAll(async () => {
    superAdminRole = await Role.findOne({ name: ROLES.SUPER_ADMIN });
    if (!superAdminRole) {
      superAdminRole = await Role.create({ name: ROLES.SUPER_ADMIN, description: "Super Administrator", permissions: ALL_PERMISSIONS });
    }
  });

  afterAll(async () => {
    await User.deleteMany({ _id: { $in: created } });
  });

  describe("profile", () => {
    it("returns the signed-in admin's own details and nothing secret", async () => {
      const admin = await makeStaff("profile", "OldPass123");
      const login = await staffLogin(admin.email, "OldPass123");
      expect(login.status).toBe(200);

      const res = await profile(login.body.data.tokens.accessToken);
      expect(res.status).toBe(200);
      expect(res.body.data).toMatchObject({ email: admin.email, name: "Creds profile", roles: [ROLES.SUPER_ADMIN], status: "active" });
      const text = JSON.stringify(res.body);
      for (const secret of ["passwordHash", "refreshTokenHash", "tokenVersion", "$2a$", "$2b$", login.body.data.tokens.refreshToken]) {
        expect(text).not.toContain(secret);
      }
    });

    it("rejects a request with no token, and a customer account", async () => {
      expect((await request(app).get("/api/v1/admin/profile")).status).toBe(401);

      const customer = await User.create({ name: "Creds Customer", email: `creds.cust.${stamp}@example.test`, phone: `+9188${String(stamp).slice(-8)}`, passwordHash: await hashPassword("CustPass123"), isStaff: false, status: "active" });
      created.push(customer._id);
      const token = generateAccessToken({ id: customer._id, email: customer.email, isStaff: false });
      expect((await profile(token)).status).toBe(403);
      expect((await changeEmail(token, { newEmail: "x@example.test", currentPassword: "CustPass123" })).status).toBe(403);
      expect((await changePassword(token, { currentPassword: "CustPass123", newPassword: "NewPass12345" })).status).toBe(403);
    });
  });

  describe("change email", () => {
    it("rejects the wrong password, a bad address, the same address and an address already in use", async () => {
      const admin = await makeStaff("emailbad", "OldPass123");
      const other = await makeStaff("emailother", "OtherPass123");
      const token = (await staffLogin(admin.email, "OldPass123")).body.data.tokens.accessToken;

      const wrong = await changeEmail(token, { newEmail: `fresh.${stamp}@example.test`, currentPassword: "nope-nope" });
      expect(wrong.status).toBe(400);
      expect(wrong.body.error.message).toMatch(/current password is incorrect/i);

      expect((await changeEmail(token, { newEmail: "not-an-email", currentPassword: "OldPass123" })).status).toBe(400);
      expect((await changeEmail(token, { newEmail: "", currentPassword: "OldPass123" })).status).toBe(400);
      expect((await changeEmail(token, { newEmail: "someone@example.test" })).status).toBe(400);

      const same = await changeEmail(token, { newEmail: admin.email.toUpperCase(), currentPassword: "OldPass123" });
      expect(same.status).toBe(400);
      expect(same.body.error.message).toMatch(/same as the current/i);

      const taken = await changeEmail(token, { newEmail: other.email, currentPassword: "OldPass123" });
      expect(taken.status).toBe(409);
      expect(JSON.stringify(taken.body)).not.toContain(other.email); // does not confirm who owns it

      expect((await User.findById(admin._id)).email).toBe(admin.email); // nothing changed
      expect((await profile(token)).status).toBe(200); // and the session is still good
    });

    it("updates the email, ends every session, and only the new address can sign in", async () => {
      const admin = await makeStaff("emailok", "OldPass123");
      const first = (await staffLogin(admin.email, "OldPass123")).body.data.tokens;
      const second = (await staffLogin(admin.email, "OldPass123")).body.data.tokens; // another device

      const newEmail = `  New.Admin.${stamp}@Example.TEST `;
      const res = await changeEmail(first.accessToken, { newEmail, currentPassword: "OldPass123" });
      expect(res.status).toBe(200);
      expect(res.body.data.reauthenticate).toBe(true);
      expect(JSON.stringify(res.body)).not.toMatch(/token|passwordHash/i);

      expect((await User.findById(admin._id)).email).toBe(newEmail.trim().toLowerCase());

      // every token issued before the change is dead, on every device, access and refresh alike
      expect((await profile(first.accessToken)).status).toBe(401);
      expect((await profile(second.accessToken)).status).toBe(401);
      expect((await request(app).post("/api/v1/auth/refresh").send({ refreshToken: first.refreshToken })).status).toBe(401);
      expect((await request(app).post("/api/v1/auth/refresh").send({ refreshToken: second.refreshToken })).status).toBe(401);

      expect((await staffLogin(admin.email, "OldPass123")).status).toBe(401); // old email no longer works
      const again = await staffLogin(newEmail.trim().toLowerCase(), "OldPass123"); // new email, same password
      expect(again.status).toBe(200);
      expect((await profile(again.body.data.tokens.accessToken)).status).toBe(200);
    });
  });

  describe("change password", () => {
    it("rejects the wrong password, weak passwords and reusing the current one", async () => {
      const admin = await makeStaff("pwbad", "OldPass123");
      const token = (await staffLogin(admin.email, "OldPass123")).body.data.tokens.accessToken;

      expect((await changePassword(token, { currentPassword: "wrong-wrong", newPassword: "BrandNew456" })).status).toBe(400);
      expect((await changePassword(token, { currentPassword: "OldPass123", newPassword: "short1" })).status).toBe(400); // too short
      expect((await changePassword(token, { currentPassword: "OldPass123", newPassword: "onlyletterslong" })).status).toBe(400); // no number
      expect((await changePassword(token, { currentPassword: "OldPass123", newPassword: "123456789012" })).status).toBe(400); // no letter
      expect((await changePassword(token, { newPassword: "BrandNew456" })).status).toBe(400); // no current password

      const reuse = await changePassword(token, { currentPassword: "OldPass123", newPassword: "OldPass123" });
      expect(reuse.status).toBe(400);
      expect(reuse.body.error.message).toMatch(/different from your current password/i);

      expect((await staffLogin(admin.email, "OldPass123")).status).toBe(200); // password unchanged
    });

    it("sets the new password, stores only a hash, and ends every session", async () => {
      const admin = await makeStaff("pwok", "OldPass123");
      const first = (await staffLogin(admin.email, "OldPass123")).body.data.tokens;
      const second = (await staffLogin(admin.email, "OldPass123")).body.data.tokens;

      const res = await changePassword(first.accessToken, { currentPassword: "OldPass123", newPassword: "BrandNew456" });
      expect(res.status).toBe(200);
      expect(res.body.data.reauthenticate).toBe(true);
      expect(JSON.stringify(res.body)).not.toMatch(/BrandNew456|OldPass123|passwordHash/);

      const stored = await User.findById(admin._id).select("+passwordHash");
      expect(stored.passwordHash).toMatch(/^\$2[aby]\$/);
      expect(stored.passwordHash).not.toContain("BrandNew456");
      expect(stored.passwordChangedAt).toBeTruthy();

      expect((await profile(first.accessToken)).status).toBe(401);
      expect((await profile(second.accessToken)).status).toBe(401);
      expect((await request(app).post("/api/v1/auth/refresh").send({ refreshToken: second.refreshToken })).status).toBe(401);

      expect((await staffLogin(admin.email, "OldPass123")).status).toBe(401); // old password
      const fresh = await staffLogin(admin.email, "BrandNew456");
      expect(fresh.status).toBe(200);
      expect((await profile(fresh.body.data.tokens.accessToken)).status).toBe(200);
    });

    it("locks the account after five wrong current passwords, so a stolen session cannot guess the password", async () => {
      const admin = await makeStaff("pwlock", "OldPass123");
      const token = (await staffLogin(admin.email, "OldPass123")).body.data.tokens.accessToken;

      for (let i = 0; i < 5; i += 1) {
        expect((await changePassword(token, { currentPassword: `wrong-guess-${i}`, newPassword: "BrandNew456" })).status).toBe(400);
      }
      // even the right password is refused now
      expect((await changePassword(token, { currentPassword: "OldPass123", newPassword: "BrandNew456" })).status).toBe(403);
      expect((await User.findById(admin._id).select("+passwordHash")).lockUntil.getTime()).toBeGreaterThan(Date.now());
    });
  });

  describe("existing behaviour stays as it was", () => {
    it("a customer changing their own password keeps working and is not signed out of the access token", async () => {
      const email = `creds.shopper.${stamp}@example.test`;
      const reg = await request(app).post("/api/v1/auth/register").send({ name: "Shopper One", email, phone: `98${String(stamp).slice(-8)}`, password: "Shopper123" });
      expect(reg.status).toBe(201);
      created.push(reg.body.data.user.id);
      const token = reg.body.data.tokens.accessToken;

      expect((await request(app).patch("/api/v1/me/password").set("Authorization", `Bearer ${token}`).send({ currentPassword: "Shopper123", newPassword: "Shopper123" })).status).toBe(400);
      expect((await request(app).patch("/api/v1/me/password").set("Authorization", `Bearer ${token}`).send({ currentPassword: "Shopper123", newPassword: "Shopper456" })).status).toBe(200);
      expect((await request(app).get("/api/v1/me").set("Authorization", `Bearer ${token}`)).status).toBe(200);
      expect((await request(app).post("/api/v1/auth/login").send({ email, password: "Shopper456" })).status).toBe(200);
    });

    it("tokens issued without a session version (older ones, and the test helpers) still work for an unchanged account", async () => {
      const admin = await makeStaff("legacy", "OldPass123");
      const token = generateAccessToken({ id: admin._id, email: admin.email, isStaff: true });
      expect((await profile(token)).status).toBe(200);
    });
  });

  describe("provisioning scripts", () => {
    const run = (script, env = {}) =>
      spawnSync(process.execPath, [path.join("scripts", script)], { cwd: serverRoot, env: { ...process.env, ...env }, encoding: "utf8", timeout: 20000 });

    it("create-admin refuses to run in production, before it touches the database", () => {
      const result = run("create-admin.js", { NODE_ENV: "production", ALLOW_PRODUCTION_ADMIN_CREATE: "" });
      expect(result.status).toBe(1);
      expect(`${result.stdout}${result.stderr}`).toMatch(/disabled in production/);
    });

    it("create-admin in production still refuses a weak or missing password even when deliberately enabled", () => {
      const weak = run("create-admin.js", { NODE_ENV: "production", ALLOW_PRODUCTION_ADMIN_CREATE: "true", ADMIN_EMAIL: "boss@example.test", ADMIN_PASSWORD: "short1" });
      expect(weak.status).toBe(1);
      expect(`${weak.stdout}${weak.stderr}`).toMatch(/ADMIN_PASSWORD must be at least 12/);

      const missing = run("create-admin.js", { NODE_ENV: "production", ALLOW_PRODUCTION_ADMIN_CREATE: "true", ADMIN_EMAIL: "", ADMIN_PASSWORD: "" });
      expect(missing.status).toBe(1);
    });

    it("create-admin cannot reset a password in production", () => {
      const result = spawnSync(process.execPath, [path.join("scripts", "create-admin.js"), "--reset-password"], {
        cwd: serverRoot,
        env: { ...process.env, NODE_ENV: "production", ALLOW_PRODUCTION_ADMIN_CREATE: "true", ADMIN_EMAIL: "boss@example.test", ADMIN_PASSWORD: "A-long-enough-pass-1" },
        encoding: "utf8",
        timeout: 20000,
      });
      expect(result.status).toBe(1);
      expect(`${result.stdout}${result.stderr}`).toMatch(/not available in production/);
    });

    it("the demo seed refuses to run in production", () => {
      const result = run("seed.js", { NODE_ENV: "production", ALLOW_DEMO_SEED: "true" });
      expect(result.status).toBe(1);
      expect(`${result.stdout}${result.stderr}`).toMatch(/disabled when NODE_ENV=production/);
    });

    it("neither script is wired into build or start", () => {
      const pkg = JSON.parse(execFileSync(process.execPath, ["-e", "process.stdout.write(require('fs').readFileSync('package.json','utf8'))"], { cwd: serverRoot, encoding: "utf8" }));
      for (const name of ["build", "start", "postinstall", "prestart", "prebuild", "postbuild"]) {
        expect(pkg.scripts[name] || "").not.toMatch(/seed|create-admin/);
      }
    });
  });
});
