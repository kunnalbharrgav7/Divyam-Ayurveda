import crypto from "crypto";

export class ShiprocketMock {
  constructor() {
    this.shipments = new Map();
  }

  async checkServiceability({ pickupPincode, deliveryPincode, cod, weightGrams }) {
    const isServiceable = deliveryPincode && deliveryPincode.length === 6 && !isNaN(deliveryPincode);
    const isFast = ["11", "40", "56", "70", "60", "50", "38", "41", "30"].includes(
      deliveryPincode?.substring(0, 2)
    );

    return {
      serviceable: isServiceable,
      rate: isFast ? 40 : 65,
      courierName: isFast ? "Bluedart Express" : "Delhivery Surface",
      courierId: isFast ? 101 : 202,
      etdDays: isFast ? "1-2 days" : "3-5 days",
      codAvailable: Boolean(cod),
    };
  }

  async createShipment({ orderNumber, items, customer, shippingAddress, weightGrams }) {
    const shipmentId = `sr_ship_${crypto.randomInt(100000, 999999)}`;
    const awbCode = `AWB${Date.now()}`;
    const courierName = "Bluedart Air";

    const data = {
      orderNumber,
      shiprocketOrderId: `sr_ord_${Date.now()}`,
      shipmentId,
      awbCode,
      courierName,
      courierId: "12",
      trackingUrl: `https://shiprocket.co/tracking/${awbCode}`,
      labelUrl: `https://shiprocket.co/labels/${shipmentId}.pdf`,
      manifestUrl: `https://shiprocket.co/manifests/${shipmentId}.pdf`,
      status: "AWB_ASSIGNED",
    };

    this.shipments.set(orderNumber, data);
    return data;
  }

  async assignAwb(shipmentId, courierId = null) {
    const awbCode = `AWB${Date.now()}`;
    return {
      awb_code: awbCode,
      courier_company_id: courierId || 12,
      courier_name: "Bluedart Air",
    };
  }

  async trackShipment(awbCode) {
    const shipment = Array.from(this.shipments.values()).find((s) => s.awbCode === awbCode);
    return {
      track_status: 1,
      shipment_status: 7,
      shipment_track: [
        {
          id: 1,
          awb_code: awbCode,
          current_status: shipment?.status || "IN_TRANSIT",
          courier_name: shipment?.courierName || "Bluedart Air",
          delivered_to: "Customer",
          destination: "Bengaluru",
          origin: "Bengaluru Dispensary Hub",
        },
      ],
      shipment_track_activities: [
        {
          date: new Date().toISOString(),
          status: shipment?.status || "IN_TRANSIT",
          activity: "Package in transit with courier partner",
          location: "Bengaluru Hub",
        },
      ],
      track_url: `https://shiprocket.co/tracking/${awbCode}`,
    };
  }

  async cancelShipment(awbCode) {
    return {
      success: true,
      message: `Shipment with AWB ${awbCode} cancelled successfully.`,
    };
  }
}

