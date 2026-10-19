import { Order } from "../models/Order.js";
import { Product } from "../models/Product.js";
import { Category } from "../models/Category.js";
import { normalizePaymentMethod } from "../constants/paymentMethods.js";
import { ApiError } from "../utils/apiError.js";
import { toRupees } from "../utils/currency.js";

const DAY_MS = 24 * 60 * 60 * 1000;
const RECEIVED = ["paid", "partially_refunded", "refunded"]; // money actually came in at some point
const SHIPPED_STATUSES = ["delivered", "return_requested", "returned"];

/**
 * What counts as revenue:
 *  - collected: payment received (online paid, or COD collected). Pending/unpaid and cancelled orders are NOT revenue.
 *  - delivered: collected AND the order reached the customer (revenue recognised on delivery)
 *  - booked:    every order placed and not cancelled, paid or not (order value / sales booked)
 * Refunds are always subtracted to give net revenue.
 */
export const REVENUE_BASES = {
  collected: {
    label: "Payment received",
    description: "Paid online or collected on delivery. Pending payments are not counted.",
    counts: (o) => o.status !== "cancelled" && RECEIVED.includes(o.paymentStatus),
  },
  delivered: {
    label: "Delivered & paid",
    description: "Paid orders that have reached the customer.",
    counts: (o) => o.status !== "cancelled" && RECEIVED.includes(o.paymentStatus) && SHIPPED_STATUSES.includes(o.status),
  },
  booked: {
    label: "All orders placed",
    description: "Every order not cancelled, including unpaid ones.",
    counts: (o) => o.status !== "cancelled" && o.paymentStatus !== "failed",
  },
};

const refundOf = (o) => {
  const total = o.pricing?.totalPaise || 0;
  const refunded = o.refundedPaise || 0;
  // Orders marked "refunded" by hand (before refunds were tracked) count as refunded in full
  const amount = refunded > 0 ? refunded : o.paymentStatus === "refunded" ? total : 0;
  return Math.min(amount, total);
};

