import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { User } from "../../src/models/User.js";
import { Role } from "../../src/models/Role.js";
import { Order } from "../../src/models/Order.js";
import { ContactEnquiry } from "../../src/models/ContactEnquiry.js";
import { SupportTicket } from "../../src/models/SupportTicket.js";
import { ROLES } from "../../src/constants/roles.js";
import { ALL_PERMISSIONS } from "../../src/constants/permissions.js";
import { hashPassword } from "../../src/utils/crypto.js";
import { generateAccessToken } from "../../src/utils/token.js";

const stamp = Date.now();
const created = { users: [], orders: [], enquiries: [] };
let adminToken;
let aliceToken;
let alice;
let bobToken;
let aliceOrder;
let bobOrder;

const auth = (token, req) => req.set("Authorization", `Bearer ${token}`);

const makeCustomer = async (label) => {
  const user = await User.create({
    name: `Customer ${label}`,
    email: `support.${label}.${stamp}@example.test`,
    phone: `+91${label === "alice" ? "97" : "96"}${String(stamp).slice(-8)}`,
    passwordHash: await hashPassword("Customer-Pass-1"),
    isStaff: false,
    status: "active",
  });
  created.users.push(user._id);
  return user;
};

const makeOrder = async (user, suffix) => {
  const order = await Order.create({
    orderNumber: `DA-SUP-${stamp}-${suffix}`,
    userId: user._id,
    customer: { name: user.name, email: user.email, phone: "9876543210" },
    shippingAddress: { fullName: user.name, phone: "9876543210", street: "1 Test Street", city: "Pune", state: "Maharashtra", pincode: "411001" },
    items: [{ name: "Test", size: "Std", unitPricePaise: 10000, quantity: 1, lineTotalPaise: 10000 }],
    pricing: { subtotalPaise: 10000, totalPaise: 10000 },
    paymentMethod: "Cash on Delivery (COD)",
    status: "confirmed",
  });
  created.orders.push(order._id);
  return order;
};

