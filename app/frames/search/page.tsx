import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, Search, SlidersHorizontal } from "lucide-react";
import { ProductCard } from "@/components/product-card";
import { getStoreProducts, getStoreProductsCount, getFilterOptions, normalizeCatalogPage, normalizeStoreProductSort, PUBLIC_CATALOG_PAGE_SIZE } from "@/lib/store-data";
import { SITE_URL } from "@/lib/constants";
import { toPublicStoreProduct } from "@/lib/inventory";

export const metadata: Metadata = {
  title: "Search Frames",
  description: "Search the Vision Vistara frames collection by brand, material, shape, colour, size, or SKU.",
  alternates: { canonical: `${SITE_URL}/frames/search` }
};

const MAX_SEARCH_PRICE_RUPEES = 1_000_000;

function parsePricePaise(value: string | undefined) {
  const raw = value?.trim() ?? "";
  if (!/^\d+$/.test(raw)) return undefined;
  const rupees = Number(raw);
  if (!Number.isSafeInteger(rupees) || rupees > MAX_SEARCH_PRICE_RUPEES) return undefined;
  return rupees * 100;
}

export default async function SearchPage({
  searchParams
}: {
  searchParams?: Promise<{ q?: string; category?: string; material?: string; shape?: string; sort?: string; minPrice?: string; maxPrice?: string; page?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const sort = normalizeStoreProductSort(params.sort);
  const requestedPage = normalizeCatalogPage(params.page);
  const priceMin = parsePricePaise(params.minPrice);
  const priceMax = parsePricePaise(params.maxPrice);
  const hasQuery = !!(params.q || params.category || params.material || params.shape || params.minPrice || params.maxPrice || sort !== "featured");
  const catalogOptions = {
    query: params.q,
    category: params.category,
    material: params.material,
    shape: params.shape,
    priceMin,
    priceMax,
    sort
  };

  const [totalCount, filterOptions] = await Promise.all([
    getStoreProductsCount(catalogOptions),
    getFilterOptions()
  ]);
  const totalPages = Math.max(1, Math.ceil(totalCount / PUBLIC_CATALOG_PAGE_SIZE));
  const currentPage = Math.min(requestedPage, totalPages);
  const products = await getStoreProducts({ ...catalogOptions, page: currentPage, limit: PUBLIC_CATALOG_PAGE_SIZE });
  const pageHref = (page: number) => {
    const query = new URLSearchParams();
    if (params.q) query.set("q", params.q);
    if (params.category) query.set("category", params.category);
    if (params.material) query.set("material", params.material);
    if (params.shape) query.set("shape", params.shape);
    if (params.minPrice) query.set("minPrice", params.minPrice);
    if (params.maxPrice) query.set("maxPrice", params.maxPrice);
    if (sort !== "featured") query.set("sort", sort);
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
                  {filterOptions.categories.map((cat: { value: string; label: string }) => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </label>

              <label className="grid gap-1 text-sm font-extrabold text-slate-600">
                Material
                <select className="store-input" name="material" defaultValue={params.material ?? ""}>
                  <option value="">All</option>
                  {filterOptions.materials.map((material: { value: string; label: string }) => (
                    <option key={material.value} value={material.value}>{material.label}</option>
                  ))}
                </select>
              </label>

              <label className="grid gap-1 text-sm font-extrabold text-slate-600">
                Shape
                <select className="store-input" name="shape" defaultValue={params.shape ?? ""}>
                  <option value="">All</option>
                  {filterOptions.shapes.map((shape: { value: string; label: string }) => (
                    <option key={shape.value} value={shape.value}>{shape.label}</option>
                  ))}
                </select>
              </label>

              <div className="grid grid-cols-2 gap-3">
                <label className="grid gap-1 text-sm font-extrabold text-slate-600">
                  Min ₹
                  <input className="store-input" type="number" name="minPrice" min="0" max={MAX_SEARCH_PRICE_RUPEES} step="1" defaultValue={params.minPrice ?? ""} placeholder="0" />
                </label>
                <label className="grid gap-1 text-sm font-extrabold text-slate-600">
                  Max ₹
                  <input className="store-input" type="number" name="maxPrice" min="0" max={MAX_SEARCH_PRICE_RUPEES} step="1" defaultValue={params.maxPrice ?? ""} placeholder="10000" />
                </label>
              </div>

              <label className="grid gap-1 text-sm font-extrabold text-slate-600">
                Sort by
                <select className="store-input" name="sort" defaultValue={sort}>
                  <option value="featured">Featured</option>
                  <option value="new">New arrivals</option>
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
                {hasQuery ? `${totalCount} result${totalCount !== 1 ? "s" : ""} found` : `${totalCount} frames in collection`}
              </p>
            </div>

            {products.length ? (
              <div className="grid gap-5 md:grid-cols-2">
                {products.map((product) => (
                  <ProductCard key={product.slug} product={toPublicStoreProduct(product)} />
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
      </div>
    </main>
  );
}
