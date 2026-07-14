import { prisma } from "../lib/db";
import {
  flagStaleCreatingShipmentsForReconciliation,
  retryFailedShipments
} from "../lib/shipment-fulfillment";

async function main() {
  console.log("Running Shiprocket shipment reconciliation worker...");

  // A timed-out provider POST is deliberately never retried automatically.
  // It is moved to a staff-visible reconciliation state instead.
  const reconciliationCount = await flagStaleCreatingShipmentsForReconciliation();
  const retryOutcomes = await retryFailedShipments();

  console.log(`Flagged ${reconciliationCount} stale shipment request(s) for reconciliation.`);
  console.log("Failed shipment retry outcomes:", retryOutcomes);
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error("Shipment reconciliation worker failed:", error);
    await prisma.$disconnect();
    process.exit(1);
  });
