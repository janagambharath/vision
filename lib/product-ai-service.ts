import { openRouterChatText, openRouterResponseModel, productAiDraftSchema, productEnrichmentModels, type ProductAiDraft } from "./product-ai";

const productDraftJsonSchema = {
  type: "object",
  additionalProperties: false,
  required: [
    "name", "brand", "shortDescription", "description", "material", "colour", "finish", "shape", "rimType",
    "gender", "ageGroup", "highlights", "lensCompatibility", "seoTitle",
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
    highlights: { type: "array", items: { type: "string", maxLength: 180 }, maxItems: 6 },
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
  "Do not generate, infer, or transcribe physical frame measurements, size markings, PD ranges, or weight. Staff enter verified frame specifications manually.",
  "Only name a brand when it is clearly readable on the frame or image. Leave uncertain fields as empty strings or empty arrays and explain uncertainty in needsReview.",
  "The image can show the frame by itself or a person wearing it. When a person is present, analyse only the visible eyewear and its fit or styling as product context. Do not identify, describe, or infer personal attributes about the person.",
  "Describe visible product attributes conservatively. Lens compatibility suggestions are editorial suggestions, not verified optical claims, and must be included in needsReview when present.",
  "Use Indian English. Keep marketing copy factual, concise, and suitable for a premium eyewear catalog."
].join(" ");

const emptyProductAiDraft: ProductAiDraft = {
  name: "", brand: "", shortDescription: "", description: "", material: "", colour: "", finish: "", shape: "", rimType: "",
  gender: "", ageGroup: "", highlights: [], lensCompatibility: [],
  seoTitle: "", seoDescription: "", seoKeywords: [], categoryHint: "", confidence: "low", needsReview: []
};

function requestedSiteUrl() {
  return process.env.OPENROUTER_SITE_URL || process.env.NEXT_PUBLIC_SITE_URL || process.env.AUTH_URL || "http://localhost:3000";
}

function parseDraft(text: string): ProductAiDraft | null {
  try {
    const json = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    const partial = productAiDraftSchema.partial().safeParse(JSON.parse(json));
    if (!partial.success || ![
      partial.data.name, partial.data.shortDescription, partial.data.description,
      partial.data.material, partial.data.colour, partial.data.shape
    ].some(value => value?.trim())) return null;
    return { ...emptyProductAiDraft, ...partial.data };
  } catch {
    return null;
  }
}

type Failure = { message: string; priority: number; terminal?: boolean };

function providerFailure(status: number, payload: unknown): Failure {
  const error = (payload as { error?: { message?: unknown; metadata?: { error_type?: unknown } } } | null)?.error;
  const detail = typeof error?.message === "string" ? error.message.toLowerCase() : "";
  const type = error?.metadata?.error_type;
  if (status === 401 || type === "authentication") return { message: "OpenRouter rejected the API key. Check OPENROUTER_API_KEY in Railway.", priority: 100, terminal: true };
  if (status === 402 || type === "payment_required") return { message: "OpenRouter reports insufficient credits or an API-key spending limit. Check the account billing and key limits.", priority: 95 };
  if (/data policy|privacy|publication|zero data retention/.test(detail)) return { message: "OpenRouter cannot route this request under the account's data policy. Review eligible providers in OpenRouter privacy settings or configure a compatible vision model.", priority: 90 };
  if (status === 429 || type === "rate_limit_exceeded") return { message: "OpenRouter's free image models are rate limited (429). Wait for the quota to reset or configure a vision model with available capacity.", priority: 80 };
  if (status === 403) return { message: "OpenRouter blocked the request. Check model permissions, account limits, and guardrail settings.", priority: 75 };
  if (typeof type === "string" && /image/.test(type)) return { message: "The image provider could not read the uploaded image. Try uploading a smaller JPEG or PNG product photo.", priority: 70 };
  if (status === 400 || status === 422) return { message: "The vision provider rejected the image or request format. Try another product photo or configure a compatible vision model.", priority: 60 };
  return { message: "OpenRouter has no available endpoint for the configured image models. Check model availability and account routing settings.", priority: 10 };
}

/** Inject fetch/model settings so real fallback and failure handling can be tested. */
export async function generateWithOpenRouter(imageUrl: string, options: {
  apiKey?: string;
  models?: string[];
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
} = {}) {
  const apiKey = options.apiKey ?? process.env.OPENROUTER_API_KEY;
  if (!apiKey) throw new Error("OpenRouter product enrichment is not configured.");
  const fetchImpl = options.fetchImpl ?? fetch;
  let failure: Failure = { message: "The image models did not complete a draft. Try again shortly.", priority: 0 };
  const remember = (next: Failure) => {
    if (next.priority > failure.priority) failure = next;
  };

  for (const [index, model] of (options.models ?? productEnrichmentModels()).entries()) {
    try {
      const response = await fetchImpl("https://openrouter.ai/api/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
          "HTTP-Referer": requestedSiteUrl(),
          "X-Title": "Vision Vistara Product Enrichment"
        },
        body: JSON.stringify({
          model,
          response_format: { type: "json_object" },
          reasoning: { enabled: false },
          messages: [
            { role: "system", content: `${instructions} Return exactly one JSON object with no markdown or prose, matching this JSON Schema: ${JSON.stringify(productDraftJsonSchema)}` },
            { role: "user", content: [
              { type: "text", text: "Inspect this uploaded eyewear image and create a catalog draft for staff review. Analyse the eyewear only." },
              { type: "image_url", image_url: { url: imageUrl } }
            ] }
          ],
          max_tokens: 4_096,
          temperature: 0.1
        }),
        signal: AbortSignal.timeout(options.timeoutMs ?? 60_000)
      });
      const payload = await response.json().catch(() => null);
      const completion = payload as { error?: { code?: unknown }; choices?: { error?: { code?: unknown } }[] } | null;
      const embeddedError = completion?.error ?? completion?.choices?.[0]?.error;
      if (!response.ok || embeddedError) {
        const status = Number(embeddedError?.code) || response.status;
        const next = providerFailure(status, { error: embeddedError });
        remember(next);
        console.warn("OpenRouter product enrichment request failed", {
          model, status, requestId: response.headers.get("x-request-id"), reason: next.message
        });
        if (next.terminal) break;
        continue;
      }
      const content = openRouterChatText(payload) ?? "";
      const draft = parseDraft(content);
      if (!draft) {
        remember({ message: content
          ? "The vision model returned an incomplete or invalid catalog draft. Try again or configure another vision model."
          : "The vision model returned no draft text. Try again or configure another vision model.", priority: 30 });
        console.warn("OpenRouter product enrichment returned an invalid draft", { model, responseLength: content.length });
        continue;
      }
      return { draft, model: openRouterResponseModel(payload, model), fallbackUsed: index > 0 };
    } catch (error) {
      const timedOut = error instanceof Error && ["TimeoutError", "AbortError"].includes(error.name);
      const next = { message: timedOut
        ? "The image model timed out before completing a draft. Try again or configure a faster vision model."
        : "Could not connect to the image provider. Try again shortly.", priority: 20 };
      remember(next);
      console.warn("OpenRouter product enrichment request threw", { model, reason: next.message });
    }
  }
  throw new Error(failure.message);
}

