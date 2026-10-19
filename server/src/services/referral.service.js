import { User } from "../models/User.js";
import { Referral } from "../models/Referral.js";
import { ReferralProgram } from "../models/ReferralProgram.js";
import { Order } from "../models/Order.js";
import { walletService } from "./wallet.service.js";
import { logAudit } from "./audit.service.js";
import { ApiError } from "../utils/apiError.js";
import { toRupees } from "../utils/currency.js";
import { generateReferralCode } from "../utils/referralCode.js";
import { config } from "../config/index.js";
import { logger } from "../config/logger.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const LIVE_STATUSES = ["ordered", "rewarded", "clawed_back"]; // the friend has already used their first-order offer
const TIERS = [
  { name: "Prana Silver", min: 0 },
  { name: "Prana Gold", min: 5 },
  { name: "Prana Platinum", min: 15 },
];

const firstName = (name = "") => String(name).trim().split(/\s+/)[0] || "A friend";
const maskName = (name = "") => {
  const parts = String(name).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "A friend";
  return parts.length === 1 ? parts[0] : `${parts[0]} ${parts[parts.length - 1][0]}.`;
};
const maskEmail = (email = "") => {
  const [user, domain] = String(email).split("@");
  return domain ? `${user.slice(0, 1)}***@${domain}` : "";
};
const normalizePhone = (p) => String(p || "").replace(/\D/g, "").slice(-10);
const normalizeText = (s) => String(s || "").toLowerCase().replace(/[^a-z0-9]/g, "");

export class ReferralService {
  // ------------------------------------------------------------------ program + codes
  async getProgramSettings() {
    let settings = await ReferralProgram.findOne();
    if (!settings) settings = await ReferralProgram.create({});
    return settings;
  }

  // Only what customers may see (never admin-only knobs)
  publicProgram(settings) {
    const j = settings.toJSON();
    return {
      enabled: j.enabled,
      programName: j.programName,
      refereeDiscountType: j.refereeDiscountType,
      refereeDiscountValue: j.refereeDiscountPercent,
      refereeDiscountCap: j.refereeDiscountCap,
      minOrderValue: j.minOrderValue,
      referrerRewardType: j.referrerRewardType === "percent" ? "percent" : "fixed",
      referrerReward: j.referrerReward,
      referrerRewardPercent: j.referrerRewardPercent,
      referrerRewardCap: j.referrerRewardCap,
      holdDays: j.holdDays,
      attributionDays: j.cookieExpiryDays,
    };
  }

  async getUserReferralCode(user) {
    if (user.referralCode) return user.referralCode;
    const code = await generateReferralCode(user.name);
    await User.findByIdAndUpdate(user.id || user._id, { referralCode: code });
    user.referralCode = code;
    return code;
  }

  rewardFor(settings, goodsPaise) {
    if (settings.referrerRewardType === "percent") {
      const raw = Math.round((goodsPaise * settings.referrerRewardPercent) / 100);
      return settings.referrerRewardCapPaise > 0 ? Math.min(raw, settings.referrerRewardCapPaise) : raw;
    }
    return settings.referrerRewardPaise;
  }

  // ------------------------------------------------------------------ lookup (landing page / banner)
  async lookupCode(code) {
    const settings = await this.getProgramSettings();
    const clean = String(code || "").trim().toUpperCase();
    if (!settings.enabled) return { valid: false, reason: "The referral program is paused right now." };
    const referrer = clean ? await User.findOne({ referralCode: clean, status: "active" }).select("name") : null;
    if (!referrer) return { valid: false, reason: "This referral code is not valid." };
    return { valid: true, code: clean, referrerName: firstName(referrer.name), program: this.publicProgram(settings) };
  }