const monthKey = (d) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export class AnalyticsService {
  async #orders(from, to) {
    const match = {};
    if (from || to) {
      match.createdAt = {};
      if (from) match.createdAt.$gte = from;
      if (to) match.createdAt.$lt = to;
    }
    return Order.find(match)
      .select("createdAt status paymentStatus paymentMethod pricing.totalPaise pricing.taxPaise refundedPaise items.productId items.name items.image items.lineTotalPaise items.quantity")
      .lean();
  }

  #summarize(orders, basis) {
    const counted = orders.filter(basis.counts);
    let grossPaise = 0;
    let refundsPaise = 0;
    let taxPaise = 0;
    for (const o of counted) {
      const total = o.pricing?.totalPaise || 0;
      const refund = refundOf(o);
      grossPaise += total;
      refundsPaise += refund;
      taxPaise += total > 0 ? Math.round((o.pricing?.taxPaise || 0) * ((total - refund) / total)) : 0;
    }

    const live = orders.filter((o) => o.status !== "cancelled" && o.paymentStatus !== "failed");
    const unpaid = live.filter((o) => !RECEIVED.includes(o.paymentStatus));
    const cancelled = orders.filter((o) => o.status === "cancelled");
    const finished = orders.filter((o) => ["delivered", "cancelled", "returned"].includes(o.status));

    return {
      counted,
      grossPaise,
      refundsPaise,
      netPaise: grossPaise - refundsPaise,
      taxPaise,
      ordersCount: counted.length,
      refundedOrders: counted.filter((o) => refundOf(o) > 0).length,
      pendingPaise: unpaid.reduce((s, o) => s + (o.pricing?.totalPaise || 0), 0),
      pendingOrders: unpaid.length,
      cancelledPaise: cancelled.reduce((s, o) => s + (o.pricing?.totalPaise || 0), 0),
      cancelledOrders: cancelled.length,
      deliverySuccessRate: finished.length > 0 ? Math.round((finished.filter((o) => o.status === "delivered").length / finished.length) * 1000) / 10 : null,
    };
  }

  /**
   * Revenue report for the dashboard and Reports page.
   * `days` = 7/30/90/365 (default 30) or "all"; `months` = length of the trend chart.
   */
  async getRevenueReport({ days = "30", basis: basisKey = "collected", months = 6 } = {}) {
    const basis = REVENUE_BASES[basisKey];
    if (!basis) throw ApiError.badRequest(`Revenue basis must be one of: ${Object.keys(REVENUE_BASES).join(", ")}.`);

    const now = new Date();
    const windowDays = days === "all" ? null : Math.min(Math.max(parseInt(days, 10) || 30, 1), 3650);
    const from = windowDays ? new Date(now.getTime() - windowDays * DAY_MS) : null;
    const prevFrom = windowDays ? new Date(from.getTime() - windowDays * DAY_MS) : null;
    const monthsBack = Math.min(Math.max(parseInt(months, 10) || 6, 1), 24);
    const trendFrom = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (monthsBack - 1), 1));

    // One read covers the window, the previous period and the trend chart
    const earliest = windowDays ? [prevFrom, trendFrom].sort((a, b) => a - b)[0] : null;
    const all = await this.#orders(earliest, null);

    const current = all.filter((o) => !from || o.createdAt >= from);
    const s = this.#summarize(current, basis);
    const prev = windowDays ? this.#summarize(all.filter((o) => o.createdAt >= prevFrom && o.createdAt < from), basis) : null;
    const growth = (a, b) => (b > 0 ? Math.round(((a - b) / b) * 1000) / 10 : null);

    // ---- trend by month
    const trendMap = new Map();
    for (let i = 0; i < monthsBack; i++) {
      const d = new Date(Date.UTC(trendFrom.getUTCFullYear(), trendFrom.getUTCMonth() + i, 1));
      trendMap.set(monthKey(d), { month: monthKey(d), label: MONTH_LABELS[d.getUTCMonth()], grossPaise: 0, refundsPaise: 0, orders: 0 });
    }
    for (const o of all.filter((x) => x.createdAt >= trendFrom && basis.counts(x))) {
      const row = trendMap.get(monthKey(o.createdAt));
      if (!row) continue;
      row.grossPaise += o.pricing.totalPaise;
      row.refundsPaise += refundOf(o);
      row.orders += 1;
    }

    // ---- products, categories, payment methods (net of refunds; each order's net is shared across its lines)
    const productIds = [...new Set(s.counted.flatMap((o) => o.items.map((i) => String(i.productId || ""))).filter(Boolean))];
    const products = await Product.find({ _id: { $in: productIds } }).select("categoryId").lean();
    const categoryOf = new Map(products.map((p) => [String(p._id), p.categoryId]));
    const categories = await Category.find({ slug: { $in: [...new Set(products.map((p) => p.categoryId))] } }).select("name slug").lean();
    const categoryName = new Map(categories.map((c) => [c.slug, c.name]));

    const byProduct = new Map();
    const byCategory = new Map();
    const byMethod = new Map();
    for (const o of s.counted) {
      const total = o.pricing.totalPaise;
      const net = total - refundOf(o);
      const method = normalizePaymentMethod(o.paymentMethod);
      const m = byMethod.get(method) || { method, orders: 0, netPaise: 0 };
      m.orders += 1;
      m.netPaise += net;
      byMethod.set(method, m);

      const lineSum = o.items.reduce((sum, i) => sum + (i.lineTotalPaise || 0), 0);
      for (const item of o.items) {
        const share = lineSum > 0 ? Math.round((net * (item.lineTotalPaise || 0)) / lineSum) : 0;
        const key = String(item.productId || item.name);
        const p = byProduct.get(key) || { name: item.name, image: item.image || "", units: 0, orders: 0, netPaise: 0 };
        p.units += item.quantity || 0;
        p.orders += 1;
        p.netPaise += share;
        byProduct.set(key, p);

        const slug = categoryOf.get(String(item.productId)) || "";
        const label = categoryName.get(slug) || (slug ? slug : "Uncategorised");
        const c = byCategory.get(label) || { name: label, netPaise: 0 };
        c.netPaise += share;
        byCategory.set(label, c);
      }
    }
    const pct = (part, whole) => (whole > 0 ? Math.round((part / whole) * 1000) / 10 : 0);
    const withRupees = (r) => {
      const { netPaise, ...rest } = r;
      return { ...rest, net: toRupees(netPaise) };
    };

    return {
      basis: basisKey,
      basisLabel: basis.label,
      basisDescription: basis.description,
      bases: Object.entries(REVENUE_BASES).map(([key, b]) => ({ key, label: b.label, description: b.description })),
      windowDays,
      from,
      to: now,
      summary: {
        grossRevenue: toRupees(s.grossPaise),
        refunds: toRupees(s.refundsPaise),
        netRevenue: toRupees(s.netPaise),
        taxIncluded: toRupees(s.taxPaise),
        orders: s.ordersCount,
        refundedOrders: s.refundedOrders,
        averageOrderValue: s.ordersCount > 0 ? toRupees(Math.round(s.grossPaise / s.ordersCount)) : 0,
        pendingCollection: toRupees(s.pendingPaise),
        pendingOrders: s.pendingOrders,
        cancelledValue: toRupees(s.cancelledPaise),
        cancelledOrders: s.cancelledOrders,
        deliverySuccessRate: s.deliverySuccessRate,
        netGrowthPercent: prev ? growth(s.netPaise, prev.netPaise) : null,
        ordersGrowthPercent: prev ? growth(s.ordersCount, prev.ordersCount) : null,
        previousNetRevenue: prev ? toRupees(prev.netPaise) : null,
      },
      trend: [...trendMap.values()].map((r) => ({
        month: r.month,
        label: r.label,
        gross: toRupees(r.grossPaise),
        refunds: toRupees(r.refundsPaise),
        net: toRupees(r.grossPaise - r.refundsPaise),
        orders: r.orders,
      })),
      topProducts: [...byProduct.values()].sort((a, b) => b.netPaise - a.netPaise).slice(0, 10).map(withRupees),
      categories: [...byCategory.values()]
        .sort((a, b) => b.netPaise - a.netPaise)
        .map((c) => ({ ...withRupees(c), percent: pct(c.netPaise, s.netPaise) })),
      paymentMethods: [...byMethod.values()]
        .sort((a, b) => b.netPaise - a.netPaise)
        .map((m) => ({ ...withRupees(m), percent: pct(m.netPaise, s.netPaise) })),
    };
  }
}

export const analyticsService = new AnalyticsService();
