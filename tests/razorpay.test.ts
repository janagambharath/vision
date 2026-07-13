import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import test from "node:test";
import { verifyRazorpayWebhookSignature } from "../lib/integrations/razorpay";

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
