ALTER TABLE "frame_preview_requests"
  ALTER COLUMN "customerImageUrl" DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS "customerId" TEXT,
  ADD COLUMN IF NOT EXISTS "customerImagePublicId" TEXT,
  ADD COLUMN IF NOT EXISTS "customerImageHash" TEXT,
  ADD COLUMN IF NOT EXISTS "resultImagePublicId" TEXT,
  ADD COLUMN IF NOT EXISTS "resultBytes" INTEGER,
  ADD COLUMN IF NOT EXISTS "providerRequestId" TEXT,
  ADD COLUMN IF NOT EXISTS "providerCost" DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS "model" TEXT,
  ADD COLUMN IF NOT EXISTS "generationMs" INTEGER,
  ADD COLUMN IF NOT EXISTS "expiresAt" TIMESTAMP(3);

CREATE INDEX IF NOT EXISTS "frame_preview_requests_productId_customerImageHash_status_idx"
  ON "frame_preview_requests"("productId", "customerImageHash", "status");
CREATE INDEX IF NOT EXISTS "frame_preview_requests_customerId_createdAt_idx"
  ON "frame_preview_requests"("customerId", "createdAt");
CREATE INDEX IF NOT EXISTS "frame_preview_requests_expiresAt_idx"
  ON "frame_preview_requests"("expiresAt");
