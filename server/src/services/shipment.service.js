import mongoose from "mongoose";
import { Order } from "../models/Order.js";
import { Shipment } from "../models/Shipment.js";
import { WebhookEvent } from "../models/WebhookEvent.js";
import { shiprocket } from "../integrations/shiprocket/shiprocket.adapter.js";
import { inventoryService } from "./inventory.service.js";
import { ORDER_STATUS } from "../constants/orderStatus.js";
import { FULFILMENT_STATUS } from "../constants/paymentStatus.js";
import { logAudit } from "./audit.service.js";
import { settingsService } from "./settings.service.js";
import { sha256 } from "../utils/crypto.js";
import { ApiError } from "../utils/apiError.js";
import { logger } from "../config/logger.js";
import { config } from "../config/index.js";

const STANDARD_MILESTONES = [
  "Order Placed",
  "Packed at Dispensary",
  "Dispatched",
  "Out for Delivery",
  "Delivered",
];

// Courier statuses grouped by how far the parcel has got (index into STANDARD_MILESTONES)
const IN_TRANSIT_STATUSES = new Set([
  "PICKED_UP",
  "PICKUP_DONE",
  "SHIPPED",
  "DISPATCHED",
  "IN_TRANSIT",
  "REACHED_AT_DESTINATION_HUB",
  "REACHED_DESTINATION_HUB",
  "AWB_ASSIGNED",
]);

// Shiprocket sends times as "YYYY-MM-DD HH:mm:ss" or "DD MM YYYY HH:mm:ss" in India time
const parseShiprocketTime = (value) => {
  if (!value) return new Date();
  const text = String(value).trim();
  let m = text.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}:\d{2}(?::\d{2})?)/);
  if (m) {
    const d = new Date(`${m[1]}-${m[2]}-${m[3]}T${m[4].length === 5 ? `${m[4]}:00` : m[4]}+05:30`);
    return Number.isNaN(d.getTime()) ? new Date() : d;
  }
  m = text.match(/^(\d{2}) (\d{2}) (\d{4}) (\d{2}:\d{2}(?::\d{2})?)/);
  if (m) {
    const d = new Date(`${m[3]}-${m[2]}-${m[1]}T${m[4].length === 5 ? `${m[4]}:00` : m[4]}+05:30`);
    return Number.isNaN(d.getTime()) ? new Date() : d;
  }
  const d = new Date(text);
  return Number.isNaN(d.getTime()) ? new Date() : d;
};

const milestoneTimeline = (order, completeUpTo, activeNote) => {
  const clean = (order.timeline || []).filter((entry) => !entry.status.startsWith("Status changed to"));
  return STANDARD_MILESTONES.map((name, idx) => {
    const match = clean.find((e) => e.status.toLowerCase() === name.toLowerCase());
    const done = idx <= completeUpTo;
    return {
      status: name,
      time: done ? match?.time || new Date() : null,
      note: idx === completeUpTo ? activeNote || match?.note || "" : match?.note || "",
      completed: done,
    };
  });
};

/**
 * Move the order forward to match the courier status. Never moves backwards, and never touches an order
 * that is already delivered, cancelled or returned.
 */
const applyShipmentStatusToOrder = (order, shipment, status, activity) => {
  if ([ORDER_STATUS.DELIVERED, ORDER_STATUS.CANCELLED, ORDER_STATUS.RETURNED, ORDER_STATUS.RETURN_REQUESTED].includes(order.status)) {
    return;
  }

  if (status === "DELIVERED") {
    order.status = ORDER_STATUS.DELIVERED;
    order.fulfilmentStatus = FULFILMENT_STATUS.FULFILLED;
    if (!order.deliveredAt) order.deliveredAt = new Date();
    if (/cod|cash/i.test(String(order.paymentMethod || ""))) order.paymentStatus = "paid";
    order.timeline = milestoneTimeline(order, 4, activity || "Delivered to customer address");
  } else if (status === "OUT_FOR_DELIVERY") {
    order.status = ORDER_STATUS.OUT_FOR_DELIVERY;
    order.fulfilmentStatus = FULFILMENT_STATUS.FULFILLED;
    order.timeline = milestoneTimeline(order, 3, activity || "Out for delivery with courier agent");
  } else if (IN_TRANSIT_STATUSES.has(status)) {
    if (order.status === ORDER_STATUS.OUT_FOR_DELIVERY) return; // a late transit scan must not step back
    order.status = ORDER_STATUS.DISPATCHED;
    order.fulfilmentStatus = FULFILMENT_STATUS.FULFILLED;
    order.timeline = milestoneTimeline(order, 2, activity || `Shipped via ${shipment.courierName}. AWB: ${shipment.awbCode}`);
  } else if (status.startsWith("RTO") || status === "UNDELIVERED" || status === "CANCELED" || status === "CANCELLED") {
    // The parcel is not reaching the customer. Record it for the admin; refunds and restocking stay a staff decision.
    order.timeline.push({
      status: status.startsWith("RTO") ? "Returning to origin" : status === "UNDELIVERED" ? "Delivery attempt failed" : "Shipment cancelled at courier",
      time: new Date(),
      note: activity || status,
      completed: false,
    });
  }
};

