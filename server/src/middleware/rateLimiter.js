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

// Checkout, order placement and payment endpoints: generous for real shoppers, tight for scripts
export const checkoutLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: config.NODE_ENV === "test" ? 5000 : 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: "TOO_MANY_REQUESTS", message: "Too many requests. Please wait a minute and try again." },
  },
});

// Looking up an order by number without signing in: enough for a customer refreshing their order page,
// too slow for anyone trying numbers one by one.
export const orderLookupLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: config.NODE_ENV === "test" ? 5000 : 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: "TOO_MANY_REQUESTS", message: "Too many lookups. Please wait a minute and try again." },
  },
});

// Changing an email or password needs the current password, so every call is also a password guess: keep it slow
export const credentialLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: config.NODE_ENV === "test" ? 1000 : 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: "TOO_MANY_REQUESTS", message: "Too many attempts. Please wait 15 minutes and try again." },
  },
});

// Public contact form: a handful of messages per hour per person is plenty
export const contactLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: config.NODE_ENV === "test" ? 5000 : 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: "TOO_MANY_REQUESTS", message: "You've sent several messages recently. Please try again in an hour, or call us." },
  },
});

// Opening tickets and adding messages from a customer account
export const ticketLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: config.NODE_ENV === "test" ? 5000 : 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: { code: "TOO_MANY_REQUESTS", message: "Too many support messages. Please try again later." },
  },
});
