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

const FULFILLMENT_PROGRESS_STATUSES = new Set<OrderStatus>([
  "CONFIRMED",
  "PACKED",
  "SHIPPED",
  "OUT_FOR_DELIVERY",
  "DELIVERED"
]);

/**
 * The customer order lifecycle is deliberately linear. Shiprocket may move a
 * confirmed/packed order to SHIPPED internally after it creates a shipment,
 * but staff-driven status changes must follow these safe transitions.
 *
 * `TRY_AT_HOME_BOOKED` remains here only for legacy Order records. New home
 * trial requests use their own workflow and do not call this function.
 */
const ALLOWED_STATUS_TRANSITIONS: Record<OrderStatus, readonly OrderStatus[]> = {
  PENDING: ["PENDING", "CONFIRMED", "LENS_IN_PROCESSING", "CANCELLED"],
  AWAITING_PRESCRIPTION: ["AWAITING_PRESCRIPTION", "LENS_IN_PROCESSING", "CANCELLED"],
  LENS_IN_PROCESSING: ["LENS_IN_PROCESSING", "PACKED", "CANCELLED"],
  CONFIRMED: ["CONFIRMED", "PACKED", "CANCELLED"],
  PACKED: ["PACKED", "SHIPPED", "CANCELLED"],
  SHIPPED: ["SHIPPED", "OUT_FOR_DELIVERY", "CANCELLED"],
  OUT_FOR_DELIVERY: ["OUT_FOR_DELIVERY", "DELIVERED", "CANCELLED"],
  DELIVERED: ["DELIVERED"],
  CANCELLED: ["CANCELLED"],
  REFUNDED: ["REFUNDED"],
  TRY_AT_HOME_BOOKED: ["TRY_AT_HOME_BOOKED", "CONFIRMED", "CANCELLED"]
};

export type OrderTransitionContext = {
  hasPrescription: boolean;
  allPrescriptionsVerified: boolean;
};

export function isOrderReadyForFulfillment(context: OrderTransitionContext) {
  return !context.hasPrescription || context.allPrescriptionsVerified;
}

/**
 * Pure helper shared by the server guard and the admin form. The server guard
 * remains authoritative; filtering the dropdown just prevents avoidable staff
 * mistakes and makes the available next action clear.
 */
export function getAllowedOrderStatusTransitions(
  currentStatus: OrderStatus,
  context: OrderTransitionContext
): readonly OrderStatus[] {
  const candidates = ALLOWED_STATUS_TRANSITIONS[currentStatus] ?? [currentStatus];

  return candidates.filter((nextStatus) => {
    // A prescription order cannot enter fulfillment or lens processing until
    // every linked prescription has been reviewed and verified.
    if (nextStatus === "LENS_IN_PROCESSING") {
      return context.hasPrescription && context.allPrescriptionsVerified;
    }
    if (FULFILLMENT_PROGRESS_STATUSES.has(nextStatus)) {
      return isOrderReadyForFulfillment(context);
    }

    return true;
  });
}

export function isOrderStatusTransitionAllowed(
  currentStatus: OrderStatus,
  nextStatus: OrderStatus,
  context: OrderTransitionContext
) {
  return getAllowedOrderStatusTransitions(currentStatus, context).includes(nextStatus);
}

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
          select: {
            id: true,
            status: true,
            paymentMethod: true,
            payments: { select: { status: true } },
            prescriptions: { select: { status: true } },
            items: { select: { lensOption: { select: { requiresPrescription: true } } } }
          }
        });
        if (!order) throw new Error("Order no longer exists.");

        // Saving staff notes without changing status is safe, including for
        // terminal historical orders. It must not re-run stock allocation.
        if (input.status === order.status) {
          return tx.order.update({
            where: { id: order.id },
            data: { notes: input.notes || undefined }
          });
        }

        const hasCapturedPayment = order.payments.some((payment) => payment.status === "PAID");
        if (input.status === "REFUNDED") {
          throw new OrderStatusTransitionError("Use the owner refund workflow to mark an order refunded.");
        }
        if (input.status === "CANCELLED" && hasCapturedPayment) {
          throw new OrderStatusTransitionError("A captured payment must be refunded through the owner refund workflow.");
        }

        const hasPrescription =
          order.prescriptions.length > 0 ||
          order.items.some((item) => item.lensOption?.requiresPrescription === true);
        const allPrescriptionsVerified =
          hasPrescription &&
          order.prescriptions.length > 0 &&
          order.prescriptions.every((prescription) => prescription.status === "VERIFIED");

        if (!isOrderStatusTransitionAllowed(order.status, input.status, {
          hasPrescription,
          allPrescriptionsVerified
        })) {
          const reason = hasPrescription && !allPrescriptionsVerified
            ? "Prescription review must be completed before this order can progress."
            : `Orders cannot move from ${order.status} to ${input.status}.`;
          throw new OrderStatusTransitionError(reason);
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
