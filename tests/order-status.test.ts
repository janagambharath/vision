import assert from "node:assert/strict";
import test from "node:test";
import {
  getAllowedOrderStatusTransitions,
  isOrderReadyForFulfillment,
  isOrderStatusTransitionAllowed
} from "../lib/order-status";

const standardOrder = { hasPrescription: false, allPrescriptionsVerified: false };
const prescriptionWaiting = { hasPrescription: true, allPrescriptionsVerified: false };
const prescriptionVerified = { hasPrescription: true, allPrescriptionsVerified: true };

test("normal orders follow a linear lifecycle and retain same-status note saves", () => {
  assert.deepEqual(
    getAllowedOrderStatusTransitions("PENDING", standardOrder),
    ["PENDING", "CONFIRMED", "CANCELLED"]
  );
  assert.deepEqual(
    getAllowedOrderStatusTransitions("PACKED", standardOrder),
    ["PACKED", "SHIPPED", "CANCELLED"]
  );
  assert.equal(isOrderStatusTransitionAllowed("PENDING", "DELIVERED", standardOrder), false);
  assert.equal(isOrderStatusTransitionAllowed("PACKED", "PACKED", standardOrder), true);
});

test("prescription orders cannot progress into fulfillment before review", () => {
  assert.deepEqual(
    getAllowedOrderStatusTransitions("AWAITING_PRESCRIPTION", prescriptionWaiting),
    ["AWAITING_PRESCRIPTION", "CANCELLED"]
  );
  assert.equal(isOrderStatusTransitionAllowed("AWAITING_PRESCRIPTION", "PACKED", prescriptionWaiting), false);
  assert.equal(isOrderStatusTransitionAllowed("CONFIRMED", "SHIPPED", prescriptionWaiting), false);
  assert.equal(isOrderReadyForFulfillment(prescriptionWaiting), false);
});

test("verified prescriptions enter lens processing before packing", () => {
  assert.deepEqual(
    getAllowedOrderStatusTransitions("AWAITING_PRESCRIPTION", prescriptionVerified),
    ["AWAITING_PRESCRIPTION", "LENS_IN_PROCESSING", "CANCELLED"]
  );
  assert.deepEqual(
    getAllowedOrderStatusTransitions("LENS_IN_PROCESSING", prescriptionVerified),
    ["LENS_IN_PROCESSING", "PACKED", "CANCELLED"]
  );
  assert.equal(isOrderReadyForFulfillment(prescriptionVerified), true);
});

test("terminal statuses keep their status for safe note-only saves", () => {
  assert.deepEqual(getAllowedOrderStatusTransitions("CANCELLED", standardOrder), ["CANCELLED"]);
  assert.deepEqual(getAllowedOrderStatusTransitions("REFUNDED", standardOrder), ["REFUNDED"]);
  assert.equal(isOrderStatusTransitionAllowed("REFUNDED", "REFUNDED", standardOrder), true);
  assert.equal(isOrderStatusTransitionAllowed("REFUNDED", "PENDING", standardOrder), false);
});