describe.sequential("Contact enquiries, support tickets and replies", () => {
  beforeAll(async () => {
    let role = await Role.findOne({ name: ROLES.SUPER_ADMIN });
    if (!role) role = await Role.create({ name: ROLES.SUPER_ADMIN, description: "All", permissions: ALL_PERMISSIONS });
    const admin = await User.create({
      name: "Support Admin",
      email: `support.admin.${stamp}@example.test`,
      phone: `+9195${String(stamp).slice(-8)}`,
      passwordHash: await hashPassword("Admin-Pass-1"),
      isStaff: true,
      roles: [role._id],
      status: "active",
    });
    created.users.push(admin._id);
    adminToken = generateAccessToken({ id: admin._id, email: admin.email, isStaff: true });

    alice = await makeCustomer("alice");
    const bob = await makeCustomer("bob");
    aliceToken = generateAccessToken({ id: alice._id, email: alice.email, isStaff: false });
    bobToken = generateAccessToken({ id: bob._id, email: bob.email, isStaff: false });
    aliceOrder = await makeOrder(alice, "A");
    bobOrder = await makeOrder(bob, "B");
  });

  afterAll(async () => {
    await SupportTicket.deleteMany({ userId: { $in: created.users } });
    await ContactEnquiry.deleteMany({ _id: { $in: created.enquiries } });
    await ContactEnquiry.deleteMany({ email: { $regex: `${stamp}@example.test$` } });
    await Order.deleteMany({ _id: { $in: created.orders } });
    await User.deleteMany({ _id: { $in: created.users } });
  });

  describe("Contact form", () => {
    it("saves a message and it appears in the admin Contact Enquiries list", async () => {
      const res = await request(app).post("/api/v1/contact").send({
        name: "Ananya Sen",
        email: `Ananya.${stamp}@Example.TEST`,
        phone: "+91 98765 43210",
        subject: "Dosha Guidance",
        message: "Which Shilajit pack suits a Vata constitution?",
      });
      expect(res.status).toBe(201);
      expect(res.body.data.status).toBe("New");
      expect(JSON.stringify(res.body)).not.toMatch(/Ananya|adminNotes|replies/); // the sender gets only a receipt
      created.enquiries.push(res.body.data.id);

      const list = await auth(adminToken, request(app).get("/api/v1/admin/enquiries"));
      const row = list.body.data.find((e) => e.id === res.body.data.id);
      expect(row).toMatchObject({ name: "Ananya Sen", subject: "Dosha Guidance", status: "New" });
      expect(row.email).toBe(`ananya.${stamp}@example.test`);
      expect(row.message).toContain("Vata");
    });

    it("links the message to the account when a customer is signed in", async () => {
      const res = await auth(aliceToken, request(app).post("/api/v1/contact")).send({ name: "Alice", email: alice.email, message: "Where is my parcel please?" });
      expect(res.status).toBe(201);
      created.enquiries.push(res.body.data.id);
      expect(String((await ContactEnquiry.findById(res.body.data.id)).userId)).toBe(String(alice._id));
    });

    it("a signed-in customer reads their own messages and the team's replies under My Account; nobody else does", async () => {
      expect((await request(app).get("/api/v1/me/enquiries")).status).toBe(401);

      const mine = await auth(aliceToken, request(app).post("/api/v1/contact")).send({ name: "Alice", email: alice.email, subject: "Dosage question", message: "How many capsules should I take daily?" });
      created.enquiries.push(mine.body.data.id);
      const guest = await request(app).post("/api/v1/contact").send({ name: "Visitor", email: alice.email, message: "Sent while signed out, same email address." });
      created.enquiries.push(guest.body.data.id);

      let list = await auth(aliceToken, request(app).get("/api/v1/me/enquiries"));
      expect(list.status).toBe(200);
      const ids = list.body.data.map((e) => e.id);
      expect(ids).toContain(mine.body.data.id);
      expect(ids).not.toContain(guest.body.data.id); // an email typed into the form is not proof of ownership
      expect(list.body.data.find((e) => e.id === mine.body.data.id)).toMatchObject({ subject: "Dosage question", status: "New", replies: [] });

      await auth(adminToken, request(app).patch(`/api/v1/admin/enquiries/${mine.body.data.id}`)).send({ reply: "One capsule twice daily with warm water.", adminNotes: "Customer seems new to Shilajit" });

      list = await auth(aliceToken, request(app).get("/api/v1/me/enquiries"));
      const row = list.body.data.find((e) => e.id === mine.body.data.id);
      expect(row.status).toBe("Replied");
      expect(row.replies).toHaveLength(1);
      expect(row.replies[0]).toMatchObject({ message: "One capsule twice daily with warm water.", staffName: "Support Admin" });
      expect(JSON.stringify(list.body)).not.toMatch(/adminNotes|new to Shilajit|userId/);

      const others = await auth(bobToken, request(app).get("/api/v1/me/enquiries"));
      expect(others.body.data.map((e) => e.id)).not.toContain(mine.body.data.id);
    });

    it("rejects a missing name, a bad email, a too-short or too-long message and a junk phone number", async () => {
      const ok = { name: "Valid Name", email: `valid.${stamp}@example.test`, message: "A perfectly fine message." };
      for (const bad of [
        { ...ok, name: "" },
        { ...ok, email: "not-an-email" },
        { ...ok, message: "short" },
        { ...ok, message: "x".repeat(2001) },
        { ...ok, phone: "12" },
      ]) {
        expect((await request(app).post("/api/v1/contact").send(bad)).status).toBe(400);
      }
      expect(await ContactEnquiry.countDocuments({ email: `valid.${stamp}@example.test` })).toBe(0);
    });

    it("answers a bot as if it worked but stores nothing when the hidden field is filled in", async () => {
      const email = `bot.${stamp}@example.test`;
      const res = await request(app).post("/api/v1/contact").send({ name: "Spam Bot", email, message: "Buy cheap watches now!!!", website: "http://spam.example" });
      expect(res.status).toBe(201);
      expect(await ContactEnquiry.countDocuments({ email })).toBe(0);
    });

    it("the newsletter endpoint and the admin subscriber routes are gone", async () => {
      expect((await request(app).post("/api/v1/newsletter/subscriptions").send({ email: "x@example.test" })).status).toBe(404);
      expect((await auth(adminToken, request(app).get("/api/v1/admin/subscribers"))).status).toBe(404);
    });

    it("admin can reply: the reply is saved, status moves to Replied, and a later status choice is respected", async () => {
      const made = await request(app).post("/api/v1/contact").send({ name: "Reply Me", email: `reply.${stamp}@example.test`, message: "Please advise on dosage." });
      const id = made.body.data.id;
      created.enquiries.push(id);

      const replied = await auth(adminToken, request(app).patch(`/api/v1/admin/enquiries/${id}`)).send({ reply: "Take one capsule twice a day with warm water." });
      expect(replied.status).toBe(200);
      expect(replied.body.data.status).toBe("Replied");
      expect(replied.body.data.replies).toHaveLength(1);
      expect(replied.body.data.replies[0]).toMatchObject({ message: "Take one capsule twice a day with warm water.", staffName: "Support Admin" });

      const archived = await auth(adminToken, request(app).patch(`/api/v1/admin/enquiries/${id}`)).send({ reply: "Noted, thanks.", status: "Archived" });
      expect(archived.body.data.status).toBe("Archived");
      expect(archived.body.data.replies).toHaveLength(2);

      expect((await auth(adminToken, request(app).patch(`/api/v1/admin/enquiries/${id}`)).send({ reply: "x".repeat(2001) })).status).toBe(400);
    });
  });

  describe("Customer support tickets", () => {
    let ticketNumber;

    it("needs a signed-in customer: guests are refused everywhere", async () => {
      expect((await request(app).post("/api/v1/me/tickets").send({ subject: "Late order", message: "My order is late." })).status).toBe(401);
      expect((await request(app).get("/api/v1/me/tickets")).status).toBe(401);
      expect((await request(app).post("/api/v1/support/tickets").send({ subject: "Late order", message: "My order is late." })).status).toBe(404); // the old guest endpoint is gone
    });

    it("creates a ticket tied to the account and shows it in the customer's list", async () => {
      const res = await auth(aliceToken, request(app).post("/api/v1/me/tickets")).send({
        subject: "Parcel not delivered",
        category: "Delivery",
        orderNumber: aliceOrder.orderNumber,
        message: "It has been ten days and nothing arrived.",
      });
      expect(res.status).toBe(201);
      ticketNumber = res.body.data.ticketNumber;
      expect(ticketNumber).toMatch(/^TKT-\d{6}-\d{6}$/);
      expect(res.body.data).toMatchObject({ status: "Open", category: "Delivery", orderNumber: aliceOrder.orderNumber });
      expect(res.body.data.messages).toHaveLength(1);
      expect(res.body.data.messages[0]).toMatchObject({ senderRole: "customer" });
      expect(JSON.stringify(res.body)).not.toContain("internalNotes");

      const list = await auth(aliceToken, request(app).get("/api/v1/me/tickets"));
      expect(list.body.data.map((t) => t.ticketNumber)).toContain(ticketNumber);
    });

    it("rejects bad input and an order that belongs to someone else", async () => {
      const make = (body) => auth(aliceToken, request(app).post("/api/v1/me/tickets")).send(body);
      expect((await make({ subject: "Hey", message: "A long enough message here." })).status).toBe(400); // subject too short
      expect((await make({ subject: "Valid subject", message: "short" })).status).toBe(400);
      expect((await make({ subject: "Valid subject", category: "Made Up", message: "A long enough message here." })).status).toBe(400);
      const stolen = await make({ subject: "Not my order", orderNumber: bobOrder.orderNumber, message: "A long enough message here." });
      expect(stolen.status).toBe(400);
      expect(await SupportTicket.countDocuments({ orderNumber: bobOrder.orderNumber })).toBe(0);
    });

    it("another customer can neither see nor write to it (it looks like it does not exist)", async () => {
      expect((await auth(bobToken, request(app).get(`/api/v1/me/tickets/${ticketNumber}`))).status).toBe(404);
      expect((await auth(bobToken, request(app).post(`/api/v1/me/tickets/${ticketNumber}/messages`)).send({ message: "I'm not the owner" })).status).toBe(404);
      const bobList = await auth(bobToken, request(app).get("/api/v1/me/tickets"));
      expect(bobList.body.data.map((t) => t.ticketNumber)).not.toContain(ticketNumber);
      expect((await SupportTicket.findOne({ ticketNumber })).messages).toHaveLength(1);
    });

    it("admin sees the ticket with the customer's details, replies, and the customer reads the reply without internal notes", async () => {
      const list = await auth(adminToken, request(app).get("/api/v1/admin/support-tickets"));
      const row = list.body.data.find((t) => t.ticketNumber === ticketNumber);
      expect(row).toMatchObject({ customerEmail: alice.email, customerName: alice.name, subject: "Parcel not delivered", status: "Open" });
      expect(row.messages[0].message).toContain("ten days");

      const reply = await auth(adminToken, request(app).patch(`/api/v1/admin/support-tickets/${row.id}`)).send({
        reply: "Sorry about that. We have raised it with the courier.",
        internalNotes: "Courier claims delivered; check POD.",
      });
      expect(reply.status).toBe(200);
      expect(reply.body.data.status).toBe("In Progress");
      expect(reply.body.data.messages).toHaveLength(2);

      const mine = await auth(aliceToken, request(app).get(`/api/v1/me/tickets/${ticketNumber}`));
      expect(mine.status).toBe(200);
      expect(mine.body.data.status).toBe("In Progress");
      expect(mine.body.data.messages[1]).toMatchObject({ senderRole: "staff", sender: "Support Admin" });
      expect(mine.body.data.messages[1].message).toContain("raised it with the courier");
      expect(JSON.stringify(mine.body)).not.toMatch(/internalNotes|check POD/);
    });

    it("the customer can follow up; a resolved ticket reopens; a closed one does not accept messages", async () => {
      const id = (await SupportTicket.findOne({ ticketNumber }))._id;
      const follow = await auth(aliceToken, request(app).post(`/api/v1/me/tickets/${ticketNumber}/messages`)).send({ message: "Any update on this please?" });
      expect(follow.status).toBe(201);
      expect(follow.body.data.messages).toHaveLength(3);

      await auth(adminToken, request(app).patch(`/api/v1/admin/support-tickets/${id}`)).send({ status: "Resolved" });
      expect((await auth(aliceToken, request(app).get(`/api/v1/me/tickets/${ticketNumber}`))).body.data.status).toBe("Resolved");

      const reopened = await auth(aliceToken, request(app).post(`/api/v1/me/tickets/${ticketNumber}/messages`)).send({ message: "It still hasn't arrived." });
      expect(reopened.body.data.status).toBe("Open");

      await auth(adminToken, request(app).patch(`/api/v1/admin/support-tickets/${id}`)).send({ status: "Closed" });
      const refused = await auth(aliceToken, request(app).post(`/api/v1/me/tickets/${ticketNumber}/messages`)).send({ message: "Hello again" });
      expect(refused.status).toBe(409);
    });

    it("every ticket gets its own number", async () => {
      const numbers = new Set();
      for (let i = 0; i < 5; i += 1) {
        const res = await auth(aliceToken, request(app).post("/api/v1/me/tickets")).send({ subject: `Question number ${i}`, message: "Just a quick question for you." });
        expect(res.status).toBe(201);
        numbers.add(res.body.data.ticketNumber);
      }
      expect(numbers.size).toBe(5);
    });
  });
});
