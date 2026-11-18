import mongoose from "mongoose";
import { Order } from "../models/Order.js";
import { OrderCancellation } from "../models/OrderCancellation.js";
import { Refund } from "../models/Refund.js";
import { Shipment } from "../models/Shipment.js";
import { cashfree } from "../integrations/cashfree/cashfree.adapter.js";
import { shiprocket } from "../integrations/shiprocket/shiprocket.adapter.js";
import { inventoryService } from "./inventory.service.js";
import { walletService } from "./wallet.service.js";
import { settingsService } from "./settings.service.js";
import { logAudit } from "./audit.service.js";
import { ORDER_STATUS } from "../constants/orderStatus.js";
import { PAYMENT_STATUS } from "../constants/paymentStatus.js";
import { PAYMENT_METHODS, normalizePaymentMethod } from "../constants/paymentMethods.js";
import {
  CANCELLATION_STATUS,
  CANCELLATION_TYPES,
  REFUND_STATUS,
} from "../constants/cancellationReasons.js";
import { INVENTORY_REASONS } from "../constants/inventoryReasons.js";
import { ApiError } from "../utils/apiError.js";
import { logger } from "../config/logger.js";
import { toRupees } from "../utils/currency.js";

// Courier statuses where physical custody has been handed over
const COURIER_HANDOVER_STATUSES = new Set([
  "PICKED_UP",
  "PICKUP_DONE",
  "IN_TRANSIT",
  "DISPATCHED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "REACHED_AT_DESTINATION_HUB",
  "REACHED_DESTINATION_HUB",
  "RTO_INITIATED",
  "RTO_DELIVERED",
]);

export class CancellationService {
  /**
   * Check if an order is eligible for cancellation according to current policy,
   * delivery status, courier handover and ownership.
   */
  async checkEligibility(orderOrNumber, user = null, isStaff = false) {
    const order =
      typeof orderOrNumber === "string"
        ? await Order.findOne({
            $or: [
              { orderNumber: orderOrNumber },
              ...(mongoose.Types.ObjectId.isValid(orderOrNumber) ? [{ _id: orderOrNumber }] : []),
            ],
          })
        : orderOrNumber;

    if (!order) {
      return { eligible: false, reason: "Order not found." };
    }

    // Ownership check (for non-staff customers)
    if (!isStaff && user) {
      const orderUserId = order.userId ? order.userId.toString() : null;
      const currentUserId = user._id ? user._id.toString() : null;
      if (orderUserId && currentUserId && orderUserId !== currentUserId) {
        return { eligible: false, reason: "You do not have permission to cancel this order." };
      }
    }

    // Delivered orders CANNOT be cancelled; must use return workflow
    if (
      [
        ORDER_STATUS.DELIVERED,
        ORDER_STATUS.RETURN_REQUESTED,
        ORDER_STATUS.RETURNED,
      ].includes(order.status)
    ) {
      return {
        eligible: false,
        reason: "This order has already been delivered. Please submit a Return Request if you wish to return items.",
        requiresReturnWorkflow: true,
      };
    }

    // Already fully cancelled
    if (order.status === ORDER_STATUS.CANCELLED) {
      return { eligible: false, reason: "This order is already cancelled." };
    }

    // Check store settings policy
    const settings = await settingsService.get();
    const policy = settings.cancellationPolicy || {
      enabled: true,
      allowFullCancellation: true,
      allowPartialCancellation: true,
      cancellationCutoff: "before_shipped",
      requireAdminApproval: false,
      automaticOnlineRefund: true,
      allowCancellationForCOD: true,
    };

    if (!isStaff && !policy.enabled) {
      return { eligible: false, reason: "Order cancellation is currently disabled by store policy." };
    }

    const isCod = normalizePaymentMethod(order.paymentMethod) === PAYMENT_METHODS.COD;
    if (!isStaff && isCod && !policy.allowCancellationForCOD) {
      return { eligible: false, reason: "Cancellation for Cash on Delivery orders is disabled." };
    }

    // Check live / recorded courier handover
    const shipment = await Shipment.findOne({ orderNumber: order.orderNumber });
    if (shipment) {
      const shipStatus = String(shipment.status || "").toUpperCase();
      if (COURIER_HANDOVER_STATUSES.has(shipStatus)) {
        return {
          eligible: false,
          reason: "Cannot cancel order because it has already been handed over to the courier. You may request a return after delivery.",
          handoverOccurred: true,
        };
      }
    }

    // Check policy cutoff
    const cutoff = policy.cancellationCutoff || "before_shipped";
    if (cutoff === "before_packed" && order.status === ORDER_STATUS.PACKED) {
      return { eligible: false, reason: "Cannot cancel because the order has already been packed." };
    }
    if (cutoff === "before_pickup" && shipment?.pickupStatus === "requested") {
      return { eligible: false, reason: "Cannot cancel because courier pickup has already been requested." };
    }
    if (
      cutoff === "before_shipped" &&
      [ORDER_STATUS.SHIPPED, ORDER_STATUS.DISPATCHED, ORDER_STATUS.OUT_FOR_DELIVERY].includes(order.status)
    ) {
      return { eligible: false, reason: "Cannot cancel because the order has already shipped." };
    }

    // Find cancellable items (items that still have active, uncancelled quantity)
    const cancellableItems = (order.items || [])
      .map((it) => {
        const remaining = Math.max(0, (it.quantity || 0) - (it.cancelledQuantity || 0));
        return {
          orderItemId: it._id ? it._id.toString() : "",
          productId: it.productId,
          variantId: it.variantId,
          sku: it.sku,
          name: it.name,
          size: it.size,
          image: it.image,
          unitPricePaise: it.unitPricePaise,
          unitPrice: toRupees(it.unitPricePaise),
          totalQuantity: it.quantity,
          cancelledQuantity: it.cancelledQuantity || 0,
          remainingQuantity: remaining,
          isCancelled: Boolean(it.isCancelled) || remaining === 0,
        };
      })
      .filter((it) => it.remainingQuantity > 0);

    if (cancellableItems.length === 0) {
      return { eligible: false, reason: "All items in this order are already cancelled." };
    }

    return {
      eligible: true,
      order,
      shipment,
      policy,
      allowFullCancellation: policy.allowFullCancellation,
      allowPartialCancellation: policy.allowPartialCancellation && cancellableItems.length > 0,
      cancellableItems,
    };
  }

