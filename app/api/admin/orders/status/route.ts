import { NextResponse } from "next/server";
import { OrderStatus } from "@prisma/client";
import { requireAdmin } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { assertSameOrigin } from "@/lib/request-security";

export async function POST(request: Request) {
  const originError = assertSameOrigin(request);
  if (originError) return originError;

  const admin = await requireAdmin();
  const formData = await request.formData();
  const publicId = String(formData.get("publicId") ?? "");
  const status = String(formData.get("status") ?? "");

  if (!publicId || !(status in OrderStatus)) {
    return NextResponse.redirect(new URL("/admin/orders?error=invalid-status", request.url), 303);
  }

  const order = await prisma.order.update({
    where: { publicId },
    data: { status: status as OrderStatus }
  });

  await prisma.activityLog.create({
    data: {
      adminUserId: admin.user?.id,
      action: "order.status.update",
      entityType: "Order",
      entityId: order.id,
      metadata: { publicId, status }
    }
  });

  await prisma.notification.create({
    data: {
      channel: "SYSTEM",
      status: "PENDING",
      recipient: "admin",
      subject: "Order status updated",
      body: `${publicId} moved to ${status}.`,
      entityType: "Order",
      entityId: order.id,
      metadata: { publicId, status }
    }
  });

  return NextResponse.redirect(new URL("/admin/orders", request.url), 303);
}
