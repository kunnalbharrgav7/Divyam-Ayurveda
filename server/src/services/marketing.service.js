import { Order } from "../models/Order.js";
import { config } from "../config/index.js";
import { logger } from "../config/logger.js";
import { metaCapi, buildUserData } from "../integrations/meta/metaCapi.adapter.js";
import { PAYMENT_STATUS } from "../constants/paymentStatus.js";
import { PAYMENT_METHODS } from "../constants/paymentMethods.js";

/**
 * Ad conversion events sent from the server (Meta Conversions API).
 * The browser Pixel sends the same Purchase with the same event id, so Meta counts it once.
 */
export const purchaseEventId = (orderNumber) => `purchase.${orderNumber}`;

export class MarketingService {
  /**
   * Report a purchase once per order: when a COD order is placed, or when an online order is paid.
   * The order is marked first (atomically), so retries, webhooks and status checks can never send it twice.
   */
  async sendPurchase(orderNumber) {
    try {
      if (!metaCapi.enabled) return { sent: false, reason: "disabled" };
      const order = await Order.findOneAndUpdate(
        {
          orderNumber,
          metaPurchaseSentAt: null,
          status: { $ne: "cancelled" },
          $or: [{ paymentStatus: PAYMENT_STATUS.SUCCEEDED }, { paymentMethod: PAYMENT_METHODS.COD }],
        },
        { $set: { metaPurchaseSentAt: new Date() } },
        { new: true }
      );
      if (!order) return { sent: false, reason: "not_eligible_or_already_sent" };

      const attribution = order.attribution || {};
      const event = {
        event_name: "Purchase",
        event_id: purchaseEventId(order.orderNumber),
        event_time: Math.floor(Date.now() / 1000),
        action_source: "website",
        event_source_url: attribution.landingUrl || `${config.APP_URL.replace(/\/+$/, "")}/checkout`,
        user_data: buildUserData({
          email: order.customer?.email,
          phone: order.customer?.phone,
          name: order.customer?.name,
          city: order.shippingAddress?.city,
          state: order.shippingAddress?.state,
          pincode: order.shippingAddress?.pincode,
          externalId: order.userId ? String(order.userId) : "",
          clientIp: attribution.clientIp,
          userAgent: attribution.userAgent,
          fbp: attribution.fbp,
          fbc: attribution.fbc,
        }),
        custom_data: {
          currency: "INR",
          value: Math.round(order.pricing?.totalPaise || 0) / 100,
          order_id: order.orderNumber,
          content_type: "product",
          content_ids: (order.items || []).map((i) => String(i.productId || i.sku)),
          contents: (order.items || []).map((i) => ({
            id: String(i.productId || i.sku),
            quantity: i.quantity,
            item_price: Math.round(i.unitPricePaise || 0) / 100,
          })),
          num_items: (order.items || []).reduce((sum, i) => sum + (i.quantity || 0), 0),
        },
      };
      const result = await metaCapi.sendEvent(event);
      if (!result.sent) logger.warn({ orderNumber, reason: result.reason }, "Meta Purchase event not delivered");
      return result;
    } catch (err) {
      logger.error({ orderNumber, err: err.message }, "Could not send Meta Purchase event");
      return { sent: false, reason: "error" };
    }
  }
}

export const marketingService = new MarketingService();
