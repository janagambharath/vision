import assert from "node:assert/strict";
import test from "node:test";
import {
  aggregateProductQuantities,
  getCheckoutReservationExpiry,
  InventoryUnavailableError,
  isOnlinePaymentMethod
} from "../lib/inventory-reservations";

test("checkout allocations aggregate duplicate product rows before reserving stock", () => {
  assert.deepEqual(
    aggregateProductQuantities([
      { productId: "frame-b", quantity: 1 },
      { productId: "frame-a", quantity: 2 },
      { productId: "frame-b", quantity: 3 }
    ]),
    [
      { productId: "frame-a", quantity: 2 },
      { productId: "frame-b", quantity: 4 }
    ]
  );
});

test("invalid cart quantities cannot produce a stock allocation", () => {
  assert.throws(
    () => aggregateProductQuantities([{ productId: "frame-a", quantity: 0 }]),
    InventoryUnavailableError
  );
  assert.throws(
    () => aggregateProductQuantities([{ productId: null, quantity: 1 }]),
    InventoryUnavailableError
  );
});

test("online checkouts have a short reservation while offline orders receive an operations window", () => {
  const now = new Date("2026-07-14T12:00:00.000Z");
  assert.equal(isOnlinePaymentMethod("RAZORPAY"), true);
  assert.equal(isOnlinePaymentMethod("COD"), false);
  assert.equal(getCheckoutReservationExpiry("UPI", now).toISOString(), "2026-07-14T12:30:00.000Z");
  assert.equal(getCheckoutReservationExpiry("COD", now).toISOString(), "2026-07-16T12:00:00.000Z");
});
