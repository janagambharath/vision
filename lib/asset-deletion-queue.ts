import { prisma } from "@/lib/db";

export type PrivateAssetKind = "AI_TRY_ON" | "PRESCRIPTION";

function safeFailureMessage(error: unknown) {
  if (error instanceof Error && /credentials are not configured/i.test(error.message)) {
    return "Storage credentials are not configured for private-asset deletion.";
  }
  return "Private asset deletion could not be confirmed.";
}

/**
 * Durably records a private asset that could not be removed synchronously.
 * Public IDs are required for provider cleanup but are never sent to browsers
 * or written to customer-visible records.
 */
export async function enqueuePrivateAssetDeletion(input: {
  publicId: string;
  resourceType: "image" | "raw";
  kind: PrivateAssetKind;
  error?: unknown;
}) {
  if (!input.publicId) return;
  const now = new Date();
  await prisma.assetDeletionTask.upsert({
    where: {
      publicId_resourceType: {
        publicId: input.publicId,
        resourceType: input.resourceType
      }
    },
    create: {
      publicId: input.publicId,
      resourceType: input.resourceType,
      kind: input.kind,
      nextAttemptAt: now,
      lastError: input.error ? safeFailureMessage(input.error) : null
    },
    update: {
      kind: input.kind,
      completedAt: null,
      nextAttemptAt: now,
      lastError: input.error ? safeFailureMessage(input.error) : null
    }
  });
}

export function privateAssetDeletionFailureMessage(error: unknown) {
  return safeFailureMessage(error);
}
