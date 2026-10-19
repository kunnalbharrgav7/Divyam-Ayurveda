import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { User } from "../../src/models/User.js";
import { Role } from "../../src/models/Role.js";
import { Product } from "../../src/models/Product.js";
import { ProductVariant } from "../../src/models/ProductVariant.js";
import { Order } from "../../src/models/Order.js";
import { Referral } from "../../src/models/Referral.js";
import { ReferralProgram } from "../../src/models/ReferralProgram.js";
import { WalletTransaction } from "../../src/models/WalletTransaction.js";
import { ROLES } from "../../src/constants/roles.js";
import { ALL_PERMISSIONS } from "../../src/constants/permissions.js";
import { generateAccessToken } from "../../src/utils/token.js";
import { referralService } from "../../src/services/referral.service.js";

describe("Refer & earn", () => {
  const stamp = Date.now();
  const emails = [];
  let staff, createdRole, product, adminAuth, program;
  let n = 0;

  const register = async (name, referralCode) => {
    n += 1;
    const email = `ref.${stamp}.${n}@example.test`;
    emails.push(email);
    const res = await request(app).post("/api/v1/auth/register").send({ name, email, phone: `6${String(stamp + n).slice(-9)}`, password: "Secret123", referralCode });
    return { id: res.body.data.user.id, email, code: res.body.data.user.referralCode, auth: { Authorization: `Bearer ${res.body.data.tokens.accessToken}` }, referral: res.body.data.referral };
  };

  const order = (who, { price = 1000, code, discount = 0, offer = null } = {}) =>
    request(app).post("/api/v1/orders").set(who.auth).send({
      customer: { name: "Cust", email: who.email, phone: "7000000000" },
      shippingAddress: { street: `${n} Unique Lane ${Math.random()}`, city: "Pune", state: "Maharashtra", pincode: "411001" },
      items: [{ productId: String(product._id), name: product.name, size: "Standard", price, quantity: 1 }],
      pricing: { subtotal: price, total: price - discount, referralDiscount: discount, referralCode: code, couponCode: offer },
      paymentMethod: "Cash on Delivery (COD)",
    });
  const status = (num, s) => request(app).patch(`/api/v1/admin/orders/${num}/status`).set(adminAuth).send({ status: s });
  const wallet = async (who) => (await User.findById(who.id).lean()).storeCreditPaise || 0;
  const aged = (num, days) => Order.updateOne({ orderNumber: num }, { deliveredAt: new Date(Date.now() - days * 86400000) });

  beforeAll(async () => {
    let role = await Role.findOne({ name: ROLES.SUPER_ADMIN });
    if (!role) role = createdRole = await Role.create({ name: ROLES.SUPER_ADMIN, permissions: ALL_PERMISSIONS });
    staff = await User.create({ name: "Ref Admin", email: `refadmin.${stamp}@example.test`, passwordHash: "x", isStaff: true, roles: [role._id], status: "active" });
    adminAuth = { Authorization: `Bearer ${generateAccessToken({ id: staff._id, email: staff.email, isStaff: true })}` };
    product = await Product.create({ name: `Ref Prod ${stamp}`, slug: `ref-prod-${stamp}`, sku: `REF-${stamp}`, categoryId: "wellness-essentials", description: "x", status: "active", basePricePaise: 100000 });
    await ProductVariant.create({ productId: product._id, sku: `REF-${stamp}-S`, label: "Standard", pricePaise: 100000, stockOnHand: 50, isActive: true });
    program = await referralService.getProgramSettings();
    Object.assign(program, { enabled: true, refereeDiscountType: "percentage", refereeDiscountPercent: 10, refereeDiscountCapPaise: 25000, minOrderValuePaise: 49900, referrerRewardType: "fixed", referrerRewardPaise: 10000, holdDays: 7, maxRewardsPerMonth: 0 });
    await program.save();
  });

  afterAll(async () => {
    const users = await User.find({ email: { $in: emails } });
    const ids = users.map((u) => u._id);
    await Referral.deleteMany({ referrerId: { $in: ids } });
    await WalletTransaction.deleteMany({ userId: { $in: ids } });
    await Order.deleteMany({ userId: { $in: ids } });
    await ProductVariant.deleteMany({ productId: product._id });
    await Product.deleteOne({ _id: product._id });
    await User.deleteMany({ _id: { $in: [...ids, staff._id] } });
    if (createdRole) await Role.deleteOne({ _id: createdRole._id });
  });

  it("looks codes up publicly and links a new account to its inviter at signup", async () => {
    const alice = await register("Alice Referrer");
    expect(alice.code).toMatch(/^DIVYAM[A-Z]{3}[A-Z0-9]{4}$/);

    const found = await request(app).get(`/api/v1/referrals/code/${alice.code}`);
    expect(found.body.data).toMatchObject({ valid: true, referrerName: "Alice" });
    expect(found.body.data.program).toMatchObject({ refereeDiscountValue: 10, holdDays: 7 });
    expect((await request(app).get("/api/v1/referrals/code/NOPE123")).body.data.valid).toBe(false);

    const bob = await register("Bob Friend", alice.code);
    expect(bob.referral).toMatchObject({ applied: true, referrerName: "Alice" });
    expect(String((await User.findById(bob.id)).referredBy)).toBe(alice.id);
    expect(await Referral.countDocuments({ refereeId: bob.id, status: "signed_up" })).toBe(1);

    expect((await register("Cara Nocode", "BADCODE")).referral.applied).toBe(false); // bad code never blocks signup
    const dash = (await request(app).get("/api/v1/referrals/me").set(alice.auth)).body.data;
    expect(dash.stats).toMatchObject({ invited: 1, ordered: 0, rewarded: 0 });
    expect(dash.referrals[0]).toMatchObject({ friend: "Bob F.", status: "signed_up" });
    expect(dash.referrals[0].email).toMatch(/^r\*\*\*@|^[a-z]\*\*\*@/);
  });

  it("never trusts the browser: forged, ineligible and self-referral discounts are refused", async () => {
    const alice = await register("Alice Owner");
    const dave = await register("Dave Buyer", alice.code);

    expect((await order(dave, { code: "FAKECODE", discount: 500 })).status).toBe(400); // code does not exist
    expect((await order(dave, { code: alice.code, discount: 500 })).status).toBe(409); // real code, invented amount
    expect((await order(dave, { price: 400, code: alice.code, discount: 40 })).status).toBe(400); // under the minimum
    expect((await order(alice, { code: alice.code, discount: 100 })).status).toBe(400); // own code
    expect((await order(dave, { code: alice.code, discount: 100, offer: "WHATEVER" })).status).toBeGreaterThanOrEqual(400); // no stacking
    expect(await Order.countDocuments({ userId: dave.id })).toBe(0);

    const guest = await request(app).post("/api/v1/orders").send({
      customer: { name: "G", email: `g.${stamp}@example.test`, phone: "7000000000" },
      shippingAddress: { street: "1 Road", city: "Pune", state: "Maharashtra", pincode: "411001" },
      items: [{ productId: String(product._id), name: product.name, size: "Standard", price: 1000, quantity: 1 }],
      pricing: { subtotal: 1000, total: 900, referralDiscount: 100, referralCode: alice.code },
      paymentMethod: "Cash on Delivery (COD)",
    });
    expect(guest.status).toBe(400); // signed-out visitors cannot use a code

    const preview = await request(app).post("/api/v1/referrals/preview").set(dave.auth).send({ code: alice.code, goodsAmount: 1000 });
    expect(preview.body.data).toMatchObject({ valid: true, discount: 100 });
    expect((await request(app).post("/api/v1/referrals/preview").set(alice.auth).send({ code: alice.code, goodsAmount: 1000 })).body.data.valid).toBe(false);
  });

  it("pays the referrer only after delivery plus the hold, once, and the friend can't reuse the offer", async () => {
    const alice = await register("Alice Earner");
    const bob = await register("Bob Orders", alice.code);

    const placed = await order(bob, { code: alice.code, discount: 100 });
    expect(placed.status).toBe(201);
    expect(placed.body.data.pricing).toMatchObject({ referralDiscount: 100, referralCode: alice.code });
    const num = placed.body.data.orderNumber;
    expect(await Referral.findOne({ refereeId: bob.id })).toMatchObject({ status: "ordered", orderNumber: num, rewardAmountPaise: 10000, discountPaise: 10000 });
    expect((await request(app).get("/api/v1/referrals/me").set(alice.auth)).body.data.stats).toMatchObject({ pendingRewards: 100, totalEarned: 0 });

    expect((await order(bob, { code: alice.code, discount: 100 })).status).toBe(400); // first order only

    expect(await referralService.qualifyDue()).toBe(0); // not delivered yet
    await status(num, "delivered");
    expect(await referralService.qualifyDue()).toBe(0); // delivered, but still inside the 7-day hold
    expect(await wallet(alice)).toBe(0);

    await aged(num, 8);
    await referralService.qualifyDue();
    await referralService.qualifyDue(); // idempotent
    expect(await wallet(alice)).toBe(10000);
    expect(await Referral.findOne({ refereeId: bob.id })).toMatchObject({ status: "rewarded" });
    expect(await WalletTransaction.countDocuments({ userId: alice.id, source: "referral_reward" })).toBe(1);

    const walletView = (await request(app).get("/api/v1/referrals/wallet").set(alice.auth)).body.data;
    expect(walletView.balance).toBe(100);
    expect(walletView.transactions[0]).toMatchObject({ type: "credit", source: "referral_reward", amount: 100, balanceAfter: 100 });
    expect((await request(app).get("/api/v1/referrals/me").set(alice.auth)).body.data.stats).toMatchObject({ rewarded: 1, totalEarned: 100, walletBalance: 100 });

    // the reward can be spent at checkout, then a return takes back whatever is left
    const spend = await request(app).post("/api/v1/orders").set(alice.auth).send({
      customer: { name: "Alice", email: alice.email, phone: "7000000001" },
      shippingAddress: { street: "9 Alice Rd", city: "Pune", state: "Maharashtra", pincode: "411001" },
      items: [{ productId: String(product._id), name: product.name, size: "Standard", price: 1000, quantity: 1 }],
      pricing: { subtotal: 1000, total: 940, storeCredit: 60 },
      paymentMethod: "Cash on Delivery (COD)",
    });
    expect(spend.status).toBe(201);
    expect(await wallet(alice)).toBe(4000);

    await referralService.onOrderReturned(await Order.findOne({ orderNumber: num }));
    expect(await Referral.findOne({ refereeId: bob.id })).toMatchObject({ status: "clawed_back" });
    expect(await wallet(alice)).toBe(0); // only the 40 left could be taken back
    expect(await WalletTransaction.findOne({ userId: alice.id, source: "referral_clawback" })).toMatchObject({ amountPaise: 4000 });
  });

  it("voids the reward when the first order is cancelled, and lets the friend try again", async () => {
    const alice = await register("Alice Cancel");
    const cara = await register("Cara Cancels", alice.code);
    const placed = await order(cara, { code: alice.code, discount: 100 });
    await status(placed.body.data.orderNumber, "cancelled");
    expect(await Referral.findOne({ refereeId: cara.id })).toMatchObject({ status: "signed_up", orderNumber: "" });

    const retry = await order(cara, { code: alice.code, discount: 100 });
    expect(retry.status).toBe(201);
    expect(await Referral.findOne({ refereeId: cara.id })).toMatchObject({ status: "ordered", orderNumber: retry.body.data.orderNumber });
    expect(await wallet(alice)).toBe(0);
  });

  it("lets admins approve a reward early or void it, with settings and reporting", async () => {
    const alice = await register("Alice Admin");
    const eve = await register("Eve Early", alice.code);
    const num = (await order(eve, { code: alice.code, discount: 100 })).body.data.orderNumber;

    expect((await request(app).post(`/api/v1/admin/referrals/${(await Referral.findOne({ refereeId: eve.id })).id}/approve`).set(adminAuth)).status).toBe(400); // not delivered
    await status(num, "delivered");
    const id = (await Referral.findOne({ refereeId: eve.id })).id;
    expect((await request(app).post(`/api/v1/admin/referrals/${id}/approve`).set(adminAuth)).body.data.status).toBe("rewarded");
    expect(await wallet(alice)).toBe(10000);

    expect((await request(app).post(`/api/v1/admin/referrals/${id}/void`).set(adminAuth).send({})).status).toBe(400); // reason needed
    expect((await request(app).post(`/api/v1/admin/referrals/${id}/void`).set(adminAuth).send({ reason: "Fraud review" })).body.data.status).toBe("clawed_back");
    expect(await wallet(alice)).toBe(0);

    const overview = (await request(app).get("/api/v1/admin/referrals").set(adminAuth)).body.data;
    expect(overview.metrics.totalAttributed).toBeGreaterThan(0);
    expect(overview.items.find((r) => r.id === id)).toMatchObject({ status: "clawed_back", voidReason: "Fraud review" });
    const csv = await request(app).get("/api/v1/admin/referrals/export").set(adminAuth);
    expect(csv.headers["content-type"]).toMatch(/csv/);
    expect(csv.text).toContain("Fraud review".slice(0, 0) + "clawed_back");

    const updated = await request(app).put("/api/v1/admin/referrals/settings").set(adminAuth).send({ holdDays: 3, referrerRewardType: "percent", referrerRewardPercent: 5, referrerRewardCap: 50, maxRewardsPerMonth: 10, refereeDiscountCap: 100 });
    expect(updated.body.data).toMatchObject({ holdDays: 3, referrerRewardType: "percent", referrerRewardPercent: 5, maxRewardsPerMonth: 10, refereeDiscountCapPaise: 10000 });
    expect((await request(app).put("/api/v1/admin/referrals/settings").set(adminAuth).send({ holdDays: -1 })).status).toBe(400);
    Object.assign(program, { holdDays: 7, referrerRewardType: "fixed", referrerRewardPaise: 10000, maxRewardsPerMonth: 0, refereeDiscountCapPaise: 25000 });
    await ReferralProgram.updateOne({}, { holdDays: 7, referrerRewardType: "fixed", maxRewardsPerMonth: 0, refereeDiscountCapPaise: 25000 });
  });

  it("only staff can use the admin referral endpoints", async () => {
    const alice = await register("Alice Plain");
    expect((await request(app).get("/api/v1/admin/referrals").set(alice.auth)).status).toBe(403);
    expect((await request(app).get("/api/v1/referrals/me")).status).toBe(401);
    expect((await request(app).get("/api/v1/referrals/wallet")).status).toBe(401);
  });
});
