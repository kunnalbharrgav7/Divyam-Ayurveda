import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { Category } from "../../src/models/Category.js";
import { Product } from "../../src/models/Product.js";
import { ProductVariant } from "../../src/models/ProductVariant.js";

describe("Catalog & Products API Integration", () => {
  let testCat = null;
  let testProd1 = null;
  let testVar1 = null;
  let testProd2 = null;
  let testVar2 = null;

  beforeAll(async () => {
    testCat = await Category.create({
      name: "Churna & Powders",
      slug: "churna-powders",
      isActive: true,
    });

    testProd1 = await Product.create({
      name: "Organic Turmeric Powder (Lakadong)",
      slug: "organic-turmeric-powder-lakadong",
      sku: "TEST-PROD-001",
      categoryId: "churna-powders",
      description: "Authentic single-origin Lakadong turmeric powder with high curcumin content.",
      status: "active",
      basePricePaise: 24900,
    });

    testVar1 = await ProductVariant.create({
      productId: testProd1._id,
      sku: "TEST-TURMERIC-250G",
      label: "250g",
      pricePaise: 24900,
      stockOnHand: 50,
      isActive: true,
    });

    testProd2 = await Product.create({
      name: "Organic Ashwagandha Capsules",
      slug: "organic-ashwagandha-capsules",
      sku: "TEST-PROD-002",
      categoryId: "churna-powders",
      description: "Rejuvenating adaptogenic herb capsules for vitality and stress relief.",
      status: "active",
      basePricePaise: 49900,
    });

    testVar2 = await ProductVariant.create({
      productId: testProd2._id,
      sku: "TEST-ASHWA-60CAP",
      label: "60 Capsules",
      pricePaise: 49900,
      stockOnHand: 30,
      isActive: true,
    });
  });

  afterAll(async () => {
    if (testVar1 || testVar2) {
      await ProductVariant.deleteMany({
        _id: { $in: [testVar1?._id, testVar2?._id].filter(Boolean) },
      });
    }
    if (testProd1 || testProd2) {
      await Product.deleteMany({
        _id: { $in: [testProd1?._id, testProd2?._id].filter(Boolean) },
      });
    }
    if (testCat) {
      await Category.deleteOne({ _id: testCat._id });
    }
  });
  it("should return public products list with pagination metadata", async () => {
    const res = await request(app).get("/api/v1/products?page=1&limit=6");

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeLessThanOrEqual(6);
    expect(res.body.meta).toBeDefined();
    expect(res.body.meta.total).toBeGreaterThan(0);

    const first = res.body.data[0];
    expect(first.id).toBeDefined();
    expect(first.price).toBeGreaterThan(0);
    expect(first.slug).toBeDefined();
    expect(first.variants).toBeDefined();
  });

  it("should filter products by category slug", async () => {
    const res = await request(app).get("/api/v1/products?category=churna-powders");

    expect(res.status).toBe(200);
    res.body.data.forEach((p) => {
      expect(p.categoryId).toBe("churna-powders");
    });
  });

  it("should filter products by price range", async () => {
    const res = await request(app).get("/api/v1/products?minPrice=200&maxPrice=400");

    expect(res.status).toBe(200);
    res.body.data.forEach((p) => {
      expect(p.price).toBeGreaterThanOrEqual(200);
      expect(p.price).toBeLessThanOrEqual(400);
    });
  });

  it("should sort products by price ascending", async () => {
    const res = await request(app).get("/api/v1/products?sort=price_asc&limit=10");

    expect(res.status).toBe(200);
    const prices = res.body.data.map((p) => p.price);
    for (let i = 0; i < prices.length - 1; i++) {
      expect(prices[i]).toBeLessThanOrEqual(prices[i + 1]);
    }
  });

  it("should search products by text query", async () => {
    const res = await request(app).get("/api/v1/products?q=turmeric");

    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeGreaterThan(0);
    const hasMatch = res.body.data.some(
      (p) =>
        p.name.toLowerCase().includes("turmeric") ||
        p.description?.toLowerCase().includes("turmeric")
    );
    expect(hasMatch).toBe(true);
  });

  it("should retrieve product detail by slug", async () => {
    const res = await request(app).get(
      "/api/v1/products/organic-turmeric-powder-lakadong"
    );

    expect(res.status).toBe(200);
    expect(res.body.data.name).toContain("Turmeric");
    expect(res.body.data.variants.length).toBeGreaterThan(0);
    expect(res.body.data.variants[0].price).toBeDefined();
  });

  it("should return list of all active categories", async () => {
    const res = await request(app).get("/api/v1/categories");

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThan(0);
  });
});

