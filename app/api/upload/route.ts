import { NextRequest, NextResponse } from "next/server";
import { configureCloudinary } from "@/lib/integrations/cloudinary";
import { auth } from "@/auth";

export async function POST(request: NextRequest) {
  try {
    // Require admin authentication for uploads
    const session = await auth();
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const cloudinary = configureCloudinary();
    const formData = await request.formData();
    const file = formData.get("file") as File | null;
    const folder = String(formData.get("folder") ?? "prescriptions");

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({ error: "Invalid file type. Allowed: JPEG, PNG, WebP, PDF." }, { status: 400 });
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large. Max 10MB." }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = `data:${file.type};base64,${buffer.toString("base64")}`;

    const result = await new Promise<{ secure_url: string; public_id: string; format: string }>((resolve, reject) => {
      cloudinary.uploader.upload(
        base64,
        {
          folder: `vision-vistara/${folder}`,
          resource_type: "auto",
          transformation: folder === "products" ? [{ width: 1200, height: 1200, crop: "limit", quality: "auto" }] : undefined
        },
        (error, result) => {
          if (error || !result) reject(error ?? new Error("Upload failed"));
          else resolve(result as { secure_url: string; public_id: string; format: string });
        }
      );
    });

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
