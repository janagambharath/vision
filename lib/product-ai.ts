import { z } from "zod";

const optionalText = z.string().trim().max(600);
const keywordList = z.array(z.string().trim().min(1).max(80)).max(12);

/**
 * The catalog fields that a vision model may suggest from product photography.
 * Pricing, SKU, stock, warranty, and return policy are excluded. Measurements
 * are accepted only when the model can read a printed frame marking; it must
 * leave them blank rather than estimating physical dimensions from pixels.
 */
export const productAiDraftSchema = z.object({
  name: z.string().trim().max(120),
  brand: z.string().trim().max(120),
  shortDescription: z.string().trim().max(220),
  description: z.string().trim().max(1_500),
  material: optionalText,
  colour: optionalText,
  finish: optionalText,
  shape: optionalText,
  rimType: optionalText,
  gender: z.enum(["", "Men", "Women", "Unisex", "Kids"]),
  ageGroup: z.enum(["", "Adult", "Teen", "Kids"]),
  size: z.string().trim().max(80),
  measurements: z.string().trim().max(140),
  weightGrams: z.number().finite().min(0).max(500).nullable(),
  frameWidth: z.number().finite().min(0).max(300).nullable(),
  lensWidth: z.number().finite().min(0).max(200).nullable(),
  bridgeWidth: z.number().finite().min(0).max(100).nullable(),
  templeLength: z.number().finite().min(0).max(250).nullable(),
  frameHeight: z.number().finite().min(0).max(200).nullable(),
  pdRange: z.string().trim().max(40),
  highlights: z.array(z.string().trim().min(1).max(180)).max(6),
  faceShapes: keywordList,
  lensCompatibility: keywordList,
  seoTitle: z.string().trim().max(70),
  seoDescription: z.string().trim().max(180),
  seoKeywords: keywordList,
  categoryHint: z.string().trim().max(80),
  confidence: z.enum(["high", "medium", "low"]),
  needsReview: z.array(z.string().trim().min(1).max(180)).max(8)
});

export type ProductAiDraft = z.infer<typeof productAiDraftSchema>;

export const productAiRequestSchema = z.object({
  imageUrl: z.string().url().max(2_048)
});

/** Product enrichment accepts only first-party Cloudinary product assets. */
export function isTrustedProductImageUrl(value: string) {
  try {
    const url = new URL(value);
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    if (!cloudName || url.protocol !== "https:" || url.hostname !== "res.cloudinary.com") return false;

    const [assetCloudName, resourceType] = url.pathname.split("/").filter(Boolean);
    return assetCloudName === cloudName && ["image", "video"].includes(resourceType ?? "");
  } catch {
    return false;
  }
}

/** Extracts OpenRouter's OpenAI-compatible non-streaming chat content. */
export function openRouterChatText(payload: unknown) {
  if (!payload || typeof payload !== "object") return null;
  const choices = (payload as { choices?: unknown }).choices;
  if (!Array.isArray(choices)) return null;

  const content = (choices[0] as { message?: { content?: unknown } } | undefined)?.message?.content;
  if (typeof content === "string") return content;
  if (!Array.isArray(content)) return null;

  const text = content
    .map((part) => (
      part && typeof part === "object" && typeof (part as { text?: unknown }).text === "string"
        ? (part as { text: string }).text
        : ""
    ))
    .join("")
    .trim();
  return text || null;
}

export function openRouterResponseModel(payload: unknown, requestedModel: string) {
  if (!payload || typeof payload !== "object") return requestedModel;
  const model = (payload as { model?: unknown }).model;
  return typeof model === "string" && model ? model : requestedModel;
}
