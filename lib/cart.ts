import { cookies } from "next/headers";
import { CART_COOKIE, DIRECT_CHECKOUT_ITEM_COOKIE } from "@/lib/constants";
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
          include: { product: { include: { images: { orderBy: { sortOrder: "asc" } }, inventory: true, categories: { include: { category: true } } } }, lensOption: true },
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
        include: { product: { include: { images: { orderBy: { sortOrder: "asc" } }, inventory: true, categories: { include: { category: true } } } }, lensOption: true },
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
          product: { include: { images: { orderBy: { sortOrder: "asc" } }, inventory: true, categories: { include: { category: true } } } },
          lensOption: true
        },
        orderBy: { createdAt: "asc" }
      },
      coupon: true
    }
  });
}

/**
 * Buy Now is a direct checkout for one selected cart row, while a normal cart
 * checkout includes every row. The short-lived item cookie avoids deleting a
 * shopper's other saved selections just to honour a direct-buy click.
 */
export async function getCheckoutCartOrNull(useFullCart = false) {
  const cart = await getCartOrNull();
  if (!cart || useFullCart) return cart;

  const cookieStore = await getCookieStore();
  const directItemId = cookieStore.get(DIRECT_CHECKOUT_ITEM_COOKIE)?.value;
  if (!directItemId) return cart;

  const selectedItems = cart.items.filter((item) => item.id === directItemId);
  return selectedItems.length ? { ...cart, items: selectedItems } : cart;
}

export async function getDirectCheckoutItemId() {
  const cookieStore = await getCookieStore();
  return cookieStore.get(DIRECT_CHECKOUT_ITEM_COOKIE)?.value ?? null;
}

export async function setDirectCheckoutItem(itemId: string) {
  const cookieStore = await getCookieStore();
  cookieStore.set(DIRECT_CHECKOUT_ITEM_COOKIE, itemId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    // A direct checkout is intentional but should never silently affect a
    // shopper's normal cart days later.
    maxAge: 15 * 60
  });
}

export async function clearDirectCheckoutItem() {
  const cookieStore = await getCookieStore();
  cookieStore.delete(DIRECT_CHECKOUT_ITEM_COOKIE);
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

// Never serialize the raw Prisma cart graph. Products in a cart include cost,
// barcode, supplier/publish fields, and exact inventory needed only for server
// validation. This DTO is safe for the browser and API consumers.
export function toPublicCart(cart: Awaited<ReturnType<typeof getCartOrNull>>) {
  if (!cart) return null;
  return {
    id: cart.id,
    coupon: cart.coupon ? { code: cart.coupon.code } : null,
    items: cart.items.map((item) => ({
      id: item.id,
      quantity: item.quantity,
      deliveryMethod: item.deliveryMethod,
      tryAtHome: item.tryAtHome,
      product: {
        slug: item.product.slug,
        sku: item.product.sku,
        name: item.product.name,
        brand: item.product.brand,
        pricePaise: item.product.pricePaise,
        images: item.product.images.map((image) => ({ url: image.url, alt: image.alt, role: image.role, sortOrder: image.sortOrder }))
      },
      lensOption: item.lensOption
        ? {
            code: item.lensOption.code,
            name: item.lensOption.name,
            description: item.lensOption.description,
            pricePaise: item.lensOption.pricePaise,
            active: item.lensOption.active,
            requiresPrescription: item.lensOption.requiresPrescription
          }
        : null
    }))
  };
}

export function calculateCartTotals(cart: Awaited<ReturnType<typeof getCartOrNull>>) {
  const items = cart?.items ?? [];
  const subtotalPaise = items.reduce((sum, item) => sum + (item.product.pricePaise ?? 0) * item.quantity, 0);
  const lensTotalPaise = items.reduce((sum, item) => sum + (item.lensOption?.pricePaise ?? 0) * item.quantity, 0);
  const shippingPaise = items.length ? 9900 : 0;

  // RX surcharge: ₹500 per item if any eye has sphere < -3.00
  const RX_SURCHARGE_PAISE = 50000; // ₹500
  const rxSurchargePaise = items.reduce((sum, item) => {
    const leftSph = item.rxLeftSph ?? 0;
    const rightSph = item.rxRightSph ?? 0;
    const needsSurcharge = leftSph < -3 || rightSph < -3;
    return sum + (needsSurcharge ? RX_SURCHARGE_PAISE * item.quantity : 0);
  }, 0);

  let discountPaise = 0;
  if (cart?.coupon) {
    const coupon = cart.coupon;
    const isExpired = coupon.expiresAt && new Date(coupon.expiresAt) < new Date();
    const isMaxedOut = coupon.maxUses && coupon.usedCount >= coupon.maxUses;
    const belowMinimum = coupon.minOrderPaise && (subtotalPaise + lensTotalPaise) < coupon.minOrderPaise;

    if (!isExpired && !isMaxedOut && !belowMinimum && coupon.active) {
      if (coupon.discountPaise) {
        discountPaise = coupon.discountPaise;
      } else if (coupon.discountPct) {
        discountPaise = Math.round((subtotalPaise + lensTotalPaise) * coupon.discountPct / 100);
      }

      // A malformed admin coupon must never turn a customer order into a
      // negative merchandise total. Shipping remains a separately disclosed
      // charge, but the discount itself cannot exceed the eligible items.
      discountPaise = Math.max(0, Math.min(discountPaise, subtotalPaise + lensTotalPaise));
    }
  }

  // Prices are final customer-facing amounts. Keep the persisted tax field at
  // zero for backwards-compatible order records, but never add a tax charge
  // to a new checkout.
  const merchandiseTotalPaise = subtotalPaise + lensTotalPaise + rxSurchargePaise - discountPaise;
  const taxPaise = 0;
  const grandTotalPaise = Math.max(0, merchandiseTotalPaise + shippingPaise);

  return {
    subtotalPaise,
    lensTotalPaise,
    rxSurchargePaise,
    shippingPaise,
    taxPaise,
    discountPaise,
    grandTotalPaise
  };
}
