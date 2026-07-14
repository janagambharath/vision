import assert from "node:assert/strict";
import test from "node:test";
import { createOrderAccessToken, verifyOrderAccessToken } from "../lib/order-access";
import { uploadedFileMatchesType } from "../lib/uploads";
import { verifyRazorpayWebhookSignature } from "../lib/integrations/razorpay";
import { serializeJsonLd } from "../lib/json-ld";

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

test("JSON-LD serialization cannot terminate its inline script element", () => {
  const lineSeparator = String.fromCharCode(0x2028);
  const paragraphSeparator = String.fromCharCode(0x2029);
  const schema = {
    name: '</script><img src=x onerror="alert(1)">',
    description: `Frames & lenses${lineSeparator}${paragraphSeparator}`,
  };

  const serialized = serializeJsonLd(schema);

  assert.equal(serialized.includes("</script"), false);
  assert.equal(serialized.includes("<"), false);
  assert.equal(serialized.includes(">"), false);
  assert.equal(serialized.includes("&"), false);
  assert.equal(serialized.includes(lineSeparator), false);
  assert.equal(serialized.includes(paragraphSeparator), false);
  assert.deepEqual(JSON.parse(serialized), schema);
  assert.throws(() => serializeJsonLd(undefined), TypeError);
});
