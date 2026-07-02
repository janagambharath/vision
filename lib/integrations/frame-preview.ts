import type { StoreProduct } from "@/lib/inventory";
import { SITE_URL } from "@/lib/constants";

export type FramePreviewResult = {
  status: "READY" | "FALLBACK_READY";
  resultImageUrl?: string;
  failureReason?: string;
};

type PreviewInput = {
  customerImageUrl: string;
  frameImageUrl: string;
  product: StoreProduct;
  prompt: string;
  requestId: string;
};

function absoluteAssetUrl(value: string) {
  return new URL(value, SITE_URL).toString();
}

export function framePreviewConfigured() {
  return Boolean(process.env.FRAME_PREVIEW_API_URL);
}

export function buildFramePreviewPrompt(product: StoreProduct) {
  return [
    "Create an eyewear preview for a real optical retail flow.",
    "Preserve the customer's face identity and skin tone.",
    "Use the selected frame as the visual reference; do not invent a different frame.",
    `Frame: ${product.brand} ${product.name}, SKU ${product.sku}.`,
    `Known frame details: ${product.material}, ${product.colour}, ${product.shape}, ${product.rimType}, ${product.measurements}.`,
    "If exact frame preservation is not possible, return no generated image and let the storefront show the fallback preview."
  ].join(" ");
}

export function framePreviewModelPayload(input: PreviewInput) {
  return {
    requestId: input.requestId,
    customerImageUrl: absoluteAssetUrl(input.customerImageUrl),
    frameImageUrl: absoluteAssetUrl(input.frameImageUrl),
    product: {
      slug: input.product.slug,
      sku: input.product.sku,
      name: input.product.name,
      brand: input.product.brand,
      material: input.product.material,
      colour: input.product.colour,
      shape: input.product.shape,
      rimType: input.product.rimType,
      measurements: input.product.measurements
    },
    prompt: input.prompt,
    outputContract: {
      resultImageUrl: "HTTPS URL of generated preview image, only when the selected frame is preserved.",
      status: "READY or FALLBACK_READY"
    }
  };
}

export async function requestFramePreview(input: PreviewInput): Promise<FramePreviewResult> {
  const endpoint = process.env.FRAME_PREVIEW_API_URL;
  if (!endpoint) {
    return {
      status: "FALLBACK_READY",
      failureReason: "Self-hosted frame preview model endpoint is not configured."
    };
  }

  const headers: HeadersInit = { "content-type": "application/json" };
  if (process.env.FRAME_PREVIEW_API_TOKEN) {
    headers.authorization = `Bearer ${process.env.FRAME_PREVIEW_API_TOKEN}`;
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(framePreviewModelPayload(input)),
    signal: AbortSignal.timeout(45_000)
  }).catch((error: unknown) => ({
    ok: false,
    status: 503,
    json: async () => ({ error: error instanceof Error ? error.message : "Frame preview request failed." })
  }));

  if (!response.ok) {
    return {
      status: "FALLBACK_READY",
      failureReason: `Frame preview model returned ${response.status}.`
    };
  }

  const body = (await response.json().catch(() => null)) as { resultImageUrl?: unknown } | null;
  if (!body || typeof body.resultImageUrl !== "string" || !body.resultImageUrl.startsWith("https://")) {
    return {
      status: "FALLBACK_READY",
      failureReason: "Frame preview model did not return a usable HTTPS result image."
    };
  }

  return {
    status: "READY",
    resultImageUrl: body.resultImageUrl
  };
}
