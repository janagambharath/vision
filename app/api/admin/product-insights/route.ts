import { NextRequest, NextResponse } from "next/server";
import { getAdminAccess, isManagerOrOwner } from "@/lib/admin-auth";
import { assertSameOrigin } from "@/lib/request-security";
import {
  isTrustedProductImageUrl,
  productAiRequestSchema
} from "@/lib/product-ai";

import { generateWithOpenRouter } from "@/lib/product-ai-service";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const originError = assertSameOrigin(request);
  if (originError) return originError;

  const admin = await getAdminAccess();
  if (!admin) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  if (!isManagerOrOwner(admin.role)) return NextResponse.json({ error: "Manager access required" }, { status: 403 });

  if (!process.env.OPENROUTER_API_KEY) {
    return NextResponse.json(
      { error: "AI product enrichment is not configured. Add OPENROUTER_API_KEY to enable free image analysis." },
      { status: 503 }
    );
  }

  const parsedRequest = productAiRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsedRequest.success) return NextResponse.json({ error: "A valid uploaded product image is required." }, { status: 400 });
  if (!isTrustedProductImageUrl(parsedRequest.data.imageUrl)) {
    return NextResponse.json({ error: "AI enrichment only accepts an image uploaded to this store's Cloudinary account." }, { status: 400 });
  }

  try {
    const result = await generateWithOpenRouter(parsedRequest.data.imageUrl);
    return NextResponse.json({
      ...result,
      provider: "openrouter"
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("OpenRouter product enrichment failed", error instanceof Error ? error.message : error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "AI product enrichment could not complete. Try again shortly." }, { status: 502 });
  }
}
