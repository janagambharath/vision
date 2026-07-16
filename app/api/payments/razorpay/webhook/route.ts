import { createHash } from "node:crypto";
import type { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifyRazorpayWebhookSignature } from "@/lib/integrations/razorpay";
import { captureRazorpayPayment, PaymentIntegrityError } from "@/lib/payment-fulfillment";

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? value as JsonRecord : {};
}

function getPaymentEntity(payload: JsonRecord) {
  return asRecord(asRecord(asRecord(payload.payload).payment).entity);
}

function getRefundEntity(payload: JsonRecord) {
  return asRecord(asRecord(asRecord(payload.payload).refund).entity);
}

function asString(value: unknown) {
  return typeof value === "string" && value ? value : null;
}

function asPaise(value: unknown) {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0 ? value : null;
}

function eventIdFor(request: Request, rawBody: string) {
  return request.headers.get("x-razorpay-event-id") ?? createHash("sha256").update(rawBody).digest("hex");
}

async function recordUnmatchedEvent(eventId: string, eventType: string, detail: Record<string, unknown>) {
  await prisma.notification.create({
    data: {
      channel: "SYSTEM",
      status: "PENDING",
      recipient: "admin",
      subject: "Unmatched Razorpay webhook",
      body: `Received ${eventType} but no safe local payment match was found.`,
      entityType: "PaymentWebhookEvent",
      entityId: eventId,
      metadata: detail as Prisma.InputJsonValue
    }
  });
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  if (!verifyRazorpayWebhookSignature(rawBody, request.headers.get("x-razorpay-signature"))) {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
  }

  let payload: JsonRecord;
  try {
    payload = JSON.parse(rawBody) as JsonRecord;
  } catch {
    return NextResponse.json({ error: "Invalid webhook payload" }, { status: 400 });
  }

  const eventType = asString(payload.event) ?? "unknown";
  const providerEventId = eventIdFor(request, rawBody);
  let webhookEvent = await prisma.paymentWebhookEvent.findUnique({ where: { providerEventId } });
  if (webhookEvent?.processed) return NextResponse.json({ ok: true, duplicate: true });

  if (!webhookEvent) {
    try {
      webhookEvent = await prisma.paymentWebhookEvent.create({
        data: {
          providerEventId,
          eventType,
          payload: payload as Prisma.InputJsonValue
        }
      });
    } catch (error) {
      if ((error as { code?: string }).code === "P2002") {
        webhookEvent = await prisma.paymentWebhookEvent.findUniqueOrThrow({ where: { providerEventId } });
        if (webhookEvent.processed) return NextResponse.json({ ok: true, duplicate: true });
      } else {
        throw error;
      }
    }
  }

  const paymentEntity = getPaymentEntity(payload);
  const refundEntity = getRefundEntity(payload);
  const providerPaymentId = asString(paymentEntity.id) ?? asString(refundEntity.payment_id);
  const providerOrderId = asString(paymentEntity.order_id);
  const providerRefundId = asString(refundEntity.id);
  const refundAmountPaise = asPaise(refundEntity.amount);

  try {
    if (eventType === "payment.captured" || eventType === "order.paid") {
      const amountPaise = asPaise(paymentEntity.amount);
      if (!providerPaymentId || !providerOrderId || amountPaise === null) {
        await recordUnmatchedEvent(webhookEvent.id, eventType, { providerEventId, providerPaymentId, providerOrderId });
        await prisma.paymentWebhookEvent.update({ where: { id: webhookEvent.id }, data: { processed: true } });
        return NextResponse.json({ ok: true, matched: false });
      }

      const outcome = await captureRazorpayPayment({
        providerOrderId,
        providerPaymentId,
        amountPaise,
        payload: payload as Prisma.InputJsonValue
      });
      if (!outcome.matched) {
        await recordUnmatchedEvent(webhookEvent.id, eventType, { providerEventId, providerPaymentId, providerOrderId, amountPaise });
      }
      await prisma.paymentWebhookEvent.update({
        where: { id: webhookEvent.id },
        data: { processed: true, paymentId: outcome.paymentId, orderId: outcome.orderId }
      });
      return NextResponse.json({ ok: true, matched: outcome.matched, captured: outcome.captured });
    }

    const payment = await prisma.payment.findFirst({
      where: {
        provider: "razorpay",
        OR: [
          providerPaymentId ? { providerPaymentId } : undefined,
          providerOrderId ? { providerOrderId } : undefined
        ].filter(Boolean) as Array<{ providerPaymentId?: string; providerOrderId?: string }>
      }
    });
    if (!payment) {
      await recordUnmatchedEvent(webhookEvent.id, eventType, { providerEventId, providerPaymentId, providerOrderId });
      await prisma.paymentWebhookEvent.update({ where: { id: webhookEvent.id }, data: { processed: true } });
      return NextResponse.json({ ok: true, matched: false });
    }

    // One Razorpay order can have multiple payment attempts. Once a successful
    // attempt is recorded, a late failure/authorization for another attempt
    // must be quarantined rather than overwriting the audited payment ID.
    const paymentIdMismatch = Boolean(
      providerPaymentId &&
      payment.providerPaymentId &&
      providerPaymentId !== payment.providerPaymentId
    );
    if (paymentIdMismatch && ["PAID", "REFUNDED"].includes(payment.status)) {
      await recordUnmatchedEvent(webhookEvent.id, eventType, {
        providerEventId,
        providerPaymentId,
        providerOrderId,
        expectedProviderPaymentId: payment.providerPaymentId,
        reason: "late_event_for_different_payment_attempt"
      });
      await prisma.paymentWebhookEvent.update({ where: { id: webhookEvent.id }, data: { processed: true, paymentId: payment.id, orderId: payment.orderId } });
      return NextResponse.json({ ok: true, matched: false, quarantined: true });
    }

    const isRefundEvent = eventType.startsWith("refund.");
    const status = eventType === "payment.authorized"
      ? payment.status === "PAID" ? "PAID" : "AUTHORIZED"
      : eventType === "payment.failed"
        ? payment.status === "PAID" ? "PAID" : "FAILED"
        : payment.status;
    await prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status,
          providerPaymentId: providerPaymentId ?? payment.providerPaymentId,
          rawPayload: payload as Prisma.InputJsonValue
        }
      });

      if (isRefundEvent && providerRefundId && refundAmountPaise !== null) {
        const refundStatus = eventType === "refund.processed"
          ? "processed"
          : eventType === "refund.failed"
            ? "failed"
            : "pending";
        const existingRefund = await tx.refund.findFirst({
          where: {
            OR: [
              { providerRefundId },
              {
                paymentId: payment.id,
                providerRefundId: null,
                status: { in: ["initiated", "pending"] }
              }
            ]
          },
          orderBy: { createdAt: "desc" }
        });
        if (existingRefund) {
          await tx.refund.update({
            where: { id: existingRefund.id },
            data: { providerRefundId, status: refundStatus }
          });
        } else {
          await tx.refund.create({
            data: {
              orderId: payment.orderId,
              paymentId: payment.id,
              providerRefundId,
              amountPaise: refundAmountPaise,
              reason: "Razorpay webhook refund",
              status: refundStatus
            }
          });
        }

        if (eventType === "refund.processed") {
          const processedRefunds = await tx.refund.aggregate({
            where: { paymentId: payment.id, status: "processed" },
            _sum: { amountPaise: true }
          });
          if ((processedRefunds._sum.amountPaise ?? 0) >= payment.amountPaise) {
            await tx.payment.update({ where: { id: payment.id }, data: { status: "REFUNDED" } });
            await tx.order.update({ where: { id: payment.orderId }, data: { status: "REFUNDED" } });
            await tx.paymentReconciliation.updateMany({
              where: { paymentId: payment.id, status: { not: "REFUNDED" } },
              data: { status: "REFUNDED", lastError: null }
            });
          }
        } else if (eventType === "refund.created") {
          await tx.paymentReconciliation.updateMany({
            where: { paymentId: payment.id, status: "REFUNDING" },
            data: { status: "REFUND_PENDING", lastError: null }
          });
        } else if (eventType === "refund.failed") {
          await tx.paymentReconciliation.updateMany({
            where: { paymentId: payment.id, status: { in: ["REFUNDING", "REFUND_PENDING"] } },
            data: { status: "REQUIRES_REVIEW", lastError: "Razorpay reported that the refund failed." }
          });
        }
      }

      await tx.paymentWebhookEvent.update({
        where: { id: webhookEvent.id },
        data: { processed: true, paymentId: payment.id, orderId: payment.orderId }
      });
      await tx.activityLog.create({
        data: {
          action: "PAYMENT_WEBHOOK_PROCESSED",
          entityType: "Payment",
          entityId: payment.id,
          metadata: { eventType, providerEventId, providerPaymentId, providerOrderId, providerRefundId, refundAmountPaise }
        }
      });
    });
    return NextResponse.json({ ok: true, matched: true });
  } catch (error) {
    if (error instanceof PaymentIntegrityError) {
      await recordUnmatchedEvent(webhookEvent.id, eventType, { providerEventId, error: error.message, providerPaymentId, providerOrderId });
      await prisma.paymentWebhookEvent.update({ where: { id: webhookEvent.id }, data: { processed: true } });
      return NextResponse.json({ error: "Payment integrity validation failed" }, { status: 422 });
    }
    console.error("Razorpay webhook processing failed", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
