import type { Metadata } from "next";
import Link from "next/link";
import { ShoppingBag, Search } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SITE_URL, STORE_NAME } from "@/lib/constants";
import { CompareProvider } from "@/components/compare-context";
import { CompareBar } from "@/components/compare-bar";

export const metadata: Metadata = {
  title: STORE_NAME,
  description:
    "Shop Vision Vistara verified optical frames with lens options, try-at-home booking, cart, checkout, and order tracking.",
  alternates: { canonical: `${SITE_URL}/frames` },
  openGraph: {
    title: STORE_NAME,
    description: "Dedicated premium optical frames store from Vision Vistara.",
    url: `${SITE_URL}/frames`,
    images: ["/assets/vision-vistara-wordmark.png"]
  }
};

export default function FramesLayout({ children }: { children: React.ReactNode }) {
  return (
    <CompareProvider>
      <SiteHeader mode="store" />
      {/* Brand strip with inline search */}
      <div className="border-b border-blue-200 bg-gradient-to-r from-blue-950 via-blue-700 to-sky-50">
        <div className="vv-container flex items-center justify-between gap-3 py-2">
          <Link
            href="/frames"
            className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-white hover:text-cyan-100 transition shrink-0"
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            Frames Store
          </Link>
          {/* Inline search */}
          <form action="/frames/search" method="GET" className="relative flex-1 max-w-xs hidden sm:flex">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-blue-100" />
            <input
              type="search"
              name="q"
              placeholder="Search frames…"
              aria-label="Search frames"
              className="w-full rounded-full border border-white/30 bg-white/15 py-1.5 pl-8 pr-3 text-xs text-white placeholder:text-blue-100/75 outline-none transition focus:border-white/60 focus:bg-white/25"
            />
          </form>
          <p className="hidden shrink-0 text-[10px] font-bold tracking-wide text-blue-950 md:block">
            Free exchange · 7-day returns · Clinic-verified
          </p>
        </div>
      </div>
      {children}
      <CompareBar />
    </CompareProvider>
  );
}

