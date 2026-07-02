import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { isRateLimited } from "@/lib/rate-limit";
import { assertSameOrigin } from "@/lib/request-security";
import { analyticsEventSchema } from "@/lib/validations";

export async function POST(request: Request) {
  const originError = assertSameOrigin(request);
  if (originError) return originError;

  if (await isRateLimited(request, { keyPrefix: "analytics", limit: 60, windowSeconds: 60 })) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = analyticsEventSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid analytics event" }, { status: 400 });
  }

  await prisma.analyticsEvent.create({
    data: {
      event: parsed.data.name,
      sessionId: parsed.data.sessionId,
      source: parsed.data.source,
      path: parsed.data.path,
      metadata: (parsed.data.metadata ?? {}) as Prisma.InputJsonValue
    }
  }).catch(() => null);

  return NextResponse.json({ ok: true });
}
