import crypto from "crypto";
import { config } from "../../config/index.js";
import { logger } from "../../config/logger.js";
import { ApiError } from "../../utils/apiError.js";
import { ShiprocketMock } from "./shiprocket.mock.js";

const TOKEN_TTL_MS = 9 * 24 * 60 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 20000;

// Shiprocket expects "YYYY-MM-DD HH:mm"; ISO strings are rejected
const shiprocketDate = (date = new Date()) =>
  date.toLocaleString("sv-SE", { timeZone: "Asia/Kolkata" }).slice(0, 16);

const isCodMethod = (method) => /cod|cash/i.test(String(method || ""));

const tenDigitPhone = (phone) => String(phone || "").replace(/\D/g, "").slice(-10);

export class ShiprocketAdapter {
  constructor() {
    this.email = config.SHIPROCKET_EMAIL;
    this.password = config.SHIPROCKET_PASSWORD;
    this.baseUrl = config.SHIPROCKET_BASE_URL || "https://apiv2.shiprocket.in";
    this.webhookSecret = config.SHIPROCKET_WEBHOOK_SECRET;
    this.pickupLocation = config.SHIPROCKET_PICKUP_LOCATION;

    this.isMock =
      config.NODE_ENV === "test" ||
      !this.email ||
      this.email.includes(".test") ||
      this.email === "shipping@divyamayurveda.test";

    if (config.NODE_ENV === "production" && this.isMock) {
      throw new Error("Cannot run Shiprocket mock courier adapter in production environment. Valid SHIPROCKET_EMAIL and SHIPROCKET_PASSWORD required.");
    }
    if (config.NODE_ENV === "production" && this.webhookSecret === "test_shiprocket_webhook_secret_999") {
      throw new Error("SHIPROCKET_WEBHOOK_SECRET must be set to a private value in production; the built-in default is public.");
    }

    this.mock = new ShiprocketMock();
  }

