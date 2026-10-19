import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Trash2, ArrowRight, ShoppingBag, ShieldCheck, Truck, ArrowLeft, MapPin, AlertTriangle } from "lucide-react";
import { Breadcrumbs } from "../components/common/Breadcrumbs";
import { EmptyState } from "../components/common/EmptyState";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { useAdmin } from "../context/AdminContext";
import { formatINR } from "../utils/formatters";
import { calculateShippingAndTax, INDIAN_STATES } from "../utils/shippingCalculator";

export const CartPage = () => {
  const {
    cartItems,
    removeFromCart,
    updateQuantity,
    cartCount,
    clearCart,
    getItemStockStatus,
    hasStockIssues,
    refreshStock,
    isItemSelected,
    toggleItemSelected,
    setAllItemsSelected,
    checkoutItems,
    checkoutSubtotal: subtotal, // what the customer pays for the items (already after product discounts)
    checkoutOriginalSubtotal: mrpSubtotal, // the same items at their original (MRP) prices
    checkoutDiscountTotal: discountTotal, // mrpSubtotal - subtotal
    offerDiscount, // extra saving from an auto-applied offer or coupon code
    appliedOffer,
    couponCode,
    couponError,
    offerNote,
    applyCoupon,
    removeCoupon,
    refreshOffers,
  } = useCart();
  const [couponInput, setCouponInput] = useState("");
  const { isAuthenticated } = useAuth();
  const { storeSettings } = useAdmin();
  const navigate = useNavigate();
  const [destState, setDestState] = useState("Karnataka");

  // Re-check live stock and running offers whenever the cart page is opened (and periodically while open)
  useEffect(() => {
    refreshStock();
    refreshOffers();
    const timer = setInterval(refreshOffers, 60000);
    return () => clearInterval(timer);
  }, []);

  const handleProceedToCheckout = () => {
    if (checkoutItems.length === 0) return;
    if (!isAuthenticated) {
      navigate("/login", {
        state: {
          from: "/checkout",
          message: "Please sign in or create an account to proceed to checkout.",
        },
      });
      return;
    }
    navigate("/checkout");
  };

  // What the customer actually pays for the items once any offer is taken off
  const payableSubtotal = Math.max(0, subtotal - offerDiscount);

  const shippingCalc = calculateShippingAndTax({
    destinationState: destState,
    subtotal: payableSubtotal,
    deliveryMethod: "standard",
    settings: storeSettings,
  });

  const hasSelection = checkoutItems.length > 0;
  const estimatedShipping = hasSelection ? shippingCalc.shippingFee : 0;
  // Total = MRP - product savings + shipping. (`subtotal` is already net of savings, so subtracting
  // `discountTotal` from it again would count the discount twice.)
  const grandTotal = hasSelection ? Math.max(0, mrpSubtotal - discountTotal - offerDiscount + estimatedShipping) : 0;

  // "Select all" applies to the items that can be bought
  const availableItems = cartItems.filter((item) => getItemStockStatus(item).status === "ok");
  const allAvailableSelected =
    availableItems.length > 0 && availableItems.every((item) => isItemSelected(item));

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
            <h1 className="font-heading tracking-tight text-3xl font-bold text-[#171A17]">
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
            {hasStockIssues && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-start gap-2.5">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                <span>
                  Some items in your cart are out of stock or have fewer units available than you selected.
                  They can't be ticked for checkout, but you can still check out the other items.
                </span>
              </div>
            )}
            <div className="bg-white rounded-3xl border border-[#E5E7DF] divide-y divide-[#E5E7DF] overflow-hidden shadow-xs">
              <div className="px-4 sm:px-6 py-3 bg-stone-50/70 flex items-center justify-between gap-3 text-xs">
                <label
                  className={`flex items-center gap-2.5 font-semibold text-stone-700 ${
                    availableItems.length === 0 ? "cursor-not-allowed opacity-60" : "cursor-pointer"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={allAvailableSelected}
                    disabled={availableItems.length === 0}
                    onChange={(e) => setAllItemsSelected(e.target.checked)}
                    className="w-4 h-4 rounded border-stone-300 accent-[#173D2A] disabled:cursor-not-allowed"
                  />
                  <span>Select all available items ({availableItems.length})</span>
                </label>
                <span className="text-stone-500">
                  {checkoutItems.length} of {cartItems.length} selected for checkout
                </span>
              </div>
              <AnimatePresence initial={false}>
                {cartItems.map((item) => {
                  const itemTotal = item.price * item.quantity;
                  const { status: stockStatus, available } = getItemStockStatus(item);
                  const isOut = stockStatus === "out";
                  return (
                    <motion.div
                      key={`${item.product.id}-${item.selectedSize}`}
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.25 }}
                      className={`p-4 sm:p-6 flex flex-col sm:flex-row items-center gap-4 sm:gap-6 overflow-hidden ${
                        stockStatus !== "ok" ? "bg-rose-50/40" : ""
                      }`}
                    >
                      {/* Select for checkout */}
                      <label
                        className={`shrink-0 flex items-center ${
                          stockStatus === "ok" ? "cursor-pointer" : "cursor-not-allowed"
                        }`}
                        title={
                          stockStatus === "ok"
                            ? "Include in checkout"
                            : "Unavailable items can't be selected for checkout"
                        }
                      >
                        <input
                          type="checkbox"
                          checked={isItemSelected(item)}
                          disabled={stockStatus !== "ok"}
                          onChange={(e) =>
                            toggleItemSelected(item.product.id, item.selectedSize, e.target.checked)
                          }
                          aria-label={`Select ${item.product.name} for checkout`}
                          className="w-4 h-4 rounded border-stone-300 accent-[#173D2A] disabled:cursor-not-allowed"
                        />
                      </label>

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
                          className="font-heading tracking-tight font-bold text-base sm:text-lg text-[#171A17] hover:text-[#173D2A] transition-colors line-clamp-1"
                        >
                          {item.product.name}
                        </Link>
                        <p className="text-xs text-[#666B64]">
                          Pack Size: <span className="font-semibold text-[#171A17]">{item.selectedSize}</span>
                        </p>
                        <div className="text-xs text-stone-500">
                          Price: {formatINR(item.price)} each
                        </div>
                        {isOut && (
                          <div className="text-xs font-semibold text-rose-600">
                            Out of stock &mdash; can't be selected for checkout
                          </div>
                        )}
                        {stockStatus === "exceeds" && (
                          <div className="text-xs font-semibold text-rose-600">
                            Only {available} left &mdash; reduce the quantity to select it
                          </div>
                        )}
                      </div>

                      {/* Quantity Selector */}
                      <div className="flex items-center border border-[#E5E7DF] rounded-xl bg-white px-2.5 py-1.5 shrink-0">
                        <motion.button
                          whileTap={{ scale: 0.85 }}
                          onClick={() =>
                            updateQuantity(item.product.id, item.selectedSize, item.quantity - 1, available)
                          }
                          disabled={isOut}
                          className={`w-6 h-6 flex items-center justify-center text-stone-500 hover:text-stone-900 font-bold ${
                            isOut ? "opacity-30 cursor-not-allowed" : "cursor-pointer"
                          }`}
                        >
                          -
                        </motion.button>
                        <span className="w-8 text-center text-xs font-bold text-[#171A17]">
                          {item.quantity}
                        </span>
                        <motion.button
                          whileTap={{ scale: 0.85 }}
                          onClick={() =>
                            updateQuantity(item.product.id, item.selectedSize, item.quantity + 1, available)
                          }
                          disabled={isOut || item.quantity >= available}
                          className={`w-6 h-6 flex items-center justify-center text-stone-500 hover:text-stone-900 font-bold disabled:opacity-30 ${
                            isOut || item.quantity >= available ? "cursor-not-allowed" : "cursor-pointer"
                          }`}
                        >
                          +
                        </motion.button>
                      </div>

                      {/* Item Total */}
                      <div className="text-right shrink-0 min-w-[80px]">
                        <div className="text-base font-bold text-[#171A17]">
                          {formatINR(itemTotal)}
                        </div>
                        {item.originalPrice > item.price && (
                          <div className="text-xs text-stone-400 line-through">
                            {formatINR(item.originalPrice * item.quantity)}
                          </div>
                        )}
                      </div>

                      {/* Remove Action */}
                      <motion.button
                        whileTap={{ scale: 0.85 }}
                        onClick={() => removeFromCart(item.product.id, item.selectedSize)}
                        className="p-2 text-stone-400 hover:text-rose-600 transition-colors shrink-0 cursor-pointer"
                        title="Remove Item"
                        aria-label="Remove item"
                      >
                        <Trash2 size={18} />
                      </motion.button>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {/* Free Shipping Progress Indicator */}
            <div className="p-4 bg-white rounded-2xl border border-[#E5E7DF] text-xs flex items-center gap-3">
              <Truck size={18} className="text-[#386B40] shrink-0" />
              {payableSubtotal >= 499 ? (
                <span className="text-emerald-700 font-semibold">
                  🎉 Congratulations! Your order qualifies for Free Botanical Shipping across India!
                </span>
              ) : (
                <span className="text-[#666B64]">
                  Add <strong className="text-[#173D2A]">{formatINR(499 - payableSubtotal)}</strong> more to qualify for Free Shipping!
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
          <div className="lg:col-span-4 bg-white rounded-3xl border border-[#E5E7DF] p-6 sm:p-7 space-y-6 shadow-xs sticky top-28">
            <h3 className="font-heading tracking-tight text-xl font-bold text-[#171A17] pb-3 border-b border-[#E5E7DF]">
              Order Summary
            </h3>
            <p className="text-[11px] text-stone-500 -mt-4">
              {hasSelection
                ? `${checkoutItems.length} of ${cartItems.length} ${cartItems.length === 1 ? "item" : "items"} selected`
                : "No items selected"}
            </p>

            <div className="space-y-3 text-xs sm:text-sm">
              <div className="flex justify-between text-[#666B64]">
                <span>Items Subtotal (MRP)</span>
                <span className="font-semibold text-[#171A17]">{formatINR(mrpSubtotal)}</span>
              </div>

              {discountTotal > 0 && (
                <div className="flex justify-between text-emerald-700">
                  <span>Product Savings</span>
                  <span className="font-semibold">-{formatINR(discountTotal)}</span>
                </div>
              )}

              {offerDiscount > 0 && appliedOffer && (
                <div className="flex justify-between gap-3 text-emerald-700">
                  <span className="min-w-0">
                    <span className="block truncate">
                      {appliedOffer.title || appliedOffer.code}
                    </span>
                    <span className="block text-[10px] text-emerald-600/80">
                      {appliedOffer.source === "auto" ? "Offer auto-applied" : `Coupon ${appliedOffer.code}`}
                    </span>
                  </span>
                  <span className="font-semibold shrink-0">-{formatINR(offerDiscount)}</span>
                </div>
              )}

              {/* State Shipping Estimator */}
              <div className="pt-2.5 pb-2 border-t border-b border-stone-100 space-y-1.5">
                <div className="flex items-center justify-between gap-2 min-w-0">
                  <span className="text-[11px] font-semibold text-stone-700 flex items-center gap-1 shrink-0 whitespace-nowrap">
                    <MapPin size={12} className="text-[#386B40] shrink-0" />
                    <span>Delivery State:</span>
                  </span>
                  <div className="flex-1 min-w-0 flex justify-end">
                    <select
                      value={destState}
                      onChange={(e) => setDestState(e.target.value)}
                      className="w-full max-w-[145px] sm:max-w-[160px] text-xs py-1 px-2 rounded-lg border border-stone-200 bg-stone-50 font-medium text-stone-800 focus:outline-none focus:ring-1 focus:ring-[#386B40] truncate cursor-pointer"
                    >
                      {INDIAN_STATES.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>
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
                <span className="text-base font-heading tracking-tight font-bold text-[#171A17]">Total Amount</span>
                <span className="text-2xl font-bold text-[#173D2A]">{formatINR(grandTotal)}</span>
              </div>
              <p className="text-[11px] text-stone-400">Includes all applicable GST ({shippingCalc.taxLabel})</p>
            </div>

            {/* Coupon code */}
            {hasSelection && (
              <div className="space-y-2">
                {couponCode && !couponError ? (
                  <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs">
                    <span className="font-semibold text-emerald-800 truncate">Coupon {couponCode}</span>
                    <button type="button" onClick={removeCoupon} className="text-emerald-700 hover:underline font-semibold cursor-pointer">
                      Remove
                    </button>
                  </div>
                ) : (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      if (couponInput.trim()) applyCoupon(couponInput);
                      setCouponInput("");
                    }}
                    className="flex gap-2"
                  >
                    <input
                      type="text"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      placeholder="Have a coupon code?"
                      className="flex-1 min-w-0 px-3 py-2 text-xs rounded-xl border border-stone-300 bg-white font-mono uppercase"
                    />
                    <button
                      type="submit"
                      className="px-3.5 py-2 text-xs font-semibold rounded-xl bg-stone-900 text-white hover:bg-stone-700 cursor-pointer"
                    >
                      Apply
                    </button>
                  </form>
                )}
                {couponError && (
                  <p className="text-[11px] text-rose-600">
                    {couponError}{" "}
                    <button type="button" onClick={removeCoupon} className="underline cursor-pointer">
                      Clear
                    </button>
                  </p>
                )}
                {offerNote && <p className="text-[11px] text-stone-500">{offerNote}</p>}
              </div>
            )}

            {/* Checkout CTA */}
            <button
              onClick={handleProceedToCheckout}
              disabled={!hasSelection}
              className={`w-full py-3.5 px-6 font-semibold rounded-xl flex items-center justify-center gap-2 transition-all group ${
                !hasSelection
                  ? "bg-stone-200 text-stone-500 cursor-not-allowed"
                  : "bg-[#173D2A] hover:bg-[#0B2416] text-white shadow-sm hover:shadow cursor-pointer"
              }`}
            >
              <span>
                {!hasSelection
                  ? "Select Items to Checkout"
                  : isAuthenticated
                    ? `Proceed to Checkout (${checkoutItems.length})`
                    : "Sign In to Checkout"}
              </span>
              {hasSelection && (
                <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform" />
              )}
            </button>
            {!hasSelection && (
              <p className="text-[11px] text-center text-rose-600 mt-2">
                {availableItems.length === 0
                  ? "None of the items in your cart are available right now."
                  : "Tick at least one available item to continue."}
              </p>
            )}
            {hasSelection && !isAuthenticated && (
              <p className="text-[11px] text-center text-stone-500 mt-2">
                Sign in is required to proceed with your order.
              </p>
            )}

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
