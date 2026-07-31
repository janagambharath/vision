import { permanentRedirect } from "next/navigation";

/** Customer sign-in is served from the single Google-account route. */
export default function LegacyFramesAccountLoginPage() {
  permanentRedirect("/account/login");
}
