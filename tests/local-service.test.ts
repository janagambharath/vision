import test from "node:test";
import assert from "node:assert/strict";
import { tryAtHomeSchema } from "../lib/validations";
import { getLocalServiceability, isLocalLaunchPincode } from "../lib/local-service";

test("home-trial submissions require a valid six-digit pincode before service-area checks", () => {
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

test("local launch serviceability allows only the configured Hyderabad pilot zone", () => {
  assert.equal(isLocalLaunchPincode("500001"), true);
  assert.equal(isLocalLaunchPincode("500032"), true);
  assert.equal(isLocalLaunchPincode("501505"), true);
  assert.equal(isLocalLaunchPincode("110001"), false);
  assert.equal(getLocalServiceability("500032").serviceable, true);
  assert.equal(getLocalServiceability("110001").serviceable, false);
  assert.equal(getLocalServiceability("5000").serviceable, false);
});
