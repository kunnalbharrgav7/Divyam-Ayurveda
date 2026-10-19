import { config } from "../../config/index.js";
import { logger } from "../../config/logger.js";
import { getRedisClient } from "../../config/redis.js";
import { ShiprocketMock } from "./shiprocket.mock.js";

const TOKEN_CACHE_KEY = "shiprocket:jwt_token";

export class ShiprocketAdapter {
  constructor() {
    this.email = config.SHIPROCKET_EMAIL;
    this.password = config.SHIPROCKET_PASSWORD;
    this.baseUrl = config.SHIPROCKET_BASE_URL || "https://apiv2.shiprocket.in";
    this.webhookSecret = config.SHIPROCKET_WEBHOOK_SECRET;

    this.isMock =
      config.NODE_ENV === "test" ||
      !this.email ||
      this.email.includes(".test") ||
      this.email === "shipping@divyamayurveda.test";

    if (config.NODE_ENV === "production" && this.isMock) {
      throw new Error("Cannot run Shiprocket mock courier adapter in production environment. Valid SHIPROCKET_EMAIL and SHIPROCKET_PASSWORD required.");
    }

    this.mock = new ShiprocketMock();
  }

  /**
   * Obtain authenticated Shiprocket JWT token with Redis caching (10-day TTL)
   */
  async getAuthToken() {
    if (this.isMock) return "mock_shiprocket_token";

    const redis = getRedisClient();
    try {
      const cached = await redis.get(TOKEN_CACHE_KEY);
      if (cached) return cached;
    } catch {}

    try {
      const response = await fetch(`${this.baseUrl}/v1/external/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: this.email, password: this.password }),
      });

      const data = await response.json();
      if (!response.ok || !data.token) {
        throw new Error(data.message || "Shiprocket authentication failed");
      }

      try {
        await redis.setex(TOKEN_CACHE_KEY, 86400 * 9, data.token); // 9 days
      } catch {}

      return data.token;
    } catch (err) {
      logger.error({ err: err.message }, "Shiprocket login failed");
      throw err;
    }
  }

  /**
   * Check delivery serviceability
   */
  async checkServiceability({ pickupPincode, deliveryPincode, cod, weightGrams }) {
    if (this.isMock) {
      return this.mock.checkServiceability({ pickupPincode, deliveryPincode, cod, weightGrams });
    }

    try {
      const token = await this.getAuthToken();
      const url = `${this.baseUrl}/v1/external/courier/serviceability/?pickup_postcode=${pickupPincode}&delivery_postcode=${deliveryPincode}&cod=${cod ? 1 : 0}&weight=${weightGrams / 1000}`;
      const response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const data = await response.json();
      const availableCouriers = data?.data?.available_courier_companies || [];
      if (!availableCouriers.length) {
        return { serviceable: false };
      }

      const best = availableCouriers[0];
      return {
        serviceable: true,
        rate: best.rate,
        courierName: best.courier_name,
        courierId: best.courier_company_id,
        etdDays: best.etd,
        codAvailable: Boolean(best.cod),
      };
    } catch (err) {
      logger.warn({ err: err.message }, "Shiprocket serviceability check error, falling back to mock");
      return this.mock.checkServiceability({ pickupPincode, deliveryPincode, cod, weightGrams });
    }
  }

  /**
   * Create shipment order and generate AWB
   */
  async createShipment(orderData) {
    if (this.isMock) {
      return this.mock.createShipment(orderData);
    }

    // Call live Shiprocket order creation API
    try {
      const token = await this.getAuthToken();
      const payload = {
        order_id: orderData.orderNumber,
        order_date: new Date().toISOString(),
        pickup_location: orderData.pickupLocation || "Primary Dispensary",
        billing_customer_name: orderData.customer.name,
        billing_address: orderData.shippingAddress.street,
        billing_city: orderData.shippingAddress.city,
        billing_pincode: orderData.shippingAddress.pincode,
        billing_state: orderData.shippingAddress.state,
        billing_country: "India",
        billing_email: orderData.customer.email,
        billing_phone: orderData.customer.phone,
        shipping_is_billing: true,
        order_items: orderData.items.map((it) => ({
          name: it.name,
          sku: it.sku,
          units: it.quantity,
          selling_price: it.pricePaise / 100,
        })),
        payment_method: orderData.paymentMethod === "cod" ? "COD" : "Prepaid",
        sub_total: orderData.pricing.subtotalPaise / 100,
        length: 10,
        breadth: 10,
        height: 10,
        weight: (orderData.weightGrams || 250) / 1000,
      };

      const response = await fetch(`${this.baseUrl}/v1/external/orders/create/adhoc`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      return {
        orderNumber: orderData.orderNumber,
        shiprocketOrderId: data.order_id,
        shipmentId: data.shipment_id,
        awbCode: data.awb_code || `AWB-${Date.now()}`,
        courierName: data.courier_name || "Shiprocket Standard",
        courierId: data.courier_company_id || "",
        trackingUrl: `https://shiprocket.co/tracking/${data.awb_code}`,
        labelUrl: "",
        manifestUrl: "",
        status: "CREATED",
      };
    } catch (err) {
      logger.error({ err: err.message }, "Shiprocket create shipment error");
      throw err;
    }
  }

  /**
   * Verify Shiprocket tracking webhook token or signature
   */
  verifyWebhook(req) {
    const token = req.headers["x-shiprocket-token"] || req.headers["x-api-key"];
    if (!token) return false;
    const secret = this.webhookSecret || config.SHIPROCKET_WEBHOOK_SECRET || "test_shiprocket_webhook_secret_999";
    return token === secret;
  }
}

export const shiprocket = new ShiprocketAdapter();
