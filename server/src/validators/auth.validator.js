import { z } from "zod";
import { parsePhone } from "../utils/phone.js";

// Policy for customer and staff passwords: 8-128 characters with at least one letter and one number
const strongPassword = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must be at most 128 characters")
  .regex(/[A-Za-z]/, "Password must contain at least one letter")
  .regex(/\d/, "Password must contain at least one number");

const countryCodeField = z
  .string()
  .trim()
  .regex(/^\+?[1-9]\d{0,3}$/, "Choose a valid country code");

export const registerSchema = z.object({
  body: z
    .object({
      name: z.string().min(2, "Name must be at least 2 characters").max(100),
      email: z.string().email("Valid email address is required"),
      phoneCountryCode: countryCodeField,
      // National digits only (the country code is separate); parsed and validated per country below
      phone: z.string().trim().min(1, "Mobile number is required").max(20),
      password: strongPassword,
      confirmPassword: z.string().min(1, "Please confirm your password"),
      referralCode: z.string().trim().max(40).optional().nullable(),
    })
    .superRefine((body, ctx) => {
      if (body.password !== body.confirmPassword) {
        ctx.addIssue({ code: "custom", path: ["confirmPassword"], message: "Passwords do not match" });
      }
      if (!parsePhone(body.phoneCountryCode, body.phone)) {
        ctx.addIssue({ code: "custom", path: ["phone"], message: "Enter a valid mobile number for the selected country" });
      }
    }),
});

// Sign in with an email address, or with a country code + mobile number (not both)
export const loginSchema = z.object({
  body: z
    .object({
      email: z.string().trim().email("Valid email address is required").optional(),
      phoneCountryCode: countryCodeField.optional(),
      phone: z.string().trim().max(20).optional(),
      password: z.string().min(1, "Password is required").max(128),
    })
    .superRefine((body, ctx) => {
      const byPhone = Boolean(body.phone);
      if (!body.email && !byPhone) {
        ctx.addIssue({ code: "custom", path: ["email"], message: "Enter your email address or mobile number" });
      }
      if (byPhone && !body.phoneCountryCode) {
        ctx.addIssue({ code: "custom", path: ["phoneCountryCode"], message: "Choose a country code" });
      }
    }),
});

// Staff sign in stays email-only
export const staffLoginSchema = z.object({
  body: z.object({
    email: z.string().email("Valid email address is required"),
    password: z.string().min(1, "Password is required").max(128),
  }),
});

export const refreshSchema = z.object({
  body: z.object({
    refreshToken: z.string().min(1, "Refresh token is required"),
  }),
});

export const addressSchema = z.object({
  body: z.object({
    fullName: z.string().min(2, "Full name is required"),
    phone: z.string().min(10, "10-digit mobile number is required"),
    street: z.string().min(5, "Street address is required"),
    line2: z.string().optional(),
    city: z.string().min(2, "City is required"),
    state: z.string().min(2, "State is required"),
    pincode: z.string().regex(/^[1-9][0-9]{5}$/, "Valid 6-digit Indian PIN code is required"),
    type: z.enum(["Home", "Work", "Other"]).optional(),
    isDefault: z.boolean().optional(),
  }),
});

export const changePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: strongPassword,
  }),
});

export const adminChangePasswordSchema = z.object({
  body: z.object({
    currentPassword: z.string().min(1, "Current password is required").max(128),
    newPassword: strongPassword,
  }),
});

export const adminChangeEmailSchema = z.object({
  body: z.object({
    newEmail: z.string().trim().toLowerCase().email("Valid email address is required").max(254),
    currentPassword: z.string().min(1, "Current password is required").max(128),
  }),
});

// Changing the mobile number (a sign-in credential) needs the current password
export const changePhoneSchema = z.object({
  body: z
    .object({
      phoneCountryCode: countryCodeField,
      phone: z.string().trim().min(1, "Mobile number is required").max(20),
      currentPassword: z.string().min(1, "Current password is required").max(128),
    })
    .superRefine((body, ctx) => {
      if (!parsePhone(body.phoneCountryCode, body.phone)) {
        ctx.addIssue({ code: "custom", path: ["phone"], message: "Enter a valid mobile number for the selected country" });
      }
    }),
});
