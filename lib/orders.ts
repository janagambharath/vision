"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import { getCartOrNull, calculateCartTotals } from "@/lib/cart";
import { prisma } from "@/lib/db";
import { checkoutSchema, normalizePhone, tryAtHomeSchema } from "@/lib/validations";
import { uploadFormFile } from "@/lib/uploads";
import { getCustomerSession } from "@/lib/customer-auth";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { deletePrescriptionAsset, parsePrescriptionSubmission, PrescriptionValidationError } from "@/lib/prescriptions";
import { grantOrderAccess } from "@/lib/order-access";
import { sendOrderReceivedNotifications } from "@/lib/payment-fulfillment";
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

  const requiresPrescription = cart.items.some((item) => item.lensOption?.requiresPrescription);
  let prescriptionSubmission;
  try {
    prescriptionSubmission = parsePrescriptionSubmission(formData, requiresPrescription);
  } catch (error) {
    if (error instanceof PrescriptionValidationError) {
      redirect(`/frames/checkout?error=${encodeURIComponent(error.message)}`);
    }
    throw error;
  }

  // Every prescription lens order waits for clinical verification before lens
  // processing, whether its prescription was uploaded, entered manually, or is
  // still due after an eye-test / upload-later choice.
  const orderStatus = requiresPrescription ? "AWAITING_PRESCRIPTION" : "PENDING";
  let customerId: string | null = null;
  try {
    customerId = (await getCustomerSession())?.userId ?? null;
  } catch (error) {
    console.warn("Could not load customer session while creating order", error);
  }

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
            userId: customerId,
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

  // A prescription record (manual, upload, eye-test, or upload-later) must be
  // persisted with the order. Medical files are stored as authenticated assets.
  if (prescriptionSubmission) {
    let uploadResult: Awaited<ReturnType<typeof uploadFormFile>> = null;
    try {
      uploadResult = prescriptionSubmission.upload
        ? await uploadFormFile(prescriptionSubmission.upload, "vision-vistara/prescriptions", {
            maxBytes: 10 * 1024 * 1024,
            authenticated: true
          })
        : null;
      if (prescriptionSubmission.type === "UPLOAD" && !uploadResult) {
        throw new Error("Prescription file was empty.");
      }

      await prisma.prescription.create({
        data: {
          orderId: order.id,
          userId: customerId,
          type: prescriptionSubmission.type,
          status: prescriptionSubmission.status,
          ...prescriptionSubmission.values,
          fileUrl: uploadResult?.secureUrl,
          filePublicId: uploadResult?.publicId,
          fileResourceType: uploadResult?.resourceType,
          fileFormat: uploadResult?.format,
          fileName: uploadResult?.originalFilename
        }
      });
    } catch (uploadError) {
      console.error("Prescription persistence failed:", uploadError);
      if (uploadResult) {
        await deletePrescriptionAsset({
          filePublicId: uploadResult.publicId,
          fileResourceType: uploadResult.resourceType
        }).catch((cleanupError) => {
          console.error("Could not remove an unpersisted prescription asset", cleanupError);
        });
      }
      await prisma.$transaction(async (tx) => {
        await releaseOrderInventoryReservations(tx, order!.id);
        await tx.order.delete({ where: { id: order!.id } });
      });
      redirect("/frames/checkout?error=prescription-upload-failed");
    }
  }

  await prisma.cartItem.deleteMany({ where: { cartId: cart.id } });

  // Increment coupon usage counter
  if (cart.coupon && totals.discountPaise > 0) {
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
  } else if (cart.coupon) {
    // If there was a coupon but it was invalid (expired, min order not met), just detach it
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
    const offlineOrder = await prisma.order.findUnique({
      where: { id: order.id },
      select: {
        id: true,
        publicId: true,
        customerName: true,
        phone: true,
        email: true,
        subtotalPaise: true,
        lensTotalPaise: true,
        shippingPaise: true,
        discountPaise: true,
        grandTotalPaise: true,
        paymentMethod: true,
        items: { select: { quantity: true, unitPricePaise: true, productSnapshot: true, lensSnapshot: true } }
      }
    });
    if (offlineOrder) {
      await prisma.notification.create({
        data: {
          orderId: offlineOrder.id,
          channel: "SYSTEM",
          status: "PENDING",
          recipient: "fulfillment",
          subject: "Offline order requires confirmation",
          body: `${offlineOrder.paymentMethod} order ${offlineOrder.publicId} needs customer/payment confirmation before shipment.`,
          entityType: "Order",
          entityId: offlineOrder.id
        }
      });
      await sendOrderReceivedNotifications({
        ...offlineOrder,
        items: offlineOrder.items.map((item) => ({
          ...item,
          productSnapshot: item.productSnapshot as { brand?: string; name?: string; sku?: string },
          lensSnapshot: item.lensSnapshot as { name?: string } | null
        }))
      });
    }
    redirect(`/frames/orders/${publicId}`);
  }
}


