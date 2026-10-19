import { Product } from "../models/Product.js";
import { ProductVariant } from "../models/ProductVariant.js";
import { InventoryMovement } from "../models/InventoryMovement.js";
import { INVENTORY_REASONS } from "../constants/inventoryReasons.js";
import { ApiError } from "../utils/apiError.js";
import { logger } from "../config/logger.js";

export class InventoryService {
  /**
   * Atomically reserve stock for an order's items.
   * Ensures stockOnHand - reservedStock >= requestedQty for EVERY variant.
   * If any variant lacks sufficient stock, safely rolls back all previously reserved items in the batch.
   */
  async reserveStock(items, orderNumber, actorId = "checkout_reservation") {
    const reservedItems = [];

    for (const item of items) {
      const variant = await ProductVariant.findOneAndUpdate(
        {
          _id: item.variantId,
          $expr: {
            $gte: [{ $subtract: ["$stockOnHand", "$reservedStock"] }, item.quantity],
          },
        },
        {
          $inc: { reservedStock: item.quantity },
        },
        { new: true }
      );

      if (!variant) {
        // Rollback all previously reserved items in this order batch
        logger.warn(
          { orderNumber, variantId: item.variantId, requested: item.quantity },
          "Stock reservation failed. Initiating atomic rollback of reserved batch."
        );

        for (const reserved of reservedItems) {
          await ProductVariant.findByIdAndUpdate(reserved.variantId, {
            $inc: { reservedStock: -reserved.quantity },
          });
        }

        throw ApiError.conflict(
          `Insufficient stock available for SKU ${item.sku || "item"}. Please adjust your quantity.`
        );
      }

      reservedItems.push(item);

      // Record immutable movement
      await InventoryMovement.create({
        variantId: item.variantId,
        productId: item.productId || variant.productId,
        delta: 0, // Stock on hand unchanged during reservation; reservedStock tracks allocation
        beforeStock: variant.stockOnHand,
        afterStock: variant.stockOnHand,
        reason: INVENTORY_REASONS.ORDER_RESERVATION,
        reference: orderNumber,
        actorId,
        note: `Reserved ${item.quantity} units for order ${orderNumber}`,
      });
    }

    return true;
  }

  /**
   * Convert reserved stock to permanently sold stock upon payment / confirmation
   */
  async commitSoldStock(items, orderNumber, actorId = "payment_commit") {
    for (const item of items) {
      const variant = await ProductVariant.findByIdAndUpdate(
        item.variantId,
        {
          $inc: {
            stockOnHand: -item.quantity,
            reservedStock: -item.quantity,
          },
        },
        { new: true }
      );

      if (variant) {
        await InventoryMovement.create({
          variantId: item.variantId,
          productId: item.productId || variant.productId,
          delta: -item.quantity,
          beforeStock: variant.stockOnHand + item.quantity,
          afterStock: variant.stockOnHand,
          reason: INVENTORY_REASONS.ORDER_SALE,
          reference: orderNumber,
          actorId,
          note: `Sold ${item.quantity} units upon confirmation of ${orderNumber}`,
        });
      }
    }
  }

  /**
   * Release reserved stock upon order cancellation or expired payment window
   */
  async releaseReservedStock(items, orderNumber, reason = INVENTORY_REASONS.ORDER_CANCELLATION) {
    for (const item of items) {
      const variant = await ProductVariant.findByIdAndUpdate(
        item.variantId,
        {
          $inc: { reservedStock: -item.quantity },
        },
        { new: true }
      );

      if (variant) {
        await InventoryMovement.create({
          variantId: item.variantId,
          productId: item.productId || variant.productId,
          delta: 0,
          beforeStock: variant.stockOnHand,
          afterStock: variant.stockOnHand,
          reason,
          reference: orderNumber,
          actorId: "system_release",
          note: `Released reservation of ${item.quantity} units for ${orderNumber}`,
        });
      }
    }
  }

  /**
   * Manual inventory adjustment by authorized staff member
   */
  async adjustStock({
    variantId,
    operation,
    quantity,
    reason,
    note = "",
    actorId = "staff",
    idempotencyKey = null,
  }) {
    if (quantity <= 0) {
      throw ApiError.badRequest("Quantity must be greater than zero.");
    }

    const delta = operation === "subtract" || operation === "remove" ? -quantity : quantity;
    const variant = await ProductVariant.findById(variantId);
    if (!variant) throw ApiError.notFound("Product variant not found.");

    if (delta < 0 && variant.stockOnHand + delta < variant.reservedStock) {
      throw ApiError.conflict(
        `Cannot reduce stock below active reserved allocations (${variant.reservedStock} reserved).`
      );
    }

    const beforeStock = variant.stockOnHand;
    variant.stockOnHand += delta;
    await variant.save();

    const movement = await InventoryMovement.create({
      variantId: variant._id,
      productId: variant.productId,
      delta,
      beforeStock,
      afterStock: variant.stockOnHand,
      reason: INVENTORY_REASONS.WAREHOUSE_ADJUSTMENT,
      reference: note || reason || "Staff Manual Adjustment",
      actorId: String(actorId),
      note,
      idempotencyKey,
    });

    return {
      variant: variant.toJSON(),
      movement,
    };
  }

