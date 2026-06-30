import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { sendEmail, getOrderConfirmationTemplate } from "@/lib/integrations/resend";
import { sendWhatsAppTemplate } from "@/lib/integrations/whatsapp";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, orderPublicId } = body;

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature || !orderPublicId) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret || secret.startsWith("dummy")) {
      console.warn("⚠️ Razorpay Key Secret is not configured. Simulating payment confirmation.");
      // Skip signature verification for mock/local testing
      await confirmOrder(orderPublicId, razorpay_payment_id, razorpay_order_id, razorpay_signature);
      return NextResponse.json({ status: "ok", simulated: true });
    }

    // Verify signature
    const text = `${razorpay_order_id}|${razorpay_payment_id}`;
    const generated_signature = crypto
      .createHmac("sha256", secret)
      .update(text)
      .digest("hex");

    if (generated_signature !== razorpay_signature) {
      console.error("❌ Razorpay signature mismatch!");
      return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
    }

    await confirmOrder(orderPublicId, razorpay_payment_id, razorpay_order_id, razorpay_signature);
    return NextResponse.json({ status: "ok" });
  } catch (error) {
    console.error("Razorpay verification handler failed:", error);
    return NextResponse.json({ error: "Verification failed" }, { status: 500 });
  }
}

async function confirmOrder(publicId: string, paymentId: string, razorpayOrderId: string, signature: string) {
  const order = await prisma.order.findUnique({
    where: { publicId },
    include: { items: true }
  });

  if (!order) {
    throw new Error(`Order ${publicId} not found`);
  }

  // Update order status & link payment details
  await prisma.order.update({
    where: { id: order.id },
    data: { status: "CONFIRMED" }
  });

  await prisma.payment.upsert({
    where: { id: `payment-${order.id}` },
    update: {
      status: "PAID",
      providerPaymentId: paymentId,
      signature: signature
    },
    create: {
      orderId: order.id,
      providerOrderId: razorpayOrderId,
      providerPaymentId: paymentId,
      amountPaise: order.grandTotalPaise,
      status: "PAID",
      signature: signature
    }
  });

  // Log activity
  await prisma.activityLog.create({
    data: {
      action: "PAYMENT_VERIFIED",
      entityType: "order",
      entityId: order.id,
      metadata: { paymentId, razorpayOrderId }
    }
  });

  // Send Resend confirmation email
  if (order.email) {
    try {
      const emailHtml = getOrderConfirmationTemplate(order as any);
      await sendEmail(order.email, `Order Confirmed: ${order.publicId} | Vision Vistara`, emailHtml);
    } catch (emailErr) {
      console.error("Failed to send confirmation email:", emailErr);
    }
  }

  // Send WhatsApp confirmation
  if (order.phone) {
    try {
      await sendWhatsAppTemplate(order.phone, "order_confirmed", [
        order.customerName,
        order.publicId,
        (order.grandTotalPaise / 100).toFixed(2),
        `${process.env.NEXT_PUBLIC_SITE_URL || "https://visionvistara.online"}/frames/orders/${order.publicId}`
      ]);
    } catch (waErr) {
      console.error("Failed to send confirmation WhatsApp:", waErr);
    }
  }
}
