import { Prisma, type OrderStatus } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  consumeOrderInventoryReservations,
  InventoryReservationConflictError,
  isOnlinePaymentMethod,
  releaseOrderInventoryReservations
} from "@/lib/inventory-reservations";

const STOCK_COMMITMENT_STATUSES = new Set<OrderStatus>([
  "CONFIRMED",
  "PACKED",
  "SHIPPED",
  "OUT_FOR_DELIVERY",
  "DELIVERED",
  "LENS_IN_PROCESSING"
]);
const STOCK_RELEASE_STATUSES = new Set<OrderStatus>(["CANCELLED", "REFUNDED"]);

export class OrderInventoryAllocationError extends Error {
  constructor(message = "This order no longer has a valid stock allocation.") {
    super(message);
    this.name = "OrderInventoryAllocationError";
  }
}

export class OrderStatusTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "OrderStatusTransitionError";
  }
}

function isSerializationFailure(error: unknown) {
  return typeof error === "object" && error !== null && (error as { code?: string }).code === "P2034";
}

/**
 * Advance an order while keeping its checkout stock allocation in sync. This
 * is the single path for operations status changes; payment webhooks consume
 * their allocation independently as part of payment capture.
 */
export async function updateOrderStatusWithInventory(input: {
  orderId: string;
  status: OrderStatus;
  notes?: string;
}) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      return await prisma.$transaction(async (tx) => {
        const order = await tx.order.findUnique({
          where: { id: input.orderId },
          select: { id: true, status: true, paymentMethod: true, payments: { select: { status: true } } }
        });
        if (!order) throw new Error("Order no longer exists.");

        const hasCapturedPayment = order.payments.some((payment) => payment.status === "PAID");
        if (input.status === "REFUNDED") {
          throw new OrderStatusTransitionError("Use the owner refund workflow to mark an order refunded.");
        }
        if (input.status === "CANCELLED" && hasCapturedPayment) {
          throw new OrderStatusTransitionError("A captured payment must be refunded through the owner refund workflow.");
        }

        if (STOCK_COMMITMENT_STATUSES.has(input.status)) {
          if (isOnlinePaymentMethod(order.paymentMethod) && !hasCapturedPayment) {
            throw new OrderInventoryAllocationError("Online payment has not been captured for this order.");
          }
          const consumption = await consumeOrderInventoryReservations(tx, order.id);
          if (consumption === "UNAVAILABLE") {
            throw new OrderInventoryAllocationError();
          }
        } else if (STOCK_RELEASE_STATUSES.has(input.status)) {
          await releaseOrderInventoryReservations(tx, order.id);
        }

        return tx.order.update({
          where: { id: order.id },
          data: { status: input.status, notes: input.notes || undefined }
        });
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (!(error instanceof InventoryReservationConflictError || isSerializationFailure(error)) || attempt === 2) {
        throw error;
      }
    }
  }

  throw new OrderInventoryAllocationError("Could not allocate inventory after concurrent checkout attempts.");
}
