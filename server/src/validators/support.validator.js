import { z } from "zod";

const text = (min, max, label) =>
  z
    .string({ required_error: `${label} is required` })
    .trim()
    .min(min, `${label} must be at least ${min} characters`)
    .max(max, `${label} must be at most ${max} characters`);

export const contactSchema = z.object({
  body: z.object({
    name: text(2, 100, "Name"),
    email: z.string({ required_error: "Email is required" }).trim().toLowerCase().email("Enter a valid email address").max(254),
    phone: z
      .string()
      .trim()
      .max(20)
      .refine((v) => v === "" || v.replace(/\D/g, "").length >= 10, "Enter a valid phone number, or leave it blank")
      .optional()
      .default(""),
    subject: z.string().trim().max(150).optional().default("General enquiry"),
    message: text(10, 2000, "Message"),
    // Hidden spam trap: people never see or fill it, bots usually do
    website: z.string().max(200).optional().default(""),
  }),
});

export const TICKET_CATEGORIES = ["Order Issue", "Delivery", "Payment", "Product Question", "Returns & Refunds", "Other"];

export const ticketCreateSchema = z.object({
  body: z.object({
    subject: text(5, 150, "Subject"),
    category: z.enum(TICKET_CATEGORIES, { errorMap: () => ({ message: "Choose a category" }) }).default("Other"),
    orderNumber: z.string().trim().max(40).optional().default(""),
    message: text(10, 2000, "Message"),
  }),
});

export const ticketMessageSchema = z.object({
  body: z.object({
    message: text(2, 2000, "Message"),
  }),
});
