-- CreateTable
CREATE TABLE "FaceMeasurement" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT,
    "faceWidthMm" DOUBLE PRECISION,
    "faceHeightMm" DOUBLE PRECISION,
    "estimatedPdMm" DOUBLE PRECISION,
    "interocularWidthMm" DOUBLE PRECISION,
    "noseWidthMm" DOUBLE PRECISION,
    "faceShape" TEXT,
    "recommendedSize" TEXT,
    "measurementQuality" TEXT,
    "calibrationMethod" TEXT,
    "calibrationConfidence" DOUBLE PRECISION,
    "measurementVersion" TEXT NOT NULL DEFAULT '1.0',
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FaceMeasurement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FaceMeasurement_sessionId_idx" ON "FaceMeasurement"("sessionId");

-- CreateIndex
CREATE INDEX "FaceMeasurement_userId_idx" ON "FaceMeasurement"("userId");

-- CreateIndex
CREATE INDEX "FaceMeasurement_createdAt_idx" ON "FaceMeasurement"("createdAt");
