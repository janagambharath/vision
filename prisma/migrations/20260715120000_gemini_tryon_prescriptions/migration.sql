-- Replace the incomplete upload-only prescription record with a clinical
-- prescription workflow. Existing uploaded files remain linked as UPLOAD.
CREATE TYPE "PrescriptionType" AS ENUM ('MANUAL', 'UPLOAD', 'UPLOAD_LATER', 'EYE_TEST');
CREATE TYPE "PrescriptionStatus" AS ENUM ('WAITING', 'NEEDS_REVIEW', 'VERIFIED', 'INVALID');

ALTER TABLE "LensOption"
  ADD COLUMN "requiresPrescription" BOOLEAN NOT NULL DEFAULT true;

UPDATE "LensOption"
SET "requiresPrescription" = false
WHERE "code" IN ('FRAME_ONLY', 'ZERO_POWER_BC');

ALTER TABLE "Prescription"
  ALTER COLUMN "fileUrl" DROP NOT NULL,
  ADD COLUMN "type" "PrescriptionType" NOT NULL DEFAULT 'UPLOAD_LATER',
  ADD COLUMN "status" "PrescriptionStatus" NOT NULL DEFAULT 'WAITING',
  ADD COLUMN "rightSphere" DOUBLE PRECISION,
  ADD COLUMN "rightCylinder" DOUBLE PRECISION,
  ADD COLUMN "rightAxis" INTEGER,
  ADD COLUMN "rightAdd" DOUBLE PRECISION,
  ADD COLUMN "rightPd" DOUBLE PRECISION,
  ADD COLUMN "rightPrism" DOUBLE PRECISION,
  ADD COLUMN "rightBase" TEXT,
  ADD COLUMN "leftSphere" DOUBLE PRECISION,
  ADD COLUMN "leftCylinder" DOUBLE PRECISION,
  ADD COLUMN "leftAxis" INTEGER,
  ADD COLUMN "leftAdd" DOUBLE PRECISION,
  ADD COLUMN "leftPd" DOUBLE PRECISION,
  ADD COLUMN "leftPrism" DOUBLE PRECISION,
  ADD COLUMN "leftBase" TEXT,
  ADD COLUMN "prescriptionDate" TIMESTAMP(3),
  ADD COLUMN "doctorName" TEXT,
  ADD COLUMN "clinicName" TEXT,
  ADD COLUMN "filePublicId" TEXT,
  ADD COLUMN "fileResourceType" TEXT,
  ADD COLUMN "fileFormat" TEXT,
  ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

UPDATE "Prescription"
SET "type" = 'UPLOAD'::"PrescriptionType",
    "status" = (CASE WHEN "verified" THEN 'VERIFIED' ELSE 'WAITING' END)::"PrescriptionStatus"
WHERE "fileUrl" IS NOT NULL;

CREATE INDEX "Prescription_orderId_status_idx" ON "Prescription"("orderId", "status");
CREATE INDEX "Prescription_userId_createdAt_idx" ON "Prescription"("userId", "createdAt");
CREATE INDEX "Prescription_status_createdAt_idx" ON "Prescription"("status", "createdAt");
