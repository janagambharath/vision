import { prisma } from "../lib/db";
import { expireCheckoutReservations, reconcileCapturedPayments } from "../lib/payment-reconciliation";

async function main() {
  console.log("Running checkout expiry and payment reconciliation worker...");
  const expiredReservations = await expireCheckoutReservations();
  const refunds = await reconcileCapturedPayments();
  console.log(`Expired ${expiredReservations} unpaid checkout reservation(s).`);
  console.log("Payment reconciliation outcomes:", refunds);
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error("Payment reconciliation worker failed:", error);
    await prisma.$disconnect();
    process.exit(1);
  });
