import { timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { grantOrderAccess } from "@/lib/order-access";
import { isRateLimited, rateLimit } from "@/lib/rate-limit";
import { assertSameOrigin } from "@/lib/request-security";
import { normalizePhone, orderTrackingSchema } from "@/lib/validations";

function phonesMatch(expected: string, received: string) {
  const expectedBuffer = Buffer.from(normalizePhone(expected).replace(/^\+/, ""));
  const receivedBuffer = Buffer.from(normalizePhone(received).replace(/^\+/, ""));
  return expectedBuffer.length === receivedBuffer.length && timingSafeEqual(expectedBuffer, receivedBuffer);
}

export async function POST(request: NextRequest) {
  const originError = assertSameOrigin(request);
  if (originError) return originError;
  if (await isRateLimited(request, { keyPrefix: "order-tracking", limit: 10, windowSeconds: 15 * 60 })) {
    return NextResponse.json({ error: "Too many lookup attempts. Try again later." }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = orderTrackingSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Enter the full order ID and phone number." }, { status: 400 });

  const perPhone = await rateLimit(`order_tracking:${parsed.data.phone}`, 5, 15 * 60);
  if (!perPhone.allowed) return NextResponse.json({ error: "Too many lookup attempts. Try again later." }, { status: 429 });

  const order = await prisma.order.findUnique({
    where: { publicId: parsed.data.id },
    select: { publicId: true, phone: true }
  });
  if (!order || !phonesMatch(order.phone, parsed.data.phone)) {
    return NextResponse.json({ error: "Order details could not be verified." }, { status: 404 });
  }

  await grantOrderAccess(order.publicId, "tracking", 30 * 60);
  return NextResponse.json({ publicId: order.publicId });
}
