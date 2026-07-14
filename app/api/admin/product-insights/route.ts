import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { isRateLimited } from "@/lib/rate-limit";
import { assertSameOrigin } from "@/lib/request-security";
import {
  isTrustedProductImageUrl,
  productAiDraftSchema,
  productAiRequestSchema
} from "@/lib/product-ai";

export const runtime = "nodejs";

const productDraftJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "name", "brand", "shortDescription", "description", "material", "colour", "finish", "shape", "rimType",
    "gender", "ageGroup", "highlights", "faceShapes", "lensCompatibility", "seoTitle", "seoDescription",
    "seoKeywords", "categoryHint", "confidence", "needsReview"
  ],
  properties: {
    name: { type: "string", maxLength: 120 },
    brand: { type: "string", maxLength: 120 },
    shortDescription: { type: "string", maxLength: 220 },
    description: { type: "string", maxLength: 1500 },
    material: { type: "string", maxLength: 600 },
    colour: { type: "string", maxLength: 600 },
    finish: { type: "string", maxLength: 600 },
    shape: { type: "string", maxLength: 600 },
    rimType: { type: "string", maxLength: 600 },
    gender: { type: "string", enum: ["", "Men", "Women", "Unisex", "Kids"] },
    ageGroup: { type: "string", enum: ["", "Adult", "Teen", "Kids"] },
    highlights: { type: "array", items: { type: "string", maxLength: 180 }, maxItems: 6 },
    faceShapes: { type: "array", items: { type: "string", maxLength: 80 }, maxItems: 12 },
    lensCompatibility: { type: "array", items: { type: "string", maxLength: 80 }, maxItems: 12 },
    seoTitle: { type: "string", maxLength: 70 },
    seoDescription: { type: "string", maxLength: 180 },
    seoKeywords: { type: "array", items: { type: "string", maxLength: 80 }, maxItems: 12 },
    categoryHint: { type: "string", maxLength: 80 },
    confidence: { type: "string", enum: ["high", "medium", "low"] },
    needsReview: { type: "array", items: { type: "string", maxLength: 180 }, maxItems: 8 }
  }
} as const;

function outputText(payload: unknown) {
  if (!payload || typeof payload !== "object") return null;
  const output = (payload as { output?: unknown }).output;
  if (!Array.isArray(output)) return null;

  for (const item of output) {
    if (!item || typeof item !== "object") continue;
    const content = (item as { content?: unknown }).content;
    if (!Array.isArray(content)) continue;
    for (const part of content) {
      if (!part || typeof part !== "object") continue;
      const typedPart = part as { type?: unknown; text?: unknown };
      if (typedPart.type === "output_text" && typeof typedPart.text === "string") return typedPart.text;
    }
  }

  return null;
}

export async function POST(request: NextRequest) {
  const originError = assertSameOrigin(request);
  if (originError) return originError;

  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  if (await isRateLimited(request, { keyPrefix: "admin-product-ai", limit: 12, windowSeconds: 3_600 })) {
    return NextResponse.json({ error: "AI product drafts are limited to 12 per hour." }, { status: 429 });
  }

  if (!process.env.OPENAI_API_KEY) {
    return NextResponse.json(
      { error: "AI product enrichment is not configured. Add OPENAI_API_KEY to enable it." },
      { status: 503 }
    );
  }

  const parsedRequest = productAiRequestSchema.safeParse(await request.json().catch(() => null));
  if (!parsedRequest.success) {
    return NextResponse.json({ error: "A valid uploaded product image is required." }, { status: 400 });
  }

  if (!isTrustedProductImageUrl(parsedRequest.data.imageUrl)) {
    return NextResponse.json(
      { error: "AI enrichment only accepts an image uploaded to this store's Cloudinary account." },
      { status: 400 }
    );
  }

  const model = process.env.OPENAI_PRODUCT_ENRICHMENT_MODEL || "gpt-5-mini";
  const instructions = [
    "You prepare a first draft of an optical ecommerce product listing from one frame photograph.",
    "Return only the JSON schema requested. Never invent a price, SKU, barcode, stock quantity, measurements, brand, warranty, return policy, or technical certification.",
    "Only name a brand when it is clearly readable on the frame or image. Leave uncertain fields as empty strings or empty arrays and explain uncertainty in needsReview.",
    "Describe visible product attributes conservatively. Lens compatibility and face-shape suggestions are editorial suggestions, not verified optical claims, and must be included in needsReview when present.",
    "Use Indian English. Keep marketing copy factual, concise, and suitable for a premium eyewear catalog."
  ].join(" ");

  try {
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        store: false,
        instructions,
        input: [{
          role: "user",
          content: [
            { type: "input_text", text: "Inspect this uploaded eyewear frame image and create a catalog draft for staff review." },
            { type: "input_image", image_url: parsedRequest.data.imageUrl, detail: "high" }
          ]
        }],
        text: {
          format: {
            type: "json_schema",
            name: "eyewear_product_draft",
            strict: true,
            schema: productDraftJsonSchema
          }
        }
      }),
      signal: AbortSignal.timeout(45_000)
    });

    if (!response.ok) {
      console.error("Product AI request failed", { status: response.status, requestId: response.headers.get("x-request-id") });
      return NextResponse.json({ error: "AI product enrichment could not complete. Try again shortly." }, { status: 502 });
    }

    const text = outputText(await response.json());
    if (!text) {
      return NextResponse.json({ error: "AI product enrichment returned no draft." }, { status: 502 });
    }

    const draft = productAiDraftSchema.safeParse(JSON.parse(text));
    if (!draft.success) {
      console.error("Product AI returned an invalid product draft", draft.error.flatten());
      return NextResponse.json({ error: "AI product enrichment returned an invalid draft. Please try again." }, { status: 502 });
    }

    return NextResponse.json({ draft: draft.data, model }, {
      headers: { "Cache-Control": "no-store" }
    });
  } catch (error) {
    console.error("Product AI enrichment failed", error);
    return NextResponse.json({ error: "AI product enrichment could not complete. Try again shortly." }, { status: 502 });
  }
}
