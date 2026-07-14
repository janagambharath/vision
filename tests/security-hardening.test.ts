import assert from "node:assert/strict";
import test from "node:test";
import { createOrderAccessToken, verifyOrderAccessToken } from "../lib/order-access";
import { uploadedFileMatchesType } from "../lib/uploads";
import { verifyRazorpayWebhookSignature } from "../lib/integrations/razorpay";

test("order-access tokens are scoped, signed, and short-lived", () => {
  process.env.AUTH_SECRET = "test-auth-secret";
  const token = createOrderAccessToken("VV-0123456789ABCDEF", "checkout", 60);

  assert.equal(verifyOrderAccessToken(token, "VV-0123456789ABCDEF", "checkout"), true);
  assert.equal(verifyOrderAccessToken(token, "VV-0123456789ABCDEF", "tracking"), false);
  assert.equal(verifyOrderAccessToken(`${token}tampered`, "VV-0123456789ABCDEF", "checkout"), false);
});

test("uploads must match their declared binary format", () => {
  assert.equal(uploadedFileMatchesType("image/jpeg", Buffer.from([0xff, 0xd8, 0xff, 0x00])), true);
  assert.equal(uploadedFileMatchesType("image/png", Buffer.from("not a PNG")), false);
  assert.equal(uploadedFileMatchesType("application/pdf", Buffer.from("%PDF-1.7")), true);
  assert.equal(uploadedFileMatchesType("image/webp", Buffer.from("RIFF1234WEBP")), true);
});

test("webhook verification never falls back to the Razorpay API secret", () => {
  const previousWebhook = process.env.RAZORPAY_WEBHOOK_SECRET;
  process.env.RAZORPAY_WEBHOOK_SECRET = "";
  process.env.RAZORPAY_KEY_SECRET = "api-secret-is-not-a-webhook-secret";
  assert.equal(verifyRazorpayWebhookSignature("{}", "00"), false);
  process.env.RAZORPAY_WEBHOOK_SECRET = previousWebhook;
});