export class ShipmentService {
  /**
   * Pincode serviceability check
   */
  async checkServiceability({ deliveryPincode, weightGrams = 250, cod = true }) {
    if (!deliveryPincode || deliveryPincode.length !== 6 || isNaN(deliveryPincode)) {
      throw ApiError.badRequest("Please provide a valid 6-digit Indian PIN code.");
    }

    return shiprocket.checkServiceability({
      pickupPincode: (await settingsService.get()).shipping.originPincode, // dispatch PIN from Admin -> Settings
      deliveryPincode,
      cod,
      weightGrams,
    });
  }

  /**
   * Create shipment for confirmed or paid order.
   *
   * The Shipment document is claimed first (one per order, enforced by a unique index) so two clicks or two
   * admins can never create two Shiprocket orders. The order only moves to "dispatched" once a courier AWB
   * exists; if Shiprocket accepted the order but could not assign a courier yet, the shipment is saved as
   * PROCESSING and a later call finishes the AWB step instead of creating a second order.
   */
  async createShipmentForOrder(orderNumber, staffUser = null) {
    const order = await Order.findOne({ orderNumber });
    if (!order) throw ApiError.notFound("Order not found.");

    if (
      order.status !== ORDER_STATUS.CONFIRMED &&
      order.status !== ORDER_STATUS.PROCESSING &&
      order.status !== ORDER_STATUS.PACKED
    ) {
      throw ApiError.badRequest(
        `Cannot create shipment for order in "${order.status}" status. Order must be confirmed or processing.`
      );
    }

    // Claim the shipment slot: null means this call inserted it and owns the work
    let claimed;
    try {
      claimed = await Shipment.findOneAndUpdate(
        { orderNumber: order.orderNumber },
        {
          $setOnInsert: {
            orderId: order._id,
            orderNumber: order.orderNumber,
            status: "CREATING",
            pickupLocation: config.SHIPROCKET_PICKUP_LOCATION,
          },
        },
        { upsert: true, new: false }
      );
    } catch (err) {
      if (err.code === 11000) throw ApiError.conflict("A shipment is already being created for this order. Please wait a moment.");
      throw err;
    }

    if (claimed) {
      if (claimed.awbCode) return claimed.toJSON(); // already shipped: nothing to do
      const stale = Date.now() - new Date(claimed.updatedAt).getTime() > 2 * 60 * 1000;
      if (claimed.status === "CREATING" && !stale) {
        throw ApiError.conflict("A shipment is already being created for this order. Please wait a moment.");
      }
    }

    let srResult;
    try {
      if (claimed?.shipmentId) {
        // Shiprocket already holds this order; only the courier assignment is missing
        const info = await shiprocket.assignCourierAwb(claimed.shipmentId);
        srResult = {
          shiprocketOrderId: claimed.shiprocketOrderId,
          shipmentId: claimed.shipmentId,
          awbCode: info?.awb_code || null,
          courierName: info?.courier_name || "",
          courierId: info?.courier_company_id ? String(info.courier_company_id) : "",
          trackingUrl: info?.awb_code ? `https://shiprocket.co/tracking/${info.awb_code}` : "",
          labelUrl: claimed.labelUrl || "",
          manifestUrl: claimed.manifestUrl || "",
        };
      } else {
        srResult = await shiprocket.createShipment({
          orderNumber: order.orderNumber,
          items: order.items,
          customer: order.customer,
          shippingAddress: order.shippingAddress,
          paymentMethod: order.paymentMethod,
          pricing: order.pricing,
          weightGrams: order.items.reduce((sum, it) => sum + (it.weightGrams || 250) * it.quantity, 0),
        });
      }
    } catch (err) {
      // Nothing was created at Shiprocket by this call: free the slot so the admin can retry
      if (!claimed?.shipmentId) await Shipment.deleteOne({ orderNumber: order.orderNumber, shipmentId: { $exists: false }, status: "CREATING" });
      throw err;
    }

    const hasAwb = Boolean(srResult.awbCode);
    const shipment = await Shipment.findOneAndUpdate(
      { orderNumber: order.orderNumber },
      {
        shiprocketOrderId: srResult.shiprocketOrderId,
        shipmentId: srResult.shipmentId,
        courierName: srResult.courierName || "",
        courierId: srResult.courierId || "",
        trackingUrl: srResult.trackingUrl || "",
        labelUrl: srResult.labelUrl || "",
        manifestUrl: srResult.manifestUrl || "",
        status: hasAwb ? "SHIPPED" : "PROCESSING",
        ...(hasAwb ? { awbCode: srResult.awbCode } : {}),
        ...(hasAwb
          ? {
              $push: {
                trackingEvents: {
                  status: "AWB Generated",
                  activity: `Assigned courier ${srResult.courierName}`,
                  location: "Dispatch point",
                  time: new Date(),
                },
              },
            }
          : {}),
      },
      { new: true }
    );

    if (!hasAwb) {
      order.timeline.push({
        status: "Shipment created, awaiting courier",
        time: new Date(),
        note: "Shiprocket has the order but no courier could be assigned yet. Retry dispatch from the admin panel.",
        completed: false,
      });
      await order.save();
      throw ApiError.conflict(
        "The order was created at Shiprocket, but no courier could be assigned yet (check wallet balance and serviceability). Click dispatch again to retry the courier assignment."
      );
    }

    // Update order status to dispatched and attach carrier and AWB tracking info
    order.status = ORDER_STATUS.DISPATCHED;
    order.fulfilmentStatus = FULFILMENT_STATUS.SHIPPED;
    order.trackingNumber = srResult.awbCode;
    order.carrier = srResult.courierName;
    order.trackingUrl = srResult.trackingUrl;
    order.shippingLabelUrl = srResult.labelUrl;

    const standardMilestones = [
      "Order Placed",
      "Packed at Dispensary",
      "Dispatched",
      "Out for Delivery",
      "Delivered",
    ];
    const existingCleanTimeline = (order.timeline || []).filter(
      (entry) => !entry.status.startsWith("Status changed to")
    );
    order.timeline = standardMilestones.map((mName, idx) => {
      const match = existingCleanTimeline.find(
        (e) => e.status.toLowerCase() === mName.toLowerCase()
      );
      const isCompleted = idx <= 2;
      return {
        status: mName,
        time: isCompleted ? (match?.time || new Date()) : null,
        note: idx === 2 ? `Shipped via ${srResult.courierName}. AWB: ${srResult.awbCode}` : (match?.note || ""),
        completed: isCompleted,
      };
    });
    await order.save();

    if (staffUser) {
      await logAudit({
        actorId: staffUser._id,
        actorName: staffUser.name,
        actorRole: staffUser.roles?.[0]?.name || "Staff",
        action: "orders.shipment_created",
        module: "Sales",
        targetId: order.orderNumber,
        details: `Created shipment with AWB ${srResult.awbCode} on courier ${srResult.courierName}`,
      });
    }

    return {
      shipment: shipment.toJSON(),
      order: order.toJSON(),
    };
  }

