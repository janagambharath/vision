import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  createShiprocketShipment,
  getShiprocketOrderReference,
  ShiprocketRequestError,
  type ShiprocketOrder
} from "@/lib/integrations/shiprocket";

const FULFILLMENT_READY_STATUSES = ["CONFIRMED", "PACKED"] as const;
const SHIPMENT_META_KEY = "_visionVistaraShipment";
const DEFAULT_STALE_CREATION_MINUTES = 15;
const MAX_AUTOMATED_SHIPMENT_ATTEMPTS = 3;

export type ShipmentAttemptSource = "MANUAL" | "WORKER";
export type ShipmentAttemptResult =
  | { kind: "CREATED"; shipmentId: string; orderStatusUpdated: boolean }
  | { kind: "FAILED"; reason: string }
  | { kind: "RECONCILIATION_REQUIRED"; reason: string }
  | { kind: "NOT_READY"; reason: string }
  | { kind: "ALREADY_CREATED"; shipmentId?: string }
  | { kind: "IN_PROGRESS" }
  | { kind: "RETRY_LIMIT_REACHED" };

type ShipmentMeta = {
  attemptCount: number;
  lastAttemptAt: string;
  lastAttemptSource: ShipmentAttemptSource;
  lastOutcome?: string;
  providerOrderReference?: string;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function shipmentMeta(rawPayload: Prisma.JsonValue | null | undefined): Partial<ShipmentMeta> {
  if (!isRecord(rawPayload) || !isRecord(rawPayload[SHIPMENT_META_KEY])) return {};
  const meta = rawPayload[SHIPMENT_META_KEY];
  return {
    attemptCount: typeof meta.attemptCount === "number" ? meta.attemptCount : undefined,
    lastAttemptAt: typeof meta.lastAttemptAt === "string" ? meta.lastAttemptAt : undefined,
    lastAttemptSource:
      meta.lastAttemptSource === "MANUAL" || meta.lastAttemptSource === "WORKER"
        ? meta.lastAttemptSource
        : undefined,
    lastOutcome: typeof meta.lastOutcome === "string" ? meta.lastOutcome : undefined,
    providerOrderReference:
      typeof meta.providerOrderReference === "string" ? meta.providerOrderReference : undefined
  };
}

/** Exported for worker reporting and regression tests. */
export function getShipmentAttemptCount(rawPayload: Prisma.JsonValue | null | undefined) {
  return shipmentMeta(rawPayload).attemptCount ?? 0;
}

export function isShipmentReadyForCreation(orderStatus: string) {
  return FULFILLMENT_READY_STATUSES.includes(orderStatus as (typeof FULFILLMENT_READY_STATUSES)[number]);
}

export function isRetryableShipmentStatus(status: string) {
  // An unknown POST outcome must be reconciled, never blindly resent.
  return status === "FAILED";
}

export function isStaleCreatingShipment(updatedAt: Date, now = new Date(), staleMinutes = DEFAULT_STALE_CREATION_MINUTES) {
  return updatedAt.getTime() <= now.getTime() - staleMinutes * 60_000;
}

function withShipmentMeta(
  rawPayload: Prisma.JsonValue | null | undefined,
  patch: Partial<ShipmentMeta> & { attemptCount?: number },
  providerPayload?: unknown
) {
  const base = isRecord(rawPayload) ? rawPayload : {};
  const current = shipmentMeta(rawPayload);
  const nextMeta: ShipmentMeta = {
    attemptCount: patch.attemptCount ?? current.attemptCount ?? 0,
    lastAttemptAt: patch.lastAttemptAt ?? current.lastAttemptAt ?? new Date().toISOString(),
    lastAttemptSource: patch.lastAttemptSource ?? current.lastAttemptSource ?? "MANUAL",
    ...(current.lastOutcome || patch.lastOutcome ? { lastOutcome: patch.lastOutcome ?? current.lastOutcome } : {}),
    ...(current.providerOrderReference || patch.providerOrderReference
      ? { providerOrderReference: patch.providerOrderReference ?? current.providerOrderReference }
      : {})
  };

  return {
    ...base,
    [SHIPMENT_META_KEY]: nextMeta,
    ...(providerPayload === undefined ? {} : { providerResponse: providerPayload })
  } as Prisma.InputJsonValue;
}

function safeErrorMessage(error: unknown) {
  const message = error instanceof Error ? error.message : "Shipment creation failed.";
  return message.slice(0, 500);
}

function shipmentFailureStatus(error: unknown) {
  if (
    error instanceof ShiprocketRequestError &&
    (error.kind === "UNKNOWN" || error.kind === "DUPLICATE_ORDER")
  ) {
    return "RECONCILIATION_REQUIRED";
  }
  return "FAILED";
}

async function writeShipmentActivity(
  action: string,
  orderId: string,
  metadata: Prisma.InputJsonObject
) {
  await prisma.activityLog.create({
    data: { action, entityType: "shipment", entityId: orderId, metadata }
  }).catch(() => undefined);
}

async function claimShipmentAttempt(orderId: string, source: ShipmentAttemptSource) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: {
        items: true,
        shippingAddress: true,
        paymentReconciliations: { where: { status: { not: "REFUNDED" } }, select: { id: true } }
      }
    });
    if (!order || !isShipmentReadyForCreation(order.status)) {
      return { kind: "NOT_READY", reason: "Only confirmed or packed orders can be sent to Shiprocket." } as const;
    }
    if (order.paymentReconciliations.length) {
      return { kind: "NOT_READY", reason: "A captured payment reconciliation must finish before shipment creation." } as const;
    }

    const existing = await tx.shipment.findUnique({ where: { orderId } });
    if (!existing) {
      try {
        await tx.shipment.create({
          data: {
            orderId,
            provider: "shiprocket",
            status: "CREATING",
            rawPayload: withShipmentMeta(null, {
              attemptCount: 1,
              lastAttemptAt: new Date().toISOString(),
              lastAttemptSource: source,
              lastOutcome: "CREATING",
              providerOrderReference: getShiprocketOrderReference(order.publicId)
            })
          }
        });
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
          return { kind: "IN_PROGRESS" } as const;
        }
        throw error;
      }
      return { kind: "CLAIMED", order } as const;
    }

    if (existing.status === "CREATED") {
      return { kind: "ALREADY_CREATED", shipmentId: existing.providerShipmentId ?? undefined } as const;
    }
    if (existing.status === "CREATING") return { kind: "IN_PROGRESS" } as const;
    if (existing.status === "RECONCILIATION_REQUIRED") {
      return {
        kind: "RECONCILIATION_REQUIRED",
        reason: "This provider request has an unknown outcome. Verify it in Shiprocket before retrying."
      } as const;
    }
    if (!isRetryableShipmentStatus(existing.status)) {
      return { kind: "NOT_READY", reason: `Shipment is in ${existing.status} state.` } as const;
    }

    const nextAttempt = getShipmentAttemptCount(existing.rawPayload) + 1;
    if (source === "WORKER" && nextAttempt > MAX_AUTOMATED_SHIPMENT_ATTEMPTS) {
      return { kind: "RETRY_LIMIT_REACHED" } as const;
    }

    const claimed = await tx.shipment.updateMany({
      where: { id: existing.id, status: "FAILED" },
      data: {
        status: "CREATING",
        error: null,
        rawPayload: withShipmentMeta(existing.rawPayload, {
          attemptCount: nextAttempt,
          lastAttemptAt: new Date().toISOString(),
          lastAttemptSource: source,
          lastOutcome: "CREATING",
          providerOrderReference: getShiprocketOrderReference(order.publicId)
        })
      }
    });
    if (claimed.count !== 1) return { kind: "IN_PROGRESS" } as const;
    return { kind: "CLAIMED", order } as const;
  });
}

