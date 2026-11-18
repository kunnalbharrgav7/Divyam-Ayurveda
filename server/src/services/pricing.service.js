import mongoose from "mongoose";
import { Product } from "../models/Product.js";
import { ProductVariant } from "../models/ProductVariant.js";
import { settingsService } from "./settings.service.js";
import { shipmentService } from "./shipment.service.js";
import { pincodeService } from "./pincode.service.js";
import { resolveDestination, isValidPin } from "../utils/shippingRules.js";
import { canonicalState, sameState, statesCompatible } from "../utils/indianStates.js";
import { ApiError } from "../utils/apiError.js";
import { logger } from "../config/logger.js";

/**
 * The one place where a basket is priced: goods, discounts, free-delivery eligibility, standard and express
 * delivery, GST, and the final amount. The storefront shows what this returns; checkout, the payment request,
 * the saved order, refunds and invoices all use the same figures.
 *
 * All money is integer paise. Nothing here trusts an amount from the browser: callers pass lines whose prices
 * come from the database, and discounts that the server has already verified.
 */

const toBp = (percent) => Math.round(Number(percent || 0) * 100); // 12.5 % -> 1250 basis points
const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

/** Splits `total` across `weights` in proportion, in whole paise, so the parts always add up exactly. */
export const allocateProportionally = (total, weights) => {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (total <= 0 || sum <= 0) return weights.map(() => 0);
  const raw = weights.map((w) => (total * w) / sum);
  const parts = raw.map(Math.floor);
  let left = total - parts.reduce((a, b) => a + b, 0);
  const order = raw
    .map((r, i) => ({ i, frac: r - Math.floor(r) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (let k = 0; left > 0; k = (k + 1) % order.length, left -= 1) parts[order[k].i] += 1;
  return parts;
};

/** GST contained in a tax-inclusive amount */
export const gstInInclusive = (grossPaise, rateBp) => Math.round((grossPaise * rateBp) / (10000 + rateBp));
/** GST to add on a tax-exclusive amount */
export const gstOnExclusive = (netPaise, rateBp) => Math.round((netPaise * rateBp) / 10000);

/**
 * Pure calculation. `lines` need: quantity, unitPricePaise, mrpUnitPaise, gstRate (percent or null), hsnCode.
 * Throws ApiError for an address that cannot be priced (unknown state, switched-off zone) or an express
 * request the destination cannot take.
 */
export const priceBasket = ({
  settings,
  lines,
  address,
  deliveryMethod = "standard",
  offerDiscountPaise = 0,
  referralDiscountPaise = 0,
  storeCreditPaise = 0,
  expressAvailable = false,
}) => {
  if (!Array.isArray(lines) || lines.length === 0) throw ApiError.badRequest("Your basket is empty.");

  const dest = resolveDestination({ settings, state: address?.state, pincode: address?.pincode });
  if (!dest.ok) throw ApiError.badRequest(dest.message, { code: dest.code });

  const shippingCfg = settings.shipping || {};
  const taxCfg = settings.tax || {};
  const inclusive = taxCfg.taxIncludedInPrice !== false;
  const defaultRateBp = toBp(taxCfg.standardGstRate ?? 0);

  // ---- goods and discounts ----
  const base = lines.map((l) => {
    const unit = Math.round(l.unitPricePaise);
    const qty = Math.round(l.quantity);
    const mrpUnit = Math.max(Math.round(l.mrpUnitPaise || unit), unit);
    return { ...l, unitPricePaise: unit, quantity: qty, mrpUnitPaise: mrpUnit, linePaise: unit * qty, mrpLinePaise: mrpUnit * qty };
  });
  const sellingPaise = base.reduce((s, l) => s + l.linePaise, 0);
  const mrpPaise = base.reduce((s, l) => s + l.mrpLinePaise, 0);
  const offer = clamp(Math.round(offerDiscountPaise || 0), 0, sellingPaise);
  const referral = clamp(Math.round(referralDiscountPaise || 0), 0, sellingPaise - offer);
  const discountPaise = offer + referral;
  // Free-delivery eligibility: what the customer pays for the products after discounts
  // (not MRP, not delivery, not store credit)
  const eligibleSubtotalPaise = sellingPaise - discountPaise;

  // ---- GST on products, line by line (each line may have its own rate) ----
  const shares = allocateProportionally(discountPaise, base.map((l) => l.linePaise));
  const pricedLines = base.map((l, i) => {
    const netPaise = l.linePaise - shares[i]; // what is paid for this line after its share of the discounts
    const rateBp = l.gstRate === null || l.gstRate === undefined ? defaultRateBp : toBp(l.gstRate);
    const taxPaise = inclusive ? gstInInclusive(netPaise, rateBp) : gstOnExclusive(netPaise, rateBp);
    const taxablePaise = inclusive ? netPaise - taxPaise : netPaise;
    return {
      ...l,
      discountPaise: shares[i],
      netPaise,
      gstRate: rateBp / 100,
      taxablePaise,
      taxPaise,
      payablePaise: inclusive ? netPaise : netPaise + taxPaise,
    };
  });
  const goodsTaxPaise = pricedLines.reduce((s, l) => s + l.taxPaise, 0);
  const taxableGoodsPaise = pricedLines.reduce((s, l) => s + l.taxablePaise, 0);
  const goodsPayablePaise = pricedLines.reduce((s, l) => s + l.payablePaise, 0);

  // ---- delivery ----
  const zone = dest.zone;
  const standardFeeBasePaise = Math.round(Number(zone.baseFee || 0) * 100);
  const thresholdPaise = Math.round(Number(zone.freeThreshold || 0) * 100);
  const freeApplied = eligibleSubtotalPaise >= thresholdPaise;
  const standardFeePaise = freeApplied ? 0 : standardFeeBasePaise;

  const express = deliveryMethod === "express";
  if (express) {
    if (shippingCfg.expressEnabled === false) throw ApiError.badRequest("Express delivery is not available right now. Please choose standard delivery.");
    if (!expressAvailable) throw ApiError.badRequest("Express delivery isn't available for this PIN code. Please choose standard delivery.");
  }
  // Express is a surcharge on top of the zone's standard fee (which is waived once free delivery applies)
  const expressSurchargePaise = express ? Math.round(Number(shippingCfg.expressShippingFee || 0) * 100) : 0;
  const shippingPaise = standardFeePaise + expressSurchargePaise;

  // GST on delivery: only if the store has chosen a treatment for it (see Admin -> Settings -> Tax)
  const shippingRateBp = taxCfg.shippingTaxMode === "fixed" ? toBp(taxCfg.shippingGstRate) : 0;
  const shippingTaxPaise = shippingRateBp > 0 ? (inclusive ? gstInInclusive(shippingPaise, shippingRateBp) : gstOnExclusive(shippingPaise, shippingRateBp)) : 0;
  const shippingPayablePaise = inclusive ? shippingPaise : shippingPaise + shippingTaxPaise;

  // ---- GST split: same state as the dispatch location = CGST + SGST, anywhere else = IGST ----
  const totalTaxPaise = goodsTaxPaise + shippingTaxPaise;
  const intra = sameState(dest.state, shippingCfg.originState || taxCfg.originState);
  const cgstPaise = intra ? Math.round(totalTaxPaise / 2) : 0;
  const sgstPaise = intra ? totalTaxPaise - cgstPaise : 0;
  const igstPaise = intra ? 0 : totalTaxPaise;

  const totalPaise = goodsPayablePaise + shippingPayablePaise;
  const creditPaise = clamp(Math.round(storeCreditPaise || 0), 0, totalPaise);

  return {
    priceMode: inclusive ? "inclusive" : "exclusive",
    lines: pricedLines,
    mrpPaise,
    sellingPaise,
    productDiscountPaise: mrpPaise - sellingPaise,
    offerDiscountPaise: offer,
    referralDiscountPaise: referral,
    discountPaise,
    eligibleSubtotalPaise,
    zone: { id: zone.id, name: zone.name, tier: zone.tier, deliveryDays: zone.deliveryDays },
    zoneVia: dest.via,
    destinationState: dest.state,
    shipping: {
      deliveryMethod: express ? "express" : "standard",
      standardFeePaise,
      standardFeeBasePaise,
      thresholdPaise,
      freeApplied,
      expressSurchargePaise,
      totalPaise: shippingPaise,
      taxRate: shippingRateBp / 100,
      taxPaise: shippingTaxPaise,
      payablePaise: shippingPayablePaise,
      estimate: express ? shippingCfg.expressEstimate || "1–2 business days" : zone.deliveryDays,
    },
    amountNeededForFreePaise: freeApplied ? 0 : thresholdPaise - eligibleSubtotalPaise,
    freeProgressPercent: thresholdPaise > 0 ? clamp(Math.floor((eligibleSubtotalPaise * 100) / thresholdPaise), 0, 100) : 100,
    tax: {
      type: intra ? "intra_state" : "inter_state",
      goodsTaxPaise,
      shippingTaxPaise,
      totalPaise: totalTaxPaise,
      taxableGoodsPaise,
      cgstPaise,
      sgstPaise,
      igstPaise,
    },
    totalPaise,
    storeCreditPaise: creditPaise,
    amountDuePaise: totalPaise - creditPaise,
  };
};

/** Fields saved on Order.pricing (plus the older field names the rest of the app already reads) */
export const toOrderPricing = (b, { appliedCoupon = null, referralCode = null } = {}) => ({
  subtotalPaise: b.mrpPaise,
  couponDiscountPaise: b.productDiscountPaise + b.offerDiscountPaise,
  referralDiscountPaise: b.referralDiscountPaise,
  shippingPaise: b.shipping.totalPaise,
  taxPaise: b.tax.totalPaise,
  cgstPaise: b.tax.cgstPaise,
  sgstPaise: b.tax.sgstPaise,
  igstPaise: b.tax.igstPaise,
  taxType: b.tax.type,
  totalPaise: b.totalPaise,
  appliedCoupon,
  referralCode,
  storeCreditPaise: b.storeCreditPaise,
  // Snapshot of how this order was priced; later settings changes never touch it
  sellingSubtotalPaise: b.sellingPaise,
  offerDiscountPaise: b.offerDiscountPaise,
  eligibleSubtotalPaise: b.eligibleSubtotalPaise,
  zoneId: b.zone.id,
  zoneName: b.zone.name,
  zoneTier: b.zone.tier,
  zoneVia: b.zoneVia,
  deliveryMethod: b.shipping.deliveryMethod,
  standardShippingPaise: b.shipping.standardFeePaise,
  standardShippingBasePaise: b.shipping.standardFeeBasePaise,
  freeShippingThresholdPaise: b.shipping.thresholdPaise,
  freeShippingApplied: b.shipping.freeApplied,
  expressSurchargePaise: b.shipping.expressSurchargePaise,
  shippingTaxPaise: b.shipping.taxPaise,
  shippingTaxRate: b.shipping.taxRate,
  gstMode: b.priceMode,
  taxableValuePaise: b.tax.taxableGoodsPaise,
  goodsTaxPaise: b.tax.goodsTaxPaise,
});

/** Per-line fields saved on each order item */
export const toOrderLine = (l) => ({
  mrpUnitPaise: l.mrpUnitPaise,
  discountPaise: l.discountPaise,
  gstRate: l.gstRate,
  hsnCode: l.hsnCode || "",
  taxablePaise: l.taxablePaise,
  taxPaise: l.taxPaise,
});

const rupees = (paise) => Math.round(paise) / 100;

/** What the storefront receives: the same numbers in rupees, plus the messages it needs */
export const toClientView = (b, extras = {}) => ({
  priceMode: b.priceMode,
  currency: "INR",
  mrp: rupees(b.mrpPaise),
  subtotal: rupees(b.sellingPaise),
  productDiscount: rupees(b.productDiscountPaise),
  offerDiscount: rupees(b.offerDiscountPaise),
  referralDiscount: rupees(b.referralDiscountPaise),
  discount: rupees(b.discountPaise),
  eligibleSubtotal: rupees(b.eligibleSubtotalPaise),
  zone: b.zone,
  state: b.destinationState,
  shipping: {
    deliveryMethod: b.shipping.deliveryMethod,
    standard: rupees(b.shipping.standardFeePaise),
    standardBase: rupees(b.shipping.standardFeeBasePaise),
    freeThreshold: rupees(b.shipping.thresholdPaise),
    freeApplied: b.shipping.freeApplied,
    expressSurcharge: rupees(b.shipping.expressSurchargePaise),
    total: rupees(b.shipping.totalPaise),
    tax: rupees(b.shipping.taxPaise),
    estimate: b.shipping.estimate,
  },
  amountNeededForFree: rupees(b.amountNeededForFreePaise),
  freeProgressPercent: b.freeProgressPercent,
  tax: {
    type: b.tax.type,
    goods: rupees(b.tax.goodsTaxPaise),
    shipping: rupees(b.tax.shippingTaxPaise),
    total: rupees(b.tax.totalPaise),
    taxableValue: rupees(b.tax.taxableGoodsPaise),
    cgst: rupees(b.tax.cgstPaise),
    sgst: rupees(b.tax.sgstPaise),
    igst: rupees(b.tax.igstPaise),
  },
  lines: b.lines.map((l) => ({
    productId: l.productId ? String(l.productId) : null,
    name: l.name,
    size: l.size,
    quantity: l.quantity,
    unitPrice: rupees(l.unitPricePaise),
    lineTotal: rupees(l.linePaise),
    discount: rupees(l.discountPaise),
    gstRate: l.gstRate,
    tax: rupees(l.taxPaise),
  })),
  total: rupees(b.totalPaise),
  totalPaise: b.totalPaise,
  ...extras,
});

/** The price a product's pack size sells at: the matching pack, else the first active pack, else the base price */
export const resolvePackPrice = ({ product, packs, size }) => {
  const active = Array.isArray(packs) ? packs : [];
  const priced = active.find((v) => v.label === size) || active[0] || product;
  const unitPaise = priced?.pricePaise ?? priced?.basePricePaise;
  const compareAt = priced?.compareAtPricePaise;
  return { pack: active.find((v) => v.label === size) || active[0] || null, unitPaise, mrpUnitPaise: compareAt > unitPaise ? compareAt : unitPaise };
};

export class PricingService {
  /** Express: offered only where it is switched on, the PIN is serviceable and the courier confirms a fast service */
  async expressInfo({ settings, pincode }) {
    const cfg = settings.shipping || {};
    const feePaise = Math.round(Number(cfg.expressShippingFee || 0) * 100);
    const info = { enabled: cfg.expressEnabled !== false, available: false, feePaise, estimate: cfg.expressEstimate || "1–2 business days", reason: "" };
    if (!info.enabled) {
      info.reason = "Express delivery is not offered right now.";
      return info;
    }
    if (!isValidPin(pincode)) {
      info.reason = "Enter your PIN code to see if express delivery is available.";
      return info;
    }
    if (cfg.expressRequiresCourierSupport === false) {
      info.available = true;
      return info;
    }
    try {
      const result = await shipmentService.checkServiceability({ deliveryPincode: String(pincode), cod: false, timeoutMs: 6000 });
      if (!result?.serviceable) {
        info.reason = "We can't deliver to this PIN code yet.";
      } else if (Number.isFinite(result.fastestDays) && result.fastestDays <= Number(cfg.expressMaxCourierDays ?? 2)) {
        info.available = true;
      } else {
        info.reason = "Express delivery isn't available for this PIN code.";
      }
    } catch (err) {
      // Unknown is not "yes": express is only offered when the courier confirms it
      logger.warn({ pincode, err: err.message }, "Could not confirm express delivery with the courier");
      info.reason = "We couldn't confirm express delivery right now. Standard delivery is available.";
    }
    return info;
  }

  /**
   * Check the PIN code against the state the customer chose, using India Post's directory where it has an
   * answer. When the directory is unreachable or does not know the PIN, the address is allowed through.
   */
  async assertPinMatchesState({ state, pincode }) {
    if (!isValidPin(pincode)) throw ApiError.badRequest("Please enter a valid 6-digit PIN code.");
    if (!canonicalState(state)) throw ApiError.badRequest("Please choose a valid state or union territory for delivery.");
    const found = await pincodeService.lookup(pincode);
    if (found?.found && !statesCompatible(state, found.state)) {
      throw ApiError.badRequest(`PIN code ${pincode} belongs to ${found.state}, but ${state} was selected. Please check your address.`);
    }
  }

  /**
   * The serviceability check and the express/standard/COD answers for a destination. `serviceable` is null when
   * the courier could not be reached (the order is then allowed and flagged at dispatch, as before).
   */
  async deliveryInfo({ settings, pincode, cod = false }) {
    if (!isValidPin(pincode)) return { serviceable: null, codAvailable: null };
    try {
      const result = await shipmentService.checkServiceability({ deliveryPincode: String(pincode), cod, timeoutMs: 6000 });
      return { serviceable: Boolean(result?.serviceable), codAvailable: cod ? Boolean(result?.serviceable) : null };
    } catch (err) {
      return { serviceable: null, codAvailable: null };
    }
  }

  /** Price a basket (lines already carry database prices). Loads settings unless given. */
  async price(input) {
    const settings = input.settings || (await settingsService.get());
    const plain = typeof settings.toObject === "function" ? settings.toObject() : settings;
    let expressAvailable = false;
    if (input.deliveryMethod === "express") {
      expressAvailable = (await this.expressInfo({ settings: plain, pincode: input.address?.pincode })).available;
    }
    return priceBasket({ ...input, settings: plain, expressAvailable });
  }

  /**
   * Lines for a storefront price preview: { productId, size, quantity } -> database price, MRP and GST rate.
   * Throws a clear error for a product that is gone or unavailable.
   */
  async resolveLines(items) {
    const lines = [];
    for (const item of items) {
      if (!item?.productId || !mongoose.Types.ObjectId.isValid(item.productId)) {
        throw ApiError.badRequest("One of the items in your basket could not be found. Please refresh your cart.");
      }
      const product = await Product.findById(item.productId).select("name status basePricePaise compareAtPricePaise gstRate hsnCode images").lean();
      if (!product || product.status !== "active") {
        throw ApiError.conflict(`"${item.name || "An item"}" is no longer available. Please remove it from your cart.`);
      }
      const packs = await ProductVariant.find({ productId: product._id, isActive: true }).sort({ createdAt: 1 }).lean();
      const { unitPaise, mrpUnitPaise } = resolvePackPrice({ product, packs, size: item.size });
      if (!Number.isFinite(unitPaise) || unitPaise <= 0) {
        throw ApiError.conflict(`"${product.name}" is no longer available. Please remove it from your cart.`);
      }
      const quantity = Math.max(1, Math.min(100, Math.round(Number(item.quantity) || 1)));
      lines.push({
        productId: product._id,
        name: product.name,
        size: item.size || "",
        quantity,
        unitPricePaise: unitPaise,
        mrpUnitPaise,
        gstRate: product.gstRate ?? null,
        hsnCode: product.hsnCode || "",
      });
    }
    return lines;
  }
}

export const pricingService = new PricingService();
