-- Home trials are availability requests, not an online payment flow. New
-- requests must default to zero so an omitted application field cannot imply
-- that a service fee was collected.
ALTER TABLE "TryAtHomeRequest" ALTER COLUMN "serviceFeePaise" SET DEFAULT 0;
ALTER TABLE "Product" ALTER COLUMN "taxPct" SET DEFAULT 0;
