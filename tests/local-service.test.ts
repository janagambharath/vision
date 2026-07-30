import test from "node:test";
import assert from "node:assert/strict";
import { isLocalPincodeServiceable } from "../lib/local-service";
import { tryAtHomeSchema } from "../lib/validations";

test("local serviceability accepts only configured six-digit pincodes", () => {
  const previous = process.env.LOCAL_SERVICE_PINCODES;
  process.env.LOCAL_SERVICE_PINCODES = "500001, 500032";

  try {
    assert.equal(isLocalPincodeServiceable("500001"), true);
    assert.equal(isLocalPincodeServiceable("500032"), true);
    assert.equal(isLocalPincodeServiceable("500033"), false);
    assert.equal(isLocalPincodeServiceable("not-a-pincode"), false);
  } finally {
    if (previous === undefined) delete process.env.LOCAL_SERVICE_PINCODES;
    else process.env.LOCAL_SERVICE_PINCODES = previous;
  }
});

test("home-trial submissions require a valid pincode", () => {
  const base = {
    name: "Bharath Janagam",
    phone: "9876543210",
    address: "1 Main Road, Hyderabad",
    preferredDate: "2099-01-01",
    preferredSlot: "10:00 AM - 12:00 PM",
    productIds: ["frame-1"]
  };

  assert.equal(tryAtHomeSchema.safeParse({ ...base, pincode: "500032" }).success, true);
  assert.equal(tryAtHomeSchema.safeParse({ ...base, pincode: "5000" }).success, false);
});