  /**
   * Mathematically compute proportional discount and refundable amount for items being cancelled
   */
  calculatePartialRefund(order, itemsToCancel) {
    const originalSubtotal = order.pricing?.subtotalPaise || 0;
    const originalCouponDiscount = order.pricing?.couponDiscountPaise || 0;
    const originalReferralDiscount = order.pricing?.referralDiscountPaise || 0;
    const originalStoreCredit = order.pricing?.storeCreditPaise || 0;
    const capturedTotal = order.pricing?.totalPaise || 0;
    const alreadyRefunded = order.refundedPaise || 0;
    const remainingRefundable = Math.max(0, capturedTotal - alreadyRefunded);

    const isOnline = normalizePaymentMethod(order.paymentMethod) === PAYMENT_METHODS.ONLINE;
    const isPaid = isOnline && (order.paymentStatus === PAYMENT_STATUS.PAID || order.paymentStatus === "paid");

    let grossCancelledPaise = 0;
    const itemBreakdown = [];

    // Orders placed with the pricing snapshot know each line's own share of the discounts and its tax, so a partial
    // refund is exact. Older orders keep the earlier proportional estimate.
    const exclusiveGst = order.pricing?.gstMode === "exclusive";
    const hasSnapshot = Number(order.pricing?.sellingSubtotalPaise) > 0 && (order.items || []).every((it) => Number(it.mrpUnitPaise) > 0);
    const goodsPayablePaise = (order.items || []).reduce(
      (sum, it) => sum + (it.lineTotalPaise || 0) - (it.discountPaise || 0) + (exclusiveGst ? it.taxPaise || 0 : 0),
      0
    );

    for (const reqItem of itemsToCancel) {
      const orderItem = (order.items || []).find(
        (it) =>
          (it._id && it._id.toString() === reqItem.orderItemId) ||
          (it.variantId && reqItem.variantId && it.variantId.toString() === reqItem.variantId.toString()) ||
          (it.sku && reqItem.sku && it.sku === reqItem.sku)
      );

      if (!orderItem) {
        throw ApiError.badRequest(`Item ${reqItem.orderItemId || reqItem.sku || "unknown"} not found in this order.`);
      }

      const remainingQty = Math.max(0, (orderItem.quantity || 0) - (orderItem.cancelledQuantity || 0));
      const cancelQty = Number(reqItem.quantity || reqItem.requestedQuantity || 0);

      if (cancelQty <= 0 || cancelQty > remainingQty) {
        throw ApiError.badRequest(
          `Invalid cancellation quantity (${cancelQty}) for ${orderItem.name}. Remaining active quantity is ${remainingQty}.`
        );
      }

      const itemGross = orderItem.unitPricePaise * cancelQty;
      grossCancelledPaise += itemGross;

      let allocatedDiscount;
      let allocatedStoreCredit;
      let netRefund;
      if (hasSnapshot) {
        // This line's discount share and (if GST is added on top of prices) its tax, for the units being cancelled
        allocatedDiscount = Math.round(((orderItem.discountPaise || 0) * cancelQty) / orderItem.quantity);
        const addedTax = exclusiveGst ? Math.round(((orderItem.taxPaise || 0) * cancelQty) / orderItem.quantity) : 0;
        const itemPayable = itemGross - allocatedDiscount + addedTax;
        allocatedStoreCredit = goodsPayablePaise > 0 ? Math.round((originalStoreCredit * itemPayable) / goodsPayablePaise) : 0;
        netRefund = Math.max(0, itemPayable - allocatedStoreCredit);
      } else {
        // Proportional discount factor for this item line (orders placed before the pricing snapshot)
        const fraction = originalSubtotal > 0 ? itemGross / originalSubtotal : 0;
        allocatedDiscount = Math.round(fraction * (originalCouponDiscount + originalReferralDiscount));
        allocatedStoreCredit = Math.round(fraction * originalStoreCredit);
        netRefund = Math.max(0, itemGross - allocatedDiscount - allocatedStoreCredit);
      }

      itemBreakdown.push({
        orderItemId: orderItem._id ? orderItem._id.toString() : "",
        productId: orderItem.productId,
        variantId: orderItem.variantId,
        sku: orderItem.sku,
        name: orderItem.name,
        size: orderItem.size,
        image: orderItem.image,
        requestedQuantity: cancelQty,
        unitPricePaise: orderItem.unitPricePaise,
        allocatedDiscountPaise: allocatedDiscount,
        allocatedStoreCreditPaise: allocatedStoreCredit,
        refundAmountPaise: isPaid ? netRefund : 0,
      });
    }

    // Check if this results in full cancellation of all remaining order items
    const totalRemainingBefore = (order.items || []).reduce(
      (sum, it) => sum + Math.max(0, (it.quantity || 0) - (it.cancelledQuantity || 0)),
      0
    );
    const totalCancellingNow = itemsToCancel.reduce(
      (sum, it) => sum + Number(it.quantity || it.requestedQuantity || 0),
      0
    );
    const isFullCancellation = totalCancellingNow >= totalRemainingBefore;

    let totalRefundPaise = 0;
    let storeCreditToRestorePaise = 0;

    if (isFullCancellation) {
      // Full order: refund remaining refundable cash balance, including shipping if never shipped
      totalRefundPaise = isPaid ? remainingRefundable : 0;
      storeCreditToRestorePaise = Math.max(0, originalStoreCredit - (order.storeCreditRestored ? originalStoreCredit : 0));
    } else {
      // Partial: sum up item net refunds, capped at remaining refundable balance
      const rawSum = itemBreakdown.reduce((sum, it) => sum + it.refundAmountPaise, 0);
      totalRefundPaise = Math.min(rawSum, remainingRefundable);
      const rawCreditSum = itemBreakdown.reduce((sum, it) => sum + it.allocatedStoreCreditPaise, 0);
      storeCreditToRestorePaise = Math.min(rawCreditSum, originalStoreCredit);
    }

    return {
      isFullCancellation,
      grossCancelledPaise,
      totalRefundPaise: isPaid ? totalRefundPaise : 0,
      storeCreditToRestorePaise,
      remainingRefundablePaise: remainingRefundable,
      itemBreakdown,
      isPaid,
    };
  }

