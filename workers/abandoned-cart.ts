import { prisma } from "../lib/db";

async function main() {
  const cutoff = new Date(Date.now() - 1000 * 60 * 60 * 12);
  const abandonedCarts = await prisma.cart.findMany({
    where: {
      updatedAt: { lt: cutoff },
      items: { some: {} }
    },
    include: {
      items: { include: { product: true, lensOption: true } },
      user: true
    },
    take: 50
  });

  for (const cart of abandonedCarts) {
    await prisma.activityLog.create({
      data: {
        action: "ABANDONED_CART_REVIEW_QUEUED",
        entityType: "cart",
        entityId: cart.id,
        metadata: {
          phone: cart.user?.phone ?? null,
          itemCount: cart.items.length
        }
      }
    });
  }
}

main()
  .then(async () => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
