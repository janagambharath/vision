import { z } from "zod";

export const phoneSchema = z.string().trim().regex(/^[+\d][\d\s-]{8,18}$/, "Enter a valid phone number");

export const leadSchema = z.object({
  name: z.string().trim().min(2),
  phone: phoneSchema,
  email: z.string().email().optional().or(z.literal("")),
  source: z.string().trim().min(2),
  intent: z.string().trim().optional(),
  payload: z.record(z.unknown()).optional()
});

export const checkoutSchema = z.object({
  name: z.string().trim().min(2),
  phone: phoneSchema,
  email: z.string().email().optional().or(z.literal("")),
  line1: z.string().trim().min(6),
  line2: z.string().trim().optional(),
  city: z.string().trim().min(2),
  state: z.string().trim().optional(),
  pincode: z.string().trim().regex(/^\d{6}$/),
  deliveryMethod: z.enum(["DELIVERY", "TRY_AT_HOME", "STORE_PICKUP"]),
  paymentMethod: z.enum(["RAZORPAY", "UPI", "CARD", "NETBANKING", "COD", "WHATSAPP_ASSISTED"]),
  notes: z.string().trim().optional(),
  acceptedTerms: z.literal("on"),
  acceptedReturns: z.literal("on")
});

export const tryAtHomeSchema = z.object({
  name: z.string().trim().min(2),
  phone: phoneSchema,
  address: z.string().trim().min(8),
  preferredDate: z.string().trim().min(8),
  preferredSlot: z.string().trim().min(3),
  productIds: z.array(z.string()).min(1).max(5),
  notes: z.string().trim().optional()
});