  /**
   * Submit a full or partial cancellation request
   */
  async requestCancellation(orderNumber, payload = {}, user = null, isStaff = false) {
    const { cancellationType = CANCELLATION_TYPES.FULL, reason = "", customerNote = "", items = [] } = payload;

    if (!reason || !reason.trim()) {
      throw ApiError.badRequest("Please provide a valid cancellation reason.");
    }

    const check = await this.checkEligibility(orderNumber, user, isStaff);
    if (!check.eligible) {
      throw ApiError.badRequest(check.reason);
    }

    const order = check.order;
    const policy = check.policy;

    // Validate partial vs full
    if (cancellationType === CANCELLATION_TYPES.PARTIAL && !policy.allowPartialCancellation && !isStaff) {
      throw ApiError.badRequest("Partial product cancellation is not allowed by store policy.");
    }

    let itemsToProcess = [];
    if (cancellationType === CANCELLATION_TYPES.FULL) {
      itemsToProcess = (order.items || [])
        .map((it) => ({
          orderItemId: it._id ? it._id.toString() : "",
          variantId: it.variantId,
          sku: it.sku,
          quantity: Math.max(0, (it.quantity || 0) - (it.cancelledQuantity || 0)),
        }))
        .filter((it) => it.quantity > 0);
    } else {
      if (!Array.isArray(items) || items.length === 0) {
        throw ApiError.badRequest("Please select at least one item to cancel.");
      }
      itemsToProcess = items;
    }

    const calc = this.calculatePartialRefund(order, itemsToProcess);
    const resolvedType = calc.isFullCancellation ? CANCELLATION_TYPES.FULL : CANCELLATION_TYPES.PARTIAL;

    const referenceNumber = `CAN-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`;

    // Create Cancellation Request Record
    const cancellation = await OrderCancellation.create({
      referenceNumber,
      orderId: order._id,
      orderNumber: order.orderNumber,
      userId: user?._id || order.userId || null,
      customer: {
        name: order.customer?.name || "Customer",
        email: order.customer?.email || "",
        phone: order.customer?.phone || "",
      },
      cancellationType: resolvedType,
      reason: reason.trim(),
      customerNote: (customerNote || "").trim(),
      status: CANCELLATION_STATUS.REQUESTED,
      items: calc.itemBreakdown,
      totalRefundPaise: calc.totalRefundPaise,
      storeCreditToRestorePaise: calc.storeCreditToRestorePaise,
      paymentMethod: order.paymentMethod,
      isPaid: calc.isPaid,
      timeline: [
        {
          status: "Cancellation Requested",
          note: reason,
          by: isStaff ? staffUserLabel(user) : "customer",
          at: new Date(),
        },
      ],
    });

    // Check if auto-approval applies
    const shouldAutoApprove = isStaff || !policy.requireAdminApproval;

    if (shouldAutoApprove) {
      cancellation.status = CANCELLATION_STATUS.APPROVED;
      cancellation.reviewedAt = new Date();
      cancellation.reviewedBy = isStaff ? user?._id : null;
      cancellation.timeline.push({
        status: "Cancellation Approved",
        note: isStaff ? "Approved by staff" : "Automatically approved by policy",
        by: isStaff ? staffUserLabel(user) : "system",
        at: new Date(),
      });
      await cancellation.save();

      return this.executeApprovedCancellation(cancellation, order, isStaff ? user : null);
    }

    // Awaiting admin review
    order.cancellationStatus = "requested";
    order.timeline.push({
      status: "Cancellation Requested",
      time: new Date(),
      note: `Cancellation request (${referenceNumber}) submitted. Awaiting approval.`,
      completed: false,
    });
    await order.save();

    return {
      cancellation: cancellation.toJSON(),
      status: "requested",
      message: "Your cancellation request has been received and is awaiting approval.",
    };
  }

