import { Buffer } from "node:buffer";
import { configureCloudinary } from "@/lib/integrations/cloudinary";

const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
const ALLOWED_UPLOAD_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf"
]);

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export type UploadedAsset = {
  secureUrl: string;
  publicId: string;
  originalFilename: string;
  bytes: number;
  format?: string;
};

type UploadOptions = {
  allowedTypes?: Set<string>;
  maxBytes?: number;
};

export async function uploadFormFile(
  value: FormDataEntryValue | null,
  folder: string,
  options: UploadOptions = {}
): Promise<UploadedAsset | null> {
  if (!(value instanceof File) || value.size === 0) return null;

  const maxBytes = options.maxBytes ?? MAX_UPLOAD_BYTES;
  const allowedTypes = options.allowedTypes ?? ALLOWED_UPLOAD_TYPES;

  if (value.size > maxBytes) {
    throw new Error(`Upload is larger than ${Math.floor(maxBytes / (1024 * 1024))} MB.`);
  }

  if (!allowedTypes.has(value.type)) {
    throw new Error("Upload type is not allowed.");
  }

  const cloudinary = configureCloudinary();
  const buffer = Buffer.from(await value.arrayBuffer());

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      {
        folder,
        resource_type: "auto",
        use_filename: true,
        unique_filename: true
      },
      (error, result) => {
        if (error || !result) {
          reject(error ?? new Error("Cloudinary upload failed."));
          return;
        }

        resolve({
          secureUrl: result.secure_url,
          publicId: result.public_id,
          originalFilename: value.name,
          bytes: result.bytes,
          format: result.format
        });
      }
    );

    stream.end(buffer);
  });
}

export function imageUploadOptions(maxBytes = 6 * 1024 * 1024): UploadOptions {
  return {
    allowedTypes: ALLOWED_IMAGE_TYPES,
    maxBytes
  };
}
