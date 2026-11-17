import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import app from "../../src/app.js";
import { User } from "../../src/models/User.js";
import { Role } from "../../src/models/Role.js";
import { Product } from "../../src/models/Product.js";
import { ProductVariant } from "../../src/models/ProductVariant.js";
import { Order } from "../../src/models/Order.js";
import { Refund } from "../../src/models/Refund.js";
import { Shipment } from "../../src/models/Shipment.js";
import { OrderCancellation } from "../../src/models/OrderCancellation.js";
import { StoreSettings } from "../../src/models/StoreSettings.js";
import { ROLES } from "../../src/constants/roles.js";
import { ALL_PERMISSIONS } from "../../src/constants/permissions.js";
import { ORDER_STATUS } from "../../src/constants/orderStatus.js";
import { PAYMENT_STATUS } from "../../src/constants/paymentStatus.js";
import { generateAccessToken } from "../../src/utils/token.js";

describe("Customer Order Cancellation & Refund Management", () => {
  const stamp = Date.now();
  let staff, customerA, customerB, createdRole, product1, product2, pack1, pack2;
  let adminAuth, custAAuth, custBAuth;
  const emailA = `custa.${stamp}@example.test`;
  const emailB = `custb.${stamp}@example.test`;

  beforeAll(async () => {
    let role = await Role.findOne({ name: ROLES.SUPER_ADMIN });
    if (!role) role = createdRole = await Role.create({ name: ROLES.SUPER_ADMIN, permissions: ALL_PERMISSIONS });
    staff = await User.create({
      name: "Cancel Admin",
      email: `canceladmin.${stamp}@example.test`,
      passwordHash: "x",
      isStaff: true,
      roles: [role._id],
      status: "active",
    });
    adminAuth = { Authorization: `Bearer ${generateAccessToken({ id: staff._id, email: staff.email, isStaff: true })}` };

    const regA = await request(app).post("/api/v1/auth/register").send({
      name: "Alice Cancel",
      email: emailA,
      phone: `8${String(stamp).slice(-9)}`,
      phoneCountryCode: "+91",
      password: "Password123",
      confirmPassword: "Password123",
    });
    customerA = regA.body.data.user;
    custAAuth = { Authorization: `Bearer ${regA.body.data.tokens.accessToken}` };

    const regB = await request(app).post("/api/v1/auth/register").send({
      name: "Bob Other",
      email: emailB,
      phone: `9${String(stamp).slice(-9)}`,
      phoneCountryCode: "+91",
      password: "Password123",
      confirmPassword: "Password123",
    });
    customerB = regB.body.data.user;
    custBAuth = { Authorization: `Bearer ${regB.body.data.tokens.accessToken}` };

    product1 = await Product.create({
      name: `Shilajit Resin ${stamp}`,
      slug: `shilajit-${stamp}`,
      sku: `SHIL-${stamp}`,
      categoryId: "wellness-essentials",
      description: "Purified Himalayan Shilajit",
      status: "active",
      basePricePaise: 100000,
    });
    pack1 = await ProductVariant.create({
      productId: product1._id,
      sku: `SHIL-${stamp}-20G`,
      label: "20g",
      pricePaise: 100000,
      stockOnHand: 50,
      isActive: true,
    });

    product2 = await Product.create({
      name: `Ashwagandha Gold ${stamp}`,
      slug: `ashwa-${stamp}`,
      sku: `ASHW-${stamp}`,
      categoryId: "wellness-essentials",
      description: "Root extract capsules",
      status: "active",
      basePricePaise: 50000,
    });
    pack2 = await ProductVariant.create({
      productId: product2._id,
      sku: `ASHW-${stamp}-60CAP`,
      label: "60 Caps",
      pricePaise: 50000,
      stockOnHand: 50,
      isActive: true,
    });
  });

  afterAll(async () => {
    const orders = await Order.find({ "customer.email": { $in: [emailA, emailB] } });
    const ids = orders.map((o) => o._id);
    await OrderCancellation.deleteMany({ orderId: { $in: ids } });
    await Refund.deleteMany({ orderId: { $in: ids } });
    await Shipment.deleteMany({ orderId: { $in: ids } });
    await Order.deleteMany({ "customer.email": { $in: [emailA, emailB] } });
    await ProductVariant.deleteMany({ productId: { $in: [product1._id, product2._id] } });
    await Product.deleteMany({ _id: { $in: [product1._id, product2._id] } });
    await User.deleteMany({ email: { $in: [emailA, emailB, staff.email] } });
    if (createdRole) await Role.deleteOne({ _id: createdRole._id });
  });

  const placeOrder = ({ online = false, items = null, custAuth = custAAuth, email = emailA } = {}) => {
    const defaultItems = [
      { productId: String(product1._id), name: product1.name, size: "20g", price: 1000, quantity: 1 },
      { productId: String(product2._id), name: product2.name, size: "60 Caps", price: 500, quantity: 2 },
    ];
    const orderItems = items || defaultItems;
    const subtotal = orderItems.reduce((acc, it) => acc + it.price * it.quantity, 0);

    return request(app)
      .post("/api/v1/orders")
      .set(custAuth)
      .send({
        customer: { name: "Alice Cancel", email, phone: "8000000000" },
        shippingAddress: { street: "10 Botanical Way", city: "Bengaluru", state: "Karnataka", pincode: "560038" },
        items: orderItems,
        pricing: { subtotal, total: subtotal },
        paymentMethod: online ? "Online Payment" : "Cash on Delivery (COD)",
      });
  };

  const getStock = async (variantId) => (await ProductVariant.findById(variantId).lean()).stockOnHand;
  const getReserved = async (variantId) => (await ProductVariant.findById(variantId).lean()).reservedStock || 0;

  it("1. Customer can cancel an eligible COD order in full without artificial refund", async () => {
    const initStock1 = await getStock(pack1._id);
    const initReserved1 = await getReserved(pack1._id);

    const res = await placeOrder({ online: false });
    expect(res.status).toBe(201);
    const orderNumber = res.body.data.orderNumber;

    // Reservation was made
    expect(await getReserved(pack1._id)).toBe(initReserved1 + 1);

    // Check eligibility
    const elig = await request(app)
      .get(`/api/v1/orders/${orderNumber}/cancellation-eligibility`)
      .set(custAAuth);
    expect(elig.status).toBe(200);
    expect(elig.body.data.eligible).toBe(true);
    expect(elig.body.data.cancellableItems.length).toBe(2);

    // Submit cancellation
    const cancelRes = await request(app)
      .post(`/api/v1/orders/${orderNumber}/cancel`)
      .set(custAAuth)
      .send({ reason: "Ordered by mistake", customerNote: "Changed my mind" });

    expect(cancelRes.status).toBe(201);
    expect(cancelRes.body.data.cancellation.status).toBe("completed");
    expect(cancelRes.body.data.order.status).toBe("cancelled");
    expect(cancelRes.body.data.order.cancellationStatus).toBe("cancelled");
    expect(cancelRes.body.data.refund).toBeNull(); // No cash refund for unpaid COD

    // Stock reservation released
    expect(await getReserved(pack1._id)).toBe(initReserved1);
    expect(await getStock(pack1._id)).toBe(initStock1);
  });

  it("2. Customer can cancel an eligible online order in full and automatically initiate Cashfree refund", async () => {
    const res = await placeOrder({ online: true });
    expect(res.status).toBe(201);
    const orderNumber = res.body.data.orderNumber;

    // Simulate payment completed
    await Order.updateOne(
      { orderNumber },
      { paymentStatus: PAYMENT_STATUS.PAID, status: ORDER_STATUS.CONFIRMED, stockState: "committed" }
    );
    // When payment committed, stock on hand is reduced and reserved is 0
    await ProductVariant.findByIdAndUpdate(pack1._id, { $inc: { stockOnHand: -1, reservedStock: -1 } });

    const beforeRestock = await getStock(pack1._id);

    // Cancel order
    const cancelRes = await request(app)
      .post(`/api/v1/orders/${orderNumber}/cancel`)
      .set(custAAuth)
      .send({ reason: "Found a better alternative" });

    expect(cancelRes.status).toBe(201);
    expect(cancelRes.body.data.cancellation.status).toBe("completed");
    expect(cancelRes.body.data.order.status).toBe("cancelled");
    expect(cancelRes.body.data.order.paymentStatus).toBe(PAYMENT_STATUS.REFUNDED);
    expect(cancelRes.body.data.order.refundStatus).toBe("completed");
    expect(cancelRes.body.data.refund).toBeTruthy();
    expect(cancelRes.body.data.refund.status).toBe("succeeded");
    expect(cancelRes.body.data.refund.amount).toBe(2000); // 1000 + 2*500

    // Stock was restocked back to shelf
    expect(await getStock(pack1._id)).toBe(beforeRestock + 1);
  });

  it("3. Customer can partially cancel individual product quantity in multi-product order", async () => {
    const res = await placeOrder({ online: false });
    expect(res.status).toBe(201);
    const orderNumber = res.body.data.orderNumber;
    const items = res.body.data.items;
    const ashwaItem = items.find((i) => i.name.includes("Ashwagandha"));
    expect(ashwaItem).toBeTruthy();
    expect(ashwaItem.quantity).toBe(2);

    // Cancel 1 of 2 Ashwagandha units
    const cancelRes = await request(app)
      .post(`/api/v1/orders/${orderNumber}/cancel-items`)
      .set(custAAuth)
      .send({
        reason: "Want to change the product",
        items: [{ orderItemId: ashwaItem._id || ashwaItem.id, quantity: 1 }],
      });

    expect(cancelRes.status).toBe(201);
    expect(cancelRes.body.data.cancellation.cancellationType).toBe("partial");
    expect(cancelRes.body.data.order.status).toBe("partially_cancelled");
    expect(cancelRes.body.data.order.cancellationStatus).toBe("partially_cancelled");

    // The order should have 1 remaining active Ashwagandha and 1 Shilajit
    const updatedOrder = await Order.findOne({ orderNumber });
    const updatedAshwa = updatedOrder.items.find((i) => i.name.includes("Ashwagandha"));
    expect(updatedAshwa.cancelledQuantity).toBe(1);
    expect(updatedAshwa.isCancelled).toBe(false);

    // Cancelling another 1 unit finishes this line
    const cancelRes2 = await request(app)
      .post(`/api/v1/orders/${orderNumber}/cancel-items`)
      .set(custAAuth)
      .send({
        reason: "Want to change the product",
        items: [{ orderItemId: ashwaItem._id || ashwaItem.id, quantity: 1 }],
      });

    expect(cancelRes2.status).toBe(201);
    const updatedOrder2 = await Order.findOne({ orderNumber });
    const finalAshwa = updatedOrder2.items.find((i) => i.name.includes("Ashwagandha"));
    expect(finalAshwa.cancelledQuantity).toBe(2);
    expect(finalAshwa.isCancelled).toBe(true);
  });

  it("4. Prevents customer from cancelling another user's order", async () => {
    const resA = await placeOrder({ online: false, custAuth: custAAuth, email: emailA });
    const orderNumberA = resA.body.data.orderNumber;

    // Customer B attempts to cancel Customer A's order
    const cancelRes = await request(app)
      .post(`/api/v1/orders/${orderNumberA}/cancel`)
      .set(custBAuth)
      .send({ reason: "Malicious attempt" });

    expect(cancelRes.status).toBe(400);
    expect(cancelRes.body.error.message).toMatch(/permission/i);
  });

  it("5. Prevents cancellation once courier handover has occurred", async () => {
    const res = await placeOrder({ online: false });
    const orderNumber = res.body.data.orderNumber;

    // Create a shipment with status PICKED_UP (handed over to courier)
    await Shipment.create({
      orderId: res.body.data._id || (await Order.findOne({ orderNumber }))._id,
      orderNumber,
      status: "PICKED_UP",
      awbCode: `AWB${Date.now()}`,
      pickupStatus: "requested",
    });

    const elig = await request(app)
      .get(`/api/v1/orders/${orderNumber}/cancellation-eligibility`)
      .set(custAAuth);
    expect(elig.body.data.eligible).toBe(false);
    expect(elig.body.data.reason).toMatch(/handed over to the courier/i);

    const cancelRes = await request(app)
      .post(`/api/v1/orders/${orderNumber}/cancel`)
      .set(custAAuth)
      .send({ reason: "Too late" });

    expect(cancelRes.status).toBe(400);
    expect(cancelRes.body.error.message).toMatch(/handed over/i);
  });

  it("6. Delivered orders cannot be cancelled directly and require return workflow", async () => {
    const res = await placeOrder({ online: false });
    const orderNumber = res.body.data.orderNumber;

    await Order.updateOne({ orderNumber }, { status: ORDER_STATUS.DELIVERED, deliveredAt: new Date() });

    const elig = await request(app)
      .get(`/api/v1/orders/${orderNumber}/cancellation-eligibility`)
      .set(custAAuth);
    expect(elig.body.data.eligible).toBe(false);
    expect(elig.body.data.requiresReturnWorkflow).toBe(true);

    const cancelRes = await request(app)
      .post(`/api/v1/orders/${orderNumber}/cancel`)
      .set(custAAuth)
      .send({ reason: "Delivered product cancellation" });

    expect(cancelRes.status).toBe(400);
    expect(cancelRes.body.error.message).toMatch(/delivered/i);
  });

  it("7. Respects requireAdminApproval setting: creates request and allows admin to approve", async () => {
    // Configure store setting to require approval
    await request(app)
      .patch("/api/v1/admin/cancellation-settings")
      .set(adminAuth)
      .send({ requireAdminApproval: true });

    const res = await placeOrder({ online: false });
    const orderNumber = res.body.data.orderNumber;

    const cancelRes = await request(app)
      .post(`/api/v1/orders/${orderNumber}/cancel`)
      .set(custAAuth)
      .send({ reason: "Need approval" });

    expect(cancelRes.status).toBe(201);
    expect(cancelRes.body.data.status).toBe("requested");
    const cancellationId = cancelRes.body.data.cancellation.id;

    // Order status reflects awaiting approval
    const order = await Order.findOne({ orderNumber });
    expect(order.cancellationStatus).toBe("requested");

    // Admin approves the request
    const approveRes = await request(app)
      .post(`/api/v1/admin/cancellations/${cancellationId}/approve`)
      .set(adminAuth);

    expect(approveRes.status).toBe(200);
    expect(approveRes.body.data.cancellation.status).toBe("completed");

    const finishedOrder = await Order.findOne({ orderNumber });
    expect(finishedOrder.status).toBe(ORDER_STATUS.CANCELLED);
    expect(finishedOrder.cancellationStatus).toBe("cancelled");

    // Reset setting
    await request(app)
      .patch("/api/v1/admin/cancellation-settings")
      .set(adminAuth)
      .send({ requireAdminApproval: false });
  });

  it("8. Admin can reject a cancellation request with explanation", async () => {
    await request(app)
      .patch("/api/v1/admin/cancellation-settings")
      .set(adminAuth)
      .send({ requireAdminApproval: true });

    const res = await placeOrder({ online: false });
    const orderNumber = res.body.data.orderNumber;

    const cancelRes = await request(app)
      .post(`/api/v1/orders/${orderNumber}/cancel`)
      .set(custAAuth)
      .send({ reason: "Customer says changed mind" });

    const cancellationId = cancelRes.body.data.cancellation.id;

    const rejectRes = await request(app)
      .post(`/api/v1/admin/cancellations/${cancellationId}/reject`)
      .set(adminAuth)
      .send({ reason: "Order is customized botanical blend in preparation" });

    expect(rejectRes.status).toBe(200);
    expect(rejectRes.body.data.cancellation.status).toBe("rejected");
    expect(rejectRes.body.data.cancellation.rejectionReason).toMatch(/customized/i);

    const order = await Order.findOne({ orderNumber });
    expect(order.status).toBe(ORDER_STATUS.CONFIRMED);
    expect(order.cancellationStatus).toBe("none");

    await request(app)
      .patch("/api/v1/admin/cancellation-settings")
      .set(adminAuth)
      .send({ requireAdminApproval: false });
  });

  it("9. Admin can fetch cancellation list and filters", async () => {
    const listRes = await request(app)
      .get("/api/v1/admin/cancellations")
      .set(adminAuth);

    expect(listRes.status).toBe(200);
    expect(Array.isArray(listRes.body.data.cancellations)).toBe(true);
    expect(listRes.body.data.counts).toHaveProperty("total");
    expect(listRes.body.data.counts).toHaveProperty("completed");
  });

  it("10. Admin can retry an eligible failed refund", async () => {
    const res = await placeOrder({ online: true });
    const orderNumber = res.body.data.orderNumber;

    // Simulate an order that was cancelled but refund failed
    const refund = await Refund.create({
      orderId: (await Order.findOne({ orderNumber }))._id,
      orderNumber,
      amountPaise: 100000,
      reason: "Order cancelled",
      provider: "cashfree",
      method: "original",
      refundId: `RF-FAILED-${orderNumber}`,
      status: "failed",
      errorMessage: "Bank network timeout",
    });

    await Order.updateOne({ orderNumber }, { paymentStatus: PAYMENT_STATUS.PAID, refundedPaise: 0 });

    const retryRes = await request(app)
      .post(`/api/v1/admin/refunds/${refund._id}/retry`)
      .set(adminAuth);

    expect(retryRes.status).toBe(200);
    expect(retryRes.body.data.refund.status).toBe("succeeded");
  });
});
