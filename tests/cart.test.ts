import assert from "node:assert/strict";
import test from "node:test";
import { calculateCartTotals } from "../lib/cart";
import { checkoutSchema } from "../lib/validations";

function makeCart(overrides: Record<string, unknown> = {}) {
  return {
    items: [
      {
        quantity: 2,
        product: { pricePaise: 10000 },
        lensOption: { pricePaise: 5000 }
      }
    ],
    coupon: null,
    ...overrides
  } as any;
}

test("calculateCartTotals totals frame, lens, shipping, and final grand total", () => {
  const totals = calculateCartTotals(makeCart());

  assert.equal(totals.subtotalPaise, 20000);
  assert.equal(totals.lensTotalPaise, 10000);
  assert.equal(totals.shippingPaise, 9900);
  assert.equal(totals.discountPaise, 0);
  assert.equal(totals.taxPaise, 0);
  assert.equal(totals.grandTotalPaise, 39900);
});

test("calculateCartTotals applies active percentage coupons to the final amount", () => {
  const totals = calculateCartTotals(
    makeCart({
      coupon: {
        active: true,
        discountPct: 10,
        discountPaise: null,
        minOrderPaise: null,
        maxUses: null,
        usedCount: 0,
        expiresAt: null
      }
    })
  );

  assert.equal(totals.discountPaise, 3000);
  assert.equal(totals.taxPaise, 0);
  assert.equal(totals.grandTotalPaise, 36900);
});

test("calculateCartTotals rejects expired and exhausted coupons", () => {
  const expired = calculateCartTotals(
    makeCart({
      coupon: {
        active: true,
        discountPaise: 5000,
        discountPct: null,
        minOrderPaise: null,
        maxUses: null,
        usedCount: 0,
        expiresAt: new Date("2020-01-01")
      }
    })
  );

  const exhausted = calculateCartTotals(
    makeCart({
      coupon: {
        active: true,
        discountPaise: 5000,
        discountPct: null,
        minOrderPaise: null,
        maxUses: 1,
        usedCount: 1,
        expiresAt: null
      }
    })
  );

  assert.equal(expired.discountPaise, 0);
  assert.equal(exhausted.discountPaise, 0);
});

test("checkout validation accepts complete COD delivery details only", () => {
  const checkout = {
    name: "Vision Customer",
    phone: "9876543210",
    email: "customer@example.com",
    line1: "12 Vision Street",
    line2: "",
    city: "Hyderabad",
    state: "Telangana",
    pincode: "500001",
    deliveryMethod: "DELIVERY",
    paymentMethod: "COD",
    notes: "",
    acceptedTerms: "on",
    acceptedReturns: "on"
  };

  assert.equal(checkoutSchema.safeParse(checkout).success, true);
  assert.equal(checkoutSchema.safeParse({ ...checkout, paymentMethod: "RAZORPAY" }).success, false);
  assert.equal(checkoutSchema.safeParse({ ...checkout, paymentMethod: "WHATSAPP_ASSISTED" }).success, false);
  assert.equal(checkoutSchema.safeParse({ ...checkout, deliveryMethod: "TRY_AT_HOME" }).success, false);
  assert.equal(checkoutSchema.safeParse({ ...checkout, deliveryMethod: "STORE_PICKUP" }).success, false);
  assert.equal(checkoutSchema.safeParse({ ...checkout, email: "" }).success, false);
  assert.equal(checkoutSchema.safeParse({ ...checkout, state: "" }).success, false);
});
