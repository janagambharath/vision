import { NextResponse } from "next/server";
import { HOME_TRIAL_DEPOSIT_PAISE, HOME_TRIAL_SERVICE_FEE_PAISE } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { isRateLimited } from "@/lib/rate-limit";
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

  const eligibleProducts = await prisma.product.findMany({
    where: {
      slug: { in: parsed.data.productIds },
      status: "ACTIVE",
      tryAtHomeEligible: true
    },
    select: { slug: true }
  });
  if (eligibleProducts.length !== new Set(parsed.data.productIds).size) {
    return NextResponse.json({ error: "One or more frames are unavailable for try at home" }, { status: 400 });
  }

  const created = await prisma.tryAtHomeRequest.create({
    data: {
      name: parsed.data.name,
      phone: customerPhone,
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

  return NextResponse.json({ ok: true, request: created });
}
