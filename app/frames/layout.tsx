import type { Metadata } from "next";
import Link from "next/link";
import { Search, ShoppingBag, Truck, WandSparkles, Heart } from "lucide-react";
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
      <div className="border-b border-slate-200 bg-white">
        <div className="vv-container flex flex-wrap items-center justify-between gap-3 py-3 text-sm font-bold text-slate-600">
          <nav className="flex flex-wrap gap-3" aria-label="Store links">
            <Link className="inline-flex items-center gap-2 rounded-full bg-teal-50 px-3 py-2 text-retail" href="/frames">
              <ShoppingBag className="h-4 w-4" />
              Storefront
            </Link>
            <Link className="inline-flex items-center gap-2 rounded-full px-3 py-2" href="/frames/search">
              <Search className="h-4 w-4" />
              Search
            </Link>
            <Link className="inline-flex items-center gap-2 rounded-full px-3 py-2" href="/frames/try-at-home">
              <WandSparkles className="h-4 w-4" />
              Try at Home
            </Link>
            <Link className="inline-flex items-center gap-2 rounded-full px-3 py-2" href="/frames/wishlist">
              <Heart className="h-4 w-4 text-red-500 fill-red-500" />
              Wishlist
            </Link>
            <Link className="inline-flex items-center gap-2 rounded-full px-3 py-2" href="/frames/orders/lookup">
              <Truck className="h-4 w-4" />
              Track Order
            </Link>
          </nav>
          <p className="text-xs uppercase tracking-normal text-slate-500">Retail section: product-first, checkout-ready, database-backed</p>
        </div>
      </div>
      {children}
      <CompareBar />
    </CompareProvider>
  );
}
