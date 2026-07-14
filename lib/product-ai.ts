import { z } from "zod";

const optionalText = z.string().trim().max(600);
const keywordList = z.array(z.string().trim().min(1).max(80)).max(12);

/**
 * The catalog fields that a vision model may suggest from product photography.
 * Pricing, SKU, measurements, stock, warranty, and return policy are intentionally
 * excluded: they cannot be verified from a frame photograph.
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
