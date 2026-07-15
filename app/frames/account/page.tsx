import { permanentRedirect } from "next/navigation";

/** Legacy route retained only so bookmarked store URLs stay valid. */
export default function LegacyFramesAccountPage() {
  permanentRedirect("/account");
}
