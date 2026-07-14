import { NextRequest, NextResponse } from "next/server";
import { getCustomerSession } from "@/lib/customer-auth";
import { prisma } from "@/lib/db";
import {
  buildGeminiTryOnPrompt,
  geminiTryOnConfigured,
  generateGeminiTryOn,
  parseDataImage,
  selectTryOnProductImage,
  storeGeminiResult,
  uploadTryOnDataImage
} from "@/lib/ai/gemini";
import { isRateLimited } from "@/lib/rate-limit";
import { assertSameOrigin } from "@/lib/request-security";
import { slugSchema } from "@/lib/validations";

export const runtime = "nodejs";

const PROMPT_VERSION = "vision-vistara-gemini-v1";
const PREVIEW_DISCLAIMER =
  "AI try-on is an appearance preview only. It does not guarantee exact fit, lens thickness, prescription suitability, or the final manufactured frame alignment.";
const CUSTOMER_IMAGE_RETENTION_DAYS = 30;

function publicPreviewError() {
  return "We couldn't generate your preview right now. Please try again.";
}

export async function POST(request: NextRequest) {
  const originError = assertSameOrigin(request);
  if (originError) return originError;

  if (await isRateLimited(request, { keyPrefix: "gemini-try-on", limit: 5, windowSeconds: 60 * 60 })) {
    return NextResponse.json({ error: "You can generate up to 5 AI previews per hour. Please try again later." }, { status: 429 });
  }

  if (!geminiTryOnConfigured()) {
    return NextResponse.json({ error: "AI try-on is not configured yet. Please try again later." }, { status: 503 });
  }

  const body = await request.json().catch(() => null) as {
    frameSlug?: unknown;
    customerImage?: unknown;
    conditioningImage?: unknown;
    privacyConsent?: unknown;
  } | null;
  const parsedSlug = slugSchema.safeParse(body?.frameSlug);
  const customerImage = parseDataImage(body?.customerImage);
  const conditioningImage = parseDataImage(body?.conditioningImage);
  if (!parsedSlug.success || !customerImage || !conditioningImage || body?.privacyConsent !== true) {
    return NextResponse.json({ error: "Capture a clear JPEG, PNG, or WebP selfie to continue." }, { status: 400 });
  }

  const product = await prisma.product.findFirst({
    where: { slug: parsedSlug.data, status: "ACTIVE", deletedAt: null, tryOnEligible: true },
    include: { images: { orderBy: { sortOrder: "asc" } } }
  });
  if (!product) {
    return NextResponse.json({ error: "This frame is not available for AI try-on." }, { status: 404 });
  }

  const frameImage = selectTryOnProductImage(product.images, product.arImageUrl);
  if (!frameImage) {
    return NextResponse.json({ error: "This frame needs a product image before AI try-on can be used." }, { status: 422 });
  }

  let customerId: string | null = null;
  try {
    customerId = (await getCustomerSession())?.userId ?? null;
  } catch {
    // Guest try-on remains available when the account session is unavailable.
  }

  const cached = await prisma.framePreviewRequest.findFirst({
    where: {
      productId: product.id,
      customerImageHash: customerImage.hash,
      status: "READY",
      resultImageUrl: { not: null },
      ...(customerId ? { customerId } : {})
    },
    orderBy: { createdAt: "desc" },
    select: { id: true, resultImageUrl: true, generationMs: true, frameImageUrl: true }
  });
  if (cached?.resultImageUrl) {
    return NextResponse.json({
      requestId: cached.id,
      image: cached.resultImageUrl,
      cached: true,
      generationMs: cached.generationMs,
      frameImageUrl: cached.frameImageUrl,
      disclaimer: PREVIEW_DISCLAIMER
    }, { headers: { "Cache-Control": "no-store" } });
  }

  const prompt = buildGeminiTryOnPrompt(product);
  let previewRequestId: string | null = null;

  try {
    const uploadedCustomer = await uploadTryOnDataImage({
      dataImage: customerImage,
      folder: "vision-vistara/ai-try-on-customers",
      tags: ["ai-try-on", "temporary-customer-image"]
    });
    const previewRequest = await prisma.framePreviewRequest.create({
      data: {
        productId: product.id,
        productSlug: product.slug,
        customerId,
        customerImageUrl: uploadedCustomer.url,
        customerImagePublicId: uploadedCustomer.publicId,
        customerImageHash: customerImage.hash,
        frameImageUrl: frameImage.url,
        status: "PROCESSING",
        disclaimer: PREVIEW_DISCLAIMER,
        promptVersion: PROMPT_VERSION,
        prompt,
        model: "gemini-2.5-flash-image",
        expiresAt: new Date(Date.now() + CUSTOMER_IMAGE_RETENTION_DAYS * 24 * 60 * 60 * 1000)
      },
      select: { id: true }
    });
    previewRequestId = previewRequest.id;

    let geminiResult: Awaited<ReturnType<typeof generateGeminiTryOn>> | null = null;
    let lastError: unknown;
    for (let attempt = 0; attempt < 2; attempt += 1) {
      try {
        geminiResult = await generateGeminiTryOn({ customerImage, frameImageUrl: frameImage.url, prompt, signal: request.signal });
        break;
      } catch (error) {
        if (request.signal.aborted) throw error;
        lastError = error;
      }
    }
    if (!geminiResult) throw lastError instanceof Error ? lastError : new Error("Gemini generation failed.");

    const storedResult = await storeGeminiResult(geminiResult.sampleUrl);
    await prisma.framePreviewRequest.update({
      where: { id: previewRequest.id },
      data: {
        status: "READY",
        resultImageUrl: storedResult.url,
        resultImagePublicId: storedResult.publicId,
        resultBytes: storedResult.bytes,
        providerRequestId: geminiResult.providerRequestId,
        providerCost: geminiResult.providerCost,
        generationMs: geminiResult.generationMs
      }
    });

    return NextResponse.json({
      requestId: previewRequest.id,
      image: storedResult.url,
      cached: false,
      generationMs: geminiResult.generationMs,
      frameImageUrl: frameImage.url,
      disclaimer: PREVIEW_DISCLAIMER
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Gemini AI try-on failed", error);
    if (previewRequestId) {
      await prisma.framePreviewRequest.update({
        where: { id: previewRequestId },
        data: { status: "FAILED", failureReason: publicPreviewError() }
      }).catch(() => undefined);
    }
    return NextResponse.json({ error: publicPreviewError() }, { status: 502 });
  }
}