function toShiprocketOrder(order: {
  publicId: string;
  customerName: string;
  phone: string;
  email: string | null;
  shippingAddress: {
    name: string;
    phone: string;
    line1: string;
    line2: string | null;
    city: string;
    state: string | null;
    pincode: string;
  } | null;
  items: Array<{ unitPricePaise: number; quantity: number; productSnapshot: Prisma.JsonValue }>;
  grandTotalPaise: number;
  paymentMethod: string;
}): ShiprocketOrder {
  return {
    publicId: order.publicId,
    customerName: order.customerName,
    phone: order.phone,
    email: order.email,
    shippingAddress: order.shippingAddress,
    items: order.items,
    grandTotalPaise: order.grandTotalPaise,
    paymentMethod: order.paymentMethod
  };
}

/**
 * Claims one order's shipment ledger row before any provider call. The unique
 * orderId plus CREATING lease means concurrent admin clicks/workers cannot
 * create two provider requests.
 */
export async function attemptShiprocketShipment(orderId: string, source: ShipmentAttemptSource): Promise<ShipmentAttemptResult> {
  const claim = await claimShipmentAttempt(orderId, source);
  if (claim.kind !== "CLAIMED") return claim;

  // Re-read after claiming to avoid creating a shipment for an order cancelled
  // by another operations action between the original page render and POST.
  const currentOrder = await prisma.order.findUnique({
    where: { id: orderId },
    include: {
      items: true,
      shippingAddress: true,
      paymentReconciliations: { where: { status: { not: "REFUNDED" } }, select: { id: true } }
    }
  });
  if (!currentOrder || !isShipmentReadyForCreation(currentOrder.status) || currentOrder.paymentReconciliations.length) {
    const reason = currentOrder?.paymentReconciliations.length
      ? "A captured payment reconciliation is open for this order."
      : "Order is no longer eligible for shipment creation.";
    await prisma.shipment.updateMany({
      where: { orderId, status: "CREATING" },
      data: { status: "FAILED", error: reason }
    });
    return { kind: "NOT_READY", reason };
  }

  try {
    const response = await createShiprocketShipment(toShiprocketOrder(currentOrder));
    const finalized = await prisma.$transaction(async (tx) => {
      const existing = await tx.shipment.findUnique({ where: { orderId } });
      if (!existing || existing.status !== "CREATING") return false;

      const updated = await tx.shipment.updateMany({
        where: { id: existing.id, status: "CREATING" },
        data: {
          status: "CREATED",
          error: null,
          providerShipmentId: response.shipmentId,
          rawPayload: withShipmentMeta(existing.rawPayload, {
            lastOutcome: "CREATED"
          }, response.rawPayload)
        }
      });
      if (updated.count !== 1) return false;

      const orderUpdate = await tx.order.updateMany({
        where: { id: orderId, status: { in: [...FULFILLMENT_READY_STATUSES] } },
        data: { status: "SHIPPED" }
      });
      await tx.activityLog.create({
        data: {
          action: "SHIPMENT_CREATED",
          entityType: "shipment",
          entityId: orderId,
          metadata: {
            shipmentId: response.shipmentId,
            source,
            orderStatusUpdated: orderUpdate.count === 1
          }
        }
      });
      return orderUpdate.count === 1;
    });

    if (finalized === false) {
      return {
        kind: "RECONCILIATION_REQUIRED",
        reason: "Shiprocket accepted the request, but the local ledger changed before it could be finalized."
      };
    }
    return { kind: "CREATED", shipmentId: response.shipmentId, orderStatusUpdated: finalized };
  } catch (error) {
    const status = shipmentFailureStatus(error);
    const reason = safeErrorMessage(error);
    const existing = await prisma.shipment.findUnique({ where: { orderId } });
    const changed = await prisma.shipment.updateMany({
      where: { orderId, status: "CREATING" },
      data: {
        status,
        error: reason,
        rawPayload: withShipmentMeta(existing?.rawPayload, { lastOutcome: status })
      }
    });

    if (changed.count === 1) {
      await writeShipmentActivity(
        status === "FAILED" ? "SHIPMENT_CREATION_FAILED" : "SHIPMENT_RECONCILIATION_REQUIRED",
        orderId,
        { source, reason }
      );
    }
    return status === "FAILED"
      ? { kind: "FAILED", reason }
      : { kind: "RECONCILIATION_REQUIRED", reason };
  }
}

