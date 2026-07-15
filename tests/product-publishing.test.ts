import assert from "node:assert/strict";
import test from "node:test";
import { getCreateBlockersForDraft, getPublishBlockersForDraft } from "../lib/product-publishing";

const readyProduct = {
  name: "Vista Classic",
  brand: "Vision Vistara",
  sku: "VV-CLASSIC-01",
  description: "A lightweight full-rim acetate optical frame.",
  pricePaise: 199900,
  compareAtPaise: 249900,
  quantity: 4,
  imageRoles: ["front", "angle"],
  categoryCount: 1,
  tryOnEligible: false,
  arImageUrl: null
};

test("product publish guard accepts a complete product", () => {
  assert.deepEqual(getPublishBlockersForDraft(readyProduct), []);
});

test("product publish guard rejects missing commercial and catalog essentials", () => {
  const blockers = getPublishBlockersForDraft({
    ...readyProduct,
    pricePaise: null,
    quantity: 0,
    imageRoles: [],
    categoryCount: 0,
    tryOnEligible: true
  });

  assert.deepEqual(blockers, [
    "a selling price is required",
    "stock quantity must be greater than zero",
    "at least one product image is required",
    "at least one category is required"
  ]);
});

test("product creation never accepts an incomplete draft", () => {
  const { sku: _sku, ...createCandidate } = readyProduct;
  assert.deepEqual(getCreateBlockersForDraft({
    ...createCandidate,
    description: "",
    pricePaise: null,
    quantity: -1,
    imageRoles: [],
    categoryCount: 0
  }), [
    "a product description is required",
    "a selling price is required",
    "a valid stock quantity is required",
    "at least one product image is required",
    "at least one category is required"
  ]);
});
