import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { prisma } from "@/lib/db";
import { sendEmail, getOrderConfirmationTemplate } from "@/lib/integrations/resend";
import { sendWhatsAppTemplate } from "@/lib/integrations/whatsapp";
import { createShiprocketShipment } from "@/lib/integrations/shiprocket";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, orderPublicId } = body;

    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature || !orderPublicId) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) {
      throw new Error("Missing RAZORPAY_KEY_SECRET in environment variables");
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
  let orderData: any = null;

  await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { publicId },
      include: { items: true, shippingAddress: true }
    });

    if (!order) {
      throw new Error(`Order ${publicId} not found`);
    }
    
    orderData = order;

    if (order.status !== "PENDING") {
      // Already processed by webhook
      return;
    }

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

    // Update order status & link payment details
    await tx.order.update({
      where: { id: order.id },
      data: { status: "CONFIRMED" }
    });

    // Find existing payment record by provider order ID
    const existingPayment = await tx.payment.findFirst({
      where: { orderId: order.id, providerOrderId: razorpayOrderId },
    });

    if (existingPayment) {
      // Update existing payment record
      await tx.payment.update({
        where: { id: existingPayment.id },
        data: {
          status: "PAID",
          providerPaymentId: paymentId,
          signature: signature,
        },
      });
    } else {
      // Create new payment record if none existed
      await tx.payment.create({
        data: {
          orderId: order.id,
          providerOrderId: razorpayOrderId,
          providerPaymentId: paymentId,
          amountPaise: order.grandTotalPaise,
          status: "PAID",
          signature: signature,
        },
      });
    }

    // Log activity
    await tx.activityLog.create({
      data: {
        action: "PAYMENT_VERIFIED",
        entityType: "order",
        entityId: order.id,
        metadata: { paymentId, razorpayOrderId }
      }
    });
  });

  if (!orderData) return;

  // Send Resend confirmation email
  if (orderData.email) {
    try {
      const emailHtml = getOrderConfirmationTemplate(orderData as any);
      await sendEmail(orderData.email, `Order Confirmed: ${orderData.publicId} | Vision Vistara`, emailHtml);
    } catch (emailErr) {
      console.error("Failed to send confirmation email:", emailErr);
    }
  }

  // Send WhatsApp confirmation
  if (orderData.phone) {
    try {
      await sendWhatsAppTemplate(orderData.phone, "order_confirmed", [
        orderData.customerName,
        orderData.publicId,
        (orderData.grandTotalPaise / 100).toFixed(2),
        `${process.env.NEXT_PUBLIC_SITE_URL || "https://visionvistara.online"}/frames/orders/${orderData.publicId}`
      ]);
    } catch (waErr) {
      console.error("Failed to send confirmation WhatsApp:", waErr);
    }
  }

  // Trigger Shiprocket shipment auto-creation
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
    console.error("Failed to trigger Shiprocket auto-shipment:", shiprocketErr);
  }
}
