import { NextResponse } from "next/server";
import { SITE_URL } from "@/lib/constants";

function hostFromUrl(value: string | null) {
  if (!value) return null;
  try {
    return new URL(value).host;
  } catch {
    return null;
  }
}

export function assertSameOrigin(request: Request) {
  const requestHost = request.headers.get("host");
  const originHost = hostFromUrl(request.headers.get("origin"));
  const refererHost = hostFromUrl(request.headers.get("referer"));
  const configuredHost = hostFromUrl(SITE_URL);
  const fetchSite = request.headers.get("sec-fetch-site");

  if (fetchSite === "cross-site") {
    return NextResponse.json({ error: "Cross-site mutation blocked" }, { status: 403 });
  }

  const trustedHosts = new Set([requestHost, configuredHost].filter(Boolean));
  const presentedHost = originHost ?? refererHost;

  if (!presentedHost || !trustedHosts.has(presentedHost)) {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }

  return null;
}
