import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const publicId = url.searchParams.get("id");
  if (!publicId) return NextResponse.json({ error: "Order id required" }, { status: 400 });

  const order = await prisma.order.findUnique({
    where: { publicId },
    include: { items: true, payments: true, shippingAddress: true, tryAtHomeRequest: true }
  });

  if (!order) return NextResponse.json({ error: "Order not found" }, { status: 404 });
  return NextResponse.json({ order });
}
