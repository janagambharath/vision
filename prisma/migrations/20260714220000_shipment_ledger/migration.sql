CREATE TABLE IF NOT EXISTS "Shipment" (
  "id" TEXT NOT NULL,
  "orderId" TEXT NOT NULL,
  "provider" TEXT NOT NULL DEFAULT 'shiprocket',
  "providerShipmentId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'CREATING',
  "rawPayload" JSONB,
  "error" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "Shipment_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "Shipment_orderId_key" ON "Shipment"("orderId");
CREATE UNIQUE INDEX IF NOT EXISTS "Shipment_providerShipmentId_key" ON "Shipment"("providerShipmentId");
CREATE INDEX IF NOT EXISTS "Shipment_provider_status_idx" ON "Shipment"("provider", "status");

DO $$ BEGIN
  ALTER TABLE "Shipment" ADD CONSTRAINT "Shipment_orderId_fkey"
    FOREIGN KEY ("orderId") REFERENCES "Order"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
