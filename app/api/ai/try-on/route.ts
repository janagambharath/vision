import { NextResponse } from "next/server";
import { generateTryOnComposite } from "@/lib/integrations/ai-image";
import { rateLimit } from "@/lib/rate-limit";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { image, frameSlug } = body;

    if (!image || !frameSlug) {
      return NextResponse.json(
        { error: "Missing required fields (image, frameSlug)" },
        { status: 400 }
      );
    }

    // IP-based Rate Limit Check (5 requests per IP per minute)
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
    const rl = await rateLimit(`ai_try_on:${ip}`, 5, 60);
    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a minute before requesting another AI Try-On generation." },
        { status: 429 }
      );
    }

    // Call our modular AI integration service
    const generatedImageBase64 = await generateTryOnComposite(image, frameSlug);

    return NextResponse.json({
      success: true,
      source: "ai_enhanced",
      image: generatedImageBase64,
    });
  } catch (error: any) {
    console.error("[AI Try-On Error]", error);
    return NextResponse.json(
      { error: error.message || "An unexpected error occurred during AI generation." },
      { status: 500 }
    );
  }
}
