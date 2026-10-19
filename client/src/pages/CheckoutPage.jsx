import React, { useState, useEffect } from "react";
import { useNavigate, Link, Navigate } from "react-router-dom";
import {
  ShieldCheck,
  Truck,
  CreditCard,
  Banknote,
  CheckCircle2,
  Lock,
  ArrowLeft,
  AlertCircle,
  Gift,
} from "lucide-react";
import { Breadcrumbs } from "../components/common/Breadcrumbs";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { useReturns } from "../context/ReturnContext";
import { useOrders } from "../context/OrderContext";
import { useAdmin } from "../context/AdminContext";
import { useReferrals } from "../context/ReferralContext";
import { formatINR } from "../utils/formatters";
import { calculateShippingAndTax, INDIAN_STATES } from "../utils/shippingCalculator";

export const CheckoutPage = () => {
  const navigate = useNavigate();
  // Checkout only covers the items ticked in the cart (in-stock items; see CartContext)
  const {
    checkoutItems: cartItems,
    checkoutSubtotal: subtotal, // amount payable for the items, already after product discounts
    checkoutOriginalSubtotal: mrpSubtotal, // the same items at original (MRP) prices
    checkoutDiscountTotal: discountTotal, // product savings = mrpSubtotal - subtotal
    offerDiscount, // extra saving from an auto-applied offer or coupon code (verified by the server on order)
    appliedOffer,
    refreshOffers,
    removeCheckedOutItems,
  } = useCart();
  const { user, addresses, isAuthenticated } = useAuth();
  const { storeCredit, refresh: refreshCredit } = useReturns();
  const [useCredit, setUseCredit] = useState(false);
  const { placeOrder } = useOrders();
  const { storeSettings } = useAdmin();
  const { activeAttribution, previewDiscount, clearAttribution, applyReferralCode } = useReferrals();
  const [codeInput, setCodeInput] = useState("");
  const [codeMessage, setCodeMessage] = useState("");
  const [applyingCode, setApplyingCode] = useState(false);
  const [referralPreview, setReferralPreview] = useState({ discount: 0, reason: "" });

  const defaultAddr = addresses.find((a) => a.isDefault) || addresses[0] || {};

  // Form State - Unconditionally declared at top level
  const [formData, setFormData] = useState({
    fullName: user?.name || defaultAddr.fullName || "",
    email: user?.email || "",
    phone: user?.phone || defaultAddr.phone || "",
    street: defaultAddr.street || "",
    city: defaultAddr.city || "",
    state: defaultAddr.state || "Karnataka",
    pincode: defaultAddr.pincode || "",
    notes: "",
  });

  const [deliveryMethod, setDeliveryMethod] = useState("standard"); // standard, express
  const [paymentMethod, setPaymentMethod] = useState("cod"); // cod, online
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [orderCompleted, setOrderCompleted] = useState(false);

  // Offers can change at any time: re-check them when checkout opens (and while it stays open)
  useEffect(() => {
    refreshOffers();
    const timer = setInterval(refreshOffers, 60000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Dynamic Shipping & Tax calculation based on destination state & distance zone
  const shippingTaxCalc = calculateShippingAndTax({
    destinationState: formData.state,
    subtotal: Math.max(0, subtotal - offerDiscount), // GST and free-shipping eligibility use the amount actually paid
    deliveryMethod,
    settings: storeSettings,
  });

  // Guard: Unauthenticated guests cannot proceed to checkout
  if (!isAuthenticated) {
    return (
      <Navigate
        to="/login"
        state={{
          from: "/checkout",
          message: "Please sign in or create an account to proceed to checkout. Your cart items are saved.",
        }}
        replace
      />
    );
  }

  // Guard: Cannot checkout with empty cart unless order was just placed
  if (cartItems.length === 0 && !orderCompleted) {
    return <Navigate to="/cart" replace />;
  }

  const standardFee = shippingTaxCalc.isFreeEligible ? 0 : Number(shippingTaxCalc.zone?.baseFee || 50);
  const expressFee = shippingTaxCalc.isFreeEligible ? 60 : standardFee + 50;
  const calculatedShipping = shippingTaxCalc.shippingFee;
  
  // Referral discount: the server decides what the invitation is worth (and checks it again when the order is placed).
  // It applies to a signed-in customer's first order and cannot be combined with a coupon or offer.
  const referralCode = activeAttribution?.code || "";
  const offerApplied = Boolean(appliedOffer);
  useEffect(() => {
    if (!referralCode) return setReferralPreview({ discount: 0, reason: "" });
    if (!isAuthenticated) return setReferralPreview({ discount: 0, reason: "Sign in or create an account to use your friend's referral code." });
    if (offerApplied) return setReferralPreview({ discount: 0, reason: "A referral code cannot be combined with a coupon or offer." });
    if (subtotal <= 0) return undefined;
    let cancelled = false;
    const timer = setTimeout(async () => {
      const res = await previewDiscount(referralCode, subtotal);
      if (!cancelled) setReferralPreview(res.valid ? { discount: res.discount, reason: "" } : { discount: 0, reason: res.reason || "" });
    }, 300);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [referralCode, isAuthenticated, offerApplied, subtotal, previewDiscount]);
  const referralDiscount = referralPreview.discount;
  const totalCombinedDiscounts = discountTotal + offerDiscount + referralDiscount;
  // MRP - product savings - referral + shipping. (`subtotal` is already net of product savings,
  // so deducting `totalCombinedDiscounts` from it would count the savings twice.)
  const orderTotal = Math.max(0, mrpSubtotal - totalCombinedDiscounts + calculatedShipping);
  // Store credit (from refunds) can cover everything except the last rupee, so there is always something to pay
  const creditApplied = useCredit ? Math.min(storeCredit, Math.max(0, Math.floor(orderTotal) - 1)) : 0;
  const finalTotal = Math.max(0, orderTotal - creditApplied);

  // If cart is empty, redirect
  if (cartItems.length === 0) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center">
        <h2 className="font-heading tracking-tight text-2xl font-bold mb-3">Your Cart is Empty</h2>
        <p className="text-sm text-stone-500 mb-6">
          Please add Ayurvedic formulations before proceeding to checkout.
        </p>
        <Link
          to="/products"
          className="px-6 py-2.5 bg-[#173D2A] text-white text-sm font-semibold rounded-xl"
        >
          Explore Catalog
        </Link>
      </div>
    );
  }

  const validate = () => {
    const errs = {};
    if (!formData.fullName.trim()) errs.fullName = "Full name is required.";
    if (!formData.email.trim() || !formData.email.includes("@"))
      errs.email = "Valid email address is required.";
    if (!formData.phone.trim() || formData.phone.length < 10)
      errs.phone = "Valid 10-digit mobile number is required.";
    if (!formData.street.trim()) errs.street = "Street address is required.";
    if (!formData.city.trim()) errs.city = "City is required.";
    if (!formData.pincode.trim() || formData.pincode.length !== 6)
      errs.pincode = "Valid 6-digit Indian PIN code is required.";
    return errs;
  };

  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      window.scrollTo({ top: 100, behavior: "smooth" });
      return;
    }

    setIsSubmitting(true);

    try {
      const orderPayload = {
        customer: {
          name: formData.fullName,
          email: formData.email,
          phone: formData.phone,
        },
        shippingAddress: {
          street: formData.street,
          city: formData.city,
          state: formData.state,
          pincode: formData.pincode,
        },
        items: cartItems.map((item) => ({
          productId: item.product.id,
          name: item.product.name,
          slug: item.product.slug,
          image: item.product.images?.[0],
          size: item.selectedSize,
          price: item.price,
          quantity: item.quantity,
          total: item.price * item.quantity,
        })),
        pricing: {
          subtotal: mrpSubtotal, // subtotal - discount - referral + shipping = total
          shipping: calculatedShipping,
          discount: discountTotal + offerDiscount, // product savings + offer/coupon saving
          offerDiscount,
          couponCode: appliedOffer?.code || null,
          referralDiscount,
          referralCode: referralDiscount > 0 ? referralCode : null,
          totalCombinedDiscounts,
          storeCredit: creditApplied,
          total: finalTotal,
          tax: shippingTaxCalc.totalTax,
          taxType: shippingTaxCalc.taxType,
          taxLabel: shippingTaxCalc.taxLabel,
          cgst: shippingTaxCalc.cgstAmount,
          sgst: shippingTaxCalc.sgstAmount,
          igst: shippingTaxCalc.igstAmount,
          zone: shippingTaxCalc.zone?.name || "Standard Delivery",
        },
        deliveryMethod,
        paymentMethod:
          paymentMethod === "cod" ? "Cash on Delivery (COD)" : "Online Payment",
        paymentStatus: paymentMethod === "cod" ? "Pending" : "Paid",
        notes: formData.notes,
      };

      const createdOrder = await placeOrder(orderPayload);
      if (creditApplied > 0) refreshCredit();

      if (referralDiscount > 0) clearAttribution(); // the invitation is used up with this first order

      setOrderCompleted(true);
      removeCheckedOutItems();
      const confirmationId = createdOrder.orderNumber || createdOrder.id;
      navigate(`/order-confirmation/${confirmationId}`);
    } catch (err) {
      console.error("Order creation failed:", err);
      refreshOffers(); // e.g. the offer changed while the customer was on this page
      alert(err.message || "Failed to submit order. Please retry.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-[#FBFAF6] min-h-screen py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Breadcrumbs
          items={[
            { label: "Cart", href: "/cart" },
            { label: "Secure Checkout" },
          ]}
        />

        <div className="pb-4 mb-6 border-b border-[#E5E7DF]">
          <h1 className="font-heading tracking-tight text-3xl font-bold text-[#171A17]">
            Botanical Dispensary Checkout
          </h1>
          <p className="text-xs sm:text-sm text-[#666B64] mt-1 flex items-center gap-1.5">
            <Lock size={13} className="text-emerald-700" />
            <span>256-Bit SSL Secured &bull; Ayush Certified Ayurvedic Packaging</span>
          </p>
        </div>

        <form onSubmit={handleSubmitOrder}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Left Column: Contact, Shipping, Payment (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              {/* 1. Contact Information */}
              <div className="bg-white rounded-3xl border border-[#E5E7DF] p-6 shadow-xs space-y-4">
                <h3 className="font-heading tracking-tight text-lg font-bold text-[#171A17] flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#173D2A] text-white text-xs flex items-center justify-center font-sans">
                    1
                  </span>
                  <span>Contact Details</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block font-semibold text-[#171A17] mb-1">
                      Full Name *
                    </label>
                    <input
                      type="text"
                      value={formData.fullName}
                      onChange={(e) =>
                        setFormData({ ...formData, fullName: e.target.value })
                      }
                      placeholder="e.g. Aarav Sharma"
                      className={`w-full p-2.5 bg-stone-50 border rounded-xl focus:outline-none focus:ring-1 focus:ring-[#386B40] ${
                        errors.fullName ? "border-rose-400" : "border-[#E5E7DF]"
                      }`}
                    />
                    {errors.fullName && (
                      <p className="text-[11px] text-rose-500 mt-1">{errors.fullName}</p>
                    )}
                  </div>

                  <div>
                    <label className="block font-semibold text-[#171A17] mb-1">
                      Email Address *
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) =>
                        setFormData({ ...formData, email: e.target.value })
                      }
                      placeholder="e.g. aarav@example.com"
                      className={`w-full p-2.5 bg-stone-50 border rounded-xl focus:outline-none focus:ring-1 focus:ring-[#386B40] ${
                        errors.email ? "border-rose-400" : "border-[#E5E7DF]"
                      }`}
                    />
                    {errors.email && (
                      <p className="text-[11px] text-rose-500 mt-1">{errors.email}</p>
                    )}
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-[#171A17] mb-1">
                      Mobile Number (for delivery tracking SMS) *
                    </label>
                    <input
                      type="tel"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData({ ...formData, phone: e.target.value })
                      }
                      placeholder="10-digit mobile number"
                      className={`w-full p-2.5 bg-stone-50 border rounded-xl focus:outline-none focus:ring-1 focus:ring-[#386B40] ${
                        errors.phone ? "border-rose-400" : "border-[#E5E7DF]"
                      }`}
                    />
                    {errors.phone && (
                      <p className="text-[11px] text-rose-500 mt-1">{errors.phone}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* 2. Shipping Address */}
              <div className="bg-white rounded-3xl border border-[#E5E7DF] p-6 shadow-xs space-y-4">
                <h3 className="font-heading tracking-tight text-lg font-bold text-[#171A17] flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#173D2A] text-white text-xs flex items-center justify-center font-sans">
                    2
                  </span>
                  <span>Shipping Address</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-[#171A17] mb-1">
                      Flat / House No. / Street Address *
                    </label>
                    <input
                      type="text"
                      value={formData.street}
                      onChange={(e) =>
                        setFormData({ ...formData, street: e.target.value })
                      }
                      placeholder="e.g. Flat 402, Nilgiri Heights, 12th Main Road"
                      className={`w-full p-2.5 bg-stone-50 border rounded-xl focus:outline-none focus:ring-1 focus:ring-[#386B40] ${
                        errors.street ? "border-rose-400" : "border-[#E5E7DF]"
                      }`}
                    />
                    {errors.street && (
                      <p className="text-[11px] text-rose-500 mt-1">{errors.street}</p>
                    )}
                  </div>

                  <div>
                    <label className="block font-semibold text-[#171A17] mb-1">
                      City *
                    </label>
                    <input
                      type="text"
                      value={formData.city}
                      onChange={(e) =>
                        setFormData({ ...formData, city: e.target.value })
                      }
                      placeholder="e.g. Bengaluru"
                      className={`w-full p-2.5 bg-stone-50 border rounded-xl focus:outline-none focus:ring-1 focus:ring-[#386B40] ${
                        errors.city ? "border-rose-400" : "border-[#E5E7DF]"
                      }`}
                    />
                    {errors.city && (
                      <p className="text-[11px] text-rose-500 mt-1">{errors.city}</p>
                    )}
                  </div>

                  <div>
                    <label className="block font-semibold text-[#171A17] mb-1">
                      State / UT *
                    </label>
                    <select
                      value={formData.state}
                      onChange={(e) =>
                        setFormData({ ...formData, state: e.target.value })
                      }
                      className="w-full p-2.5 bg-stone-50 border border-[#E5E7DF] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#386B40]"
                    >
                      {INDIAN_STATES.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-[#171A17] mb-1">
                      PIN Code (6 digits) *
                    </label>
                    <input
                      type="text"
                      maxLength={6}
                      value={formData.pincode}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          pincode: e.target.value.replace(/\D/g, ""),
                        })
                      }
                      placeholder="e.g. 560038"
                      className={`w-full p-2.5 bg-stone-50 border rounded-xl focus:outline-none focus:ring-1 focus:ring-[#386B40] ${
                        errors.pincode ? "border-rose-400" : "border-[#E5E7DF]"
                      }`}
                    />
                    {errors.pincode && (
                      <p className="text-[11px] text-rose-500 mt-1">{errors.pincode}</p>
                    )}
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-semibold text-[#171A17] mb-1">
                      Delivery Instructions (Optional)
                    </label>
                    <input
                      type="text"
                      value={formData.notes}
                      onChange={(e) =>
                        setFormData({ ...formData, notes: e.target.value })
                      }
                      placeholder="e.g. Leave with security guard / call before delivery"
                      className="w-full p-2.5 bg-stone-50 border border-[#E5E7DF] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#386B40]"
                    />
                  </div>

                  {/* Dynamic Zone & Distance Delivery Info Card */}
                  <div className="sm:col-span-2 p-3.5 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                        <span className="font-semibold text-emerald-950">
                          📍 {shippingTaxCalc.zone.name}
                        </span>
                        <span className="text-emerald-700 font-medium">
                          • {shippingTaxCalc.estimatedDelivery}
                        </span>
                      </div>
                      <span className="font-bold text-[#173D2A]">
                        {shippingTaxCalc.shippingFee === 0
                          ? "FREE Delivery Applied"
                          : `Delivery Fee: ${formatINR(shippingTaxCalc.shippingFee)}`}
                      </span>
                    </div>

                    {shippingTaxCalc.amountNeededForFree > 0 ? (
                      <div className="pt-2 border-t border-emerald-200/60 flex items-center justify-between text-[11px] text-emerald-800">
                        <span>
                          Add <strong>{formatINR(shippingTaxCalc.amountNeededForFree)}</strong> more to unlock <strong>FREE delivery</strong> to {formData.state}!
                        </span>
                        <span className="font-mono text-emerald-900 font-bold">
                          {shippingTaxCalc.progressPercent}% of {formatINR(shippingTaxCalc.freeThreshold)}
                        </span>
                      </div>
                    ) : (
                      <div className="pt-1.5 border-t border-emerald-200/60 text-[11px] text-emerald-800 font-medium flex items-center gap-1.5">
                        <CheckCircle2 size={13} className="text-emerald-700" />
                        <span>Congratulations! Your cart qualifies for FREE standard shipping to {formData.state}.</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 3. Delivery Method */}
              <div className="bg-white rounded-3xl border border-[#E5E7DF] p-6 shadow-xs space-y-4">
                <h3 className="font-heading tracking-tight text-lg font-bold text-[#171A17] flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#173D2A] text-white text-xs flex items-center justify-center font-sans">
                    3
                  </span>
                  <span>Delivery Speed</span>
                </h3>

                <div className="space-y-3 text-xs">
                  <label
                    className={`flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer transition-all ${
                      deliveryMethod === "standard"
                        ? "border-[#173D2A] bg-[#FBFAF6] ring-1 ring-[#173D2A]"
                        : "border-[#E5E7DF] hover:bg-stone-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="delivery"
                        value="standard"
                        checked={deliveryMethod === "standard"}
                        onChange={() => setDeliveryMethod("standard")}
                        className="text-[#173D2A] focus:ring-[#386B40]"
                      />
                      <div>
                        <span className="font-bold text-[#171A17] block">
                          Standard Botanical Delivery (3-5 business days)
                        </span>
                        <span className="text-stone-500">
                          Secure herbal packaging with zero transit degradation
                        </span>
                      </div>
                    </div>
                    <span className="font-bold text-[#171A17]">
                      {standardFee === 0 ? "FREE" : formatINR(standardFee)}
                    </span>
                  </label>

                  <label
                    className={`flex items-center justify-between p-3.5 rounded-2xl border cursor-pointer transition-all ${
                      deliveryMethod === "express"
                        ? "border-[#173D2A] bg-[#FBFAF6] ring-1 ring-[#173D2A]"
                        : "border-[#E5E7DF] hover:bg-stone-50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="radio"
                        name="delivery"
                        value="express"
                        checked={deliveryMethod === "express"}
                        onChange={() => setDeliveryMethod("express")}
                        className="text-[#173D2A] focus:ring-[#386B40]"
                      />
                      <div>
                        <span className="font-bold text-[#171A17] block">
                          Priority Air Express (1-2 business days)
                        </span>
                        <span className="text-stone-500">
                          Priority dispatch via Blue Dart / Delhivery Express
                        </span>
                      </div>
                    </div>
                    <span className="font-bold text-[#171A17]">
                      {formatINR(expressFee)}
                    </span>
                  </label>
                </div>
              </div>

              {/* 4. Payment Selection */}
              <div className="bg-white rounded-3xl border border-[#E5E7DF] p-6 shadow-xs space-y-4">
                <h3 className="font-heading tracking-tight text-lg font-bold text-[#171A17] flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-[#173D2A] text-white text-xs flex items-center justify-center font-sans">
                    4
                  </span>
                  <span>Payment Method</span>
                </h3>

                <div className="space-y-3 text-xs">
                  {/* COD */}
                  <label
                    className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                      paymentMethod === "cod"
                        ? "border-[#173D2A] bg-[#FBFAF6] ring-1 ring-[#173D2A]"
                        : "border-[#E5E7DF] hover:bg-stone-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment"
                      value="cod"
                      checked={paymentMethod === "cod"}
                      onChange={() => setPaymentMethod("cod")}
                      className="text-[#173D2A] focus:ring-[#386B40] mt-0.5"
                    />
                    <div className="space-y-1">
                      <div className="font-bold text-[#171A17] flex items-center gap-1.5">
                        <Banknote size={16} className="text-[#386B40]" />
                        <span>Cash on Delivery (COD)</span>
                      </div>
                      <p className="text-stone-500">
                        Pay in cash or through UPI upon delivery of your Ayurvedic parcel.
                      </p>
                    </div>
                  </label>

                  {/* Online Payment */}
                  <label
                    className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                      paymentMethod === "online"
                        ? "border-[#173D2A] bg-[#FBFAF6] ring-1 ring-[#173D2A]"
                        : "border-[#E5E7DF] hover:bg-stone-50"
                    }`}
                  >
                    <input
                      type="radio"
                      name="payment"
                      value="online"
                      checked={paymentMethod === "online"}
                      onChange={() => setPaymentMethod("online")}
                      className="text-[#173D2A] focus:ring-[#386B40] mt-0.5"
                    />
                    <div className="space-y-1">
                      <div className="font-bold text-[#171A17] flex items-center gap-1.5">
                        <CreditCard size={16} className="text-[#386B40]" />
                        <span>Online Payment (Cashfree PG)</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold border border-emerald-200">
                          Secure &amp; Instant
                        </span>
                      </div>
                      <p className="text-stone-500">
                        Instant, encrypted checkout via Cashfree PG (UPI, Cards &amp; NetBanking).
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Right Column: Order Summary & Place Order Button (5 cols) */}
            <div className="lg:col-span-5 bg-white rounded-3xl border border-[#E5E7DF] p-6 sm:p-8 space-y-6 shadow-xs sticky top-28">
              <h3 className="font-heading tracking-tight text-xl font-bold text-[#171A17] pb-3 border-b border-[#E5E7DF]">
                Order Items ({cartItems.length})
              </h3>

              {/* Items List */}
              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {cartItems.map((item, idx) => (
                  <div key={idx} className="flex items-center gap-3 text-xs">
                    <img
                      src={item.product.images?.[0]}
                      alt={item.product.name}
                      className="w-12 h-12 rounded-lg bg-[#FBFAF6] border p-1 object-contain shrink-0"
                    />
                    <div className="flex-1 truncate">
                      <span className="font-semibold text-[#171A17] block truncate">
                        {item.product.name}
                      </span>
                      <span className="text-stone-500">
                        {item.selectedSize} × {item.quantity}
                      </span>
                    </div>
                    <span className="font-bold text-[#171A17] shrink-0">
                      {formatINR(item.price * item.quantity)}
                    </span>
                  </div>
                ))}
              </div>

              {/* Price Breakdown */}
              <div className="border-t border-[#E5E7DF] pt-4 space-y-2 text-xs sm:text-sm">
                <div className="flex justify-between text-[#666B64]">
                  <span>Subtotal (MRP)</span>
                  <span className="font-semibold text-[#171A17]">{formatINR(mrpSubtotal)}</span>
                </div>
                {discountTotal > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Discount</span>
                    <span className="font-semibold">-{formatINR(discountTotal)}</span>
                  </div>
                )}
                {offerDiscount > 0 && appliedOffer && (
                  <div className="flex justify-between text-emerald-700">
                    <span>
                      {appliedOffer.title || appliedOffer.code}
                      <span className="block text-[10px] text-emerald-600/80">
                        {appliedOffer.source === "auto" ? "Offer auto-applied" : `Coupon ${appliedOffer.code}`}
                      </span>
                    </span>
                    <span className="font-semibold">-{formatINR(offerDiscount)}</span>
                  </div>
                )}
                {referralDiscount > 0 && (
                  <div className="flex justify-between items-center text-emerald-800 bg-emerald-50/80 px-2.5 py-1.5 rounded-xl border border-emerald-200">
                    <span className="flex items-center gap-1.5 font-medium text-xs">
                      <Gift size={13} className="text-emerald-700 shrink-0" />
                      <span>Friend Referral Discount ({activeAttribution?.code})</span>
                    </span>
                    <span className="font-bold text-xs">-{formatINR(referralDiscount)}</span>
                  </div>
                )}
                {/* Friend's referral code, typed in by hand (a link saves it automatically) */}
                {!referralCode ? (
                  <div className="space-y-1">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={codeInput}
                        onChange={(e) => {
                          setCodeInput(e.target.value.toUpperCase());
                          setCodeMessage("");
                        }}
                        placeholder="Referral code from a friend"
                        className="flex-1 min-w-0 px-3 py-2 text-xs font-mono bg-stone-50 border border-[#E5E7DF] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#386B40]"
                      />
                      <button
                        type="button"
                        disabled={applyingCode || !codeInput.trim()}
                        onClick={async () => {
                          setApplyingCode(true);
                          const res = await applyReferralCode(codeInput);
                          setApplyingCode(false);
                          setCodeMessage(res.valid ? "" : res.reason || "This referral code is not valid.");
                          if (res.valid) setCodeInput("");
                        }}
                        className="px-3 py-2 text-xs font-semibold rounded-xl bg-[#173D2A] text-white disabled:opacity-50"
                      >
                        {applyingCode ? "Checking…" : "Apply"}
                      </button>
                    </div>
                    {codeMessage && <p className="text-[11px] text-rose-700">{codeMessage}</p>}
                  </div>
                ) : (
                  <button type="button" onClick={clearAttribution} className="text-[11px] text-stone-500 underline">
                    Remove referral code {referralCode}
                  </button>
                )}
                {referralCode && referralDiscount === 0 && referralPreview.reason && (
                  <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-2.5 py-1.5">
                    Referral code {referralCode}: {referralPreview.reason}
                  </p>
                )}
                <div className="flex justify-between text-[#666B64]">
                  <div>
                    <span>Shipping &amp; Delivery</span>
                    <span className="block text-[10px] text-stone-400">
                      {shippingTaxCalc.zone?.name || "Standard Delivery"} ({formData.state})
                    </span>
                  </div>
                  <span className="font-semibold text-[#171A17]">
                    {calculatedShipping === 0 ? (
                      <span className="text-emerald-700 font-bold">FREE</span>
                    ) : (
                      formatINR(calculatedShipping)
                    )}
                  </span>
                </div>

                {/* Indian GST Tax Breakdown */}
                <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200/80 text-[11px] space-y-1">
                  <div className="flex justify-between text-stone-700 font-medium">
                    <span>{shippingTaxCalc.taxLabel}</span>
                    <span className="font-bold text-stone-900">
                      {formatINR(shippingTaxCalc.totalTax)}
                    </span>
                  </div>
                  {shippingTaxCalc.taxType === "INTRA_STATE" ? (
                    <div className="flex justify-between text-[10px] text-stone-500">
                      <span>CGST ({shippingTaxCalc.cgstRate}%): {formatINR(shippingTaxCalc.cgstAmount)}</span>
                      <span>SGST ({shippingTaxCalc.sgstRate}%): {formatINR(shippingTaxCalc.sgstAmount)}</span>
                    </div>
                  ) : (
                    <div className="flex justify-between text-[10px] text-stone-500">
                      <span>IGST ({shippingTaxCalc.igstRate}%): {formatINR(shippingTaxCalc.igstAmount)}</span>
                      <span className="text-emerald-700 font-medium">Inter-State Dispatch</span>
                    </div>
                  )}
                  <div className="text-[10px] text-stone-400 italic pt-0.5">
                    * Included in product price as per Indian GST regulations.
                  </div>
                </div>

                {storeCredit > 0 && (
                  <label className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs cursor-pointer">
                    <span className="flex items-center gap-2">
                      <input type="checkbox" checked={useCredit} onChange={(e) => setUseCredit(e.target.checked)} />
                      <span className="font-semibold text-emerald-900">Use store credit ({formatINR(storeCredit)} available)</span>
                    </span>
                    {creditApplied > 0 && <span className="font-bold text-emerald-800">-{formatINR(creditApplied)}</span>}
                  </label>
                )}

                <div className="border-t border-[#E5E7DF] pt-3 flex justify-between items-baseline">
                  <div>
                    <span className="text-base font-heading tracking-tight font-bold text-[#171A17] block">
                      Total Payable
                    </span>
                    <span className="text-[11px] text-stone-400">
                      Inclusive of all taxes &amp; shipping
                    </span>
                  </div>
                  <span className="text-2xl font-bold text-[#173D2A]">
                    {formatINR(finalTotal)}
                  </span>
                </div>
              </div>

              {/* Place Order CTA */}
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-4 px-6 bg-[#173D2A] hover:bg-[#0B2416] text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>Processing Order...</span>
                ) : (
                  <span>Place Order • {formatINR(finalTotal)}</span>
                )}
              </button>

              <div className="text-[11px] text-center text-stone-400">
                By placing your order, you agree to Divyam Ayurveda's Terms of Service and Privacy Policy.
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
