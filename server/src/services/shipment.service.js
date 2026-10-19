import mongoose from "mongoose";
import { Order } from "../models/Order.js";
import { Shipment } from "../models/Shipment.js";
import { WebhookEvent } from "../models/WebhookEvent.js";
import { shiprocket } from "../integrations/shiprocket/shiprocket.adapter.js";
import { ORDER_STATUS } from "../constants/orderStatus.js";
import { FULFILMENT_STATUS } from "../constants/paymentStatus.js";
import { logAudit } from "./audit.service.js";
import { sha256 } from "../utils/crypto.js";
import { ApiError } from "../utils/apiError.js";
import { logger } from "../config/logger.js";

export class ShipmentService {
  /**
   * Pincode serviceability check
   */
  async checkServiceability({ deliveryPincode, weightGrams = 250, cod = true }) {
    if (!deliveryPincode || deliveryPincode.length !== 6 || isNaN(deliveryPincode)) {
      throw ApiError.badRequest("Please provide a valid 6-digit Indian PIN code.");
    }

    return shiprocket.checkServiceability({
      pickupPincode: "560038", // Bengaluru dispensary
      deliveryPincode,
      cod,
      weightGrams,
    });
  }

  /**
   * Create shipment for confirmed or paid order
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

    const existingShipment = await Shipment.findOne({ orderNumber });
    if (existingShipment && existingShipment.awbCode) {
      return existingShipment.toJSON();
    }

    // Call Shiprocket adapter
    const srResult = await shiprocket.createShipment({
      orderNumber: order.orderNumber,
      items: order.items,
      customer: order.customer,
      shippingAddress: order.shippingAddress,
      paymentMethod: order.paymentMethod,
      pricing: order.pricing,
      weightGrams: order.items.reduce((sum, it) => sum + (it.weightGrams || 250) * it.quantity, 0),
    });

    const shipment = await Shipment.create({
      orderId: order._id,
      orderNumber: order.orderNumber,
      shiprocketOrderId: srResult.shiprocketOrderId,
      shipmentId: srResult.shipmentId,
      awbCode: srResult.awbCode,
      courierName: srResult.courierName,
      courierId: srResult.courierId,
      trackingUrl: srResult.trackingUrl,
      labelUrl: srResult.labelUrl,
      manifestUrl: srResult.manifestUrl,
      status: "SHIPPED",
      trackingEvents: [
        {
          status: "AWB Generated",
          activity: `Assigned courier ${srResult.courierName}`,
          location: "Bengaluru Dispensary",
          time: new Date(),
        },
      ],
    });

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
   * Handle Shiprocket tracking webhook with deduplication
   */
  async handleShiprocketWebhook(req) {
    if (!shiprocket.verifyWebhook(req)) {
      throw ApiError.unauthorized("Unauthorized Shiprocket webhook token");
    }

    const payload = req.body || {};
    const awb = payload.awb || payload.awb_code;
    const currentStatus = (payload.current_status || payload.status || "").toUpperCase();
    const eventId = `sr_${awb}_${currentStatus}_${Date.now()}`;
    const payloadHash = sha256(payload);

    // Webhook deduplication
    const existing = await WebhookEvent.findOne({
      provider: "shiprocket",
      payloadHash,
    });

    if (existing && existing.status === "processed") {
      return { status: "duplicate" };
    }

    const webhookRecord = await WebhookEvent.create({
      provider: "shiprocket",
      eventId,
      eventType: currentStatus,
      payloadHash,
      rawPayload: payload,
      status: "processing",
    });

    try {
      const shipment = await Shipment.findOne({ awbCode: awb });
      if (!shipment) {
        logger.warn({ awb }, "Received Shiprocket webhook for unknown AWB");
        webhookRecord.status = "failed";
        webhookRecord.error = "Shipment not found";
        await webhookRecord.save();
        return { status: "ignored" };
      }

      shipment.status = currentStatus;
      shipment.trackingEvents.push({
        status: currentStatus,
        activity: payload.activity || payload.scans?.[0]?.activity || currentStatus,
        location: payload.location || payload.scans?.[0]?.location || "",
        time: new Date(),
      });
      await shipment.save();

      // If delivered, update order status
      if (currentStatus === "DELIVERED") {
        const order = await Order.findById(shipment.orderId);
        if (order && order.status !== ORDER_STATUS.DELIVERED) {
          order.status = ORDER_STATUS.DELIVERED;
          order.timeline.push({
            status: "Delivered",
            time: new Date(),
            note: "Delivered to customer address",
            completed: true,
          });
          await order.save();
        }
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
            location: "Bengaluru Dispensary",
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
        location: "Bengaluru Dispensary Hub",
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
}

export const shipmentService = new ShipmentService();

