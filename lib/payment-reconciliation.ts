import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  InventoryReservationConflictError,
  releaseOrderInventoryReservations
} from "@/lib/inventory-reservations";
import { refundRazorpayPayment } from "@/lib/integrations/razorpay";
import { sendEmail } from "@/lib/integrations/resend";
import { sendWhatsAppTemplate } from "@/lib/integrations/whatsapp";

const EXPIRABLE_ORDER_STATUSES = ["PENDING", "AWAITING_PRESCRIPTION"] as const;
const REFUND_STALL_MINUTES = 30;

function isSerializationFailure(error: unknown) {
  return typeof error === "object" && error !== null && (error as { code?: string }).code === "P2034";
}

async function expireOneCheckout(orderId: string, now: Date) {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    try {
      let expired = false;
      await prisma.$transaction(async (tx) => {
        const order = await tx.order.findUnique({
          where: { id: orderId },
          select: { id: true, publicId: true, status: true, payments: { select: { status: true } } }
        });
        if (!order || !EXPIRABLE_ORDER_STATUSES.includes(order.status as (typeof EXPIRABLE_ORDER_STATUSES)[number])) return;
        if (order.payments.some((payment) => payment.status === "PAID")) return;

        const expiredReservation = await tx.inventoryReservation.findFirst({
          where: { orderId, status: "ACTIVE", expiresAt: { lte: now } },
          select: { id: true }
        });
        if (!expiredReservation) return;

        await releaseOrderInventoryReservations(tx, orderId, "EXPIRED");
        const cancelled = await tx.order.updateMany({
          where: { id: orderId, status: { in: [...EXPIRABLE_ORDER_STATUSES] } },
          data: { status: "CANCELLED" }
        });
        if (cancelled.count !== 1) return;

        await tx.activityLog.create({
          data: {
            action: "CHECKOUT_STOCK_RESERVATION_EXPIRED",
            entityType: "order",
            entityId: orderId,
            metadata: { publicId: order.publicId }
          }
        });
        await tx.notification.create({
          data: {
            orderId,
            channel: "SYSTEM",
            status: "PENDING",
            recipient: "admin",
            subject: "Checkout stock reservation expired",
            body: `Order ${order.publicId} was cancelled after its unpaid stock reservation expired.`,
            entityType: "Order",
            entityId: orderId
          }
        });
        expired = true;
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
      return expired;
    } catch (error) {
      if (!(error instanceof InventoryReservationConflictError || isSerializationFailure(error)) || attempt === 2) {
        throw error;
      }
    }
  }
  return false;
}

/** Cancel unpaid checkouts and release the stock they were holding. */
export async function expireCheckoutReservations(limit = 100) {
  const candidates = await prisma.inventoryReservation.findMany({
    where: {
      status: "ACTIVE",
      expiresAt: { lte: new Date() },
      order: { status: { in: [...EXPIRABLE_ORDER_STATUSES] } }
    },
    select: { orderId: true },
    distinct: ["orderId"],
    take: limit
  });

  let expired = 0;
  for (const candidate of candidates) {
    if (await expireOneCheckout(candidate.orderId, new Date())) expired += 1;
  }
  return expired;
}

type RefundClaim = {
  reconciliationId: string;
  refundAttemptId: string;
  paymentId: string;
  orderId: string;
  providerPaymentId: string;
  amountPaise: number;
  customerName: string;
  customerEmail: string | null;
  customerPhone: string;
  publicId: string;
};

async function claimRefund(reconciliationId: string): Promise<RefundClaim | null> {
  return prisma.$transaction(async (tx) => {
    const reconciliation = await tx.paymentReconciliation.findUnique({
      where: { id: reconciliationId },
      include: { payment: true, order: true, refund: true }
    });
    if (!reconciliation || reconciliation.status !== "PENDING_REFUND" || reconciliation.refund) return null;
    if (!reconciliation.payment.providerPaymentId || reconciliation.payment.status !== "PAID") {
      await tx.paymentReconciliation.update({
        where: { id: reconciliation.id },
        data: {
          status: "REQUIRES_REVIEW",
          lastError: "A captured Razorpay payment identifier is unavailable for the guarded refund."
        }
      });
      return null;
    }

    const claimed = await tx.paymentReconciliation.updateMany({
      where: { id: reconciliation.id, status: "PENDING_REFUND" },
      data: { status: "REFUNDING", attempts: { increment: 1 }, lastError: null }
    });
    if (claimed.count !== 1) return null;

    // This durable marker is written before the provider call. If a process
    // dies after a provider success, we require provider verification rather
    // than risking a duplicate refund.
    const refund = await tx.refund.create({
      data: {
        orderId: reconciliation.orderId,
        paymentId: reconciliation.paymentId,
        amountPaise: reconciliation.payment.amountPaise,
        reason: reconciliation.reason,
        reconciliationId: reconciliation.id,
        status: "initiated"
      }
    });

    return {
      reconciliationId: reconciliation.id,
      refundAttemptId: refund.id,
      paymentId: reconciliation.paymentId,
      orderId: reconciliation.orderId,
      providerPaymentId: reconciliation.payment.providerPaymentId,
      amountPaise: reconciliation.payment.amountPaise,
      customerName: reconciliation.order.customerName,
      customerEmail: reconciliation.order.email,
      customerPhone: reconciliation.order.phone,
      publicId: reconciliation.order.publicId
    };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

async function flagRefundForReview(reconciliationId: string, error: unknown) {
  const message = (error instanceof Error ? error.message : "Unknown Razorpay refund failure.").slice(0, 1000);
  await prisma.$transaction(async (tx) => {
    await tx.refund.updateMany({
      where: { reconciliationId, status: { in: ["initiated", "pending"] } },
      data: { status: "failed" }
    });
    await tx.paymentReconciliation.updateMany({
      where: { id: reconciliationId, status: "REFUNDING" },
      data: { status: "REQUIRES_REVIEW", lastError: message }
    });
    await tx.notification.create({
      data: {
        channel: "SYSTEM",
        status: "PENDING",
        recipient: "admin",
        subject: "Payment refund requires owner review",
        body: "The guarded Razorpay refund did not return a durable success. Verify the provider before attempting another refund.",
        entityType: "PaymentReconciliation",
        entityId: reconciliationId,
        metadata: { error: message }
      }
    });
  });
}

async function completeRefund(claim: RefundClaim, providerRefundId: string) {
  return prisma.$transaction(async (tx) => {
    const refund = await tx.refund.findUnique({ where: { reconciliationId: claim.reconciliationId } });
    if (refund?.status === "processed" && refund.providerRefundId === providerRefundId) {
      return "already_completed" as const;
    }
    if (!refund || !["initiated", "pending"].includes(refund.status)) {
      throw new Error("The local refund attempt is no longer eligible for completion.");
    }

    await tx.refund.update({
      where: { id: refund.id },
      data: { providerRefundId, status: "processed" }
    });
    await tx.payment.update({ where: { id: claim.paymentId }, data: { status: "REFUNDED" } });
    await tx.order.update({ where: { id: claim.orderId }, data: { status: "REFUNDED" } });
    await tx.paymentReconciliation.update({
      where: { id: claim.reconciliationId },
      data: { status: "REFUNDED", lastError: null }
    });
    await tx.activityLog.create({
      data: {
        action: "PAYMENT_RECONCILIATION_REFUND_ISSUED",
        entityType: "order",
        entityId: claim.orderId,
        metadata: { paymentId: claim.paymentId, providerRefundId, amountPaise: claim.amountPaise }
      }
    });
    await tx.notification.create({
      data: {
        orderId: claim.orderId,
        channel: "SYSTEM",
        status: "PENDING",
        recipient: "admin",
        subject: "Captured payment refunded automatically",
        body: `The guarded reconciliation refund for ${claim.publicId} completed successfully.`,
        entityType: "PaymentReconciliation",
        entityId: claim.reconciliationId,
        metadata: { providerRefundId, amountPaise: claim.amountPaise }
      }
    });
    return "completed" as const;
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

function providerRefundStatus(refund: unknown) {
  const status = refund && typeof refund === "object" ? (refund as { status?: unknown }).status : null;
  return status === "processed" || status === "pending" || status === "failed" ? status : null;
}

async function recordPendingRefund(claim: RefundClaim, providerRefundId: string) {
  await prisma.$transaction(async (tx) => {
    await tx.refund.updateMany({
      where: {
        reconciliationId: claim.reconciliationId,
        status: { in: ["initiated", "pending"] }
      },
      data: { providerRefundId, status: "pending" }
    });
    const transitioned = await tx.paymentReconciliation.updateMany({
      where: { id: claim.reconciliationId, status: "REFUNDING" },
      data: { status: "REFUND_PENDING", lastError: null }
    });
    if (transitioned.count) {
      await tx.activityLog.create({
        data: {
          action: "PAYMENT_RECONCILIATION_REFUND_PENDING",
          entityType: "order",
          entityId: claim.orderId,
          metadata: { paymentId: claim.paymentId, providerRefundId, amountPaise: claim.amountPaise }
        }
      });
    }
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
}

async function notifyCustomerOfRefund(claim: RefundClaim) {
  const tasks: Array<Promise<unknown>> = [
    sendWhatsAppTemplate(claim.customerPhone, "refund_processed", [
      claim.customerName,
      claim.publicId,
      (claim.amountPaise / 100).toFixed(2)
    ])
  ];
  if (claim.customerEmail) {
    tasks.push(sendEmail(
      claim.customerEmail,
      `Refund processed: ${claim.publicId} | Vision Vistara`,
      `<p>We could not safely fulfill your order, so we have processed a refund of ₹${(claim.amountPaise / 100).toFixed(2)}.</p>`
    ));
  }
  const outcomes = await Promise.allSettled(tasks);
  if (outcomes.some((outcome) => outcome.status === "rejected")) {
    await prisma.notification.create({
      data: {
        orderId: claim.orderId,
        channel: "SYSTEM",
        status: "PENDING",
        recipient: "admin",
        subject: "Automatic refund customer notification failed",
        body: `At least one customer notification failed after refunding ${claim.publicId}.`,
        entityType: "PaymentReconciliation",
        entityId: claim.reconciliationId
      }
    });
  }
}

/**
 * Refund each unsafe captured payment once. Ambiguous provider outcomes are
 * intentionally stopped for owner review instead of being retried blindly.
 */
export async function reconcileCapturedPayments(limit = 50) {
  const staleCutoff = new Date(Date.now() - REFUND_STALL_MINUTES * 60_000);
  const stale = await prisma.paymentReconciliation.findMany({
    where: { status: "REFUNDING", updatedAt: { lte: staleCutoff } },
    select: { id: true },
    take: limit
  });
  if (stale.length) {
    await prisma.paymentReconciliation.updateMany({
      where: { id: { in: stale.map((entry) => entry.id) }, status: "REFUNDING" },
      data: {
        status: "REQUIRES_REVIEW",
        lastError: "Refund attempt became stale. Verify Razorpay before issuing another refund."
      }
    });
  }

  const candidates = await prisma.paymentReconciliation.findMany({
    where: { status: "PENDING_REFUND" },
    orderBy: { createdAt: "asc" },
    select: { id: true },
    take: limit
  });

  let refunded = 0;
  let pending = 0;
  let requiresReview = stale.length;
  for (const candidate of candidates) {
    const claim = await claimRefund(candidate.id);
    if (!claim) continue;

    try {
      const providerRefund = await refundRazorpayPayment(
        claim.providerPaymentId,
        claim.amountPaise,
        `vv-refund-${claim.refundAttemptId}`
      );
      if (!providerRefund.id) throw new Error("Razorpay did not return a refund identifier.");
      const status = providerRefundStatus(providerRefund);
      if (status === "processed") {
        await completeRefund(claim, providerRefund.id);
        refunded += 1;
        await notifyCustomerOfRefund(claim);
      } else if (status === "pending") {
        await recordPendingRefund(claim, providerRefund.id);
        pending += 1;
      } else {
        throw new Error(`Razorpay returned an unresolved refund status: ${String(status ?? "missing")}.`);
      }
    } catch (error) {
      requiresReview += 1;
      await flagRefundForReview(claim.reconciliationId, error);
    }
  }

  return { expiredStaleRefundAttempts: stale.length, refunded, pending, requiresReview };
}
