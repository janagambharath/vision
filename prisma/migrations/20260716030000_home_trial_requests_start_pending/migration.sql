-- A try-at-home form submission is an availability request, not a confirmed
-- booking. Existing records retain their status so operations can review any
-- historical commitments rather than changing them automatically.
ALTER TABLE "TryAtHomeRequest"
  ALTER COLUMN "status" SET DEFAULT 'PENDING'::"OrderStatus";
