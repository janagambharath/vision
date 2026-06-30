import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { cookies } from "next/headers";

const CART_COOKIE = "vv_cart_session";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const couponCode = searchParams.get("coupon")?.trim();

  const cookieStore = await cookies();
  let sessionId = cookieStore.get(CART_COOKIE)?.value;

  if (!sessionId) {
    // Generate new session if none exists
    sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    cookieStore.set(CART_COOKIE, sessionId, {
      path: "/",
      httpOnly: true,
      maxAge: 14 * 24 * 60 * 60, // 14 days
      secure: process.env.NODE_ENV === "production"
    });
  }

  // Redirect target
  const redirectUrl = new URL("/frames/cart", request.url);

  if (!couponCode) {
    return NextResponse.redirect(redirectUrl);
  }

  try {
    // Get or create cart
    let cart = await prisma.cart.findUnique({
      where: { sessionId }
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: { sessionId }
      });
    }

    // Lookup coupon
    const coupon = await prisma.coupon.findUnique({
      where: { code: couponCode }
    });

    if (coupon && coupon.active) {
      await prisma.cart.update({
        where: { id: cart.id },
        data: { couponId: coupon.id }
      });
      redirectUrl.searchParams.set("couponApplied", "true");
    } else {
      redirectUrl.searchParams.set("couponError", "invalid");
    }
  } catch (error) {
    console.error("Failed to auto-apply coupon in redirect route:", error);
  }

  return NextResponse.redirect(redirectUrl);
}
