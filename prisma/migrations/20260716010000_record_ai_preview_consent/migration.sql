-- Preserve a durable record of the exact customer consent accepted before a
-- biometric-adjacent try-on image is sent to a third-party image provider.
ALTER TABLE "frame_preview_requests"
  ADD COLUMN "privacyConsentVersion" TEXT,
  ADD COLUMN "privacyConsentAt" TIMESTAMP(3);

CREATE INDEX "frame_preview_requests_privacyConsentAt_idx"
  ON "frame_preview_requests"("privacyConsentAt");
