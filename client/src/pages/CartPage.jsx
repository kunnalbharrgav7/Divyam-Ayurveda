import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Trash2, ArrowRight, ShoppingBag, ShieldCheck, Truck, ArrowLeft, MapPin } from "lucide-react";
import { Breadcrumbs } from "../components/common/Breadcrumbs";
import { EmptyState } from "../components/common/EmptyState";
import { useCart } from "../context/CartContext";
import { useAdmin } from "../context/AdminContext";
import { formatINR } from "../utils/formatters";
import { calculateShippingAndTax, INDIAN_STATES } from "../utils/shippingCalculator";

export const CartPage = () => {
  const {
    cartItems,
    removeFromCart,
    updateQuantity,
    cartCount,
    subtotal,
    discountTotal,
    clearCart,
  } = useCart();
  const { storeSettings } = useAdmin();
  const navigate = useNavigate();
  const [destState, setDestState] = useState("Karnataka");

  const shippingCalc = calculateShippingAndTax({
    destinationState: destState,
    subtotal,
    deliveryMethod: "standard",
    settings: storeSettings,
  });

  const estimatedShipping = shippingCalc.shippingFee;
  const grandTotal = Math.max(0, subtotal - discountTotal + estimatedShipping);

  if (cartItems.length === 0) {
    return (
      <div className="bg-[#FBFAF6] min-h-screen py-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <Breadcrumbs items={[{ label: "Shopping Cart" }]} />
          <EmptyState
            icon={ShoppingBag}
            title="Your Ayurvedic Wellness Cart is Empty"
            description="Explore our authentic botanical churnas, cold-pressed tailams, and daily adaptogens to restore natural vitality."
            actionText="Browse All Formulations"
            actionLink="/products"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#FBFAF6] min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Breadcrumbs items={[{ label: "Shopping Cart" }]} />

        {/* Heading & Clear Cart */}
        <div className="flex items-center justify-between pb-4 mb-6 border-b border-[#E5E7DF]">
          <div>
            <h1 className="font-serif text-3xl font-bold text-[#171A17]">
              Shopping Cart
            </h1>
            <p className="text-xs sm:text-sm text-[#666B64] mt-1">
              You have {cartCount} {cartCount === 1 ? "item" : "items"} in your cart.
            </p>
          </div>
          <button
            onClick={clearCart}
            className="text-xs font-semibold text-rose-600 hover:underline"
          >
            Clear Cart
          </button>
        </div>

        {/* Cart Main: Items Table + Summary Sidebar */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Cart Items List (8 cols) */}
          <div className="lg:col-span-8 space-y-4">
            <div className="bg-white rounded-3xl border border-[#E5E7DF] divide-y divide-[#E5E7DF] overflow-hidden shadow-xs">
              {cartItems.map((item, index) => {
                const itemTotal = item.price * item.quantity;
                return (
                  <div
                    key={`${item.product.id}-${item.selectedSize}`}
                    className="p-4 sm:p-6 flex flex-col sm:flex-row items-center gap-4 sm:gap-6"
                  >
                    {/* Thumbnail */}
                    <Link
                      to={`/products/${item.product.slug}`}
                      className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-[#FBFAF6] border border-[#E5E7DF] p-2 flex items-center justify-center shrink-0 overflow-hidden"
                    >
                      <img
                        src={item.product.images?.[0]}
                        alt={item.product.name}
                        className="w-full h-full object-contain hover:scale-105 transition-transform"
                      />
                    </Link>

                    {/* Info */}
                    <div className="flex-1 text-center sm:text-left space-y-1">
                      <Link
                        to={`/products/${item.product.slug}`}
                        className="font-serif font-bold text-base sm:text-lg text-[#171A17] hover:text-[#173D2A] transition-colors line-clamp-1"
                      >
                        {item.product.name}
                      </Link>
                      <p className="text-xs text-[#666B64]">
                        Pack Size: <span className="font-semibold text-[#171A17]">{item.selectedSize}</span>
                      </p>
                      <div className="text-xs text-stone-500">
                        Price: {formatINR(item.price)} each
                      </div>
                    </div>

                    {/* Quantity Selector */}
                    <div className="flex items-center border border-[#E5E7DF] rounded-xl bg-white px-2.5 py-1.5 shrink-0">
                      <button
                        onClick={() =>
                          updateQuantity(item.product.id, item.selectedSize, item.quantity - 1)
                        }
                        className="w-6 h-6 flex items-center justify-center text-stone-500 hover:text-stone-900 font-bold"
                      >
                        -
                      </button>
                      <span className="w-8 text-center text-xs font-bold text-[#171A17]">
                        {item.quantity}
                      </span>
                      <button
                        onClick={() =>
                          updateQuantity(item.product.id, item.selectedSize, item.quantity + 1)
                        }
                        disabled={item.quantity >= (item.product.stockQuantity || 99)}
                        className="w-6 h-6 flex items-center justify-center text-stone-500 hover:text-stone-900 font-bold disabled:opacity-30"
                      >
                        +
                      </button>
                    </div>

                    {/* Item Total */}
                    <div className="text-right shrink-0 min-w-[80px]">
                      <div className="text-base font-bold text-[#171A17]">
                        {formatINR(itemTotal)}
                      </div>
                      {item.originalPrice && item.originalPrice > item.price && (
                        <div className="text-xs text-stone-400 line-through">
                          {formatINR(item.originalPrice * item.quantity)}
                        </div>
                      )}
                    </div>

                    {/* Remove Action */}
                    <button
                      onClick={() => removeFromCart(item.product.id, item.selectedSize)}
                      className="p-2 text-stone-400 hover:text-rose-600 transition-colors shrink-0"
                      title="Remove Item"
                      aria-label="Remove item"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Free Shipping Progress Indicator */}
            <div className="p-4 bg-white rounded-2xl border border-[#E5E7DF] text-xs flex items-center gap-3">
              <Truck size={18} className="text-[#386B40] shrink-0" />
              {subtotal >= 499 ? (
                <span className="text-emerald-700 font-semibold">
                  🎉 Congratulations! Your order qualifies for Free Botanical Shipping across India!
                </span>
              ) : (
                <span className="text-[#666B64]">
                  Add <strong className="text-[#173D2A]">{formatINR(499 - subtotal)}</strong> more to qualify for Free Shipping!
                </span>
              )}
            </div>

            {/* Continue Shopping Link */}
            <div className="pt-2">
              <Link
                to="/products"
                className="inline-flex items-center gap-2 text-xs font-semibold text-[#173D2A] hover:underline"
              >
                <ArrowLeft size={14} />
                <span>Continue Shopping Formulations</span>
              </Link>
            </div>
          </div>

          {/* Order Summary Sidebar (4 cols) */}
          <div className="lg:col-span-4 bg-white rounded-3xl border border-[#E5E7DF] p-6 sm:p-8 space-y-6 shadow-xs sticky top-28">
            <h3 className="font-serif text-xl font-bold text-[#171A17] pb-3 border-b border-[#E5E7DF]">
              Order Summary
            </h3>

            <div className="space-y-3 text-xs sm:text-sm">
              <div className="flex justify-between text-[#666B64]">
                <span>Items Subtotal</span>
                <span className="font-semibold text-[#171A17]">{formatINR(subtotal)}</span>
              </div>

              {discountTotal > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Product Savings</span>
                  <span className="font-semibold">-{formatINR(discountTotal)}</span>
                </div>
              )}

              {/* State Shipping Estimator */}
              <div className="pt-2 pb-1 border-t border-b border-stone-100">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-[11px] font-semibold text-stone-700 flex items-center gap-1">
                    <MapPin size={12} className="text-[#386B40]" />
                    <span>Delivery State:</span>
                  </span>
                  <select
                    value={destState}
                    onChange={(e) => setDestState(e.target.value)}
                    className="text-xs py-1 px-2 rounded-lg border border-stone-200 bg-stone-50 font-medium text-stone-800 focus:outline-none"
                  >
                    {INDIAN_STATES.map((st) => (
                      <option key={st} value={st}>
                        {st}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex justify-between items-baseline text-xs">
                  <span className="text-[11px] text-stone-400">
                    {shippingCalc.zone.name}
                  </span>
                  <span className="font-semibold text-[#171A17]">
                    {estimatedShipping === 0 ? (
                      <span className="text-emerald-700 font-bold uppercase text-xs">FREE</span>
                    ) : (
                      formatINR(estimatedShipping)
                    )}
                  </span>
                </div>
              </div>

              {shippingCalc.amountNeededForFree > 0 && (
                <div className="p-2.5 rounded-xl bg-emerald-50 text-[11px] text-emerald-800">
                  Add <strong>{formatINR(shippingCalc.amountNeededForFree)}</strong> more to unlock FREE shipping to {destState}!
                </div>
              )}

              <div className="border-t border-[#E5E7DF] pt-3 flex justify-between items-baseline">
                <span className="text-base font-serif font-bold text-[#171A17]">Total Amount</span>
                <span className="text-2xl font-bold text-[#173D2A]">{formatINR(grandTotal)}</span>
              </div>
              <p className="text-[11px] text-stone-400">Includes all applicable GST ({shippingCalc.taxLabel})</p>
            </div>

            {/* Checkout CTA */}
            <button
              onClick={() => navigate("/checkout")}
              className="w-full py-3.5 px-6 bg-[#173D2A] hover:bg-[#0B2416] text-white font-semibold rounded-xl flex items-center justify-center gap-2 shadow-sm hover:shadow transition-all group"
            >
              <span>Proceed to Checkout</span>
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
            </button>

            {/* Trust Badges */}
            <div className="pt-2 border-t border-[#E5E7DF] space-y-2 text-xs text-stone-500">
              <div className="flex items-center gap-2">
                <ShieldCheck size={15} className="text-[#386B40]" />
                <span>100% Genuine Ayurvedic Formulations</span>
              </div>
              <div className="flex items-center gap-2">
                <Truck size={15} className="text-[#386B40]" />
                <span>Dispatched directly from certified dispensary</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
