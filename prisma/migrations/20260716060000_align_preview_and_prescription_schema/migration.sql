-- Keep previously generated fallback previews available after retiring the
-- FALLBACK_READY state from the application enum.
ALTER TABLE "TryOnPreview" ALTER COLUMN "status" DROP DEFAULT;

ALTER TYPE "PreviewStatus" RENAME TO "PreviewStatus_old";
CREATE TYPE "PreviewStatus" AS ENUM ('RECEIVED', 'PROCESSING', 'READY', 'FAILED');

ALTER TABLE "TryOnPreview"
ALTER COLUMN "status" TYPE "PreviewStatus"
USING (
  CASE
    WHEN "status"::text = 'FALLBACK_READY' THEN 'READY'
    ELSE "status"::text
  END
)::"PreviewStatus";

ALTER TABLE "TryOnPreview" ALTER COLUMN "status" SET DEFAULT 'RECEIVED';
DROP TYPE "PreviewStatus_old";

-- Prisma's @updatedAt is maintained by the client and must not introduce a
-- database-side default.
ALTER TABLE "Prescription" ALTER COLUMN "updatedAt" DROP DEFAULT;