  /**
   * Execute an approved cancellation:
   * 1. Courier cancellation (if pre-handover shipment exists)
   * 2. Inventory restoration (exact cancelled quantities only)
   * 3. Order status & line-item updates
   * 4. Cashfree automatic refund (for online paid orders)
   * 5. Store credit restoration
   */
  async executeApprovedCancellation(cancellation, order, staffUser = null) {
    cancellation.status = CANCELLATION_STATUS.PROCESSING;
    await cancellation.save();

    const isFull = cancellation.cancellationType === CANCELLATION_TYPES.FULL;

    // 1. Courier Cancellation (for full cancellations before courier handover)
    if (isFull) {
      try {
        await this.cancelCourierShipmentSafely(order);
        cancellation.shipmentCancelled = true;
      } catch (err) {
        logger.error(
          { orderNumber: order.orderNumber, err: err.message },
          "Shiprocket shipment cancellation encountered an error during order cancellation"
        );
        cancellation.failureReason = `Shiprocket cancellation note: ${err.message}`;
        // If shipment cancellation fails, keep order state safe and do not blindly refund
        cancellation.status = CANCELLATION_STATUS.FAILED;
        await cancellation.save();
        throw ApiError.conflict(
          `Shipment cancellation at courier could not be completed (${err.message}). Please cancel in Shiprocket then retry.`
        );
      }
    }

    // 2. Inventory Restoration
    const stockLinesToRestore = [];
    for (const item of cancellation.items) {
      if (item.variantId && item.requestedQuantity > 0) {
        stockLinesToRestore.push({
          variantId: item.variantId,
          productId: item.productId,
          sku: item.sku,
          quantity: item.requestedQuantity,
        });
      }
    }

    if (stockLinesToRestore.length > 0) {
      if (order.stockState === "reserved") {
        await inventoryService.releaseReservedStock(
          stockLinesToRestore,
          order.orderNumber,
          INVENTORY_REASONS.ORDER_CANCELLATION
        );
      } else if (order.stockState === "committed") {
        await inventoryService.restockReturned(
          stockLinesToRestore,
          order.orderNumber,
          staffUser ? staffUser._id : "cancellation_engine"
        );
      }
    }

    // 3. Update Order Line Items
    for (const item of cancellation.items) {
      const orderItem = (order.items || []).find(
        (it) => it._id && it._id.toString() === item.orderItemId
      );
      if (orderItem) {
        orderItem.cancelledQuantity = (orderItem.cancelledQuantity || 0) + item.requestedQuantity;
        if (orderItem.cancelledQuantity >= orderItem.quantity) {
          orderItem.isCancelled = true;
          orderItem.cancelledAt = new Date();
        }
      }
    }

    // 4. Update Order Status
    const beforeStatus = order.status;
    if (isFull) {
      order.status = ORDER_STATUS.CANCELLED;
      order.cancellationStatus = "cancelled";
      order.stockState = "released";
      order.cancelledAt = new Date();
      order.cancellationReason = cancellation.reason;
    } else {
      order.status = ORDER_STATUS.PARTIALLY_CANCELLED;
      order.cancellationStatus = "partially_cancelled";
    }

    order.timeline.push({
      status: isFull ? "Order Cancelled" : "Items Partially Cancelled",
      time: new Date(),
      note: cancellation.reason,
      completed: true,
    });

    // 5. Restore Store Credit if applicable
    if (cancellation.storeCreditToRestorePaise > 0 && order.userId) {
      await walletService.credit(order.userId, cancellation.storeCreditToRestorePaise, {
        source: "cancellation_restore",
        reference: order.orderNumber,
        note: `Restored store credit from cancelled items in order ${order.orderNumber}`,
        key: `cancel_credit:${cancellation.referenceNumber}`,
      });
      order.timeline.push({
        status: "Store Credit Restored",
        time: new Date(),
        note: `₹${cancellation.storeCreditToRestorePaise / 100} returned to your store wallet balance.`,
        completed: true,
      });
    }

    // 6. Cashfree Automatic Refund Workflow
    let refundDoc = null;
    if (cancellation.isPaid && cancellation.totalRefundPaise > 0) {
      refundDoc = await this.processCashfreeRefund(order, cancellation, staffUser);
      if (refundDoc) {
        cancellation.refundId = refundDoc._id;
        cancellation.internalRefundReference = refundDoc.refundId;
      }
    } else {
      order.refundStatus = REFUND_STATUS.NOT_APPLICABLE;
    }

    await order.save();

    cancellation.status = CANCELLATION_STATUS.COMPLETED;
    cancellation.completedAt = new Date();
    cancellation.timeline.push({
      status: "Cancellation Completed",
      note: isFull ? "Full order cancelled and processed." : "Selected items cancelled and processed.",
      by: "system",
      at: new Date(),
    });
    await cancellation.save();

    if (staffUser) {
      await logAudit({
        actorId: staffUser._id,
        actorName: staffUser.name,
        actorRole: staffUser.roles?.[0]?.name || "Staff",
        action: isFull ? "orders.cancel" : "orders.cancel_items",
        module: "Sales",
        targetId: order.orderNumber,
        details: `Cancellation ${cancellation.referenceNumber} processed (${cancellation.cancellationType}). Refund: ₹${cancellation.totalRefundPaise / 100}`,
        before: { status: beforeStatus },
        after: { status: order.status },
      });
    }

    return {
      success: true,
      cancellation: cancellation.toJSON(),
      order: order.toJSON(),
      refund: refundDoc ? refundDoc.toJSON() : null,
    };
  }