export async function tryAtHomeAction(formData: FormData) {
  // This field is visually hidden from people but catches basic form-filling
  // bots before they can create leads or operational notifications.
  if (String(formData.get("website") ?? "").trim()) {
    redirect("/frames/try-at-home?error=invalid-details");
  }
  const productIds = formData.getAll("productIds").map(String);
  const parsed = tryAtHomeSchema.safeParse({
    ...Object.fromEntries(formData),
    productIds
  });

  if (!parsed.success) redirect("/frames/try-at-home?error=invalid-details");

  const uniqueProductIds = [...new Set(parsed.data.productIds)];
  if (uniqueProductIds.length !== parsed.data.productIds.length) {
    redirect("/frames/try-at-home?error=invalid-details");
  }

  const eligibleProducts = await prisma.product.findMany({
    where: {
      slug: { in: uniqueProductIds },
      status: "ACTIVE",
      deletedAt: null,
      tryAtHomeEligible: true
    },
    select: { slug: true, inventory: { select: { quantity: true, reservedStock: true } } }
  });
  if (
    eligibleProducts.length !== uniqueProductIds.length ||
    eligibleProducts.some((product) => !product.inventory || product.inventory.quantity - product.inventory.reservedStock <= 0)
  ) {
    redirect("/frames/try-at-home?error=frames-unavailable");
  }

  const phone = normalizePhone(parsed.data.phone);
  // A home-trial request creates operational work and stores a service address.
  // Limit repeat requests by the normalized phone number before any records are
  // created. The limiter HMACs its keys, so the number is never used verbatim
  // in Redis or the local fallback store.
  const requestLimit = await rateLimit(`home-trial:${phone}`, 3, 24 * 60 * 60);
  const ip = getClientIp(await headers());
  const ipLimit = await rateLimit(`home-trial-ip:${ip}`, 12, 60 * 60);
  if (!requestLimit.allowed || !ipLimit.allowed) {
    redirect("/frames/try-at-home?error=rate-limited");
  }
  const request = await prisma.$transaction(async (tx) => {
    const created = await tx.tryAtHomeRequest.create({
      data: {
        name: parsed.data.name,
        phone,
        address: parsed.data.address,
        preferredDate: new Date(parsed.data.preferredDate),
        preferredSlot: parsed.data.preferredSlot,
        frameCount: uniqueProductIds.length,
        productIds: uniqueProductIds,
        // This is an availability request only. Never record money that was
        // not collected through a payment flow.
        serviceFeePaise: 0,
        depositPaise: 0,
        notes: parsed.data.notes
      }
    });
    await tx.lead.create({
      data: {
        name: parsed.data.name,
        phone,
        source: "frames_try_at_home",
        status: "NEW",
        intent: "Try at home",
        payload: {
          requestId: created.id,
          productIds: uniqueProductIds,
          preferredDate: parsed.data.preferredDate,
          preferredSlot: parsed.data.preferredSlot
        }
      }
    });
    await tx.notification.create({
      data: {
        channel: "INTERNAL",
        recipient: "operations",
        subject: "Home-trial request needs confirmation",
        body: `${parsed.data.name} requested ${uniqueProductIds.length} frame(s) for ${parsed.data.preferredDate} (${parsed.data.preferredSlot}).`,
        status: "pending",
        entityType: "try_at_home_request",
        entityId: created.id,
        metadata: { productIds: uniqueProductIds, preferredDate: parsed.data.preferredDate, preferredSlot: parsed.data.preferredSlot }
      }
    });
    return created;
  });

  redirect(`/frames/try-at-home?request=${request.id}`);
}
