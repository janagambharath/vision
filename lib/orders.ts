"use server";

import { redirect } from "next/navigation";
import type { Prisma } from "@prisma/client";
import { HOME_TRIAL_DEPOSIT_PAISE, HOME_TRIAL_SERVICE_FEE_PAISE } from "@/lib/constants";
import { getCartOrNull, calculateCartTotals } from "@/lib/cart";
import { prisma } from "@/lib/db";
import { checkoutSchema, tryAtHomeSchema } from "@/lib/validations";
import { createRazorpayOrder } from "@/lib/integrations/razorpay";
import { configureCloudinary } from "@/lib/integrations/cloudinary";

function makePublicOrderId() {
  return `VV-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
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

  const order = await prisma.order.create({
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

  // Handle Prescription Upload
  if (prescriptionUploaded && file) {
    try {
      const buffer = Buffer.from(await file.arrayBuffer());
      const base64 = `data:${file.type};base64,${buffer.toString("base64")}`;
      const cloudinary = configureCloudinary();
      const uploadResult = await new Promise<any>((resolve, reject) => {
        cloudinary.uploader.upload(base64, { folder: "prescriptions" }, (err, res) => {
          if (err) reject(err);
          else resolve(res);
        });
      });

      await prisma.prescription.create({
        data: {
          orderId: order.id,
          fileUrl: uploadResult.secure_url,
          fileName: file.name
        }
      });
    } catch (uploadError) {
      console.error("Prescription upload to Cloudinary failed:", uploadError);
    }
  }

  const isOnlinePayment = ["RAZORPAY", "UPI", "CARD", "NETBANKING"].includes(parsed.data.paymentMethod);

  if (isOnlinePayment) {
    try {
      const razorpayOrder = await createRazorpayOrder({
        amountPaise: totals.grandTotalPaise,
        receipt: publicId,
        notes: { orderId: order.id, publicId }
      });

      await prisma.payment.create({
        data: {
          id: `payment-${order.id}`,
          orderId: order.id,
          providerOrderId: razorpayOrder.id,
          amountPaise: totals.grandTotalPaise,
          status: "PENDING",
          rawPayload: JSON.parse(JSON.stringify(razorpayOrder)) as Prisma.InputJsonValue
        }
      });
    } catch {
      await prisma.payment.create({
        data: {
          id: `payment-${order.id}`,
          orderId: order.id,
          amountPaise: totals.grandTotalPaise,
          status: "PENDING",
          rawPayload: { note: "Razorpay not configured; WhatsApp-assisted fallback required." }
        }
      });
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