  // ------------------------------------------------------------------ discount (server is the only authority)
  /**
   * What a referral code is worth on a first order. Throws a customer-friendly 400 when it can't be used.
   * `goodsPaise` is the value of the goods being bought (after product discounts, before shipping).
   */
  async computeDiscount({ code, user, goodsPaise }) {
    const settings = await this.getProgramSettings();
    if (!settings.enabled) throw ApiError.badRequest("The referral rewards program is temporarily paused.");
    if (!user?._id) throw ApiError.badRequest("Please sign in or create an account to use a referral code.");

    const clean = String(code || "").trim().toUpperCase();
    const referrer = clean ? await User.findOne({ referralCode: clean, status: "active" }) : null;
    if (!referrer) throw ApiError.badRequest("Invalid referral code.");

    if (
      referrer._id.equals(user._id) ||
      referrer.email.toLowerCase() === String(user.email).toLowerCase() ||
      (normalizePhone(referrer.phone) && normalizePhone(referrer.phone) === normalizePhone(user.phone))
    ) {
      throw ApiError.badRequest("You cannot use your own referral code.");
    }

    if (user.referredBy && !user.referredBy.equals(referrer._id)) {
      throw ApiError.badRequest("Your account is already linked to another friend's referral.");
    }
    const existing = await Referral.findOne({ refereeId: user._id });
    if (existing && (!existing.referrerId.equals(referrer._id) || LIVE_STATUSES.includes(existing.status))) {
      throw ApiError.badRequest("The referral offer has already been used on this account.");
    }

    const previousOrders = await Order.countDocuments({
      $or: [{ userId: user._id }, { "customer.email": String(user.email).toLowerCase() }],
      status: { $nin: ["cancelled", "pending_payment"] },
    });
    if (previousOrders > 0) {
      throw ApiError.badRequest("Referral invitation discounts are reserved for your first order.");
    }

    if (goodsPaise < settings.minOrderValuePaise) {
      throw ApiError.badRequest(`The referral offer needs a minimum order of ₹${toRupees(settings.minOrderValuePaise)}.`);
    }

    let discountPaise =
      settings.refereeDiscountType === "fixed"
        ? Math.round(settings.refereeDiscountPercent * 100)
        : Math.round((goodsPaise * settings.refereeDiscountPercent) / 100);
    if (settings.refereeDiscountCapPaise > 0) discountPaise = Math.min(discountPaise, settings.refereeDiscountCapPaise);
    discountPaise = Math.min(discountPaise, goodsPaise);

    return {
      valid: true,
      code: clean,
      referrerId: referrer._id,
      referrerName: firstName(referrer.name),
      discountPaise,
      discount: toRupees(discountPaise),
      rewardPaise: this.rewardFor(settings, goodsPaise - discountPaise),
    };
  }

  // Kept for the quote-based checkout, which passes an id instead of a user
  async validateReferralCode(code, subtotalPaise, _email, userId = null) {
    const user = userId ? await User.findById(userId) : null;
    return this.computeDiscount({ code, user, goodsPaise: subtotalPaise });
  }

  // ------------------------------------------------------------------ attribution
  /** Called at signup: links the new account to the friend who invited them. Never blocks registration. */
  async linkSignup(newUser, code) {
    if (!code || !String(code).trim()) return { applied: false };
    try {
      const settings = await this.getProgramSettings();
      if (!settings.enabled) return { applied: false, reason: "paused" };
      const referrer = await User.findOne({ referralCode: String(code).trim().toUpperCase(), status: "active" });
      if (!referrer || referrer._id.equals(newUser._id) || referrer.email.toLowerCase() === newUser.email.toLowerCase()) {
        return { applied: false, reason: "invalid" };
      }
      const flags = [];
      if (normalizePhone(referrer.phone) && normalizePhone(referrer.phone) === normalizePhone(newUser.phone)) flags.push("same_phone");

      await User.findByIdAndUpdate(newUser._id, { referredBy: referrer._id });
      await Referral.create({
        code: referrer.referralCode,
        referrerId: referrer._id,
        refereeId: newUser._id,
        refereeEmail: newUser.email.toLowerCase(),
        refereeName: newUser.name,
        status: "signed_up",
        flags,
      });
      return { applied: true, referrerName: firstName(referrer.name) };
    } catch (err) {
      logger.warn({ err: err.message }, "Referral signup link failed");
      return { applied: false, reason: "error" };
    }
  }

