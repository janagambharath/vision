import { NextRequest, NextResponse } from "next/server";
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
