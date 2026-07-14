import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { getOrderConfirmationTemplate, sendEmail } from "@/lib/integrations/resend";
import { sendWhatsAppTemplate } from "@/lib/integrations/whatsapp";

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

/** The signed Razorpay webhook is the only fulfillment authority. */
export async function captureRazorpayPayment(input: CapturedPaymentInput): Promise<PaymentCaptureResult> {
  let result: PaymentCaptureResult = { matched: false, captured: false };
  let confirmation: OrderConfirmation | null = null;

  await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.findFirst({
      where: { provider: "razorpay", providerOrderId: input.providerOrderId },
      include: { order: { include: { items: true, shippingAddress: true } } }
    });

    if (!payment) return;
    result = { matched: true, captured: false, paymentId: payment.id, orderId: payment.orderId, publicId: payment.order.publicId };

    if (payment.amountPaise !== input.amountPaise) {
      throw new PaymentIntegrityError("Razorpay payment amount does not match the local order total.");
    }
    if (payment.providerPaymentId && payment.providerPaymentId !== input.providerPaymentId) {
      throw new PaymentIntegrityError("A different Razorpay payment is already attached to this local order.");
    }
    if (!["PENDING", "AWAITING_PRESCRIPTION"].includes(payment.order.status)) {
      throw new PaymentIntegrityError("Payment capture cannot transition the order from its current state.");
    }

    const claimed = await tx.payment.updateMany({
      where: { id: payment.id, status: { not: "PAID" } },
      data: { status: "PAID", providerPaymentId: input.providerPaymentId, rawPayload: input.payload }
    });
    if (claimed.count === 0) return;

    for (const item of payment.order.items) {
      if (!item.productId) continue;
      const inventory = await tx.inventory.updateMany({
        where: { productId: item.productId, quantity: { gte: item.quantity } },
        data: { quantity: { decrement: item.quantity } }
      });
      if (inventory.count !== 1) {
        throw new PaymentIntegrityError("Inventory is no longer available for this paid order.");
      }
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
  });

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