  /**
   * Book the courier for an order without waiting for an admin click. Only runs against the live Shiprocket
   * account (never the mock) and can be switched off with AUTO_CREATE_SHIPMENTS=false. It never throws:
   * a failure is written on the order so staff can dispatch it by hand.
   */
  async autoCreateForOrder(orderNumber) {
    if (shiprocket.isMock || String(config.AUTO_CREATE_SHIPMENTS).toLowerCase() === "false") return null;
    try {
      return await this.createShipmentForOrder(orderNumber);
    } catch (err) {
      logger.warn({ orderNumber, err: err.message }, "Automatic shipment creation did not complete");
      await Order.updateOne(
        { orderNumber },
        {
          $push: {
            timeline: {
              status: "Automatic dispatch needs attention",
              time: new Date(),
              note: `${err.message} Dispatch this order manually from the admin panel.`,
              completed: false,
            },
          },
        }
      ).catch(() => {});
      return null;
    }
  }

  /**
   * Handle a Shiprocket tracking webhook: verified by token, de-duplicated, applied forward-only
   * (a late "in transit" can never move a delivered order backwards) and retried safely if it failed before.
   */
  async handleShiprocketWebhook(req) {
    if (!shiprocket.verifyWebhook(req)) {
      throw ApiError.unauthorized("Unauthorized Shiprocket webhook token");
    }

    const payload = req.body || {};
    const awb = payload.awb || payload.awb_code;
    const rawStatus = String(payload.current_status || payload.status || "").trim();
    const currentStatus = rawStatus.toUpperCase().replace(/[\s-]+/g, "_");
    const payloadHash = sha256(payload);
    const eventTime = parseShiprocketTime(payload.current_timestamp || payload.scans?.[0]?.date);
    const eventId = `sr_${awb}_${currentStatus}_${payload.current_timestamp || payloadHash.slice(0, 16)}`;

    const existing = await WebhookEvent.findOne({
      provider: "shiprocket",
      $or: [{ eventId }, { payloadHash }],
    });
    if (existing && existing.status === "processed") {
      return { status: "duplicate" };
    }
    if (existing && existing.status === "processing" && Date.now() - new Date(existing.updatedAt).getTime() < 60 * 1000) {
      return { status: "duplicate" };
    }

    let webhookRecord = existing;
    if (webhookRecord) {
      webhookRecord.status = "processing";
      webhookRecord.error = null;
      await webhookRecord.save();
    } else {
      try {
        webhookRecord = await WebhookEvent.create({
          provider: "shiprocket",
          eventId,
          eventType: currentStatus,
          payloadHash,
          rawPayload: payload,
          status: "processing",
        });
      } catch (err) {
        if (err.code === 11000) return { status: "duplicate" };
        throw err;
      }
    }

    try {
      const shipment = await Shipment.findOne({ awbCode: awb });
      if (!shipment) {
        logger.warn({ awb }, "Received Shiprocket webhook for unknown AWB");
        webhookRecord.status = "failed";
        webhookRecord.error = "Shipment not found";
        await webhookRecord.save();
        return { status: "ignored" };
      }

      const activity = payload.activity || payload.scans?.[0]?.activity || rawStatus || currentStatus;
      const location = payload.location || payload.scans?.[0]?.location || "";

      shipment.trackingEvents.push({ status: currentStatus, activity, location, time: eventTime });
      // Keep the newest courier status; an older event arriving late does not overwrite it
      const newest = shipment.statusUpdatedAt && eventTime < shipment.statusUpdatedAt;
      if (!newest) {
        shipment.status = currentStatus;
        shipment.statusUpdatedAt = eventTime;
      }
      await shipment.save();

      const order = await Order.findById(shipment.orderId);
      if (order) {
        const wasDelivered = order.status === ORDER_STATUS.DELIVERED;
        applyShipmentStatusToOrder(order, shipment, currentStatus, activity);
        // Delivery turns reserved stock into a sale (the admin status change does the same)
        if (!wasDelivered && order.status === ORDER_STATUS.DELIVERED && order.stockState === "reserved") {
          const lines = (order.items || [])
            .filter((i) => i.variantId)
            .map((i) => ({ variantId: i.variantId, productId: i.productId, sku: i.sku, quantity: i.quantity }));
          await inventoryService.commitSoldStock(lines, order.orderNumber, "shiprocket_delivered");
          order.stockState = "committed";
        }
        await order.save();
      }

      webhookRecord.status = "processed";
      webhookRecord.processedAt = new Date();
      await webhookRecord.save();

      return { status: "processed", awb };
    } catch (err) {
      webhookRecord.status = "failed";
      webhookRecord.error = err.message;
      await webhookRecord.save();
      throw err;
    }
  }

