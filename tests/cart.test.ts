import assert from "node:assert/strict";
import test from "node:test";
import { calculateCartTotals } from "../lib/cart";

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

test("calculateCartTotals totals frame, lens, shipping, GST, and grand total", () => {
  const totals = calculateCartTotals(makeCart());

  assert.equal(totals.subtotalPaise, 20000);
  assert.equal(totals.lensTotalPaise, 10000);
  assert.equal(totals.shippingPaise, 9900);
  assert.equal(totals.discountPaise, 0);
  assert.equal(totals.taxPaise, 3600);
  assert.equal(totals.grandTotalPaise, 43500);
});

test("calculateCartTotals applies active percentage coupons before GST", () => {
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
  assert.equal(totals.taxPaise, 3240);
  assert.equal(totals.grandTotalPaise, 40140);
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
