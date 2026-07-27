-- Cart pages read these nullable fields while a customer is shopping. They
-- were added to the Prisma model without a matching database migration,
-- causing a runtime missing-column error for carts with items.
ALTER TABLE "CartItem" ADD COLUMN IF NOT EXISTS "rxLeftSph" DOUBLE PRECISION;
ALTER TABLE "CartItem" ADD COLUMN IF NOT EXISTS "rxRightSph" DOUBLE PRECISION;

-- The public checkout is COD-only. Keep legacy enum values so historic
-- Razorpay orders and refunds remain readable.
ALTER TABLE "Order" ALTER COLUMN "paymentMethod" SET DEFAULT 'COD';
