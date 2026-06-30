import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { createShiprocketShipment } from "@/lib/integrations/shiprocket";

// POST /api/razorpay/webhook — Razorpay sends webhooks as POST
export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get("x-razorpay-signature");

    if (!signature || !process.env.RAZORPAY_KEY_SECRET) {
      return NextResponse.json({ error: "Webhook verification failed" }, { status: 401 });
    }

    // Verify HMAC signature
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature !== signature) {
      console.error("❌ Razorpay webhook signature mismatch");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event = JSON.parse(body);
    const paymentEntity = event.payload?.payment?.entity;

    if (!paymentEntity) {
      return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
    }

    const razorpayOrderId = paymentEntity.order_id;

    // Find payment by Razorpay order ID
    const payment = await prisma.payment.findFirst({
      where: { providerOrderId: razorpayOrderId }
    });

    if (!payment) {
      console.error(`❌ Webhook: No payment found for Razorpay order ${razorpayOrderId}`);
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    if (event.event === "payment.captured") {
      let orderData: any = null;

      await prisma.$transaction(async (tx) => {
        const order = await tx.order.findUnique({
          where: { id: payment.orderId },
          include: { items: true, shippingAddress: true }
        });

        if (!order) throw new Error("Order not found in webhook");

        orderData = order;

        // Verify amount matches to prevent tampering
        if (order.grandTotalPaise !== paymentEntity.amount) {
          throw new Error(`Amount mismatch: order=${order.grandTotalPaise}, payment=${paymentEntity.amount}`);
        }

        // Only process if order is still pending (idempotency guard)
        if (order.status === "PENDING") {
          // Decrement inventory atomically
          for (const item of order.items) {
            if (item.productId) {
              const inv = await tx.inventory.findUnique({ where: { productId: item.productId } });
              if (!inv || inv.quantity < item.quantity) {
                throw new Error(`Insufficient inventory for product ${item.productId}`);
              }
              await tx.inventory.update({
                where: { productId: item.productId },
                data: { quantity: { decrement: item.quantity } }
              });
            }
          }

          await tx.order.update({
            where: { id: payment.orderId },
            data: { status: "CONFIRMED" }
          });
        }

        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: "PAID",
            providerPaymentId: paymentEntity.id,
            signature: signature,
            rawPayload: paymentEntity
          }
        });

        await tx.activityLog.create({
          data: {
            action: "PAYMENT_CAPTURED_WEBHOOK",
            entityType: "order",
            entityId: payment.orderId,
            metadata: { razorpayPaymentId: paymentEntity.id, amount: paymentEntity.amount }
          }
        });
      });

      console.log(`✅ Webhook: Payment captured for order ${payment.orderId}`);

      // Auto-trigger Shiprocket shipment
      if (orderData) {
        try {
          await createShiprocketShipment({
            publicId: orderData.publicId,
            customerName: orderData.customerName,
            phone: orderData.phone,
            shippingAddress: orderData.shippingAddress,
            items: orderData.items,
            grandTotalPaise: orderData.grandTotalPaise,
            paymentMethod: orderData.paymentMethod
          });
        } catch (shiprocketErr) {
          console.error("Failed to auto-create Shiprocket shipment:", shiprocketErr);
        }
      }
    }

    if (event.event === "payment.failed") {
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: "FAILED",
          providerPaymentId: paymentEntity.id,
          rawPayload: paymentEntity
        }
      });
      console.log(`⚠️ Webhook: Payment failed for order ${payment.orderId}`);
    }

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("Razorpay webhook error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
