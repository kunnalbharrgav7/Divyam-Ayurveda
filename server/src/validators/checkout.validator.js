import { z } from "zod";

export const quoteSchema = z.object({
  body: z.object({
    items: z
      .array(
        z.object({
          variantId: z.string().min(1, "variantId is required"),
          quantity: z.number().int().min(1, "quantity must be at least 1"),
        })
      )
      .min(1, "items array cannot be empty"),
    address: z.object({
      fullName: z.string().min(2, "Full name is required"),
      phone: z.string().min(10, "10-digit phone number is required"),
      line1: z.string().min(3, "Address is required"),
      line2: z.string().optional(),
      city: z.string().min(2, "City is required"),
      state: z.string().min(2, "State is required"),
      pincode: z.string().regex(/^[1-9][0-9]{5}$/, "Valid 6-digit Indian PIN code is required"),
      email: z.string().email().optional(),
    }),
    deliveryMethod: z.enum(["standard", "express"]).default("standard"),
    couponCode: z.string().optional().nullable(),
    referralCode: z.string().optional().nullable(),
  }),
});

export const orderCreateSchema = z.object({
  body: z.union([
    z.object({
      quoteId: z.string().min(1, "quoteId is required"),
      paymentMethod: z.string().optional().default("cod"),
      notes: z.string().optional(),
      attribution: z.record(z.any()).optional(),
    }),
    z.object({
      items: z.array(z.any()).min(1, "items cannot be empty"),
      customer: z.any().optional(),
      shippingAddress: z.any().optional(),
      pricing: z.any().optional(),
      deliveryMethod: z.string().optional(),
      paymentMethod: z.string().optional(),
      paymentStatus: z.string().optional(),
      notes: z.string().max(500).optional(),
      // Ad attribution captured by the storefront (Meta click ids, UTM tags); trimmed again in the service
      attribution: z.record(z.any()).optional(),
    }),
  ]),
});

// Private order tracking: the tracking code is required; the order number is an optional extra check
export const trackOrderSchema = z.object({
  body: z.object({
    code: z.string().trim().min(1, "Please enter your tracking code.").max(40),
    orderNumber: z.string().trim().max(40).optional().nullable(),
  }),
});

// Linking a guest order to the signed-in account with its one-time claim token
export const claimOrderSchema = z.object({
  body: z.object({
    claimToken: z.string().trim().min(1, "Claim token is required.").max(100),
  }),
});

export const couponValidateSchema = z.object({
  body: z.object({
    code: z.string().min(1, "Coupon code is required"),
    subtotal: z.number().min(0, "Subtotal must be positive").optional(),
    items: z.array(z.any()).optional(),
  }),
});

// Cart lines for the offer/discount preview: { productId, price (rupees, selling price), quantity }
export const discountPreviewSchema = z.object({
  body: z.object({
    items: z
      .array(
        z.object({
          productId: z.string().optional(),
          price: z.number().min(0),
          quantity: z.number().int().min(1),
        })
      )
      .max(100),
    couponCode: z.string().optional().nullable(),
  }),
});

