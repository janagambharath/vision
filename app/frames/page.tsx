import Link from "next/link";
import { Metadata } from "next";
import { ArrowRight, Filter, Search, Sparkles, Star, Truck } from "lucide-react";
import { ProductCard } from "@/components/product-card";
import { getStoreProducts, getStoreProductsCount, getFeaturedProducts, normalizeCatalogPage, PUBLIC_CATALOG_PAGE_SIZE } from "@/lib/store-data";
import { SITE_URL } from "@/lib/constants";
import { toPublicStoreProduct } from "@/lib/inventory";

export const metadata: Metadata = {
  title: "Frames Store",
  description:
    "Shop premium optical frames at Vision Vistara — verified frames with lens options, try-at-home, cart, checkout, and order tracking.",
  alternates: { canonical: `${SITE_URL}/frames` }
};

const CATEGORY_FILTERS = [
  { label: "Unisex", value: "Unisex" },
  { label: "Kids", value: "Kids" }
];

export default async function FramesPage({
  searchParams
}: {
  searchParams?: Promise<{ q?: string; gender?: string; page?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const requestedPage = normalizeCatalogPage(params.page);
  const hasFilters = Boolean(params.q?.trim() || params.gender);
  const catalogOptions = { query: params.q, gender: params.gender };
  const totalCount = await getStoreProductsCount(catalogOptions);
  const totalPages = Math.max(1, Math.ceil(totalCount / PUBLIC_CATALOG_PAGE_SIZE));
  const currentPage = Math.min(requestedPage, totalPages);
  const [products, featured] = await Promise.all([
    getStoreProducts({ ...catalogOptions, page: currentPage, limit: PUBLIC_CATALOG_PAGE_SIZE }),
    !hasFilters && currentPage === 1 ? getFeaturedProducts(6) : Promise.resolve([])
  ]);

  const pageHref = (page: number) => {
    const query = new URLSearchParams();
    if (params.q) query.set("q", params.q);
    if (params.gender) query.set("gender", params.gender);
    if (page > 1) query.set("page", String(page));
    const search = query.toString();
    return search ? `/frames?${search}` : "/frames";
  };

  return (
    <main>
      {!params.q?.trim() && currentPage === 1 ? (
        <section className="border-b border-slate-100 bg-white">
          <div className="vv-container flex flex-wrap items-center gap-2 py-4">
            <p className="mr-1 text-xs font-extrabold uppercase tracking-wider text-slate-500">Shop frames</p>
            <nav className="flex flex-wrap gap-2" aria-label="Shop frames by audience">
              {CATEGORY_FILTERS.map((filter) => {
                const active = params.gender === filter.value;
                return (
                  <Link
                    key={filter.value}
                    href={`/frames?gender=${encodeURIComponent(filter.value)}`}
                    aria-current={active ? "page" : undefined}
                    className={`rounded-full border px-3 py-1.5 text-xs font-extrabold transition ${
                      active
                        ? "border-teal-700 bg-teal-700 text-white"
                        : "border-slate-200 bg-slate-50 text-slate-700 hover:border-teal-300 hover:bg-teal-50 hover:text-teal-800"
                    }`}
                  >
                    {filter.label}
                  </Link>
                );
              })}
            </nav>
          </div>
        </section>
      ) : null}

      <section className="store-band">
        <div className="vv-container py-4">
          <form className="flex flex-col gap-2 sm:flex-row sm:items-end" action="/frames">
            {params.gender ? <input type="hidden" name="gender" value={params.gender} /> : null}
            <label className="grid flex-1 gap-1 text-sm font-extrabold text-slate-600">
              Search frames
              <input className="store-input" type="search" name="q" defaultValue={params.q ?? ""} placeholder="Name, brand, SKU, material, shape, colour..." />
            </label>
            <button className="vv-button-retail min-h-[36px] shrink-0 px-3 py-1.5 text-xs" type="submit">
              <Search className="h-3.5 w-3.5" />
              Search
            </button>
            {hasFilters ? (
              <Link href="/frames" className="self-center text-xs font-bold text-slate-500 hover:text-retail sm:self-end sm:pb-2">
                Clear filters
              </Link>
            ) : null}
          </form>
        </div>
      </section>

      {!hasFilters && currentPage === 1 && featured.length > 0 ? (
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
              <Link className="vv-button-light" href="/frames">
                View all
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {featured.map((product) => (
                <ProductCard key={product.slug} product={toPublicStoreProduct(product)} />
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="vv-section bg-paper">
        <div className="vv-container">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="vv-kicker text-retail">{hasFilters ? "Filtered frames" : "All frames"}</p>
              <h2 className="text-3xl font-extrabold">
                {hasFilters ? `${totalCount} frame${totalCount !== 1 ? "s" : ""} found` : "Complete collection"}
              </h2>
              {params.q ? <p className="mt-2 text-slate-600">Showing results for &quot;{params.q}&quot;</p> : null}
              {params.gender ? <p className="mt-2 text-slate-600">Showing {params.gender.toLowerCase()} frames.</p> : null}
            </div>
            <span className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-extrabold text-slate-600">
              {totalCount} frames
            </span>
          </div>

          {products.length ? (
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {products.map((product) => (
                <ProductCard key={product.slug} product={toPublicStoreProduct(product)} />
              ))}
            </div>
          ) : (
            <div className="vv-card p-8">
              <Filter className="h-10 w-10 text-amber-600" />
              <h3 className="mt-4 text-2xl font-extrabold">No frames match your search.</h3>
              <p className="mt-2 text-slate-600">Try a different search phrase or browse the complete collection.</p>
              <Link className="vv-button-retail mt-5" href="/frames">
                Browse all frames
              </Link>
            </div>
          )}

          {totalPages > 1 ? (
            <nav className="mt-8 flex flex-wrap items-center justify-center gap-3" aria-label="Catalog pages">
              {currentPage > 1 ? (
                <Link href={pageHref(currentPage - 1)} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:border-teal-300 hover:text-teal-800">
                  Previous
                </Link>
              ) : null}
              <span className="text-sm font-bold text-slate-600">Page {currentPage} of {totalPages}</span>
              {currentPage < totalPages ? (
                <Link href={pageHref(currentPage + 1)} className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-bold text-slate-700 transition hover:border-teal-300 hover:text-teal-800">
                  Next
                </Link>
              ) : null}
            </nav>
          ) : null}
        </div>
      </section>

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