  /**
   * Call Cashfree Refund API and record Refund document
   */
  async processCashfreeRefund(order, cancellation, staffUser = null) {
    const refundablePaise = cancellation.totalRefundPaise;
    if (refundablePaise <= 0) return null;

    const refundId = `RF-CAN-${order.orderNumber}-${cancellation.referenceNumber.slice(-8)}`;

    // Prevent duplicate refund
    let refund = await Refund.findOne({ orderNumber: order.orderNumber, refundId });
    if (refund) return refund;

    refund = await Refund.create({
      orderId: order._id,
      orderNumber: order.orderNumber,
      cancellationId: cancellation._id,
      amountPaise: refundablePaise,
      reason: cancellation.reason || "Order cancellation",
      provider: "cashfree",
      method: "original",
      refundId,
      status: "pending",
      staffActorId: staffUser?._id || null,
    });

    order.refundStatus = REFUND_STATUS.INITIATED;

    try {
      const result = await cashfree.createRefund({
        orderNumber: order.orderNumber,
        refundId,
        amountPaise: refundablePaise,
        note: `Cancellation: ${cancellation.reason}`.slice(0, 100),
      });

      const cfStatus = String(result.status || "").toUpperCase();
      if (!["SUCCESS", "PENDING", "ONHOLD"].includes(cfStatus)) {
        throw new Error(`Cashfree returned refund status "${cfStatus || "UNKNOWN"}".`);
      }

      refund.providerRefundId = result.cfRefundId || result.refundId || refundId;
      refund.status = cfStatus === "SUCCESS" ? "succeeded" : "pending";
      await refund.save();

      order.refundedPaise = (order.refundedPaise || 0) + refundablePaise;
      const isFull = cancellation.cancellationType === CANCELLATION_TYPES.FULL;
      if (cfStatus === "SUCCESS") {
        order.paymentStatus = isFull ? PAYMENT_STATUS.REFUNDED : PAYMENT_STATUS.PARTIALLY_REFUNDED;
        order.refundStatus = REFUND_STATUS.COMPLETED;
      } else {
        order.refundStatus = REFUND_STATUS.PROCESSING;
      }

      order.timeline.push({
        status: cfStatus === "SUCCESS" ? "Refund issued" : "Refund processing",
        time: new Date(),
        note: `₹${refundablePaise / 100} sent back to your original payment method${cfStatus === "SUCCESS" ? "" : " (processing by bank)"}. Reference: ${refundId}`,
        completed: true,
      });
      await order.save();
    } catch (err) {
      refund.status = "failed";
      refund.errorMessage = err.message;
      await refund.save();

      order.refundStatus = REFUND_STATUS.FAILED;
      order.timeline.push({
        status: "Refund failed",
        time: new Date(),
        note: `The automatic refund of ₹${refundablePaise / 100} could not be initiated (${err.message}). Our team will resolve this manually.`,
        completed: false,
      });
      await order.save();
      logger.error({ orderNumber: order.orderNumber, err: err.message }, "Cashfree automatic refund failed");
    }

    return refund;
  }

