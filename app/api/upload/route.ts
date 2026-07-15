import { NextRequest, NextResponse } from "next/server";
import { cloudinaryConfigured, configureCloudinary } from "@/lib/integrations/cloudinary";
import { getAdminAccess, isManagerOrOwner } from "@/lib/admin-auth";
import { prisma } from "@/lib/db";
import { isRateLimited } from "@/lib/rate-limit";
import { assertSameOrigin } from "@/lib/request-security";
import { uploadedFileMatchesType } from "@/lib/uploads";

type UploadResult = {
  secure_url: string;
  public_id: string;
  format: string;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function updateUploadStatus(
  uploadId: string | null,
  data: { status?: string; assetUrl?: string; errorReason?: string; attempt?: number; lastAttempt?: Date }
) {
  if (!uploadId) return;
  await prisma.productImageUpload.update({
    where: { id: uploadId },
    data
  }).catch(() => null);
}

async function uploadToCloudinaryWithRetry(
  cloudinary: ReturnType<typeof configureCloudinary>,
  base64: string,
  options: Record<string, unknown>,
  uploadId: string | null,
  maxRetries = 3
) {
  let lastError: unknown;

  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    await updateUploadStatus(uploadId, {
      status: "uploading",
      attempt,
      lastAttempt: new Date()
    });

    try {
      const result = await new Promise<UploadResult>((resolve, reject) => {
        cloudinary.uploader.upload(base64, options, (error, result) => {
          if (error || !result) reject(error ?? new Error("Upload failed"));
          else resolve(result as UploadResult);
        });
      });

      await updateUploadStatus(uploadId, {
        status: "success",
        assetUrl: result.secure_url,
        attempt,
        lastAttempt: new Date()
      });

      return result;
    } catch (error) {
      lastError = error;
      if (attempt < maxRetries) {
        await sleep(750 * 2 ** (attempt - 1));
      }
    }
  }

  const message = lastError instanceof Error ? lastError.message : "Upload failed";
  await updateUploadStatus(uploadId, {
    status: "failed",
    errorReason: message,
    lastAttempt: new Date()
  });
  throw new Error(`Upload failed after ${maxRetries} attempts: ${message}`);
}

export async function POST(request: NextRequest) {
  try {
    const originError = assertSameOrigin(request);
    if (originError) return originError;

    if (await isRateLimited(request, { keyPrefix: "admin-upload", limit: 30, windowSeconds: 60 })) {
      return NextResponse.json({ error: "Too many upload attempts" }, { status: 429 });
    }

    // Check the active database role, not only a stale JWT claim.
    const admin = await getAdminAccess();
    if (!admin) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }
    if (!isManagerOrOwner(admin.role)) {
      return NextResponse.json({ error: "Manager access is required for uploads" }, { status: 403 });
    }
    if (!cloudinaryConfigured()) {
      return NextResponse.json({ error: "Upload storage is not configured" }, { status: 503 });
    }

    const cloudinary = configureCloudinary();
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const folder = String(formData.get("folder") ?? "prescriptions");
    const productId = String(formData.get("productId") ?? "").trim();
    const allowedFolders = new Set(["products", "ar", "prescriptions"]);

    if (!allowedFolders.has(folder)) {
      return NextResponse.json({ error: "Invalid upload folder" }, { status: 400 });
    }

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "Invalid file type. Allowed: JPEG, PNG, WebP, PDF." }, { status: 400 });
    }

    if (folder.includes("ar") && !["image/png", "image/webp"].includes(file.type)) {
      return NextResponse.json({ error: "AR overlays must be PNG or WebP so transparency is preserved." }, { status: 400 });
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large. Max 10MB." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    if (!uploadedFileMatchesType(file.type, buffer)) {
      return NextResponse.json({ error: "File content does not match its declared type" }, { status: 400 });
    }
    if (["products", "ar"].includes(folder)) {
      if (productId && !(await prisma.product.findUnique({ where: { id: productId }, select: { id: true } }))) {
        return NextResponse.json({ error: "The provided product ID is invalid" }, { status: 400 });
      }
    }
    const base64 = `data:${file.type};base64,${buffer.toString("base64")}`;

    const uploadLog = await prisma.productImageUpload.create({
      data: {
        productId: productId || undefined,
        fileName: file.name,
        status: "uploading",
        attempt: 0
      },
      select: { id: true }
    }).catch(() => null);

    const result = await uploadToCloudinaryWithRetry(
      cloudinary,
      base64,
      {
        folder: `vision-vistara/${folder}`,
        resource_type: file.type === "application/pdf" ? "raw" : "image",
        type: folder === "prescriptions" ? "authenticated" : "upload",
        transformation: folder === "products" ? [{ width: 1200, height: 1200, crop: "limit", quality: "auto" }] : undefined
      },
      uploadLog?.id ?? null
    );

    return NextResponse.json({
      url: result.secure_url,
      publicId: result.public_id,
      format: result.format
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json(
      { error: "Upload failed. Cloudinary may not be configured yet." },
      { status: 500 }
    );
  }
}
