import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { User } from "../../src/models/User.js";
import { Role } from "../../src/models/Role.js";
import { ContactEnquiry } from "../../src/models/ContactEnquiry.js";
import { SupportTicket } from "../../src/models/SupportTicket.js";
import { ROLES } from "../../src/constants/roles.js";
import { ALL_PERMISSIONS } from "../../src/constants/permissions.js";
import { generateAccessToken } from "../../src/utils/token.js";

describe("Support inbox and staff account management", () => {
  const stamp = Date.now();
  let superRole;
  let admin;
  let adminToken;
  const created = { users: [], enquiries: [], tickets: [], };

  const makeStaff = async (label, status = "active", isOwner = false) => {
    const user = await User.create({
      name: `Staff ${label}`,
      email: `staff.${label}.${stamp}@example.test`,
      passwordHash: "testHash123",
      isStaff: true,
      isOwner,
      roles: [superRole._id],
      status,
    });
    created.users.push(user._id);
    return user;
  };

  beforeAll(async () => {
    superRole =
      (await Role.findOne({ name: ROLES.SUPER_ADMIN })) ||
      (await Role.create({ name: ROLES.SUPER_ADMIN, description: "All permissions", permissions: ALL_PERMISSIONS }));
    admin = await makeStaff("actor", "active", true);
    adminToken = generateAccessToken({ id: admin._id, email: admin.email, isStaff: true });
  });

  afterAll(async () => {
    await User.deleteMany({ _id: { $in: created.users } });
    await ContactEnquiry.deleteMany({ _id: { $in: created.enquiries } });
    await SupportTicket.deleteMany({ _id: { $in: created.tickets } });
  });

  const auth = (req) => req.set("Authorization", `Bearer ${adminToken}`);

  it("saves an enquiry status change and the list reflects it", async () => {
    const enquiry = await ContactEnquiry.create({ name: "A", email: "a@example.test", subject: "Hi", message: "Hello" });
    created.enquiries.push(enquiry._id);

    const res = await auth(request(app).patch(`/api/v1/admin/enquiries/${enquiry.id}`)).send({ status: "Resolved", adminNotes: "Replied by phone" });
    expect(res.status).toBe(200);
    expect(res.body.data.status).toBe("Resolved");

    const list = await auth(request(app).get("/api/v1/admin/enquiries"));
    const row = list.body.data.find((e) => e.id === enquiry.id);
    expect(row.status).toBe("Resolved");
    expect(row.adminNotes).toBe("Replied by phone");
  });

  it("rejects an invalid enquiry status", async () => {
    const enquiry = await ContactEnquiry.create({ name: "B", email: "b@example.test", subject: "Hi", message: "Hello" });
    created.enquiries.push(enquiry._id);
    const res = await auth(request(app).patch(`/api/v1/admin/enquiries/${enquiry.id}`)).send({ status: "Nonsense" });
    expect(res.status).toBeGreaterThanOrEqual(400);
    expect((await ContactEnquiry.findById(enquiry._id)).status).toBe("New");
  });

  it("saves a support ticket status change", async () => {
    const ticket = await SupportTicket.create({
      ticketNumber: `T-${stamp}`,
      customerName: "C",
      customerEmail: "c@example.test",
      subject: "Late order",
    });
    created.tickets.push(ticket._id);

    const res = await auth(request(app).patch(`/api/v1/admin/support-tickets/${ticket.id}`)).send({ status: "Resolved", internalNotes: "Refunded" });
    expect(res.status).toBe(200);
    const saved = await SupportTicket.findById(ticket._id);
    expect(saved.status).toBe("Resolved");
    expect(saved.internalNotes).toBe("Refunded");
  });

  it("updates a staff user's name and status", async () => {
    const target = await makeStaff("target");
    const res = await auth(request(app).patch(`/api/v1/admin/users/${target.id}`)).send({ name: "Renamed Staff", status: "suspended" });
    expect(res.status).toBe(200);
    const saved = await User.findById(target._id);
    expect(saved.name).toBe("Renamed Staff");
    expect(saved.status).toBe("suspended");
  });

  it("refuses to suspend or delete your own account", async () => {
    expect((await auth(request(app).patch(`/api/v1/admin/users/${admin.id}`)).send({ status: "suspended" })).status).toBe(403);
    expect((await auth(request(app).delete(`/api/v1/admin/users/${admin.id}`))).status).toBe(403);
  });

  it("deletes another staff user", async () => {
    const target = await makeStaff("removable");
    expect((await auth(request(app).delete(`/api/v1/admin/users/${target.id}`))).status).toBe(200);
    expect(await User.findById(target._id)).toBeNull();
  });

  it("blocks these routes without a token", async () => {
    expect((await request(app).patch("/api/v1/admin/users/abc")).status).toBe(401);
      });
});
