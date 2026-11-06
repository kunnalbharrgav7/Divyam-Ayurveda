import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { spawnSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import app from "../../src/app.js";
import { User } from "../../src/models/User.js";
import { Role } from "../../src/models/Role.js";
import { AuditLog } from "../../src/models/AuditLog.js";
import { ROLES } from "../../src/constants/roles.js";
import { ALL_PERMISSIONS } from "../../src/constants/permissions.js";
import { hashPassword, generateTemporaryPassword } from "../../src/utils/crypto.js";

const serverRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const stamp = Date.now();
const created = [];
let superRole;
let owner; // the signed-in admin doing the managing
let ownerToken;

const login = (email, password) => request(app).post("/api/v1/auth/staff/login").send({ email, password });
const as = (token, req) => req.set("Authorization", `Bearer ${token}`);
const createStaff = (body) => as(ownerToken, request(app).post("/api/v1/admin/users")).send(body);

describe.sequential("Admin staff management", () => {
  beforeAll(async () => {
    superRole = await Role.findOne({ name: ROLES.SUPER_ADMIN });
    if (!superRole) superRole = await Role.create({ name: ROLES.SUPER_ADMIN, description: "Super Administrator", permissions: ALL_PERMISSIONS });
    owner = await User.create({
      name: "Staff Owner",
      email: `staff.owner.${stamp}@example.test`,
      phone: `+9177${String(stamp).slice(-8)}`,
      passwordHash: await hashPassword("OwnerPass123"),
      isStaff: true,
      isOwner: true,
      roles: [superRole._id],
      status: "active",
    });
    created.push(owner._id);
    ownerToken = (await login(owner.email, "OwnerPass123")).body.data.tokens.accessToken;
  });

  afterAll(async () => {
    await User.deleteMany({ _id: { $in: created } });
    await AuditLog.deleteMany({ targetId: { $in: created.map(String) } });
  });

  it("generates strong temporary passwords that never repeat the published default", () => {
    const seen = new Set();
    for (let i = 0; i < 200; i += 1) {
      const p = generateTemporaryPassword();
      expect(p).toHaveLength(14);
      expect(p).toMatch(/[A-Za-z]/);
      expect(p).toMatch(/\d/);
      expect(p).not.toMatch(/[01OolI]/);
      expect(p).not.toBe("DivyamAdmin!2026");
      seen.add(p);
    }
    expect(seen.size).toBe(200);
  });

  describe("adding staff", () => {
    it("creates an administrator with a generated temporary password, shown once and stored only as a hash", async () => {
      const email = `new.staff.${stamp}@Example.TEST`;
      const res = await createStaff({ name: "New Staff", email, phone: `98${String(stamp).slice(-8)}` });
      expect(res.status).toBe(201);
      created.push(res.body.data.id);

      const temp = res.body.data.temporaryPassword;
      expect(temp).toHaveLength(14);
      expect(temp).not.toBe("DivyamAdmin!2026");
      expect(res.body.data.email).toBe(email.toLowerCase());
      expect(res.body.data.isStaff).toBe(true);
      expect(res.body.data.mustChangePassword).toBe(true);
      expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|refreshTokenHash/);

      const stored = await User.findById(res.body.data.id).select("+passwordHash").populate("roles");
      expect(stored.passwordHash).not.toContain(temp);
      expect(stored.roles.map((r) => r.name)).toEqual([ROLES.SUPER_ADMIN]); // everyone is a full administrator
      expect(stored.mustChangePassword).toBe(true);

      // the old published default does not work, the temporary one does
      expect((await login(email.toLowerCase(), "DivyamAdmin!2026")).status).toBe(401);
      expect((await login(email.toLowerCase(), temp)).status).toBe(200);

      // listing the team never repeats the password
      const list = await as(ownerToken, request(app).get("/api/v1/admin/users"));
      expect(JSON.stringify(list.body)).not.toContain(temp);
    });

    it("accepts a temporary password typed by the admin if it meets the password rules, and refuses weak ones", async () => {
      const weak = await createStaff({ name: "Weak Pass", email: `weak.${stamp}@example.test`, password: "short1" });
      expect(weak.status).toBe(400);
      const noNumber = await createStaff({ name: "Weak Pass", email: `weak2.${stamp}@example.test`, password: "onlyletterslong" });
      expect(noNumber.status).toBe(400);

      const ok = await createStaff({ name: "Typed Pass", email: `typed.${stamp}@example.test`, password: "Typed-Pass-77" });
      expect(ok.status).toBe(201);
      created.push(ok.body.data.id);
      expect((await login(`typed.${stamp}@example.test`, "Typed-Pass-77")).status).toBe(200);
    });

    it("rejects a missing name, a bad email, a duplicate email and a duplicate phone with clear messages", async () => {
      const dupEmail = `dup.${stamp}@example.test`;
      const first = await createStaff({ name: "Dup One", email: dupEmail, phone: `97${String(stamp).slice(-8)}` });
      expect(first.status).toBe(201);
      created.push(first.body.data.id);

      expect((await createStaff({ name: "", email: `x.${stamp}@example.test` })).status).toBe(400);
      expect((await createStaff({ name: "Bad Email", email: "not-an-email" })).status).toBe(400);
      expect((await createStaff({ name: "Bad Phone", email: `bp.${stamp}@example.test`, phone: "123" })).status).toBe(400);

      const sameEmail = await createStaff({ name: "Dup Two", email: dupEmail.toUpperCase() });
      expect(sameEmail.status).toBe(409);
      expect(sameEmail.body.error.message).toMatch(/email address already exists/i);

      const samePhone = await createStaff({ name: "Dup Three", email: `dup3.${stamp}@example.test`, phone: `97${String(stamp).slice(-8)}` });
      expect(samePhone.status).toBe(409);
      expect(samePhone.body.error.message).toMatch(/phone number/i);
    });

    it("needs a signed-in administrator", async () => {
      expect((await request(app).post("/api/v1/admin/users").send({ name: "No Auth", email: `na.${stamp}@example.test` })).status).toBe(401);
    });

    it("records who added whom in the audit log, without the password", async () => {
      const email = `audit.${stamp}@example.test`;
      const res = await createStaff({ name: "Audited Staff", email });
      created.push(res.body.data.id);
      const entry = await AuditLog.findOne({ action: "users.create", targetId: res.body.data.id }).lean();
      expect(entry).toBeTruthy();
      expect(entry.details).toContain(email);
      expect(JSON.stringify(entry)).not.toContain(res.body.data.temporaryPassword);
    });
  });

  describe("first sign-in with a temporary password", () => {
    it("blocks every admin page except your own profile and password change until a new password is set", async () => {
      const email = `forced.${stamp}@example.test`;
      const temp = (await createStaff({ name: "Forced Change", email })).body.data;
      created.push(temp.id);
      const token = (await login(email, temp.temporaryPassword)).body.data.tokens.accessToken;

      const orders = await as(token, request(app).get("/api/v1/admin/orders"));
      expect(orders.status).toBe(403);
      expect(orders.body.error.message).toMatch(/must set a new password/i);
      expect((await as(token, request(app).get("/api/v1/admin/dashboard"))).status).toBe(403);
      expect((await as(token, request(app).post("/api/v1/admin/users")).send({ name: "Sneaky", email: `s.${stamp}@example.test` })).status).toBe(403);
      expect((await as(token, request(app).patch("/api/v1/admin/profile/email")).send({ newEmail: `n.${stamp}@example.test`, currentPassword: temp.temporaryPassword })).status).toBe(403);

      const profile = await as(token, request(app).get("/api/v1/admin/profile"));
      expect(profile.status).toBe(200);
      expect(profile.body.data.mustChangePassword).toBe(true);

      // setting a real password lifts the block (and signs them out, as every password change does)
      const change = await as(token, request(app).patch("/api/v1/admin/profile/password")).send({ currentPassword: temp.temporaryPassword, newPassword: "MyOwnPass2026" });
      expect(change.status).toBe(200);
      expect((await login(email, temp.temporaryPassword)).status).toBe(401);

      const fresh = await login(email, "MyOwnPass2026");
      expect(fresh.status).toBe(200);
      expect(fresh.body.data.user.mustChangePassword).toBe(false);
      expect((await as(fresh.body.data.tokens.accessToken, request(app).get("/api/v1/admin/orders"))).status).toBe(200);
    });

    it("a normal admin who never had a temporary password is not affected", async () => {
      expect((await as(ownerToken, request(app).get("/api/v1/admin/orders"))).status).toBe(200);
    });
  });

  describe("editing, resetting and removing staff", () => {
    const makeStaffMember = async (label) => {
      const res = await createStaff({ name: `Member ${label}`, email: `member.${label}.${stamp}@example.test` });
      created.push(res.body.data.id);
      return res.body.data;
    };

    it("edits name and phone, and refuses a phone number someone else uses", async () => {
      const a = await makeStaffMember("edit-a");
      const b = await makeStaffMember("edit-b");
      const phoneA = `96${String(stamp).slice(-8)}`;

      const ok = await as(ownerToken, request(app).patch(`/api/v1/admin/users/${a.id}`)).send({ name: "Renamed Member", phone: phoneA });
      expect(ok.status).toBe(200);
      expect((await User.findById(a.id)).phone).toBe(phoneA);

      const clash = await as(ownerToken, request(app).patch(`/api/v1/admin/users/${b.id}`)).send({ phone: phoneA });
      expect(clash.status).toBe(409);
    });

    it("ignores any role or password sent with an edit (roles are gone, and passwords change through reset)", async () => {
      const m = await makeStaffMember("ignored");
      const before = await User.findById(m.id).select("+passwordHash");
      const res = await as(ownerToken, request(app).patch(`/api/v1/admin/users/${m.id}`)).send({ role: "Anything", password: "Sneaky-Pass-9", name: "Still Fine" });
      expect(res.status).toBe(200);
      const after = await User.findById(m.id).select("+passwordHash");
      expect(after.passwordHash).toBe(before.passwordHash);
      expect(after.name).toBe("Still Fine");
    });

    it("deactivating a staff member signs them out at once and stops sign-in; reactivating allows it again", async () => {
      const m = await makeStaffMember("deactivate");
      const email = m.email;
      await as(ownerToken, request(app).post(`/api/v1/admin/users/${m.id}/reset-password`)); // get a known password
      const known = (await as(ownerToken, request(app).post(`/api/v1/admin/users/${m.id}/reset-password`))).body.data.temporaryPassword;
      // finish the forced change so they can use the admin
      const firstLogin = await login(email, known);
      await as(firstLogin.body.data.tokens.accessToken, request(app).patch("/api/v1/admin/profile/password")).send({ currentPassword: known, newPassword: "Settled-Pass-55" });
      const live = (await login(email, "Settled-Pass-55")).body.data.tokens;
      expect((await as(live.accessToken, request(app).get("/api/v1/admin/orders"))).status).toBe(200);

      expect((await as(ownerToken, request(app).patch(`/api/v1/admin/users/${m.id}`)).send({ status: "suspended" })).status).toBe(200);
      expect((await as(live.accessToken, request(app).get("/api/v1/admin/orders"))).status).toBeGreaterThanOrEqual(401);
      expect((await request(app).post("/api/v1/auth/refresh").send({ refreshToken: live.refreshToken })).status).toBe(401);
      expect((await login(email, "Settled-Pass-55")).status).toBe(403);

      expect((await as(ownerToken, request(app).patch(`/api/v1/admin/users/${m.id}`)).send({ status: "active" })).status).toBe(200);
      expect((await login(email, "Settled-Pass-55")).status).toBe(200);
    });

    it("reset password: new temporary password, old one and old sessions dead, change forced again", async () => {
      const m = await makeStaffMember("reset");
      const email = m.email;
      const sessions = (await login(email, m.temporaryPassword)).body.data.tokens;

      const reset = await as(ownerToken, request(app).post(`/api/v1/admin/users/${m.id}/reset-password`));
      expect(reset.status).toBe(200);
      const fresh = reset.body.data.temporaryPassword;
      expect(fresh).toHaveLength(14);
      expect(fresh).not.toBe(m.temporaryPassword);

      expect((await request(app).get("/api/v1/admin/profile").set("Authorization", `Bearer ${sessions.accessToken}`)).status).toBe(401);
      expect((await login(email, m.temporaryPassword)).status).toBe(401);
      const again = await login(email, fresh);
      expect(again.status).toBe(200);
      expect(again.body.data.user.mustChangePassword).toBe(true);

      expect(JSON.stringify(await as(ownerToken, request(app).get("/api/v1/admin/users")).then((r) => r.body))).not.toContain(fresh);
      const entry = await AuditLog.findOne({ action: "users.reset_password", targetId: m.id }).lean();
      expect(entry).toBeTruthy();
      expect(JSON.stringify(entry)).not.toContain(fresh);
    });

    it("refuses to reset your own password here, an unknown staff id, and a customer account", async () => {
      expect((await as(ownerToken, request(app).post(`/api/v1/admin/users/${owner.id}/reset-password`))).status).toBe(403);
      expect((await as(ownerToken, request(app).post("/api/v1/admin/users/64b000000000000000000000/reset-password"))).status).toBe(404);

      const customer = await User.create({ name: "Cust", email: `cust.${stamp}@example.test`, phone: `+9166${String(stamp).slice(-8)}`, passwordHash: await hashPassword("CustPass123"), isStaff: false, status: "active" });
      created.push(customer._id);
      expect((await as(ownerToken, request(app).post(`/api/v1/admin/users/${customer.id}/reset-password`))).status).toBe(404);
      expect((await request(app).post(`/api/v1/admin/users/${owner.id}/reset-password`)).status).toBe(401);
    });

    it("removes a staff member, ending their access", async () => {
      const m = await makeStaffMember("remove");
      const token = (await login(m.email, m.temporaryPassword)).body.data.tokens.accessToken;
      expect((await as(ownerToken, request(app).delete(`/api/v1/admin/users/${m.id}`))).status).toBe(200);
      expect(await User.findById(m.id)).toBeNull();
      expect((await request(app).get("/api/v1/admin/profile").set("Authorization", `Bearer ${token}`)).status).toBe(401);
    });
  });

  describe("only the owner manages the team, and the owner cannot be touched", () => {
    let member; // a normal staff member, signed in
    let memberToken;

    beforeAll(async () => {
      const email = `plain.member.${stamp}@example.test`;
      const res = await createStaff({ name: "Plain Member", email, password: "Member-Pass-12" });
      created.push(res.body.data.id);
      member = res.body.data;
      // finish the forced change so the member can use the admin
      const first = await login(email, "Member-Pass-12");
      await as(first.body.data.tokens.accessToken, request(app).patch("/api/v1/admin/profile/password")).send({ currentPassword: "Member-Pass-12", newPassword: "Member-Own-Pass-34" });
      memberToken = (await login(email, "Member-Own-Pass-34")).body.data.tokens.accessToken;
    });

    it("a staff member is not the owner and the list marks who is", async () => {
      const profile = await as(memberToken, request(app).get("/api/v1/admin/profile"));
      expect(profile.body.data.isOwner).toBe(false);
      const mine = await as(ownerToken, request(app).get("/api/v1/admin/profile"));
      expect(mine.body.data.isOwner).toBe(true);

      const list = await as(ownerToken, request(app).get("/api/v1/admin/users"));
      expect(list.body.data.find((u) => u.id === String(owner._id)).isOwner).toBe(true);
      expect(list.body.data.find((u) => u.id === member.id).isOwner).toBe(false);
    });

    it("a staff member gets 403 on every team-management route, and nothing changes", async () => {
      const target = (await createStaff({ name: "Untouched", email: `untouched.${stamp}@example.test` })).body.data;
      created.push(target.id);
      const before = await User.findById(target.id).select("+passwordHash");

      const calls = [
        as(memberToken, request(app).get("/api/v1/admin/users")),
        as(memberToken, request(app).post("/api/v1/admin/users")).send({ name: "Sneaky", email: `sneaky.${stamp}@example.test` }),
        as(memberToken, request(app).patch(`/api/v1/admin/users/${target.id}`)).send({ status: "suspended" }),
        as(memberToken, request(app).post(`/api/v1/admin/users/${target.id}/reset-password`)),
        as(memberToken, request(app).delete(`/api/v1/admin/users/${target.id}`)),
      ];
      for (const res of await Promise.all(calls)) {
        expect(res.status).toBe(403);
        expect(res.body.error.message).toMatch(/only the store owner/i);
      }
      const after = await User.findById(target.id).select("+passwordHash");
      expect(after).toBeTruthy();
      expect(after.status).toBe("active");
      expect(after.passwordHash).toBe(before.passwordHash);
      expect(await User.exists({ email: `sneaky.${stamp}@example.test` })).toBeNull();
    });

    it("a staff member cannot edit, reset, deactivate or remove the owner, and the owner's account is unchanged", async () => {
      const before = await User.findById(owner._id).select("+passwordHash");
      const attempts = [
        as(memberToken, request(app).patch(`/api/v1/admin/users/${owner.id}`)).send({ status: "suspended", name: "Hijacked" }),
        as(memberToken, request(app).post(`/api/v1/admin/users/${owner.id}/reset-password`)),
        as(memberToken, request(app).delete(`/api/v1/admin/users/${owner.id}`)),
      ];
      for (const res of await Promise.all(attempts)) expect(res.status).toBe(403);

      const after = await User.findById(owner._id).select("+passwordHash");
      expect(after.name).toBe(before.name);
      expect(after.status).toBe("active");
      expect(after.passwordHash).toBe(before.passwordHash);
      expect((await as(ownerToken, request(app).get("/api/v1/admin/profile"))).status).toBe(200); // still signed in
    });

    it("even the owner cannot edit, reset or remove the owner account through the team routes", async () => {
      for (const res of [
        await as(ownerToken, request(app).patch(`/api/v1/admin/users/${owner.id}`)).send({ name: "Renamed Owner" }),
        await as(ownerToken, request(app).post(`/api/v1/admin/users/${owner.id}/reset-password`)),
        await as(ownerToken, request(app).delete(`/api/v1/admin/users/${owner.id}`)),
      ]) {
        expect(res.status).toBe(403);
        expect(res.body.error.message).toMatch(/owner account can only be changed by the owner/i);
      }
      expect((await User.findById(owner._id)).name).toBe("Staff Owner");
    });

    it("everything outside team management stays open to staff (orders, audit logs)", async () => {
      expect((await as(memberToken, request(app).get("/api/v1/admin/orders"))).status).toBe(200);
      expect((await as(memberToken, request(app).get("/api/v1/admin/audit-logs"))).status).toBe(200);
      expect((await as(ownerToken, request(app).get("/api/v1/admin/users"))).status).toBe(200);
    });

    it("an account created through the team routes can never be the owner, whatever is sent", async () => {
      const res = await createStaff({ name: "Wants Owner", email: `wantsowner.${stamp}@example.test`, isOwner: true, role: "owner" });
      expect(res.status).toBe(201);
      created.push(res.body.data.id);
      expect((await User.findById(res.body.data.id)).isOwner).toBe(false);
      const patch = await as(ownerToken, request(app).patch(`/api/v1/admin/users/${res.body.data.id}`)).send({ isOwner: true });
      expect(patch.status).toBe(200);
      expect((await User.findById(res.body.data.id)).isOwner).toBe(false);
    });
  });

  describe("set-owner script", () => {
    const run = (...args) =>
      spawnSync(process.execPath, [path.join("scripts", "set-owner.js"), ...args], {
        cwd: serverRoot,
        // Always the dedicated test database, never whatever MONGODB_URI the developer's .env points at
        env: { ...process.env, MONGODB_URI: process.env.MONGODB_TEST_URI || "mongodb://127.0.0.1:27017/divyam_ayurveda_test" },
        encoding: "utf8",
        timeout: 30000,
      });
    const text = (r) => `${r.stdout}${r.stderr}`.replace(/\x1b\[[0-9;]*m/g, "");

    it("shows usage without an email", () => {
      const none = run();
      expect(none.status).toBe(1);
      expect(text(none)).toMatch(/Usage: node scripts\/set-owner\.js/);
    });

    it("refuses to add a second owner when one already exists (the test database has one)", () => {
      const result = run(`someone.else.${stamp}@example.test`, "--apply");
      expect(result.status).toBe(1);
      expect(text(result)).toMatch(/owner already exists/i);
    });
  });

  describe("roles are gone", () => {
    it("there is no roles endpoint any more", async () => {
      expect((await as(ownerToken, request(app).get("/api/v1/admin/roles"))).status).toBe(404);
    });
  });
});
