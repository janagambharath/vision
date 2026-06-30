import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ProductCard } from "@/components/product-card";
import { getStoreProducts } from "@/lib/store-data";
import { filterOptions } from "@/lib/inventory";
import { SITE_URL } from "@/lib/constants";

export async function generateStaticParams() {
  return filterOptions.map((category) => ({ category }));
}

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const { category } = await params;
  const label = category.replace(/-/g, " ");
  return {
    title: `${label.charAt(0).toUpperCase() + label.slice(1)} Frames`,
    description: `Shop ${label} eyewear frames at Vision Vistara — verified inventory with lens options, try-at-home, and checkout.`,
    alternates: { canonical: `${SITE_URL}/frames/category/${category}` }
  };
}

export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  const products = await getStoreProducts({ category });
  const label = category.replace(/-/g, " ");

  return (
    <main className="vv-section bg-paper">
      <div className="vv-container">
        <Link href="/frames" className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" />
          Back to store
        </Link>

        <nav className="mb-4 text-sm font-bold text-slate-500" aria-label="Breadcrumb">
          <Link href="/frames">Frames</Link> / <span className="capitalize text-slate-900">{label}</span>
        </nav>

        <div className="mb-8">
          <p className="vv-kicker text-retail capitalize">{label}</p>
          <h1 className="text-4xl font-extrabold capitalize">{label} frames</h1>
          <p className="mt-2 text-slate-600">{products.length} frame{products.length !== 1 ? "s" : ""} available in this category.</p>
        </div>

        {/* Category Navigation */}
        <div className="mb-8 flex flex-wrap gap-2">
          {filterOptions.slice(0, 10).map((cat) => (
            <Link
              key={cat}
              href={`/frames/category/${cat}`}
              className={`rounded-full border px-4 py-2 text-sm font-bold transition ${
                cat === category
                  ? "border-retail bg-teal-50 text-retail"
                  : "border-slate-200 text-slate-600 hover:border-retail hover:text-retail"
              }`}
            >
              {cat.replace(/-/g, " ")}
            </Link>
          ))}
        </div>

        {products.length ? (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <ProductCard key={product.slug} product={product} />
            ))}
          </div>
        ) : (
          <div className="vv-card p-8">
            <h3 className="text-xl font-extrabold">No frames in this category yet.</h3>
            <p className="mt-2 text-slate-600">Browse the full collection or try a different category.</p>
            <Link className="vv-button-retail mt-5" href="/frames">Browse all frames</Link>
          </div>
        )}
      </div>
    </main>
  );
}
