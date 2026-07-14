import crypto from "node:crypto";
import { Buffer } from "node:buffer";
import { configureCloudinary, cloudinaryConfigured } from "@/lib/integrations/cloudinary";
import { GoogleGenAI } from "@google/genai";

const MAX_IMAGE_BYTES = 6 * 1024 * 1024;

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
  providerRequestId: string;
  providerCost: number | null;
  sampleUrl: string;
  generationMs: number;
};

export function geminiTryOnConfigured() {
  return Boolean(process.env.GEMINI_API_KEY) && cloudinaryConfigured();
}

/** Selects only an existing product asset; customers never provide frame images. */
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

export function parseDataImage(value: unknown, maxBytes = MAX_IMAGE_BYTES): DataImage | null {
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
    "Create a photorealistic optical try-on image edit.",
    "The input contains the customer's original selfie and the selected spectacle frame as a reference.",
    "Keep the person exactly the same: preserve identity, skin tone, age, hair, eyes, expression, clothing, pose, lighting, background, and camera perspective.",
    "Do not beautify, redesign the face, alter ethnicity, add duplicate glasses, or create sunglasses unless the selected frame is sunglasses.",
    "Place only the selected spectacle frame naturally and precisely on the face. Preserve its shape, lens shape, bridge, temples, thickness, material, colour, finish, and any visible brand markings.",
    "Correct the reference placement into natural optical alignment with realistic reflections, shadows, perspective, and no warped or floating temples.",
    `Selected product: ${product.brand} ${product.name}; SKU ${product.sku}; material ${product.material ?? "not confirmed"}; colour ${product.colour ?? "as photographed"}; finish ${product.finish ?? "not confirmed"}; shape ${product.shape ?? "not confirmed"}; rim ${product.rimType ?? "not confirmed"}.`
  ].join(" ");
}

export async function generateGeminiTryOn(input: {
  customerImage: DataImage;
  frameImageUrl: string;
  prompt: string;
  signal?: AbortSignal;
}): Promise<GeminiTryOnResult> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error("Gemini try-on is not configured.");

  const startedAt = Date.now();
  
  // Fetch frame image as base64
  const frameRes = await fetch(input.frameImageUrl, { signal: input.signal });
  if (!frameRes.ok) throw new Error("Could not fetch frame image.");
  const frameBuffer = Buffer.from(await frameRes.arrayBuffer());
  const frameBase64 = frameBuffer.toString("base64");
  const frameContentType = frameRes.headers.get("content-type") || "image/png";

  const ai = new GoogleGenAI({ apiKey });
  
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: [{
      role: 'user',
      parts: [
        { text: input.prompt },
        { inlineData: { mimeType: input.customerImage.mimeType, data: input.customerImage.base64 } },
        { inlineData: { mimeType: frameContentType, data: frameBase64 } }
      ]
    }],
    config: {
      temperature: 0.2
    }
  });

  const outputBase64 = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  let outputText = "";
  try {
    outputText = response.text || "";
  } catch (e) {
    // text() might throw if there is no text
  }
  
  let resultBase64 = outputBase64;
  
  if (!resultBase64 && outputText) {
    if (outputText.startsWith('http')) {
      return { 
        providerRequestId: "gemini-" + crypto.randomUUID(), 
        providerCost: null, 
        sampleUrl: outputText.trim(), 
        generationMs: Date.now() - startedAt 
      };
    } else {
      resultBase64 = outputText.replace(/^data:image\/(png|jpeg|webp);base64,/, '').trim();
    }
  }

  if (!resultBase64) {
    throw new Error("Gemini did not return a valid image.");
  }
  
  const mimeType = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.mimeType || 'image/jpeg';
  const dataUri = `data:${mimeType};base64,${resultBase64}`;
  
  return {
    providerRequestId: "gemini-" + crypto.randomUUID(),
    providerCost: null,
    sampleUrl: dataUri,
    generationMs: Date.now() - startedAt
  };
}

export async function uploadTryOnDataImage(input: {
  dataImage: DataImage;
  folder: string;
  tags: string[];
}): Promise<StoredTryOnImage> {
  if (!cloudinaryConfigured()) throw new Error("Image storage is not configured.");
  const cloudinary = configureCloudinary();
  const result = await new Promise<{ secure_url: string; public_id: string; bytes: number }>((resolve, reject) => {
    cloudinary.uploader.upload(input.dataImage.dataUri, {
      folder: input.folder,
      resource_type: "image",
      tags: input.tags,
      transformation: [{ width: 1440, height: 1440, crop: "limit", quality: "auto:good" }]
    }, (error, upload) => {
      if (error || !upload) reject(error ?? new Error("Cloudinary upload failed."));
      else resolve(upload as { secure_url: string; public_id: string; bytes: number });
    });
  });
  return { url: result.secure_url, publicId: result.public_id, bytes: result.bytes };
}

export async function storeGeminiResult(sampleUrlOrDataUri: string): Promise<StoredTryOnImage> {
  if (!cloudinaryConfigured()) throw new Error("Image storage is not configured.");
  
  let dataImage: DataImage | null = null;
  
  if (sampleUrlOrDataUri.startsWith('data:')) {
    dataImage = parseDataImage(sampleUrlOrDataUri, 15 * 1024 * 1024);
  } else {
    const response = await fetch(sampleUrlOrDataUri, { signal: AbortSignal.timeout(20_000) });
    const contentType = response.headers.get("content-type")?.split(";")[0];
    if (!response.ok || !contentType || !["image/jpeg", "image/png", "image/webp"].includes(contentType)) {
      throw new Error("Gemini returned an invalid preview image URL.");
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    if (!buffer.length || buffer.length > 15 * 1024 * 1024) throw new Error("Gemini preview image is too large.");

    dataImage = parseDataImage(`data:${contentType};base64,${buffer.toString("base64")}`, 15 * 1024 * 1024);
  }

  if (!dataImage) throw new Error("Gemini preview image is invalid.");
  return uploadTryOnDataImage({
    dataImage,
    folder: "vision-vistara/ai-try-on-results",
    tags: ["ai-try-on", "generated-preview"]
  });
}

export async function deleteTryOnAsset(publicId: string) {
  if (!cloudinaryConfigured()) return;
  const cloudinary = configureCloudinary();
  await cloudinary.uploader.destroy(publicId, { resource_type: "image", invalidate: true }).catch(() => undefined);
}
