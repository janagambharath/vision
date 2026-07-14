-- Hold stock through checkout so a verified payment cannot claim inventory
-- that another checkout has already committed.
CREATE TYPE "InventoryReservationStatus" AS ENUM ('ACTIVE', 'CONSUMED', 'RELEASED', 'EXPIRED');

-- A reconciliation is created when a payment was captured but fulfillment is
-- unsafe. The refund worker uses it as a durable, one-time handoff.
CREATE TYPE "PaymentReconciliationStatus" AS ENUM ('PENDING_REFUND', 'REFUNDING', 'REFUNDED', 'REQUIRES_REVIEW');

CREATE TABLE "InventoryReservation" (
    "id" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "status" "InventoryReservationStatus" NOT NULL DEFAULT 'ACTIVE',
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InventoryReservation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PaymentReconciliation" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "orderId" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "status" "PaymentReconciliationStatus" NOT NULL DEFAULT 'PENDING_REFUND',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentReconciliation_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "Refund" ADD COLUMN "reconciliationId" TEXT;

CREATE UNIQUE INDEX "InventoryReservation_orderId_productId_key" ON "InventoryReservation"("orderId", "productId");
CREATE INDEX "InventoryReservation_status_expiresAt_idx" ON "InventoryReservation"("status", "expiresAt");
CREATE INDEX "InventoryReservation_productId_status_idx" ON "InventoryReservation"("productId", "status");
CREATE UNIQUE INDEX "PaymentReconciliation_paymentId_key" ON "PaymentReconciliation"("paymentId");
CREATE INDEX "PaymentReconciliation_status_createdAt_idx" ON "PaymentReconciliation"("status", "createdAt");
CREATE INDEX "PaymentReconciliation_orderId_idx" ON "PaymentReconciliation"("orderId");
CREATE UNIQUE INDEX "Refund_reconciliationId_key" ON "Refund"("reconciliationId");

ALTER TABLE "InventoryReservation" ADD CONSTRAINT "InventoryReservation_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InventoryReservation" ADD CONSTRAINT "InventoryReservation_productId_fkey"
  FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PaymentReconciliation" ADD CONSTRAINT "PaymentReconciliation_paymentId_fkey"
  FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PaymentReconciliation" ADD CONSTRAINT "PaymentReconciliation_orderId_fkey"
  FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Refund" ADD CONSTRAINT "Refund_reconciliationId_fkey"
  FOREIGN KEY ("reconciliationId") REFERENCES "PaymentReconciliation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
