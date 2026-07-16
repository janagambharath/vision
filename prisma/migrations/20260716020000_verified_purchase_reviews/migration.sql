-- One authenticated customer may maintain one moderated review per product.
-- Existing guest reviews have a NULL userId and remain unaffected by PostgreSQL's
-- NULL uniqueness semantics. Keep the newest authenticated review if an older
-- duplicate exists from a pre-constraint deployment.
WITH ranked_reviews AS (
  SELECT "id", ROW_NUMBER() OVER (
    PARTITION BY "userId", "productId"
    ORDER BY "createdAt" DESC, "id" DESC
  ) AS row_number
  FROM "Review"
  WHERE "userId" IS NOT NULL
)
DELETE FROM "Review"
WHERE "id" IN (SELECT "id" FROM ranked_reviews WHERE row_number > 1);

CREATE UNIQUE INDEX "Review_userId_productId_key"
  ON "Review"("userId", "productId");
