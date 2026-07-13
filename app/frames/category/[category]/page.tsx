import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ProductCard } from "@/components/product-card";
import { getStoreProducts, getCategories } from "@/lib/store-data";
import { SITE_URL } from "@/lib/constants";

export async function generateStaticParams() {
  const categories = await getCategories();
  return categories.map((category) => ({ category: category.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ category: string }> }): Promise<Metadata> {
  const { category } = await params;
  const categories = await getCategories();
  const cat = categories.find(c => c.slug === category);
  const label = cat?.name ?? category.replace(/-/g, " ");
  return {
    title: `${label} Frames`,
    description: cat?.seoDescription ?? `Shop ${label} eyewear frames at Vision Vistara — verified inventory with lens options, try-at-home, and checkout.`,
    alternates: { canonical: `${SITE_URL}/frames/category/${category}` }
  };
}

export default async function CategoryPage({ params }: { params: Promise<{ category: string }> }) {
  const { category } = await params;
  const [products, categories] = await Promise.all([
    getStoreProducts({ category }),
    getCategories()
  ]);
  const currentCat = categories.find(c => c.slug === category);
  const label = currentCat?.name ?? category.replace(/-/g, " ");

  return (
    <main className="vv-section bg-paper">
      <div className="vv-container">
        <Link href="/frames" className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" />
          Back to store
        </Link>

        <nav className="mb-4 text-sm font-bold text-slate-500" aria-label="Breadcrumb">
          <Link href="/frames">Frames</Link> / <span className="text-slate-900">{label}</span>
        </nav>

        <div className="mb-8">
          <p className="vv-kicker text-retail">{label}</p>
          <h1 className="text-4xl font-extrabold">{label} Frames</h1>
          <p className="mt-2 text-slate-600">{products.length} frame{products.length !== 1 ? "s" : ""} available in this category.</p>
          {currentCat?.description && (
            <p className="mt-1 text-sm text-slate-500">{currentCat.description}</p>
          )}
        </div>

        {/* Category Navigation */}
        <div className="mb-8 flex flex-wrap gap-2">
          {categories.slice(0, 12).map((cat) => (
            <Link
              key={cat.slug}
              href={`/frames/category/${cat.slug}`}
              className={`rounded-full border px-4 py-2 text-sm font-bold transition ${
                cat.slug === category
                  ? "border-retail bg-teal-50 text-retail"
                  : "border-slate-200 text-slate-600 hover:border-retail hover:text-retail"
              }`}
            >
              {cat.name}
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
