import crypto from "node:crypto";
import { Buffer } from "node:buffer";
import { GoogleGenAI } from "@google/genai";
import { cloudinaryConfigured, configureCloudinary } from "@/lib/integrations/cloudinary";

const MAX_CUSTOMER_IMAGE_BYTES = 6 * 1024 * 1024;
const MAX_FRAME_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_RESULT_IMAGE_BYTES = 15 * 1024 * 1024;
const GEMINI_TIMEOUT_MS = 55_000;

type ProductImage = { url: string; role: string; sortOrder: number };

export type SelectedTryOnImage = {
  url: string;
  role: "transparent" | "front" | "fallback";
};

export type DataImage = {
  dataUri: string;
  base64: string;
  mimeType: "image/jpeg" | "image/png" | "image/webp";
  bytes: number;
  hash: string;
};

export type StoredTryOnImage = {
  url: string;
  publicId: string;
  bytes: number;
};

export type GeminiTryOnResult = {
  providerRequestId: string | null;
  providerCost: number | null;
  image: DataImage;
  generationMs: number;
  model: string;
};

export class TryOnError extends Error {
  constructor(message: string, readonly retryable = true) {
    super(message);
    this.name = "TryOnError";
  }
}

export function geminiTryOnConfigured() {
  return Boolean(process.env.GEMINI_API_KEY?.trim()) && cloudinaryConfigured();
}

export function geminiTryOnModel() {
  return process.env.GEMINI_TRY_ON_MODEL?.trim() || "gemini-3.1-flash-image";
}

/** Selects the best available catalog image; transparent assets are preferred. */
export function selectTryOnProductImage(images: ProductImage[], arImageUrl?: string | null): SelectedTryOnImage | null {
  const ordered = [...images].sort((a, b) => a.sortOrder - b.sortOrder);
  const transparent = ordered.find((image) => image.role === "transparent" || image.role === "ar");
  if (transparent) return { url: transparent.url, role: "transparent" };
  if (arImageUrl) return { url: arImageUrl, role: "transparent" };

  const front = ordered.find((image) => image.role === "front");
  if (front) return { url: front.url, role: "front" };

  const fallback = ordered.find((image) => image.role !== "ar");
  return fallback ? { url: fallback.url, role: "fallback" } : null;
}

export function parseDataImage(value: unknown, maxBytes = MAX_CUSTOMER_IMAGE_BYTES): DataImage | null {
  if (typeof value !== "string") return null;
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=]+)$/.exec(value);
  if (!match) return null;

  const mimeType = match[1] as DataImage["mimeType"];
  const base64 = match[2];
  const bytes = Buffer.byteLength(base64, "base64");
  if (!bytes || bytes > maxBytes) return null;

  return {
    dataUri: value,
    base64,
    mimeType,
    bytes,
    hash: crypto.createHash("sha256").update(base64).digest("hex")
  };
}

export function buildGeminiTryOnPrompt(product: {
  brand: string;
  name: string;
  sku: string;
  material: string | null;
  colour: string | null;
  finish: string | null;
  shape: string | null;
  rimType: string | null;
}) {
  return [
    "Generate one photorealistic virtual eyewear try-on image.",
    "Image 1 is the customer's selfie. Image 2 is the exact selected optical frame product asset with transparency.",
    "Use image 1 as the untouched scene. Preserve the person's identity, face proportions, skin tone, hairstyle, expression, clothing, pose, lighting, camera perspective, and background exactly.",
    "Change only the eyewear. Place the exact frame from image 2 naturally on the face. Do not redesign, recolour, resize, replace, simplify, or invent any frame detail.",
    "Preserve the selected frame's exact silhouette, lens geometry, bridge, temples, material, colour, finish, thickness, and visible markings. Align it realistically at the eyes with natural shadows and reflections.",
    "Do not add a second frame, change the person, beautify the face, crop the scene, add text, watermark, or modify the background.",
    `Selected product: ${product.brand} ${product.name}; SKU ${product.sku}; material ${product.material ?? "as shown"}; colour ${product.colour ?? "as shown"}; finish ${product.finish ?? "as shown"}; shape ${product.shape ?? "as shown"}; rim ${product.rimType ?? "as shown"}.`
  ].join(" ");
}

function timeoutSignal(signal: AbortSignal | undefined, ms: number) {
  const timeout = AbortSignal.timeout(ms);
  return signal ? AbortSignal.any([signal, timeout]) : timeout;
}

function assertCloudinaryImageUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new TryOnError("The selected product image URL is invalid.", false);
  }
  if (url.protocol !== "https:" || url.hostname !== "res.cloudinary.com") {
    throw new TryOnError("The selected product image must be served from this store's Cloudinary account.", false);
  }
  return url;
}