  /** Called after an order that used a referral code is saved: ties the order to the referral and puts the reward on hold. */
  async recordOrder(order, user) {
    const code = order.pricing?.referralCode;
    if (!code || !user?._id) return null;
    const settings = await this.getProgramSettings();
    const referrer = await User.findOne({ referralCode: String(code).toUpperCase() });
    if (!referrer) return null;

    let referral = await Referral.findOne({ refereeId: user._id });
    if (!referral) {
      referral = new Referral({
        code: referrer.referralCode,
        referrerId: referrer._id,
        refereeId: user._id,
        refereeEmail: String(user.email).toLowerCase(),
        refereeName: user.name,
      });
    }
    if (!user.referredBy) await User.findByIdAndUpdate(user._id, { referredBy: referrer._id });

    const flags = new Set(referral.flags || []);
    const ship = order.shippingAddress || {};
    const shipKey = normalizeText(`${ship.street}${ship.pincode}`);
    if (shipKey) {
      const referrerOrders = await Order.find({ userId: referrer._id }).select("shippingAddress").limit(50).lean();
      const sameAddress =
        referrerOrders.some((o) => normalizeText(`${o.shippingAddress?.street}${o.shippingAddress?.pincode}`) === shipKey) ||
        (referrer.addresses || []).some((a) => normalizeText(`${a.street}${a.pincode}`) === shipKey);
      if (sameAddress) flags.add("same_address");
    }
    if (normalizePhone(ship.phone) && normalizePhone(ship.phone) === normalizePhone(referrer.phone)) flags.add("same_phone");

    const goodsPaise = Math.max(0, (order.items || []).reduce((s, i) => s + i.lineTotalPaise, 0) - (order.pricing.referralDiscountPaise || 0));
    referral.status = "ordered";
    referral.qualifiedOrderId = order._id;
    referral.orderNumber = order.orderNumber;
    referral.orderAmountPaise = order.pricing.totalPaise;
    referral.discountPaise = order.pricing.referralDiscountPaise || 0;
    referral.rewardAmountPaise = this.rewardFor(settings, goodsPaise);
    referral.voidReason = "";
    referral.flags = [...flags];
    await referral.save();
    return referral;
  }

