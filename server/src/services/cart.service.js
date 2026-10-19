import { Cart } from "../models/Cart.js";
import { toPublicImages } from "../utils/productImages.js";
import { ProductVariant } from "../models/ProductVariant.js";
import { Product } from "../models/Product.js";
import { toRupees } from "../utils/currency.js";
import { ApiError } from "../utils/apiError.js";

export class CartService {
  async getOrCreateCart({ userId = null, guestToken = null }) {
    if (!userId && !guestToken) {
      throw ApiError.badRequest("Either userId or guestToken is required to access cart.");
    }

    const query = userId ? { userId } : { guestTokenHash: guestToken };
    let cart = await Cart.findOne(query);

    if (!cart) {
      cart = await Cart.create({
        userId: userId || undefined,
        guestTokenHash: guestToken || undefined,
        items: [],
      });
    }

    return cart;
  }

  async getCartDetails({ userId = null, guestToken = null }) {
    const cart = await this.getOrCreateCart({ userId, guestToken });

    if (!cart.items || cart.items.length === 0) {
      return {
        id: cart._id.toString(),
        items: [],
        cartCount: 0,
        subtotal: 0,
        subtotalPaise: 0,
        couponCode: cart.couponCode,
        referralCode: cart.referralCode,
      };
    }

    const variantIds = cart.items.map((i) => i.variantId);
    const variants = await ProductVariant.find({ _id: { $in: variantIds } }).populate("productId");

    let subtotalPaise = 0;
    let cartCount = 0;

    const populatedItems = cart.items
      .map((item) => {
        const variant = variants.find((v) => v._id.toString() === item.variantId.toString());
        if (!variant || !variant.isActive) return null;

        const p = variant.productId;
        const lineTotalPaise = variant.pricePaise * item.quantity;
        subtotalPaise += lineTotalPaise;
        cartCount += item.quantity;

        return {
          variantId: variant._id.toString(),
          productId: p._id.toString(),
          name: p.name,
          slug: p.slug,
          size: variant.label,
          image: toPublicImages(p)[0] || "",
          price: toRupees(variant.pricePaise),
          originalPrice: toRupees(variant.compareAtPricePaise),
          pricePaise: variant.pricePaise,
          stockQuantity: Math.max(0, (variant.stockOnHand || 0) - (variant.reservedStock || 0)),
          quantity: item.quantity,
          lineTotal: toRupees(lineTotalPaise),
        };
      })
      .filter(Boolean);

    return {
      id: cart._id.toString(),
      items: populatedItems,
      cartCount,
      subtotal: toRupees(subtotalPaise),
      subtotalPaise,
      couponCode: cart.couponCode,
      referralCode: cart.referralCode,
    };
  }

  async addItem({ userId = null, guestToken = null, variantId, quantity = 1 }) {
    const variant = await ProductVariant.findById(variantId);
    if (!variant || !variant.isActive) {
      throw ApiError.notFound("Product variant not found or inactive.");
    }

    const cart = await this.getOrCreateCart({ userId, guestToken });
    const existingIndex = cart.items.findIndex(
      (it) => it.variantId.toString() === variantId.toString()
    );

    const availableStock = Math.max(0, (variant.stockOnHand || 0) - (variant.reservedStock || 0));

    if (existingIndex > -1) {
      const newQty = cart.items[existingIndex].quantity + quantity;
      cart.items[existingIndex].quantity = Math.min(newQty, availableStock);
    } else {
      cart.items.push({
        variantId: variant._id,
        productId: variant.productId,
        quantity: Math.min(quantity, availableStock),
      });
    }

    await cart.save();
    return this.getCartDetails({ userId, guestToken });
  }

  async updateItem({ userId = null, guestToken = null, variantId, quantity }) {
    const cart = await this.getOrCreateCart({ userId, guestToken });
    if (quantity <= 0) {
      return this.removeItem({ userId, guestToken, variantId });
    }

    const variant = await ProductVariant.findById(variantId);
    if (!variant) throw ApiError.notFound("Variant not found");

    const availableStock = Math.max(0, (variant.stockOnHand || 0) - (variant.reservedStock || 0));
    const item = cart.items.find((it) => it.variantId.toString() === variantId.toString());

    if (item) {
      item.quantity = Math.min(quantity, availableStock);
      await cart.save();
    }

    return this.getCartDetails({ userId, guestToken });
  }

  async removeItem({ userId = null, guestToken = null, variantId }) {
    const cart = await this.getOrCreateCart({ userId, guestToken });
    cart.items = cart.items.filter((it) => it.variantId.toString() !== variantId.toString());
    await cart.save();

    return this.getCartDetails({ userId, guestToken });
  }

  async clearCart({ userId = null, guestToken = null }) {
    const cart = await this.getOrCreateCart({ userId, guestToken });
    cart.items = [];
    cart.couponCode = null;
    cart.referralCode = null;
    await cart.save();

    return this.getCartDetails({ userId, guestToken });
  }
}

export const cartService = new CartService();

