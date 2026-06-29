import { NextResponse } from "next/server";
import { HOME_TRIAL_DEPOSIT_PAISE, HOME_TRIAL_SERVICE_FEE_PAISE } from "@/lib/constants";
import { prisma } from "@/lib/db";
import { tryAtHomeSchema } from "@/lib/validations";

export async function POST(request: Request) {
  const body = await request.json();
  const parsed = tryAtHomeSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const created = await prisma.tryAtHomeRequest.create({
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

  return NextResponse.json({ ok: true, request: created });
}
