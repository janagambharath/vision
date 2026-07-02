import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isRateLimited } from "@/lib/rate-limit";
import { orderTrackingSchema } from "@/lib/validations";

export async function GET(request: Request) {
  if (await isRateLimited(request, { keyPrefix: "order-tracking-api", limit: 20, windowSeconds: 60 })) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const url = new URL(request.url);
  const parsed = orderTrackingSchema.safeParse({
    id: url.searchParams.get("id") ?? "",
    phone: url.searchParams.get("phone") ?? ""
  });
  if (!parsed.success) return NextResponse.json({ error: "Order id and phone are required" }, { status: 400 });

  const order = await prisma.order.findFirst({
    where: {
      publicId: parsed.data.id,
      phone: parsed.data.phone
    },
    select: {
      publicId: true,
      status: true,
      deliveryMethod: true,
      paymentMethod: true,
      grandTotalPaise: true,
      createdAt: true,
      items: {
        select: {
          id: true,
          quantity: true,
          productSnapshot: true,
          lensSnapshot: true
        }
      },
      tryAtHomeRequest: {
        select: {
          status: true,
          preferredDate: true,
          preferredSlot: true
        }
      }
    }
  });

  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  return NextResponse.json({ order });
}