  /**
   * Advance shipment stages for development simulation and manual testing
   */
  async advanceShipmentStatus(orderNumber, nextStage, customNote = "", staffUser = null) {
    // This fabricates courier progress (and a fake AWB when none exists); live shipments move by the courier's own updates
    if (config.NODE_ENV === "production" && process.env.ALLOW_SHIPMENT_SIMULATION !== "true") {
      throw ApiError.forbidden("Shipment progress is driven by the courier in production. The simulator is disabled.");
    }
    const isObjectId = mongoose.Types.ObjectId.isValid(orderNumber);
    const order = await Order.findOne({
      $or: [
        { orderNumber },
        ...(isObjectId ? [{ _id: orderNumber }] : []),
      ],
    });
    if (!order) throw ApiError.notFound("Order not found.");

    let shipment = await Shipment.findOne({ orderNumber: order.orderNumber });
    if (!shipment) {
      const awbCode = order.trackingNumber || `AWB${Date.now()}`;
      const courierName = order.carrier || "Bluedart Air";
      shipment = await Shipment.create({
        orderId: order._id,
        orderNumber: order.orderNumber,
        shiprocketOrderId: `sr_ord_${Date.now()}`,
        shipmentId: `sr_ship_${Date.now()}`,
        awbCode,
        courierName,
        trackingUrl: order.trackingUrl || `https://shiprocket.co/tracking/${awbCode}`,
        labelUrl: order.shippingLabelUrl || `https://shiprocket.co/labels/${awbCode}.pdf`,
        status: "SHIPPED",
        trackingEvents: [
          {
            status: "AWB Generated",
            activity: `Assigned courier ${courierName}`,
            location: "Dispatch point",
            time: new Date(),
          },
        ],
      });
      order.trackingNumber = awbCode;
      order.carrier = courierName;
      order.trackingUrl = shipment.trackingUrl;
      order.shippingLabelUrl = shipment.labelUrl;
    }

    const stage = String(nextStage || "").toLowerCase().trim();
    const now = new Date();

    const standardMilestones = [
      "Order Placed",
      "Packed at Dispensary",
      "Dispatched",
      "Out for Delivery",
      "Delivered",
    ];

    if (stage === "out_for_delivery") {
      order.status = ORDER_STATUS.OUT_FOR_DELIVERY;
      order.fulfilmentStatus = FULFILMENT_STATUS.FULFILLED;
      shipment.status = "OUT_FOR_DELIVERY";
      shipment.trackingEvents.push({
        status: "Out for Delivery",
        activity: customNote || "Package is out for delivery with local courier executive",
        location: order.shippingAddress?.city || "Destination Hub",
        time: now,
      });

      order.timeline = standardMilestones.map((mName, idx) => {
        const match = (order.timeline || []).find((e) => e.status.toLowerCase() === mName.toLowerCase());
        const isCompleted = idx <= 3;
        return {
          status: mName,
          time: isCompleted ? (match?.time || now) : null,
          note: idx === 3 ? (customNote || "Out for delivery with courier agent") : (match?.note || ""),
          completed: isCompleted,
        };
      });
    } else if (stage === "delivered") {
      order.status = ORDER_STATUS.DELIVERED;
      order.fulfilmentStatus = FULFILMENT_STATUS.FULFILLED;
      shipment.status = "DELIVERED";
      shipment.trackingEvents.push({
        status: "Delivered",
        activity: customNote || "Package delivered to customer",
        location: order.shippingAddress?.city || "Destination Address",
        time: now,
      });

      const isCod = String(order.paymentMethod || "").toLowerCase().includes("cod") || String(order.paymentMethod || "").toLowerCase().includes("cash");
      if (isCod) {
        order.paymentStatus = "paid";
      }

      order.timeline = standardMilestones.map((mName, idx) => {
        const match = (order.timeline || []).find((e) => e.status.toLowerCase() === mName.toLowerCase());
        return {
          status: mName,
          time: match?.time || now,
          note: idx === 4 ? (customNote || "Package delivered successfully") : (match?.note || ""),
          completed: true,
        };
      });
    } else if (stage === "dispatched" || stage === "shipped") {
      order.status = ORDER_STATUS.DISPATCHED;
      order.fulfilmentStatus = FULFILMENT_STATUS.FULFILLED;
      shipment.status = "SHIPPED";
      shipment.trackingEvents.push({
        status: "Dispatched",
        activity: customNote || `Package dispatched via ${shipment.courierName}`,
        location: "Dispatch hub",
        time: now,
      });

      order.timeline = standardMilestones.map((mName, idx) => {
        const match = (order.timeline || []).find((e) => e.status.toLowerCase() === mName.toLowerCase());
        const isCompleted = idx <= 2;
        return {
          status: mName,
          time: isCompleted ? (match?.time || now) : null,
          note: idx === 2 ? (customNote || `Shipped via ${shipment.courierName}. AWB: ${shipment.awbCode}`) : (match?.note || ""),
          completed: isCompleted,
        };
      });
    }

    await shipment.save();
    await order.save();

    if (staffUser) {
      await logAudit({
        actorId: staffUser._id,
        actorName: staffUser.name || "Staff",
        actorRole: staffUser.roles?.[0]?.name || "Staff",
        action: "shipments.advance",
        module: "Logistics",
        targetId: order.orderNumber,
        details: `Simulated courier progression to ${stage}`,
      });
    }

    return {
      order: order.toJSON(),
      shipment: shipment.toJSON(),
    };
  }