/** A stuck CREATING record is deliberately not resent; an operator must reconcile it. */
export async function flagStaleCreatingShipmentsForReconciliation(options?: { staleMinutes?: number; limit?: number }) {
  const staleMinutes = options?.staleMinutes ?? DEFAULT_STALE_CREATION_MINUTES;
  const cutoff = new Date(Date.now() - staleMinutes * 60_000);
  const candidates = await prisma.shipment.findMany({
    where: { provider: "shiprocket", status: "CREATING", updatedAt: { lte: cutoff } },
    select: { id: true, orderId: true, updatedAt: true },
    orderBy: { updatedAt: "asc" },
    take: options?.limit ?? 50
  });

  let reconciliationsCreated = 0;
  for (const shipment of candidates) {
    const changed = await prisma.shipment.updateMany({
      where: { id: shipment.id, status: "CREATING", updatedAt: { lte: shipment.updatedAt } },
      data: {
        status: "RECONCILIATION_REQUIRED",
        error: "Shipment request exceeded the confirmation window. Verify the provider dashboard before retrying."
      }
    });
    if (changed.count === 1) {
      reconciliationsCreated += 1;
      await writeShipmentActivity("SHIPMENT_RECONCILIATION_REQUIRED", shipment.orderId, {
        source: "WORKER",
        reason: "Shipment request exceeded the confirmation window."
      });
    }
  }
  return reconciliationsCreated;
}

