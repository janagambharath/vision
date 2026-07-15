import { permanentRedirect } from "next/navigation";

/** The secure OTP flow is served from the single canonical account route. */
export default function LegacyFramesAccountLoginPage() {
  permanentRedirect("/account/login");
}
