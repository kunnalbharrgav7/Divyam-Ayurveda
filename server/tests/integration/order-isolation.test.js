import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { User } from "../../src/models/User.js";
import { Order } from "../../src/models/Order.js";
import { Product } from "../../src/models/Product.js";
import { ProductVariant } from "../../src/models/ProductVariant.js";

describe("Customers only see their own orders", () => {
  const stamp = Date.now();
  const emailA = `iso.a.${stamp}@example.test`;
  const emailB = `iso.b.${stamp}@example.test`;
  let authA, authB, product, orderNumber;

  const register = async (name, email, n) => {
    const res = await request(app).post("/api/v1/auth/register").send({ name, email, phone: `7${String(stamp + n).slice(-9)}`, password: "Secret123" });
    return { Authorization: `Bearer ${res.body.data.tokens.accessToken}` };
  };

  beforeAll(async () => {
    authA = await register("Alice Owner", emailA, 1);
    authB = await register("Bob Other", emailB, 2);
    product = await Product.create({ name: `Iso ${stamp}`, slug: `iso-${stamp}`, sku: `ISO-${stamp}`, categoryId: "wellness-essentials", description: "x", status: "active", basePricePaise: 50000 });
    await ProductVariant.create({ productId: product._id, sku: `ISO-${stamp}-S`, label: "Standard", pricePaise: 50000, stockOnHand: 5, isActive: true });
    const placed = await request(app).post("/api/v1/orders").set(authA).send({
      customer: { name: "Alice Owner", email: emailA, phone: "7000000001" },
      shippingAddress: { street: "1 Secret Street", city: "Pune", state: "Maharashtra", pincode: "411001" },
      items: [{ productId: String(product._id), name: product.name, size: "Standard", price: 500, quantity: 1 }],
      pricing: { subtotal: 500, total: 500 },
      paymentMethod: "Cash on Delivery (COD)",
    });
    orderNumber = placed.body.data.orderNumber;
  });

  afterAll(async () => {
    await Order.deleteMany({ "customer.email": emailA });
    await ProductVariant.deleteMany({ productId: product._id });
    await Product.deleteOne({ _id: product._id });
    await User.deleteMany({ email: { $in: [emailA, emailB] } });
  });

  it("lists only the signed-in customer's orders", async () => {
    expect((await request(app).get("/api/v1/me/orders").set(authA)).body.data.map((o) => o.orderNumber)).toEqual([orderNumber]);
    expect((await request(app).get("/api/v1/me/orders").set(authB)).body.data).toEqual([]);
    expect((await request(app).get("/api/v1/me/orders")).status).toBe(401);
  });

  it("hides private order details from other customers and signed-out visitors", async () => {
    const owner = await request(app).get(`/api/v1/orders/${orderNumber}`).set(authA);
    expect(owner.body.data.customer.email).toBe(emailA);
    expect(owner.body.data.pricing.total).toBe(500);

    for (const res of [await request(app).get(`/api/v1/orders/${orderNumber}`).set(authB), await request(app).get(`/api/v1/orders/${orderNumber}`)]) {
      expect(res.status).toBe(200);
      expect(res.body.data.customer).toEqual({ name: "Alice Owner" });
      expect(res.body.data.pricing).toBeUndefined();
      expect(JSON.stringify(res.body.data)).not.toContain(emailA);
      expect(res.body.data.shippingAddress.street).toBeUndefined();
    }
  });

  it("does not let one customer read or return another's order", async () => {
    expect((await request(app).get(`/api/v1/me/orders/${orderNumber}`).set(authB)).status).toBe(404);
    expect((await request(app).get(`/api/v1/me/orders/${orderNumber}/return-eligibility`).set(authB)).status).toBe(404);
    expect((await request(app).post(`/api/v1/me/orders/${orderNumber}/returns`).set(authB).send({ reasonCategory: "other" })).status).toBe(404);
  });

  it("logout revokes the session: cookies are cleared and the refresh token stops working", async () => {
    const agent = request.agent(app);
    const login = await agent.post("/api/v1/auth/login").send({ email: emailB, password: "Secret123" });
    const bearer = { Authorization: `Bearer ${login.body.data.tokens.accessToken}` };
    const out = await agent.post("/api/v1/auth/logout").set(bearer);
    expect(out.status).toBe(200);
    expect(out.headers["set-cookie"].join(";")).toMatch(/accessToken=;/);
    expect(out.headers["set-cookie"].join(";")).toMatch(/refreshToken=;/);

    const refreshed = await request(app).post("/api/v1/auth/refresh").send({ refreshToken: login.body.data.tokens.refreshToken });
    expect(refreshed.status).toBeGreaterThanOrEqual(400);
  });
});
