import { timingSafeEqual, createHmac } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { hasOrderAccess } from "@/lib/order-access";
import { isRateLimited } from "@/lib/rate-limit";
import { assertSameOrigin } from "@/lib/request-security";

function signaturesMatch(expected: string, received: string) {
  if (!/^[a-f0-9]{64}$/i.test(received)) return false;
  const expectedBuffer = Buffer.from(expected, "hex");
  const receivedBuffer = Buffer.from(received, "hex");
  return expectedBuffer.length === receivedBuffer.length && timingSafeEqual(expectedBuffer, receivedBuffer);
}

// The browser return is intentionally not a fulfillment authority. Razorpay's
// signed webhook validates the captured amount and performs the state change.
export async function POST(request: NextRequest) {
  try {
    const originError = assertSameOrigin(request);
    if (originError) return originError;
    if (await isRateLimited(request, { keyPrefix: "razorpay-verify", limit: 20, windowSeconds: 60 })) {
      return NextResponse.json({ error: "Too many verification attempts" }, { status: 429 });
    }

    const body = await request.json();
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature, orderPublicId } = body;
    if (![razorpay_payment_id, razorpay_order_id, razorpay_signature, orderPublicId].every((value) => typeof value === "string" && value)) {
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }
    if (!(await hasOrderAccess(orderPublicId, "checkout"))) {
      return NextResponse.json({ error: "Checkout session expired. Return to checkout and try again." }, { status: 403 });
    }

    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) throw new Error("Missing RAZORPAY_KEY_SECRET in environment variables");
    const expected = createHmac("sha256", secret).update(`${razorpay_order_id}|${razorpay_payment_id}`).digest("hex");
    if (!signaturesMatch(expected, razorpay_signature)) {
      return NextResponse.json({ error: "Invalid payment signature" }, { status: 400 });
    }

    const payment = await prisma.payment.findFirst({
      where: { provider: "razorpay", providerOrderId: razorpay_order_id },
      include: { order: { select: { publicId: true, grandTotalPaise: true } } }
    });
    if (!payment || payment.order.publicId !== orderPublicId) {
      return NextResponse.json({ error: "Payment does not belong to this order" }, { status: 400 });
    }
    if (payment.providerPaymentId && payment.providerPaymentId !== razorpay_payment_id) {
      return NextResponse.json({ error: "A different payment is already attached to this order" }, { status: 409 });
    }

    await prisma.payment.update({
      where: { id: payment.id },
      data: {
        providerPaymentId: razorpay_payment_id,
        signature: razorpay_signature
      }
    });
    return NextResponse.json({ status: "pending_webhook" });
  } catch (error) {
    console.error("Razorpay browser verification failed:", error);
    return NextResponse.json({ error: "Payment verification failed" }, { status: 500 });
  }
}
