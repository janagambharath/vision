import assert from "node:assert/strict";
import test from "node:test";
import {
  buildShiprocketShipmentPayload,
  getShiprocketOrderReference
} from "../lib/integrations/shiprocket";
import {
  getShipmentAttemptCount,
  isRetryableShipmentStatus,
  isStaleCreatingShipment
} from "../lib/shipment-fulfillment";

test("Shiprocket references are deterministic, compact, and distinct per public order", () => {
  const first = getShiprocketOrderReference("VV-0123456789ABCDEF0123456789ABCDEF");
  const repeat = getShiprocketOrderReference("VV-0123456789ABCDEF0123456789ABCDEF");
  const second = getShiprocketOrderReference("VV-FEDCBA9876543210FEDCBA9876543210");

  assert.equal(first, repeat);
  assert.equal(first.length, 20);
  assert.match(first, /^VV[A-F0-9]{18}$/);
  assert.notEqual(first, second);
});

test("only confirmed provider rejections are retried automatically", () => {
  assert.equal(isRetryableShipmentStatus("FAILED"), true);
  assert.equal(isRetryableShipmentStatus("CREATING"), false);
  assert.equal(isRetryableShipmentStatus("RECONCILIATION_REQUIRED"), false);
  assert.equal(getShipmentAttemptCount({ _visionVistaraShipment: { attemptCount: 2 } }), 2);
});

test("Shiprocket payload includes the provider-required billing and order fields", () => {
  const payload = buildShiprocketShipmentPayload({
    publicId: "VV-0123456789ABCDEF0123456789ABCDEF",
    customerName: "Asha Rao",
    phone: "9876543210",
    email: "asha@example.com",
    shippingAddress: {
      name: "Asha Rao",
      phone: "9876543210",
      line1: "12 Vision Lane",
      line2: null,
      city: "Hyderabad",
      state: "Telangana",
      pincode: "500001"
    },
    items: [{ quantity: 1, unitPricePaise: 99900, productSnapshot: { name: "Frame", sku: "VV-1" } }],
    grandTotalPaise: 99900,
    paymentMethod: "RAZORPAY"
  });

  assert.equal(payload.order_id, getShiprocketOrderReference("VV-0123456789ABCDEF0123456789ABCDEF"));
  assert.equal(payload.shipping_is_billing, true);
  assert.equal(payload.billing_email, "asha@example.com");
  assert.equal(payload.breadth, 10);
  assert.equal(payload.order_items[0].sku, "VV-1");
});

test("creating leases become reconciliation work after the confirmation window", () => {
  const now = new Date("2026-07-14T12:00:00.000Z");
  assert.equal(isStaleCreatingShipment(new Date("2026-07-14T11:44:59.000Z"), now), true);
  assert.equal(isStaleCreatingShipment(new Date("2026-07-14T11:45:01.000Z"), now), false);
});
