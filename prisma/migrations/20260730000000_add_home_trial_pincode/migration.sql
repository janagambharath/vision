ALTER TABLE "TryAtHomeRequest" ADD COLUMN IF NOT EXISTS "pincode" TEXT;

CREATE INDEX IF NOT EXISTS "TryAtHomeRequest_pincode_idx"
  ON "TryAtHomeRequest"("pincode");
