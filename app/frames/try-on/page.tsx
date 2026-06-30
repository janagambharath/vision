import Link from "next/link";
import VirtualTryOn from "@/components/virtual-try-on";
import { ArrowLeft, Sparkles } from "lucide-react";

export const metadata = {
  title: "Virtual Try-On Camera | Vision Vistara",
  description: "Live camera-based frame fitting try-on overlay on Vision Vistara."
};

export default async function VirtualTryOnPage({ searchParams }: { searchParams: Promise<{ slug?: string }> }) {
  const params = await searchParams;
  const slug = params.slug ?? "";

  return (
    <main className="vv-section bg-paper min-h-screen">
      <div className="vv-container max-w-5xl">
        <Link href="/frames" className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" />
          Back to Catalog
        </Link>

        <div className="mb-8 flex items-center justify-between">
          <div>
            <p className="vv-kicker text-retail">Interactive Experience</p>
            <h1 className="text-4xl font-extrabold text-slate-900 flex items-center gap-2 font-sans">
              <Sparkles className="h-8 w-8 text-retail fill-teal-100" />
              Virtual Try-On
            </h1>
            <p className="mt-2 text-slate-600">Simulate frame fitting live via secure HTML5 camera overlays.</p>
          </div>
        </div>

        <VirtualTryOn productSlug={slug} />
      </div>
    </main>
  );
}