  // ------------------------------------------------------------------ reward lifecycle
  async #referralForOrder(order) {
    return Referral.findOne({ qualifiedOrderId: order._id });
  }

  /** The friend's first order was cancelled before delivery: they can try again, nobody is paid. */
  async onOrderCancelled(order) {
    const referral = await this.#referralForOrder(order);
    if (!referral) return;
    if (referral.status === "rewarded") return this.#clawBack(referral, "Order cancelled");
    if (referral.status !== "ordered") return;
    referral.status = "signed_up";
    referral.voidReason = `Order ${order.orderNumber} was cancelled`;
    referral.qualifiedOrderId = undefined;
    referral.orderNumber = "";
    referral.orderAmountPaise = 0;
    referral.discountPaise = 0;
    referral.rewardAmountPaise = 0;
    await referral.save();
  }

  /** The order came back as a completed return: no reward (and take back one already paid). */
  async onOrderReturned(order) {
    const referral = await this.#referralForOrder(order);
    if (!referral) return;
    if (referral.status === "rewarded") return this.#clawBack(referral, "Order returned");
    if (referral.status === "ordered") {
      referral.status = "cancelled";
      referral.voidReason = `Order ${order.orderNumber} was returned`;
      await referral.save();
    }
  }

  async #clawBack(referral, reason, staff = null) {
    await walletService.debit(
      referral.referrerId,
      referral.rewardAmountPaise,
      { source: "referral_clawback", reference: referral.orderNumber, note: reason, key: `referral_clawback:${referral._id}` },
      { partial: true }
    );
    referral.status = "clawed_back";
    referral.voidReason = reason;
    await referral.save();
    if (staff) await this.#audit(staff, `Clawed back referral reward for ${referral.orderNumber}: ${reason}`, referral);
    return referral;
  }

  async #pay(referral, order) {
    const tx = await walletService.credit(referral.referrerId, referral.rewardAmountPaise, {
      source: "referral_reward",
      reference: referral.orderNumber,
      note: `Reward for ${maskName(referral.refereeName)}'s first order`,
      key: `referral_reward:${referral._id}`,
    });
    referral.status = "rewarded";
    referral.rewardedAt = new Date();
    referral.walletTransactionId = tx?._id || null;
    await referral.save();
    return referral;
  }

  /** Pays every reward whose order was delivered and has outlasted the return window. Safe to run repeatedly. */
  async qualifyDue({ referrerId = null } = {}) {
    const settings = await this.getProgramSettings();
    const filter = { status: "ordered", qualifiedOrderId: { $ne: null } };
    if (referrerId) filter.referrerId = referrerId;
    const pending = await Referral.find(filter);
    const monthStart = new Date();
    monthStart.setUTCDate(1);
    monthStart.setUTCHours(0, 0, 0, 0);
    let paid = 0;

    for (const referral of pending) {
      const order = await Order.findById(referral.qualifiedOrderId);
      if (!order || order.status !== "delivered" || !order.deliveredAt) continue;
      if (Date.now() < order.deliveredAt.getTime() + settings.holdDays * DAY_MS) continue;
      if (referral.rewardAmountPaise <= 0) continue;
      if (settings.maxRewardsPerMonth > 0) {
        const thisMonth = await Referral.countDocuments({ referrerId: referral.referrerId, status: "rewarded", rewardedAt: { $gte: monthStart } });
        if (thisMonth >= settings.maxRewardsPerMonth) continue; // waits for next month
      }
      if (referral.flags.includes("same_phone")) continue; // an admin must approve suspected self-referrals
      await this.#pay(referral, order);
      paid += 1;
    }
    return paid;
  }

  // ------------------------------------------------------------------ admin actions
  async #audit(staff, details, referral) {
    await logAudit({
      actorId: staff._id,
      actorName: staff.name,
      action: "customers.manage",
      module: "Referrals",
      targetId: String(referral._id),
      details,
    });
  }

  /** Pay a reward now (skipping the hold), e.g. after reviewing a flagged referral. The order must be delivered. */
  async approve(id, staff) {
    const referral = await Referral.findById(id);
    if (!referral) throw ApiError.notFound("Referral not found.");
    if (referral.status !== "ordered") throw ApiError.badRequest("Only referrals with a placed order can be approved.");
    const order = await Order.findById(referral.qualifiedOrderId);
    if (!order || order.status !== "delivered") throw ApiError.badRequest("The order has not been delivered yet.");
    if (referral.rewardAmountPaise <= 0) throw ApiError.badRequest("This referral has no reward amount.");
    await this.#pay(referral, order);
    await this.#audit(staff, `Approved referral reward ₹${toRupees(referral.rewardAmountPaise)} for ${referral.orderNumber}`, referral);
    return referral;
  }

  async void(id, reason, staff) {
    const referral = await Referral.findById(id);
    if (!referral) throw ApiError.notFound("Referral not found.");
    if (!String(reason || "").trim()) throw ApiError.badRequest("Please give a reason.");
    if (["cancelled", "clawed_back"].includes(referral.status)) throw ApiError.badRequest("This referral is already closed.");
    if (referral.status === "rewarded") return this.#clawBack(referral, reason.trim(), staff);
    referral.status = "cancelled";
    referral.voidReason = reason.trim();
    await referral.save();
    await this.#audit(staff, `Voided referral for ${referral.orderNumber || referral.refereeEmail}: ${reason}`, referral);
    return referral;
  }

  // ------------------------------------------------------------------ customer dashboard
  async dashboard(user) {
    await this.qualifyDue({ referrerId: user._id });
    const settings = await this.getProgramSettings();
    const code = await this.getUserReferralCode(user);
    const rows = await Referral.find({ referrerId: user._id }).sort({ createdAt: -1 }).limit(100);
    const orders = await Order.find({ _id: { $in: rows.map((r) => r.qualifiedOrderId).filter(Boolean) } }).select("status deliveredAt").lean();
    const orderById = new Map(orders.map((o) => [String(o._id), o]));

    const sum = (list) => list.reduce((s, r) => s + (r.rewardAmountPaise || 0), 0);
    const rewarded = rows.filter((r) => r.status === "rewarded");
    const ordered = rows.filter((r) => r.status === "ordered");
    const tier = [...TIERS].reverse().find((t) => rewarded.length >= t.min);
    const nextTier = TIERS.find((t) => t.min > rewarded.length) || null;

    return {
      referralCode: code,
      shareUrl: `${config.APP_URL}/?ref=${encodeURIComponent(code)}`,
      program: this.publicProgram(settings),
      stats: {
        invited: rows.length,
        ordered: ordered.length + rewarded.length,
        rewarded: rewarded.length,
        pendingRewards: toRupees(sum(ordered)),
        totalEarned: toRupees(sum(rewarded)),
        walletBalance: toRupees(await walletService.balance(user._id)),
      },
      tier: { name: tier.name, nextTier: nextTier ? { name: nextTier.name, remaining: nextTier.min - rewarded.length } : null },
      referrals: rows.map((r) => {
        const order = r.qualifiedOrderId ? orderById.get(String(r.qualifiedOrderId)) : null;
        const releasesAt =
          r.status === "ordered" && order?.status === "delivered" && order.deliveredAt
            ? new Date(order.deliveredAt.getTime() + settings.holdDays * DAY_MS)
            : null;
        return {
          id: r.id,
          friend: maskName(r.refereeName),
          email: maskEmail(r.refereeEmail),
          status: r.status === "pending" || r.status === "qualified" ? "ordered" : r.status,
          reward: toRupees(r.rewardAmountPaise),
          releasesAt,
          note: r.status === "cancelled" || r.status === "clawed_back" ? r.voidReason : "",
          createdAt: r.createdAt,
          rewardedAt: r.rewardedAt,
        };
      }),
    };
  }

  // ------------------------------------------------------------------ admin reporting
  async adminOverview() {
    await this.qualifyDue();
    const referrals = await Referral.find()
      .populate("referrerId", "name email referralCode")
      .populate("refereeId", "name email")
      .sort({ createdAt: -1 })
      .limit(500);

    const paid = referrals.filter((r) => r.status === "rewarded");
    const onHold = referrals.filter((r) => r.status === "ordered");
    const withOrders = referrals.filter((r) => ["ordered", "rewarded", "clawed_back"].includes(r.status));

    const byReferrer = new Map();
    for (const r of paid) {
      const key = String(r.referrerId?._id);
      const cur = byReferrer.get(key) || { name: r.referrerId?.name, email: r.referrerId?.email, rewards: 0, earnedPaise: 0 };
      cur.rewards += 1;
      cur.earnedPaise += r.rewardAmountPaise;
      byReferrer.set(key, cur);
    }

    const sum = (list, f) => list.reduce((s, r) => s + (r[f] || 0), 0);
    return {
      items: referrals.map((r) => ({
        id: r.id,
        code: r.code,
        referrer: r.referrerId ? { id: r.referrerId._id, name: r.referrerId.name, email: r.referrerId.email } : null,
        referee: { name: r.refereeName || r.refereeId?.name || "Visitor", email: r.refereeEmail },
        orderNumber: r.orderNumber || null,
        orderAmount: toRupees(r.orderAmountPaise || 0),
        discount: toRupees(r.discountPaise || 0),
        rewardAmount: toRupees(r.rewardAmountPaise || 0),
        status: r.status,
        flags: r.flags || [],
        voidReason: r.voidReason || "",
        createdAt: r.createdAt,
        rewardedAt: r.rewardedAt,
      })),
      metrics: {
        totalAttributed: referrals.length,
        qualifyingOrders: withOrders.length,
        totalRevenue: toRupees(sum(withOrders, "orderAmountPaise")),
        pendingRewards: toRupees(sum(onHold, "rewardAmountPaise")),
        creditedRewards: toRupees(sum(paid, "rewardAmountPaise")),
        discountsGiven: toRupees(sum(withOrders, "discountPaise")),
        flagged: referrals.filter((r) => r.flags?.length && ["signed_up", "ordered"].includes(r.status)).length,
      },
      topReferrers: [...byReferrer.values()]
        .sort((a, b) => b.earnedPaise - a.earnedPaise)
        .slice(0, 5)
        .map((r) => ({ ...r, earned: toRupees(r.earnedPaise) })),
    };
  }
}

export const referralService = new ReferralService();