  /**
   * Obtain authenticated Shiprocket JWT token, cached in process memory (9-day TTL).
   * Concurrent callers share one in-flight login.
   */
  async getAuthToken({ forceRefresh = false } = {}) {
    if (this.isMock) return "mock_shiprocket_token";

    if (!forceRefresh && this.cachedToken && Date.now() < this.cachedTokenExpiresAt) return this.cachedToken;

    if (!this.loginInFlight) {
      this.loginInFlight = this.#login().finally(() => {
        this.loginInFlight = null;
      });
    }
    return this.loginInFlight;
  }

  async #login() {
    try {
      const response = await fetch(`${this.baseUrl}/v1/external/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: this.email, password: this.password }),
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });

      const data = await response.json();
      if (!response.ok || !data.token) {
        throw new Error(data.message || "Shiprocket authentication failed");
      }

      this.cachedToken = data.token;
      this.cachedTokenExpiresAt = Date.now() + TOKEN_TTL_MS;

      return data.token;
    } catch (err) {
      logger.error({ err: err.message }, "Shiprocket login failed");
      throw err;
    }
  }

  /**
   * Authenticated request. A 401 means the cached token was revoked or expired early, so log in again
   * and retry once.
   */
  async #request(path, { method = "GET", body, timeoutMs = REQUEST_TIMEOUT_MS } = {}) {
    const send = async (token) =>
      fetch(`${this.baseUrl}${path}`, {
        method,
        headers: {
          Authorization: `Bearer ${token}`,
          ...(body !== undefined ? { "Content-Type": "application/json" } : {}),
        },
        ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
        signal: AbortSignal.timeout(timeoutMs),
      });

    let response = await send(await this.getAuthToken());
    if (response.status === 401) {
      response = await send(await this.getAuthToken({ forceRefresh: true }));
    }
    const data = await response.json().catch(() => ({}));
    return { ok: response.ok, status: response.status, data };
  }

  /**
   * Check delivery serviceability. Failures are reported, never replaced by made-up mock results.
   */
  async checkServiceability({ pickupPincode, deliveryPincode, cod, weightGrams, timeoutMs }) {
    if (this.isMock) {
      return this.mock.checkServiceability({ pickupPincode, deliveryPincode, cod, weightGrams });
    }

    let result;
    try {
      result = await this.#request(
        `/v1/external/courier/serviceability/?pickup_postcode=${encodeURIComponent(pickupPincode)}&delivery_postcode=${encodeURIComponent(deliveryPincode)}&cod=${cod ? 1 : 0}&weight=${(weightGrams || 250) / 1000}`,
        { timeoutMs }
      );
    } catch (err) {
      logger.error({ err: err.message }, "Shiprocket serviceability request failed");
      throw ApiError.internal("Delivery check is unavailable right now. Please try again shortly.");
    }

    // Shiprocket answers 404 with a message when nothing serves the pincode; anything else non-OK is a real failure
    if (!result.ok && result.status !== 404) {
      logger.error({ status: result.status, data: result.data }, "Shiprocket serviceability returned an error");
      throw ApiError.internal("Delivery check is unavailable right now. Please try again shortly.");
    }

    const availableCouriers = result.data?.data?.available_courier_companies || [];
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
  }

  /**
   * Create the Shiprocket order, assign an AWB, then request pickup and a label.
   * Returns `awbCode: null` (status PROCESSING) when the order exists but no courier could be assigned yet.
   */
  async createShipment(orderData) {
    if (this.isMock) {
      return this.mock.createShipment(orderData);
    }

    const items = (orderData.items || []).map((it) => ({
      name: it.name,
      sku: it.sku,
      units: it.quantity,
      selling_price: Number(it.unitPricePaise) / 100,
    }));
    if (!items.length || items.some((it) => !Number.isFinite(it.selling_price) || it.selling_price <= 0)) {
      throw ApiError.badRequest("Every order item needs a valid price before a shipment can be created.");
    }

    const pickupLocation = orderData.pickupLocation || this.pickupLocation;
    const cod = isCodMethod(orderData.paymentMethod);

    // Shiprocket total = sub_total + shipping_charges - total_discount, and for COD that total is what the
    // courier collects, so it has to equal what the customer actually owes.
    const goodsPaise = (orderData.items || []).reduce((sum, it) => sum + Number(it.unitPricePaise) * Number(it.quantity), 0);
    const shippingPaise = Number(orderData.pricing?.shippingPaise || 0);
    const totalPaise = Number(orderData.pricing?.totalPaise || 0);
    const discountPaise = Math.max(0, goodsPaise + shippingPaise - totalPaise);

    const address = orderData.shippingAddress || {};
    const payload = {
      order_id: orderData.orderNumber,
      order_date: shiprocketDate(),
      pickup_location: pickupLocation,
      billing_customer_name: address.fullName || orderData.customer?.name,
      billing_address: address.street,
      billing_address_2: address.line2 || "",
      billing_city: address.city,
      billing_pincode: address.pincode,
      billing_state: address.state,
      billing_country: "India",
      billing_email: orderData.customer?.email,
      billing_phone: tenDigitPhone(address.phone || orderData.customer?.phone),
      shipping_is_billing: true,
      order_items: items,
      payment_method: cod ? "COD" : "Prepaid",
      sub_total: goodsPaise / 100,
      shipping_charges: shippingPaise / 100,
      total_discount: discountPaise / 100,
      length: orderData.dimensions?.length || 10,
      breadth: orderData.dimensions?.breadth || 10,
      height: orderData.dimensions?.height || 10,
      weight: (orderData.weightGrams || 250) / 1000,
    };

    try {
      const created = await this.#request("/v1/external/orders/create/adhoc", { method: "POST", body: payload });
      if (!created.ok) {
        logger.error({ data: created.data, orderNumber: orderData.orderNumber }, "Shiprocket order creation failed");
        throw new Error(created.data?.message || "Failed to create shipment order in Shiprocket");
      }
      const data = created.data;

      let awbCode = data.awb_code || null;
      let courierName = data.courier_name || null;
      let courierId = data.courier_company_id || null;

      // Assign the AWB when the create call did not
      if (!awbCode && data.shipment_id) {
        try {
          const awb = await this.#request("/v1/external/courier/assign/awb", {
            method: "POST",
            body: { shipment_id: data.shipment_id, ...(orderData.courierId ? { courier_id: orderData.courierId } : {}) },
          });
          const info = awb.data?.response?.data || awb.data;
          if (awb.ok && info?.awb_code) {
            awbCode = info.awb_code;
            courierName = info.courier_name || courierName;
            courierId = info.courier_company_id || courierId;
          } else {
            logger.warn({ data: awb.data, shipmentId: data.shipment_id }, "Shiprocket AWB assignment was not completed");
          }
        } catch (awbErr) {
          logger.warn({ err: awbErr.message, shipmentId: data.shipment_id }, "Shiprocket AWB assignment error");
        }
      }

      let pickupRequested = false;
      let pickupError = "";
      let labelUrl = "";
      let labelError = "";
      if (data.shipment_id && awbCode) {
        // Ask the courier to collect the parcel, then get the shipping label. Either can fail without losing the
        // shipment, so the reason is returned and saved for the admin to retry.
        try {
          await this.requestPickup(data.shipment_id);
          pickupRequested = true;
        } catch (pickupErr) {
          pickupError = pickupErr.message;
          logger.warn({ err: pickupErr.message, shipmentId: data.shipment_id }, "Shiprocket pickup request failed");
        }

        try {
          labelUrl = await this.generateLabel(data.shipment_id);
        } catch (labelErr) {
          labelError = labelErr.message;
          logger.warn({ err: labelErr.message, shipmentId: data.shipment_id }, "Shiprocket label generation failed");
        }
      }

      return {
        orderNumber: orderData.orderNumber,
        shiprocketOrderId: data.order_id,
        shipmentId: data.shipment_id,
        awbCode,
        courierName: awbCode ? courierName || "Shiprocket Courier Partner" : "",
        courierId: courierId || "",
        trackingUrl: awbCode ? `https://shiprocket.co/tracking/${awbCode}` : "",
        labelUrl,
        manifestUrl: "",
        pickupRequested,
        pickupError,
        labelError,
        status: awbCode ? "AWB_ASSIGNED" : "PROCESSING",
      };
    } catch (err) {
      logger.error({ err: err.message }, "Shiprocket create shipment error");
      throw err;
    }
  }

  /**
   * Ask the courier to collect the parcel. Throws with Shiprocket's reason when it refuses.
   */
  async requestPickup(shipmentId) {
    if (this.isMock) return this.mock.requestPickup(shipmentId);
    const result = await this.#request("/v1/external/courier/generate/pickup", {
      method: "POST",
      body: { shipment_id: [shipmentId] },
    });
    if (!result.ok) throw new Error(result.data?.message || "Shiprocket could not schedule the pickup.");
    return result.data;
  }

  /**
   * Generate the shipping label and return its URL. Throws when Shiprocket gives none.
   */
  async generateLabel(shipmentId) {
    if (this.isMock) return this.mock.generateLabel(shipmentId);
    const result = await this.#request("/v1/external/courier/generate/label", {
      method: "POST",
      body: { shipment_id: [shipmentId] },
    });
    if (!result.ok || !result.data?.label_url) {
      throw new Error(result.data?.message || "Shiprocket did not return a shipping label.");
    }
    return result.data.label_url;
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
      const result = await this.#request(`/v1/external/courier/track/awb/${encodeURIComponent(awbCode)}`);
      if (!result.ok) {
        logger.warn({ awbCode, data: result.data }, "Shiprocket track shipment API error");
        return null;
      }
      return result.data.tracking_data || result.data;
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
    const result = await this.#request("/v1/external/courier/assign/awb", {
      method: "POST",
      body: { shipment_id: shipmentId, ...(courierId ? { courier_id: courierId } : {}) },
    });
    if (!result.ok) {
      throw new Error(result.data?.message || "Failed to assign courier AWB");
    }
    return result.data.response?.data || result.data;
  }

  /**
   * Cancel courier shipment
   */
  async cancelShipment(awbCode) {
    if (this.isMock) {
      return this.mock.cancelShipment(awbCode);
    }
    if (!awbCode) return { success: false, message: "AWB code is required" };
    const result = await this.#request("/v1/external/orders/cancel/shipment/awbs", {
      method: "POST",
      body: { awbs: [awbCode] },
    });
    return { success: result.ok, ...result.data };
  }

  /**
   * Cancel the Shiprocket order itself (after its AWB is cancelled), so nothing stays open in your Shiprocket panel
   */
  async cancelOrder(shiprocketOrderId) {
    if (this.isMock) return this.mock.cancelOrder(shiprocketOrderId);
    if (!shiprocketOrderId) return { success: false, message: "Shiprocket order id is required" };
    const result = await this.#request("/v1/external/orders/cancel", {
      method: "POST",
      body: { ids: [Number(shiprocketOrderId) || shiprocketOrderId] },
    });
    return { success: result.ok, ...result.data };
  }

  /**
   * Verify the Shiprocket tracking webhook token (constant-time comparison)
   */
  verifyWebhook(req) {
    const token = req.headers["x-shiprocket-token"] || req.headers["x-api-key"];
    if (!token) return false;
    const secret = this.webhookSecret || config.SHIPROCKET_WEBHOOK_SECRET;
    const a = Buffer.from(String(token));
    const b = Buffer.from(String(secret));
    return a.length === b.length && crypto.timingSafeEqual(a, b);
  }
}

export const shiprocket = new ShiprocketAdapter();
