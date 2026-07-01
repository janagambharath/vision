import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/rate-limit";

/**
 * AI Try-On API Route
 *
 * This endpoint receives a composite image (user photo with frame overlay)
 * and optionally enhances it using an AI model.
 *
 * IMPORTANT: This route is modular. The AI model can be swapped by changing
 * the model URL and parameters below. The UI does not depend on which model
 * is used — it only cares about the response format.
 *
 * Current model: Hugging Face Inference API (Stable Diffusion img2img)
 * Alternatives: Any image-to-image model, ComfyUI, Replicate, etc.
 */

// Model configuration — swap these to change the AI backend
const AI_CONFIG = {
  provider: "huggingface",
  model: "stabilityai/stable-diffusion-xl-refiner-1.0",
  prompt:
    "Highly realistic professional studio portrait photograph, person wearing premium eyeglasses, natural lighting, sharp focus, 8k resolution, photorealistic",
  strength: 0.12, // Very low to preserve face and frame
  guidanceScale: 7.5,
};

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";
    const rl = await rateLimit(`ai_try_on:${ip}`, 5, 3600);

    if (!rl.allowed) {
      return NextResponse.json(
        { error: "Too many AI generation requests. Try again later." },
        { status: 429 }
      );
    }

    const { image, frameSlug } = await request.json();

    if (!image || !frameSlug) {
      return NextResponse.json(
        { error: "Missing image or frame slug" },
        { status: 400 }
      );
    }

    const hfToken = process.env.HUGGINGFACE_API_KEY;

    if (!hfToken) {
      // No API key configured — return honest response
      // The UI will show the composite preview without pretending it's AI-enhanced
      return NextResponse.json({
        success: true,
        image: null,
        source: "unavailable",
        message:
          "AI enhancement is not configured. The composite preview from your camera is ready to use.",
      });
    }

    try {
      const base64Data = image.replace(/^data:image\/\w+;base64,/, "");

      const response = await fetch(
        `https://api-inference.huggingface.co/models/${AI_CONFIG.model}`,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${hfToken}`,
          },
          method: "POST",
          body: JSON.stringify({
            inputs: AI_CONFIG.prompt,
            parameters: {
              image: base64Data,
              strength: AI_CONFIG.strength,
              guidance_scale: AI_CONFIG.guidanceScale,
            },
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error");
        console.warn(
          `HF API responded with ${response.status}: ${errorText}`
        );

        // Return honest failure — no fake results
        return NextResponse.json({
          success: true,
          image: null,
          source: "unavailable",
          message:
            "AI model is temporarily unavailable. Your composite preview is ready to use.",
        });
      }

      // Read response as binary image
      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);
      const generatedBase64 = `data:image/jpeg;base64,${buffer.toString("base64")}`;

      return NextResponse.json({
        success: true,
        image: generatedBase64,
        source: "ai_enhanced",
      });
    } catch (apiError) {
      console.warn("AI generation failed:", apiError);

      return NextResponse.json({
        success: true,
        image: null,
        source: "unavailable",
        message:
          "AI enhancement could not complete. Your composite preview is ready to use.",
      });
    }
  } catch (error) {
    console.error("AI Try-On API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