  /**
   * Update carrier name, tracking number, or tracking URL
   */
  async updateCustomTracking(orderNumber, { carrier, trackingNumber, trackingUrl }, staffUser = null) {
    const isObjectId = mongoose.Types.ObjectId.isValid(orderNumber);
    const order = await Order.findOne({
      $or: [
        { orderNumber },
        ...(isObjectId ? [{ _id: orderNumber }] : []),
      ],
    });
    if (!order) throw ApiError.notFound("Order not found.");

    if (carrier !== undefined) order.carrier = String(carrier).trim();
    if (trackingNumber !== undefined) order.trackingNumber = String(trackingNumber).trim();
    if (trackingUrl !== undefined) order.trackingUrl = String(trackingUrl).trim();

    let shipment = await Shipment.findOne({ orderNumber: order.orderNumber });
    if (shipment) {
      if (carrier !== undefined) shipment.courierName = order.carrier;
      if (trackingNumber !== undefined) shipment.awbCode = order.trackingNumber;
      if (trackingUrl !== undefined) shipment.trackingUrl = order.trackingUrl;
      await shipment.save();
    }

    await order.save();

    if (staffUser) {
      await logAudit({
        actorId: staffUser._id,
        actorName: staffUser.name || "Staff",
        actorRole: staffUser.roles?.[0]?.name || "Staff",
        action: "orders.tracking_updated",
        module: "Logistics",
        targetId: order.orderNumber,
        details: `Updated courier to "${order.carrier}", AWB to "${order.trackingNumber}"`,
      });
    }

    return order.toJSON();
  }

