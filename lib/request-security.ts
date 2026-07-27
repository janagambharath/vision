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
  const originHost = hostFromUrl(request.headers.get("origin"));
  const refererHost = hostFromUrl(request.headers.get("referer"));
  const configuredHost = hostFromUrl(SITE_URL);
  const fetchSite = request.headers.get("sec-fetch-site");

  if (fetchSite === "cross-site") {
    return NextResponse.json({ error: "Cross-site mutation blocked" }, { status: 403 });
  }

  // Never make a caller-controlled Host header trusted. In production the
  // canonical public origin is the only permitted origin; local loopback is
  // allowed solely for developer workflows.
  const trustedHosts = new Set([configuredHost].filter(Boolean));
  if (process.env.NODE_ENV !== "production") {
    const requestHost = request.headers.get("host")?.toLowerCase();
    if (requestHost && /^(localhost|127\.0\.0\.1)(?::\d+)?$/.test(requestHost)) {
      trustedHosts.add(requestHost);
    }
  }
  const presentedHost = originHost ?? refererHost;

  if (!presentedHost || !trustedHosts.has(presentedHost)) {
    return NextResponse.json({ error: "Invalid request origin" }, { status: 403 });
  }

  return null;
}