  /**
   * Safely cancel courier shipment before handover
   */
  async cancelCourierShipmentSafely(order) {
    const shipment = await Shipment.findOne({ orderNumber: order.orderNumber });
    if (!shipment) return;
    if (["CANCELLED", "CANCELED", "DELIVERED"].includes(String(shipment.status).toUpperCase())) return;

    // Check handover
    if (COURIER_HANDOVER_STATUSES.has(String(shipment.status).toUpperCase())) {
      throw new Error("Shipment has already been handed over to courier partner");
    }

    // Cancel AWB if assigned
    if (shipment.awbCode) {
      let result;
      try {
        result = await shiprocket.cancelShipment(shipment.awbCode);
      } catch (err) {
        throw new Error(`Courier shipment cancellation failed: ${err.message}`);
      }
      if (!result?.success) {
        throw new Error(result?.message || "Courier partner rejected shipment cancellation");
      }
    }

    // Cancel Shiprocket Order
    if (shipment.shiprocketOrderId) {
      try {
        await shiprocket.cancelOrder(shipment.shiprocketOrderId);
      } catch (err) {
        logger.warn({ orderNumber: order.orderNumber, err: err.message }, "Shiprocket cancel order notice");
      }
    }

    shipment.status = "CANCELLED";
    shipment.trackingEvents.push({
      status: "CANCELLED",
      activity: "Shipment cancelled before courier handover",
      location: "",
      time: new Date(),
    });
    await shipment.save();
  }

