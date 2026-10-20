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
      if (!response.ok) {
        logger.error({ data, orderNumber: orderData.orderNumber }, "Shiprocket order creation failed");
        throw new Error(data.message || "Failed to create shipment order in Shiprocket");
      }

      let awbCode = data.awb_code || null;
      let courierName = data.courier_name || null;
      let courierId = data.courier_company_id || null;

      // Assign AWB immediately if not provided in adhoc response
      if (!awbCode && data.shipment_id) {
        try {
          const awbRes = await fetch(`${this.baseUrl}/v1/external/courier/assign/awb`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              shipment_id: data.shipment_id,
              ...(orderData.courierId ? { courier_id: orderData.courierId } : {}),
            }),
          });
          const awbData = await awbRes.json();
          if (awbRes.ok && (awbData?.response?.data?.awb_code || awbData?.awb_code)) {
            awbCode = awbData?.response?.data?.awb_code || awbData?.awb_code;
            courierName = awbData?.response?.data?.courier_name || awbData?.courier_name || courierName;
            courierId = awbData?.response?.data?.courier_company_id || awbData?.courier_company_id || courierId;
          }
        } catch (awbErr) {
          logger.warn({ err: awbErr.message, shipmentId: data.shipment_id }, "Immediate Shiprocket AWB assignment attempt error");
        }
      }

      // Generate shipping label PDF URL if shipment and AWB exist
      let labelUrl = "";
      if (data.shipment_id && awbCode) {
        try {
          const labelRes = await fetch(`${this.baseUrl}/v1/external/courier/generate/label`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${token}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({ shipment_id: [data.shipment_id] }),
          });
          const labelData = await labelRes.json();
          if (labelRes.ok && labelData?.label_url) {
            labelUrl = labelData.label_url;
          }
        } catch {}
      }

      return {
        orderNumber: orderData.orderNumber,
        shiprocketOrderId: data.order_id,
        shipmentId: data.shipment_id,
        awbCode: awbCode,
        courierName: courierName || "Shiprocket Courier Partner",
        courierId: courierId || "",
        trackingUrl: awbCode ? `https://shiprocket.co/tracking/${awbCode}` : "",
        labelUrl,
        manifestUrl: "",
        status: awbCode ? "AWB_ASSIGNED" : "PROCESSING",
      };
    } catch (err) {
      logger.error({ err: err.message }, "Shiprocket create shipment error");
      throw err;
    }
  }

  /**
   * Fetch live tracking details from Shiprocket courier partner
   */
  async trackShipment(awbCode) {
    if (this.isMock) {
      return this.mock.trackShipment(awbCode);
    }
    if (!awbCode) return null;

    try {
      const token = await this.getAuthToken();
      const response = await fetch(`${this.baseUrl}/v1/external/courier/track/awb/${encodeURIComponent(awbCode)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (!response.ok) {
        logger.warn({ awbCode, data }, "Shiprocket track shipment API error");
        return null;
      }
      return data.tracking_data || data;
    } catch (err) {
      logger.error({ err: err.message, awbCode }, "Shiprocket tracking API request failed");
      return null;
    }
  }

  /**
   * Explicitly assign courier and AWB to existing Shiprocket shipment
   */
  async assignCourierAwb(shipmentId, courierId = null) {
    if (this.isMock) {
      return this.mock.assignAwb(shipmentId, courierId);
    }
    const token = await this.getAuthToken();
    const response = await fetch(`${this.baseUrl}/v1/external/courier/assign/awb`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        shipment_id: shipmentId,
        ...(courierId ? { courier_id: courierId } : {}),
      }),
    });
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.message || "Failed to assign courier AWB");
    }
    return data.response?.data || data;
  }

  /**
   * Cancel courier shipment
   */
  async cancelShipment(awbCode) {
    if (this.isMock) {
      return this.mock.cancelShipment(awbCode);
    }
    if (!awbCode) return { success: false, message: "AWB code is required" };
    const token = await this.getAuthToken();
    const response = await fetch(`${this.baseUrl}/v1/external/orders/cancel/shipment/awbs`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ awbs: [awbCode] }),
    });
    return response.json();
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
