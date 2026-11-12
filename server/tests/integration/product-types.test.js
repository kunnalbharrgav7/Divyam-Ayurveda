import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { User } from "../../src/models/User.js";
import { Role } from "../../src/models/Role.js";
import { Product } from "../../src/models/Product.js";
import { ProductVariant } from "../../src/models/ProductVariant.js";
import { InventoryMovement } from "../../src/models/InventoryMovement.js";
import { ROLES } from "../../src/constants/roles.js";
import { ALL_PERMISSIONS } from "../../src/constants/permissions.js";
import { generateAccessToken } from "../../src/utils/token.js";

describe("Product types and pack sizes", () => {
  const stamp = Date.now();
  const createdIds = [];
  let token = "";
  let staff = null;
  let createdRole = null;

  const auth = () => ({ Authorization: `Bearer ${token}` });
  const create = async (body) => {
    const res = await request(app).post("/api/v1/admin/products").set(auth()).send(body);
    if (res.body?.data?.id) createdIds.push(res.body.data.id);
    return res;
  };

  beforeAll(async () => {
    let role = await Role.findOne({ name: ROLES.SUPER_ADMIN });
    if (!role) role = createdRole = await Role.create({ name: ROLES.SUPER_ADMIN, permissions: ALL_PERMISSIONS });
    staff = await User.create({
      name: "Type Tester",
      email: `type.tester.${stamp}@example.test`,
      passwordHash: "testHash123",
      isStaff: true,
      roles: [role._id],
      status: "active",
    });
    token = generateAccessToken({ id: staff._id, email: staff.email, isStaff: true });
  });

  afterAll(async () => {
    await InventoryMovement.deleteMany({ productId: { $in: createdIds } });
    await ProductVariant.deleteMany({ productId: { $in: createdIds } });
    await Product.deleteMany({ _id: { $in: createdIds } });
    await User.deleteOne({ _id: staff._id });
    if (createdRole) await Role.deleteOne({ _id: createdRole._id });
  });

  it("saves a tablet product with several counted pack sizes, each with its own price and stock", async () => {
    const res = await create({
      title: `Tab ${stamp}`,
      productType: "tablet",
      soldAs: "multiple",
      variants: [
        { packQuantity: 60, packUnit: "Tablets", price: 499, compareAtPrice: 699, costPrice: 200, stock: 35 },
        { packQuantity: 120, packUnit: "Tablets", price: 899, stock: 15 },
      ],
    });
    expect(res.status).toBe(201);
    expect(res.body.data).toMatchObject({ productType: "tablet", soldAs: "multiple", packSize: "60 Tablets", price: 499, stock: 50 });
    expect(res.body.data.productForm).toBe("Tablet");
    expect(res.body.data.variants.map((v) => v.label)).toEqual(["60 Tablets", "120 Tablets"]);
    expect(res.body.data.variants[0]).toMatchObject({ packQuantity: 60, packUnit: "Tablets", compareAtPrice: 699, costPrice: 200 });
  });

  it("saves a single weighed pack (resin) from the product's own price and stock", async () => {
    const res = await create({
      title: `Shilajit ${stamp}`,
      productType: "resin",
      soldAs: "single",
      price: 1299,
      compareAtPrice: 1599,
      costPrice: 600,
      stock: 20,
      reorderThreshold: 5,
      variants: [{ packQuantity: 20, packUnit: "g" }],
    });
    expect(res.status).toBe(201);
    expect(res.body.data.variants).toHaveLength(1);
    expect(res.body.data).toMatchObject({ soldAs: "single", packSize: "20 g", price: 1299, stock: 20 });
    expect(res.body.data.variants[0]).toMatchObject({ label: "20 g", price: 1299, costPrice: 600, reorderThreshold: 5, stock: 20 });
  });

  it("rejects a product without a price or with a repeated pack size", async () => {
    const noPrice = await create({ title: `NoPrice ${stamp}`, productType: "powder", soldAs: "single", stock: 3, variants: [{ packQuantity: 100, packUnit: "g" }] });
    expect(noPrice.status).toBe(400);

    const twice = await create({
      title: `Twice ${stamp}`,
      productType: "tablet",
      soldAs: "multiple",
      variants: [
        { packQuantity: 60, packUnit: "Tablets", price: 100, stock: 1 },
        { packQuantity: 60, packUnit: "Tablets", price: 200, stock: 1 },
      ],
    });
    expect(twice.status).toBe(400);

    const noTitle = await create({ productType: "tablet", price: 100 });
    expect(noTitle.status).toBe(400);
  });

  it("does not invent an image when none is supplied", async () => {
    const res = await create({ title: `NoImg ${stamp}`, productType: "oil", soldAs: "single", price: 250, stock: 4, variants: [{ packQuantity: 200, packUnit: "ml" }] });
    expect(res.status).toBe(201);
    expect(res.body.data.images).toEqual([]);
    expect(res.body.data.image).toBe("");
  });

  it("edits pack sizes: updates one, adds one, retires one, and keeps stock movements", async () => {
    const made = await create({
      title: `Edit ${stamp}`,
      productType: "capsule",
      soldAs: "multiple",
      variants: [
        { packQuantity: 30, packUnit: "Capsules", price: 300, stock: 10 },
        { packQuantity: 60, packUnit: "Capsules", price: 550, stock: 10 },
      ],
    });
    const id = made.body.data.id;
    const [first, second] = made.body.data.variants;

    const res = await request(app)
      .patch(`/api/v1/admin/products/${id}`)
      .set(auth())
      .send({
        productType: "capsule",
        soldAs: "multiple",
        variants: [
          { id: first.id, packQuantity: 30, packUnit: "Capsules", price: 320, stock: 25 },
          { packQuantity: 90, packUnit: "Capsules", price: 780, stock: 8 },
        ],
      });
    expect(res.status).toBe(200);
    expect(res.body.data.variants.map((v) => [v.label, v.price, v.stock])).toEqual([
      ["30 Capsules", 320, 25],
      ["90 Capsules", 780, 8],
    ]);
    expect(res.body.data.price).toBe(320);

    // The removed pack size is kept for order history but hidden from admin and storefront
    const retired = await ProductVariant.findById(second.id);
    expect(retired.isActive).toBe(false);
    const pub = await request(app).get(`/api/v1/products/${made.body.data.slug}`);
    expect(pub.body.data.variants.map((v) => v.label)).toEqual(["30 Capsules", "90 Capsules"]);

    const moves = await InventoryMovement.find({ variantId: first.id });
    expect(moves.map((m) => m.afterStock)).toEqual(expect.arrayContaining([10, 25]));
  });

  it("switches a multi-size product to a single pack", async () => {
    const made = await create({
      title: `Switch ${stamp}`,
      productType: "powder",
      soldAs: "multiple",
      variants: [
        { packQuantity: 100, packUnit: "g", price: 150, stock: 5 },
        { packQuantity: 250, packUnit: "g", price: 320, stock: 5 },
      ],
    });
    const [first] = made.body.data.variants;
    const res = await request(app)
      .patch(`/api/v1/admin/products/${made.body.data.id}`)
      .set(auth())
      .send({ productType: "powder", soldAs: "single", price: 160, stock: 12, variants: [{ id: first.id, packQuantity: 100, packUnit: "g" }] });
    expect(res.status).toBe(200);
    expect(res.body.data.variants).toHaveLength(1);
    expect(res.body.data).toMatchObject({ soldAs: "single", price: 160, stock: 12 });
  });

  it("refuses to remove a pack size that has units held for open orders", async () => {
    const made = await create({
      title: `Held ${stamp}`,
      productType: "tablet",
      soldAs: "multiple",
      variants: [
        { packQuantity: 30, packUnit: "Tablets", price: 100, stock: 10 },
        { packQuantity: 60, packUnit: "Tablets", price: 180, stock: 10 },
      ],
    });
    const [first, second] = made.body.data.variants;
    await ProductVariant.updateOne({ _id: second.id }, { reservedStock: 2 });
    const res = await request(app)
      .patch(`/api/v1/admin/products/${made.body.data.id}`)
      .set(auth())
      .send({ productType: "tablet", soldAs: "multiple", variants: [{ id: first.id, packQuantity: 30, packUnit: "Tablets", price: 100, stock: 10 }] });
    expect(res.status).toBe(400);
    expect(res.body.error?.message || res.body.message).toMatch(/open orders/i);
  });

  it("rejects an unknown product type on edit", async () => {
    const made = await create({ title: `BadType ${stamp}`, productType: "tablet", price: 100, stock: 1 });
    const res = await request(app).patch(`/api/v1/admin/products/${made.body.data.id}`).set(auth()).send({ productType: "spaceship" });
    expect(res.status).toBe(400);
  });
});
