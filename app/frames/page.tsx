import Link from "next/link";
import Image from "next/image";
import { Metadata } from "next";
import { ArrowRight, Filter, Search, Sparkles, Star, Truck } from "lucide-react";
import { ProductCard } from "@/components/product-card";
import { getStoreProducts, getStoreProductsCount, getFeaturedProducts, normalizeCatalogPage, PUBLIC_CATALOG_PAGE_SIZE } from "@/lib/store-data";
import { SITE_URL } from "@/lib/constants";
import { toPublicStoreProduct } from "@/lib/inventory";

export const metadata: Metadata = {
  title: "Frames Store",
  description:
    "Shop premium optical frames at Vision Vistara — verified frames with lens options, try-at-home, general product search, cart, checkout, and order tracking.",
  alternates: { canonical: `${SITE_URL}/frames` }
};

const CATEGORY_TILES = [
  {
    label: "Men",
    value: "Men",
    image: "/assets/category-men.jpeg",
    gradient: "from-slate-900/70 to-ink/60",
  },
  {
    label: "Women",
    value: "Women",
    image: "/assets/category-women.jpeg",
    gradient: "from-rose-900/60 to-slate-900/50",
  },
  {
    label: "Kids",
    value: "Kids",
    image: "/assets/category-kids.jpeg",
    gradient: "from-teal-900/50 to-slate-900/40",
  },
];

export default async function FramesPage({
  searchParams
}: {
  searchParams?: Promise<{ q?: string; page?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const requestedPage = normalizeCatalogPage(params.page);
  const hasSearch = Boolean(params.q?.trim());
  const catalogOptions = { query: params.q };
  const totalCount = await getStoreProductsCount(catalogOptions);
  const totalPages = Math.max(1, Math.ceil(totalCount / PUBLIC_CATALOG_PAGE_SIZE));
  const currentPage = Math.min(requestedPage, totalPages);
  const [products, featured] = await Promise.all([
    getStoreProducts({ ...catalogOptions, page: currentPage, limit: PUBLIC_CATALOG_PAGE_SIZE }),
    !hasSearch && currentPage === 1 ? getFeaturedProducts(6) : Promise.resolve([])
  ]);

  const pageHref = (page: number) => {
    const query = new URLSearchParams();
    if (params.q) query.set("q", params.q);
    if (page > 1) query.set("page", String(page));
    const search = query.toString();
    return search ? `/frames?${search}` : "/frames";
  };

  return (
    <main>

      {/* ─── Category Tiles: Men / Women / Kids ─── */}
      {!hasSearch && currentPage === 1 && (
        <section className="bg-white border-b border-slate-100">
          <div className="vv-container py-8">
            <p className="vv-kicker text-retail mb-4">Shop by category</p>
            <div className="grid gap-4 sm:grid-cols-3">
              {CATEGORY_TILES.map((tile) => (
                <Link
                  key={tile.value}
                  href={`/frames?q=${encodeURIComponent(tile.value)}`}
                  className="group relative overflow-hidden rounded-2xl aspect-[2/1] sm:aspect-[3/2]"
                >
                  <Image
                    src={tile.image}
                    alt={`${tile.label} frames`}
                    fill
                    className="object-cover transition duration-500 group-hover:scale-105"
                    sizes="(max-width: 640px) 100vw, 33vw"
                  />
                  <div className={`absolute inset-0 bg-gradient-to-t ${tile.gradient}`} />
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
                    <h3 className="text-3xl font-extrabold tracking-tight drop-shadow-lg">
                      {tile.label}
                    </h3>
                    <p className="mt-1 text-sm font-bold text-white/80 drop-shadow">
                      Shop {tile.label.toLowerCase()}&apos;s frames →
                    </p>
                  </div>
                  {/* Hover overlay */}
                  <div className="absolute inset-0 bg-teal-600/0 transition duration-300 group-hover:bg-teal-600/10" />
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* General product search */}
      <section className="store-band">
        <div className="vv-container py-4">
          <form className="flex flex-col gap-2 sm:flex-row sm:items-end" action="/frames">
            <label className="grid flex-1 gap-1 text-sm font-extrabold text-slate-600">
              Search frames
              <input className="store-input" type="search" name="q" defaultValue={params.q ?? ""} placeholder="Name, brand, SKU, material, shape, colour..." />
            </label>
            <button className="vv-button-retail min-h-[36px] shrink-0 px-3 py-1.5 text-xs" type="submit">
              <Search className="h-3.5 w-3.5" />
              Search
            </button>
            {hasSearch ? (
              <Link href="/frames" className="self-center text-xs font-bold text-slate-500 hover:text-retail sm:self-end sm:pb-2">
                Clear
              </Link>
            ) : null}
          </form>
        </div>
      </section>

      {/* Featured Section (only on unfiltered view) */}
      {!hasSearch && currentPage === 1 && featured.length > 0 ? (
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

      {/* All Products */}
      <section className="vv-section bg-paper">
        <div className="vv-container">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="vv-kicker text-retail">{hasSearch ? "Search results" : "All frames"}</p>
              <h2 className="text-3xl font-extrabold">
                {hasSearch ? `${totalCount} frame${totalCount !== 1 ? "s" : ""} found` : "Complete collection"}
              </h2>
              {params.q ? <p className="mt-2 text-slate-600">Showing results for &quot;{params.q}&quot;</p> : null}
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
