"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { clearDirectCheckoutItem, getOrCreateCart, setDirectCheckoutItem } from "@/lib/cart";

type CartDestination = "/frames/cart" | "/frames/checkout";

/**
 * Adds a validated product selection to the shopper's existing cart.
 *
 * Keeping this mutation in one place makes the normal cart journey and
 * Buy Now journey enforce the exact same price, stock, lens, and quantity
 * checks. Buy Now creates a short-lived direct checkout selection, so it
 * checks out the selected configuration without deleting the existing cart.
 */
async function addProductSelection(formData: FormData, destination: CartDestination) {
  const slug = String(formData.get("slug") ?? "");
  const lensCode = String(formData.get("lensCode") ?? "");
  const rawQuantity = Number(formData.get("quantity") ?? 1);
  const requestedQty = Number.isFinite(rawQuantity)
    ? Math.max(1, Math.min(5, Math.trunc(rawQuantity)))
    : 1;
  const rawDeliveryMethod = String(formData.get("deliveryMethod") ?? "DELIVERY");
  if (rawDeliveryMethod !== "DELIVERY") {
    redirect(`/frames/${slug}?blocked=delivery-unavailable`);
  }
  const deliveryMethod = "DELIVERY" as const;

  const product = await prisma.product.findUnique({
    where: { slug },
    include: { inventory: true }
  });

  if (!product || product.status !== "ACTIVE" || typeof product.pricePaise !== "number") {
    redirect(`/frames/${slug}?blocked=price-required`);
  }
  if (!product.codAvailable) {
    redirect(`/frames/${slug}?blocked=cod-unavailable`);
  }

  const availableStock = Math.max(0, (product.inventory?.quantity ?? 0) - (product.inventory?.reservedStock ?? 0));
  if (product.inventory?.status === "OUT_OF_STOCK" || availableStock <= 0) {
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
  if (lensOption?.requiresPrescription && !product.prescriptionCompatible) {
    redirect(`/frames/${slug}?blocked=lens-unavailable`);
  }

  const cart = await getOrCreateCart();

  if (destination === "/frames/checkout") {
    if (requestedQty > availableStock) {
      redirect(`/frames/${slug}?blocked=insufficient-stock`);
    }

    // Keep Buy Now independent from any identical item already in the cart;
    // otherwise incrementing the normal cart row would change the direct-buy
    // quantity and make the checkout surprising.
    const directItem = await prisma.cartItem.create({
      data: {
        cartId: cart.id,
        productId: product.id,
        lensOptionId: lensOption?.id,
        quantity: requestedQty,
        deliveryMethod,
        tryAtHome: false
      }
    });
    await setDirectCheckoutItem(directItem.id);

    redirect(destination);
  }

  await clearDirectCheckoutItem();

  // Check if same product+lens already in cart
  const existingItem = cart.items.find(
    (item) => item.productId === product.id && item.lensOptionId === (lensOption?.id ?? null)
  );

  const currentQtyInCart = existingItem?.quantity ?? 0;
  const newQty = currentQtyInCart + requestedQty;

  if (newQty > availableStock) {
    redirect(`/frames/${slug}?blocked=insufficient-stock`);
  }

  if (existingItem) {
    await prisma.cartItem.update({
      where: { id: existingItem.id },
      data: { quantity: Math.min(5, newQty) }
    });
  } else {
    await prisma.cartItem.create({
      data: {
        cartId: cart.id,
        productId: product.id,
        lensOptionId: lensOption?.id,
        quantity: requestedQty,
        deliveryMethod,
        tryAtHome: false
      }
    });
  }

  redirect(destination);
}

export async function addToCart(formData: FormData) {
  await addProductSelection(formData, "/frames/cart");
}

/**
 * Add the currently selected frame/lens configuration, then continue to the
 * checkout. This is intentionally a server action rather than a client-side
 * redirect so stock and pricing are verified before checkout is shown.
 */
export async function buyNow(formData: FormData) {
  await addProductSelection(formData, "/frames/checkout");
}

export async function removeCartItem(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (id) {
    const cart = await getOrCreateCart();
    // Scope mutations to the caller's httpOnly cart session. A CartItem CUID
    // alone must never authorize modifying another visitor's cart.
    await prisma.cartItem.deleteMany({ where: { id, cartId: cart.id } });
  }
  await clearDirectCheckoutItem();
  redirect("/frames/cart");
}

export async function updateCartItemQuantity(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const rawQuantity = Number(formData.get("quantity") ?? 1);
  const quantity = Number.isSafeInteger(rawQuantity) ? rawQuantity : 0;

  if (id && quantity >= 1 && quantity <= 5) {
    const cart = await getOrCreateCart();
    const item = await prisma.cartItem.findFirst({
      where: { id, cartId: cart.id },
      include: { product: { include: { inventory: true } } }
    });

    if (item) {
      const availableStock = Math.max(0, (item.product.inventory?.quantity ?? 0) - (item.product.inventory?.reservedStock ?? 0));
      if (quantity > availableStock) {
        redirect("/frames/cart?error=insufficient-stock");
      }
      await prisma.cartItem.updateMany({
        where: { id, cartId: cart.id },
        data: { quantity }
      });
    }
  }
  await clearDirectCheckoutItem();
  redirect("/frames/cart");
}

export async function applyCouponAction(formData: FormData) {
  const code = String(formData.get("code") ?? "").trim().toUpperCase();
  const cart = await getOrCreateCart();
  await clearDirectCheckoutItem();

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
  await clearDirectCheckoutItem();
  await prisma.cart.update({
    where: { id: cart.id },
    data: { couponId: null }
  });
  redirect("/frames/cart");
}

export async function updateCartItemPrescription(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const rxLeftSph = formData.get("rxLeftSph") ? Number(formData.get("rxLeftSph")) : null;
  const rxRightSph = formData.get("rxRightSph") ? Number(formData.get("rxRightSph")) : null;

  if (id) {
    const cart = await getOrCreateCart();
    await prisma.cartItem.updateMany({
      where: { id, cartId: cart.id },
      data: {
        rxLeftSph: rxLeftSph !== null && !isNaN(rxLeftSph) ? rxLeftSph : null,
        rxRightSph: rxRightSph !== null && !isNaN(rxRightSph) ? rxRightSph : null
      }
    }).catch(() => null);
  }
  await clearDirectCheckoutItem();
  redirect("/frames/cart");
}
