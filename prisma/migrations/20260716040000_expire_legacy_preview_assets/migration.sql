-- Legacy preview records predate explicit expiry timestamps. Apply the same
-- 30-day retention policy from their creation time so the purge worker can
-- remove any retained customer or generated image references immediately when
-- they are already overdue.
UPDATE "frame_preview_requests"
SET "expiresAt" = "createdAt" + INTERVAL '30 days'
WHERE "expiresAt" IS NULL
  AND (
    "customerImagePublicId" IS NOT NULL
    OR "resultImagePublicId" IS NOT NULL
    OR "customerImageUrl" IS NOT NULL
    OR "resultImageUrl" IS NOT NULL
  );
