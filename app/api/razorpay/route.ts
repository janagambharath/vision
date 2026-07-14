import type { Prisma } from "@prisma/client";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { createRazorpayOrder } from "@/lib/integrations/razorpay";
import { hasOrderAccess } from "@/lib/order-access";
import { isRateLimited } from "@/lib/rate-limit";
import { assertSameOrigin } from "@/lib/request-security";
import { isOnlinePaymentMethod } from "@/lib/inventory-reservations";

// Checkout setup is restricted to the short-lived signed checkout session set
// after the order is created. Internal database IDs are never accepted here.
export async function POST(request: NextRequest) {
  try {
    const originError = assertSameOrigin(request);
    if (originError) return originError;
    if (await isRateLimited(request, { keyPrefix: "razorpay-create", limit: 10, windowSeconds: 60 })) {
      return NextResponse.json({ error: "Too many payment initialization attempts" }, { status: 429 });
    }

    const { publicOrderId } = await request.json();
    if (typeof publicOrderId !== "string" || !(await hasOrderAccess(publicOrderId, "checkout"))) {
      return NextResponse.json({ error: "Checkout session expired. Return to checkout and try again." }, { status: 403 });
    }

    const order = await prisma.order.findUnique({ where: { publicId: publicOrderId } });
    if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
    if (!isOnlinePaymentMethod(order.paymentMethod)) {
      return NextResponse.json({ error: "This order is not configured for online payment." }, { status: 409 });
    }
    if (!['PENDING', 'AWAITING_PRESCRIPTION'].includes(order.status)) {
      return NextResponse.json({ error: "Payment cannot be initialized for this order status" }, { status: 409 });
    }

    const paymentId = `payment-${order.id}`;
    const existingPayment = await prisma.payment.findUnique({ where: { id: paymentId } });
    if (existingPayment?.status === "PAID" || existingPayment?.status === "REFUNDED" || existingPayment?.status === "AUTHORIZED") {
      return NextResponse.json({ error: "This order already has a payment outcome and cannot be charged again." }, { status: 409 });
    }

    // New checkouts always have a live allocation. Legacy orders without an
    // allocation remain payable so a migration does not strand customers.
    const reservations = await prisma.inventoryReservation.findMany({
      where: { orderId: order.id },
      select: { status: true, expiresAt: true }
    });
    if (reservations.length && reservations.some((reservation) => reservation.status !== "ACTIVE" || reservation.expiresAt <= new Date())) {
      return NextResponse.json({ error: "This checkout has expired. Return to the cart to reserve stock again." }, { status: 409 });
    }
    if (existingPayment?.providerOrderId) {
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
    const rawPayload = JSON.parse(JSON.stringify(razorpayOrder)) as Prisma.InputJsonValue;
    await prisma.payment.upsert({
      where: { id: paymentId },
      update: {
        providerOrderId: razorpayOrder.id,
        providerPaymentId: null,
        signature: null,
        amountPaise: order.grandTotalPaise,
        rawPayload,
        status: "PENDING"
      },
      create: {
        id: paymentId,
        orderId: order.id,
        providerOrderId: razorpayOrder.id,
        amountPaise: order.grandTotalPaise,
        status: "PENDING",
        rawPayload
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
    return NextResponse.json({ error: "Payment initialization failed. Contact support to complete payment." }, { status: 503 });
  }
}
