import type { Metadata } from "next";
import Link from "next/link";
import { ShoppingBag } from "lucide-react";
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
      {/* Minimal brand strip — replaces the cluttered button row */}
      <div className="border-b border-teal-900/10 bg-gradient-to-r from-ink via-slate-900 to-ink">
        <div className="vv-container flex items-center justify-between py-2">
          <Link
            href="/frames"
            className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-teal-300 hover:text-white transition"
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            Frames Store
          </Link>
          <p className="hidden sm:block text-[10px] font-bold text-slate-400 tracking-wide">
            Free exchange · 7-day returns · Clinic-verified
          </p>
        </div>
      </div>
      {children}
      <CompareBar />
    </CompareProvider>
  );
}
