import Link from "next/link";
import { Metadata } from "next";
import { ArrowRight, Filter, SlidersHorizontal, Sparkles, Star, Truck } from "lucide-react";
import { ProductCard } from "@/components/product-card";
import { getStoreProducts, getFeaturedProducts, getCategories } from "@/lib/store-data";
import { productIsSellable } from "@/lib/inventory";
import { SITE_URL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Frames Store",
  description:
    "Shop premium optical frames at Vision Vistara — 18+ verified frames with lens options, try-at-home, search, filters, cart, checkout, and order tracking.",
  alternates: { canonical: `${SITE_URL}/frames` }
};

export default async function FramesPage({
  searchParams
}: {
  searchParams?: Promise<{ q?: string; category?: string; sort?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const isFiltered = !!(params.q || params.category || params.sort);
  const products = await getStoreProducts({ query: params.q, category: params.category });
  const featured = await getFeaturedProducts(6);
  const categories = await getCategories();

  const sortedProducts = [...products].sort((a, b) => {
    if (params.sort === "price-asc") return (a.pricePaise ?? Number.MAX_SAFE_INTEGER) - (b.pricePaise ?? Number.MAX_SAFE_INTEGER);
    if (params.sort === "price-desc") return (b.pricePaise ?? 0) - (a.pricePaise ?? 0);
    if (params.sort === "new") return b.slug.localeCompare(a.slug);
    return Number(b.featured) - Number(a.featured) || Number(productIsSellable(b)) - Number(productIsSellable(a));
  });


  return (
    <main>


      {/* Search & Filter Bar */}
      <section className="store-band">
        <div className="vv-container py-4">
          <form className="grid gap-3 lg:grid-cols-[1fr_200px_200px_auto]" action="/frames">
            <label className="grid gap-1 text-sm font-extrabold text-slate-600">
              Search frames
              <input className="store-input" type="search" name="q" defaultValue={params.q ?? ""} placeholder="Brand, SKU, material, shape, colour..." />
            </label>
            <label className="grid gap-1 text-sm font-extrabold text-slate-600">
              Category
              <select className="store-input" name="category" defaultValue={params.category ?? ""}>
                <option value="">All categories</option>
                {categories.map((cat) => (
                  <option key={cat.slug} value={cat.slug}>
                    {cat.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm font-extrabold text-slate-600">
              Sort
              <select className="store-input" name="sort" defaultValue={params.sort ?? "featured"}>
                <option value="featured">Featured</option>
                <option value="new">New arrivals</option>
                <option value="price-asc">Price: low to high</option>
                <option value="price-desc">Price: high to low</option>
              </select>
            </label>
            <button className="vv-button-retail self-end" type="submit">
              <SlidersHorizontal className="h-4 w-4" />
              Apply
            </button>
          </form>
        </div>
      </section>

      {/* Featured Section (only on unfiltered view) */}
      {!isFiltered && featured.length > 0 ? (
        <section className="vv-section bg-white">
          <div className="vv-container">
            <div className="mb-8 flex items-end justify-between gap-4">
              <div>
                <p className="vv-kicker text-retail flex items-center gap-2">
                  <Star className="h-4 w-4" />
                  Featured collection
                </p>
                <h2 className="text-3xl font-extrabold">Handpicked by our optometrist.</h2>
              </div>
              <Link className="vv-button-light" href="/frames?sort=featured">
                View all
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {featured.map((product) => (
                <ProductCard key={product.slug} product={product} />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {/* All Products */}
      <section className="vv-section bg-paper">
        <div className="vv-container">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="vv-kicker text-retail">{isFiltered ? "Search results" : "All frames"}</p>
              <h2 className="text-3xl font-extrabold">
                {isFiltered ? `${sortedProducts.length} frame${sortedProducts.length !== 1 ? "s" : ""} found` : "Complete collection"}
              </h2>
              {params.q ? <p className="mt-2 text-slate-600">Showing results for &quot;{params.q}&quot;</p> : null}
            </div>
            <span className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-extrabold text-slate-600">
              {sortedProducts.length} frames
            </span>
          </div>

          {sortedProducts.length ? (
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {sortedProducts.map((product) => (
                <ProductCard key={product.slug} product={product} />
              ))}
            </div>
          ) : (
            <div className="vv-card p-8">
              <Filter className="h-10 w-10 text-amber-600" />
              <h3 className="mt-4 text-2xl font-extrabold">No frames match your search.</h3>
              <p className="mt-2 text-slate-600">Try adjusting your filters or browse the complete collection.</p>
              <Link className="vv-button-retail mt-5" href="/frames">
                Browse all frames
              </Link>
            </div>
          )}
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="bg-ink py-16 text-white">
        <div className="vv-container grid items-center gap-6 md:grid-cols-[1fr_auto_auto]">
          <div>
            <Sparkles className="h-8 w-8 text-teal-300" />
            <h2 className="mt-4 text-3xl font-extrabold">Not sure which frame suits you?</h2>
            <p className="mt-2 text-slate-300">Try up to 5 frames at home or visit the clinic for a professional fitting.</p>
          </div>
          <Link className="vv-button-retail" href="/frames/try-at-home">
            <Truck className="h-5 w-5" />
            Book Home Trial
          </Link>
          <Link className="vv-button-light" href="/appointments">
            Visit Clinic
          </Link>
        </div>
      </section>
    </main>
  );
}


