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
    }),
    z.object({
      items: z.array(z.any()).min(1, "items cannot be empty"),
      customer: z.any().optional(),
      shippingAddress: z.any().optional(),
      pricing: z.any().optional(),
      deliveryMethod: z.string().optional(),
      paymentMethod: z.string().optional(),
      paymentStatus: z.string().optional(),
      notes: z.string().optional(),
    }),
  ]),
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

