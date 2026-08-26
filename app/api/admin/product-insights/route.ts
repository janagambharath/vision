import { NextRequest, NextResponse } from "next/server";
import { getAdminAccess, isManagerOrOwner } from "@/lib/admin-auth";
import { assertSameOrigin } from "@/lib/request-security";
import {
  isTrustedProductImageUrl,
  openRouterChatText,
  openRouterResponseModel,
  productAiDraftSchema,
  productAiRequestSchema,
  type ProductAiDraft
} from "@/lib/product-ai";
import { createProductAnalysisToken } from "@/lib/product-ai-analysis";

export const runtime = "nodejs";

const productDraftJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "name", "brand", "shortDescription", "description", "material", "colour", "finish", "shape", "rimType",
    "gender", "ageGroup", "size", "measurements", "weightGrams", "frameWidth", "lensWidth", "bridgeWidth",
    "templeLength", "frameHeight", "pdRange", "highlights", "faceShapes", "lensCompatibility", "seoTitle",
    "seoDescription", "seoKeywords", "categoryHint", "confidence", "needsReview"
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
    size: { type: "string", maxLength: 80 },
    measurements: { type: "string", maxLength: 140 },
    weightGrams: { type: ["number", "null"], minimum: 0, maximum: 500 },
    frameWidth: { type: ["number", "null"], minimum: 0, maximum: 300 },
    lensWidth: { type: ["number", "null"], minimum: 0, maximum: 200 },
    bridgeWidth: { type: ["number", "null"], minimum: 0, maximum: 100 },
    templeLength: { type: ["number", "null"], minimum: 0, maximum: 250 },
    frameHeight: { type: ["number", "null"], minimum: 0, maximum: 200 },
    pdRange: { type: "string", maxLength: 40 },
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

const instructions = [
  "You prepare a first draft of an optical ecommerce product listing from one frame photograph.",
  "Return only the requested JSON schema. Never invent a price, SKU, barcode, stock quantity, warranty, return policy, or technical certification.",
  "Measurements are allowed only when a size marking is clearly visible and readable on the frame or image. Transcribe that marking exactly when possible; otherwise return empty strings and null numeric measurements. Never estimate physical dimensions or weight from pixels.",
  "Only name a brand when it is clearly readable on the frame or image. Leave uncertain fields as empty strings or empty arrays and explain uncertainty in needsReview.",
  "The image can show the frame by itself or a person wearing it. When a person is present, analyse only the visible eyewear and its fit or styling as product context. Do not identify, describe, or infer personal attributes about the person.",
  "Describe visible product attributes conservatively. Lens compatibility and face-shape suggestions are editorial suggestions, not verified optical claims, and must be included in needsReview when present.",
  "Use Indian English. Keep marketing copy factual, concise, and suitable for a premium eyewear catalog."
].join(" ");

const productEnrichmentModels = [
  { id: "google/gemma-4-31b-it:free" },
  { id: "google/gemma-4-26b-a4b-it:free" },
  { id: "minimax/minimax-m3:free" }
] as const;

const emptyProductAiDraft: ProductAiDraft = {
  name: "", brand: "", shortDescription: "", description: "", material: "", colour: "", finish: "", shape: "", rimType: "",
  gender: "", ageGroup: "", size: "", measurements: "", weightGrams: null, frameWidth: null, lensWidth: null,
  bridgeWidth: null, templeLength: null, frameHeight: null, pdRange: "", highlights: [], faceShapes: [], lensCompatibility: [],
  seoTitle: "", seoDescription: "", seoKeywords: [], categoryHint: "", confidence: "low", needsReview: []
};

function requestedSiteUrl() {
  return process.env.OPENROUTER_SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || process.env.AUTH_URL || "http://localhost:3000";
}

function parseDraft(text: string): ProductAiDraft | null {
  try {
    const json = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    const partial = productAiDraftSchema.partial().safeParse(JSON.parse(json));
    if (!partial.success || Object.keys(partial.data).length === 0) return null;
    return { ...emptyProductAiDraft, ...partial.data };
  } catch {
    return null;
  }
}

async function generateWithOpenRouter(imageUrl: string) {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OpenRouter product enrichment is not configured.");

  for (const [index, candidate] of productEnrichmentModels.entries()) {
    try {
      const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": requestedSiteUrl(),
          "X-Title": "Vision Vistara Product Enrichment"
        },
        body: JSON.stringify({
          model: candidate.id,
          provider: { require_parameters: true },
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content: `${instructions} Return exactly one JSON object with no markdown or prose, matching this JSON Schema: ${JSON.stringify(productDraftJsonSchema)}`
            },
            {
              role: "user",
              content: [
                { type: "text", text: "Inspect this uploaded eyewear image and create a catalog draft for staff review. It may be a standalone frame or a person wearing the frame; analyse the eyewear only." },
                { type: "image_url", image_url: { url: imageUrl } }
              ]
            }
          ],
          max_tokens: 1_200,
          temperature: 0.1
        }),
        signal: AbortSignal.timeout(25_000)
      });

      if (!response.ok) {
        console.warn("OpenRouter product enrichment request failed", {
          status: response.status,
          requestId: response.headers.get("x-request-id"),
          model: candidate.id
        });
        continue;
      }

      const payload = await response.json();
      const content = openRouterChatText(payload) ?? "";
      const draft = parseDraft(content);
      if (!draft) {
        console.warn("OpenRouter product enrichment returned an invalid draft", {
          model: openRouterResponseModel(payload, candidate.id),
          responseLength: content.length
        });
        continue;
      }

      return {
        draft,
        model: openRouterResponseModel(payload, candidate.id),
        fallbackUsed: index > 0
      };
    } catch (error) {
      console.warn("OpenRouter product enrichment request threw", {
        model: candidate.id,
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }

  throw new Error("Neither configured free image model could complete the product draft.");
}

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
      provider: "openrouter",
      analysisToken: createProductAnalysisToken({ imageUrl: parsedRequest.data.imageUrl, draft: result.draft })
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("OpenRouter product enrichment failed", error instanceof Error ? error.message : error);
  }

  return NextResponse.json({ error: "AI product enrichment could not complete. Try again shortly." }, { status: 502 });
}