  /**
   * Admin approves a requested cancellation
   */
  async approveCancellation(cancellationId, staffUser) {
    const cancellation = await OrderCancellation.findById(cancellationId);
    if (!cancellation) throw ApiError.notFound("Cancellation request not found.");

    if (cancellation.status !== CANCELLATION_STATUS.REQUESTED) {
      throw ApiError.badRequest(`Cannot approve a cancellation that is already ${cancellation.status}.`);
    }

    const order = await Order.findById(cancellation.orderId);
    if (!order) throw ApiError.notFound("Associated order not found.");

    cancellation.status = CANCELLATION_STATUS.APPROVED;
    cancellation.reviewedAt = new Date();
    cancellation.reviewedBy = staffUser._id;
    cancellation.timeline.push({
      status: "Approved",
      note: "Cancellation approved by staff",
      by: staffUserLabel(staffUser),
      at: new Date(),
    });
    await cancellation.save();

    return this.executeApprovedCancellation(cancellation, order, staffUser);
  }

  /**
   * Admin rejects a requested cancellation
   */
  async rejectCancellation(cancellationId, reason = "", staffUser) {
    if (!reason || !reason.trim()) {
      throw ApiError.badRequest("Please provide a reason for rejecting the cancellation.");
    }

    const cancellation = await OrderCancellation.findById(cancellationId);
    if (!cancellation) throw ApiError.notFound("Cancellation request not found.");

    if (cancellation.status !== CANCELLATION_STATUS.REQUESTED) {
      throw ApiError.badRequest(`Cannot reject a cancellation that is already ${cancellation.status}.`);
    }

    const order = await Order.findById(cancellation.orderId);
    if (!order) throw ApiError.notFound("Associated order not found.");

    cancellation.status = CANCELLATION_STATUS.REJECTED;
    cancellation.rejectionReason = reason.trim();
    cancellation.reviewedAt = new Date();
    cancellation.reviewedBy = staffUser._id;
    cancellation.timeline.push({
      status: "Rejected",
      note: reason.trim(),
      by: staffUserLabel(staffUser),
      at: new Date(),
    });
    await cancellation.save();

    // Reset order cancellationStatus
    order.cancellationStatus = "none";
    order.timeline.push({
      status: "Cancellation Request Rejected",
      time: new Date(),
      note: `Request ${cancellation.referenceNumber} rejected: ${reason.trim()}`,
      completed: false,
    });
    await order.save();

    await logAudit({
      actorId: staffUser._id,
      actorName: staffUser.name,
      actorRole: staffUser.roles?.[0]?.name || "Staff",
      action: "cancellations.reject",
      module: "Sales",
      targetId: cancellation.referenceNumber,
      details: `Cancellation rejected for order ${order.orderNumber}. Reason: ${reason}`,
    });

    return { success: true, cancellation: cancellation.toJSON() };
  }

  /**
   * Admin retries an eligible failed refund
   */
  async retryRefund(refundIdOrDbId, staffUser) {
    const refund = await Refund.findOne({
      $or: [
        { refundId: refundIdOrDbId },
        ...(mongoose.Types.ObjectId.isValid(refundIdOrDbId) ? [{ _id: refundIdOrDbId }] : []),
      ],
    });
    if (!refund) throw ApiError.notFound("Refund record not found.");

    if (refund.status === "succeeded") {
      throw ApiError.badRequest("This refund has already succeeded.");
    }

    const order = await Order.findById(refund.orderId);
    if (!order) throw ApiError.notFound("Order not found.");

    // Check remaining refundable balance
    const refundableBalance = Math.max(0, (order.pricing?.totalPaise || 0) - (order.refundedPaise || 0));
    if (refundableBalance < refund.amountPaise) {
      throw ApiError.badRequest(
        `Refund amount (₹${refund.amountPaise / 100}) exceeds remaining balance (₹${refundableBalance / 100}).`
      );
    }

    const newRefundId = `RF-RETRY-${order.orderNumber}-${Date.now().toString().slice(-6)}`;
    refund.refundId = newRefundId;
    refund.status = "pending";
    refund.errorMessage = "";
    await refund.save();

    try {
      const result = await cashfree.createRefund({
        orderNumber: order.orderNumber,
        refundId: newRefundId,
        amountPaise: refund.amountPaise,
        note: "Retried refund",
      });

      const cfStatus = String(result.status || "").toUpperCase();
      if (!["SUCCESS", "PENDING", "ONHOLD"].includes(cfStatus)) {
        throw new Error(`Cashfree status "${cfStatus}".`);
      }

      refund.providerRefundId = result.cfRefundId || result.refundId || newRefundId;
      refund.status = cfStatus === "SUCCESS" ? "succeeded" : "pending";
      await refund.save();

      order.refundedPaise = (order.refundedPaise || 0) + refund.amountPaise;
      order.refundStatus = cfStatus === "SUCCESS" ? REFUND_STATUS.COMPLETED : REFUND_STATUS.PROCESSING;
      order.timeline.push({
        status: "Refund re-attempted",
        time: new Date(),
        note: `Refund retry initiated. Status: ${cfStatus}. Ref: ${newRefundId}`,
        completed: true,
      });
      await order.save();

      await logAudit({
        actorId: staffUser._id,
        actorName: staffUser.name,
        actorRole: staffUser.roles?.[0]?.name || "Staff",
        action: "refunds.retry",
        module: "Sales",
        targetId: refund.orderNumber,
        details: `Retried refund ${newRefundId} for ₹${refund.amountPaise / 100}. Status: ${cfStatus}`,
      });

      return { success: true, refund: refund.toJSON() };
    } catch (err) {
      refund.status = "failed";
      refund.errorMessage = err.message;
      await refund.save();
      throw ApiError.conflict(`Refund retry failed at Cashfree: ${err.message}`);
    }
  }

