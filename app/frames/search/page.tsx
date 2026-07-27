import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, Search } from "lucide-react";
import { ProductCard } from "@/components/product-card";
import { getStoreProducts, getStoreProductsCount, normalizeCatalogPage, PUBLIC_CATALOG_PAGE_SIZE } from "@/lib/store-data";
import { SITE_URL } from "@/lib/constants";
import { toPublicStoreProduct } from "@/lib/inventory";

export const metadata: Metadata = {
  title: "Search Frames",
  description: "Search the Vision Vistara frames collection by product name, brand, material, shape, colour, size, or SKU.",
  alternates: { canonical: `${SITE_URL}/frames/search` }
};

export default async function SearchPage({
  searchParams
}: {
  searchParams?: Promise<{ q?: string; page?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const requestedPage = normalizeCatalogPage(params.page);
  const hasQuery = Boolean(params.q?.trim());
  const catalogOptions = { query: params.q };
  const totalCount = await getStoreProductsCount(catalogOptions);
  const totalPages = Math.max(1, Math.ceil(totalCount / PUBLIC_CATALOG_PAGE_SIZE));
  const currentPage = Math.min(requestedPage, totalPages);
  const products = await getStoreProducts({ ...catalogOptions, page: currentPage, limit: PUBLIC_CATALOG_PAGE_SIZE });
  const pageHref = (page: number) => {
    const query = new URLSearchParams();
    if (params.q) query.set("q", params.q);
    if (page > 1) query.set("page", String(page));
    const search = query.toString();
    return search ? `/frames/search?${search}` : "/frames/search";
  };

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

        <form className="vv-card mb-8 flex flex-col gap-2 p-4 sm:flex-row sm:items-end" action="/frames/search">
          <label className="grid flex-1 gap-1 text-sm font-extrabold text-slate-600">
            Search frames
            <input className="store-input" type="search" name="q" defaultValue={params.q ?? ""} placeholder="Name, brand, SKU, material, shape, colour..." />
          </label>
          <button className="vv-button-retail min-h-[36px] shrink-0 px-3 py-1.5 text-xs" type="submit">
            <Search className="h-3.5 w-3.5" />
            Search
          </button>
          {hasQuery ? (
            <Link href="/frames/search" className="self-center text-xs font-bold text-slate-500 hover:text-retail sm:self-end sm:pb-2">
              Clear
            </Link>
          ) : null}
        </form>

        <div>
          <div className="mb-6 flex items-center justify-between">
            <p className="text-sm font-bold text-slate-600">
              {hasQuery ? `${totalCount} result${totalCount !== 1 ? "s" : ""} found` : `${totalCount} frames in collection`}
            </p>
          </div>

          {products.length ? (
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {products.map((product) => (
                <ProductCard key={product.slug} product={toPublicStoreProduct(product)} />
              ))}
            </div>
          ) : (
            <div className="vv-card p-8 text-center">
              <Search className="mx-auto h-12 w-12 text-slate-300" />
              <h3 className="mt-4 text-xl font-extrabold">No frames match your search</h3>
              <p className="mt-2 text-slate-600">Try a different search phrase or browse the full collection.</p>
              <Link className="vv-button-retail mt-5" href="/frames">Browse all frames</Link>
            </div>
          )}

          {totalPages > 1 ? (
            <nav className="mt-8 flex flex-wrap items-center justify-center gap-3" aria-label="Search result pages">
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
      </div>
    </main>
  );
}
