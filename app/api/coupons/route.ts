import { NextResponse } from "next/server";
import { calculateCartTotals, getCartOrNull } from "@/lib/cart";
import { prisma } from "@/lib/db";
import { assertSameOrigin } from "@/lib/request-security";
import { isRateLimited } from "@/lib/rate-limit";

export async function POST(request: Request) {
  if (await isRateLimited(request, { keyPrefix: "coupon-api", limit: 20, windowSeconds: 60 })) {
    return NextResponse.json({ error: "Too many coupon attempts" }, { status: 429 });
  }

  const originError = assertSameOrigin(request);
  if (originError) return originError;

  const formData = await request.formData();
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  const cart = await getCartOrNull();
  if (!cart || !code) return NextResponse.redirect(new URL("/frames/cart?error=invalid-coupon", request.url), 303);

  const coupon = await prisma.coupon.findUnique({ where: { code } });
  const now = new Date();
  const totals = calculateCartTotals({ ...cart, coupon: null });

  if (
    !coupon ||
    !coupon.active ||
    (coupon.expiresAt && coupon.expiresAt <= now) ||
    (coupon.maxUses && coupon.usedCount >= coupon.maxUses) ||
    (coupon.minOrderPaise && totals.subtotalPaise + totals.lensTotalPaise < coupon.minOrderPaise)
  ) {
    return NextResponse.redirect(new URL("/frames/cart?error=invalid-coupon", request.url), 303);
  }

  await prisma.cart.update({
    where: { id: cart.id },
    data: { couponId: coupon.id }
  });

  return NextResponse.redirect(new URL("/frames/cart", request.url), 303);
}
