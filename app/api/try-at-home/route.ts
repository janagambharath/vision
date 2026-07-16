import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isRateLimited, rateLimit } from "@/lib/rate-limit";
import { assertSameOrigin } from "@/lib/request-security";
import { normalizePhone, tryAtHomeSchema } from "@/lib/validations";

export async function POST(request: Request) {
  const originError = assertSameOrigin(request);
  if (originError) return originError;

  if (await isRateLimited(request, { keyPrefix: "try-at-home", limit: 6, windowSeconds: 60 })) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = tryAtHomeSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const customerPhone = normalizePhone(parsed.data.phone);
  const phoneLimit = await rateLimit(`try-at-home:${customerPhone}`, 3, 24 * 60 * 60);
  if (!phoneLimit.allowed) {
    return NextResponse.json({ error: "Too many requests for this phone number. Please contact us if you need help." }, { status: 429 });
  }

  const eligibleProducts = await prisma.product.findMany({
    where: {
      slug: { in: parsed.data.productIds },
      status: "ACTIVE",
      deletedAt: null,
      tryAtHomeEligible: true
    },
    select: { slug: true, inventory: { select: { quantity: true, reservedStock: true } } }
  });
  if (
    eligibleProducts.length !== new Set(parsed.data.productIds).size ||
    new Set(parsed.data.productIds).size !== parsed.data.productIds.length ||
    eligibleProducts.some((product) => !product.inventory || product.inventory.quantity - product.inventory.reservedStock <= 0)
  ) {
    return NextResponse.json({ error: "One or more frames are unavailable for try at home" }, { status: 400 });
  }

  const created = await prisma.$transaction(async (tx) => {
    const homeTrial = await tx.tryAtHomeRequest.create({
      data: {
        name: parsed.data.name,
        phone: customerPhone,
        address: parsed.data.address,
        preferredDate: new Date(parsed.data.preferredDate),
        preferredSlot: parsed.data.preferredSlot,
        frameCount: parsed.data.productIds.length,
        productIds: parsed.data.productIds,
        serviceFeePaise: 0,
        depositPaise: 0,
        notes: parsed.data.notes
      }
    });
    await tx.lead.create({
      data: {
        name: parsed.data.name,
        phone: customerPhone,
        source: "api_try_at_home",
        status: "NEW",
        intent: "Try at home",
        payload: {
          requestId: homeTrial.id,
          productIds: parsed.data.productIds,
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
        body: `${parsed.data.name} requested ${parsed.data.productIds.length} frame(s) for ${parsed.data.preferredDate} (${parsed.data.preferredSlot}).`,
        status: "pending",
        entityType: "try_at_home_request",
        entityId: homeTrial.id,
        metadata: { productIds: parsed.data.productIds, preferredDate: parsed.data.preferredDate, preferredSlot: parsed.data.preferredSlot }
      }
    });
    return homeTrial;
  });

  return NextResponse.json({ ok: true, request: { id: created.id, status: created.status } });
}
