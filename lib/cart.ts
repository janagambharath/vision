import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { CART_COOKIE } from "@/lib/constants";
import { prisma } from "@/lib/db";

async function getCookieStore() {
  return cookies();
}

export async function getOrCreateCart() {
  const cookieStore = await getCookieStore();
  const existingSessionId = cookieStore.get(CART_COOKIE)?.value;

  if (existingSessionId) {
    const cart = await prisma.cart.findUnique({
      where: { sessionId: existingSessionId },
      include: {
        items: {
          where: { savedForLater: false },
          include: { product: { include: { images: { orderBy: { sortOrder: "asc" }, take: 1 }, inventory: true } }, lensOption: true },
          orderBy: { createdAt: "asc" }
        },
        coupon: true
      }
    });
    if (cart) return cart;
  }

  const sessionId = crypto.randomUUID();
  const cart = await prisma.cart.create({
    data: { sessionId },
    include: {
      items: {
        where: { savedForLater: false },
        include: { product: { include: { images: { orderBy: { sortOrder: "asc" }, take: 1 }, inventory: true } }, lensOption: true },
        orderBy: { createdAt: "asc" }
      },
      coupon: true
    }
  });

  cookieStore.set(CART_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  });

  return cart;
}

export async function getCartOrNull() {
  const cookieStore = await getCookieStore();
  const sessionId = cookieStore.get(CART_COOKIE)?.value;
  if (!sessionId) return null;

  return prisma.cart.findUnique({
    where: { sessionId },
    include: {
      items: {
        where: { savedForLater: false },
        include: {
          product: { include: { images: { orderBy: { sortOrder: "asc" }, take: 1 }, inventory: true } },
          lensOption: true
        },
        orderBy: { createdAt: "asc" }
      },
      coupon: true
    }
  });
}

export async function getCartItemCount() {
  const cookieStore = await getCookieStore();
  const sessionId = cookieStore.get(CART_COOKIE)?.value;
  if (!sessionId) return 0;

  const cart = await prisma.cart.findUnique({
    where: { sessionId },
    include: { items: { where: { savedForLater: false }, select: { quantity: true } } }
  });

  return cart?.items.reduce((sum, item) => sum + item.quantity, 0) ?? 0;
}

export function calculateCartTotals(cart: Awaited<ReturnType<typeof getCartOrNull>>) {
  const items = cart?.items ?? [];
  const subtotalPaise = items.reduce((sum, item) => sum + (item.product.pricePaise ?? 0) * item.quantity, 0);
  const lensTotalPaise = items.reduce((sum, item) => sum + (item.lensOption?.pricePaise ?? 0) * item.quantity, 0);
  const shippingPaise = items.length ? 9900 : 0;

  let discountPaise = 0;
  if (cart?.coupon) {
    if (cart.coupon.discountPaise) {
      discountPaise = cart.coupon.discountPaise;
    } else if (cart.coupon.discountPct) {
      discountPaise = Math.round((subtotalPaise + lensTotalPaise) * cart.coupon.discountPct / 100);
    }
    // Check minimum order
    if (cart.coupon.minOrderPaise && (subtotalPaise + lensTotalPaise) < cart.coupon.minOrderPaise) {
      discountPaise = 0;
    }
  }

  const taxableAmountPaise = subtotalPaise + lensTotalPaise - discountPaise;
  const taxPaise = Math.round(taxableAmountPaise * 0.12); // 12% GST
  const grandTotalPaise = Math.max(0, taxableAmountPaise + shippingPaise + taxPaise);

  return {
    subtotalPaise,
    lensTotalPaise,
    shippingPaise,
    taxPaise,
    discountPaise,
    grandTotalPaise
  };
}
