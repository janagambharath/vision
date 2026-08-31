import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { isRateLimited } from "@/lib/rate-limit";
import { assertSameOrigin } from "@/lib/request-security";
import { z } from "zod";

const faceMeasurementSchema = z.object({
  sessionId: z.string().trim().max(120).optional(),
  faceWidthMm: z.number().nullable().optional(),
  faceHeightMm: z.number().nullable().optional(),
  estimatedPdMm: z.number().nullable().optional(),
  interocularWidthMm: z.number().nullable().optional(),
  noseWidthMm: z.number().nullable().optional(),
  faceShape: z.string().trim().max(40).nullable().optional(),
  recommendedSize: z.string().trim().max(40).nullable().optional(),
  measurementQuality: z.string().trim().max(40).optional(),
  calibrationMethod: z.string().trim().max(40).optional(),
  calibrationConfidence: z.number().min(0).max(1).optional(),
});

export async function POST(request: Request) {
  const originError = assertSameOrigin(request);
  if (originError) return originError;

  if (await isRateLimited(request, { keyPrefix: "face-measurement", limit: 20, windowSeconds: 60 })) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const body = await request.json().catch(() => null);
  const parsed = faceMeasurementSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid measurement data" }, { status: 400 });
  }

  const data = parsed.data;

  try {
    const record = await prisma.faceMeasurement.create({
      data: {
        sessionId: data.sessionId ?? crypto.randomUUID(),
        faceWidthMm: data.faceWidthMm ?? null,
        faceHeightMm: data.faceHeightMm ?? null,
        estimatedPdMm: data.estimatedPdMm ?? null,
        interocularWidthMm: data.interocularWidthMm ?? null,
        noseWidthMm: data.noseWidthMm ?? null,
        faceShape: data.faceShape ?? null,
        recommendedSize: data.recommendedSize ?? null,
        measurementQuality: data.measurementQuality ?? null,
        calibrationMethod: data.calibrationMethod ?? null,
        calibrationConfidence: data.calibrationConfidence ?? null,
      },
    });

    return NextResponse.json({ ok: true, id: record.id });
  } catch {
    return NextResponse.json({ error: "Failed to save measurement" }, { status: 500 });
  }
}
