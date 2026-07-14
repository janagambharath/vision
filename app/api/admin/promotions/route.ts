import { NextResponse } from "next/server";
import { getAdminAccess, isManagerOrOwner } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { assertSameOrigin } from "@/lib/request-security";

function optionalNumber(value: FormDataEntryValue | null) {
  const raw = String(value ?? "").trim();
  if (!raw) return undefined;
  const numeric = Number(raw);
  return Number.isInteger(numeric) && numeric >= 0 ? numeric : undefined;
}

export async function POST(request: Request) {
  const originError = assertSameOrigin(request);
  if (originError) return originError;

  const access = await getAdminAccess();
  if (!access) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  if (!isManagerOrOwner(access.role)) {
    return NextResponse.json({ error: "Manager access is required" }, { status: 403 });
  }

  const formData = await request.formData();
  const code = String(formData.get("code") ?? "").trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "");
  const discountPaise = optionalNumber(formData.get("discountPaise"));
  const minOrderPaise = optionalNumber(formData.get("minOrderPaise"));

  if (!code || code.length > 32 || !discountPaise || discountPaise <= 0) {
    return NextResponse.json({ error: "A valid promotion code and discount are required" }, { status: 400 });
  }

  const coupon = await prisma.coupon.upsert({
    where: { code },
    update: {
      active: true,
      discountPaise,
      minOrderPaise
    },
    create: {
      code,
      active: true,
      discountPaise,
      minOrderPaise,
      description: "Admin-created store promotion"
    }
  });

  await prisma.activityLog.create({
    data: {
      adminUserId: access.session.user?.id,
      action: "coupon.upsert",
      entityType: "Coupon",
      entityId: coupon.id,
      metadata: { code }
    }
  });

  return NextResponse.json({ coupon: { id: coupon.id, code: coupon.code } });
}
