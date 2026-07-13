import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createRazorpayOrder } from "@/lib/integrations/razorpay";
import { isRateLimited } from "@/lib/rate-limit";
import { assertSameOrigin } from "@/lib/request-security";

// POST /api/razorpay — Create a Razorpay order for checkout
export async function POST(request: NextRequest) {
  try {
    const originError = assertSameOrigin(request);
    if (originError) return originError;

    if (await isRateLimited(request, { keyPrefix: "razorpay-create", limit: 10, windowSeconds: 60 })) {
      return NextResponse.json({ error: "Too many payment initialization attempts" }, { status: 429 });
    }

    const body = await request.json();
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json({ error: "orderId required" }, { status: 400 });
    }

    const order = await prisma.order.findUnique({ where: { id: orderId } });
    if (!order) {
      return NextResponse.json({ error: "Order not found" }, { status: 404 });
    }

    if (!["PENDING", "AWAITING_PRESCRIPTION"].includes(order.status)) {
      return NextResponse.json({ error: "Payment cannot be initialized for this order status" }, { status: 409 });
    }

    const paymentId = `payment-${order.id}`;
    const existingPayment = await prisma.payment.findUnique({ where: { id: paymentId } });
    if (existingPayment?.providerOrderId && existingPayment.status === "PENDING") {
      return NextResponse.json({
        razorpayOrderId: existingPayment.providerOrderId,
        amount: existingPayment.amountPaise,
        currency: "INR",
        keyId: process.env.RAZORPAY_KEY_ID
      });
    }

    const razorpayOrder = await createRazorpayOrder({
      amountPaise: order.grandTotalPaise,
      receipt: order.publicId,
      notes: { orderId: order.id, publicId: order.publicId }
    });

    await prisma.payment.upsert({
      where: { id: paymentId },
      update: {
        providerOrderId: razorpayOrder.id,
        amountPaise: order.grandTotalPaise,
        rawPayload: JSON.parse(JSON.stringify(razorpayOrder))
      },
      create: {
        id: paymentId,
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
