import { describe, it, expect } from "vitest";
import { priceBasket, allocateProportionally, gstInInclusive, gstOnExclusive } from "../../src/services/pricing.service.js";
import { resolveDestination, findPinException, rangesOverlap } from "../../src/utils/shippingRules.js";
import { canonicalState, statesCompatible } from "../../src/utils/indianStates.js";
import { defaultZones } from "../../src/constants/shippingDefaults.js";

/**
 * The pricing engine on its own (no database): zones, PIN exceptions, free delivery, express and GST.
 * Rupee examples are the ones in the shipping & tax brief.
 */
const settingsFor = (over = {}) => ({
  shipping: {
    originState: "Uttar Pradesh",
    expressShippingFee: 99,
    expressEnabled: true,
    expressEstimate: "1–2 business days",
    zones: defaultZones(),
    pinExceptions: [],
    ...(over.shipping || {}),
  },
  tax: {
    taxIncludedInPrice: true,
    standardGstRate: 12,
    shippingTaxMode: "none",
    shippingGstRate: 0,
    ...(over.tax || {}),
  },
});

// One product line priced at `rupees` in total
const line = (rupees, extra = {}) => ({
  productId: "p1",
  name: "Test",
  size: "Std",
  quantity: 1,
  unitPricePaise: Math.round(rupees * 100),
  mrpUnitPaise: Math.round(rupees * 100),
  gstRate: null,
  hsnCode: "",
  ...extra,
});

const price = (rupees, state, { method = "standard", settings = settingsFor(), express = true, ...rest } = {}) =>
  priceBasket({
    settings,
    lines: [line(rupees)],
    address: { state, pincode: "201301" },
    deliveryMethod: method,
    expressAvailable: express,
    ...rest,
  });

const rs = (paise) => paise / 100;

describe("Zones and standard shipping", () => {
  it("Local (Uttar Pradesh): ₹400 pays ₹40, ₹499 and ₹600 ship free", () => {
    expect(rs(price(400, "Uttar Pradesh").shipping.totalPaise)).toBe(40);
    expect(rs(price(499, "Uttar Pradesh").shipping.totalPaise)).toBe(0);
    expect(rs(price(600, "Uttar Pradesh").shipping.totalPaise)).toBe(0);
    expect(price(400, "Uttar Pradesh").zone.tier).toBe("Local");
  });

  it("Rest of India: ₹500 pays ₹80, ₹799 and ₹900 ship free", () => {
    for (const state of ["Madhya Pradesh", "Maharashtra", "Gujarat", "Kerala", "Tamil Nadu"]) {
      expect(price(500, state).zone.tier).toBe("Rest of India");
      expect(rs(price(500, state).shipping.totalPaise)).toBe(80);
      expect(rs(price(799, state).shipping.totalPaise)).toBe(0);
      expect(rs(price(900, state).shipping.totalPaise)).toBe(0);
    }
  });

  it("Remote: ₹1,000 pays ₹120, ₹1,299 and ₹1,500 ship free", () => {
    for (const state of ["Assam", "Arunachal Pradesh", "Jammu and Kashmir", "Ladakh", "Andaman and Nicobar Islands"]) {
      expect(price(1000, state).zone.tier).toBe("Remote");
      expect(rs(price(1000, state).shipping.totalPaise)).toBe(120);
      expect(rs(price(1299, state).shipping.totalPaise)).toBe(0);
      expect(rs(price(1500, state).shipping.totalPaise)).toBe(0);
    }
  });

  it("union territories without a rule fall to Rest of India, never to the cheapest zone", () => {
    for (const state of ["Delhi", "Chandigarh", "Puducherry"]) {
      expect(price(100, state).zone.tier).toBe("Rest of India");
    }
  });

  it("reports the delivery estimate and the remaining amount for free delivery", () => {
    const b = price(450, "Uttar Pradesh");
    expect(b.shipping.estimate).toBe("1–3 business days");
    expect(rs(b.amountNeededForFreePaise)).toBe(49);
    expect(b.freeProgressPercent).toBe(90);
    expect(price(499, "Uttar Pradesh").amountNeededForFreePaise).toBe(0);
  });

  it("judges free delivery on the discounted selling price, not on MRP or delivery", () => {
    // MRP ₹900 but sells at ₹450: below the ₹499 local minimum
    const mrpHeavy = priceBasket({
      settings: settingsFor(),
      lines: [line(450, { mrpUnitPaise: 90000 })],
      address: { state: "Uttar Pradesh", pincode: "201301" },
    });
    expect(rs(mrpHeavy.shipping.totalPaise)).toBe(40);
    expect(rs(mrpHeavy.eligibleSubtotalPaise)).toBe(450);

    // ₹520 of products, ₹50 offer: ₹470 is under the minimum, so delivery is charged
    const withOffer = price(520, "Uttar Pradesh", { offerDiscountPaise: 5000 });
    expect(rs(withOffer.eligibleSubtotalPaise)).toBe(470);
    expect(rs(withOffer.shipping.totalPaise)).toBe(40);

    // referral discounts count the same way
    expect(rs(price(520, "Uttar Pradesh", { referralDiscountPaise: 5000 }).shipping.totalPaise)).toBe(40);
  });

  it("store credit is a payment method, not a discount: it does not affect free delivery", () => {
    const b = price(499, "Uttar Pradesh", { storeCreditPaise: 20000 });
    expect(b.shipping.totalPaise).toBe(0);
    expect(rs(b.amountDuePaise)).toBe(299);
  });
});

