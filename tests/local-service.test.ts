import test from "node:test";
import assert from "node:assert/strict";
import { tryAtHomeSchema } from "../lib/validations";

test("home-trial submissions accept any valid six-digit pincode", () => {
  const base = {
    name: "Bharath Janagam",
    phone: "9876543210",
    address: "1 Main Road, Hyderabad",
    preferredDate: "2099-01-01",
    preferredSlot: "10:00 AM - 12:00 PM",
    productIds: ["frame-1"]
  };

  assert.equal(tryAtHomeSchema.safeParse({ ...base, pincode: "500032" }).success, true);
  assert.equal(tryAtHomeSchema.safeParse({ ...base, pincode: "110001" }).success, true);
  assert.equal(tryAtHomeSchema.safeParse({ ...base, pincode: "5000" }).success, false);
});
