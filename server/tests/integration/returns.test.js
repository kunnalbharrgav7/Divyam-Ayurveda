import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { User } from "../../src/models/User.js";
import { Role } from "../../src/models/Role.js";
import { Product } from "../../src/models/Product.js";
import { ProductVariant } from "../../src/models/ProductVariant.js";
import { Order } from "../../src/models/Order.js";
import { Refund } from "../../src/models/Refund.js";
import { ReturnRequest } from "../../src/models/ReturnRequest.js";
import { InventoryMovement } from "../../src/models/InventoryMovement.js";
import { ROLES } from "../../src/constants/roles.js";
import { ALL_PERMISSIONS } from "../../src/constants/permissions.js";
import { generateAccessToken } from "../../src/utils/token.js";

describe("Returns, refunds and store credit", () => {
  const stamp = Date.now();
  let staff, customer, createdRole, product, pack;
  let adminAuth, custAuth;
  const email = `ret.${stamp}@example.test`;
  const jpeg =
    "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=";

  beforeAll(async () => {
    let role = await Role.findOne({ name: ROLES.SUPER_ADMIN });
    if (!role) role = createdRole = await Role.create({ name: ROLES.SUPER_ADMIN, permissions: ALL_PERMISSIONS });
    staff = await User.create({ name: "Return Admin", email: `retadmin.${stamp}@example.test`, passwordHash: "x", isStaff: true, roles: [role._id], status: "active" });
    adminAuth = { Authorization: `Bearer ${generateAccessToken({ id: staff._id, email: staff.email, isStaff: true })}` };
    const reg = await request(app).post("/api/v1/auth/register").send({ name: "Rita Return", email, phone: `7${String(stamp).slice(-9)}`, password: "Secret123" });
    customer = reg.body.data.user;
    custAuth = { Authorization: `Bearer ${reg.body.data.tokens.accessToken}` };
    product = await Product.create({ name: `Ret Prod ${stamp}`, slug: `ret-prod-${stamp}`, sku: `RET-${stamp}`, categoryId: "wellness-essentials", description: "x", status: "active", basePricePaise: 50000 });
    pack = await ProductVariant.create({ productId: product._id, sku: `RET-${stamp}-STD`, label: "Standard", pricePaise: 50000, stockOnHand: 20, isActive: true });
  });

  afterAll(async () => {
    const orders = await Order.find({ "customer.email": email });
    const ids = orders.map((o) => o._id);
    await ReturnRequest.deleteMany({ orderId: { $in: ids } });
    await Refund.deleteMany({ orderId: { $in: ids } });
    await Order.deleteMany({ "customer.email": email });
    await InventoryMovement.deleteMany({ productId: product._id });
    await ProductVariant.deleteMany({ productId: product._id });
    await Product.deleteOne({ _id: product._id });
    await User.deleteMany({ email: { $in: [email, staff.email] } });
    if (createdRole) await Role.deleteOne({ _id: createdRole._id });
  });

  const placeOrder = ({ online = false, credit = 0 } = {}) =>
    request(app).post("/api/v1/orders").set(custAuth).send({
      customer: { name: "Rita Return", email, phone: "7000000000" },
      shippingAddress: { street: "12 Lake Road", city: "Pune", state: "Maharashtra", pincode: "411001" },
      items: [{ productId: String(product._id), name: product.name, size: "Standard", price: 500, quantity: 1 }],
      pricing: { subtotal: 500, total: 500 - credit, storeCredit: credit },
      paymentMethod: online ? "Online Payment" : "Cash on Delivery (COD)",
    });
  const status = (n, s) => request(app).patch(`/api/v1/admin/orders/${n}/status`).set(adminAuth).send({ status: s });
  const deliver = async (online) => {
    const o = await placeOrder({ online });
    expect(o.status).toBe(201);
    await status(o.body.data.orderNumber, "delivered");
    return o.body.data.orderNumber;
  };
  const stock = async () => (await ProductVariant.findById(pack._id).lean()).stockOnHand;
  const credit = async () => (await User.findById(customer.id).lean()).storeCreditPaise || 0;
  const makeReturn = (n, body) => request(app).post(`/api/v1/me/orders/${n}/returns`).set(custAuth).send(body);
  const admin = (id, action, body = {}) => request(app).post(`/api/v1/admin/returns/${id}/${action}`).set(adminAuth).send(body);

  it("only delivered orders inside the 7-day window can be returned, once", async () => {
    const pending = await placeOrder();
    const num = pending.body.data.orderNumber;
    let el = await request(app).get(`/api/v1/me/orders/${num}/return-eligibility`).set(custAuth);
    expect(el.body.data).toMatchObject({ eligible: false });
    expect((await makeReturn(num, { reasonCategory: "other", reason: "long enough text here", sealedConfirmed: true, refundMethod: "upi", payout: { upiId: "a@bank" } })).status).toBe(400);

    await status(num, "delivered");
    el = await request(app).get(`/api/v1/me/orders/${num}/return-eligibility`).set(custAuth);
    expect(el.body.data).toMatchObject({ eligible: true, refundAmount: 500, refundMethods: ["bank", "upi", "store_credit"], daysLeft: 7 });
    expect((await Order.findOne({ orderNumber: num })).deliveredAt).toBeTruthy();

    // Window closed
    await Order.updateOne({ orderNumber: num }, { deliveredAt: new Date(Date.now() - 8 * 86400000) });
    el = await request(app).get(`/api/v1/me/orders/${num}/return-eligibility`).set(custAuth);
    expect(el.body.data.eligible).toBe(false);
    expect(el.body.data.reason).toMatch(/return window/i);
    expect((await makeReturn(num, { reasonCategory: "wrong_item", evidenceImages: [jpeg], sealedConfirmed: true, refundMethod: "upi", payout: { upiId: "a@bank" } })).status).toBe(400);
  });

  it("validates the request: reason, photos, seal confirmation and payout details", async () => {
    const num = await deliver(false);
    const ok = { reasonCategory: "not_as_described", sealedConfirmed: true, refundMethod: "upi", payout: { upiId: "rita@okbank" } };
    expect((await makeReturn(num, { ...ok, reasonCategory: "nonsense" })).status).toBe(400);
    expect((await makeReturn(num, { ...ok, sealedConfirmed: false })).status).toBe(400);
    expect((await makeReturn(num, { reasonCategory: "damaged_in_transit", refundMethod: "upi", payout: { upiId: "rita@okbank" } })).status).toBe(400);
    expect((await makeReturn(num, { ...ok, refundMethod: "cash" })).status).toBe(400);
    expect((await makeReturn(num, { ...ok, payout: { upiId: "bad" } })).status).toBe(400);
    expect((await makeReturn(num, { ...ok, refundMethod: "bank", payout: { accountName: "R", accountNumber: "12", ifsc: "X" } })).status).toBe(400);
    expect((await makeReturn(num, { reasonCategory: "other", reason: "short", sealedConfirmed: true, refundMethod: "upi", payout: { upiId: "rita@okbank" } })).status).toBe(400);
  });

  it("runs the full COD flow: request, approve, receive+restock, refund to UPI", async () => {
    const num = await deliver(false);
    const before = await stock();
    const create = await makeReturn(num, { reasonCategory: "not_as_described", reason: "Different from photos", sealedConfirmed: true, refundMethod: "upi", payout: { upiId: "rita@okbank" } });
    expect(create.status).toBe(201);
    const id = create.body.data.id;
    expect(create.body.data).toMatchObject({ status: "requested", refundAmount: 500, refundMethod: "upi", canCancel: true });
    expect(create.body.data.referenceNumber).toMatch(/^RET-\d{8}-[0-9A-F]{6}$/);
    expect((await Order.findOne({ orderNumber: num })).status).toBe("return_requested");
    expect((await makeReturn(num, { reasonCategory: "other", reason: "another one please", sealedConfirmed: true, refundMethod: "upi", payout: { upiId: "rita@okbank" } })).status).toBe(400);

    expect((await request(app).get("/api/v1/me/returns").set(custAuth)).body.data.some((r) => r.id === id)).toBe(true);
    const adminRow = (await request(app).get(`/api/v1/admin/returns/${id}`).set(adminAuth)).body.data;
    expect(adminRow).toMatchObject({ orderNumber: num, reasonLabel: "Not as described on the website", restockDefault: true });
    expect(adminRow.payout.upiId).toBe("rita@okbank");

    expect((await admin(id, "refund", { payoutReference: "UTR12345" })).status).toBe(400);
    expect((await admin(id, "receive")).status).toBe(400);
    expect((await admin(id, "approve", { customerNote: "Please ship it back", refundAmount: 9999 })).status).toBe(400);
    expect((await admin(id, "approve", { customerNote: "Please ship it back" })).body.data).toMatchObject({ status: "approved" });
    expect((await request(app).post(`/api/v1/me/returns/${id}/cancel`).set(custAuth)).status).toBe(400);

    const recv = await admin(id, "receive", { note: "Sealed and fine" });
    expect(recv.body.data).toMatchObject({ status: "received", restocked: true });
    expect(await stock()).toBe(before + 1);

    expect((await admin(id, "refund", {})).status).toBe(400);
    const paid = await admin(id, "refund", { payoutReference: "UTR987654321" });
    expect(paid.status).toBe(200);
    expect(paid.body.data).toMatchObject({ status: "refunded", refunded: 500 });
    expect(await Order.findOne({ orderNumber: num })).toMatchObject({ status: "returned", paymentStatus: "refunded", refundedPaise: 50000 });
    const mine = (await request(app).get(`/api/v1/me/returns/${id}`).set(custAuth)).body.data;
    expect(mine.status).toBe("refunded");
    expect(mine.timeline.map((t) => t.status)).toEqual(["requested", "approved", "received", "refunded"]);
    expect(await InventoryMovement.countDocuments({ productId: product._id, reason: "return_restock" })).toBeGreaterThanOrEqual(1);
    expect((await admin(id, "refund", { payoutReference: "UTR987654321" })).status).toBe(400);
  });

  it("refunds prepaid orders through Cashfree (original payment method only)", async () => {
    const num = await deliver(true);
    const el = await request(app).get(`/api/v1/me/orders/${num}/return-eligibility`).set(custAuth);
    expect(el.body.data.refundMethods).toEqual(["original"]);
    const create = await makeReturn(num, { reasonCategory: "damaged_in_transit", reason: "Bottle cracked", evidenceImages: [jpeg], refundMethod: "bank", payout: { accountName: "x" } });
    expect(create.status).toBe(201);
    expect(create.body.data.refundMethod).toBe("original");
    const id = create.body.data.id;
    await admin(id, "approve", {});
    const before = await stock();
    const recv = await admin(id, "receive", {});
    expect(recv.body.data.restocked).toBe(false);
    expect(await stock()).toBe(before);
    const paid = await admin(id, "refund", {});
    expect(paid.body.data).toMatchObject({ status: "refunded", refund: { status: "succeeded", method: "original" } });
    expect(await Refund.countDocuments({ returnRequestId: id, provider: "cashfree", status: "succeeded" })).toBe(1);
    expect((await Order.findOne({ orderNumber: num })).paymentStatus).toBe("refunded");
  });

  it("store credit: refund to credit, spend it at checkout, and get it back on cancellation", async () => {
    const num = await deliver(false);
    const id = (await makeReturn(num, { reasonCategory: "ordered_by_mistake", sealedConfirmed: true, refundMethod: "store_credit" })).body.data.id;
    await admin(id, "approve", {});
    await admin(id, "receive", {});
    const start = await credit();
    expect((await admin(id, "refund", {})).body.data.status).toBe("refunded");
    expect(await credit()).toBe(start + 50000);
    expect((await request(app).get("/api/v1/me/store-credit").set(custAuth)).body.data.storeCredit).toBeGreaterThanOrEqual(500);

    const balance = await credit();
    const used = await placeOrder({ credit: 200 });
    expect(used.status).toBe(201);
    expect(await credit()).toBe(balance - 20000);
    expect(used.body.data.pricing.storeCredit).toBe(200);
    expect((await placeOrder({ credit: 1000000 })).status).toBe(409);
    expect(await credit()).toBe(balance - 20000);

    await status(used.body.data.orderNumber, "cancelled");
    expect(await credit()).toBe(balance);
  });

  it("lets the customer cancel a pending request, and admins must explain a rejection", async () => {
    const num = await deliver(false);
    const id = (await makeReturn(num, { reasonCategory: "delayed_delivery", sealedConfirmed: true, refundMethod: "store_credit" })).body.data.id;
    const cancelled = await request(app).post(`/api/v1/me/returns/${id}/cancel`).set(custAuth);
    expect(cancelled.body.data.status).toBe("cancelled");
    expect((await Order.findOne({ orderNumber: num })).status).toBe("delivered");

    const id2 = (await makeReturn(num, { reasonCategory: "delayed_delivery", sealedConfirmed: true, refundMethod: "store_credit" })).body.data.id;
    expect((await admin(id2, "reject", {})).status).toBe(400);
    const rejected = await admin(id2, "reject", { customerNote: "Opened product cannot be returned" });
    expect(rejected.body.data).toMatchObject({ status: "rejected", customerNote: "Opened product cannot be returned" });
    expect((await Order.findOne({ orderNumber: num })).status).toBe("delivered");
    expect((await makeReturn(num, { reasonCategory: "other", reason: "trying once more please", sealedConfirmed: true, refundMethod: "store_credit" })).status).toBe(400);
  });
});
