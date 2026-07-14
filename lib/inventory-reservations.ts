import type { Prisma } from "@prisma/client";

const ONLINE_PAYMENT_METHODS = new Set(["RAZORPAY", "UPI", "CARD", "NETBANKING"]);
const ONLINE_RESERVATION_MINUTES = 30;
const OFFLINE_RESERVATION_HOURS = 48;

type Transaction = Prisma.TransactionClient;

export type ProductQuantity = {
  productId: string;
  quantity: number;
};

export class InventoryUnavailableError extends Error {
  constructor(message = "One or more products are no longer available.") {
    super(message);
    this.name = "InventoryUnavailableError";
  }
}

// A conflict is retried at the transaction boundary; it is never shown as an
// inaccurate out-of-stock message just because another checkout completed.
export class InventoryReservationConflictError extends Error {
  constructor() {
    super("Inventory changed while this checkout was being allocated.");
    this.name = "InventoryReservationConflictError";
  }
}

export function isOnlinePaymentMethod(paymentMethod: string) {
  return ONLINE_PAYMENT_METHODS.has(paymentMethod);
}

export function getCheckoutReservationExpiry(paymentMethod: string, now = new Date()) {
  const durationMs = isOnlinePaymentMethod(paymentMethod)
    ? ONLINE_RESERVATION_MINUTES * 60 * 1000
    : OFFLINE_RESERVATION_HOURS * 60 * 60 * 1000;
  return new Date(now.getTime() + durationMs);
}

export function aggregateProductQuantities(items: Array<{ productId: string | null; quantity: number }>): ProductQuantity[] {
  const quantities = new Map<string, number>();

  for (const item of items) {
    if (!item.productId || !Number.isSafeInteger(item.quantity) || item.quantity <= 0) {
      throw new InventoryUnavailableError("The cart contains an invalid product quantity.");
    }
    quantities.set(item.productId, (quantities.get(item.productId) ?? 0) + item.quantity);
  }

  return [...quantities.entries()]
    .map(([productId, quantity]) => ({ productId, quantity }))
    .sort((left, right) => left.productId.localeCompare(right.productId));
}

/** Allocate inventory atomically inside the order-creation transaction. */
export async function reserveOrderInventory(
  tx: Transaction,
  orderId: string,
  items: Array<{ productId: string | null; quantity: number }>,
  expiresAt: Date
) {
  const allocations = aggregateProductQuantities(items);
  const inventories = await Promise.all(
    allocations.map(async ({ productId }) => ({
      productId,
      inventory: await tx.inventory.findUnique({
        where: { productId },
        select: { id: true, quantity: true, reservedStock: true }
      })
    }))
  );

  for (const allocation of allocations) {
    const inventory = inventories.find((entry) => entry.productId === allocation.productId)?.inventory;
    if (!inventory || inventory.quantity - inventory.reservedStock < allocation.quantity) {
      throw new InventoryUnavailableError();
    }
  }

  // Conditional updates turn stale reads into retryable conflicts. PostgreSQL
  // Serializable isolation then protects the full allocation across products.
  for (const allocation of allocations) {
    const inventory = inventories.find((entry) => entry.productId === allocation.productId)?.inventory;
    if (!inventory) throw new InventoryUnavailableError();
    const updated = await tx.inventory.updateMany({
      where: {
        id: inventory.id,
        quantity: inventory.quantity,
        reservedStock: inventory.reservedStock
      },
      data: { reservedStock: { increment: allocation.quantity } }
    });
    if (updated.count !== 1) throw new InventoryReservationConflictError();
  }

  await tx.inventoryReservation.createMany({
    data: allocations.map((allocation) => ({
      orderId,
      productId: allocation.productId,
      quantity: allocation.quantity,
      expiresAt
    }))
  });
}

export type ReservationConsumption = "CONSUMED" | "ALREADY_CONSUMED" | "MISSING" | "UNAVAILABLE";

/**
 * Decrement physical stock and the corresponding allocation together. A
 * caller must run this inside a transaction and retry conflict errors.
 */
