import React from "react";
import { motion } from "framer-motion";

// Check reduced motion safely
const isReducedMotion = () => {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
};

/**
 * MotionFadeIn — Smooth fade & upward reveal for sections and cards
 */
export const MotionFadeIn = ({
  children,
  delay = 0,
  duration = 0.5,
  yOffset = 20,
  className = "",
  ...props
}) => {
  if (isReducedMotion()) {
    return <div className={className} {...props}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: yOffset }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration, delay, ease: [0.21, 0.47, 0.32, 0.98] }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
};

/**
 * MotionStaggerContainer — Coordinates staggered entrances for child cards
 */
export const MotionStaggerContainer = ({
  children,
  staggerDelay = 0.08,
  className = "",
  ...props
}) => {
  if (isReducedMotion()) {
    return <div className={className} {...props}>{children}</div>;
  }

  return (
    <motion.div
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: "-30px" }}
      variants={{
        hidden: {},
        show: {
          transition: {
            staggerChildren: staggerDelay,
          },
        },
      }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
};

/**
 * MotionStaggerItem — Individual child in a stagger container
 */
export const MotionStaggerItem = ({
  children,
  className = "",
  yOffset = 16,
  ...props
}) => {
  if (isReducedMotion()) {
    return <div className={className} {...props}>{children}</div>;
  }

  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: yOffset },
        show: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.4, ease: [0.21, 0.47, 0.32, 0.98] },
        },
      }}
      className={className}
      {...props}
    >
      {children}
    </motion.div>
  );
};

export default MotionFadeIn;

