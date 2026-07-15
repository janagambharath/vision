import crypto from "node:crypto";
import { z } from "zod";
import { productAiDraftSchema, type ProductAiDraft } from "@/lib/product-ai";

const ANALYSIS_TTL_MS = 15 * 60 * 1000;

const measurementFieldsSchema = productAiDraftSchema.pick({
  size: true,
  measurements: true,
  weightGrams: true,
  frameWidth: true,
  lensWidth: true,
  bridgeWidth: true,
  templeLength: true,
  frameHeight: true,
  pdRange: true
});

export type ProductAnalysisMeasurements = z.infer<typeof measurementFieldsSchema>;

const signedAnalysisSchema = z.object({
  version: z.literal(1),
  imageUrl: z.string().url().max(2_048),
  expiresAt: z.number().int().positive(),
  measurements: measurementFieldsSchema
});

function analysisSecret() {
  const secret = process.env.AUTH_SECRET?.trim();
  if (!secret) throw new Error("AUTH_SECRET is required to secure AI product analysis.");
  return secret;
}

function sign(payload: string) {
  return crypto.createHmac("sha256", analysisSecret()).update(payload).digest("base64url");
}

/**
 * Binds AI-derived measurements to the exact Cloudinary asset that was
 * analyzed. The browser may display a draft, but it cannot manufacture or
 * transfer physical measurements to a different product image.
 */
export function createProductAnalysisToken(input: { imageUrl: string; draft: ProductAiDraft }) {
  const payload = JSON.stringify({
    version: 1 as const,
    imageUrl: input.imageUrl,
    expiresAt: Date.now() + ANALYSIS_TTL_MS,
    measurements: measurementFieldsSchema.parse(input.draft)
  });
  const encoded = Buffer.from(payload).toString("base64url");
  return `${encoded}.${sign(encoded)}`;
}

export function readVerifiedProductAnalysis(token: string, allowedImageUrls: string[]): ProductAnalysisMeasurements | null {
  const [encoded, signature, ...extra] = token.split(".");
  if (!encoded || !signature || extra.length) return null;

  try {
    const expected = Buffer.from(sign(encoded));
    const received = Buffer.from(signature);
    if (expected.length !== received.length || !crypto.timingSafeEqual(expected, received)) return null;

    const parsed = signedAnalysisSchema.parse(JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")));
    if (parsed.expiresAt < Date.now() || !allowedImageUrls.includes(parsed.imageUrl)) return null;
    return parsed.measurements;
  } catch {
    return null;
  }
}
