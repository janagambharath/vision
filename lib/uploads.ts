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

function bytesStartWith(bytes: Buffer, expected: number[]) {
  return expected.every((value, index) => bytes[index] === value);
}

export function uploadedFileMatchesType(type: string, bytes: Buffer) {
  if (type === "image/jpeg") return bytesStartWith(bytes, [0xff, 0xd8, 0xff]);
  if (type === "image/png") return bytesStartWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (type === "image/webp") {
    return bytes.subarray(0, 4).toString("ascii") === "RIFF" && bytes.subarray(8, 12).toString("ascii") === "WEBP";
  }
  if (type === "application/pdf") return bytes.subarray(0, 5).toString("ascii") === "%PDF-";
  return false;
}

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
  maxRetries?: number;
};

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
  if (!uploadedFileMatchesType(value.type, buffer)) {
    throw new Error("Upload content does not match the declared file type.");
  }
  const maxRetries = options.maxRetries ?? 3;

  for (let attempt = 1; attempt <= maxRetries; attempt += 1) {
    try {
      return await new Promise<UploadedAsset>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          {
            folder,
            resource_type: value.type === "application/pdf" ? "raw" : "image",
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
    } catch (error) {
      if (attempt === maxRetries) {
        const message = error instanceof Error ? error.message : "Cloudinary upload failed.";
        throw new Error(`Upload failed after ${maxRetries} attempts: ${message}`);
      }
      await sleep(750 * 2 ** (attempt - 1));
    }
  }

  return null;
}

export function imageUploadOptions(maxBytes = 6 * 1024 * 1024): UploadOptions {
  return {
    allowedTypes: ALLOWED_IMAGE_TYPES,
    maxBytes
  };
}
