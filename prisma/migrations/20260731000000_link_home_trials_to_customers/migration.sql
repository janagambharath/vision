-- Link home-trial requests to signed-in customers so they can reliably view
-- each request in My Account without turning an availability request into a
-- payment or fulfillment order.
ALTER TABLE "TryAtHomeRequest"
  ADD COLUMN IF NOT EXISTS "userId" TEXT;

CREATE INDEX IF NOT EXISTS "TryAtHomeRequest_userId_idx"
  ON "TryAtHomeRequest"("userId");

ALTER TABLE "TryAtHomeRequest"
  ADD CONSTRAINT "TryAtHomeRequest_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Safely attach prior OTP-based requests where the stored phone number is
-- already the customer's verified account phone.
UPDATE "TryAtHomeRequest" AS request
SET "userId" = customer."id"
FROM "User" AS customer
WHERE request."userId" IS NULL
  AND request."phone" = customer."phone";
