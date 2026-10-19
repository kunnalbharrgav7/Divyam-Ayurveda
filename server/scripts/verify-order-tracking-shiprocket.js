import mongoose from "mongoose";
import { Order } from "../src/models/Order.js";
import { Shipment } from "../src/models/Shipment.js";
import { orderService } from "../src/services/order.service.js";
import { shipmentService } from "../src/services/shipment.service.js";
import { ORDER_STATUS } from "../src/constants/orderStatus.js";
import { FULFILMENT_STATUS } from "../src/constants/paymentStatus.js";

const MONGO_URI = process.env.MONGODB_URI || "mongodb://127.0.0.1:27017/divyam_ayurveda";

async function runVerification() {
  console.log("Connecting to MongoDB:", MONGO_URI);
  await mongoose.connect(MONGO_URI);
  console.log("Connected to MongoDB successfully.");

  const staffUser = {
    _id: new mongoose.Types.ObjectId(),
    name: "Admin Staff",
    isStaff: true,
    roles: [{ name: "Super Admin" }],
  };

  const testOrderNum = `DA-TEST-${Date.now()}`;
  console.log(`\n--- 1. Creating Test Order: ${testOrderNum} ---`);

  const created = await Order.create({
    orderNumber: testOrderNum,
    customer: {
      name: "Suresh Patel",
      email: "suresh.patel@example.com",
      phone: "9876543210",
    },
    shippingAddress: {
      fullName: "Suresh Patel",
      phone: "9876543210",
      street: "123 MG Road",
      city: "Bengaluru",
      state: "Karnataka",
      pincode: "560001",
    },
    items: [
      {
        name: "Ashwagandha Organic Churna",
        size: "250g",
        price: 349,
        quantity: 2,
        lineTotalPaise: 69800,
        unitPricePaise: 34900,
      },
    ],
    pricing: {
      subtotalPaise: 69800,
      totalPaise: 69800,
      total: 698,
    },
    status: ORDER_STATUS.CONFIRMED,
    fulfilmentStatus: FULFILMENT_STATUS.UNFULFILLED,
    paymentMethod: "Online Payment (Cashfree)",
    paymentStatus: "paid",
    timeline: [
      { status: "Order Placed", time: new Date(), completed: true, note: "Order confirmed" },
      { status: "Packed at Dispensary", time: null, completed: false },
      { status: "Dispatched", time: null, completed: false },
      { status: "Out for Delivery", time: null, completed: false },
      { status: "Delivered", time: null, completed: false },
    ],
  });

  console.log("Created order initial status:", created.status, "fulfilment:", created.fulfilmentStatus);

  // 2. Advance to Processing
  console.log("\n--- 2. Updating status to 'processing' ---");
  const processingOrder = await orderService.updateOrderStatus(
    testOrderNum,
    "processing",
    "Packed at Bengaluru Dispensary",
    staffUser
  );
  console.log("Status:", processingOrder.status, "| Fulfilment:", processingOrder.fulfilmentStatus);
  console.log("Milestones completion:", processingOrder.timeline.map((t) => `${t.status}: ${t.completed}`).join(", "));
  if (processingOrder.fulfilmentStatus !== FULFILMENT_STATUS.PROCESSING) {
    throw new Error(`Expected fulfilmentStatus to be processing, got ${processingOrder.fulfilmentStatus}`);
  }

  // 3. Dispatch with Shiprocket
  console.log("\n--- 3. Dispatching with Shiprocket ---");
  const dispatchRes = await shipmentService.createShipmentForOrder(testOrderNum, staffUser);
  console.log("Shipment created with AWB:", dispatchRes.shipment?.awbCode, "Carrier:", dispatchRes.shipment?.courierName);
  console.log("Order status:", dispatchRes.order?.status, "Carrier on order:", dispatchRes.order?.carrier, "AWB on order:", dispatchRes.order?.trackingNumber);
  if (!dispatchRes.order?.trackingNumber || !dispatchRes.order?.carrier) {
    throw new Error("Tracking number or carrier not attached to Order record!");
  }

  // 4. Advance courier stage to 'out_for_delivery'
  console.log("\n--- 4. Courier Simulation: Out for Delivery ---");
  const ofdRes = await shipmentService.advanceShipmentStatus(
    testOrderNum,
    "out_for_delivery",
    "Delivery executive out for delivery in Bengaluru Central",
    staffUser
  );
  console.log("Status:", ofdRes.order.status, "| Fulfilment:", ofdRes.order.fulfilmentStatus);
  console.log("Timeline:", ofdRes.order.timeline.map((t) => `${t.status}: ${t.completed}`).join(", "));
  if (ofdRes.order.status !== ORDER_STATUS.OUT_FOR_DELIVERY) {
    throw new Error(`Expected OUT_FOR_DELIVERY status, got ${ofdRes.order.status}`);
  }

  // 5. Advance courier stage to 'delivered'
  console.log("\n--- 5. Courier Simulation: Delivered ---");
  const delRes = await shipmentService.advanceShipmentStatus(
    testOrderNum,
    "delivered",
    "Handed over to Suresh Patel",
    staffUser
  );
  console.log("Status:", delRes.order.status, "| Fulfilment:", delRes.order.fulfilmentStatus);
  console.log("Timeline:", delRes.order.timeline.map((t) => `${t.status}: ${t.completed}`).join(", "));
  if (delRes.order.status !== ORDER_STATUS.DELIVERED || delRes.order.fulfilmentStatus !== FULFILMENT_STATUS.FULFILLED) {
    throw new Error("Delivered stage did not update order properly!");
  }

  // 6. Test Milestone Reset Bug: Move backward to 'processing'
  console.log("\n--- 6. Testing backward status move to 'processing' ---");
  const revertedOrder = await orderService.updateOrderStatus(
    testOrderNum,
    "processing",
    "Re-opened by admin for inspection",
    staffUser
  );
  console.log("Status:", revertedOrder.status, "| Fulfilment:", revertedOrder.fulfilmentStatus);
  console.log("Timeline after reverting:");
  revertedOrder.timeline.forEach((t) => console.log(`  - ${t.status}: completed = ${t.completed}`));

  const dispatchedStep = revertedOrder.timeline.find((t) => t.status === "Dispatched");
  const ofdStep = revertedOrder.timeline.find((t) => t.status === "Out for Delivery");
  const delStep = revertedOrder.timeline.find((t) => t.status === "Delivered");

  if (dispatchedStep.completed || ofdStep.completed || delStep.completed) {
    throw new Error("Failed milestone reset test: future steps remained completed: true!");
  }
  console.log("SUCCESS: Future milestones correctly reset to completed: false!");

  // 7. Verify public tracking sanitized view
  console.log("\n--- 7. Verifying Public Customer Tracking View ---");
  const publicView = await orderService.getOrder(testOrderNum, null);
  console.log("Public tracking response:");
  console.log({
    orderNumber: publicView.orderNumber,
    status: publicView.status,
    carrier: publicView.carrier,
    trackingNumber: publicView.trackingNumber,
    trackingUrl: publicView.trackingUrl,
    customerName: publicView.customer?.name,
    stepsCompleted: publicView.timeline?.filter((t) => t.completed).map((t) => t.status),
  });

  if (!publicView.carrier || !publicView.trackingNumber) {
    throw new Error("Carrier and tracking number missing from public tracking view!");
  }

  // Clean up test order & shipment
  await Order.deleteOne({ orderNumber: testOrderNum });
  await Shipment.deleteOne({ orderNumber: testOrderNum });
  console.log("\nCleaned up test records from database.");

  await mongoose.disconnect();
  console.log("\n=== ALL VERIFICATIONS PASSED 100% ===");
}

runVerification().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
