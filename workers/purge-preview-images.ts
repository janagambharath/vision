import { prisma } from "@/lib/db";
import { deleteTryOnAsset } from "@/lib/ai/gemini";

async function main() {
  const expired = await prisma.framePreviewRequest.findMany({
    where: {
      expiresAt: { lte: new Date() },
      OR: [
        { customerImagePublicId: { not: null } },
        { resultImagePublicId: { not: null } }
      ]
    },
    select: { id: true, customerImagePublicId: true, resultImagePublicId: true },
    take: 100
  });

  for (const request of expired) {
    if (request.customerImagePublicId) await deleteTryOnAsset(request.customerImagePublicId);
    if (request.resultImagePublicId) await deleteTryOnAsset(request.resultImagePublicId);
    await prisma.framePreviewRequest.update({
      where: { id: request.id },
      data: {
        customerImageUrl: null,
        customerImagePublicId: null,
        resultImageUrl: null,
        resultImagePublicId: null,
        resultBytes: null
      }
    });
  }

  console.log(`Purged ${expired.length} expired customer preview image${expired.length === 1 ? "" : "s"}.`);
}

main()
  .catch((error) => {
    console.error("Preview image retention worker failed", error);
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
