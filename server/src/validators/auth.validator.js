import { z } from "zod";

export const registerSchema = z.object({
  body: z.object({
    name: z.string().min(2, "Name must be at least 2 characters").max(100),
    email: z.string().email("Valid email address is required"),
    phone: z.string().min(10, "Valid 10-digit phone number is required").optional(),
    password: z.string().min(6, "Password must be at least 6 characters"),
    referralCode: z.string().trim().max(40).optional().nullable(),
  }),
});

export const loginSchema = z.object({
  body: z.object({
    email: z.string().email("Valid email address is required"),
    password: z.string().min(1, "Password is required"),
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
    newPassword: z.string().min(6, "New password must be at least 6 characters"),
  }),
});

// Policy for credentials an administrator sets: 8-128 characters with at least one letter and one number
const strongPassword = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must be at most 128 characters")
  .regex(/[A-Za-z]/, "Password must contain at least one letter")
  .regex(/\d/, "Password must contain at least one number");

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
