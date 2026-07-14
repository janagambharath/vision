import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getOrderConfirmationTemplate, sendEmail } from "@/lib/integrations/resend";
import { sendWhatsAppTemplate } from "@/lib/integrations/whatsapp";
import {
  aggregateProductQuantities,
  consumeOrderInventoryReservations,
  InventoryReservationConflictError,
  releaseOrderInventoryReservationsForReconciliation
} from "@/lib/inventory-reservations";

type CapturedPaymentInput = {
  providerOrderId: string;
  providerPaymentId: string;
  amountPaise: number;
  payload: Prisma.InputJsonValue;
};

export class PaymentIntegrityError extends Error {}

export type PaymentCaptureResult = {
  matched: boolean;
  captured: boolean;
  reconciliationRequired?: boolean;
  paymentId?: string;
  orderId?: string;
  publicId?: string;
  awaitingPrescription?: boolean;
};

type OrderConfirmation = {
  id: string;
  publicId: string;
  customerName: string;
  phone: string;
  email: string | null;
  subtotalPaise: number;
  lensTotalPaise: number;
  shippingPaise: number;
  discountPaise: number;
  grandTotalPaise: number;
  items: Array<{
    quantity: number;
    unitPricePaise: number;
    productSnapshot: { brand?: string; name?: string; sku?: string };
    lensSnapshot: { name?: string } | null;
  }>;
};

function isSerializationFailure(error: unknown) {
  return typeof error === "object" && error !== null && (error as { code?: string }).code === "P2034";
}

// Orders created before stock reservations existed still need a safe path. We
// only consume stock that is not already held by a newer checkout.
async function consumeLegacyOrderInventory(
  tx: Prisma.TransactionClient,
  items: Array<{ productId: string | null; quantity: number }>
) {
  const allocations = aggregateProductQuantities(
    items.flatMap((item) => item.productId ? [{ productId: item.productId, quantity: item.quantity }] : [])
  );
  const inventories = await Promise.all(
    allocations.map(async (allocation) => ({
      allocation,
      inventory: await tx.inventory.findUnique({
        where: { productId: allocation.productId },
        select: { id: true, quantity: true, reservedStock: true }
      })
    }))
  );

  if (inventories.some(({ allocation, inventory }) => !inventory || inventory.quantity - inventory.reservedStock < allocation.quantity)) {
    return false;
  }

  for (const { allocation, inventory } of inventories) {
    if (!inventory) return false;
    const updated = await tx.inventory.updateMany({
      where: {
        id: inventory.id,
        quantity: inventory.quantity,
        reservedStock: inventory.reservedStock
      },
      data: { quantity: { decrement: allocation.quantity } }
    });
    if (updated.count !== 1) throw new InventoryReservationConflictError();
  }

  return true;
}

