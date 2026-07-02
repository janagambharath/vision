"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { buildFramePreviewPrompt, requestFramePreview } from "@/lib/integrations/frame-preview";
import { productIsSellable } from "@/lib/inventory";
import { getStoreProduct } from "@/lib/store-data";
import { imageUploadOptions, uploadFormFile } from "@/lib/uploads";
import { slugSchema } from "@/lib/validations";

const PREVIEW_DISCLAIMER =
  "AI frame preview is an appearance aid only. It does not guarantee exact fit, lens thickness, medical suitability, or final frame alignment.";
const PROMPT_VERSION = "vision-vistara-frame-preview-v1";

export async function requestFramePreviewAction(formData: FormData) {
  const slug = String(formData.get("slug") ?? "");
  const acceptedDisclaimer = formData.get("acceptedPreviewDisclaimer") === "on";
  const parsedSlug = slugSchema.safeParse(slug);

  if (!parsedSlug.success || !acceptedDisclaimer) {
    redirect("/frames/try-on?error=invalid-request");
  }

  const product = await getStoreProduct(parsedSlug.data);
  if (!product || !productIsSellable(product)) {
    redirect("/frames/try-on?error=unavailable-frame");
  }

  let customerImage = null;
  try {
    customerImage = await uploadFormFile(
      formData.get("customerPhoto"),
      "vision-vistara/frame-preview-customers",
      imageUploadOptions()
    );
  } catch {
    redirect(`/frames/try-on?product=${product.slug}&error=upload-failed`);
  }

  if (!customerImage) {
    redirect(`/frames/try-on?product=${product.slug}&error=photo-required`);
  }

  const dbProduct = await prisma.product.findUniqueOrThrow({
    where: { slug: product.slug },
    select: { id: true }
  });
  const frameImage = product.images.find((image) => image.role === "ar") ?? product.images[0];
  if (!frameImage) {
    redirect("/frames/try-on?error=missing-frame-image");
  }
  const prompt = buildFramePreviewPrompt(product);
  const previewRequest = await prisma.framePreviewRequest.create({
    data: {
      productId: dbProduct.id,
      productSlug: product.slug,
      customerImageUrl: customerImage.secureUrl,
      frameImageUrl: frameImage?.url,
      status: "PROCESSING",
      disclaimer: PREVIEW_DISCLAIMER,
      promptVersion: PROMPT_VERSION,
      prompt
    }
  });

  const result = await requestFramePreview({
    requestId: previewRequest.id,
    product,
    customerImageUrl: customerImage.secureUrl,
    frameImageUrl: frameImage?.url ?? "",
    prompt
  });

  await prisma.framePreviewRequest.update({
    where: { id: previewRequest.id },
    data: {
      status: result.status,
      resultImageUrl: result.resultImageUrl,
      failureReason: result.failureReason
    }
  });

  await prisma.notification.create({
    data: {
      channel: "SYSTEM",
      status: "PENDING",
      recipient: "admin",
      subject: result.status === "READY" ? "AI frame preview ready" : "Frame preview fallback created",
      body:
        result.status === "READY"
          ? `${product.brand} ${product.name} preview generated.`
          : `${product.brand} ${product.name} preview request needs staff follow-up or model configuration.`,
      entityType: "FramePreviewRequest",
      entityId: previewRequest.id,
      metadata: {
        productSlug: product.slug,
        status: result.status,
        resultImageUrl: result.resultImageUrl,
        failureReason: result.failureReason
      }
    }
  });

  redirect(`/frames/try-on?request=${previewRequest.id}`);
}
