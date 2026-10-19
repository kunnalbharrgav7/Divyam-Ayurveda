import rateLimit from "express-rate-limit";
import { config } from "../config/index.js";

export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: config.NODE_ENV === "test" ? 1000 : 30, // Limit each IP to 30 requests per window
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: "TOO_MANY_REQUESTS",
      message: "Too many authentication attempts. Please try again after 15 minutes.",
    },
  },
});

export const apiLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: config.NODE_ENV === "test" ? 5000 : 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: {
      code: "TOO_MANY_REQUESTS",
      message: "API rate limit exceeded. Please throttle your requests.",
    },
  },
});


// Referral code lookups/previews: slows down anyone trying to guess codes
export const referralLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: config.NODE_ENV === "test" ? 1000 : 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: "TOO_MANY_REQUESTS", message: "Too many referral code checks. Please try again in a few minutes." },
  },
});
