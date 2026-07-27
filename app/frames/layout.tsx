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
      <div className="border-b border-teal-900/10 bg-gradient-to-r from-ink via-slate-900 to-ink">
        <div className="vv-container flex items-center justify-between gap-3 py-2">
          <Link
            href="/frames"
            className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-teal-300 hover:text-white transition shrink-0"
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            Frames Store
          </Link>
          {/* Inline search */}
          <form action="/frames/search" method="GET" className="relative flex-1 max-w-xs hidden sm:flex">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-500 pointer-events-none" />
            <input
              type="search"
              name="q"
              placeholder="Search frames…"
              aria-label="Search frames"
              className="w-full rounded-full bg-white/10 border border-white/10 pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-slate-500 outline-none focus:bg-white/15 focus:border-teal-400/40 transition"
            />
          </form>
          <p className="hidden md:block text-[10px] font-bold text-slate-400 tracking-wide shrink-0">
            Free exchange · 7-day returns · Clinic-verified
          </p>
        </div>
      </div>
      {children}
      <CompareBar />
    </CompareProvider>
  );
}

