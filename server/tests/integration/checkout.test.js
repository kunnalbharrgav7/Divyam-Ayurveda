import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { ProductVariant } from "../../src/models/ProductVariant.js";
import { Product } from "../../src/models/Product.js";
import { Coupon } from "../../src/models/Coupon.js";
import { Order } from "../../src/models/Order.js";
import { inventoryService } from "../../src/services/inventory.service.js";

describe("Checkout, Pricing Calculation & Concurrency Integration", () => {
  let testVariant = null;
  let limitedVariant = null;
  let createdParent = null;
  let createdTestVariant = null;
  let createdCoupon = null;

  beforeAll(async () => {
    let parentProd = await Product.findOne();
    if (!parentProd) {
      const stamp = Date.now();
      parentProd = await Product.create({
        name: "Checkout Test Product",
        slug: `checkout-test-${stamp}`,
        sku: `CK-TEST-${stamp}`,
        categoryId: "ayurvedic-herbs",
        status: "active",
        basePricePaise: 50000,
      });
      createdParent = parentProd;
    }

    testVariant = await ProductVariant.findOne({ isActive: true, stockOnHand: { $gte: 2 } });
    if (!testVariant) {
      testVariant = await ProductVariant.create({
        productId: parentProd._id,
        sku: `TEST-VARIANT-${Date.now()}`,
        label: "Standard Pack",
        pricePaise: 49900,
        stockOnHand: 50,
        isActive: true,
      });
      createdTestVariant = testVariant;
    }

    // Ensure WELCOME10 coupon exists
    let coupon = await Coupon.findOne({ code: "WELCOME10" });
    if (!coupon) {
      coupon = await Coupon.create({
        code: "WELCOME10",
        type: "percentage",
        value: 10,
        minimumOrderPaise: 0,
        isActive: true,
      });
      createdCoupon = coupon;
    }

    // Create a product variant with exactly 2 units in stock to test concurrency
    limitedVariant = await ProductVariant.create({
      productId: parentProd._id,
      sku: `CONCURRENCY-TEST-${Date.now()}`,
      label: "100g Limited",
      pricePaise: 50000, // ₹500
      stockOnHand: 2,
      reservedStock: 0,
      reorderThreshold: 1,
      isActive: true,
    });
  });

  afterAll(async () => {
    if (limitedVariant) await ProductVariant.deleteOne({ _id: limitedVariant._id });
    if (createdTestVariant) await ProductVariant.deleteOne({ _id: createdTestVariant._id });
    if (createdParent) await Product.deleteOne({ _id: createdParent._id });
    if (createdCoupon) await Coupon.deleteOne({ _id: createdCoupon._id });
    await Order.deleteMany({ "shippingAddress.fullName": "Priya Sharma" });
    const mongoose = (await import("mongoose")).default;
    await mongoose.connection.db.collection("quotes").deleteMany({});
    await mongoose.connection.db.collection("inventorymovements").deleteMany({});
    await mongoose.connection.db.collection("idempotencykeys").deleteMany({});
  });

  it("should calculate server-authoritative checkout quote and ignore client figures", async () => {
    const res = await request(app)
      .post("/api/v1/checkout/quote")
      .send({
        items: [{ variantId: testVariant.id || testVariant._id.toString(), quantity: 2 }],
        address: {
          fullName: "Priya Sharma",
          phone: "9876543210",
          line1: "14 Palm Meadows, Indiranagar",
          city: "Bengaluru",
          state: "Karnataka",
          pincode: "560038",
        },
        deliveryMethod: "standard",
        couponCode: "WELCOME10",
        // Deliberately fake client-supplied prices (must be ignored)
        clientPrice: 1,
        clientTotal: 2,
      });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.quoteId).toBeDefined();

    const expectedSubtotal = (testVariant.pricePaise * 2) / 100;
    expect(res.body.data.subtotal).toBe(expectedSubtotal);
    expect(res.body.data.appliedCoupon).toBe("WELCOME10");
    expect(res.body.data.discount).toBeGreaterThan(0);

    // Free shipping threshold check
    if (res.body.data.total >= 499) {
      expect(res.body.data.shipping).toBe(0);
    }

    // Intra-state Karnataka GST check (CGST + SGST)
    expect(res.body.data.taxType).toBe("intra_state");
    expect(res.body.data.cgst).toBeGreaterThan(0);
    expect(res.body.data.sgst).toBeGreaterThan(0);
  });

  it("should create order from quote fingerprint with unique orderNumber", async () => {
    const quoteRes = await request(app)
      .post("/api/v1/checkout/quote")
      .send({
        items: [{ variantId: testVariant.id || testVariant._id.toString(), quantity: 1 }],
        address: {
          fullName: "Priya Sharma",
          phone: "9876543210",
          line1: "14 Palm Meadows",
          city: "Bengaluru",
          state: "Karnataka",
          pincode: "560038",
        },
      });

    const quoteId = quoteRes.body.data.quoteId;
    const idempotencyKey = `idem_test_${Date.now()}`;

    const orderRes = await request(app)
      .post("/api/v1/orders")
      .set("Idempotency-Key", idempotencyKey)
      .send({
        quoteId,
        paymentMethod: "cod",
      });

    expect(orderRes.status).toBe(201);
    expect(orderRes.body.data.orderNumber).toMatch(/^DA-\d{8}-\d{6}$/);
    expect(orderRes.body.data.status).toBe("confirmed");

    // Idempotent retry with same key must return the exact same order
    const retryRes = await request(app)
      .post("/api/v1/orders")
      .set("Idempotency-Key", idempotencyKey)
      .send({
        quoteId,
        paymentMethod: "cod",
      });

    expect(retryRes.status).toBe(201);
    expect(retryRes.body.data.orderNumber).toBe(orderRes.body.data.orderNumber);
  });

  it("should prevent overselling under parallel stock reservation requests", async () => {
    // limitedVariant has stockOnHand = 2, reservedStock = 0.
    // Try reserving 2 units concurrently twice. Exactly one must succeed, one must fail!
    const req1 = inventoryService.reserveStock(
      [{ variantId: limitedVariant._id, quantity: 2 }],
      "ORDER-PARALLEL-1"
    );
    const req2 = inventoryService.reserveStock(
      [{ variantId: limitedVariant._id, quantity: 2 }],
      "ORDER-PARALLEL-2"
    );

    const results = await Promise.allSettled([req1, req2]);
    const fulfilled = results.filter((r) => r.status === "fulfilled");
    const rejected = results.filter((r) => r.status === "rejected");

    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);

    // Verify stock allocation did not exceed available capacity
    const fresh = await ProductVariant.findById(limitedVariant._id);
    expect(fresh.reservedStock).toBe(2);
    expect(fresh.stockOnHand).toBe(2);
  });
});

