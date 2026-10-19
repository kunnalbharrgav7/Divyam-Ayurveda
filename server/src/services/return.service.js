import crypto from "crypto";
import { Order } from "../models/Order.js";
import { User } from "../models/User.js";
import { Refund } from "../models/Refund.js";
import { ReturnRequest } from "../models/ReturnRequest.js";
import { ApiError } from "../utils/apiError.js";
import { toPaise, toRupees } from "../utils/currency.js";
import { compressImages } from "../utils/imageCompression.js";
import { logAudit } from "./audit.service.js";
import { inventoryService } from "./inventory.service.js";
import { walletService } from "./wallet.service.js";
import { referralService } from "./referral.service.js";
import { cashfree } from "../integrations/cashfree/cashfree.adapter.js";
import { normalizePaymentMethod, PAYMENT_METHODS } from "../constants/paymentMethods.js";
import { invalidateCache } from "../middleware/cache.js";
import {
  RETURN_REASONS,
  RETURN_STATUS,
  RETURN_WINDOW_DAYS,
  OPEN_RETURN_STATUSES,
} from "../constants/returnReasons.js";

const DAY_MS = 24 * 60 * 60 * 1000;

const referenceNumber = () => {
  const d = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `RET-${d}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
};

const isOnlinePaid = (order) =>
  normalizePaymentMethod(order.paymentMethod) === PAYMENT_METHODS.ONLINE &&
  String(order.paymentStatus || "").toLowerCase() === "paid";

const deliveredAtOf = (order) => {
  if (order.deliveredAt) return new Date(order.deliveredAt);
  const entry = (order.timeline || []).find((t) => String(t.status).toLowerCase() === "delivered" && t.time);
  return new Date(entry?.time || order.updatedAt);
};

const maskTail = (value, keep = 4) => (value ? `${"•".repeat(Math.max(0, value.length - keep))}${value.slice(-keep)}` : "");

const addTimeline = (ret, status, note = "", by = "system") => {
  ret.timeline.push({ status, note, by, at: new Date() });
};

const setOrderStatus = async (order, status) => {
  order.status = status;
  await order.save();
};

export class ReturnService {
  // ------------------------------------------------------------------ eligibility
  async eligibilityFor(order) {
    const now = new Date();
    const deliveredAt = deliveredAtOf(order);
    const deadline = new Date(deliveredAt.getTime() + RETURN_WINDOW_DAYS * DAY_MS);
    const existing = await ReturnRequest.findOne({ orderId: order._id, status: { $ne: RETURN_STATUS.CANCELLED } });

    let reason = null;
    if (existing) reason = "A return has already been requested for this order.";
    else if (order.status !== "delivered") reason = "Only delivered orders can be returned.";
    else if (now > deadline) reason = `The ${RETURN_WINDOW_DAYS}-day return window ended on ${deadline.toDateString()}.`;

    const online = isOnlinePaid(order);
    return {
      orderNumber: order.orderNumber,
      eligible: !reason,
      reason,
      deliveredAt,
      deadline,
      daysLeft: Math.max(0, Math.ceil((deadline - now) / DAY_MS)),
      refundMethods: online ? ["original"] : ["bank", "upi", "store_credit"],
      refundAmount: toRupees(Math.max(0, order.pricing.totalPaise - (order.refundedPaise || 0))),
      creditReturn: toRupees(order.pricing.storeCreditPaise || 0),
      existingReturnId: existing ? existing._id.toString() : null,
    };
  }

  async eligibilityMap(user) {
    const orders = await Order.find({
      userId: user._id,
      status: { $in: ["delivered", "return_requested", "returned"] },
    });
    const entries = await Promise.all(orders.map(async (o) => [o.orderNumber, await this.eligibilityFor(o)]));
    return Object.fromEntries(entries);
  }

  async getEligibility(orderNumber, user) {
    const order = await Order.findOne({ orderNumber, userId: user._id });
    if (!order) throw ApiError.notFound("Order not found.");
    return this.eligibilityFor(order);
  }

  // ------------------------------------------------------------------ customer actions
  async createReturn(orderNumber, user, body = {}) {
    const order = await Order.findOne({ orderNumber, userId: user._id });
    if (!order) throw ApiError.notFound("Order not found.");

    const eligibility = await this.eligibilityFor(order);
    if (!eligibility.eligible) throw ApiError.badRequest(eligibility.reason);

    const category = RETURN_REASONS[body.reasonCategory];
    if (!category) throw ApiError.badRequest("Please choose a reason for the return.");

    const comment = String(body.reason || "").trim();
    if (body.reasonCategory === "other" && comment.length < 10) {
      throw ApiError.badRequest("Please describe the problem (at least 10 characters).");
    }
    if (!category.opened && body.sealedConfirmed !== true) {
      throw ApiError.badRequest("Please confirm the product is unopened with its seal intact.");
    }

    const rawImages = Array.isArray(body.evidenceImages) ? body.evidenceImages.slice(0, 5) : [];
    if (category.photo && rawImages.length === 0) {
      throw ApiError.badRequest("Please upload at least one photo showing the problem.");
    }
    const evidenceImages = await compressImages(rawImages);

    // How the refund will be paid
    let refundMethod = "original";
    const payout = {};
    if (!eligibility.refundMethods.includes("original")) {
      refundMethod = body.refundMethod;
      if (!eligibility.refundMethods.includes(refundMethod)) {
        throw ApiError.badRequest("Please choose how you want to receive your refund: bank account, UPI or store credit.");
      }
      if (refundMethod === "bank") {
        payout.accountName = String(body.payout?.accountName || "").trim();
        payout.accountNumber = String(body.payout?.accountNumber || "").replace(/\s/g, "");
        payout.ifsc = String(body.payout?.ifsc || "").trim().toUpperCase();
        if (payout.accountName.length < 2) throw ApiError.badRequest("Enter the account holder's name.");
        if (!/^\d{9,18}$/.test(payout.accountNumber)) throw ApiError.badRequest("Enter a valid bank account number (9–18 digits).");
        if (!/^[A-Z]{4}0[A-Z0-9]{6}$/.test(payout.ifsc)) throw ApiError.badRequest("Enter a valid IFSC code (e.g. HDFC0001234).");
      } else if (refundMethod === "upi") {
        payout.upiId = String(body.payout?.upiId || "").trim().toLowerCase();
        if (!/^[a-z0-9._-]{2,}@[a-z]{2,}$/.test(payout.upiId)) throw ApiError.badRequest("Enter a valid UPI ID (e.g. name@bank).");
      }
    }

    const returnReq = await ReturnRequest.create({
      referenceNumber: referenceNumber(),
      orderId: order._id,
      orderNumber: order.orderNumber,
      userId: user._id,
      customer: order.customer,
      items: order.items.map((i) => ({
        productId: i.productId,
        variantId: i.variantId,
        sku: i.sku,
        name: i.name,
        size: i.size,
        image: i.image,
        quantity: i.quantity,
        unitPricePaise: i.unitPricePaise,
      })),
      reasonCategory: body.reasonCategory,
      reason: comment,
      evidenceImages,
      deliveredAt: eligibility.deliveredAt,
      refundMethod,
      payout,
      refundAmountPaise: Math.max(0, order.pricing.totalPaise - (order.refundedPaise || 0)),
      creditReturnPaise: order.pricing.storeCreditPaise || 0,
      timeline: [{ status: RETURN_STATUS.REQUESTED, note: category.label, by: "customer" }],
    });

    await setOrderStatus(order, "return_requested");
    return this.serializeForCustomer(returnReq);
  }

  async listMine(user) {
    const rows = await ReturnRequest.find({ userId: user._id }).sort({ createdAt: -1 });
    return Promise.all(rows.map((r) => this.serializeForCustomer(r)));
  }

  async getMine(id, user) {
    const ret = await ReturnRequest.findOne({ _id: id, userId: user._id });
    if (!ret) throw ApiError.notFound("Return request not found.");
    return this.serializeForCustomer(ret);
  }

  async cancelMine(id, user) {
    const ret = await ReturnRequest.findOne({ _id: id, userId: user._id });
    if (!ret) throw ApiError.notFound("Return request not found.");
    if (ret.status !== RETURN_STATUS.REQUESTED) {
      throw ApiError.badRequest("This return can no longer be cancelled because it has already been reviewed.");
    }
    ret.status = RETURN_STATUS.CANCELLED;
    addTimeline(ret, RETURN_STATUS.CANCELLED, "Cancelled by customer", "customer");
    await ret.save();
    const order = await Order.findById(ret.orderId);
    if (order && order.status === "return_requested") await setOrderStatus(order, "delivered");
    return this.serializeForCustomer(ret);
  }

  // ------------------------------------------------------------------ admin actions
  async listAdmin({ status, q } = {}) {
    const filter = {};
    if (status && status !== "all") filter.status = status;
    if (q) {
      const rx = { $regex: String(q).trim(), $options: "i" };
      filter.$or = [{ referenceNumber: rx }, { orderNumber: rx }, { "customer.name": rx }, { "customer.email": rx }];
    }
    const rows = await ReturnRequest.find(filter).sort({ createdAt: -1 }).limit(200);
    return Promise.all(rows.map((r) => this.serializeForAdmin(r)));
  }

  async getAdmin(id) {
    const ret = await ReturnRequest.findById(id);
    if (!ret) throw ApiError.notFound("Return request not found.");
    return this.serializeForAdmin(ret);
  }

  async #load(id, allowed) {
    const ret = await ReturnRequest.findById(id);
    if (!ret) throw ApiError.notFound("Return request not found.");
    if (!allowed.includes(ret.status)) {
      throw ApiError.badRequest(`This return is "${ret.status}" and cannot be moved this way.`);
    }
    const order = await Order.findById(ret.orderId);
    if (!order) throw ApiError.notFound("The original order no longer exists.");
    return { ret, order };
  }

  async #audit(staff, action, ret, details) {
    await logAudit({
      actorId: staff?._id,
      actorName: staff?.name,
      actorRole: staff?.roles?.[0]?.name || "Staff",
      action,
      module: "Returns",
      targetId: ret.referenceNumber,
      details,
    });
  }

  async approve(id, staff, { customerNote = "", refundAmount } = {}) {
    const { ret, order } = await this.#load(id, [RETURN_STATUS.REQUESTED]);
    if (refundAmount !== undefined && refundAmount !== null && refundAmount !== "") {
      const paise = toPaise(Number(refundAmount));
      const max = Math.max(0, order.pricing.totalPaise - (order.refundedPaise || 0));
      if (!(paise >= 0) || paise > max) throw ApiError.badRequest(`Refund amount must be between ₹0 and ₹${toRupees(max)}.`);
      ret.refundAmountPaise = paise;
    }
    ret.status = RETURN_STATUS.APPROVED;
    ret.customerNote = String(customerNote).trim();
    addTimeline(ret, RETURN_STATUS.APPROVED, ret.customerNote, staff?.name || "staff");
    await ret.save();
    await this.#audit(staff, "returns.approve", ret, `Approved return ${ret.referenceNumber} for order ${ret.orderNumber}`);
    return this.serializeForAdmin(ret);
  }

  async reject(id, staff, { customerNote = "" } = {}) {
    const note = String(customerNote).trim();
    if (!note) throw ApiError.badRequest("Please give the customer a reason for rejecting the return.");
    const { ret, order } = await this.#load(id, [RETURN_STATUS.REQUESTED, RETURN_STATUS.APPROVED]);
    ret.status = RETURN_STATUS.REJECTED;
    ret.customerNote = note;
    addTimeline(ret, RETURN_STATUS.REJECTED, note, staff?.name || "staff");
    await ret.save();
    if (order.status === "return_requested") await setOrderStatus(order, "delivered");
    await this.#audit(staff, "returns.reject", ret, `Rejected return ${ret.referenceNumber}: ${note}`);
    return this.serializeForAdmin(ret);
  }

  async markReceived(id, staff, { restock, note = "" } = {}) {
    const { ret, order } = await this.#load(id, [RETURN_STATUS.APPROVED]);
    const shouldRestock = restock === undefined ? RETURN_REASONS[ret.reasonCategory].restock : Boolean(restock);
    if (shouldRestock) {
      await inventoryService.restockReturned(ret.items, ret.orderNumber, staff?.id || "staff");
      ret.restocked = true;
      await invalidateCache("catalog");
    }
    ret.status = RETURN_STATUS.RECEIVED;
    addTimeline(ret, RETURN_STATUS.RECEIVED, `${shouldRestock ? "Restocked. " : "Not restocked. "}${note}`.trim(), staff?.name || "staff");
    await ret.save();
    await this.#audit(staff, "returns.receive", ret, `Received return ${ret.referenceNumber}${shouldRestock ? " and restocked it" : ""}`);
    return this.serializeForAdmin(ret);
  }

  /**
   * Pay the refund: Cashfree for prepaid orders, store credit instantly, bank/UPI recorded with the payout reference.
   */
  async issueRefund(id, staff, { amount, payoutReference = "" } = {}) {
    const { ret, order } = await this.#load(id, [RETURN_STATUS.RECEIVED]);

    const maxCash = Math.max(0, order.pricing.totalPaise - (order.refundedPaise || 0));
    const cashPaise =
      amount === undefined || amount === null || amount === "" ? Math.min(ret.refundAmountPaise, maxCash) : toPaise(Number(amount));
    if (!(cashPaise >= 0) || cashPaise > maxCash) {
      throw ApiError.badRequest(`Refund amount must be between ₹0 and ₹${toRupees(maxCash)} (what is left to refund on this order).`);
    }

    const attempt = (await Refund.countDocuments({ returnRequestId: ret._id })) + 1;
    const refundId = `RF-${ret.referenceNumber}-${attempt}`;
    const provider = ret.refundMethod === "original" ? "cashfree" : ret.refundMethod === "store_credit" ? "store_credit" : "manual";

    let outcome = "succeeded"; // succeeded | pending
    let refundDoc = null;
    if (cashPaise > 0) {
      refundDoc = await Refund.create({
        orderId: order._id,
        orderNumber: order.orderNumber,
        returnRequestId: ret._id,
        amountPaise: cashPaise,
        reason: RETURN_REASONS[ret.reasonCategory].label,
        provider,
        method: ret.refundMethod,
        refundId,
        status: "pending",
        staffActorId: staff._id,
      });

      try {
        if (ret.refundMethod === "original") {
          const result = await cashfree.createRefund({
            orderNumber: order.orderNumber,
            refundId,
            amountPaise: cashPaise,
            note: `Return ${ret.referenceNumber}`,
          });
          refundDoc.providerRefundId = result.cfRefundId || result.refundId || refundId;
          const st = String(result.status || "").toUpperCase();
          if (st === "SUCCESS") outcome = "succeeded";
          else if (st === "PENDING" || st === "ONHOLD") outcome = "pending";
          else throw new Error(`Cashfree returned refund status "${st || "UNKNOWN"}".`);
        } else if (ret.refundMethod === "store_credit") {
          await walletService.credit(ret.userId, cashPaise, {
            source: "refund_credit",
            reference: ret.referenceNumber,
            note: `Refund for return ${ret.referenceNumber}`,
            key: `refund_credit:${ret.referenceNumber}`,
          });
        } else {
          const reference = String(payoutReference).trim();
          if (reference.length < 4) {
            throw new Error("Enter the bank transfer / UPI reference (UTR) after you send the money.");
          }
          refundDoc.providerRefundId = reference;
        }
      } catch (err) {
        refundDoc.status = "failed";
        refundDoc.errorMessage = err.message;
        await refundDoc.save();
        throw ApiError.badRequest(`Refund failed: ${err.message}`);
      }
      refundDoc.status = outcome === "pending" ? "pending" : "succeeded";
      await refundDoc.save();
      ret.refundId = refundDoc._id;
    }

    ret.refundAmountPaise = cashPaise;
    if (outcome === "pending") {
      ret.status = RETURN_STATUS.REFUND_PENDING;
      addTimeline(ret, RETURN_STATUS.REFUND_PENDING, "Refund submitted to the payment gateway", staff?.name || "staff");
      await ret.save();
    } else {
      await this.#finalize(ret, order, cashPaise, staff);
    }
    await this.#audit(staff, "returns.refund", ret, `Refund of ₹${toRupees(cashPaise)} (${ret.refundMethod}) for return ${ret.referenceNumber}`);
    return this.serializeForAdmin(ret);
  }

  /** Re-check a pending gateway refund and finish the return when Cashfree confirms it. */
  async refreshRefund(id, staff) {
    const { ret, order } = await this.#load(id, [RETURN_STATUS.REFUND_PENDING]);
    const refundDoc = await Refund.findById(ret.refundId);
    if (!refundDoc) throw ApiError.notFound("No refund is attached to this return.");

    let status;
    try {
      status = String((await cashfree.getRefund({ orderNumber: order.orderNumber, refundId: refundDoc.refundId })).status).toUpperCase();
    } catch (err) {
      throw ApiError.badRequest(err.message);
    }

    if (status === "SUCCESS") {
      refundDoc.status = "succeeded";
      await refundDoc.save();
      await this.#finalize(ret, order, refundDoc.amountPaise, staff);
    } else if (status === "CANCELLED" || status === "FAILED") {
      refundDoc.status = "failed";
      refundDoc.errorMessage = `Cashfree reported "${status}".`;
      await refundDoc.save();
      ret.status = RETURN_STATUS.RECEIVED; // can be retried
      addTimeline(ret, RETURN_STATUS.RECEIVED, `Refund ${status.toLowerCase()} at the gateway; you can retry`, "system");
      await ret.save();
    }
    return this.serializeForAdmin(ret);
  }

  async #finalize(ret, order, cashPaise, staff) {
    order.refundedPaise = (order.refundedPaise || 0) + cashPaise;
    order.paymentStatus = order.refundedPaise >= order.pricing.totalPaise ? "refunded" : "partially_refunded";
    order.status = "returned";

    // Credit the customer spent on this order goes back as credit
    if (ret.creditReturnPaise > 0 && !order.storeCreditRestored) {
      await walletService.credit(ret.userId, ret.creditReturnPaise, {
        source: "checkout_restore",
        reference: order.orderNumber,
        note: `Store credit used on returned order ${order.orderNumber}`,
        key: `checkout_restore:${order.orderNumber}`,
      });
      order.storeCreditRestored = true;
    }
    await order.save();
    await referralService.onOrderReturned(order); // a returned first order earns no referral reward

    ret.status = RETURN_STATUS.REFUNDED;
    ret.refundedPaise = cashPaise;
    ret.refundedAt = new Date();
    const where =
      ret.refundMethod === "store_credit" ? "store credit" : ret.refundMethod === "original" ? "the original payment method" : ret.refundMethod === "upi" ? "UPI" : "bank account";
    addTimeline(ret, RETURN_STATUS.REFUNDED, `₹${toRupees(cashPaise)} refunded to ${where}`, staff?.name || "system");
    await ret.save();
  }

  // ------------------------------------------------------------------ serialization
  async #refundInfo(ret) {
    if (!ret.refundId) return null;
    const r = await Refund.findById(ret.refundId);
    return r ? { id: r._id.toString(), status: r.status, method: r.method, amount: toRupees(r.amountPaise), reference: r.providerRefundId || "", errorMessage: r.errorMessage || "" } : null;
  }

  async serializeForCustomer(ret) {
    const j = ret.toJSON();
    return {
      id: j.id,
      referenceNumber: j.referenceNumber,
      orderNumber: j.orderNumber,
      status: j.status,
      reasonCategory: j.reasonCategory,
      reasonLabel: RETURN_REASONS[j.reasonCategory]?.label || j.reasonCategory,
      reason: j.reason,
      items: j.items.map((i) => ({ name: i.name, size: i.size, image: i.image, quantity: i.quantity, price: toRupees(i.unitPricePaise) })),
      evidenceImages: j.evidenceImages,
      refundMethod: j.refundMethod,
      payout: { accountName: j.payout?.accountName || "", accountNumber: maskTail(j.payout?.accountNumber), ifsc: j.payout?.ifsc || "", upiId: j.payout?.upiId || "" },
      refundAmount: toRupees(j.refundAmountPaise),
      creditReturn: toRupees(j.creditReturnPaise),
      refunded: toRupees(j.refundedPaise),
      customerNote: j.customerNote,
      timeline: j.timeline,
      canCancel: j.status === RETURN_STATUS.REQUESTED,
      createdAt: j.createdAt,
      refundedAt: j.refundedAt,
    };
  }

  async serializeForAdmin(ret) {
    const j = ret.toJSON();
    const order = await Order.findById(ret.orderId).select("paymentMethod paymentStatus pricing refundedPaise status").lean();
    return {
      ...j,
      reasonLabel: RETURN_REASONS[j.reasonCategory]?.label || j.reasonCategory,
      items: j.items.map((i) => ({ ...i, price: toRupees(i.unitPricePaise) })),
      refund: await this.#refundInfo(ret),
      refundAmount: toRupees(j.refundAmountPaise),
      creditReturn: toRupees(j.creditReturnPaise),
      refunded: toRupees(j.refundedPaise),
      order: order && {
        status: order.status,
        paymentMethod: normalizePaymentMethod(order.paymentMethod),
        paymentStatus: order.paymentStatus,
        total: toRupees(order.pricing.totalPaise),
        refundedSoFar: toRupees(order.refundedPaise || 0),
      },
      restockDefault: RETURN_REASONS[j.reasonCategory]?.restock ?? true,
    };
  }
}

export const returnService = new ReturnService();
export { OPEN_RETURN_STATUSES };
