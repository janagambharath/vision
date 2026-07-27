import { z } from "zod";

export const phoneSchema = z.string().trim().max(20).regex(/^[+\d][\d\s-]{8,18}$/, "Enter a valid phone number");
export const slugSchema = z.string().trim().min(2).max(120).regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
export const orderPublicIdSchema = z.string().trim().toUpperCase().regex(/^VV-[A-Z0-9-]{8,60}$/);

export function normalizePhone(value: string) {
  const trimmed = value.trim();
  const hasPlus = trimmed.startsWith("+");
  const digits = trimmed.replace(/\D/g, "");
  return hasPlus ? `+${digits}` : digits;
}

function parseFutureDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return date >= today;
}

export const leadSchema = z.object({
  name: z.string().trim().min(2).max(80),
  phone: phoneSchema,
  email: z.string().email().optional().or(z.literal("")),
  source: z.string().trim().min(2).max(80),
  intent: z.string().trim().max(140).optional(),
  payload: z.record(z.unknown()).optional()
});

export const checkoutSchema = z.object({
  name: z.string().trim().min(2).max(80),
  phone: phoneSchema,
  // Shiprocket requires an email address for every shipment. Keep this
  // required at the server boundary as well as in the checkout UI.
  email: z.string().trim().email(),
  line1: z.string().trim().min(6).max(160),
  line2: z.string().trim().max(160).optional(),
  city: z.string().trim().min(2).max(80),
  state: z.string().trim().min(2).max(80),
  pincode: z.string().trim().regex(/^\d{6}$/),
  // Local launch orders are delivered only. Try-at-home is a separate request
  // workflow and store pickup is not yet operationally supported.
  deliveryMethod: z.literal("DELIVERY"),
  // Enforce the local COD-only launch on the server, not only in the UI.
  paymentMethod: z.literal("COD"),
  notes: z.string().trim().max(600).optional(),
  acceptedTerms: z.literal("on"),
  acceptedReturns: z.literal("on")
});

export const orderTrackingSchema = z.object({
  id: orderPublicIdSchema,
  phone: phoneSchema.transform(normalizePhone)
});

export const tryAtHomeSchema = z.object({
  name: z.string().trim().min(2).max(80),
  phone: phoneSchema,
  address: z.string().trim().min(8).max(240),
  preferredDate: z.string().trim().refine(parseFutureDate, "Select today or a future date"),
  preferredSlot: z.string().trim().min(3).max(40),
  productIds: z.array(slugSchema).min(1).max(5),
  notes: z.string().trim().max(600).optional()
});

export const analyticsEventSchema = z.object({
  name: z.string().trim().min(2).max(80),
  sessionId: z.string().trim().max(120).optional(),
  source: z.string().trim().max(80).optional(),
  path: z.string().trim().max(240).optional(),
  metadata: z.record(z.unknown()).optional()
});
