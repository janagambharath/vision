import { NextResponse } from "next/server";
import { OrderStatus } from "@prisma/client";
import { getAdminAccess, isManagerOrOwner } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { assertSameOrigin } from "@/lib/request-security";
import {
  OrderInventoryAllocationError,
  OrderStatusTransitionError,
  updateOrderStatusWithInventory
} from "@/lib/order-status";

export async function POST(request: Request) {
  const originError = assertSameOrigin(request);
  if (originError) return originError;

  const access = await getAdminAccess();
  if (!access) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  if (!isManagerOrOwner(access.role)) return NextResponse.json({ error: "Manager access required" }, { status: 403 });
  const formData = await request.formData();
  const publicId = String(formData.get("publicId") ?? "");
  const status = String(formData.get("status") ?? "");

  if (!publicId || !(status in OrderStatus)) {
    return NextResponse.redirect(new URL("/admin/orders?error=invalid-status", request.url), 303);
  }

  const existingOrder = await prisma.order.findUnique({ where: { publicId }, select: { id: true } });
  if (!existingOrder) return NextResponse.redirect(new URL("/admin/orders?error=order-not-found", request.url), 303);

  let order;
  try {
    order = await updateOrderStatusWithInventory({
      orderId: existingOrder.id,
      status: status as OrderStatus
    });
  } catch (error) {
    if (error instanceof OrderInventoryAllocationError || error instanceof OrderStatusTransitionError) {
      const reason = error instanceof OrderStatusTransitionError ? "order-transition" : "stock-allocation";
      return NextResponse.redirect(new URL(`/admin/orders?error=${reason}&publicId=${encodeURIComponent(publicId)}`, request.url), 303);
    }
    throw error;
  }

  await prisma.activityLog.create({
    data: {
      adminUserId: access.session.user?.id,
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
