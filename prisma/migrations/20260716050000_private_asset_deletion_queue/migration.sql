CREATE TABLE "AssetDeletionTask" (
  "id" TEXT NOT NULL,
  "publicId" TEXT NOT NULL,
  "resourceType" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "nextAttemptAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastError" TEXT,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AssetDeletionTask_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "AssetDeletionTask_publicId_resourceType_key"
  ON "AssetDeletionTask"("publicId", "resourceType");
CREATE INDEX "AssetDeletionTask_completedAt_nextAttemptAt_idx"
  ON "AssetDeletionTask"("completedAt", "nextAttemptAt");
CREATE INDEX "AssetDeletionTask_kind_createdAt_idx"
  ON "AssetDeletionTask"("kind", "createdAt");