/** The signed Razorpay webhook is the only fulfillment authority. */
export async function captureRazorpayPayment(input: CapturedPaymentInput): Promise<PaymentCaptureResult> {
  let result: PaymentCaptureResult = { matched: false, captured: false };
  let confirmation: OrderConfirmation | null = null;
  let reconciliationCreated = false;
  let lastError: unknown;

  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      await prisma.$transaction(async (tx) => {
        const payment = await tx.payment.findFirst({
          where: { provider: "razorpay", providerOrderId: input.providerOrderId },
          include: {
            order: { include: { items: true, shippingAddress: true } },
            reconciliation: true
          }
        });

        if (!payment) return;
        result = { matched: true, captured: false, paymentId: payment.id, orderId: payment.orderId, publicId: payment.order.publicId };

        if (payment.amountPaise !== input.amountPaise) {
          throw new PaymentIntegrityError("Razorpay payment amount does not match the local order total.");
        }
        if (payment.providerPaymentId && payment.providerPaymentId !== input.providerPaymentId && payment.status !== "FAILED") {
          throw new PaymentIntegrityError("A different Razorpay payment is already attached to this local order.");
        }
        if (payment.status === "PAID") {
          result.reconciliationRequired = Boolean(payment.reconciliation && payment.reconciliation.status !== "REFUNDED");
          return;
        }
        if (payment.status === "REFUNDED") {
          throw new PaymentIntegrityError("A refunded payment cannot be captured again.");
        }

        const claimed = await tx.payment.updateMany({
          where: { id: payment.id, status: { notIn: ["PAID", "REFUNDED"] } },
          data: { status: "PAID", providerPaymentId: input.providerPaymentId, rawPayload: input.payload }
        });
        if (claimed.count === 0) return;

        let reconciliationReason: string | null = null;
        if (!["PENDING", "AWAITING_PRESCRIPTION"].includes(payment.order.status)) {
          reconciliationReason = `Payment was captured after the order moved to ${payment.order.status}.`;
        } else {
          const reservationOutcome = await consumeOrderInventoryReservations(tx, payment.orderId);
          if (reservationOutcome === "MISSING") {
            const legacyInventoryConsumed = await consumeLegacyOrderInventory(tx, payment.order.items);
            if (!legacyInventoryConsumed) {
              reconciliationReason = "No inventory reservation exists and available stock cannot safely fulfill this captured payment.";
            }
          } else if (reservationOutcome === "UNAVAILABLE") {
            reconciliationReason = "The inventory reservation is expired, released, or no longer matches available stock.";
          }
        }

        if (reconciliationReason) {
          await releaseOrderInventoryReservationsForReconciliation(tx, payment.orderId);
          const existingReconciliation = await tx.paymentReconciliation.findUnique({ where: { paymentId: payment.id } });
          if (!existingReconciliation) {
            await tx.paymentReconciliation.create({
              data: { paymentId: payment.id, orderId: payment.orderId, reason: reconciliationReason }
            });
            reconciliationCreated = true;
          }
          await tx.activityLog.create({
            data: {
              action: "PAYMENT_CAPTURED_RECONCILIATION_REQUIRED",
              entityType: "order",
              entityId: payment.orderId,
              metadata: {
                provider: "razorpay",
                providerPaymentId: input.providerPaymentId,
                providerOrderId: input.providerOrderId,
                reason: reconciliationReason
              }
            }
          });
          result = {
            matched: true,
            captured: false,
            reconciliationRequired: true,
            paymentId: payment.id,
            orderId: payment.orderId,
            publicId: payment.order.publicId
          };
          return;
        }

        const awaitingPrescription = payment.order.status === "AWAITING_PRESCRIPTION";
        await tx.order.update({
          where: { id: payment.orderId },
          data: { status: awaitingPrescription ? "AWAITING_PRESCRIPTION" : "CONFIRMED" }
        });
        await tx.activityLog.create({
          data: {
            action: "PAYMENT_CAPTURED_WEBHOOK",
            entityType: "order",
            entityId: payment.orderId,
            metadata: {
              provider: "razorpay",
              providerPaymentId: input.providerPaymentId,
              providerOrderId: input.providerOrderId,
              amountPaise: input.amountPaise
            }
          }
        });

        result = {
          matched: true,
          captured: true,
          paymentId: payment.id,
          orderId: payment.orderId,
          publicId: payment.order.publicId,
          awaitingPrescription
        };
        confirmation = {
          id: payment.orderId,
          publicId: payment.order.publicId,
          customerName: payment.order.customerName,
          phone: payment.order.phone,
          email: payment.order.email,
          subtotalPaise: payment.order.subtotalPaise,
          lensTotalPaise: payment.order.lensTotalPaise,
          shippingPaise: payment.order.shippingPaise,
          discountPaise: payment.order.discountPaise,
          grandTotalPaise: payment.order.grandTotalPaise,
          items: payment.order.items.map((item) => ({
            quantity: item.quantity,
            unitPricePaise: item.unitPricePaise,
            productSnapshot: item.productSnapshot as { brand?: string; name?: string; sku?: string },
            lensSnapshot: item.lensSnapshot as { name?: string } | null
          }))
        };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      lastError = undefined;
      break;
    } catch (error) {
      lastError = error;
      if (!(error instanceof InventoryReservationConflictError || isSerializationFailure(error)) || attempt === 2) {
        throw error;
      }
    }
  }

  if (lastError) throw lastError;

  if (reconciliationCreated && result.orderId && result.publicId) {
    try {
      await prisma.notification.create({
        data: {
          orderId: result.orderId,
          channel: "SYSTEM",
          status: "PENDING",
          recipient: "admin",
          subject: "Captured payment requires refund reconciliation",
          body: `Razorpay captured payment for ${result.publicId}, but the order cannot be fulfilled safely. The refund worker will attempt one guarded refund; an owner must review any exception.`,
          entityType: "Payment",
          entityId: result.paymentId
        }
      });
    } catch (error) {
      console.error("Could not create payment reconciliation notification", error);
    }
  }

  if (result.captured && result.orderId && result.publicId) {
    await prisma.notification.create({
      data: {
        orderId: result.orderId,
        channel: "SYSTEM",
        status: "PENDING",
        recipient: "fulfillment",
        subject: result.awaitingPrescription ? "Payment captured; prescription review required" : "Payment captured; fulfillment required",
        body: `Razorpay payment captured for ${result.publicId}. Create shipment only after the order is approved for fulfillment.`,
        entityType: "Payment",
        entityId: result.orderId
      }
    });
  }

  // Prisma's transaction callback is asynchronous, so TypeScript does not
  // propagate its assignment through control-flow analysis.
  const confirmedOrder = confirmation as OrderConfirmation | null;
  if (confirmedOrder) {
    const notificationTasks: Array<Promise<unknown>> = [];
    if (confirmedOrder.email) {
      notificationTasks.push(
        sendEmail(confirmedOrder.email, `Order received: ${confirmedOrder.publicId} | Vision Vistara`, getOrderConfirmationTemplate(confirmedOrder))
      );
    }
    notificationTasks.push(
      sendWhatsAppTemplate(confirmedOrder.phone, "order_confirmed", [
        confirmedOrder.customerName,
        confirmedOrder.publicId,
        (confirmedOrder.grandTotalPaise / 100).toFixed(2),
        `${process.env.NEXT_PUBLIC_SITE_URL || "https://visionvistara.online"}/frames/orders/${confirmedOrder.publicId}`
      ])
    );

    const settled = await Promise.allSettled(notificationTasks);
    const failures = settled.filter((entry) => entry.status === "rejected");
    if (failures.length) {
      await prisma.notification.create({
        data: {
          orderId: confirmedOrder.id,
          channel: "SYSTEM",
          status: "PENDING",
          recipient: "admin",
          subject: "Customer confirmation delivery failed",
          body: `${failures.length} order-confirmation channel(s) require manual follow-up for ${confirmedOrder.publicId}.`,
          entityType: "Order",
          entityId: confirmedOrder.id
        }
      });
    }
  }

  return result;
}