describe("Express delivery", () => {
  it("adds the surcharge on top of the zone's standard fee", () => {
    expect(rs(price(400, "Uttar Pradesh", { method: "express" }).shipping.totalPaise)).toBe(139);
    expect(rs(price(500, "Madhya Pradesh", { method: "express" }).shipping.totalPaise)).toBe(179);
    expect(rs(price(1000, "Assam", { method: "express" }).shipping.totalPaise)).toBe(219);
  });

  it("leaves only the surcharge when standard delivery is free", () => {
    for (const [amount, state] of [[600, "Uttar Pradesh"], [900, "Maharashtra"], [1500, "Ladakh"]]) {
      const b = price(amount, state, { method: "express" });
      expect(b.shipping.freeApplied).toBe(true);
      expect(b.shipping.standardFeePaise).toBe(0);
      expect(rs(b.shipping.totalPaise)).toBe(99);
    }
  });

  it("follows the surcharge saved by the admin, never a hardcoded amount", () => {
    const settings = settingsFor({ shipping: { expressShippingFee: 150 } });
    expect(rs(price(400, "Uttar Pradesh", { method: "express", settings }).shipping.totalPaise)).toBe(190);
  });

  it("is refused where the courier cannot do it, or when it is switched off", () => {
    expect(() => price(400, "Uttar Pradesh", { method: "express", express: false })).toThrow(/Express delivery isn't available/);
    const off = settingsFor({ shipping: { expressEnabled: false } });
    expect(() => price(400, "Uttar Pradesh", { method: "express", settings: off })).toThrow(/Express delivery is not available/);
  });

  it("uses the admin's express estimate", () => {
    expect(price(400, "Uttar Pradesh", { method: "express" }).shipping.estimate).toBe("1–2 business days");
    const custom = settingsFor({ shipping: { expressEstimate: "Next business day" } });
    expect(price(400, "Uttar Pradesh", { method: "express", settings: custom }).shipping.estimate).toBe("Next business day");
  });
});

describe("Destination rules", () => {
  it("a PIN-code exception beats the state rule, and a single PIN beats a wider range", () => {
    const settings = settingsFor();
    const remote = settings.shipping.zones.find((z) => z.tier === "Remote").id;
    const rest = settings.shipping.zones.find((z) => z.tier === "Rest of India").id;
    settings.shipping.pinExceptions = [
      { id: "range", from: "246000", to: "246999", zoneId: remote },
      { id: "single", from: "246445", to: "246445", zoneId: rest },
    ];
    const at = (pincode) => resolveDestination({ settings, state: "Uttar Pradesh", pincode });
    expect(at("246100").zone.tier).toBe("Remote");
    expect(at("246100").via).toBe("pin");
    expect(at("246445").zone.tier).toBe("Rest of India"); // narrowest range wins
    expect(at("201301").zone.tier).toBe("Local"); // outside every exception: the state rule
    expect(at("201301").via).toBe("origin");
  });

  it("refuses an unknown state instead of picking a rate", () => {
    const r = resolveDestination({ settings: settingsFor(), state: "Atlantis", pincode: "201301" });
    expect(r.ok).toBe(false);
    expect(r.code).toBe("UNKNOWN_STATE");
    expect(() => price(500, "Atlantis")).toThrow(/valid state/);
    expect(() => price(500, "")).toThrow(/valid state/);
  });

  it("a switched-off zone means no delivery there, not a cheaper rate", () => {
    const settings = settingsFor();
    settings.shipping.zones.find((z) => z.tier === "Remote").enabled = false;
    expect(() => price(2000, "Ladakh", { settings })).toThrow(/don't deliver/);
    expect(price(2000, "Maharashtra", { settings }).zone.tier).toBe("Rest of India");
  });

  it("understands common spellings of states", () => {
    expect(canonicalState("Orissa")).toBe("Odisha");
    expect(canonicalState("jammu & kashmir")).toBe("Jammu and Kashmir");
    expect(canonicalState("NCT of Delhi")).toBe("Delhi");
    expect(canonicalState("Andaman & Nicobar Islands")).toBe("Andaman and Nicobar Islands");
    expect(canonicalState("Nowhere")).toBeNull();
    expect(price(500, "Orissa").zone.tier).toBe("Rest of India");
    expect(price(500, "ladakh").zone.tier).toBe("Remote");
  });

  it("flags a PIN directory state that clearly disagrees with the chosen state", () => {
    expect(statesCompatible("Kerala", "Kerala")).toBe(true);
    expect(statesCompatible("Ladakh", "Jammu and Kashmir")).toBe(true); // older listing
    expect(statesCompatible("Telangana", "Andhra Pradesh")).toBe(true);
    expect(statesCompatible("Delhi", "Kerala")).toBe(false);
    expect(statesCompatible("Kerala", null)).toBe(true); // nothing to compare against
  });

  it("detects overlapping PIN ranges and rejects malformed PINs", () => {
    expect(rangesOverlap({ from: "110001", to: "110050" }, { from: "110050", to: "110099" })).toBe(true);
    expect(rangesOverlap({ from: "110001", to: "110049" }, { from: "110050", to: "110099" })).toBe(false);
    expect(findPinException([{ id: "a", from: "110001", to: "110099", zoneId: "z" }], "12345")).toBeNull();
    expect(findPinException([{ id: "a", from: "110001", to: "110099", zoneId: "z" }], "110050").id).toBe("a");
  });
});

describe("GST", () => {
  it("inclusive prices: ₹1,120 at 12% contains ₹1,000 + ₹120 (intra-state CGST ₹60 + SGST ₹60)", () => {
    const b = priceBasket({
      settings: settingsFor(),
      lines: [line(1120, { gstRate: 12 })],
      address: { state: "Uttar Pradesh", pincode: "201301" },
    });
    expect(rs(b.lines[0].taxablePaise)).toBe(1000);
    expect(rs(b.tax.goodsTaxPaise)).toBe(120);
    expect(b.tax.type).toBe("intra_state");
    expect([rs(b.tax.cgstPaise), rs(b.tax.sgstPaise), rs(b.tax.igstPaise)]).toEqual([60, 60, 0]);
    expect(rs(b.totalPaise)).toBe(1120); // GST is never added a second time
  });

  it("inclusive prices sent to another state: IGST ₹120", () => {
    const b = priceBasket({
      settings: settingsFor(),
      lines: [line(1120, { gstRate: 12 })],
      address: { state: "Madhya Pradesh", pincode: "452001" },
    });
    expect(b.tax.type).toBe("inter_state");
    expect([rs(b.tax.cgstPaise), rs(b.tax.sgstPaise), rs(b.tax.igstPaise)]).toEqual([0, 0, 120]);
    expect(rs(b.totalPaise)).toBe(1120);
  });

  it("exclusive prices: ₹1,000 plus 12% = ₹1,120", () => {
    const b = priceBasket({
      settings: settingsFor({ tax: { taxIncludedInPrice: false } }),
      lines: [line(1000, { gstRate: 12 })],
      address: { state: "Uttar Pradesh", pincode: "201301" },
    });
    expect(b.priceMode).toBe("exclusive");
    expect(rs(b.lines[0].taxablePaise)).toBe(1000);
    expect(rs(b.tax.goodsTaxPaise)).toBe(120);
    expect(rs(b.totalPaise)).toBe(1120);
  });

  it("each product uses its own GST rate; products without one use the store default", () => {
    const b = priceBasket({
      settings: settingsFor(),
      lines: [line(1050, { gstRate: 5 }), line(1180, { gstRate: 18 }), line(1120)], // default 12%
      address: { state: "Maharashtra", pincode: "400001" },
    });
    expect(b.lines.map((l) => l.gstRate)).toEqual([5, 18, 12]);
    expect(b.lines.map((l) => rs(l.taxPaise))).toEqual([50, 180, 120]);
    expect(rs(b.tax.totalPaise)).toBe(350);
    expect(rs(b.tax.igstPaise)).toBe(350);
  });

  it("a 0% product has no tax", () => {
    const b = priceBasket({
      settings: settingsFor(),
      lines: [line(500, { gstRate: 0 })],
      address: { state: "Uttar Pradesh", pincode: "201301" },
    });
    expect(b.tax.totalPaise).toBe(0);
  });

  it("discounts reduce each line's taxable value in proportion, and add up exactly", () => {
    const b = priceBasket({
      settings: settingsFor(),
      lines: [line(1000, { gstRate: 5 }), line(1000, { gstRate: 18 }), line(333, { gstRate: 12 })],
      address: { state: "Uttar Pradesh", pincode: "201301" },
      offerDiscountPaise: 12345,
    });
    expect(b.lines.reduce((s, l) => s + l.discountPaise, 0)).toBe(12345);
    expect(b.lines.reduce((s, l) => s + l.netPaise, 0)).toBe(b.eligibleSubtotalPaise);
    for (const l of b.lines) expect(l.taxablePaise + l.taxPaise).toBe(l.netPaise);
  });

  it("delivery has no GST line unless the store has set a rate for it", () => {
    expect(price(400, "Uttar Pradesh").shipping.taxPaise).toBe(0);
    const fixed = settingsFor({ tax: { shippingTaxMode: "fixed", shippingGstRate: 18 } });
    const inclusive = price(400, "Madhya Pradesh", { settings: fixed });
    expect(rs(inclusive.shipping.totalPaise)).toBe(80);
    expect(rs(inclusive.shipping.taxPaise)).toBe(12.2); // 18% contained in ₹80
    expect(inclusive.tax.shippingTaxPaise).toBe(1220);
    expect(rs(inclusive.totalPaise)).toBe(480); // not added a second time

    const exclusiveSettings = settingsFor({ tax: { shippingTaxMode: "fixed", shippingGstRate: 18, taxIncludedInPrice: false } });
    const exclusive = price(400, "Madhya Pradesh", { settings: exclusiveSettings });
    expect(rs(exclusive.shipping.taxPaise)).toBe(14.4);
    expect(rs(exclusive.shipping.payablePaise)).toBe(94.4);
  });
});

describe("Arithmetic guarantees", () => {
  it("allocateProportionally always sums to the total", () => {
    for (let n = 0; n < 500; n += 1) {
      const weights = Array.from({ length: 1 + (n % 6) }, (_, i) => 1 + ((n * 7919 + i * 104729) % 9973));
      const total = (n * 31) % 5000;
      const parts = allocateProportionally(total, weights);
      expect(parts.reduce((a, b) => a + b, 0)).toBe(total);
      expect(parts.every((p) => Number.isInteger(p) && p >= 0)).toBe(true);
    }
  });

  it("GST helpers round to whole paise", () => {
    expect(gstInInclusive(112000, 1200)).toBe(12000);
    expect(gstOnExclusive(100000, 1200)).toBe(12000);
    expect(Number.isInteger(gstInInclusive(99999, 1800))).toBe(true);
  });

  it("every total is the sum of its parts, for many random baskets", () => {
    const states = ["Uttar Pradesh", "Madhya Pradesh", "Kerala", "Assam", "Ladakh", "Delhi", "Goa"];
    for (let n = 0; n < 400; n += 1) {
      const inclusive = n % 2 === 0;
      const settings = settingsFor({ tax: { taxIncludedInPrice: inclusive, shippingTaxMode: n % 3 === 0 ? "fixed" : "none", shippingGstRate: 18 } });
      const lines = Array.from({ length: 1 + (n % 4) }, (_, i) => ({
        ...line(37 + ((n * 53 + i * 211) % 900) + ((n * 7) % 100) / 100, { gstRate: [null, 0, 5, 12, 18][(n + i) % 5], quantity: 1 + ((n + i) % 3) }),
      }));
      const b = priceBasket({
        settings,
        lines,
        address: { state: states[n % states.length], pincode: "201301" },
        deliveryMethod: n % 5 === 0 ? "express" : "standard",
        expressAvailable: true,
        offerDiscountPaise: (n * 137) % 4000,
        referralDiscountPaise: n % 4 === 0 ? (n * 61) % 1500 : 0,
      });
      const linesTotal = b.lines.reduce((s, l) => s + l.payablePaise, 0);
      expect(b.totalPaise).toBe(linesTotal + b.shipping.payablePaise);
      expect(b.tax.totalPaise).toBe(b.tax.cgstPaise + b.tax.sgstPaise + b.tax.igstPaise);
      expect(b.tax.totalPaise).toBe(b.tax.goodsTaxPaise + b.tax.shippingTaxPaise);
      expect(b.shipping.totalPaise).toBe(b.shipping.standardFeePaise + b.shipping.expressSurchargePaise);
      expect(b.eligibleSubtotalPaise).toBe(b.sellingPaise - b.discountPaise);
      expect(Number.isInteger(b.totalPaise)).toBe(true);
    }
  });
});
