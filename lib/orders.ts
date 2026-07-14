"use server";

import { redirect } from "next/navigation";
import { randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import { HOME_TRIAL_DEPOSIT_PAISE, HOME_TRIAL_SERVICE_FEE_PAISE } from "@/lib/constants";
import { getCartOrNull, calculateCartTotals } from "@/lib/cart";
import { prisma } from "@/lib/db";
import { checkoutSchema, tryAtHomeSchema } from "@/lib/validations";
import { uploadFormFile } from "@/lib/uploads";
import { grantOrderAccess } from "@/lib/order-access";
import {
  getCheckoutReservationExpiry,
  InventoryReservationConflictError,
  InventoryUnavailableError,
  isOnlinePaymentMethod,
  releaseOrderInventoryReservations,
  reserveOrderInventory
} from "@/lib/inventory-reservations";

function makePublicOrderId() {
  return `VV-${randomBytes(16).toString("hex").toUpperCase()}`;
}

function isSerializationFailure(error: unknown) {
  return typeof error === "object" && error !== null && (error as { code?: string }).code === "P2034";
}

export async function checkoutAction(formData: FormData) {
  const parsed = checkoutSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) redirect("/frames/checkout?error=invalid-details");

  const cart = await getCartOrNull();
  if (!cart || cart.items.length === 0) redirect("/frames/cart?error=empty-cart");

  const hasUnpriced = cart.items.some(
    (item) =>
      item.product.status !== "ACTIVE" ||
      typeof item.product.pricePaise !== "number" ||
      (item.lensOption && (!item.lensOption.active || typeof item.lensOption.pricePaise !== "number"))
  );

  if (hasUnpriced) redirect("/frames/cart?error=pricing-required");

  const totals = calculateCartTotals(cart);
  const publicId = makePublicOrderId();
  const isOnlinePayment = isOnlinePaymentMethod(parsed.data.paymentMethod);

  // Handle Prescription logic
  const file = formData.get("prescription") as File | null;
  const requiresPrescription = cart.items.some(item => item.lensOptionId !== null);
  const prescriptionUploaded = file && file.size > 0;

  if (prescriptionUploaded && file) {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      redirect("/frames/checkout?error=invalid-prescription-type");
    }
    if (file.size > 10 * 1024 * 1024) {
      redirect("/frames/checkout?error=prescription-file-too-large");
    }
  }

  const orderStatus = (requiresPrescription && !prescriptionUploaded)
    ? "AWAITING_PRESCRIPTION"
    : "PENDING";

  let order: { id: string; publicId: string } | null = null;
  const reservationExpiresAt = getCheckoutReservationExpiry(parsed.data.paymentMethod);

  // Creating the order and allocating stock must be one serializable unit.
  // A short retry handles two customers buying the last frame at once.
  for (let attempt = 0; attempt < 3 && !order; attempt += 1) {
    try {
      order = await prisma.$transaction(async (tx) => {
        const created = await tx.order.create({
          data: {
            publicId,
            customerName: parsed.data.name,
            phone: parsed.data.phone,
            email: parsed.data.email || null,
            deliveryMethod: parsed.data.deliveryMethod,
            paymentMethod: parsed.data.paymentMethod,
            status: orderStatus,
            subtotalPaise: totals.subtotalPaise,
            lensTotalPaise: totals.lensTotalPaise,
            shippingPaise: totals.shippingPaise,
            taxPaise: totals.taxPaise,
            discountPaise: totals.discountPaise,
            grandTotalPaise: totals.grandTotalPaise,
            notes: parsed.data.notes,
            shippingAddress: {
              create: {
                name: parsed.data.name,
                phone: parsed.data.phone,
                line1: parsed.data.line1,
                line2: parsed.data.line2 || null,
                city: parsed.data.city,
                state: parsed.data.state || null,
                pincode: parsed.data.pincode
              }
            },
            items: {
              create: cart.items.map((item) => ({
                productId: item.productId,
                lensOptionId: item.lensOptionId,
                quantity: item.quantity,
                unitPricePaise: item.product.pricePaise ?? 0,
                lensPricePaise: item.lensOption?.pricePaise ?? 0,
                productSnapshot: {
                  slug: item.product.slug,
                  sku: item.product.sku,
                  name: item.product.name,
                  brand: item.product.brand
                },
                lensSnapshot: item.lensOption
                  ? {
                      code: item.lensOption.code,
                      name: item.lensOption.name
                    }
                  : undefined
              }))
            }
          }
        });

        await reserveOrderInventory(tx, created.id, cart.items, reservationExpiresAt);
        return { id: created.id, publicId: created.publicId };
      }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
    } catch (error) {
      if (error instanceof InventoryUnavailableError) {
        redirect("/frames/cart?error=out-of-stock");
      }
      if (!(error instanceof InventoryReservationConflictError || isSerializationFailure(error)) || attempt === 2) {
        throw error;
      }
    }
  }

  if (!order) {
    redirect("/frames/cart?error=out-of-stock");
  }

  // A prescription upload must either persist successfully or the just-created
  // order is removed. Placeholder URLs are never acceptable medical records.
  if (prescriptionUploaded && file) {
    try {
      const uploadResult = await uploadFormFile(file, "vision-vistara/prescriptions");
      if (!uploadResult) throw new Error("Prescription file was empty.");

      await prisma.prescription.create({
        data: {
          orderId: order.id,
          fileUrl: uploadResult.secureUrl,
          fileName: file.name
        }
      });
    } catch (uploadError) {
      console.error("Prescription upload to Cloudinary failed:", uploadError);
      await prisma.$transaction(async (tx) => {
        await releaseOrderInventoryReservations(tx, order!.id);
        await tx.order.delete({ where: { id: order!.id } });
      });
      redirect("/frames/checkout?error=prescription-upload-failed");
    }
  }

  await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });

  // Increment coupon usage counter
  if (cart.coupon) {
    await prisma.coupon.update({
      where: { id: cart.coupon.id },
      data: { usedCount: { increment: 1 } }
    });
    await prisma.order.update({
      where: { id: order.id },
      data: { couponCode: cart.coupon.code }
    });
    // Detach coupon from cart after use
    await prisma.cart.update({
      where: { id: cart.id },
      data: { couponId: null }
    });
  }

  await grantOrderAccess(order.publicId, "tracking", 30 * 60);
  await grantOrderAccess(order.publicId, "checkout", 60 * 60);
  
  if (isOnlinePayment) {
    redirect(`/frames/checkout/pay/${publicId}`);
  } else {
    redirect(`/frames/orders/${publicId}`);
  }
}


