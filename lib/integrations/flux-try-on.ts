import crypto from "node:crypto";
import { Buffer } from "node:buffer";
import { configureCloudinary, cloudinaryConfigured } from "@/lib/integrations/cloudinary";

const BFL_KONTEXT_ENDPOINT = "https://api.bfl.ai/v1/flux-kontext-pro";
const MAX_IMAGE_BYTES = 6 * 1024 * 1024;
const POLL_INTERVAL_MS = 750;
const POLL_TIMEOUT_MS = 45_000;

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

export type FluxTryOnResult = {
  providerRequestId: string;
  providerCost: number | null;
  sampleUrl: string;
  generationMs: number;
};

export function fluxTryOnConfigured() {
  return Boolean(process.env.BFL_API_KEY) && cloudinaryConfigured();
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

export function buildFluxTryOnPrompt(product: {
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
    "The input image contains the customer's original selfie and the selected spectacle frame as an automatic reference.",
    "Keep the person exactly the same: preserve identity, skin tone, age, hair, eyes, expression, clothing, pose, lighting, background, and camera perspective.",
    "Do not beautify, redesign the face, alter ethnicity, add duplicate glasses, or create sunglasses unless the selected frame is sunglasses.",
    "Place only the selected spectacle frame naturally and precisely on the face. Preserve its shape, lens shape, bridge, temples, thickness, material, colour, finish, and any visible brand markings.",
    "Correct the reference placement into natural optical alignment with realistic reflections, shadows, perspective, and no warped or floating temples.",
    `Selected product: ${product.brand} ${product.name}; SKU ${product.sku}; material ${product.material ?? "not confirmed"}; colour ${product.colour ?? "as photographed"}; finish ${product.finish ?? "not confirmed"}; shape ${product.shape ?? "not confirmed"}; rim ${product.rimType ?? "not confirmed"}.`
  ].join(" ");
}

function assertBflPollingUrl(value: unknown) {
  if (typeof value !== "string") throw new Error("FLUX did not return a polling URL.");
  const url = new URL(value);
  if (url.protocol !== "https:" || !url.hostname.endsWith(".bfl.ai")) {
    throw new Error("FLUX returned an invalid polling URL.");
  }
  return url.toString();
}

function timeoutSignal(signal: AbortSignal | undefined, ms: number) {
  const timeout = AbortSignal.timeout(ms);
  return signal ? AbortSignal.any([signal, timeout]) : timeout;
}

function sleep(ms: number, signal?: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason ?? new DOMException("Generation cancelled.", "AbortError"));
      return;
    }
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(signal.reason ?? new DOMException("Generation cancelled.", "AbortError"));
    }, { once: true });
  });
}

export async function generateFluxTryOn(input: {
  conditioningImage: DataImage;
  prompt: string;
  signal?: AbortSignal;
}): Promise<FluxTryOnResult> {
  const apiKey = process.env.BFL_API_KEY;
  if (!apiKey) throw new Error("FLUX try-on is not configured.");

  const startedAt = Date.now();
  const response = await fetch(BFL_KONTEXT_ENDPOINT, {
    method: "POST",
    headers: {
      accept: "application/json",
      "content-type": "application/json",
      "x-key": apiKey
    },
    body: JSON.stringify({
      prompt: input.prompt,
      input_image: input.conditioningImage.base64,
      prompt_upsampling: false,
      safety_tolerance: 2,
      output_format: "jpeg"
    }),
    signal: timeoutSignal(input.signal, 20_000)
  });

  const body = await response.json().catch(() => null) as { id?: unknown; polling_url?: unknown; cost?: unknown } | null;
  if (!response.ok || !body) {
    throw new Error(`FLUX request failed (${response.status}).`);
  }
  if (typeof body.id !== "string") throw new Error("FLUX did not return a request ID.");

  const pollingUrl = assertBflPollingUrl(body.polling_url);
  const providerCost = typeof body.cost === "number" && Number.isFinite(body.cost) ? body.cost : null;
  const deadline = Date.now() + POLL_TIMEOUT_MS;

  while (Date.now() < deadline) {
    await sleep(POLL_INTERVAL_MS, input.signal);
    const poll = await fetch(pollingUrl, {
      headers: { accept: "application/json", "x-key": apiKey },
      signal: timeoutSignal(input.signal, 10_000)
    });
    const result = await poll.json().catch(() => null) as {
      status?: unknown;
      result?: { sample?: unknown } | null;
    } | null;
    const status = typeof result?.status === "string" ? result.status : "";

    if (status === "Ready") {
      const sampleUrl = result?.result?.sample;
      if (typeof sampleUrl !== "string" || !sampleUrl.startsWith("https://")) {
        throw new Error("FLUX completed without a usable image.");
      }
      return { providerRequestId: body.id, providerCost, sampleUrl, generationMs: Date.now() - startedAt };
    }
    if (["Error", "Failed", "Content Moderated", "Request Moderated", "Task not found"].includes(status)) {
      throw new Error("FLUX could not generate this preview.");
    }
  }

  throw new Error("FLUX preview timed out.");
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

export async function storeFluxResult(sampleUrl: string): Promise<StoredTryOnImage> {
  if (!cloudinaryConfigured()) throw new Error("Image storage is not configured.");
  const response = await fetch(sampleUrl, { signal: AbortSignal.timeout(20_000) });
  const contentType = response.headers.get("content-type")?.split(";")[0];
  if (!response.ok || !contentType || !["image/jpeg", "image/png", "image/webp"].includes(contentType)) {
    throw new Error("FLUX returned an invalid preview image.");
  }
  const buffer = Buffer.from(await response.arrayBuffer());
  if (!buffer.length || buffer.length > 15 * 1024 * 1024) throw new Error("FLUX preview image is too large.");

  const dataImage = parseDataImage(`data:${contentType};base64,${buffer.toString("base64")}`, 15 * 1024 * 1024);
  if (!dataImage) throw new Error("FLUX preview image is invalid.");
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
