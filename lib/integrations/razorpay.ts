import Razorpay from "razorpay";
import { createHmac, timingSafeEqual } from "node:crypto";

export function razorpayConfigured() {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

export function getRazorpayClient() {
  if (!razorpayConfigured()) {
    throw new Error("Razorpay credentials are not configured.");
  }

  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
  });
}

export async function createRazorpayOrder(input: { amountPaise: number; receipt: string; notes?: Record<string, string> }) {
  const razorpay = getRazorpayClient();

  return razorpay.orders.create({
    amount: input.amountPaise,
    currency: "INR",
    receipt: input.receipt,
    notes: input.notes
  });
}

export type RazorpayRefundResponse = {
  id: string;
  status?: string;
};

/**
 * Razorpay's SDK does not expose per-request headers for refunds. Use the
 * documented idempotency header directly so a retry can never create a
 * second refund for the same durable local refund attempt.
 */
export async function refundRazorpayPayment(paymentId: string, amountPaise: number, idempotencyKey: string) {
  if (!razorpayConfigured()) {
    throw new Error("Razorpay credentials are not configured.");
  }
  if (!/^[A-Za-z0-9_-]{10,}$/.test(idempotencyKey)) {
    throw new Error("Razorpay refund idempotency key is invalid.");
  }

  const credentials = Buffer.from(`${process.env.RAZORPAY_KEY_ID}:${process.env.RAZORPAY_KEY_SECRET}`).toString("base64");
  let response: Response;
  try {
    response = await fetch(`https://api.razorpay.com/v1/payments/${encodeURIComponent(paymentId)}/refund`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${credentials}`,
        "Content-Type": "application/json",
        "X-Refund-Idempotency": idempotencyKey
      },
      body: JSON.stringify({ amount: amountPaise })
    });
  } catch {
    throw new Error("Razorpay refund request could not be confirmed.");
  }

  const body = await response.json().catch(() => null) as { id?: unknown; status?: unknown; error?: { description?: unknown } } | null;
  if (!response.ok) {
    const message = typeof body?.error?.description === "string"
      ? body.error.description
      : `Razorpay refund request failed with status ${response.status}.`;
    throw new Error(message);
  }
  if (!body || typeof body.id !== "string" || !body.id) {
    throw new Error("Razorpay refund response did not include a refund identifier.");
  }

  return {
    id: body.id,
    status: typeof body.status === "string" ? body.status : undefined
  } satisfies RazorpayRefundResponse;
}

export function verifyRazorpayWebhookSignature(body: string, signature: string | null) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret || !signature) return false;
  if (!/^[a-f0-9]{64}$/i.test(signature)) return false;

  const expected = createHmac("sha256", secret).update(body).digest("hex");
  const receivedBuffer = Buffer.from(signature, "hex");
  const expectedBuffer = Buffer.from(expected, "hex");

  if (receivedBuffer.length !== expectedBuffer.length) return false;
  return timingSafeEqual(receivedBuffer, expectedBuffer);
}

