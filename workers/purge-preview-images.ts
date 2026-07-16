import { prisma } from "@/lib/db";
import { deleteTryOnAsset } from "@/lib/integrations/gemini-try-on";

const BATCH_SIZE = 100;

type ExpiredPreview = {
  id: string;
  customerImagePublicId: string | null;
  resultImagePublicId: string | null;
};

function safeErrorMessage(error: unknown) {
  if (error instanceof Error && /credentials are not configured/i.test(error.message)) {
    return "Cloudinary credentials are not configured for retention deletion.";
  }
  // Provider errors can contain private asset identifiers or request details.
  // Keep the durable audit log useful without copying those values into the DB.
  return "Preview asset deletion could not be confirmed; inspect the worker failure event and provider configuration.";
}

async function recordPurgeFailure(preview: ExpiredPreview, failedAssets: string[], error: unknown) {
  const message = safeErrorMessage(error);
  console.error(JSON.stringify({
    level: "error",
    event: "preview_retention_purge_failed",
    previewId: preview.id,
    failedAssets,
    message
  }));

  // Keep an in-app audit trail as well as Railway logs. Do not store Cloudinary
  // public IDs or image URLs in the log metadata.
  try {
    await prisma.activityLog.create({
      data: {
        action: "AI_PREVIEW_RETENTION_PURGE_FAILED",
        entityType: "frame_preview_request",
        entityId: preview.id,
        metadata: { failedAssets, message }
      }
    });
  } catch (auditError) {
    console.error(JSON.stringify({
      level: "error",
      event: "preview_retention_purge_audit_failed",
      previewId: preview.id,
      message: safeErrorMessage(auditError)
    }));
  }
}

async function purgePreview(preview: ExpiredPreview) {
  const failures: Array<{ asset: string; error: unknown }> = [];

  // Attempt both assets so a transient failure on one does not keep the other
  // customer's image beyond its retention window. The row is only cleared when
  // every required deletion was confirmed; retries are idempotent.
  for (const [asset, publicId] of [
    ["customer", preview.customerImagePublicId],
    ["result", preview.resultImagePublicId]
  ] as const) {
    if (!publicId) continue;
    try {
      await deleteTryOnAsset(publicId);
    } catch (error) {
      failures.push({ asset, error });
    }
  }

  if (failures.length) {
    await recordPurgeFailure(preview, failures.map(({ asset }) => asset), failures[0]?.error);
    return false;
  }

  await prisma.framePreviewRequest.update({
    where: { id: preview.id },
    data: {
      customerImageUrl: null,
      customerImagePublicId: null,
      customerImageHash: null,
      resultImageUrl: null,
      resultImagePublicId: null,
      resultBytes: null
    }
  });
  return true;
}

async function main() {
  const now = new Date();
  const expiredWhere = {
    expiresAt: { lte: now },
    OR: [
      { customerImagePublicId: { not: null } },
      { resultImagePublicId: { not: null } },
      // Legacy rows may have a stored signed URL without a public ID. Clear
      // those references at expiry even though the provider asset cannot be
      // retried by this worker.
      { customerImageUrl: { not: null } },
      { resultImageUrl: { not: null } }
    ]
  };

  const expired = await prisma.framePreviewRequest.findMany({
    where: expiredWhere,
    select: { id: true, customerImagePublicId: true, resultImagePublicId: true },
    orderBy: { expiresAt: "asc" },
    take: BATCH_SIZE
  });

  let purged = 0;
  let failed = 0;
  for (const preview of expired) {
    if (await purgePreview(preview)) purged += 1;
    else failed += 1;
  }

  const backlogRemaining = await prisma.framePreviewRequest.count({ where: expiredWhere });
  console.info(JSON.stringify({
    level: failed ? "error" : "info",
    event: "preview_retention_purge_completed",
    selected: expired.length,
    purged,
    failed,
    backlogRemaining,
    batchSize: BATCH_SIZE
  }));

  if (failed) {
    process.exitCode = 1;
  }
}

main()
  .catch((error) => {
    console.error(JSON.stringify({
      level: "error",
      event: "preview_retention_worker_failed",
      message: safeErrorMessage(error)
    }));
    process.exitCode = 1;
  })
  .finally(async () => prisma.$disconnect());