  /**
   * Get shipment by orderNumber
   */
  async getShipmentForOrder(orderNumber) {
    const isObjectId = mongoose.Types.ObjectId.isValid(orderNumber);
    let orderNum = orderNumber;
    if (isObjectId) {
      const order = await Order.findById(orderNumber).select("orderNumber").lean();
      if (order) orderNum = order.orderNumber;
    }
    const shipment = await Shipment.findOne({ orderNumber: orderNum });
    return shipment ? shipment.toJSON() : null;
  }

  /**
   * Sync and fetch live courier tracking from Shiprocket API
   */
  async getLiveTracking(orderNumber) {
    const isObjectId = mongoose.Types.ObjectId.isValid(orderNumber);
    const order = await Order.findOne({
      $or: [
        { orderNumber },
        ...(isObjectId ? [{ _id: orderNumber }] : []),
      ],
    });
    if (!order) throw ApiError.notFound("Order not found.");

    const shipment = await Shipment.findOne({ orderNumber: order.orderNumber });
    if (!shipment || !shipment.awbCode) {
      return {
        order: order.toJSON(),
        shipment: shipment ? shipment.toJSON() : null,
        liveTracking: null,
      };
    }

    const liveData = await shiprocket.trackShipment(shipment.awbCode);
    if (liveData?.shipment_track_activities && Array.isArray(liveData.shipment_track_activities)) {
      const existingTimestamps = new Set(
        (shipment.trackingEvents || []).map((e) => new Date(e.time).getTime())
      );

      for (const act of liveData.shipment_track_activities) {
        const actTime = new Date(act.date || act.time || Date.now()).getTime();
        if (!existingTimestamps.has(actTime)) {
          shipment.trackingEvents.push({
            status: act.status || act.activity || "In Transit",
            activity: act.activity || act.status,
            location: act.location || "",
            time: new Date(actTime),
          });
          existingTimestamps.add(actTime);
        }
      }
      await shipment.save();
    }

    return {
      order: order.toJSON(),
      shipment: shipment.toJSON(),
      liveTracking: liveData,
    };
  }
}

export const shipmentService = new ShipmentService();

