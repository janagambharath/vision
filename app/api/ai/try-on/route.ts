import { NextResponse } from "next/server";
import { generateTryOnComposite } from "@/lib/integrations/ai-image";

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
