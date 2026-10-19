import React, { useEffect, useState } from "react";
import { useParams, Link, useSearchParams } from "react-router-dom";
import {
  Heart,
  ShoppingBag,
  Check,
  ShieldCheck,
  Truck,
  RotateCcw,
  Sparkles,
  Info,
  AlertCircle,
  MapPin,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { Breadcrumbs } from "../components/common/Breadcrumbs";
import { RatingStars } from "../components/common/RatingStars";
import { ProductCard } from "../components/products/ProductCard";
import { EmptyState } from "../components/common/EmptyState";
import { productService, orderService, reviewService } from "../services/api";
import {
  formatINR,
  getDiscountPercentage,
  formatDate,
} from "../utils/formatters";
import { useCart } from "../context/CartContext";
import { useWishlist } from "../context/WishlistContext";
import { useAuth } from "../context/AuthContext";
import { useAdmin } from "../context/AdminContext";
import { storage } from "../utils/storage";
import {
  Star,
  ThumbsUp,
  UserCheck,
  MessageSquarePlus,
  PenLine,
} from "lucide-react";

const RECENTLY_VIEWED_KEY = "divyam_ayurveda_recent";

export const ProductDetailPage = () => {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const [product, setProduct] = useState(null);
  const [relatedProducts, setRelatedProducts] = useState([]);
  const [recentlyViewed, setRecentlyViewed] = useState([]);
  const [loading, setLoading] = useState(true);

  // Gallery state
  const [activeImageIndex, setActiveImageIndex] = useState(0);

  // Variant & Quantity state
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const [isAdded, setIsAdded] = useState(false);

  // Tab state: Description / Ingredients / Usage & Info / Reviews
  const [activeTab, setActiveTab] = useState("description");

  // Handle URL query parameters (e.g. ?tab=reviews or ?writeReview=true)
  useEffect(() => {
    if (searchParams.get("tab") === "reviews") {
      setActiveTab("reviews");
    }
    if (searchParams.get("writeReview") === "true") {
      setActiveTab("reviews");
      setShowReviewModal(true);
    }
  }, [searchParams]);

  // Reviews & Verification State
  const { user } = useAuth();
  const { orders } = useAdmin();
  const [myReviews, setMyReviews] = useState([]);
  const [reviewError, setReviewError] = useState("");
  const [reviewSaving, setReviewSaving] = useState(false);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [newRating, setNewRating] = useState(5);
  const [newTitle, setNewTitle] = useState("");
  const [newComment, setNewComment] = useState("");
  const [reviewSubmitted, setReviewSubmitted] = useState(false);

  // PIN code checker state
  const [pinCode, setPinCode] = useState("");
  const [pinResult, setPinResult] = useState(null);
  const [pinChecking, setPinChecking] = useState(false);

  const { addToCart, isInCart } = useCart();
  const { isInWishlist, toggleWishlist } = useWishlist();

  useEffect(() => {
    const loadProductData = async () => {
      setLoading(true);
      try {
        const item = await productService.getProductBySlug(slug);
        setProduct(item);

        if (item) {
          // Set initial variant
          setSelectedVariant(item.variants?.[0] || null);
          setActiveImageIndex(0);
          setQuantity(1);

          // Fetch related
          const related = await productService.getRelatedProducts(
            item.id,
            item.categoryId,
            4,
          );
          setRelatedProducts(related);

          // Track recently viewed
          const recent = storage.get(RECENTLY_VIEWED_KEY, []);
          const filteredRecent = recent.filter((p) => p.id !== item.id);
          const updatedRecent = [item, ...filteredRecent].slice(0, 4);
          storage.set(RECENTLY_VIEWED_KEY, updatedRecent);
          setRecentlyViewed(filteredRecent.slice(0, 4));
        }
      } catch (err) {
        console.error("Error loading product detail:", err);
      } finally {
        setLoading(false);
      }
    };

    loadProductData();
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, [slug]);

  // Customer's own reviews for this product (hooks must run before the early returns below)
  useEffect(() => {
    let isMounted = true;
    if (product?.id && user?.accessToken) {
      reviewService.getMine(product.id, user.accessToken).then((mine) => {
        if (isMounted) setMyReviews(mine);
      });
    } else {
      setMyReviews([]);
    }
    return () => {
      isMounted = false;
    };
  }, [product?.id, user?.accessToken]);

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16">
        <div className="animate-pulse space-y-8">
          <div className="h-6 bg-stone-200 rounded w-1/4" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <div className="h-96 bg-stone-200 rounded-2xl" />
            <div className="space-y-4">
              <div className="h-8 bg-stone-200 rounded w-3/4" />
              <div className="h-4 bg-stone-200 rounded w-1/2" />
              <div className="h-10 bg-stone-200 rounded w-1/3" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16">
        <EmptyState
          title="Product Formulation Not Found"
          description="The Ayurvedic product formulation you are seeking could not be found or has been moved."
          actionText="Explore Entire Catalog"
          actionLink="/products"
        />
      </div>
    );
  }

  const currentPrice = selectedVariant ? selectedVariant.price : product.price;
  const currentOriginalPrice = selectedVariant
    ? selectedVariant.originalPrice
    : product.originalPrice;
  const discountPercent = getDiscountPercentage(
    currentPrice,
    currentOriginalPrice,
  );
  const inWishlist = isInWishlist(product.id);

  // Out-of-stock items can't be bought, so a second add would only inflate the cart quantity
  const blockedAsInCart =
    product.stockQuantity === 0 &&
    isInCart(product.id, selectedVariant ? selectedVariant.size : product.packSize);

  const handleAddToCart = () => {
    if (blockedAsInCart) return;
    addToCart(product, quantity, selectedVariant);
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 2000);
  };

  const handlePinCheck = (e) => {
    e.preventDefault();
    if (!pinCode || pinCode.length !== 6) return;

    setPinChecking(true);
    setTimeout(() => {
      const firstDigit = pinCode.charAt(0);
      if (firstDigit === "0") {
        setPinResult({
          serviceable: false,
          message:
            "Standard delivery is currently unavailable for this PIN code.",
        });
      } else {
        setPinResult({
          serviceable: true,
          message: `Delivery available to PIN ${pinCode}! Estimated in 2-4 business days. Cash on Delivery (COD) eligible.`,
        });
      }
      setPinChecking(false);
    }, 400);
  };

  // Reviews come from the database: approved ones for everyone, plus the signed-in customer's own
  // (a review awaiting moderation is shown to its author with a "Pending" badge).
  const toReviewView = (r) => ({
    id: r.id,
    userName: r.userName,
    customerName: r.userName,
    date: r.createdAt,
    rating: r.rating,
    title: r.title,
    comment: r.comment,
    verifiedPurchase: r.verifiedPurchase,
    status: r.status === "approved" || r.status === undefined ? "Approved" : r.status === "pending" ? "Pending" : "Rejected",
  });
  const productReviews = (() => {
    const byId = new Map();
    (product.recentReviews || []).forEach((r) => byId.set(r.id, toReviewView({ ...r, status: "approved" })));
    myReviews.forEach((r) => {
      if (r.status !== "rejected") byId.set(r.id, toReviewView(r));
    });
    return [...byId.values()].sort((x, y) => new Date(y.date) - new Date(x.date));
  })();

  const approvedReviews = productReviews.filter((r) => r.status === "Approved");

  // Check if current customer ordered this formulation and it was marked Delivered
  const isVerifiedBuyer = Boolean(
    user &&
    (orders || []).some(
      (o) =>
        (o.customerId === user.id ||
          o.customer?.email?.toLowerCase() === user.email?.toLowerCase() ||
          o.email?.toLowerCase() === user.email?.toLowerCase()) &&
        (o.items || []).some(
          (item) =>
            item.productId === product.id ||
            item.slug === product.slug ||
            item.name === product.name,
        ) &&
        (o.status === "Delivered" || o.orderStatus === "Delivered"),
    ),
  );

  // Check if current customer has an order placed but not yet delivered
  const hasPendingDelivery = Boolean(
    user &&
    !isVerifiedBuyer &&
    (orders || []).some(
      (o) =>
        (o.customerId === user.id ||
          o.customer?.email?.toLowerCase() === user.email?.toLowerCase() ||
          o.email?.toLowerCase() === user.email?.toLowerCase()) &&
        (o.items || []).some(
          (item) =>
            item.productId === product.id ||
            item.slug === product.slug ||
            item.name === product.name,
        ) &&
        o.status !== "Delivered" &&
        o.orderStatus !== "Delivered" &&
        o.status !== "Cancelled",
    ),
  );

  // Average Rating
  const averageRating =
    approvedReviews.length > 0
      ? (
          approvedReviews.reduce((sum, r) => sum + Number(r.rating || 5), 0) /
          approvedReviews.length
        ).toFixed(1)
      : (product.rating || 5.0).toFixed(1);

  // Star breakdown
  const starCounts = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: approvedReviews.filter((r) => Number(r.rating) === star).length,
    percentage:
      approvedReviews.length > 0
        ? Math.round(
            (approvedReviews.filter((r) => Number(r.rating) === star).length /
              approvedReviews.length) *
              100,
          )
        : star === 5
          ? 100
          : 0,
  }));

  const handleReviewSubmit = async (e) => {
    e.preventDefault();
    if (!newComment.trim() || reviewSaving) return;
    setReviewError("");
    setReviewSaving(true);
    try {
      const saved = await reviewService.submit(
        product.id,
        { rating: newRating, title: newTitle.trim(), comment: newComment.trim() },
        user?.accessToken
      );
      setMyReviews((prev) => [saved, ...prev]);
      setReviewSubmitted(true);
      setNewTitle("");
      setNewComment("");
      setTimeout(() => {
        setShowReviewModal(false);
        setReviewSubmitted(false);
      }, 2500);
    } catch (err) {
      setReviewError(err.message || "Could not submit your review.");
    } finally {
      setReviewSaving(false);
    }
  };

  return (
    <div className="bg-[#FBFAF6] min-h-screen py-6 sm:py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Breadcrumbs */}
        <Breadcrumbs
          items={[
            { label: "Products", href: "/products" },
            {
              label: product.category || product.categoryId?.replace(/-/g, " "),
              href: `/category/${product.categoryId}`,
            },
            ...(product.subcategoryId
              ? [
                  {
                    label:
                      product.subcategory ||
                      product.subcategoryId.replace(/-/g, " "),
                    href: `/category/${product.categoryId}?subcategory=${product.subcategoryId}`,
                  },
                ]
              : []),
            { label: product.name },
          ]}
        />

        {/* Top Product Hero Grid */}
        <div className="bg-white rounded-3xl border border-[#E5E7DF] p-6 lg:p-10 shadow-xs mt-4 mb-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
            {/* Gallery Column (5 cols) */}
            <div className="lg:col-span-5 space-y-4">
              {/* Main Image Display */}
              <div className="relative aspect-square rounded-2xl overflow-hidden bg-[#FBFAF6] border border-[#E5E7DF] p-6 flex items-center justify-center">
                <img
                  key={activeImageIndex}
                  src={
                    product.images?.[activeImageIndex] ||
                    product.image ||
                    "/images/ProductImages/Ashuwaganda.png"
                  }
                  alt={product.name}
                  className="w-full h-full object-contain object-center transition-all duration-300 hover:scale-108 animate-in fade-in duration-200"
                />

                {discountPercent > 0 && (
                  <span className="absolute top-4 left-4 px-3 py-1 bg-[#386B40] text-white text-xs font-bold rounded-lg shadow-xs">
                    {discountPercent}% OFF
                  </span>
                )}

                <button
                  onClick={() => toggleWishlist(product)}
                  className={`absolute top-4 right-4 p-2.5 rounded-full transition-all duration-200 active:scale-90 ${
                    inWishlist
                      ? "bg-rose-50 text-rose-600 shadow-xs scale-105"
                      : "bg-white/90 text-stone-600 hover:text-rose-600 shadow-xs hover:bg-white hover:scale-110"
                  }`}
                  aria-label={
                    inWishlist ? "Remove from Wishlist" : "Add to Wishlist"
                  }
                >
                  <Heart
                    size={20}
                    className={inWishlist ? "fill-rose-500 text-rose-500" : ""}
                  />
                </button>
              </div>

              {/* Thumbnail Selector */}
              {product.images && product.images.length > 1 && (
                <div className="flex items-center gap-3">
                  {product.images.map((img, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActiveImageIndex(idx)}
                      className={`relative w-20 h-20 rounded-xl overflow-hidden border-2 bg-[#FBFAF6] p-1.5 transition-all duration-200 hover:scale-105 active:scale-95 ${
                        activeImageIndex === idx
                          ? "border-[#173D2A] ring-2 ring-[#A9D18E]/50 shadow-xs"
                          : "border-[#E5E7DF] hover:border-stone-400"
                      }`}
                    >
                      <img
                        src={img}
                        alt={`${product.name} view ${idx + 1}`}
                        className="w-full h-full object-contain"
                      />
                    </button>
                  ))}
                </div>
              )}

              {/* Quality Badges */}
              <div className="grid grid-cols-2 gap-3 pt-2 text-xs text-stone-600">
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#F4F4EE]">
                  <ShieldCheck size={18} className="text-[#386B40] shrink-0" />
                  <span>Lab Tested Purity</span>
                </div>
                <div className="flex items-center gap-2 p-2.5 rounded-xl bg-[#F4F4EE]">
                  <Sparkles size={18} className="text-[#386B40] shrink-0" />
                  <span>100% Herbal Active</span>
                </div>
              </div>
            </div>

            {/* Information Column (7 cols) */}
            <div className="lg:col-span-7 space-y-6">
              {/* Brand & Category */}
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1.5">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#386B40]">
                    {product.brand}
                  </span>
                  <span className="text-stone-300">&bull;</span>
                  <Link
                    to={`/category/${product.categoryId}`}
                    className="text-xs font-medium text-stone-600 hover:text-[#386B40] transition-colors"
                  >
                    {product.category || product.categoryId?.replace(/-/g, " ")}
                  </Link>
                  {product.subcategory && (
                    <>
                      <span className="text-stone-300">&bull;</span>
                      <Link
                        to={`/category/${product.categoryId}?subcategory=${product.subcategoryId}`}
                        className="text-xs font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/70 px-2.5 py-0.5 rounded-full transition-colors"
                      >
                        {product.subcategory}
                      </Link>
                    </>
                  )}
                  {product.productForm && (
                    <>
                      <span className="text-stone-300">&bull;</span>
                      <span className="text-xs text-stone-500 capitalize">
                        {product.productForm}
                      </span>
                    </>
                  )}
                </div>

                <h1 className="font-heading tracking-tight text-3xl sm:text-4xl font-bold text-[#171A17] leading-tight">
                  {product.name}
                </h1>

                {/* Rating & Reviews */}
                <div className="flex items-center gap-3 mt-3">
                  <RatingStars
                    rating={product.rating}
                    reviewCount={product.reviewCount}
                    size={16}
                    showNumber
                  />
                  <span className="text-stone-300">|</span>
                  <span className="text-xs font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                    Verified Ayurvedic Formula
                  </span>
                </div>
              </div>

              {/* Price & Discounts */}
              <div className="p-4 rounded-2xl bg-[#FBFAF6] border border-[#E5E7DF] flex items-baseline gap-3">
                <span className="text-3xl font-bold text-[#171A17]">
                  {formatINR(currentPrice)}
                </span>
                {currentOriginalPrice > currentPrice && (
                    <>
                      <span className="text-base text-stone-400 line-through">
                        {formatINR(currentOriginalPrice)}
                      </span>
                      <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                        Save {formatINR(currentOriginalPrice - currentPrice)} (
                        {discountPercent}% OFF)
                      </span>
                    </>
                  )}
                <span className="text-[11px] text-stone-500 ml-auto">
                  Inclusive of all taxes
                </span>
              </div>

              {/* Short Description */}
              <p className="text-sm text-[#666B64] leading-relaxed">
                {product.shortDescription}
              </p>

              {/* Pack Size / Variant Selector */}
              {product.variants && product.variants.length > 0 && (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-[#171A17] mb-2.5">
                    Select Pack Size:{" "}
                    <span className="text-[#386B40]">
                      {selectedVariant?.size}
                    </span>
                  </label>
                  <div className="flex flex-wrap gap-2.5">
                    {product.variants.map((v, i) => (
                      <button
                        key={i}
                        onClick={() => setSelectedVariant(v)}
                        className={`px-4 py-2 rounded-xl text-xs font-semibold border transition-all ${
                          selectedVariant?.size === v.size
                            ? "bg-[#173D2A] text-white border-[#173D2A] shadow-xs"
                            : "bg-white text-stone-700 border-[#E5E7DF] hover:border-stone-400"
                        }`}
                      >
                        <span>{v.size}</span>
                        <span className="ml-1.5 opacity-80">
                          ({formatINR(v.price)})
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Stock Indicator */}
              <div className="flex items-center gap-2 text-xs">
                {product.stockQuantity > 10 ? (
                  <span className="inline-flex items-center gap-1.5 font-medium text-emerald-700">
                    <CheckCircle2 size={15} /> In Stock ({product.stockQuantity}{" "}
                    available)
                  </span>
                ) : product.stockQuantity > 0 ? (
                  <span className="inline-flex items-center gap-1.5 font-medium text-amber-700">
                    <Clock size={15} /> Only {product.stockQuantity} left in
                    stock - order soon
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 font-medium text-rose-600">
                    <AlertCircle size={15} /> Currently Out of Stock &mdash; you can add it to your
                    cart, but checkout is unavailable until it is restocked
                  </span>
                )}
              </div>

              {/* Quantity Selector & Add to Cart Controls */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
                {/* Quantity + / - */}
                <div className="flex items-center justify-between border border-[#E5E7DF] rounded-xl bg-white px-3 py-2 w-36 shrink-0">
                  <button
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                    className="w-7 h-7 flex items-center justify-center text-stone-500 hover:text-stone-900 disabled:opacity-30 disabled:cursor-not-allowed text-lg font-bold"
                  >
                    -
                  </button>
                  <span className="text-sm font-bold text-[#171A17]">
                    {quantity}
                  </span>
                  <button
                    onClick={() =>
                      setQuantity(
                        Math.min(product.stockQuantity || 10, quantity + 1),
                      )
                    }
                    disabled={product.stockQuantity === 0 || quantity >= (product.stockQuantity || 10)}
                    className="w-7 h-7 flex items-center justify-center text-stone-500 hover:text-stone-900 disabled:opacity-30 disabled:cursor-not-allowed text-lg font-bold"
                  >
                    +
                  </button>
                </div>

                {/* Add to Cart Button */}
                <button
                  onClick={handleAddToCart}
                  className={`flex-1 py-3.5 px-6 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-xs ${
                    blockedAsInCart
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200 cursor-default"
                      : isAdded
                        ? "bg-[#173D2A] text-white ring-2 ring-[#A9D18E] cursor-pointer"
                        : "bg-[#386B40] hover:bg-[#173D2A] text-white hover:shadow-md cursor-pointer"
                  }`}
                >
                  {blockedAsInCart ? (
                    <>
                      <Check size={18} />
                      <span>Already in Cart &mdash; checkout opens once restocked</span>
                    </>
                  ) : isAdded ? (
                    <>
                      <Check size={18} className="text-[#A9D18E]" />
                      <span>Added {quantity} to Cart!</span>
                    </>
                  ) : (
                    <>
                      <ShoppingBag size={18} />
                      <span>
                        Add to Cart • {formatINR(currentPrice * quantity)}
                      </span>
                    </>
                  )}
                </button>
              </div>

              {/* PIN Code Delivery Checker */}
              <div className="p-4 rounded-2xl bg-[#F4F4EE] border border-[#E5E7DF] space-y-3">
                <div className="flex items-center gap-2 text-xs font-bold text-[#171A17] uppercase tracking-wider">
                  <MapPin size={15} className="text-[#386B40]" />
                  <span>Check Delivery &amp; COD Availability</span>
                </div>

                <form onSubmit={handlePinCheck} className="flex gap-2">
                  <input
                    type="text"
                    maxLength={6}
                    value={pinCode}
                    onChange={(e) =>
                      setPinCode(e.target.value.replace(/\D/g, ""))
                    }
                    placeholder="Enter 6-digit PIN code (e.g. 560038)"
                    className="flex-1 px-3.5 py-2 text-xs bg-white border border-[#E5E7DF] rounded-xl focus:outline-none focus:ring-1 focus:ring-[#386B40]"
                  />
                  <button
                    type="submit"
                    disabled={pinChecking || pinCode.length !== 6}
                    className="px-4 py-2 bg-[#173D2A] text-white text-xs font-semibold rounded-xl hover:bg-[#0B2416] transition-colors disabled:opacity-50"
                  >
                    {pinChecking ? "Checking..." : "Check"}
                  </button>
                </form>

                {pinResult && (
                  <div
                    className={`p-2.5 rounded-xl text-xs flex items-start gap-2 ${
                      pinResult.serviceable
                        ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                        : "bg-rose-50 text-rose-800 border border-rose-200"
                    }`}
                  >
                    {pinResult.serviceable ? (
                      <Check
                        size={15}
                        className="shrink-0 mt-0.5 text-emerald-600"
                      />
                    ) : (
                      <AlertCircle
                        size={15}
                        className="shrink-0 mt-0.5 text-rose-600"
                      />
                    )}
                    <span>{pinResult.message}</span>
                  </div>
                )}
              </div>

              {/* Delivery & Assurance Info */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2 text-xs text-stone-600">
                <div className="flex items-center gap-2">
                  <Truck size={16} className="text-[#386B40] shrink-0" />
                  <span>Free shipping above ₹499</span>
                </div>
                <div className="flex items-center gap-2">
                  <RotateCcw size={16} className="text-[#386B40] shrink-0" />
                  <span>7-Day easy returns</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck size={16} className="text-[#386B40] shrink-0" />
                  <span>Cash on Delivery</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Detailed Information Tabs */}
        <div className="bg-white rounded-3xl border border-[#E5E7DF] p-6 lg:p-10 shadow-xs mb-14">
          {/* Tab Navigation */}
          <div className="flex items-center gap-4 sm:gap-8 border-b border-[#E5E7DF] pb-4 mb-6 overflow-x-auto">
            {[
              { id: "description", label: "Full Description" },
              { id: "ingredients", label: "Ingredients & Herbs" },
              { id: "usage", label: "Usage & Warnings" },
              { id: "specs", label: "Product Information" },
              {
                id: "reviews",
                label: `Customer Reviews (${approvedReviews.length})`,
              },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`text-sm sm:text-base font-semibold pb-2 border-b-2 transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? "border-[#173D2A] text-[#173D2A]"
                    : "border-transparent text-stone-400 hover:text-stone-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab 1: Description */}
          {activeTab === "description" && (
            <div className="space-y-4 max-w-4xl text-sm sm:text-base text-[#171A17] leading-relaxed animate-in fade-in duration-200">
              <p>{product.description}</p>
              <div className="p-4 bg-[#FBFAF6] rounded-2xl border border-[#E5E7DF] space-y-2">
                <h4 className="font-heading tracking-tight font-bold text-[#173D2A]">
                  Classical Ayurvedic Heritage
                </h4>
                <p className="text-xs sm:text-sm text-[#666B64]">
                  Prepared by following traditional Ayurvedic texts and GMP
                  standards. This formulation undergoes zero artificial
                  bleaching or synthetic preservative blending to preserve the
                  living prana of each botanic active.
                </p>
              </div>
            </div>
          )}

          {/* Tab 2: Ingredients */}
          {activeTab === "ingredients" && (
            <div className="space-y-4 max-w-3xl animate-in fade-in duration-200">
              <h4 className="font-heading tracking-tight text-lg font-bold text-[#171A17]">
                Botanical Ingredients
              </h4>
              <ul className="space-y-2">
                {product.ingredients?.map((ing, i) => (
                  <li
                    key={i}
                    className="flex items-start gap-2.5 text-xs sm:text-sm text-stone-700 p-2.5 rounded-xl bg-stone-50 border border-stone-200/60"
                  >
                    <Check
                      size={16}
                      className="text-[#386B40] shrink-0 mt-0.5"
                    />
                    <span>{ing}</span>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-stone-500 italic mt-3">
                * Zero heavy metals, zero synthetic colors, zero artificial
                binders or talc.
              </p>
            </div>
          )}

          {/* Tab 3: Usage & Warnings */}
          {activeTab === "usage" && (
            <div className="space-y-6 max-w-3xl text-sm">
              <div className="p-4 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-1.5">
                <h4 className="font-semibold text-amber-900 flex items-center gap-2">
                  <AlertCircle size={16} className="text-amber-700" />
                  <span>Important Usage Advisory</span>
                </h4>
                <p className="text-xs sm:text-sm text-amber-800">
                  {product.warnings ||
                    "Consult an Ayurvedic physician prior to use if pregnant, nursing, or on regular pharmaceutical medications."}
                </p>
              </div>

              <div>
                <h4 className="font-heading tracking-tight text-base font-bold text-[#171A17] mb-2">
                  Storage Instructions
                </h4>
                <p className="text-xs sm:text-sm text-[#666B64]">
                  {product.productInformation?.storage ||
                    "Store in a cool, dry place away from direct sunlight and humidity."}
                </p>
              </div>
            </div>
          )}

          {/* Tab 4: Product Specs & Certifications */}
          {activeTab === "specs" && (
            <div className="max-w-2xl grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
              <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200">
                <span className="block text-[11px] text-stone-500 uppercase tracking-wider font-semibold">
                  Origin
                </span>
                <span className="font-semibold text-[#171A17]">
                  {product.productInformation?.origin || "India"}
                </span>
              </div>
              <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200">
                <span className="block text-[11px] text-stone-500 uppercase tracking-wider font-semibold">
                  Shelf Life
                </span>
                <span className="font-semibold text-[#171A17]">
                  {product.productInformation?.shelfLife || "24 Months"}
                </span>
              </div>
              <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 sm:col-span-2">
                <span className="block text-[11px] text-stone-500 uppercase tracking-wider font-semibold mb-1">
                  Certifications &amp; Accreditations
                </span>
                <div className="flex flex-wrap gap-2">
                  {product.productInformation?.certifications?.map((c, idx) => (
                    <span
                      key={idx}
                      className="px-2.5 py-1 bg-white border border-[#E5E7DF] rounded-md text-xs font-medium text-[#173D2A]"
                    >
                      ✓ {c}
                    </span>
                  )) || <span>GMP Certified, Ayush Licensed</span>}
                </div>
              </div>
            </div>
          )}

          {/* Tab 5: Customer Reviews */}
          {activeTab === "reviews" && (
            <div className="space-y-8">
              {/* Ratings Summary & Write Review Header */}
              <div className="p-6 sm:p-8 bg-[#FBFAF6] rounded-3xl border border-[#E5E7DF] flex flex-col md:flex-row items-center justify-between gap-6">
                {/* Left: Overall Score */}
                <div className="text-center md:text-left flex flex-col sm:flex-row items-center gap-6">
                  <div className="text-center">
                    <span className="font-heading tracking-tight text-5xl font-bold text-[#173D2A] block leading-none">
                      {averageRating}
                    </span>
                    <div className="flex text-amber-400 text-sm justify-center my-2">
                      {"★".repeat(Math.round(Number(averageRating)))}
                      {"☆".repeat(5 - Math.round(Number(averageRating)))}
                    </div>
                    <span className="text-xs text-stone-500 font-medium">
                      Based on {approvedReviews.length} verified ratings
                    </span>
                  </div>

                  {/* Rating Histogram */}
                  <div className="w-48 sm:w-56 space-y-1.5 text-xs text-stone-600">
                    {starCounts.map((sc) => (
                      <div key={sc.star} className="flex items-center gap-2">
                        <span className="w-7 font-semibold text-stone-700">
                          {sc.star} ★
                        </span>
                        <div className="flex-1 h-2 bg-stone-200 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-amber-400 rounded-full"
                            style={{ width: `${sc.percentage}%` }}
                          />
                        </div>
                        <span className="w-8 text-[11px] text-stone-400 text-right">
                          {sc.count}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Right: Write Review Trigger */}
                <div className="text-center md:text-right">
                  <button
                    type="button"
                    onClick={() => setShowReviewModal(true)}
                    className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#173D2A] text-white hover:bg-[#0B2416] text-xs sm:text-sm font-semibold transition-colors shadow-xs"
                  >
                    <PenLine size={16} />
                    <span>Write a Product Review</span>
                  </button>
                  <div className="text-[11px] text-stone-500 mt-2 flex items-center justify-center md:justify-end gap-1.5">
                    <UserCheck size={14} className="text-emerald-700" />
                    <span>
                      {isVerifiedBuyer
                        ? "You are a Verified Buyer for this item"
                        : user
                          ? "Verified badge applied to customers with delivered orders"
                          : "Sign in to leave an authenticated review"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Review Submission Modal / Card */}
              {showReviewModal && (
                <div className="p-6 bg-white rounded-3xl border-2 border-[#173D2A]/20 shadow-md animate-in fade-in zoom-in-98 duration-200 space-y-4">
                  <div className="flex items-center justify-between pb-3 border-b border-stone-100">
                    <div>
                      <h4 className="font-heading tracking-tight text-lg font-bold text-[#171A17]">
                        Share Your Ayurvedic Experience
                      </h4>
                      <p className="text-xs text-stone-500">
                        Reviewing:{" "}
                        <span className="font-medium text-stone-800">
                          {product.name}
                        </span>
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowReviewModal(false)}
                      className="p-1 rounded-lg text-stone-400 hover:text-stone-700 hover:bg-stone-100 text-xs font-bold"
                    >
                      ✕ Close
                    </button>
                  </div>

                  {reviewSubmitted ? (
                    <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-2xl text-center space-y-2">
                      <CheckCircle2
                        size={32}
                        className="text-emerald-700 mx-auto"
                      />
                      <h5 className="font-bold text-emerald-950 text-sm">
                        Review Submitted for Moderation!
                      </h5>
                      <p className="text-xs text-emerald-800 max-w-md mx-auto">
                        Thank you, {user?.name || "Valued Customer"}! Your
                        authentic feedback has been recorded and will appear on
                        the live storefront once verified by our dispensary
                        team.
                      </p>
                    </div>
                  ) : (
                    <form onSubmit={handleReviewSubmit} className="space-y-4">
                      {reviewError && (
                        <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
                          {reviewError}
                        </div>
                      )}
                      {/* Reviewer identity badge */}
                      <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-stone-50 rounded-xl text-xs">
                        <div>
                          <span className="text-stone-500">
                            Submitting as:{" "}
                          </span>
                          <span className="font-semibold text-stone-900">
                            {user ? user.name : "Guest Customer"}
                          </span>
                          {user?.email && (
                            <span className="text-stone-400 text-[11px] ml-1">
                              ({user.email})
                            </span>
                          )}
                        </div>
                        {isVerifiedBuyer ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold text-[11px]">
                            <UserCheck size={12} />
                            <span>Verified Buyer (Delivered)</span>
                          </span>
                        ) : hasPendingDelivery ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-800 font-semibold text-[11px]">
                            <span>Order In Transit</span>
                          </span>
                        ) : (
                          <span className="inline-block px-2 py-0.5 rounded-full bg-stone-200 text-stone-700 text-[11px]">
                            Community Feedback
                          </span>
                        )}
                      </div>

                      {/* Star Rating Selector */}
                      <div>
                        <label className="block text-xs font-bold text-stone-700 mb-1.5 uppercase tracking-wider">
                          Overall Rating *
                        </label>
                        <div className="flex items-center gap-2">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              type="button"
                              onClick={() => setNewRating(star)}
                              className="p-1 hover:scale-110 transition-transform"
                            >
                              <Star
                                size={26}
                                className={
                                  star <= newRating
                                    ? "text-amber-400 fill-amber-400"
                                    : "text-stone-300"
                                }
                              />
                            </button>
                          ))}
                          <span className="text-xs font-bold text-stone-700 ml-2">
                            {newRating === 5
                              ? "5 Stars (Excellent formulation)"
                              : newRating === 4
                                ? "4 Stars (Good results)"
                                : newRating === 3
                                  ? "3 Stars (Average)"
                                  : newRating === 2
                                    ? "2 Stars (Below expectations)"
                                    : "1 Star (Disappointed)"}
                          </span>
                        </div>
                      </div>

                      {/* Headline */}
                      <div>
                        <label className="block text-xs font-semibold text-stone-700 mb-1">
                          Review Headline / Summary
                        </label>
                        <input
                          type="text"
                          value={newTitle}
                          onChange={(e) => setNewTitle(e.target.value)}
                          placeholder="e.g. Noticeable energy boost within 2 weeks"
                          className="w-full px-3.5 py-2 text-xs rounded-xl border border-stone-300 bg-white focus:outline-none focus:ring-1 focus:ring-[#173D2A]"
                        />
                      </div>

                      {/* Comments */}
                      <div>
                        <label className="block text-xs font-semibold text-stone-700 mb-1">
                          Detailed Experience / Feedback *
                        </label>
                        <textarea
                          rows={3}
                          required
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          placeholder="Describe the texture, taste, aroma, health improvements, or suggestions..."
                          className="w-full px-3.5 py-2 text-xs rounded-xl border border-stone-300 bg-white focus:outline-none focus:ring-1 focus:ring-[#173D2A]"
                        />
                      </div>

                      <div className="flex items-center justify-end gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => setShowReviewModal(false)}
                          className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          disabled={reviewSaving}
                          className="px-5 py-2 bg-[#173D2A] text-white text-xs font-semibold rounded-xl hover:bg-[#0B2416] transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {reviewSaving ? "Submitting..." : "Submit Review"}
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}

              {/* Reviews List */}
              <div className="space-y-4">
                <h4 className="font-heading tracking-tight text-lg font-bold text-[#171A17]">
                  Customer Reviews ({productReviews.length})
                </h4>

                {productReviews.length === 0 ? (
                  <div className="p-8 text-center bg-stone-50 rounded-2xl border border-stone-200/60">
                    <p className="text-xs sm:text-sm text-stone-500">
                      No reviews submitted yet for this product. Be the first
                      verified customer to share your thoughts!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {productReviews.map((rev) => (
                      <div
                        key={rev.id}
                        className="p-5 bg-[#FBFAF6] rounded-2xl border border-[#E5E7DF] space-y-2.5"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-xs">
                              {(rev.userName || "C").charAt(0)}
                            </div>
                            <div>
                              <div className="font-semibold text-xs text-stone-900">
                                {rev.userName || rev.customerName || "Customer"}
                              </div>
                              <div className="text-[10px] text-stone-400">
                                {formatDate(rev.date)}
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {rev.verifiedPurchase && (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 font-semibold text-[10px]">
                                <UserCheck size={11} />
                                <span>Verified Buyer</span>
                              </span>
                            )}
                            {rev.status === "Pending" && (
                              <span className="inline-block px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-semibold text-[10px]">
                                ⏳ Pending Moderation
                              </span>
                            )}
                          </div>
                        </div>

                        {/* Stars */}
                        <div className="flex text-amber-400 text-xs">
                          {"★".repeat(
                            Math.max(1, Math.min(5, Number(rev.rating) || 5)),
                          )}
                          {"☆".repeat(
                            5 -
                              Math.max(1, Math.min(5, Number(rev.rating) || 5)),
                          )}
                        </div>

                        {/* Title & Comment */}
                        {rev.title && (
                          <h5 className="font-heading tracking-tight font-bold text-xs text-stone-900">
                            {rev.title}
                          </h5>
                        )}
                        <p className="text-xs text-stone-600 leading-relaxed">
                          "{rev.comment || rev.content}"
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Related Products Section */}
        {relatedProducts.length > 0 && (
          <div className="mb-14">
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-heading tracking-tight text-2xl font-bold text-[#171A17]">
                Related Formulations
              </h2>
              <Link
                to={`/category/${product.categoryId}`}
                className="text-xs font-semibold text-[#173D2A] hover:underline"
              >
                View Category &rarr;
              </Link>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {relatedProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        )}

        {/* Recently Viewed Products */}
        {recentlyViewed.length > 0 && (
          <div className="mb-12">
            <h2 className="font-heading tracking-tight text-xl font-bold text-[#171A17] mb-6">
              Recently Viewed
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {recentlyViewed.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
