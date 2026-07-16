import assert from "node:assert/strict";
import test from "node:test";
import { normalizeCatalogPage, normalizeStoreProductSort } from "../lib/store-data";

test("catalog pagination clamps invalid and out-of-range page input", () => {
  assert.equal(normalizeCatalogPage(undefined), 1);
  assert.equal(normalizeCatalogPage("0"), 1);
  assert.equal(normalizeCatalogPage("2.5"), 1);
  assert.equal(normalizeCatalogPage("12"), 12);
  assert.equal(normalizeCatalogPage(50_000), 10_000);
});

test("catalog sorting falls back to the safe storefront order", () => {
  assert.equal(normalizeStoreProductSort(undefined), "featured");
  assert.equal(normalizeStoreProductSort("not-a-sort"), "featured");
  assert.equal(normalizeStoreProductSort("price-desc"), "price-desc");
});
