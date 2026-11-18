import React, { useState, useEffect, useRef } from "react";
import { useNavigate, Link, Navigate, useLocation } from "react-router-dom";
import { openCashfree, paymentOpensFullPage, paymentReturnOrigin } from "../utils/cashfreeCheckout";
import {
  CreditCard,
  Banknote,
  CheckCircle2,
  Lock,
  AlertCircle,
  Gift,
  UserRound,
  MapPin,
  Loader2,
  Plus,
  ShieldCheck,
} from "lucide-react";
import { Breadcrumbs } from "../components/common/Breadcrumbs";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { useReturns } from "../context/ReturnContext";
import { useOrders } from "../context/OrderContext";
import { orderService } from "../services/api";
import { useStoreSettings } from "../hooks/useStoreSettings";
import { useReferrals } from "../context/ReferralContext";
import { formatINR } from "../utils/formatters";
import { INDIAN_STATES } from "../utils/shippingCalculator";
import { useCheckoutPricing } from "../hooks/useCheckoutPricing";
import { getAttribution, trackEvent, contentParams } from "../utils/metaPixel";

const inputBase =
  "w-full p-2.5 bg-stone-50 border rounded-xl text-sm sm:text-xs focus:outline-none focus:ring-1 focus:ring-[#386B40] focus:bg-white";
const border = (hasError) => (hasError ? "border-rose-400" : "border-[#E5E7DF]");

// Indian mobile number as 10 digits (accepts +91 / 0 prefixes and spaces as typed or autofilled)
const toMobileDigits = (value) => {
  let digits = String(value || "").replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  return digits.slice(0, 10);
};

// India Post spells some states differently from our list ("Jammu and Kashmir" vs "Jammu & Kashmir")
const matchState = (name) => {
  const norm = (v) => String(v || "").toLowerCase().replace(/&/g, "and").replace(/[^a-z]/g, "");
  return INDIAN_STATES.find((st) => norm(st) === norm(name)) || null;
};

const addressFromSaved = (a = {}) => ({
  house: a.street || "",
  area: a.line2 || "",
  landmark: "",
  city: a.city || "",
  state: a.state || "",
  pincode: a.pincode || "",
});

const FieldError = ({ id, message }) =>
  message ? (
    <p id={id} className="text-[11px] text-rose-600 mt-1">
      {message}
    </p>
  ) : null;

const SectionTitle = ({ n, children }) => (
  <h2 className="font-heading tracking-tight text-lg font-bold text-[#171A17] flex items-center gap-2">
    <span className="w-6 h-6 rounded-full bg-[#173D2A] text-white text-xs flex items-center justify-center font-sans">{n}</span>
    <span>{children}</span>
  </h2>
);

