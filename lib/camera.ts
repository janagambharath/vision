export type CameraFacing = "user" | "environment";

/** Release the old stream before calling this when switching phone cameras. */
export async function openCamera(facing: CameraFacing, mediaDevices: Pick<MediaDevices, "getUserMedia"> = navigator.mediaDevices) {
  const mode = { exact: facing };
  const attempts: MediaStreamConstraints[] = [
    { video: { facingMode: mode, width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false },
    { video: { facingMode: mode }, audio: false },
    // Laptops may not report facingMode. Never silently substitute the front camera for a requested back camera.
    ...(facing === "user" ? [{ video: true, audio: false }] : [])
  ];
  let lastError: unknown;
  for (const constraints of attempts) {
    try {
      return await mediaDevices.getUserMedia(constraints);
    } catch (error) {
      lastError = error;
      if (error instanceof Error && ["NotAllowedError", "PermissionDeniedError", "SecurityError"].includes(error.name)) throw error;
    }
  }
  if (facing === "environment") throw new Error("Back camera unavailable. Use the front camera or check camera permissions.");
  throw lastError;
}

export function activeCameraFacing(stream: MediaStream, requested: CameraFacing): CameraFacing {
  const facing = stream.getVideoTracks()[0]?.getSettings().facingMode;
  return facing === "user" || facing === "environment" ? facing : requested;
}
