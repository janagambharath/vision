ALTER TABLE "Product"
  ADD COLUMN IF NOT EXISTS "tryOnEligible" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "arImageUrl" TEXT;

ALTER TABLE "AdminUser"
  ADD COLUMN IF NOT EXISTS "failedLogins" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "lockedUntil" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "lastLoginAt" TIMESTAMP(3);

CREATE TABLE IF NOT EXISTS "ProductImageUpload" (
  "id" TEXT NOT NULL,
  "productId" TEXT,
  "fileName" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'uploading',
  "assetUrl" TEXT,
  "errorReason" TEXT,
  "attempt" INTEGER NOT NULL DEFAULT 0,
  "lastAttempt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "ProductImageUpload_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "ProductImageUpload_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE SET NULL ON UPDATE CASCADE
);

CREATE INDEX IF NOT EXISTS "ProductImageUpload_productId_idx" ON "ProductImageUpload"("productId");
CREATE INDEX IF NOT EXISTS "ProductImageUpload_status_idx" ON "ProductImageUpload"("status");
CREATE INDEX IF NOT EXISTS "ProductImageUpload_createdAt_idx" ON "ProductImageUpload"("createdAt");
