import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isRateLimited } from "@/lib/rate-limit";
import { orderPublicIdSchema } from "@/lib/validations";
import { hasOrderAccess } from "@/lib/order-access";

export async function GET(request: Request) {
  if (await isRateLimited(request, { keyPrefix: "order-tracking-api", limit: 20, windowSeconds: 60 })) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const url = new URL(request.url);
  const parsed = orderPublicIdSchema.safeParse(url.searchParams.get("id") ?? "");
  if (!parsed.success) return NextResponse.json({ error: "A valid order id is required" }, { status: 400 });
  if (!(await hasOrderAccess(parsed.data, "tracking"))) {
    return NextResponse.json({ error: "Order verification is required" }, { status: 403 });
  }

  const order = await prisma.order.findFirst({
    where: {
      publicId: parsed.data
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
