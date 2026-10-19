import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, CheckCircle2, ShoppingBag } from "lucide-react";

const RECENT_ORDERS = [
  {
    id: "ord-1",
    customer: "Priya M.",
    city: "Mumbai",
    productName: "Pure Himalayan Shilajit Resin (Gold Grade)",
    slug: "shilajit-pure-himalayan-resin",
    timeAgo: "3 mins ago",
    image: "/images/ProductImages/PureHimalayanShilajit.jpeg",
  },
  {
    id: "ord-2",
    customer: "Dr. Rajesh K.",
    city: "Bengaluru",
    productName: "Organic Ashwagandha Extract (KSM-66)",
    slug: "organic-ashwagandha-capsules",
    timeAgo: "8 mins ago",
    image: "/images/ProductImages/Ashuwaganda.png",
  },
  {
    id: "ord-3",
    customer: "Sunita S.",
    city: "Jaipur",
    productName: "Pure Wild Forest Honey (Unpasteurized)",
    slug: "pure-wild-forest-honey",
    timeAgo: "14 mins ago",
    image: "/images/ProductImages/PureHimalayanShilajit.jpeg",
  },
  {
    id: "ord-4",
    customer: "Vikram R.",
    city: "New Delhi",
    productName: "Organic Turmeric Powder (Lakadong 7% Curcumin)",
    slug: "organic-turmeric-powder-lakadong",
    timeAgo: "22 mins ago",
    image: "/images/ProductImages/PureHimalayanShilajit2.jpeg",
  },
  {
    id: "ord-5",
    customer: "Meera T.",
    city: "Pune",
    productName: "Pure Aloe Vera Gel with Kashmiri Kesar",
    slug: "pure-aloe-vera-skin-gel",
    timeAgo: "31 mins ago",
    image: "/images/ProductImages/VitaminC.png",
  },
];

const DISPLAY_DURATION_MS = 5500;
const PAUSE_DURATION_MS = 12000;
const INITIAL_DELAY_MS = 5000;

export const LiveOrderToast = () => {
  const location = useLocation();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // Check if previously dismissed in session
  useEffect(() => {
    try {
      if (sessionStorage.getItem("divyam_order_toast_dismissed") === "true") {
        setIsDismissed(true);
      }
    } catch {
      // ignore storage errors
    }
  }, []);

  // Cycle through purchases
  useEffect(() => {
    if (isDismissed) return;
    if (location.pathname.startsWith("/admin")) return;

    let showTimer;
    let hideTimer;

    const startCycle = () => {
      setIsVisible(true);
      hideTimer = setTimeout(() => {
        setIsVisible(false);
        // Advance to next order after pause
        showTimer = setTimeout(() => {
          setCurrentIndex((prev) => (prev + 1) % RECENT_ORDERS.length);
          startCycle();
        }, PAUSE_DURATION_MS);
      }, DISPLAY_DURATION_MS);
    };

    const initialTimer = setTimeout(startCycle, INITIAL_DELAY_MS);

    return () => {
      clearTimeout(initialTimer);
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [isDismissed, location.pathname]);

  const handleDismiss = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsVisible(false);
    setIsDismissed(true);
    try {
      sessionStorage.setItem("divyam_order_toast_dismissed", "true");
    } catch {
      // ignore
    }
  };

  if (isDismissed || location.pathname.startsWith("/admin")) return null;

  const currentOrder = RECENT_ORDERS[currentIndex];

  return (
    <AnimatePresence>
      {isVisible && currentOrder && (
        <motion.div
          initial={{ opacity: 0, y: 35, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 25, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 350, damping: 28 }}
          className="fixed bottom-5 left-5 z-40 max-w-[340px] sm:max-w-[380px] w-[calc(100vw-2.5rem)]"
        >
          <div className="relative bg-white/95 backdrop-blur-xl rounded-2xl border border-[#E5E7DF] shadow-2xl p-3.5 sm:p-4 overflow-hidden group">
            {/* Top Close Button */}
            <button
              onClick={handleDismiss}
              className="absolute top-2.5 right-2.5 p-1 rounded-full text-stone-400 hover:text-stone-700 hover:bg-stone-100 transition-colors cursor-pointer"
              aria-label="Dismiss notification"
            >
              <X size={13} />
            </button>

            {/* Content Link */}
            <Link
              to={`/products/${currentOrder.slug}`}
              className="flex items-center gap-3.5 cursor-pointer block"
            >
              {/* Thumbnail with Green Badge */}
              <div className="relative w-12 h-12 rounded-xl bg-[#FBFAF6] border border-[#E5E7DF] shrink-0 p-1 flex items-center justify-center overflow-hidden">
                <img
                  src={currentOrder.image}
                  alt={currentOrder.productName}
                  className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-300"
                />
              </div>

              {/* Order Info */}
              <div className="flex-1 min-w-0 pr-3">
                <div className="flex items-center gap-1.5 text-[11px] text-[#386B40] font-semibold">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="truncate">
                    {currentOrder.customer} ({currentOrder.city})
                  </span>
                  <span className="text-stone-400 font-normal">&bull;</span>
                  <span className="text-stone-500 font-light text-[10px]">
                    {currentOrder.timeAgo}
                  </span>
                </div>

                <p className="text-xs font-semibold text-[#171A17] truncate mt-0.5 group-hover:text-[#173D2A] transition-colors">
                  {currentOrder.productName}
                </p>

                <div className="flex items-center gap-1 text-[10px] text-[#386B40] font-medium mt-0.5">
                  <CheckCircle2 size={11} className="text-[#386B40]" />
                  <span>Verified Ayurvedic Purchase</span>
                </div>
              </div>
            </Link>

            {/* Bottom Progress Timer Line */}
            <motion.div
              initial={{ width: "100%" }}
              animate={{ width: "0%" }}
              transition={{ duration: DISPLAY_DURATION_MS / 1000, ease: "linear" }}
              className="absolute bottom-0 left-0 h-[2px] bg-gradient-to-r from-[#D4AF37] to-[#A9D18E]"
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