  /**
   * List cancellations for admin dashboard with filtering and search
   */
  async listAdminCancellations({ page = 1, limit = 20, status = "all", type = "all", paymentMethod = "all", search = "" } = {}) {
    const filter = {};
    if (status && status !== "all") filter.status = status;
    if (type && type !== "all") filter.cancellationType = type;
    if (paymentMethod && paymentMethod !== "all") filter.paymentMethod = paymentMethod;

    if (search && search.trim()) {
      const q = search.trim();
      filter.$or = [
        { orderNumber: new RegExp(q, "i") },
        { referenceNumber: new RegExp(q, "i") },
        { "customer.name": new RegExp(q, "i") },
        { "customer.phone": new RegExp(q, "i") },
        { "customer.email": new RegExp(q, "i") },
      ];
    }

    const skip = (Math.max(1, Number(page)) - 1) * Math.max(1, Number(limit));
    const [cancellations, total] = await Promise.all([
      OrderCancellation.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit))
        .populate("refundId"),
      OrderCancellation.countDocuments(filter),
    ]);

    // Counts by status for quick dashboard metrics
    const [totalRequests, pendingCount, approvedCount, rejectedCount, completedCount, failedCount] =
      await Promise.all([
        OrderCancellation.countDocuments(),
        OrderCancellation.countDocuments({ status: CANCELLATION_STATUS.REQUESTED }),
        OrderCancellation.countDocuments({ status: CANCELLATION_STATUS.APPROVED }),
        OrderCancellation.countDocuments({ status: CANCELLATION_STATUS.REJECTED }),
        OrderCancellation.countDocuments({ status: CANCELLATION_STATUS.COMPLETED }),
        OrderCancellation.countDocuments({ status: CANCELLATION_STATUS.FAILED }),
      ]);

    return {
      cancellations: cancellations.map((c) => c.toJSON()),
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        totalPages: Math.ceil(total / Number(limit)) || 1,
      },
      counts: {
        total: totalRequests,
        pending: pendingCount,
        approved: approvedCount,
        rejected: rejectedCount,
        completed: completedCount,
        failed: failedCount,
      },
    };
  }

  /**
   * List customer's cancellation requests
   */
  async listUserCancellations(userId) {
    if (!userId) return [];
    const list = await OrderCancellation.find({ userId }).sort({ createdAt: -1 });
    return list.map((c) => c.toJSON());
  }

  /**
   * Get cancellation details by ID or referenceNumber
   */
  async getCancellation(idOrRef) {
    const isObjectId = mongoose.Types.ObjectId.isValid(idOrRef);
    const cancellation = await OrderCancellation.findOne({
      $or: [{ referenceNumber: idOrRef }, ...(isObjectId ? [{ _id: idOrRef }] : [])],
    }).populate("refundId");

    if (!cancellation) throw ApiError.notFound("Cancellation request not found.");
    return cancellation.toJSON();
  }
}

const staffUserLabel = (user) => (user?.name ? `${user.name} (Staff)` : "Staff");

export const cancellationService = new CancellationService();