export async function tryAtHomeAction(formData: FormData) {
  const productIds = formData.getAll("productIds").map(String);
  const parsed = tryAtHomeSchema.safeParse({
    ...Object.fromEntries(formData),
    productIds
  });

  if (!parsed.success) redirect("/frames/try-at-home?error=invalid-details");

  const request = await prisma.tryAtHomeRequest.create({
    data: {
      name: parsed.data.name,
      phone: parsed.data.phone,
      address: parsed.data.address,
      preferredDate: new Date(parsed.data.preferredDate),
      preferredSlot: parsed.data.preferredSlot,
      frameCount: parsed.data.productIds.length,
      productIds: parsed.data.productIds,
      serviceFeePaise: HOME_TRIAL_SERVICE_FEE_PAISE,
      depositPaise: parsed.data.productIds.length >= 3 ? HOME_TRIAL_DEPOSIT_PAISE : 0,
      notes: parsed.data.notes
    }
  });

  await prisma.lead.create({
    data: {
      name: parsed.data.name,
      phone: parsed.data.phone,
      source: "frames_try_at_home",
      status: "HOME_TRIAL_BOOKED",
      intent: "Try at home",
      payload: {
        requestId: request.id,
        productIds: parsed.data.productIds,
        preferredDate: parsed.data.preferredDate,
        preferredSlot: parsed.data.preferredSlot
      }
    }
  });

  redirect(`/frames/try-at-home?request=${request.id}`);
}