export async function loadTryOnFrameImage(url: string, signal?: AbortSignal): Promise<DataImage> {
  const trustedUrl = assertCloudinaryImageUrl(url);
  let response: Response;
  try {
    response = await fetch(trustedUrl, { signal: timeoutSignal(signal, 15_000) });
  } catch (error) {
    throw new TryOnError(`Could not load the selected frame image: ${error instanceof Error ? error.message : "network error"}.`);
  }
  const contentType = response.headers.get("content-type")?.split(";")[0].toLowerCase();
  if (!response.ok || !contentType || !["image/jpeg", "image/png", "image/webp"].includes(contentType)) {
    throw new TryOnError("The selected product image must be a JPEG, PNG, or WebP asset.", false);
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  if (!buffer.length || buffer.length > MAX_FRAME_IMAGE_BYTES) {
    throw new TryOnError("The selected frame image is empty or exceeds the 10 MB safety limit.", false);
  }
  const image = parseDataImage(`data:${contentType};base64,${buffer.toString("base64")}`, MAX_FRAME_IMAGE_BYTES);
  if (!image) throw new TryOnError("The selected frame image could not be decoded.", false);
  return image;
}

function estimateGeminiCost() {
  const configured = Number(process.env.GEMINI_TRY_ON_ESTIMATED_COST_USD);
  return Number.isFinite(configured) && configured >= 0 ? configured : null;
}

export async function generateGeminiTryOn(input: {
  customerImage: DataImage;
  frameImage: DataImage;
  prompt: string;
  signal?: AbortSignal;
}): Promise<GeminiTryOnResult> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new TryOnError("GEMINI_API_KEY is not configured.", false);

  const startedAt = Date.now();
  const ai = new GoogleGenAI({ apiKey });
  let response;
  try {
    response = await ai.models.generateContent({
      model: geminiTryOnModel(),
      contents: [{
        role: "user",
        parts: [
          { text: input.prompt },
          { inlineData: { mimeType: input.customerImage.mimeType, data: input.customerImage.base64 } },
          { inlineData: { mimeType: input.frameImage.mimeType, data: input.frameImage.base64 } }
        ]
      }],
      config: {
        responseModalities: ["IMAGE"],
        imageConfig: { aspectRatio: "1:1" },
        abortSignal: timeoutSignal(input.signal, GEMINI_TIMEOUT_MS)
      }
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown Gemini error";
    throw new TryOnError(`Gemini image generation failed: ${message}`);
  }

  const part = response.candidates
    ?.flatMap((candidate) => candidate.content?.parts ?? [])
    .find((candidatePart) => candidatePart.inlineData?.data && candidatePart.inlineData.mimeType);
  if (!part?.inlineData?.data || !part.inlineData.mimeType) {
    const blocked = response.promptFeedback?.blockReasonMessage || response.promptFeedback?.blockReason;
    if (blocked) throw new TryOnError(`Gemini blocked this image request: ${blocked}.`, false);
    throw new TryOnError("Gemini completed without returning a generated image.", false);
  }

  const mimeType = part.inlineData.mimeType.toLowerCase();
  if (!["image/jpeg", "image/png", "image/webp"].includes(mimeType)) {
    throw new TryOnError(`Gemini returned an unsupported image type (${mimeType}).`, false);
  }
  const image = parseDataImage(`data:${mimeType};base64,${part.inlineData.data}`, MAX_RESULT_IMAGE_BYTES);
  if (!image) throw new TryOnError("Gemini returned an invalid or oversized preview image.", false);

  return {
    providerRequestId: response.responseId ?? null,
    providerCost: estimateGeminiCost(),
    image,
    generationMs: Date.now() - startedAt,
    model: response.modelVersion ?? geminiTryOnModel()
  };
}

function signedAuthenticatedImageUrl(publicId: string) {
  const cloudinary = configureCloudinary();
  return cloudinary.url(publicId, {
    resource_type: "image",
    type: "authenticated",
    sign_url: true,
    secure: true,
    expires_at: Math.floor(Date.now() / 1000) + 15 * 60
  });
}

export function getTryOnResultUrl(publicId: string | null, legacyUrl: string | null) {
  if (publicId && cloudinaryConfigured()) return signedAuthenticatedImageUrl(publicId);
  return legacyUrl;
}

export async function uploadTryOnDataImage(input: {
  dataImage: DataImage;
  folder: string;
  tags: string[];
}): Promise<StoredTryOnImage> {
  if (!cloudinaryConfigured()) throw new TryOnError("Cloudinary credentials are not configured.", false);
  const cloudinary = configureCloudinary();
  const result = await new Promise<{ secure_url: string; public_id: string; bytes: number }>((resolve, reject) => {
    cloudinary.uploader.upload(input.dataImage.dataUri, {
      folder: input.folder,
      resource_type: "image",
      type: "authenticated",
      tags: input.tags,
      transformation: [{ width: 1440, height: 1440, crop: "limit", quality: "auto:good" }]
    }, (error, upload) => {
      if (error || !upload) reject(error ?? new Error("Cloudinary upload failed."));
      else resolve(upload as { secure_url: string; public_id: string; bytes: number });
    });
  });
  return { url: signedAuthenticatedImageUrl(result.public_id), publicId: result.public_id, bytes: result.bytes };
}

export async function deleteTryOnAsset(publicId: string) {
  if (!cloudinaryConfigured()) return;
  const cloudinary = configureCloudinary();
  await cloudinary.uploader.destroy(publicId, { resource_type: "image", type: "authenticated", invalidate: true }).catch(() => undefined);
}
