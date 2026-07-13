import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { verifyRazorpayWebhookSignature } from "@/lib/integrations/razorpay";
import { isRateLimited } from "@/lib/rate-limit";

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : {};
}

function getPaymentEntity(payload: JsonRecord) {
  return asRecord(asRecord(asRecord(payload.payload).payment).entity);
}

function getRefundEntity(payload: JsonRecord) {
  return asRecord(asRecord(asRecord(payload.payload).refund).entity);
}

function getString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function eventIdFor(request: Request, rawBody: string) {
  return request.headers.get("x-razorpay-event-id") ?? createHash("sha256").update(rawBody).digest("hex");
}

export async function POST(request: Request) {
  if (await isRateLimited(request, { keyPrefix: "razorpay-webhook", limit: 120, windowSeconds: 60 })) {
    return NextResponse.json({ error: "Too many webhook attempts" }, { status: 429 });
  }

  const rawBody = await request.text();
  const signature = request.headers.get("x-razorpay-signature");

  if (!verifyRazorpayWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 401 });
  }

  let payload: JsonRecord | null = null;
  try {
    payload = JSON.parse(rawBody || "null") as JsonRecord | null;
  } catch {
    return NextResponse.json({ error: "Invalid webhook payload" }, { status: 400 });
  }
  if (!payload) {
    return NextResponse.json({ error: "Invalid webhook payload" }, { status: 400 });
  }
  const eventType = getString(payload.event) ?? "unknown";
  const providerEventId = eventIdFor(request, rawBody);

  const existing = await prisma.paymentWebhookEvent.findUnique({ where: { providerEventId } });
  if (existing) return NextResponse.json({ ok: true, duplicate: true });

  const paymentEntity = getPaymentEntity(payload);
  const refundEntity = getRefundEntity(payload);
  const providerPaymentId = getString(paymentEntity.id) ?? getString(refundEntity.payment_id);
  const providerOrderId = getString(paymentEntity.order_id);

  let webhookEvent: { id: string };
  try {
    webhookEvent = await prisma.paymentWebhookEvent.create({
      data: {
        providerEventId,
        eventType,
        paymentId: providerPaymentId,
        payload: payload as Prisma.InputJsonValue
      },
      select: { id: true }
    });
  } catch (error) {
    if ((error as { code?: string }).code === "P2002") {
      return NextResponse.json({ ok: true, duplicate: true });
    }
    throw error;
  }

  if (!providerPaymentId && !providerOrderId) {
    await prisma.notification.create({
      data: {
        channel: "SYSTEM",
        status: "PENDING",
        recipient: "admin",
        subject: "Unusable Razorpay webhook",
        body: `Received ${eventType} without a payment or order identifier.`,
        entityType: "PaymentWebhookEvent",
        entityId: webhookEvent.id,
        metadata: { providerEventId }
      }
    });

    return NextResponse.json({ ok: true, matched: false });
  }

  const payment = await prisma.payment.findFirst({
    where: {
      OR: [
        providerPaymentId ? { providerPaymentId } : undefined,
        providerOrderId ? { providerOrderId } : undefined
      ].filter(Boolean) as Array<{ providerPaymentId?: string; providerOrderId?: string }>
    },
    include: { order: true }
  });

  if (!payment) {
    await prisma.notification.create({
      data: {
        channel: "SYSTEM",
        status: "PENDING",
        recipient: "admin",
        subject: "Unmatched Razorpay webhook",
        body: `Received ${eventType} but no local payment matched it.`,
        entityType: "PaymentWebhookEvent",
        entityId: webhookEvent.id,
        metadata: { providerPaymentId, providerOrderId, providerEventId }
      }
    });

    return NextResponse.json({ ok: true, matched: false });
  }

  const nextPaymentStatus =
    eventType === "payment.captured" || eventType === "order.paid"
      ? "PAID"
      : eventType === "payment.authorized"
        ? "AUTHORIZED"
        : eventType === "payment.failed"
          ? "FAILED"
          : eventType.startsWith("refund.")
            ? "REFUNDED"
            : payment.status;

  const nextOrderStatus =
    nextPaymentStatus === "PAID"
      ? payment.order.status === "AWAITING_PRESCRIPTION" ? "AWAITING_PRESCRIPTION" : "CONFIRMED"
      : nextPaymentStatus === "FAILED"
        ? "PENDING"
        : nextPaymentStatus === "REFUNDED"
          ? "REFUNDED"
          : payment.order.status;

  await prisma.$transaction([
    prisma.payment.update({
      where: { id: payment.id },
      data: {
        providerPaymentId: providerPaymentId ?? payment.providerPaymentId,
        status: nextPaymentStatus,
        rawPayload: payload as Prisma.InputJsonValue
      }
    }),
    prisma.order.update({
      where: { id: payment.orderId },
      data: { status: nextOrderStatus }
    }),
    prisma.paymentWebhookEvent.update({
      where: { id: webhookEvent.id },
      data: {
        processed: true,
        paymentId: payment.id,
        orderId: payment.orderId
      }
    }),
    prisma.activityLog.create({
      data: {
        action: "payment.webhook.processed",
        entityType: "Payment",
        entityId: payment.id,
        metadata: { eventType, providerPaymentId, providerOrderId, providerEventId }
      }
    })
  ]);

  return NextResponse.json({ ok: true });
}
