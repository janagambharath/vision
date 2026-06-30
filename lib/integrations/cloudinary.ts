import { v2 as cloudinary } from "cloudinary";

export function configureCloudinary(): typeof cloudinary {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    // Return a mock object if not configured to prevent crashes during local development/builds
    return {
      config: () => ({}),
      uploader: {
        upload: (file: string, options: unknown, callback: (error: unknown, result: unknown) => void) => {
          console.warn("⚠️ Cloudinary mock upload triggered. Image URL will default to sample placeholder.");
          callback(null, {
            secure_url: "/assets/vision-vistara-eye-logo.png",
            public_id: "mock_public_id",
            format: "png"
          });
        }
      }
    } as unknown as typeof cloudinary;
  }

  cloudinary.config({
    cloud_name: cloudName,
    api_key: apiKey,
    api_secret: apiSecret
  });

  return cloudinary;
}

export function generateUploadSignature(paramsToSign: Record<string, string | number | boolean>) {
  const apiSecret = process.env.CLOUDINARY_API_SECRET;
  if (!apiSecret) return "";
  
  return cloudinary.utils.api_sign_request(paramsToSign, apiSecret);
}
