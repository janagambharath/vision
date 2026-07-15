import { permanentRedirect } from "next/navigation";

/** Retire the duplicate OTP verifier that stored plaintext codes. */
export default function LegacyFramesAccountVerifyPage() {
  permanentRedirect("/account/login");
}
