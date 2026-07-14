import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import { refundRazorpayPayment, verifyRazorpayWebhookSignature } from "../lib/integrations/razorpay";

test("verifyRazorpayWebhookSignature accepts a valid HMAC signature", () => {
  process.env.RAZORPAY_WEBHOOK_SECRET = "test-webhook-secret";
  const body = JSON.stringify({ event: "payment.captured", payload: { payment: { entity: { id: "pay_123" } } } });
  const signature = createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET).update(body).digest("hex");

  assert.equal(verifyRazorpayWebhookSignature(body, signature), true);
});

test("verifyRazorpayWebhookSignature rejects missing and mismatched signatures", () => {
  process.env.RAZORPAY_WEBHOOK_SECRET = "test-webhook-secret";
  const body = JSON.stringify({ event: "payment.failed" });

  assert.equal(verifyRazorpayWebhookSignature(body, null), false);
  assert.equal(verifyRazorpayWebhookSignature(body, "00"), false);
});

test("refund requests carry a durable Razorpay idempotency key", async () => {
  const originalFetch = globalThis.fetch;
  const originalKeyId = process.env.RAZORPAY_KEY_ID;
  const originalKeySecret = process.env.RAZORPAY_KEY_SECRET;
  let idempotencyHeader = "";
  let authorizationHeader = "";
  process.env.RAZORPAY_KEY_ID = "rzp_test_key";
  process.env.RAZORPAY_KEY_SECRET = "rzp_test_secret";
  globalThis.fetch = (async (_input, init) => {
    const headers = new Headers(init?.headers);
    idempotencyHeader = headers.get("X-Refund-Idempotency") ?? "";
    authorizationHeader = headers.get("Authorization") ?? "";
    return new Response(JSON.stringify({ id: "rfnd_test", status: "pending" }), { status: 200 });
  }) as typeof fetch;

  try {
    const refund = await refundRazorpayPayment("pay_test", 1200, "vv-refund-cuid123456789");
    assert.equal(refund.id, "rfnd_test");
    assert.equal(refund.status, "pending");
    assert.equal(idempotencyHeader, "vv-refund-cuid123456789");
    assert.match(authorizationHeader, /^Basic /);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKeyId === undefined) delete process.env.RAZORPAY_KEY_ID;
    else process.env.RAZORPAY_KEY_ID = originalKeyId;
    if (originalKeySecret === undefined) delete process.env.RAZORPAY_KEY_SECRET;
    else process.env.RAZORPAY_KEY_SECRET = originalKeySecret;
  }
});
