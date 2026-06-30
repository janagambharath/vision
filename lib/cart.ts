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

  const taxPaise = 0;
  const grandTotalPaise = Math.max(0, subtotalPaise + lensTotalPaise + shippingPaise + taxPaise - discountPaise);

  return {
    subtotalPaise,
    lensTotalPaise,
    shippingPaise,
    taxPaise,
    discountPaise,
    grandTotalPaise
  };
}

export async function addToCart(formData: FormData) {
  "use server";

  const slug = String(formData.get("slug") ?? "");
  const lensCode = String(formData.get("lensCode") ?? "");
  const quantity = Number(formData.get("quantity") ?? 1);
  const deliveryMethod = String(formData.get("deliveryMethod") ?? "DELIVERY") as "DELIVERY" | "TRY_AT_HOME" | "STORE_PICKUP";

  const product = await prisma.product.findUnique({
    where: { slug },
    include: { inventory: true }
  });

  if (!product || product.status !== "ACTIVE" || typeof product.pricePaise !== "number") {
    redirect(`/frames/${slug}?blocked=price-required`);
  }

  if (product.inventory?.status === "OUT_OF_STOCK") {
    redirect(`/frames/${slug}?blocked=out-of-stock`);
  }

  const lensOption = lensCode
    ? await prisma.lensOption.findUnique({
        where: { code: lensCode }
      })
    : null;

  if (lensCode && (!lensOption || !lensOption.active || typeof lensOption.pricePaise !== "number")) {
    redirect(`/frames/${slug}?blocked=lens-price-required`);
  }

  const cart = await getOrCreateCart();

  // Check if same product+lens already in cart
  const existingItem = cart.items.find(
    (item) => item.productId === product.id && item.lensOptionId === (lensOption?.id ?? null)
  );

  if (existingItem) {
    await prisma.cartItem.update({
      where: { id: existingItem.id },
      data: { quantity: Math.min(5, existingItem.quantity + Math.max(1, quantity)) }
    });
  } else {
    await prisma.cartItem.create({
      data: {
        cartId: cart.id,
        productId: product.id,
        lensOptionId: lensOption?.id,
        quantity: Math.max(1, Math.min(5, quantity)),
        deliveryMethod,
        tryAtHome: deliveryMethod === "TRY_AT_HOME"
      }
    });
  }

  redirect("/frames/cart");
}

export async function removeCartItem(formData: FormData) {
  "use server";

  const id = String(formData.get("id") ?? "");
  if (id) {
    await prisma.cartItem.delete({ where: { id } }).catch(() => null);
  }
  redirect("/frames/cart");
}

export async function updateCartItemQuantity(formData: FormData) {
  "use server";

  const id = String(formData.get("id") ?? "");
  const quantity = Number(formData.get("quantity") ?? 1);

  if (id && quantity >= 1 && quantity <= 5) {
    await prisma.cartItem.update({
      where: { id },
      data: { quantity }
    }).catch(() => null);
  }
  redirect("/frames/cart");
}

export async function applyCouponAction(formData: FormData) {
  "use server";

  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  const cart = await getOrCreateCart();

  if (!code) {
    redirect("/frames/cart?couponError=enter-code");
  }

  const coupon = await prisma.coupon.findUnique({ where: { code } });

  if (!coupon || !coupon.active) {
    redirect("/frames/cart?couponError=invalid");
  }

  if (coupon.expiresAt && coupon.expiresAt < new Date()) {
    redirect("/frames/cart?couponError=expired");
  }

  if (coupon.maxUses && coupon.usedCount >= coupon.maxUses) {
    redirect("/frames/cart?couponError=max-uses");
  }

  await prisma.cart.update({
    where: { id: cart.id },
    data: { couponId: coupon.id }
  });

  redirect("/frames/cart?couponApplied=true");
}

export async function removeCouponAction() {
  "use server";

  const cart = await getOrCreateCart();
  await prisma.cart.update({
    where: { id: cart.id },
    data: { couponId: null }
  });
  redirect("/frames/cart");
}
