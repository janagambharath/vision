import { permanentRedirect } from "next/navigation";

/** Retire the legacy duplicate account verification route. */
export default function LegacyFramesAccountVerifyPage() {
  permanentRedirect("/account/login");
}