  /**
   * Put returned units back on the shelf (only for items that are in sellable condition)
   */
  async restockReturned(items, orderNumber, actorId = "staff") {
    for (const item of items) {
      if (!item.variantId) continue;
      const variant = await ProductVariant.findByIdAndUpdate(item.variantId, { $inc: { stockOnHand: item.quantity } }, { new: true });
      if (!variant) continue;
      await InventoryMovement.create({
        variantId: item.variantId,
        productId: item.productId || variant.productId,
        delta: item.quantity,
        beforeStock: variant.stockOnHand - item.quantity,
        afterStock: variant.stockOnHand,
        reason: INVENTORY_REASONS.RETURN_RESTOCK,
        reference: orderNumber,
        actorId: String(actorId),
        note: `Returned ${item.quantity} unit(s) restocked from order ${orderNumber}`,
      });
    }
  }

  /**
   * Guarantees a product has at least one active variant (stock and price live on variants).
   * Repairs products that were saved without any; the new variant starts at 0 stock.
   */
  async ensureDefaultVariant(productId) {
    if (await ProductVariant.exists({ productId, isActive: true })) return null;

    const product = await Product.findById(productId);
    if (!product) throw ApiError.notFound("Product not found");

    let sku = `${product.sku}-STD`.toUpperCase();
    if (await ProductVariant.exists({ sku })) {
      sku = `${sku}-${Math.floor(100 + Math.random() * 900)}`;
    }

    return ProductVariant.create({
      productId: product._id,
      sku,
      label: product.packSize || "Standard",
      pricePaise: product.basePricePaise,
      compareAtPricePaise: product.compareAtPricePaise || 0,
      stockOnHand: 0,
      reorderThreshold: 10,
    });
  }

  /**
   * Product-level manual adjustment used by the admin panel.
   * "set" makes the product's total available stock exactly `quantity` (0 allowed);
   * "add"/"subtract" change it relative to the current total. Increases land on the
   * first variant; decreases are taken from the last variant backwards and never dip
   * below units already reserved by open orders.
   */
  async adjustProductStock({
    productId,
    operation = "set",
    quantity,
    reason = "",
    note = "",
    actorId = "staff",
    idempotencyKey = null,
  }) {
    const qty = Number(quantity);
    if (!Number.isFinite(qty) || qty < 0 || (operation !== "set" && qty === 0)) {
      throw ApiError.badRequest("Quantity must be a valid non-negative number.");
    }

    let variants = await ProductVariant.find({ productId, isActive: true }).sort({ createdAt: 1 });
    if (variants.length === 0) {
      await this.ensureDefaultVariant(productId);
      variants = await ProductVariant.find({ productId, isActive: true }).sort({ createdAt: 1 });
    }

    const available = (v) => Math.max(0, (v.stockOnHand || 0) - (v.reservedStock || 0));
    const current = variants.reduce((sum, v) => sum + available(v), 0);

    let target;
    if (operation === "set") target = Math.floor(qty);
    else if (operation === "add") target = current + Math.floor(qty);
    else target = Math.max(0, current - Math.floor(qty));

    let remaining = target - current;
    const movements = [];

    const applyDelta = async (variant, delta) => {
      const beforeStock = variant.stockOnHand;
      variant.stockOnHand = beforeStock + delta;
      await variant.save();
      movements.push(
        await InventoryMovement.create({
          variantId: variant._id,
          productId: variant.productId,
          delta,
          beforeStock,
          afterStock: variant.stockOnHand,
          reason: INVENTORY_REASONS.WAREHOUSE_ADJUSTMENT,
          reference: note || reason || "Staff Manual Adjustment",
          actorId: String(actorId),
          note: reason && note ? `${reason} - ${note}` : note || reason,
          idempotencyKey: idempotencyKey && movements.length === 0 ? idempotencyKey : null,
        })
      );
    };

    if (remaining > 0) {
      await applyDelta(variants[0], remaining);
    } else if (remaining < 0) {
      for (const variant of [...variants].reverse()) {
        if (remaining === 0) break;
        const take = Math.min(available(variant), -remaining);
        if (take > 0) {
          await applyDelta(variant, -take);
          remaining += take;
        }
      }
    }

    const updated = await ProductVariant.find({ productId, isActive: true }).sort({ createdAt: 1 });
    return {
      productId: String(productId),
      stockQuantity: updated.reduce((sum, v) => sum + available(v), 0),
      reorderThreshold: updated[0]?.reorderThreshold ?? 10,
      variants: updated.map((v) => v.toJSON()),
      movements: movements.map((m) => m.toJSON()),
    };
  }
}

export const inventoryService = new InventoryService();
