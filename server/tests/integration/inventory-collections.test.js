import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { User } from "../../src/models/User.js";
import { Role } from "../../src/models/Role.js";
import { Product } from "../../src/models/Product.js";
import { ProductVariant } from "../../src/models/ProductVariant.js";
import { Collection } from "../../src/models/Collection.js";
import { Category } from "../../src/models/Category.js";
import { Coupon } from "../../src/models/Coupon.js";
import { Brand } from "../../src/models/Brand.js";
import { Review } from "../../src/models/Review.js";
import { ReferralProgram } from "../../src/models/ReferralProgram.js";
import { InventoryMovement } from "../../src/models/InventoryMovement.js";
import { ROLES } from "../../src/constants/roles.js";
import { ALL_PERMISSIONS } from "../../src/constants/permissions.js";
import { generateAccessToken } from "../../src/utils/token.js";
import sharp from "sharp";
import { parseDataUrl } from "../../src/utils/productImages.js";

describe("Admin inventory updates & collections", () => {
  const stamp = Date.now();
  let token = "";
  let staff = null;
  let createdRole = null;
  let product = null;
  let variant = null;

  const auth = () => ({ Authorization: `Bearer ${token}` });
  const publicProduct = async () => {
    const res = await request(app).get("/api/v1/products").query({ q: `Inv Test ${stamp}` });
    return res.body.data.find((p) => p.id === String(product._id));
  };

  beforeAll(async () => {
    let role = await Role.findOne({ name: ROLES.SUPER_ADMIN });
    if (!role) {
      role = createdRole = await Role.create({ name: ROLES.SUPER_ADMIN, permissions: ALL_PERMISSIONS });
    }
    staff = await User.create({
      name: "Inventory Tester",
      email: `inv.tester.${stamp}@example.test`,
      passwordHash: "testHash123",
      isStaff: true,
      roles: [role._id],
      status: "active",
    });
    token = generateAccessToken({ id: staff._id, email: staff.email, isStaff: true });

    product = await Product.create({
      name: `Inv Test ${stamp}`,
      slug: `inv-test-${stamp}`,
      sku: `INV-TEST-${stamp}`,
      categoryId: "wellness-essentials",
      description: "Inventory test product",
      status: "active",
      basePricePaise: 49900,
    });
    variant = await ProductVariant.create({
      productId: product._id,
      sku: `INV-TEST-${stamp}-STD`,
      label: "Standard",
      pricePaise: 49900,
      stockOnHand: 100,
      isActive: true,
    });
  });

  afterAll(async () => {
    await InventoryMovement.deleteMany({ productId: product?._id });
    await ProductVariant.deleteMany({ productId: product?._id });
    await Product.deleteMany({ _id: product?._id });
    await Collection.deleteMany({ slug: new RegExp(`^inv-col-${stamp}`) });
    await Category.deleteMany({ slug: new RegExp(`^inv-cat-${stamp}`) });
    await Coupon.deleteMany({ code: new RegExp(`^INVC${stamp}`) });
    await Brand.deleteMany({ slug: new RegExp(`^inv-brand-${stamp}`) });
    await User.deleteOne({ _id: staff?._id });
    if (createdRole) await Role.deleteOne({ _id: createdRole._id });
  });

  it("sets stock to exactly 0 via the inventory endpoint and the storefront reflects it", async () => {
    // Warm the public cache with the 100-unit state
    expect((await publicProduct()).stockQuantity).toBe(100);

    const res = await request(app)
      .post("/api/v1/admin/inventory/adjustments")
      .set(auth())
      .send({ productId: String(product._id), operation: "set", quantity: 0, reason: "test" });

    expect(res.status).toBe(200);
    expect(res.body.data.stockQuantity).toBe(0);
    expect((await ProductVariant.findById(variant._id)).stockOnHand).toBe(0);
    expect((await publicProduct()).stockQuantity).toBe(0);
  });

  it("restocks via set and add", async () => {
    let res = await request(app)
      .post("/api/v1/admin/inventory/adjustments")
      .set(auth())
      .send({ productId: String(product._id), operation: "set", quantity: 40 });
    expect(res.body.data.stockQuantity).toBe(40);

    res = await request(app)
      .post("/api/v1/admin/inventory/adjustments")
      .set(auth())
      .send({ productId: String(product._id), operation: "add", quantity: 5 });
    expect(res.body.data.stockQuantity).toBe(45);
    expect((await publicProduct()).stockQuantity).toBe(45);
  });

  it("applies stock edited from the product edit form (PATCH) and returns stockQuantity", async () => {
    const res = await request(app)
      .patch(`/api/v1/admin/products/${product._id}`)
      .set(auth())
      .send({ title: `Inv Test ${stamp}`, stock: 0, stockQuantity: 0, reorderThreshold: 7 });

    expect(res.status).toBe(200);
    expect(res.body.data.stockQuantity).toBe(0);
    expect(res.body.data.reorderThreshold).toBe(7);
    expect((await ProductVariant.findById(variant._id)).stockOnHand).toBe(0);
    expect((await publicProduct()).stockQuantity).toBe(0);

    const list = await request(app).get("/api/v1/admin/products").set(auth()).query({ q: `Inv Test ${stamp}` });
    expect(list.body.data[0].stockQuantity).toBe(0);
  });

  it("never reduces stock below units reserved by open orders", async () => {
    await ProductVariant.updateOne({ _id: variant._id }, { stockOnHand: 10, reservedStock: 4 });
    const res = await request(app)
      .post("/api/v1/admin/inventory/adjustments")
      .set(auth())
      .send({ productId: String(product._id), operation: "set", quantity: 0 });

    expect(res.body.data.stockQuantity).toBe(0);
    const v = await ProductVariant.findById(variant._id);
    expect(v.stockOnHand).toBe(4);
    expect(v.reservedStock).toBe(4);
  });

  it("saves homepage flags from the edit form and the storefront filters follow them", async () => {
    const ids = async (query) => {
      const res = await request(app).get("/api/v1/products").query({ ...query, limit: 100 });
      return res.body.data.map((p) => p.id);
    };
    const pid = String(product._id);
    const patch = (body) =>
      request(app).patch(`/api/v1/admin/products/${product._id}`).set(auth()).send(body);

    // Form payload carries both spellings, like ProductFormPage sends
    let res = await patch({ isFeatured: true, isBestSeller: true, isBestseller: true, isNew: false, isNewArrival: false });
    expect(res.body.data).toMatchObject({ isFeatured: true, isBestSeller: true, isNew: false });
    expect(await ids({ featured: "true" })).toContain(pid);
    expect(await ids({ bestSeller: "true" })).toContain(pid);
    expect(await ids({ new: "true" })).not.toContain(pid);

    res = await patch({ isFeatured: false, isBestSeller: false, isBestseller: false, isNew: true, isNewArrival: true });
    expect(res.body.data).toMatchObject({ isFeatured: false, isBestSeller: false, isNew: true });
    expect(await ids({ featured: "true" })).not.toContain(pid);
    expect(await ids({ bestSeller: "true" })).not.toContain(pid);

    const list = await request(app).get("/api/v1/admin/products").set(auth()).query({ q: `Inv Test ${stamp}` });
    expect(list.body.data[0]).toMatchObject({ isBestSeller: false, isNew: true });
  });

  it("repairs products that have no variants instead of failing the edit", async () => {
    const orphan = await Product.create({
      name: `Inv Orphan ${stamp}`,
      slug: `inv-orphan-${stamp}`,
      sku: `INV-ORPHAN-${stamp}`,
      categoryId: "wellness-essentials",
      description: "No variants",
      status: "active",
      basePricePaise: 29900,
    });
    try {
      const res = await request(app)
        .patch(`/api/v1/admin/products/${orphan._id}`)
        .set(auth())
        .send({ title: orphan.name, isBestSeller: false, stock: 12 });
      expect(res.status).toBe(200);
      expect(res.body.data.stockQuantity).toBe(12);
      expect(await ProductVariant.countDocuments({ productId: orphan._id, isActive: true })).toBe(1);
    } finally {
      await InventoryMovement.deleteMany({ productId: orphan._id });
      await ProductVariant.deleteMany({ productId: orphan._id });
      await Product.deleteOne({ _id: orphan._id });
    }
  });

  it("creates a default variant when the form sends an empty variants list", async () => {
    const res = await request(app)
      .post("/api/v1/admin/products")
      .set(auth())
      .send({ title: `Inv Created ${stamp}`, price: 399, stock: 8, variants: [] });
    expect(res.status).toBe(201);
    expect(res.body.data.stockQuantity).toBe(8);
    expect(res.body.data.variants).toHaveLength(1);
    await InventoryMovement.deleteMany({ productId: res.body.data.id });
    await ProductVariant.deleteMany({ productId: res.body.data.id });
    await Product.deleteOne({ _id: res.body.data.id });
  });

  it("persists categories from the admin form (order/featured mapping) and feeds the public list", async () => {
    const slug = `inv-cat-${stamp}`;
    const create = await request(app)
      .post("/api/v1/admin/categories")
      .set(auth())
      .send({
        id: "cat-local-123",
        name: "Inv Category",
        slug,
        order: 3,
        featured: true,
        subcategories: [{ id: "sub-1", name: "Inv Sub", description: "d" }],
      });
    expect(create.status).toBe(201);
    expect(create.body.data).toMatchObject({ name: "Inv Category", displayOrder: 3, isFeatured: true });
    expect(create.body.data.subcategories[0]).toMatchObject({ name: "Inv Sub", slug: "inv-sub" });

    const dup = await request(app).post("/api/v1/admin/categories").set(auth()).send({ name: "Again", slug });
    expect(dup.status).toBe(409);

    const pub = await request(app).get("/api/v1/categories");
    expect(pub.body.data.some((c) => c.slug === slug)).toBe(true);

    const id = create.body.data.id;
    const upd = await request(app).patch(`/api/v1/admin/categories/${id}`).set(auth()).send({ name: "Inv Renamed", slug, order: 1 });
    expect(upd.body.data).toMatchObject({ name: "Inv Renamed", displayOrder: 1 });
    expect(upd.body.data.subcategories).toHaveLength(1);

    expect((await request(app).delete(`/api/v1/admin/categories/${id}`).set(auth())).status).toBe(200);
    expect((await request(app).get("/api/v1/categories")).body.data.some((c) => c.slug === slug)).toBe(false);
    expect((await request(app).get("/api/v1/admin/categories").set(auth())).body.data.some((c) => c.slug === slug)).toBe(false);
  });

  it("exposes live stock for cart/wishlist and refuses to place orders for unavailable items", async () => {
    const pid = String(product._id);
    await ProductVariant.updateOne({ _id: variant._id }, { stockOnHand: 0, reservedStock: 0 });

    const stock = await request(app).get("/api/v1/products/stock").query({ ids: `${pid},not-an-id,000000000000000000000000` });
    expect(stock.status).toBe(200);
    expect(stock.body.data).toHaveLength(2);
    expect(stock.body.data.find((r) => r.id === pid)).toMatchObject({ available: true, stockQuantity: 0 });
    expect(stock.body.data.find((r) => r.id === "000000000000000000000000")).toMatchObject({ available: false, stockQuantity: 0 });

    const order = (quantity) => ({
      customer: { name: "T", email: "t@example.test", phone: "9876543210" },
      shippingAddress: { street: "s", city: "c", state: "Karnataka", pincode: "560001" },
      items: [{ productId: pid, name: product.name, size: "Standard", price: 499, quantity }],
      pricing: { subtotal: 499, total: 499 },
      paymentMethod: "Cash on Delivery (COD)",
    });
    const out = await request(app).post("/api/v1/orders").set(auth()).send(order(1));
    expect(out.status).toBe(409);
    expect(out.body.error.message).toMatch(/out of stock/i);

    await ProductVariant.updateOne({ _id: variant._id }, { stockOnHand: 2 });
    const tooMany = await request(app).post("/api/v1/orders").set(auth()).send(order(5));
    expect(tooMany.status).toBe(409);
    expect(tooMany.body.error.message).toMatch(/only 2/i);
  });

  it("persists admin coupons (form units) and lists only active public ones on the offers endpoint", async () => {
    const code = `INVC${stamp}A`;
    const create = await request(app)
      .post("/api/v1/admin/coupons")
      .set(auth())
      .send({ code: code.toLowerCase(), type: "percentage", discountValue: 10, minOrderValue: 999, maxDiscount: 300, validUntil: "2099-12-31", isActive: true });
    expect(create.status).toBe(201);
    expect(create.body.data).toMatchObject({ code, type: "percentage", discountValue: 10, minOrder: 999, maxDiscount: 300 });
    expect(await Coupon.countDocuments({ code, minimumOrderPaise: 99900, maximumDiscountPaise: 30000 })).toBe(1);

    const dup = await request(app).post("/api/v1/admin/coupons").set(auth()).send({ code, type: "percentage", discountValue: 5 });
    expect(dup.status).toBe(409);

    const fixed = await request(app)
      .post("/api/v1/admin/coupons")
      .set(auth())
      .send({ code: `INVC${stamp}B`, type: "fixed_amount", discountValue: 50, isPublic: false });
    expect(fixed.body.data).toMatchObject({ type: "fixed_amount", discountValue: 50 });
    expect((await Coupon.findById(fixed.body.data.id)).value).toBe(5000);

    const expired = await request(app)
      .post("/api/v1/admin/coupons")
      .set(auth())
      .send({ code: `INVC${stamp}C`, type: "percentage", discountValue: 5, validUntil: "2020-01-01" });
    expect(expired.status).toBe(201);

    const codes = async () => (await request(app).get("/api/v1/checkout/coupons/public")).body.data.map((c) => c.code);
    let listed = await codes();
    expect(listed).toContain(code);
    expect(listed).not.toContain(`INVC${stamp}B`); // private
    expect(listed).not.toContain(`INVC${stamp}C`); // expired

    // Partial update (the admin "Active" toggle) keeps the stored units intact
    const id = create.body.data.id;
    const off = await request(app).patch(`/api/v1/admin/coupons/${id}`).set(auth()).send({ isActive: false });
    expect(off.body.data.isActive).toBe(false);
    expect(off.body.data.discountValue).toBe(10);
    expect(await codes()).not.toContain(code);

    // Public listing must not leak internals
    const pub = (await request(app).get("/api/v1/checkout/coupons/public")).body.data;
    pub.forEach((c) => expect(c).not.toHaveProperty("usedCount"));

    expect((await request(app).delete(`/api/v1/admin/coupons/${id}`).set(auth())).status).toBe(200);
    expect(await Coupon.exists({ _id: id })).toBeNull();
  });

  it("serves base64 product photos as cacheable image URLs and keeps them intact through admin saves", async () => {
    // 1x1 transparent PNG
    const b64 = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==";
    const dataUrl = `data:image/png;base64,${b64}`;

    const create = await request(app)
      .post("/api/v1/admin/products")
      .set(auth())
      .send({ title: `Inv Img ${stamp}`, price: 399, stock: 3, images: [dataUrl, "/images/ProductImages/Ashuwaganda.png"] });
    expect(create.status).toBe(201);
    const id = create.body.data.id;
    try {
      // API exposes URLs, never the inline base64
      expect(JSON.stringify(create.body.data)).not.toContain("base64");
      expect(create.body.data.images[0].startsWith(`/api/v1/products/${id}/images/0?v=`)).toBe(true);
      expect(create.body.data.images[1]).toBe("/images/ProductImages/Ashuwaganda.png");

      const list = await request(app).get("/api/v1/products").query({ q: `Inv Img ${stamp}` });
      const pub = list.body.data.find((p) => p.id === id);
      expect(JSON.stringify(pub)).not.toContain("base64");
      expect(pub.image).toBe(pub.images[0]);

      // The URL serves the original bytes with long-lived caching
      const img = await request(app).get(pub.images[0]);
      expect(img.status).toBe(200);
      expect(img.headers["content-type"]).toContain("image/png");
      expect(img.headers["cache-control"]).toMatch(/immutable/);
      expect(Buffer.from(img.body).toString("base64")).toBe(b64);
      expect((await request(app).get(`/api/v1/products/${id}/images/9`)).status).toBe(404);

      // Admin form saves back the URLs it loaded (reordered, primary first): the stored photo must survive
      const save = await request(app)
        .patch(`/api/v1/admin/products/${id}`)
        .set(auth())
        .send({ title: `Inv Img ${stamp}`, images: [pub.images[1], pub.images[0]] });
      expect(save.status).toBe(200);
      const stored = await Product.findById(id).lean();
      expect(stored.images).toEqual(["/images/ProductImages/Ashuwaganda.png", dataUrl]);
      expect(save.body.data.images[1].startsWith(`/api/v1/products/${id}/images/1?v=`)).toBe(true);
    } finally {
      await InventoryMovement.deleteMany({ productId: id });
      await ProductVariant.deleteMany({ productId: id });
      await Product.deleteOne({ _id: id });
    }
  });

  it("compresses uploaded product photos before storing them (and never re-encodes stored ones)", async () => {
    // A large photo-like JPEG (2400x1600, high quality) like a typical camera/phone export
    const noise = (await import("node:crypto")).randomBytes(600 * 400 * 3);
    const jpeg = await sharp(noise, { raw: { width: 600, height: 400, channels: 3 } })
      .resize(2400, 1600)
      .jpeg({ quality: 95 })
      .toBuffer();
    const original = `data:image/jpeg;base64,${jpeg.toString("base64")}`;
    const svg = "data:image/svg+xml;base64," + Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>').toString("base64");

    const create = await request(app)
      .post("/api/v1/admin/products")
      .set(auth())
      .send({ title: `Inv Compress ${stamp}`, price: 299, stock: 1, images: [original, svg, "/images/ProductImages/Ashuwaganda.png"] });
    expect(create.status).toBe(201);
    const id = create.body.data.id;
    try {
      const [photo, vector, plain] = (await Product.findById(id).lean()).images;
      const meta = await sharp(parseDataUrl(photo).buffer).metadata();
      expect(photo.startsWith("data:image/webp;base64,")).toBe(true);
      expect(Math.max(meta.width, meta.height)).toBe(1600); // longest edge capped
      expect(meta.width / meta.height).toBeCloseTo(1.5, 1); // aspect ratio preserved
      expect(photo.length).toBeLessThan(original.length);
      expect(vector).toBe(svg); // SVG left alone
      expect(plain).toBe("/images/ProductImages/Ashuwaganda.png");

      // Saving again with the stored photo must not re-encode it; a new upload is compressed
      const pub = (await request(app).get("/api/v1/products").query({ q: `Inv Compress ${stamp}` })).body.data.find((p) => p.id === id);
      const save = await request(app)
        .patch(`/api/v1/admin/products/${id}`)
        .set(auth())
        .send({ title: `Inv Compress ${stamp}`, images: [pub.images[0], original] });
      expect(save.status).toBe(200);
      const after = (await Product.findById(id).lean()).images;
      expect(after[0]).toBe(photo);
      expect(after[1].startsWith("data:image/webp;base64,")).toBe(true);
    } finally {
      await InventoryMovement.deleteMany({ productId: id });
      await ProductVariant.deleteMany({ productId: id });
      await Product.deleteOne({ _id: id });
    }
  });

  it("shows a new customer's real data in admin: no fake address, saved address, notes, block/unblock", async () => {
    const email = `cust.${stamp}@example.test`;
    const register = await request(app)
      .post("/api/v1/auth/register")
      .send({ name: "Real Customer", email, phone: `9${String(stamp).slice(-9)}`, password: "Secret123" });
    expect(register.status).toBe(201);
    expect(register.body.data.user.addresses).toEqual([]);
    expect(register.body.data.user).not.toHaveProperty("adminNotes");
    const customerId = register.body.data.user.id;
    const customerToken = register.body.data.tokens.accessToken;
    const asCustomer = { Authorization: `Bearer ${customerToken}` };

    try {
      // Brand-new account: nothing invented (no address/city/orders)
      let detail = await request(app).get(`/api/v1/admin/customers/${customerId}`).set(auth());
      expect(detail.status).toBe(200);
      expect(detail.body.data).toMatchObject({
        name: "Real Customer", email, status: "Active", totalOrders: 0, totalSpent: 0,
        address: "", city: "", state: "", pincode: "", addresses: [], notes: [],
      });
      expect(detail.body.data.joinedAt).toBeTruthy();
      expect((await request(app).get("/api/v1/me/addresses").set(asCustomer)).body.data).toEqual([]);

      // The customer saves an address: admin sees exactly that
      const add = await request(app)
        .post("/api/v1/me/addresses")
        .set(asCustomer)
        .send({ fullName: "Real Customer", phone: "9876543210", street: "12 Lake View Road", city: "Pune", state: "Maharashtra", pincode: "411001", type: "Home" });
      expect(add.status).toBe(201);
      const list = await request(app).get("/api/v1/admin/customers").set(auth());
      const row = list.body.data.find((c) => c.id === customerId);
      expect(row).toMatchObject({ address: "12 Lake View Road", city: "Pune", state: "Maharashtra", pincode: "411001" });
      expect(row).not.toHaveProperty("notes");

      // Real order totals (cancelled orders excluded)
      const placedRes = await request(app)
        .post("/api/v1/orders")
        .set(asCustomer)
        .send({
          customer: { name: "Real Customer", email, phone: "9876543210" },
          shippingAddress: { street: "12 Lake View Road", city: "Pune", state: "Maharashtra", pincode: "411001" },
          items: [{ name: "Manual item", size: "Std", price: 250, quantity: 2 }],
          pricing: { subtotal: 500, total: 500 },
          paymentMethod: "Cash on Delivery (COD)",
        });
      detail = await request(app).get(`/api/v1/admin/customers/${customerId}`).set(auth());
      // An unpaid COD order counts as an order but is not spend until the money is received
      expect(detail.body.data).toMatchObject({ totalOrders: 1, totalSpent: 0 });
      const { Order: OrderModel } = await import("../../src/models/Order.js");
      await OrderModel.updateOne({ orderNumber: placedRes.body.data.orderNumber }, { paymentStatus: "paid" });
      detail = await request(app).get(`/api/v1/admin/customers/${customerId}`).set(auth());
      expect(detail.body.data).toMatchObject({ totalOrders: 1, totalSpent: 500 });

      // Staff notes persist and stay private
      const note = await request(app).post(`/api/v1/admin/customers/${customerId}/notes`).set(auth()).send({ text: "Prefers evening delivery" });
      expect(note.status).toBe(201);
      expect(note.body.data[0]).toMatchObject({ text: "Prefers evening delivery", authorName: "Inventory Tester" });
      expect((await request(app).post(`/api/v1/admin/customers/${customerId}/notes`).set(auth()).send({ text: "  " })).status).toBe(400);
      expect(JSON.stringify((await request(app).get("/api/v1/me").set(asCustomer)).body)).not.toContain("evening delivery");

      // Block: account can no longer sign in; unblock restores access
      const block = await request(app).patch(`/api/v1/admin/customers/${customerId}`).set(auth()).send({ status: "Blocked" });
      expect(block.body.data.status).toBe("Blocked");
      expect((await request(app).post("/api/v1/auth/login").send({ email, password: "Secret123" })).status).toBe(403);
      const unblock = await request(app).patch(`/api/v1/admin/customers/${customerId}`).set(auth()).send({ status: "Active" });
      expect(unblock.body.data.status).toBe("Active");
      expect((await request(app).post("/api/v1/auth/login").send({ email, password: "Secret123" })).status).toBe(200);
      expect((await request(app).patch(`/api/v1/admin/customers/${customerId}`).set(auth()).send({ status: "Nope" })).status).toBe(400);
    } finally {
      const { Order } = await import("../../src/models/Order.js");
      await Order.deleteMany({ "customer.email": email });
      await User.deleteOne({ _id: customerId });
    }
  });

  it("persists brands from the admin form (including established/certified) and survives a reload", async () => {
    const name = `Inv Brand ${stamp}`;
    const create = await request(app)
      .post("/api/v1/admin/brands")
      .set(auth())
      .send({ id: "brand-1234", name, slug: `inv-brand-${stamp}`, origin: "Haridwar, India", established: "1994", certified: true, description: "Classical", logo: "" });
    expect(create.status).toBe(201);
    expect(create.body.data).toMatchObject({ name, origin: "Haridwar, India", established: 1994, certified: true });
    // Stored in the database, and returned by the admin list ("refresh the page")
    expect(await Brand.countDocuments({ name, established: 1994 })).toBe(1);
    expect((await request(app).get("/api/v1/admin/brands").set(auth())).body.data.some((b) => b.name === name)).toBe(true);
    expect((await request(app).get("/api/v1/brands")).body.data.some((b) => b.name === name)).toBe(true);

    expect((await request(app).post("/api/v1/admin/brands").set(auth()).send({ name })).status).toBe(409);

    const id = create.body.data.id;
    const upd = await request(app).patch(`/api/v1/admin/brands/${id}`).set(auth()).send({ certified: false, established: "" });
    expect(upd.body.data).toMatchObject({ certified: false, established: null, name });
    expect((await request(app).delete(`/api/v1/admin/brands/${id}`).set(auth())).status).toBe(200);
    expect(await Brand.exists({ _id: id })).toBeNull();
  });

  it("saves referral program settings to the database (including 0 values) and rejects invalid ones", async () => {
    const before = await request(app).get("/api/v1/admin/referrals/settings").set(auth());
    expect(before.status).toBe(200);
    expect((await request(app).get("/api/v1/admin/referrals").set(auth())).status).toBe(200);

    // Exactly what the admin page sends
    const save = await request(app).put("/api/v1/admin/referrals/settings").set(auth()).send({
      enabled: false, refereeDiscountType: "percentage", refereeDiscountPercent: 15,
      minOrderValue: 0, referrerReward: 0, cookieExpiryDays: 45,
    });
    expect(save.status).toBe(200);
    expect(save.body.data).toMatchObject({ enabled: false, refereeDiscountPercent: 15, minOrderValue: 0, referrerReward: 0, cookieExpiryDays: 45 });
    const stored = await ReferralProgram.findOne().lean();
    expect(stored).toMatchObject({ enabled: false, refereeDiscountPercent: 15, minOrderValuePaise: 0, referrerRewardPaise: 0, cookieExpiryDays: 45 });

    const put = (body) => request(app).put("/api/v1/admin/referrals/settings").set(auth()).send(body);
    expect((await put({ refereeDiscountPercent: 150 })).status).toBe(400); // % over 100
    expect((await put({ refereeDiscountPercent: "abc" })).status).toBe(400);
    expect((await put({ minOrderValue: -5 })).status).toBe(400);
    expect((await put({ cookieExpiryDays: 0 })).status).toBe(400);
    expect((await put({ refereeDiscountType: "bogus" })).status).toBe(400);
    expect((await ReferralProgram.findOne().lean()).refereeDiscountPercent).toBe(15); // invalid saves changed nothing

    // Fixed-amount discounts are rupees and may exceed 100
    const fixed = await put({ refereeDiscountType: "fixed", refereeDiscountPercent: 250 });
    expect(fixed.status).toBe(200);
    expect(fixed.body.data).toMatchObject({ refereeDiscountType: "fixed", refereeDiscountPercent: 250 });
    await ReferralProgram.deleteMany({});
  });

  it("supports product-specific and auto-applied offers end to end (admin, cart preview, order verification)", async () => {
    const mk = async (name, pricePaise) => {
      const prod = await Product.create({ name, slug: `${name.toLowerCase().replace(/\s+/g, "-")}-${stamp}`, sku: `${name.replace(/\s+/g, "")}-${stamp}`, categoryId: "wellness-essentials", description: "x", status: "active", basePricePaise: pricePaise });
      await ProductVariant.create({ productId: prod._id, sku: `${name.replace(/\s+/g, "")}-${stamp}-STD`, label: "Standard", pricePaise, stockOnHand: 10, isActive: true });
      return prod;
    };
    const p1 = await mk("Offer One", 50000);
    const p2 = await mk("Offer Two", 30000);
    const code = `INVO${stamp}`;
    const title = `Inv Festive ${stamp}`;
    const post = (body) => request(app).post("/api/v1/admin/coupons").set(auth()).send(body);
    const preview = (items, couponCode) => request(app).post("/api/v1/checkout/discounts").send({ items, couponCode });
    const line = (prod, price) => ({ productId: String(prod._id), price, quantity: 1 });

    try {
      // Admin rules: selected-products coupons need products; auto offers need a name
      expect((await post({ code, type: "percentage", discountValue: 20, appliesTo: "products", applicableProducts: [] })).status).toBe(400);
      expect((await post({ autoApply: true, type: "percentage", discountValue: 10 })).status).toBe(400);
      expect((await post({ code, type: "percentage", discountValue: 20, validFrom: "2030-02-01", validUntil: "2030-01-01" })).status).toBe(400);

      const coupon = await post({ code, title: "Dussehra Special", occasion: "Dussehra", type: "percentage", discountValue: 20, appliesTo: "products", applicableProducts: [String(p1._id)], usageLimitPerUser: 0, usageLimitTotal: 2 });
      expect(coupon.status).toBe(201);
      expect(coupon.body.data).toMatchObject({ code, title: "Dussehra Special", occasion: "Dussehra", appliesTo: "products", autoApply: false, applicableProducts: [String(p1._id)] });

      const auto = await post({ autoApply: true, title, occasion: "Diwali", type: "percentage", discountValue: 10, appliesTo: "all" });
      expect(auto.status).toBe(201);
      expect(auto.body.data.code).toMatch(/^AUTO-/); // generated internally
      expect(auto.body.data.autoApply).toBe(true);

      const cart = [line(p1, 500), line(p2, 300)];

      // Auto offer applies by itself: 10% of the whole cart (800) = 80
      let res = await preview(cart);
      expect(res.body.data.applied).toMatchObject({ source: "auto", discount: 80, title });

      // Percentage discounts are whole rupees: 10% of 599 = 59.9 -> 60
      res = await preview([line(p2, 599)]);
      expect(res.body.data.applied).toMatchObject({ source: "auto", discount: 60 });

      // The code only discounts its own product (20% of 500 = 100) and beats the auto offer
      res = await preview(cart, code.toLowerCase());
      expect(res.body.data.applied).toMatchObject({ source: "coupon", code, discount: 100 });
      expect(res.body.data.note).toMatch(/Only one offer/);

      // Code not valid for the other product: error is reported, auto offer (10% of 300 = 30) still applies
      res = await preview([line(p2, 300)], code);
      expect(res.body.data.couponError).toMatch(/does not apply/i);
      expect(res.body.data.applied).toMatchObject({ source: "auto", discount: 30 });

      // The product endpoint accepts the product id as well as the slug
      const byId = await request(app).get(`/api/v1/products/${p1._id}`);
      expect(byId.status).toBe(200);
      expect(byId.body.data.name).toBe(p1.name);
      expect((await request(app).get("/api/v1/products/000000000000000000000000")).status).toBe(404);

      // Offers list: auto offers show no code, product-specific ones list their products
      const pub = (await request(app).get("/api/v1/checkout/coupons/public")).body.data;
      expect(pub.find((c) => c.title === title)).toMatchObject({ autoApply: true, code: "", appliesTo: "all" });
      expect(pub.find((c) => c.code === code)).toMatchObject({ appliesTo: "products", applicableProductIds: [String(p1._id)] });

      // Order: the claimed discount is verified against the database
      const orderBody = (offerDiscount, couponCode) => ({
        customer: { name: "T", email: `offer.${stamp}@example.test`, phone: "9876543210" },
        shippingAddress: { street: "s", city: "c", state: "Karnataka", pincode: "560001" },
        items: [{ productId: String(p1._id), name: p1.name, size: "Standard", price: 500, quantity: 1 }],
        pricing: { subtotal: 500, discount: offerDiscount, offerDiscount, couponCode, total: 500 - offerDiscount },
        paymentMethod: "Cash on Delivery (COD)",
      });
      const forged = await request(app).post("/api/v1/orders").set(auth()).send(orderBody(400, code));
      expect(forged.status).toBe(409);
      expect(forged.body.error.message).toMatch(/offer has changed/i);
      expect((await request(app).post("/api/v1/orders").set(auth()).send(orderBody(100, "NOT-A-CODE"))).status).toBe(404);

      const ok = await request(app).post("/api/v1/orders").set(auth()).send(orderBody(100, code));
      expect(ok.status).toBe(201);
      expect(ok.body.data.pricing).toMatchObject({ total: 400, couponCode: code });
      expect((await Coupon.findOne({ code })).usedCount).toBe(1);

      // Usage limit (2): second use fine, third refused
      expect((await request(app).post("/api/v1/orders").set(auth()).send(orderBody(100, code))).status).toBe(201);
      expect((await request(app).post("/api/v1/orders").set(auth()).send(orderBody(100, code))).status).toBe(400);
      expect((await preview([line(p1, 500)], code)).body.data.couponError).toMatch(/maximum redemptions/i);
    } finally {
      const { Order } = await import("../../src/models/Order.js");
      await Order.deleteMany({ "customer.email": `offer.${stamp}@example.test` });
      await Coupon.deleteMany({ $or: [{ code }, { title }] });
      await InventoryMovement.deleteMany({ productId: { $in: [p1._id, p2._id] } });
      await ProductVariant.deleteMany({ productId: { $in: [p1._id, p2._id] } });
      await Product.deleteMany({ _id: { $in: [p1._id, p2._id] } });
    }
  });

  it("carries a product price edit through to its default pack size (quick view / product page price)", async () => {
    const prod = await Product.create({ name: `Inv Price ${stamp}`, slug: `inv-price-${stamp}`, sku: `INVPRICE-${stamp}`, categoryId: "wellness-essentials", description: "x", status: "active", basePricePaise: 49900, compareAtPricePaise: 69900 });
    const small = await ProductVariant.create({ productId: prod._id, sku: `INVPRICE-${stamp}-60`, label: "60 Tablets", pricePaise: 49900, stockOnHand: 5, isActive: true });
    await ProductVariant.create({ productId: prod._id, sku: `INVPRICE-${stamp}-120`, label: "120 Tablets", pricePaise: 89900, stockOnHand: 5, isActive: true });
    const detail = async () => (await request(app).get(`/api/v1/products/${prod.slug}`)).body.data;
    try {
      // 499 -> 599: the 60-tablet pack follows, the separately priced 120-tablet pack does not
      const save = await request(app).patch(`/api/v1/admin/products/${prod._id}`).set(auth()).send({ title: prod.name, price: 599 });
      expect(save.status).toBe(200);
      let d = await detail();
      expect(d.price).toBe(599);
      expect(d.variants.map((v) => [v.label, v.price])).toEqual([["60 Tablets", 599], ["120 Tablets", 899]]);

      // A product already out of sync (pack still 499 while the product says 599) is repaired by re-saving
      await ProductVariant.updateOne({ _id: small._id }, { pricePaise: 49900 });
      await request(app).patch(`/api/v1/admin/products/${prod._id}`).set(auth()).send({ title: prod.name, price: 599 });
      d = await detail();
      expect(d.variants[0].price).toBe(599);

      // Compare-at price follows too
      await request(app).patch(`/api/v1/admin/products/${prod._id}`).set(auth()).send({ title: prod.name, price: 649, compareAtPrice: 799 });
      d = await detail();
      expect(d.variants[0]).toMatchObject({ price: 649, originalPrice: 799 });
      expect(d.variants[1].price).toBe(899);
    } finally {
      await ProductVariant.deleteMany({ productId: prod._id });
      await Product.deleteOne({ _id: prod._id });
    }
  });

  it("keeps inventory in step with orders: reserve on placement, deduct on delivery, release on cancel", async () => {
    const prod = await Product.create({ name: `Inv Life ${stamp}`, slug: `inv-life-${stamp}`, sku: `INVLIFE-${stamp}`, categoryId: "wellness-essentials", description: "x", status: "active", basePricePaise: 10000 });
    const pack = await ProductVariant.create({ productId: prod._id, sku: `INVLIFE-${stamp}-STD`, label: "Standard", pricePaise: 10000, stockOnHand: 5, isActive: true });
    const email = `life.${stamp}@example.test`;
    const place = (quantity) => request(app).post("/api/v1/orders").set(auth()).send({
      customer: { name: "T", email, phone: "9876543210" },
      shippingAddress: { street: "s", city: "c", state: "Karnataka", pincode: "560001" },
      items: [{ productId: String(prod._id), name: prod.name, size: "Standard", price: 100, quantity }],
      pricing: { subtotal: 100 * quantity, total: 100 * quantity },
      paymentMethod: "Cash on Delivery (COD)",
    });
    const state = async () => { const v = await ProductVariant.findById(pack._id).lean(); return { onHand: v.stockOnHand, reserved: v.reservedStock }; };
    const storefrontStock = async () => (await request(app).get(`/api/v1/products/${prod.slug}`)).body.data.stockQuantity;
    const setStatus = (number, status) => request(app).patch(`/api/v1/admin/orders/${number}/status`).set(auth()).send({ status });
    const { Order } = await import("../../src/models/Order.js");

    try {
      expect(await storefrontStock()).toBe(5);

      // Placing an order holds the units immediately (available stock drops, nothing oversold)
      const o1 = await place(2);
      expect(o1.status).toBe(201);
      expect(await state()).toEqual({ onHand: 5, reserved: 2 });
      expect(await storefrontStock()).toBe(3);
      expect((await place(4)).status).toBe(409); // only 3 left
      expect((await Order.findOne({ orderNumber: o1.body.data.orderNumber })).items[0].variantId).toEqual(pack._id);

      // Delivery permanently deducts them
      expect((await setStatus(o1.body.data.orderNumber, "dispatched")).status).toBe(200);
      expect(await state()).toEqual({ onHand: 5, reserved: 2 });
      expect((await setStatus(o1.body.data.orderNumber, "delivered")).status).toBe(200);
      expect(await state()).toEqual({ onHand: 3, reserved: 0 });
      expect(await storefrontStock()).toBe(3);
      // ...and only once
      await setStatus(o1.body.data.orderNumber, "delivered");
      expect(await state()).toEqual({ onHand: 3, reserved: 0 });

      // Cancelling frees the held units
      const o2 = await place(1);
      expect(await storefrontStock()).toBe(2);
      expect((await setStatus(o2.body.data.orderNumber, "cancelled")).status).toBe(200);
      expect(await state()).toEqual({ onHand: 3, reserved: 0 });
      expect(await storefrontStock()).toBe(3);
      expect(await InventoryMovement.countDocuments({ variantId: pack._id, reason: "order_sale" })).toBe(1);
    } finally {
      await Order.deleteMany({ "customer.email": email });
      await InventoryMovement.deleteMany({ productId: prod._id });
      await ProductVariant.deleteMany({ productId: prod._id });
      await Product.deleteOne({ _id: prod._id });
    }
  });

  it("saves customer reviews to the database and lets admins moderate them (rating follows approved reviews)", async () => {
    const email = `rev.${stamp}@example.test`;
    const reg = await request(app).post("/api/v1/auth/register").send({ name: "Rita Reviewer", email, phone: `8${String(stamp).slice(-9)}`, password: "Secret123" });
    expect(reg.status).toBe(201);
    const asCustomer = { Authorization: `Bearer ${reg.body.data.tokens.accessToken}` };
    const pid = String(product._id);
    const publicReviews = async () => (await request(app).get(`/api/v1/products/${product.slug}`)).body.data;
    try {
      // Validation
      expect((await request(app).post(`/api/v1/products/${pid}/reviews`).set(asCustomer).send({ rating: 9, comment: "x" })).status).toBe(400);
      expect((await request(app).post(`/api/v1/products/${pid}/reviews`).set(asCustomer).send({ rating: 5, comment: "  " })).status).toBe(400);
      expect((await request(app).post(`/api/v1/products/000000000000000000000000/reviews`).set(asCustomer).send({ rating: 5, comment: "x" })).status).toBe(404);

      // Submit: stored as pending in the database
      const sent = await request(app).post(`/api/v1/products/${pid}/reviews`).set(asCustomer).send({ rating: 4, title: "Nice Product", comment: "Works well" });
      expect(sent.status).toBe(201);
      expect(await Review.countDocuments({ productId: pid, status: "pending" })).toBe(1);
      expect((await request(app).post(`/api/v1/products/${pid}/reviews`).set(asCustomer).send({ rating: 5, comment: "again" })).status).toBe(409);

      // Not public yet, but visible to its author and to admins
      expect((await publicReviews()).recentReviews).toHaveLength(0);
      const mine = await request(app).get("/api/v1/me/reviews").query({ productId: pid }).set(asCustomer);
      expect(mine.body.data).toHaveLength(1);
      expect(mine.body.data[0]).toMatchObject({ status: "pending", title: "Nice Product" });
      const list = (await request(app).get("/api/v1/admin/reviews").set(auth())).body.data;
      const row = list.find((r) => r.id === sent.body.data.id);
      expect(row).toMatchObject({ productTitle: product.name, userName: "Rita Reviewer", rating: 4, status: "pending", comment: "Works well" });

      // Approve: public, and the product's rating/count follow
      const approve = await request(app).patch(`/api/v1/admin/reviews/${row.id}`).set(auth()).send({ status: "approved" });
      expect(approve.status).toBe(200);
      let d = await publicReviews();
      expect(d.recentReviews).toHaveLength(1);
      expect(d).toMatchObject({ rating: 4, reviewCount: 1 });

      // Reject hides it again; invalid status refused
      await request(app).patch(`/api/v1/admin/reviews/${row.id}`).set(auth()).send({ status: "rejected" });
      d = await publicReviews();
      expect(d.recentReviews).toHaveLength(0);
      expect(d).toMatchObject({ rating: 5, reviewCount: 0 });
      expect((await request(app).patch(`/api/v1/admin/reviews/${row.id}`).set(auth()).send({ status: "bogus" })).status).toBe(400);

      // Delete
      expect((await request(app).delete(`/api/v1/admin/reviews/${row.id}`).set(auth())).status).toBe(200);
      expect(await Review.countDocuments({ productId: pid })).toBe(0);
    } finally {
      await Review.deleteMany({ productId: pid });
      await User.deleteOne({ email });
    }
  });

  it("persists collections created in admin and exposes them publicly", async () => {
    const slug = `inv-col-${stamp}`;
    const create = await request(app)
      .post("/api/v1/admin/collections")
      .set(auth())
      .send({ title: "Inv Collection", slug, subtitle: "Sub", featured: true, image: "/x.png" });
    expect(create.status).toBe(201);
    expect(create.body.data.name).toBe("Inv Collection");
    expect(create.body.data.subtitle).toBe("Sub");

    const dup = await request(app).post("/api/v1/admin/collections").set(auth()).send({ title: "Again", slug });
    expect(dup.status).toBe(409);

    const pub = await request(app).get("/api/v1/collections");
    expect(pub.body.data.some((c) => c.slug === slug)).toBe(true);

    const id = create.body.data.id;
    const upd = await request(app)
      .patch(`/api/v1/admin/collections/${id}`)
      .set(auth())
      .send({ title: "Renamed", slug });
    expect(upd.body.data.name).toBe("Renamed");

    const del = await request(app).delete(`/api/v1/admin/collections/${id}`).set(auth());
    expect(del.status).toBe(200);
    const after = await request(app).get("/api/v1/collections");
    expect(after.body.data.some((c) => c.slug === slug)).toBe(false);
  });
});
