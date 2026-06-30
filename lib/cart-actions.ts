"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getOrCreateCart } from "@/lib/cart";

export async function addToCart(formData: FormData) {
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
  const id = String(formData.get("id") ?? "");
  if (id) {
    await prisma.cartItem.delete({ where: { id } }).catch(() => null);
  }
  redirect("/frames/cart");
}

export async function updateCartItemQuantity(formData: FormData) {
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
  const cart = await getOrCreateCart();
  await prisma.cart.update({
    where: { id: cart.id },
    data: { couponId: null }
  });
  redirect("/frames/cart");
}