export const CheckoutPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
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
    buyNowRequested, // true at /checkout?buyNow=1: this page holds one product, the cart is untouched
  } = useCart();
  const { user, addresses, isAuthenticated, addAddress } = useAuth();
  const { storeCredit, refresh: refreshCredit } = useReturns();
  const [useCredit, setUseCredit] = useState(false);
  const { placeOrder } = useOrders();
  const { settings: storeSettings, status: settingsStatus, retry: retrySettings } = useStoreSettings();
  const { activeAttribution, clearAttribution, applyReferralCode } = useReferrals();
  const [codeInput, setCodeInput] = useState("");
  const [codeMessage, setCodeMessage] = useState("");
  const [applyingCode, setApplyingCode] = useState(false);

  // Signed-in customers: saved addresses (default first). Guests: none.
  const savedAddresses = isAuthenticated ? addresses : [];
  const defaultAddr = savedAddresses.find((a) => a.isDefault) || savedAddresses[0] || null;
  const [selectedAddressId, setSelectedAddressId] = useState(defaultAddr?.id || "new");
  const [saveNewAddress, setSaveNewAddress] = useState(true);

  const [formData, setFormData] = useState(() => ({
    fullName: user?.name || defaultAddr?.fullName || "",
    email: user?.email || "",
    phone: toMobileDigits(user?.phoneNumber || user?.phone || defaultAddr?.phone || ""),
    ...addressFromSaved(defaultAddr || {}),
    notes: "",
  }));
  const setField = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => (prev[key] ? { ...prev, [key]: undefined } : prev));
  };

  // Saved addresses load after sign-in: fill the form once, without touching anything already typed
  const appliedDefaultRef = useRef(Boolean(defaultAddr));
  useEffect(() => {
    if (appliedDefaultRef.current || !defaultAddr) return;
    appliedDefaultRef.current = true;
    setSelectedAddressId(defaultAddr.id);
    setFormData((prev) => ({
      ...prev,
      fullName: prev.fullName || defaultAddr.fullName || "",
      phone: prev.phone || toMobileDigits(defaultAddr.phone),
      ...(prev.house || prev.pincode ? {} : addressFromSaved(defaultAddr)),
    }));
  }, [defaultAddr]);

  // Signed in on another tab / just now: bring the account details in where the form is still empty
  useEffect(() => {
    if (!user) return;
    setFormData((prev) => ({
      ...prev,
      fullName: prev.fullName || user.name || "",
      email: prev.email || user.email || "",
      phone: prev.phone || toMobileDigits(user.phoneNumber || user.phone || ""),
    }));
  }, [user?.id]);

  const chooseSavedAddress = (addr) => {
    setSelectedAddressId(addr.id);
    setFormData((prev) => ({
      ...prev,
      fullName: addr.fullName || prev.fullName,
      phone: toMobileDigits(addr.phone) || prev.phone,
      ...addressFromSaved(addr),
    }));
    setErrors({});
  };
  const chooseNewAddress = () => {
    setSelectedAddressId("new");
    setFormData((prev) => ({ ...prev, house: "", area: "", landmark: "", city: "", pincode: "" }));
    autoFilledRef.current = { city: "", state: "" };
  };

  // PIN code -> city / state. Only fills a field that is empty or still holds our own earlier suggestion,
  // so nothing the customer typed is overwritten.
  const autoFilledRef = useRef({ city: "", state: "" });
  const formRef = useRef(formData);
  formRef.current = formData;
  const [pinInfo, setPinInfo] = useState({ status: "idle", city: "", state: "" });
  useEffect(() => {
    const pin = formData.pincode;
    if (!/^[1-9]\d{5}$/.test(pin)) {
      setPinInfo({ status: "idle", city: "", state: "" });
      return undefined;
    }
    let cancelled = false;
    setPinInfo((p) => ({ ...p, status: "loading" }));
    orderService.lookupPincode(pin).then((res) => {
      if (cancelled) return;
      if (!res.found) {
        setPinInfo({ status: "unknown", city: "", state: "" });
        return;
      }
      const state = matchState(res.state);
      setPinInfo({ status: "found", city: res.city, state: state || res.state });
      // Decided here, outside the state updater (React may run an updater twice in development, and the
      // "what did we fill in last time" memory must not change inside it).
      const cur = formRef.current;
      const nextCity = res.city && (!cur.city.trim() || cur.city === autoFilledRef.current.city) ? res.city : cur.city;
      const nextState = state && (!cur.state || cur.state === autoFilledRef.current.state) ? state : cur.state;
      autoFilledRef.current = {
        city: nextCity === res.city ? res.city : autoFilledRef.current.city,
        state: nextState === state ? state : autoFilledRef.current.state,
      };
      setFormData((prev) => ({ ...prev, city: nextCity, state: nextState }));
    });
    return () => {
      cancelled = true;
    };
  }, [formData.pincode]);

  const [deliveryMethod, setDeliveryMethod] = useState("standard"); // standard, express
  const [chosenMethod, setPaymentMethod] = useState("cod"); // cod, online (what the customer picked)
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const submittingRef = useRef(false); // blocks a double tap before React re-renders
  const [orderCompleted, setOrderCompleted] = useState(false);
  const errorBoxRef = useRef(null);

  // Offers can change at any time: re-check them when checkout opens (and while it stays open)
  useEffect(() => {
    refreshOffers();
    const timer = setInterval(refreshOffers, 60000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Delivery, discounts, GST and the total come from the server (the one place that calculates them); this page
  // only displays them. Every change to the address, items, delivery speed, offer or referral asks again.
  const referralCode = activeAttribution?.code || "";
  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(formData.email.trim());
  const pricingRequest =
    cartItems.length > 0 && formData.state
      ? {
          items: cartItems.map((i) => ({ productId: i.product.id, size: i.selectedSize, quantity: i.quantity })),
          address: {
            state: formData.state,
            pincode: /^[1-9]\d{5}$/.test(formData.pincode) ? formData.pincode : undefined,
            email: validEmail ? formData.email.trim() : undefined,
            phone: /^[6-9]\d{9}$/.test(formData.phone) ? formData.phone : undefined,
          },
          deliveryMethod,
          couponCode: appliedOffer?.code || null,
          referralCode: referralCode || null,
        }
      : null;
  const pricingState = useCheckoutPricing(pricingRequest);
  const priced = pricingState.data;
  const pricing = priced?.pricing || null;

  // Express can disappear when the address changes (courier cannot do it there): fall back to standard
  useEffect(() => {
    if (deliveryMethod === "express" && priced?.options && !priced.options.express.available) setDeliveryMethod("standard");
  }, [priced, deliveryMethod]);

  // Meta Ads: checkout started (once per visit to this page)
  const initiatedRef = useRef(false);
  useEffect(() => {
    if (initiatedRef.current || cartItems.length === 0) return;
    initiatedRef.current = true;
    trackEvent(
      "InitiateCheckout",
      contentParams(cartItems.map((i) => ({ productId: i.product.id, price: i.price, quantity: i.quantity })), subtotal)
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cartItems.length]);

  // Guard: Cannot checkout with empty cart unless order was just placed
  if (cartItems.length === 0 && !orderCompleted) {
    // Buy Now item expired, sold out or lost: back to the catalog. Otherwise the normal empty-cart redirect.
    return <Navigate to={buyNowRequested ? "/products" : "/cart"} replace />;
  }

  const deliverable = priced?.deliverable !== false;
  const options = priced?.options || null;
  const calculatedShipping = pricing?.shipping.total ?? 0;
  const referralDiscount = pricing?.referralDiscount || 0;
  const referralReason = priced?.referral?.reason || "";
  const offerProblem = priced?.offer?.error || "";
  // Until the server has priced the basket (no state chosen yet) show the goods total as an estimate
  const orderTotal = pricing ? pricing.total : Math.max(0, subtotal - offerDiscount);
  // Store credit (from refunds) can cover everything except the last rupee, so there is always something to pay
  const creditApplied = useCredit ? Math.min(storeCredit, Math.max(0, Math.floor(orderTotal) - 1)) : 0;
  const finalTotal = Math.max(0, Math.round((orderTotal - creditApplied) * 100) / 100);

  // Which payment options the store currently offers (Admin -> Settings). COD can also be switched off for
  // big orders by its limit. The server enforces the same rules when the order is placed.
  const store = storeSettings?.store || {};
  const onlineAllowed = store.enableOnlinePayments !== false;
  const codSwitchedOn = store.enableCashOnDelivery !== false;
  const codLimit = Number(store.maxCodLimit) || 0;
  const codOverLimit = codSwitchedOn && codLimit > 0 && finalTotal > codLimit;
  const codAllowed = codSwitchedOn && !codOverLimit;
  const paymentMethod =
    chosenMethod === "cod"
      ? codAllowed || !onlineAllowed ? "cod" : "online"
      : onlineAllowed || !codAllowed ? "online" : "cod";
  const noPaymentAvailable = !codAllowed && !onlineAllowed;
  const settingsReady = settingsStatus === "ready";

  const validate = () => {
    const errs = {};
    if (!formData.fullName.trim()) errs.fullName = "Please enter your full name.";
    if (!/^[6-9]\d{9}$/.test(formData.phone)) errs.phone = "Enter a valid 10-digit Indian mobile number.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(formData.email.trim())) errs.email = "Enter a valid email address for order updates.";
    if (!formData.house.trim()) errs.house = "Please enter your house / flat / building.";
    if (!formData.area.trim()) errs.area = "Please enter your street or area.";
    if (!/^[1-9]\d{5}$/.test(formData.pincode)) errs.pincode = "Enter a valid 6-digit PIN code.";
    if (!formData.city.trim()) errs.city = "Please enter your city.";
    if (!formData.state) errs.state = "Please choose your state.";
    return errs;
  };

  const focusFirstError = (errs) => {
    const first = ["fullName", "phone", "email", "house", "area", "pincode", "city", "state"].find((k) => errs[k]);
    if (!first) return;
    const el = document.getElementById(`co-${first}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.focus({ preventScroll: true });
    }
  };

  const showSubmitError = (message) => {
    setSubmitError(message);
    setTimeout(() => errorBoxRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
  };

  const handleSubmitOrder = async (e) => {
    e.preventDefault();
    if (submittingRef.current) return; // never place the same order twice
    setSubmitError("");
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      focusFirstError(validationErrors);
      return;
    }
    if (!pricing || !pricingState.isCurrent) {
      showSubmitError("We're still updating your total. Please try again in a moment.");
      pricingState.refresh();
      return;
    }
    if (!deliverable) {
      showSubmitError(priced?.message || "We can't deliver to this address.");
      return;
    }

    submittingRef.current = true;
    setIsSubmitting(true);

    try {
      // Stop early if the courier cannot deliver here. A failed check (courier API down) never blocks the order;
      // the server makes the final call when the order is placed.
      const delivery = await orderService.checkPinCode(formData.pincode, { cod: paymentMethod === "cod" });
      if (!delivery.serviceable && !delivery.unavailable) {
        setErrors({ pincode: delivery.message });
        focusFirstError({ pincode: true });
        return;
      }

      const street = [formData.house.trim(), formData.area.trim()].filter(Boolean).join(", ");
      const line2 = formData.landmark.trim() ? `Landmark: ${formData.landmark.trim()}` : "";
      const lines = cartItems.map((i) => ({ productId: i.product.id, price: i.price, quantity: i.quantity }));
      trackEvent("AddPaymentInfo", { ...contentParams(lines, finalTotal), payment_type: paymentMethod === "cod" ? "cod" : "online" });

      const orderPayload = {
        customer: {
          name: formData.fullName.trim(),
          email: formData.email.trim(),
          phone: formData.phone,
        },
        shippingAddress: {
          street,
          line2,
          city: formData.city.trim(),
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
        // Only what the server needs to verify: which offer, the credit used, and the total the customer was shown.
        // Delivery, GST and the amount charged are calculated again on the server.
        pricing: {
          couponCode: appliedOffer && !offerProblem ? appliedOffer.code : null,
          offerDiscount: pricing.offerDiscount,
          referralDiscount,
          referralCode: referralDiscount > 0 ? referralCode : null,
          storeCredit: creditApplied,
          expectedTotal: finalTotal,
        },
        deliveryMethod,
        paymentMethod: paymentMethod === "cod" ? "Cash on Delivery (COD)" : "Online Payment",
        paymentStatus: "Pending",
        notes: formData.notes.trim(),
        attribution: getAttribution(), // ad click ids / UTM tags (no personal data)
        returnOrigin: paymentReturnOrigin(), // Cashfree sends the customer back to this same site after paying
      };

      const createdOrder = await placeOrder(orderPayload);
      const confirmationId = createdOrder.orderNumber || createdOrder.id;

      // Signed in with a new address and asked to keep it: save it for next time (never blocks the order)
      if (isAuthenticated && selectedAddressId === "new" && saveNewAddress) {
        addAddress({
          fullName: orderPayload.customer.name,
          phone: formData.phone,
          street,
          line2,
          city: orderPayload.shippingAddress.city,
          state: formData.state,
          pincode: formData.pincode,
          type: "Home",
          isDefault: savedAddresses.length === 0,
        }).catch(() => {});
      }

      if (creditApplied > 0) refreshCredit();
      if (referralDiscount > 0) clearAttribution(); // the invitation is used up with this first order
      setOrderCompleted(true);

      if (paymentMethod === "online") {
        let paymentSessionId = createdOrder.paymentSession?.paymentSessionId;
        let cfEnv = createdOrder.paymentSession?.environment || "production";

        // Fallback: fetch session if not attached
        if (!paymentSessionId) {
          try {
            const sessRes = await fetch("/api/v1/payments/cashfree/session", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({ orderNumber: confirmationId, returnOrigin: paymentReturnOrigin() }),
            });
            const sessData = await sessRes.json();
            if (sessData.success && sessData.data?.paymentSessionId) {
              paymentSessionId = sessData.data.paymentSessionId;
              cfEnv = sessData.data.environment || cfEnv;
            }
          } catch (sessErr) {
            console.warn("Could not retrieve payment session:", sessErr);
          }
        }

        if (paymentSessionId) {
          // On phones and in-app browsers payment opens as a full page and this page is left, so the cart is
          // cleared first (the order is saved; "Complete payment" on the confirmation page can retry it).
          if (paymentOpensFullPage()) removeCheckedOutItems();
          try {
            const opened = await openCashfree({ paymentSessionId, environment: cfEnv });
            if (!opened.opened) console.warn("Payment server is in test mode; Cashfree checkout skipped.");
          } catch (sdkErr) {
            console.warn("Cashfree checkout interaction:", sdkErr);
          }
        }
        // The confirmation page verifies the payment with the server and offers "Complete payment" if needed
      }

      removeCheckedOutItems();
      navigate(`/order-confirmation/${confirmationId}`);
    } catch (err) {
      console.error("Order creation failed:", err);
      refreshOffers(); // e.g. the offer changed while the customer was on this page
      pricingState.refresh(); // and show the up-to-date total (e.g. after "the price changed")
      showSubmitError(err.message || "We couldn't place your order. Please check your details and try again.");
    } finally {
      submittingRef.current = false;
      setIsSubmitting(false);
    }
  };

  const pricingBusy = Boolean(pricingRequest) && (!pricingState.isCurrent || !pricing);
  const placeDisabled = isSubmitting || !settingsReady || noPaymentAvailable || pricingBusy || !deliverable;
  const placeLabel = isSubmitting
    ? "Placing your order..."
    : !pricingRequest
      ? "Enter your address to continue"
      : pricingBusy
        ? "Updating your total..."
        : paymentMethod === "online"
      ? `Pay ${formatINR(finalTotal)}`
      : `Place Order • ${formatINR(finalTotal)}`;

  return (
    <div className="bg-[#FBFAF6] min-h-screen py-6 sm:py-8 pb-[calc(6.5rem+env(safe-area-inset-bottom))] lg:pb-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <Breadcrumbs items={[{ label: "Cart", href: "/cart" }, { label: "Secure Checkout" }]} />

        <div className="pb-4 mb-5 border-b border-[#E5E7DF]">
          <h1 className="font-heading tracking-tight text-2xl sm:text-3xl font-bold text-[#171A17]">Secure Checkout</h1>
          <p className="text-xs sm:text-sm text-[#666B64] mt-1 flex items-center gap-1.5">
            <Lock size={13} className="text-emerald-700" />
            <span>256-bit SSL secured &bull; One page, no account needed</span>
          </p>
        </div>

        {/* Guest / account banner */}
        {!isAuthenticated ? (
          <div className="mb-5 p-3.5 rounded-2xl bg-white border border-[#E5E7DF] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-[#171A17]">
              <UserRound size={16} className="text-[#386B40] shrink-0" />
              <span>
                <strong>Checking out as a guest.</strong> No account or password needed.
              </span>
            </div>
            <Link
              to="/login"
              state={{ from: `${location.pathname}${location.search}`, message: "Sign in to use your saved details. Your items stay as they are." }}
              className="font-semibold text-[#173D2A] hover:underline shrink-0"
            >
              Have an account? Sign in
            </Link>
          </div>
        ) : (
          <div className="mb-5 p-3.5 rounded-2xl bg-emerald-50/70 border border-emerald-200 flex items-center gap-2 text-xs text-emerald-900">
            <CheckCircle2 size={16} className="text-emerald-700 shrink-0" />
            <span>
              Signed in as <strong>{user?.email}</strong>. Your details are filled in; change anything you need.
            </span>
          </div>
        )}

        <form onSubmit={handleSubmitOrder} noValidate>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
            {/* Left Column: Contact, Address, Delivery, Payment */}
            <div className="lg:col-span-7 space-y-5">
              {/* 1. Contact */}
              <section className="bg-white rounded-3xl border border-[#E5E7DF] p-5 sm:p-6 shadow-xs space-y-4" aria-labelledby="co-contact">
                <div id="co-contact">
                  <SectionTitle n={1}>Contact Details</SectionTitle>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="sm:col-span-2">
                    <label htmlFor="co-fullName" className="block font-semibold text-[#171A17] mb-1">Full Name *</label>
                    <input
                      id="co-fullName"
                      type="text"
                      autoComplete="name"
                      value={formData.fullName}
                      onChange={(e) => setField("fullName", e.target.value)}
                      placeholder="e.g. Aarav Sharma"
                      aria-invalid={Boolean(errors.fullName)}
                      aria-describedby={errors.fullName ? "co-fullName-err" : undefined}
                      className={`${inputBase} ${border(errors.fullName)}`}
                    />
                    <FieldError id="co-fullName-err" message={errors.fullName} />
                  </div>

                  <div>
                    <label htmlFor="co-phone" className="block font-semibold text-[#171A17] mb-1">Mobile Number *</label>
                    <div className={`flex items-stretch rounded-xl border bg-stone-50 focus-within:ring-1 focus-within:ring-[#386B40] focus-within:bg-white ${border(errors.phone)}`}>
                      <span className="px-3 flex items-center text-sm sm:text-xs text-stone-500 border-r border-[#E5E7DF] select-none">+91</span>
                      <input
                        id="co-phone"
                        type="tel"
                        inputMode="numeric"
                        autoComplete="tel-national"
                        value={formData.phone}
                        onChange={(e) => setField("phone", toMobileDigits(e.target.value))}
                        placeholder="10-digit mobile number"
                        aria-invalid={Boolean(errors.phone)}
                        aria-describedby={errors.phone ? "co-phone-err" : "co-phone-hint"}
                        className="flex-1 min-w-0 p-2.5 bg-transparent text-sm sm:text-xs focus:outline-none"
                      />
                    </div>
                    {errors.phone ? (
                      <FieldError id="co-phone-err" message={errors.phone} />
                    ) : (
                      <p id="co-phone-hint" className="text-[11px] text-stone-400 mt-1">For delivery updates from the courier.</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="co-email" className="block font-semibold text-[#171A17] mb-1">Email Address *</label>
                    <input
                      id="co-email"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      value={formData.email}
                      onChange={(e) => setField("email", e.target.value)}
                      placeholder="e.g. aarav@example.com"
                      aria-invalid={Boolean(errors.email)}
                      aria-describedby={errors.email ? "co-email-err" : undefined}
                      className={`${inputBase} ${border(errors.email)}`}
                    />
                    <FieldError id="co-email-err" message={errors.email} />
                  </div>
                </div>
              </section>

              {/* 2. Delivery address */}
              <section className="bg-white rounded-3xl border border-[#E5E7DF] p-5 sm:p-6 shadow-xs space-y-4" aria-labelledby="co-address">
                <div id="co-address">
                  <SectionTitle n={2}>Delivery Address</SectionTitle>
                </div>

                {savedAddresses.length > 0 && (
                  <div className="space-y-2 text-xs">
                    <p className="font-semibold text-[#171A17]">Your saved addresses</p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {savedAddresses.map((a) => {
                        const active = selectedAddressId === a.id;
                        return (
                          <button
                            key={a.id}
                            type="button"
                            onClick={() => chooseSavedAddress(a)}
                            aria-pressed={active}
                            className={`text-left p-3 rounded-2xl border transition-all cursor-pointer ${
                              active ? "border-[#173D2A] bg-[#FBFAF6] ring-1 ring-[#173D2A]" : "border-[#E5E7DF] hover:bg-stone-50"
                            }`}
                          >
                            <span className="flex items-center gap-1.5 font-bold text-[#171A17]">
                              <MapPin size={13} className="text-[#386B40]" />
                              {a.type || "Address"}
                              {a.isDefault && <span className="text-[10px] font-semibold text-emerald-700">Default</span>}
                            </span>
                            <span className="block text-stone-600 mt-0.5 line-clamp-2">
                              {a.fullName} &bull; {a.street}
                              {a.line2 ? `, ${a.line2}` : ""}, {a.city} - {a.pincode}
                            </span>
                          </button>
                        );
                      })}
                      <button
                        type="button"
                        onClick={chooseNewAddress}
                        aria-pressed={selectedAddressId === "new"}
                        className={`p-3 rounded-2xl border border-dashed flex items-center justify-center gap-1.5 font-semibold cursor-pointer ${
                          selectedAddressId === "new" ? "border-[#173D2A] text-[#173D2A] bg-[#FBFAF6]" : "border-stone-300 text-stone-600 hover:bg-stone-50"
                        }`}
                      >
                        <Plus size={14} />
                        Deliver to a new address
                      </button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="sm:col-span-2">
                    <label htmlFor="co-house" className="block font-semibold text-[#171A17] mb-1">House / Flat / Building *</label>
                    <input
                      id="co-house"
                      type="text"
                      autoComplete="address-line1"
                      value={formData.house}
                      onChange={(e) => setField("house", e.target.value)}
                      placeholder="e.g. Flat 402, Nilgiri Heights"
                      aria-invalid={Boolean(errors.house)}
                      aria-describedby={errors.house ? "co-house-err" : undefined}
                      className={`${inputBase} ${border(errors.house)}`}
                    />
                    <FieldError id="co-house-err" message={errors.house} />
                  </div>

                  <div className="sm:col-span-2">
                    <label htmlFor="co-area" className="block font-semibold text-[#171A17] mb-1">Street / Area *</label>
                    <input
                      id="co-area"
                      type="text"
                      autoComplete="address-line2"
                      value={formData.area}
                      onChange={(e) => setField("area", e.target.value)}
                      placeholder="e.g. 12th Main Road, Indiranagar"
                      aria-invalid={Boolean(errors.area)}
                      aria-describedby={errors.area ? "co-area-err" : undefined}
                      className={`${inputBase} ${border(errors.area)}`}
                    />
                    <FieldError id="co-area-err" message={errors.area} />
                  </div>

                  <div className="sm:col-span-2">
                    <label htmlFor="co-landmark" className="block font-semibold text-[#171A17] mb-1">
                      Landmark <span className="font-normal text-stone-400">(optional)</span>
                    </label>
                    <input
                      id="co-landmark"
                      type="text"
                      value={formData.landmark}
                      onChange={(e) => setField("landmark", e.target.value)}
                      placeholder="e.g. Near City Hospital"
                      className={`${inputBase} border-[#E5E7DF]`}
                    />
                  </div>

                  <div>
                    <label htmlFor="co-pincode" className="block font-semibold text-[#171A17] mb-1">PIN Code *</label>
                    <div className="relative">
                      <input
                        id="co-pincode"
                        type="text"
                        inputMode="numeric"
                        autoComplete="postal-code"
                        maxLength={6}
                        value={formData.pincode}
                        onChange={(e) => setField("pincode", e.target.value.replace(/\D/g, "").slice(0, 6))}
                        placeholder="6-digit PIN code"
                        aria-invalid={Boolean(errors.pincode)}
                        aria-describedby={errors.pincode ? "co-pincode-err" : "co-pincode-hint"}
                        className={`${inputBase} ${border(errors.pincode)} pr-8`}
                      />
                      {pinInfo.status === "loading" && (
                        <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-stone-400" aria-hidden="true" />
                      )}
                    </div>
                    {errors.pincode || priced?.addressIssue?.message ? (
                      <FieldError id="co-pincode-err" message={errors.pincode || priced.addressIssue.message} />
                    ) : (
                      <p id="co-pincode-hint" className="text-[11px] text-stone-400 mt-1" aria-live="polite">
                        {pinInfo.status === "found"
                          ? `${pinInfo.city}, ${pinInfo.state}`
                          : "City and state fill in automatically when we recognise it."}
                      </p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="co-city" className="block font-semibold text-[#171A17] mb-1">City *</label>
                    <input
                      id="co-city"
                      type="text"
                      autoComplete="address-level2"
                      value={formData.city}
                      onChange={(e) => setField("city", e.target.value)}
                      placeholder="e.g. Bengaluru"
                      aria-invalid={Boolean(errors.city)}
                      aria-describedby={errors.city ? "co-city-err" : undefined}
                      className={`${inputBase} ${border(errors.city)}`}
                    />
                    <FieldError id="co-city-err" message={errors.city} />
                  </div>

                  <div className="sm:col-span-2">
                    <label htmlFor="co-state" className="block font-semibold text-[#171A17] mb-1">State / UT *</label>
                    <select
                      id="co-state"
                      autoComplete="address-level1"
                      value={formData.state}
                      onChange={(e) => setField("state", e.target.value)}
                      className={`${inputBase} ${border(errors.state)}`}
                    >
                      <option value="">Select your state / UT</option>
                      {INDIAN_STATES.map((st) => (
                        <option key={st} value={st}>
                          {st}
                        </option>
                      ))}
                    </select>
                    <FieldError id="co-state-err" message={errors.state} />
                  </div>

                  <div className="sm:col-span-2">
                    <label htmlFor="co-notes" className="block font-semibold text-[#171A17] mb-1">
                      Delivery Instructions <span className="font-normal text-stone-400">(optional)</span>
                    </label>
                    <input
                      id="co-notes"
                      type="text"
                      maxLength={300}
                      value={formData.notes}
                      onChange={(e) => setField("notes", e.target.value)}
                      placeholder="e.g. Call before delivery"
                      className={`${inputBase} border-[#E5E7DF]`}
                    />
                  </div>

                  {isAuthenticated && selectedAddressId === "new" && (
                    <label className="sm:col-span-2 flex items-center gap-2 text-stone-600 cursor-pointer">
                      <input type="checkbox" checked={saveNewAddress} onChange={(e) => setSaveNewAddress(e.target.checked)} />
                      <span>Save this address to my account for next time</span>
                    </label>
                  )}

                  {/* Delivery zone & free-shipping progress (all figures from the server) */}
                  <div className="sm:col-span-2 p-3.5 bg-emerald-50/70 border border-emerald-200/80 rounded-2xl space-y-2" aria-live="polite">
                    {!deliverable ? (
                      <div className="flex items-start gap-2 text-xs text-rose-700">
                        <AlertCircle size={14} className="shrink-0 mt-0.5" />
                        <span>{priced?.message || "We can't deliver to this address."}</span>
                      </div>
                    ) : !pricing ? (
                      <div className="text-xs text-emerald-900 flex items-center gap-2">
                        {pricingState.isLoading ? <Loader2 size={13} className="animate-spin" /> : <MapPin size={13} />}
                        <span>{formData.state ? "Calculating delivery..." : "Choose your state or enter your PIN code to see delivery charges."}</span>
                      </div>
                    ) : (
                      <>
                        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-emerald-600" />
                            <span className="font-semibold text-emerald-950">{pricing.zone.name}</span>
                            <span className="text-emerald-700 font-medium">&bull; {options?.standard.estimate}</span>
                          </div>
                          <span className="font-bold text-[#173D2A]">
                            {options?.standard.total === 0 ? "FREE Delivery" : `Delivery: ${formatINR(options?.standard.total ?? 0)}`}
                          </span>
                        </div>
                        {pricing.amountNeededForFree > 0 ? (
                          <div className="pt-2 border-t border-emerald-200/60 space-y-1.5">
                            <div className="h-1.5 rounded-full bg-emerald-100 overflow-hidden" role="progressbar" aria-valuenow={pricing.freeProgressPercent} aria-valuemin={0} aria-valuemax={100} aria-label="Progress towards free delivery">
                              <div className="h-full bg-emerald-600 transition-all" style={{ width: `${pricing.freeProgressPercent}%` }} />
                            </div>
                            <p className="text-[11px] text-emerald-800">
                              Add <strong>{formatINR(pricing.amountNeededForFree)}</strong> more for <strong>FREE delivery</strong> to {pricing.state}.
                            </p>
                          </div>
                        ) : (
                          <div className="pt-1.5 border-t border-emerald-200/60 text-[11px] text-emerald-800 font-medium flex items-center gap-1.5">
                            <CheckCircle2 size={13} className="text-emerald-700" />
                            <span>Your order qualifies for FREE standard delivery to {pricing.state}.</span>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </section>

              {/* 3. Delivery speed */}
              <section className="bg-white rounded-3xl border border-[#E5E7DF] p-5 sm:p-6 shadow-xs space-y-4">
                <SectionTitle n={3}>Delivery Speed</SectionTitle>
                <div className="space-y-3 text-xs" role="radiogroup" aria-label="Delivery speed">
                  {[
                    {
                      value: "standard",
                      title: `Standard Delivery${options ? ` (${options.standard.estimate})` : ""}`,
                      sub: "Secure herbal packaging",
                      fee: options ? (options.standard.total === 0 ? "FREE" : formatINR(options.standard.total)) : "—",
                      disabled: false,
                    },
                    ...(options?.express.enabled !== false
                      ? [
                          {
                            value: "express",
                            title: `Express Delivery${options?.express.estimate ? ` (${options.express.estimate})` : ""}`,
                            sub: options && !options.express.available ? options.express.reason || "Not available for this address" : "Priority dispatch",
                            fee: options?.express.total != null ? formatINR(options.express.total) : "—",
                            disabled: !options || !options.express.available,
                          },
                        ]
                      : []),
                  ].map((opt) => (
                    <label
                      key={opt.value}
                      className={`flex items-center justify-between gap-3 p-3.5 rounded-2xl border transition-all ${
                        opt.disabled ? "opacity-60 cursor-not-allowed border-[#E5E7DF]" : "cursor-pointer"
                      } ${deliveryMethod === opt.value && !opt.disabled ? "border-[#173D2A] bg-[#FBFAF6] ring-1 ring-[#173D2A]" : "border-[#E5E7DF] hover:bg-stone-50"}`}
                    >
                      <span className="flex items-center gap-3">
                        <input
                          type="radio"
                          name="delivery"
                          value={opt.value}
                          checked={deliveryMethod === opt.value}
                          disabled={opt.disabled}
                          onChange={() => setDeliveryMethod(opt.value)}
                          className="text-[#173D2A] focus:ring-[#386B40]"
                        />
                        <span>
                          <span className="font-bold text-[#171A17] block">{opt.title}</span>
                          <span className="text-stone-500">{opt.sub}</span>
                        </span>
                      </span>
                      <span className="font-bold text-[#171A17] shrink-0">{opt.fee}</span>
                    </label>
                  ))}
                  {priced?.expressAdjusted && (
                    <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">{priced.expressAdjusted} We've switched you to standard delivery.</p>
                  )}
                </div>
              </section>

              {/* 4. Payment */}
              <section className="bg-white rounded-3xl border border-[#E5E7DF] p-5 sm:p-6 shadow-xs space-y-4">
                <SectionTitle n={4}>Payment Method</SectionTitle>
                <div className="space-y-3 text-xs" role="radiogroup" aria-label="Payment method">
                  {settingsStatus === "error" && (
                    <p className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700">
                      We couldn't load the store's payment and delivery rules.{" "}
                      <button type="button" onClick={retrySettings} className="font-semibold underline">
                        Try again
                      </button>
                    </p>
                  )}
                  {noPaymentAvailable && settingsReady && (
                    <p className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800">
                      No payment method is available for this order right now. Please contact us to complete your purchase.
                    </p>
                  )}

                  {onlineAllowed && (
                    <label
                      className={`flex items-start gap-3 p-3.5 rounded-2xl border cursor-pointer transition-all ${
                        paymentMethod === "online" ? "border-[#173D2A] bg-[#FBFAF6] ring-1 ring-[#173D2A]" : "border-[#E5E7DF] hover:bg-stone-50"
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
                      <span className="space-y-1">
                        <span className="font-bold text-[#171A17] flex items-center gap-1.5 flex-wrap">
                          <CreditCard size={16} className="text-[#386B40]" />
                          <span>Pay Online</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold border border-emerald-200">
                            Secure &amp; Instant
                          </span>
                        </span>
                        <span className="block text-stone-500">UPI, Credit / Debit Cards &amp; Net Banking, processed securely by Cashfree.</span>
                      </span>
                    </label>
                  )}

                  {codSwitchedOn && (
                    <label
                      className={`flex items-start gap-3 p-3.5 rounded-2xl border transition-all ${
                        codOverLimit ? "opacity-60 cursor-not-allowed border-[#E5E7DF]" : "cursor-pointer"
                      } ${paymentMethod === "cod" ? "border-[#173D2A] bg-[#FBFAF6] ring-1 ring-[#173D2A]" : "border-[#E5E7DF] hover:bg-stone-50"}`}
                    >
                      <input
                        type="radio"
                        name="payment"
                        value="cod"
                        checked={paymentMethod === "cod"}
                        disabled={codOverLimit}
                        onChange={() => setPaymentMethod("cod")}
                        className="text-[#173D2A] focus:ring-[#386B40] mt-0.5"
                      />
                      <span className="space-y-1">
                        <span className="font-bold text-[#171A17] flex items-center gap-1.5">
                          <Banknote size={16} className="text-[#386B40]" />
                          <span>Cash on Delivery</span>
                        </span>
                        <span className="block text-stone-500">
                          {codOverLimit
                            ? `Cash on Delivery is available for orders up to ${formatINR(codLimit)}. Please pay online for this order.`
                            : "Pay when your parcel arrives."}
                        </span>
                      </span>
                    </label>
                  )}
                </div>
              </section>
            </div>

            {/* Right Column: Order Summary */}
            <aside className="lg:col-span-5 bg-white rounded-3xl border border-[#E5E7DF] p-5 sm:p-7 space-y-5 shadow-xs lg:sticky lg:top-28" aria-label="Order summary">
              <h2 className="font-heading tracking-tight text-xl font-bold text-[#171A17] pb-3 border-b border-[#E5E7DF]">
                Order Summary ({cartItems.length} {cartItems.length === 1 ? "item" : "items"})
              </h2>
              {buyNowRequested && (
                <p className="text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
                  Buying this item directly. Your cart stays as it is.
                </p>
              )}

              <ul className="space-y-3 max-h-64 overflow-y-auto pr-1" data-lenis-prevent="true">
                {cartItems.map((item, idx) => {
                  const mrp = Number(item.product.originalPrice) || 0;
                  return (
                    <li key={idx} className="flex items-center gap-3 text-xs">
                      <img
                        width={52}
                        height={52}
                        loading="lazy"
                        decoding="async"
                        src={item.product.images?.[0]}
                        alt=""
                        className="w-13 h-13 rounded-lg bg-[#FBFAF6] border p-1 object-contain shrink-0"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="font-semibold text-[#171A17] block truncate">{item.product.name}</span>
                        <span className="text-stone-500">
                          {item.selectedSize} &times; {item.quantity}
                        </span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-bold text-[#171A17] block">{formatINR(item.price * item.quantity)}</span>
                        {mrp > item.price && <span className="text-[10px] text-stone-400 line-through">{formatINR(mrp * item.quantity)}</span>}
                      </div>
                    </li>
                  );
                })}
              </ul>

              {/* Price breakdown */}
              <div className="border-t border-[#E5E7DF] pt-4 space-y-2 text-xs sm:text-sm">
                <div className="flex justify-between text-[#666B64]">
                  <span>Subtotal (MRP)</span>
                  <span className="font-semibold text-[#171A17]">{formatINR(pricing ? pricing.mrp : mrpSubtotal)}</span>
                </div>
                {(pricing ? pricing.productDiscount : discountTotal) > 0 && (
                  <div className="flex justify-between text-emerald-700">
                    <span>Discount</span>
                    <span className="font-semibold">-{formatINR(pricing ? pricing.productDiscount : discountTotal)}</span>
                  </div>
                )}
                {pricing && pricing.offerDiscount > 0 && appliedOffer && (
                  <div className="flex justify-between text-emerald-700">
                    <span>
                      {appliedOffer.title || appliedOffer.code}
                      <span className="block text-[10px] text-emerald-600/80">
                        {appliedOffer.source === "auto" ? "Offer auto-applied" : `Coupon ${appliedOffer.code}`}
                      </span>
                    </span>
                    <span className="font-semibold">-{formatINR(pricing.offerDiscount)}</span>
                  </div>
                )}
                {offerProblem && (
                  <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-2.5 py-1.5">{offerProblem}</p>
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
                        aria-label="Referral code"
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
                {referralCode && referralDiscount === 0 && referralReason && (
                  <p className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-2.5 py-1.5">
                    Referral code {referralCode}: {referralReason}
                  </p>
                )}
                <div className="flex justify-between text-[#666B64]">
                  <div>
                    <span>{pricing?.shipping.deliveryMethod === "express" ? "Delivery (Express)" : "Delivery"}</span>
                    <span className="block text-[10px] text-stone-400">
                      {pricing ? `${pricing.zone.name} (${pricing.state})` : "Calculated once you enter your address"}
                    </span>
                    {pricing?.shipping.deliveryMethod === "express" && (
                      <span className="block text-[10px] text-stone-400">
                        Standard {pricing.shipping.standard === 0 ? "FREE" : formatINR(pricing.shipping.standard)} + Express {formatINR(pricing.shipping.expressSurcharge)}
                      </span>
                    )}
                  </div>
                  <span className="font-semibold text-[#171A17]">
                    {!pricing ? "—" : calculatedShipping === 0 ? <span className="text-emerald-700 font-bold">FREE</span> : formatINR(calculatedShipping)}
                  </span>
                </div>

                {/* GST, as calculated by the server (each product has its own rate) */}
                {pricing && (
                  <div className="p-2.5 rounded-xl bg-stone-50 border border-stone-200/80 text-[11px] space-y-1">
                    <div className="flex justify-between text-stone-700 font-medium">
                      <span>{pricing.tax.type === "intra_state" ? "GST (CGST + SGST)" : "GST (IGST, inter-state)"}</span>
                      <span className="font-bold text-stone-900">{formatINR(pricing.tax.total)}</span>
                    </div>
                    {pricing.tax.type === "intra_state" ? (
                      <div className="flex justify-between text-[10px] text-stone-500">
                        <span>CGST: {formatINR(pricing.tax.cgst)}</span>
                        <span>SGST: {formatINR(pricing.tax.sgst)}</span>
                      </div>
                    ) : (
                      <div className="flex justify-between text-[10px] text-stone-500">
                        <span>IGST: {formatINR(pricing.tax.igst)}</span>
                        <span className="text-emerald-700 font-medium">Inter-State Dispatch</span>
                      </div>
                    )}
                    <div className="text-[10px] text-stone-400 italic pt-0.5">
                      {pricing.priceMode === "inclusive" ? "Included in the prices." : "Added to the total above."}
                      {pricing.tax.shipping > 0 ? ` Includes ${formatINR(pricing.tax.shipping)} on delivery.` : ""}
                    </div>
                  </div>
                )}

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
                    <span className="text-base font-heading tracking-tight font-bold text-[#171A17] block">Total Payable</span>
                    <span className="text-[11px] text-stone-400">
                      {pricing?.priceMode === "exclusive" ? "GST added; delivery included" : "Inclusive of all taxes & delivery"}
                    </span>
                  </div>
                  <span className={`text-2xl font-bold text-[#173D2A] transition-opacity ${pricingBusy ? "opacity-50" : ""}`} aria-live="polite">
                    {formatINR(finalTotal)}
                  </span>
                </div>
              </div>

              {submitError && (
                <div ref={errorBoxRef} role="alert" className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                  <AlertCircle size={15} className="shrink-0 mt-0.5" />
                  <span>{submitError}</span>
                </div>
              )}

              {/* Place Order (desktop / tablet; phones use the sticky bar below) */}
              <button
                type="submit"
                disabled={placeDisabled}
                className="hidden lg:flex w-full py-4 px-6 bg-[#173D2A] hover:bg-[#0B2416] text-white text-sm font-bold rounded-xl items-center justify-center gap-2 shadow-md hover:shadow-lg transition-all disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
              >
                {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                <span>{placeLabel}</span>
              </button>

              <div className="flex items-center justify-center gap-1.5 text-[11px] text-stone-500">
                <ShieldCheck size={13} className="text-[#386B40]" />
                <span>Secure checkout &bull; 7-day easy returns</span>
              </div>
              <p className="text-[11px] text-center text-stone-400">
                By placing your order you agree to our <Link to="/terms" className="underline">Terms</Link> and{" "}
                <Link to="/privacy" className="underline">Privacy Policy</Link>.
              </p>
            </aside>
          </div>

          {/* Mobile: total + Place Order always within thumb reach */}
          <div className="lg:hidden fixed inset-x-0 bottom-0 z-30 bg-white/95 backdrop-blur border-t border-[#E5E7DF] shadow-[0_-6px_20px_rgba(0,0,0,0.08)] px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
            <div className="flex items-center gap-3">
              <div className="shrink-0">
                <span className="block text-[10px] text-stone-500 leading-tight">Total</span>
                <span className="block text-lg font-bold text-[#173D2A] leading-tight">{formatINR(finalTotal)}</span>
              </div>
              <button
                type="submit"
                disabled={placeDisabled}
                className="flex-1 py-3.5 px-4 bg-[#173D2A] active:bg-[#0B2416] text-white text-sm font-bold rounded-xl flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isSubmitting && <Loader2 size={16} className="animate-spin" />}
                <span>{isSubmitting ? "Placing order..." : !pricingRequest ? "Enter address" : pricingBusy ? "Updating total..." : paymentMethod === "online" ? "Pay Securely" : "Place Order"}</span>
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
