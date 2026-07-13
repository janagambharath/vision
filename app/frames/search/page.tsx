import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, Search, SlidersHorizontal } from "lucide-react";
import { ProductCard } from "@/components/product-card";
import { getStoreProducts, getCategories } from "@/lib/store-data";
import { SITE_URL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Search Frames",
  description: "Search the Vision Vistara frames collection by brand, material, shape, colour, size, or SKU.",
  alternates: { canonical: `${SITE_URL}/frames/search` }
};

export default async function SearchPage({
  searchParams
}: {
  searchParams?: Promise<{ q?: string; category?: string; material?: string; shape?: string; sort?: string; minPrice?: string; maxPrice?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const hasQuery = !!(params.q || params.category || params.material || params.shape);

  const [rawProducts, categories] = await Promise.all([
    getStoreProducts({ query: params.q, category: params.category }),
    getCategories()
  ]);
  let products = rawProducts;

  // Additional filters
  if (params.material) {
    products = products.filter((p) => p.material.toLowerCase().includes(params.material!.toLowerCase()));
  }
  if (params.shape) {
    products = products.filter((p) => p.shape.toLowerCase().includes(params.shape!.toLowerCase()));
  }
  if (params.minPrice) {
    const min = parseInt(params.minPrice) * 100;
    products = products.filter((p) => (p.pricePaise ?? 0) >= min);
  }
  if (params.maxPrice) {
    const max = parseInt(params.maxPrice) * 100;
    products = products.filter((p) => (p.pricePaise ?? 0) <= max);
  }

  // Sort
  if (params.sort === "price-asc") products.sort((a, b) => (a.pricePaise ?? 0) - (b.pricePaise ?? 0));
  else if (params.sort === "price-desc") products.sort((a, b) => (b.pricePaise ?? 0) - (a.pricePaise ?? 0));

  const materials = ["Acetate", "Metal Alloy", "Titanium", "Beta-Titanium", "TR-90 Nylon", "Stainless Steel", "ULTEM"];
  const shapes = ["Round", "Square", "Rectangle", "Aviator", "Cat Eye"];

  return (
    <main className="vv-section bg-paper">
      <div className="vv-container">
        <Link href="/frames" className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" />
          Back to store
        </Link>

        <div className="mb-8">
          <p className="vv-kicker text-retail">Search</p>
          <h1 className="text-4xl font-extrabold">Find your perfect frame.</h1>
        </div>

        <div className="grid gap-8 lg:grid-cols-[280px_1fr]">
          {/* Filter sidebar */}
          <aside>
            <form className="vv-card grid gap-5 p-5" action="/frames/search">
              <h2 className="flex items-center gap-2 text-lg font-extrabold">
                <SlidersHorizontal className="h-5 w-5 text-retail" />
                Filters
              </h2>

              <label className="grid gap-1 text-sm font-extrabold text-slate-600">
                Search
                <input className="store-input" type="search" name="q" defaultValue={params.q ?? ""} placeholder="Brand, name, SKU..." />
              </label>

              <label className="grid gap-1 text-sm font-extrabold text-slate-600">
                Category
                <select className="store-input" name="category" defaultValue={params.category ?? ""}>
                  <option value="">All</option>
                  {categories.map((cat) => (
                    <option key={cat.slug} value={cat.slug}>{cat.name}</option>
                  ))}
                </select>
              </label>

              <label className="grid gap-1 text-sm font-extrabold text-slate-600">
                Material
                <select className="store-input" name="material" defaultValue={params.material ?? ""}>
                  <option value="">All</option>
                  {materials.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </label>

              <label className="grid gap-1 text-sm font-extrabold text-slate-600">
                Shape
                <select className="store-input" name="shape" defaultValue={params.shape ?? ""}>
                  <option value="">All</option>
                  {shapes.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-1 text-sm font-extrabold text-slate-600">
                  Min ₹
                  <input className="store-input" type="number" name="minPrice" defaultValue={params.minPrice ?? ""} placeholder="0" />
                </label>
                <label className="grid gap-1 text-sm font-extrabold text-slate-600">
                  Max ₹
                  <input className="store-input" type="number" name="maxPrice" defaultValue={params.maxPrice ?? ""} placeholder="10000" />
                </label>
              </div>

              <label className="grid gap-1 text-sm font-extrabold text-slate-600">
                Sort by
                <select className="store-input" name="sort" defaultValue={params.sort ?? ""}>
                  <option value="">Relevance</option>
                  <option value="price-asc">Price: low to high</option>
                  <option value="price-desc">Price: high to low</option>
                </select>
              </label>

              <button className="vv-button-retail" type="submit">
                <Search className="h-4 w-4" />
                Search
              </button>

              {hasQuery ? (
                <Link href="/frames/search" className="text-center text-sm font-bold text-slate-500 hover:text-retail">
                  Clear all filters
                </Link>
              ) : null}
            </form>
          </aside>

          {/* Results */}
          <div>
            <div className="mb-6 flex items-center justify-between">
              <p className="text-sm font-bold text-slate-600">
                {hasQuery ? `${products.length} result${products.length !== 1 ? "s" : ""} found` : `${products.length} frames in collection`}
              </p>
            </div>

            {products.length ? (
              <div className="grid gap-5 md:grid-cols-2">
                {products.map((product) => (
                  <ProductCard key={product.slug} product={product} />
                ))}
              </div>
            ) : (
              <div className="vv-card p-8 text-center">
                <Search className="mx-auto h-12 w-12 text-slate-300" />
                <h3 className="mt-4 text-xl font-extrabold">No frames match your search</h3>
                <p className="mt-2 text-slate-600">Try different keywords or clear your filters.</p>
                <Link className="vv-button-retail mt-5" href="/frames/search">Clear filters</Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
