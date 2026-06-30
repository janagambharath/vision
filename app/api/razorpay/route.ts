import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { createRazorpayOrder } from "@/lib/integrations/razorpay";

// POST /api/razorpay — Create a Razorpay order for checkout
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json({ error: "orderId required" }, { status: 400 });
    }

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    const razorpayOrder = await createRazorpayOrder({
      amountPaise: order.grandTotalPaise,
      receipt: order.publicId,
      notes: { orderId: order.id, publicId: order.publicId }
    });

    await prisma.payment.upsert({
      where: { id: `payment-${order.id}` },
      update: {
        providerOrderId: razorpayOrder.id,
        amountPaise: order.grandTotalPaise,
        rawPayload: JSON.parse(JSON.stringify(razorpayOrder))
      },
      create: {
        orderId: order.id,
        providerOrderId: razorpayOrder.id,
        amountPaise: order.grandTotalPaise,
        status: "PENDING",
        rawPayload: JSON.parse(JSON.stringify(razorpayOrder))
      }
    });

    return NextResponse.json({
      razorpayOrderId: razorpayOrder.id,
      amount: order.grandTotalPaise,
      currency: "INR",
      keyId: process.env.RAZORPAY_KEY_ID
    });
  } catch (error) {
    console.error("Razorpay order creation failed:", error);
    return NextResponse.json(
      { error: "Payment initialization failed. You can complete via WhatsApp-assisted checkout." },
      { status: 500 }
    );
  }
}

// Razorpay webhook handler
export async function PUT(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get("x-razorpay-signature");

    if (!signature || !process.env.RAZORPAY_KEY_SECRET) {
      return NextResponse.json({ error: "Webhook verification failed" }, { status: 401 });
    }

    // Verify signature
    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(body)
      .digest("hex");

    if (expectedSignature !== signature) {
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
      return NextResponse.json({ error: "Payment not found" }, { status: 404 });
    }

    if (event.event === "payment.captured") {
      await prisma.$transaction(async (tx) => {
        const order = await tx.order.findUnique({
          where: { id: payment.orderId },
          include: { items: true }
        });

        if (!order) throw new Error("Order not found in webhook");

        if (order.grandTotalPaise !== paymentEntity.amount) {
          throw new Error(`Amount mismatch: order is ${order.grandTotalPaise}, payment is ${paymentEntity.amount}`);
        }

        if (order.status === "PENDING") {
          // Decrement inventory securely
          for (const item of order.items) {
            if (item.productId) {
              const inv = await tx.inventory.findUnique({ where: { productId: item.productId } });
              if (!inv || inv.quantity < item.quantity) {
                throw new Error(`Insufficient inventory for product ID ${item.productId}`);
              }
              await tx.inventory.update({
                where: { productId: item.productId },
                data: { quantity: { decrement: item.quantity } }
              });
            }
          }
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

        await tx.order.update({
          where: { id: payment.orderId },
          data: { status: "CONFIRMED" }
        });

        // Log activity
        await tx.activityLog.create({
          data: {
            action: "PAYMENT_CAPTURED",
            entityType: "order",
            entityId: payment.orderId,
            metadata: { razorpayPaymentId: paymentEntity.id, amount: paymentEntity.amount }
          }
        });
      });
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
    }

    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("Razorpay webhook error:", error);
    return NextResponse.json({ error: "Webhook processing failed" }, { status: 500 });
  }
}