export async function markShipmentForReconciliation(orderId: string, reason: string, source: ShipmentAttemptSource = "MANUAL") {
  const changed = await prisma.shipment.updateMany({
    where: { orderId, status: { in: ["CREATING", "FAILED"] } },
    data: { status: "RECONCILIATION_REQUIRED", error: reason.slice(0, 500) }
  });
  if (changed.count === 1) {
    await writeShipmentActivity("SHIPMENT_RECONCILIATION_REQUIRED", orderId, { source, reason: reason.slice(0, 500) });
  }
  return changed.count === 1;
}

/**
 * An operator may release an unknown provider attempt only after checking the
 * Shiprocket dashboard. The following retry still uses the same deterministic
 * provider order reference, so Shiprocket will reject (not duplicate) an
 * existing external order.
 */
export async function releaseShipmentReconciliationForRetry(orderId: string) {
  const shipment = await prisma.shipment.findUnique({ where: { orderId } });
  if (!shipment || shipment.status !== "RECONCILIATION_REQUIRED") return false;

  const changed = await prisma.shipment.updateMany({
    where: { id: shipment.id, status: "RECONCILIATION_REQUIRED" },
    data: {
      status: "FAILED",
      error: "Provider dashboard checked by manager; retry authorized.",
      rawPayload: withShipmentMeta(shipment.rawPayload, { lastOutcome: "RETRY_AUTHORIZED" })
    }
  });
  if (changed.count === 1) {
    await writeShipmentActivity("SHIPMENT_RETRY_AUTHORIZED", orderId, {
      source: "MANUAL",
      reason: "Provider dashboard checked by manager before retry."
    });
  }
  return changed.count === 1;
}

export async function retryFailedShipments(options?: { limit?: number }) {
  const failed = await prisma.shipment.findMany({
    where: {
      provider: "shiprocket",
      status: "FAILED",
      order: { status: { in: [...FULFILLMENT_READY_STATUSES] } }
    },
    select: { orderId: true },
    orderBy: { updatedAt: "asc" },
    take: options?.limit ?? 20
  });

  const outcomes: Record<string, number> = {};
  for (const shipment of failed) {
    const result = await attemptShiprocketShipment(shipment.orderId, "WORKER");
    outcomes[result.kind] = (outcomes[result.kind] ?? 0) + 1;
    if (result.kind === "RETRY_LIMIT_REACHED") {
      await markShipmentForReconciliation(
        shipment.orderId,
        "Automated shipment retry limit reached. Verify the provider dashboard before a manual retry.",
        "WORKER"
      );
    }
  }
  return outcomes;
}

export async function reconcileShipmentFromProvider(orderId: string, providerShipmentId: string) {
  const normalizedShipmentId = providerShipmentId.trim();
  if (!/^[A-Za-z0-9_-]{3,80}$/.test(normalizedShipmentId)) {
    return { ok: false as const, reason: "Enter a valid Shiprocket shipment ID." };
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const shipment = await tx.shipment.findUnique({ where: { orderId } });
      if (!shipment) return { ok: false as const, reason: "Shipment ledger entry was not found." };
      if (shipment.status === "CREATED") {
        return { ok: true as const, alreadyCreated: true, orderStatusUpdated: false };
      }

      const updated = await tx.shipment.updateMany({
        where: { id: shipment.id, status: { in: ["CREATING", "FAILED", "RECONCILIATION_REQUIRED"] } },
        data: {
          status: "CREATED",
          error: null,
          providerShipmentId: normalizedShipmentId,
          rawPayload: withShipmentMeta(shipment.rawPayload, { lastOutcome: "RECONCILED" })
        }
      });
      if (updated.count !== 1) return { ok: false as const, reason: "Shipment state changed; refresh and review it again." };

      const orderUpdate = await tx.order.updateMany({
        where: { id: orderId, status: { in: [...FULFILLMENT_READY_STATUSES] } },
        data: { status: "SHIPPED" }
      });
      await tx.activityLog.create({
        data: {
          action: "SHIPMENT_RECONCILED",
          entityType: "shipment",
          entityId: orderId,
          metadata: { shipmentId: normalizedShipmentId, orderStatusUpdated: orderUpdate.count === 1 }
        }
      });
      return { ok: true as const, alreadyCreated: false, orderStatusUpdated: orderUpdate.count === 1 };
    });
    return result;
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return { ok: false as const, reason: "That Shiprocket shipment ID is already linked to a different order." };
    }
    throw error;
  }
}
