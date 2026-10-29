import assert from "node:assert/strict";
import test from "node:test";
import { productIsSellable } from "../lib/inventory";
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

test("legacy active inventory remains sellable without a landed-cost record", () => {
  assert.equal(productIsSellable({
    status: "ACTIVE",
    pricePaise: 149900,
    codAvailable: true,
    inventoryQuantity: 2,
    inventoryStatus: "LOW_STOCK"
  }), true);
});


test("recommendation catalog reads all active measured frames without storefront pagination", async (context) => {
  const { prisma } = await import("../lib/db");
  const { getMeasuredStoreProducts } = await import("../lib/store-data");
  const previousDatabaseUrl = process.env.DATABASE_URL;
  process.env.DATABASE_URL = "postgresql://test:test@localhost/test";
  context.after(() => {
    if (previousDatabaseUrl === undefined) delete process.env.DATABASE_URL;
    else process.env.DATABASE_URL = previousDatabaseUrl;
  });
  // Prisma delegates are proxies without method property descriptors.
  const originalFindMany = prisma.product.findMany;
  const query = context.mock.fn(async (_options?: Parameters<typeof originalFindMany>[0]) => []);
  prisma.product.findMany = query as typeof originalFindMany;
  context.after(() => { prisma.product.findMany = originalFindMany; });
  assert.deepEqual(await getMeasuredStoreProducts(), []);
  assert.equal(query.mock.calls.length, 1);
  const options = query.mock.calls[0].arguments[0];
  assert.deepEqual(options?.where, { status: "ACTIVE", deletedAt: null });
  assert.equal(options?.take, undefined);
  assert.equal(options?.skip, undefined);
});