export async function consumeOrderInventoryReservations(
  tx: Transaction,
  orderId: string
): Promise<ReservationConsumption> {
  const reservations = await tx.inventoryReservation.findMany({
    where: { orderId },
    select: { id: true, productId: true, quantity: true, status: true, expiresAt: true }
  });
  if (reservations.length === 0) return "MISSING";

  const active = reservations
    .filter((reservation) => reservation.status === "ACTIVE")
    .sort((left, right) => left.productId.localeCompare(right.productId));
  if (active.length === 0) {
    return reservations.every((reservation) => reservation.status === "CONSUMED")
      ? "ALREADY_CONSUMED"
      : "UNAVAILABLE";
  }
  if (active.some((reservation) => reservation.expiresAt <= new Date())) {
    return "UNAVAILABLE";
  }

  const inventories = await Promise.all(
    active.map(async (reservation) => ({
      reservation,
      inventory: await tx.inventory.findUnique({
        where: { productId: reservation.productId },
        select: { id: true, quantity: true, reservedStock: true }
      })
    }))
  );

  if (inventories.some(({ reservation, inventory }) => !inventory || inventory.quantity < reservation.quantity || inventory.reservedStock < reservation.quantity)) {
    return "UNAVAILABLE";
  }

  for (const { reservation, inventory } of inventories) {
    if (!inventory) return "UNAVAILABLE";
    const updated = await tx.inventory.updateMany({
      where: {
        id: inventory.id,
        quantity: inventory.quantity,
        reservedStock: inventory.reservedStock
      },
      data: {
        quantity: { decrement: reservation.quantity },
        reservedStock: { decrement: reservation.quantity }
      }
    });
    if (updated.count !== 1) throw new InventoryReservationConflictError();
  }

  const consumed = await tx.inventoryReservation.updateMany({
    where: { id: { in: active.map((reservation) => reservation.id) }, status: "ACTIVE" },
    data: { status: "CONSUMED" }
  });
  if (consumed.count !== active.length) throw new InventoryReservationConflictError();
  return "CONSUMED";
}

/** Release a pending allocation without changing physical stock. */
export async function releaseOrderInventoryReservations(
  tx: Transaction,
  orderId: string,
  status: "RELEASED" | "EXPIRED" = "RELEASED"
) {
  const active = await tx.inventoryReservation.findMany({
    where: { orderId, status: "ACTIVE" },
    select: { id: true, productId: true, quantity: true }
  });

  for (const reservation of active.sort((left, right) => left.productId.localeCompare(right.productId))) {
    const inventory = await tx.inventory.findUnique({
      where: { productId: reservation.productId },
      select: { id: true, reservedStock: true }
    });
    if (!inventory || inventory.reservedStock < reservation.quantity) {
      throw new InventoryReservationConflictError();
    }
    const updated = await tx.inventory.updateMany({
      where: { id: inventory.id, reservedStock: inventory.reservedStock },
      data: { reservedStock: { decrement: reservation.quantity } }
    });
    if (updated.count !== 1) throw new InventoryReservationConflictError();
  }

  if (active.length) {
    const released = await tx.inventoryReservation.updateMany({
      where: { id: { in: active.map((reservation) => reservation.id) }, status: "ACTIVE" },
      data: { status }
    });
    if (released.count !== active.length) throw new InventoryReservationConflictError();
  }

  return active.length;
}

// A captured payment may reveal an already-corrupt allocation (for example,
// stock was manually edited below the held amount). Close the allocation
// without ever driving reservedStock negative; the reconciliation record makes
// the residual data issue visible to operations.
export async function releaseOrderInventoryReservationsForReconciliation(tx: Transaction, orderId: string) {
  const active = await tx.inventoryReservation.findMany({
    where: { orderId, status: "ACTIVE" },
    select: { id: true, productId: true, quantity: true }
  });

  for (const reservation of active.sort((left, right) => left.productId.localeCompare(right.productId))) {
    await tx.inventory.updateMany({
      where: { productId: reservation.productId, reservedStock: { gte: reservation.quantity } },
      data: { reservedStock: { decrement: reservation.quantity } }
    });
  }

  if (active.length) {
    await tx.inventoryReservation.updateMany({
      where: { id: { in: active.map((reservation) => reservation.id) }, status: "ACTIVE" },
      data: { status: "RELEASED" }
    });
  }
}
