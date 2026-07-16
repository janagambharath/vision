import Link from "next/link";
import { Metadata } from "next";
import { ArrowRight, Filter, SlidersHorizontal, Sparkles, Star, Truck } from "lucide-react";
import { ProductCard } from "@/components/product-card";
import { getStoreProducts, getStoreProductsCount, getFeaturedProducts, getFilterOptions, normalizeCatalogPage, normalizeStoreProductSort, PUBLIC_CATALOG_PAGE_SIZE } from "@/lib/store-data";
import { SITE_URL } from "@/lib/constants";
import { toPublicStoreProduct } from "@/lib/inventory";

export const metadata: Metadata = {
  title: "Frames Store",
  description:
    "Shop premium optical frames at Vision Vistara — 18+ verified frames with lens options, try-at-home, search, filters, cart, checkout, and order tracking.",
  alternates: { canonical: `${SITE_URL}/frames` }
};

export default async function FramesPage({
  searchParams
}: {
  searchParams?: Promise<{ q?: string; category?: string; sort?: string; gender?: string; material?: string; shape?: string; color?: string; page?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const sort = normalizeStoreProductSort(params.sort);
  const requestedPage = normalizeCatalogPage(params.page);
  const hasActiveFilters = !!(params.q || params.category || params.gender || params.material || params.shape || params.color || sort !== "featured");
  const catalogOptions = {
    query: params.q,
    category: params.category,
    gender: params.gender,
    material: params.material,
    shape: params.shape,
    color: params.color,
    sort
  };
  const [totalCount, filterOptions] = await Promise.all([
    getStoreProductsCount(catalogOptions),
    getFilterOptions()
  ]);
  const totalPages = Math.max(1, Math.ceil(totalCount / PUBLIC_CATALOG_PAGE_SIZE));
  const currentPage = Math.min(requestedPage, totalPages);
  const [products, featured] = await Promise.all([
    getStoreProducts({ ...catalogOptions, page: currentPage, limit: PUBLIC_CATALOG_PAGE_SIZE }),
    !hasActiveFilters && currentPage === 1 ? getFeaturedProducts(6) : Promise.resolve([])
  ]);

  const shopByGender = [
    { label: "All frames", value: "" },
    { label: "Men", value: "Men" },
    { label: "Women", value: "Women" },
    { label: "Kids", value: "Kids" }
  ];
  const genderFilterHref = (gender: string) => {
    const query = new URLSearchParams();
    if (params.q) query.set("q", params.q);
    if (params.category) query.set("category", params.category);
    if (gender) query.set("gender", gender);
    if (params.material) query.set("material", params.material);
    if (params.shape) query.set("shape", params.shape);
    if (params.color) query.set("color", params.color);
    if (sort !== "featured") query.set("sort", sort);
    const search = query.toString();
    return search ? `/frames?${search}` : "/frames";
  };
  const pageHref = (page: number) => {
    const query = new URLSearchParams();
    if (params.q) query.set("q", params.q);
    if (params.category) query.set("category", params.category);
    if (params.gender) query.set("gender", params.gender);
    if (params.material) query.set("material", params.material);
    if (params.shape) query.set("shape", params.shape);
    if (params.color) query.set("color", params.color);
    if (sort !== "featured") query.set("sort", sort);
    if (page > 1) query.set("page", String(page));
    const search = query.toString();
    return search ? `/frames?${search}` : "/frames";
  };
  const activeFilterCount = [
    params.q,
    params.category,
    params.gender,
    params.material,
    params.shape,
    params.color,
    sort !== "featured"
  ].filter(Boolean).length;
  const renderFilterFields = () => (
    <>
      <label className="grid gap-1 text-sm font-extrabold text-slate-600">
        Search frames
        <input className="store-input" type="search" name="q" defaultValue={params.q ?? ""} placeholder="Brand, SKU, material, shape, colour..." />
      </label>
      <label className="grid gap-1 text-sm font-extrabold text-slate-600">
        Category
        <select className="store-input" name="category" defaultValue={params.category ?? ""}>
          <option value="">All categories</option>
          {filterOptions.categories.map((cat: { value: string; label: string }) => (
            <option key={cat.value} value={cat.value}>
              {cat.label}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-sm font-extrabold text-slate-600">
        Gender
        <select className="store-input" name="gender" defaultValue={params.gender ?? ""}>
          <option value="">Any</option>
          {filterOptions.genders.map((g: { value: string; label: string }) => (
            <option key={g.value} value={g.value}>{g.label}</option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-sm font-extrabold text-slate-600">
        Shape
        <select className="store-input" name="shape" defaultValue={params.shape ?? ""}>
          <option value="">Any</option>
          {filterOptions.shapes.map((s: { value: string; label: string }) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-sm font-extrabold text-slate-600">
        Material
        <select className="store-input" name="material" defaultValue={params.material ?? ""}>
          <option value="">Any</option>
          {filterOptions.materials.map((m: { value: string; label: string }) => (
            <option key={m.value} value={m.value}>{m.label}</option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-sm font-extrabold text-slate-600">
        Colour
        <select className="store-input" name="color" defaultValue={params.color ?? ""}>
          <option value="">Any</option>
          {filterOptions.colors.map((color: { value: string; label: string }) => (
            <option key={color.value} value={color.value}>{color.label}</option>
          ))}
        </select>
      </label>
      <label className="grid gap-1 text-sm font-extrabold text-slate-600">
        Sort
        <select className="store-input" name="sort" defaultValue={sort}>
          <option value="featured">Featured</option>
          <option value="new">New arrivals</option>
          <option value="price-asc">Price: low to high</option>
          <option value="price-desc">Price: high to low</option>
        </select>
      </label>
    </>
  );

  return (
    <main>


      {/* Search & Filter Bar */}
      <section className="store-band">
        <div className="vv-container py-4">
          <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:p-4">
            <div>
              <p className="text-sm font-extrabold text-ink">Shop frames for everyone</p>
              <p className="text-xs font-medium text-slate-500">Start with a collection, then refine the details.</p>
            </div>
            <nav className="flex flex-wrap gap-2" aria-label="Shop frames by collection">
              {shopByGender.map((filter) => {
                const active = (params.gender ?? "") === filter.value;
                return (
                  <Link
                    key={filter.label}
                    href={genderFilterHref(filter.value)}
                    aria-current={active ? "page" : undefined}
                    className={`rounded-full px-4 py-2 text-sm font-extrabold transition ${active ? "bg-teal-700 text-white shadow-sm" : "border border-slate-200 bg-slate-50 text-slate-700 hover:border-teal-300 hover:bg-teal-50 hover:text-teal-800"}`}
                  >
                    {filter.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <details className="group sm:hidden">
            <summary className="vv-button-retail flex w-full cursor-pointer list-none justify-center [&::-webkit-details-marker]:hidden">
              <SlidersHorizontal className="h-4 w-4" />
              Filters &amp; sort
              {activeFilterCount > 0 ? <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs">{activeFilterCount}</span> : null}
            </summary>
            <form className="mt-3 grid gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3" action="/frames">
              {renderFilterFields()}
              <div className="grid grid-cols-2 gap-3 pt-1">
                <button className="vv-button-retail w-full px-3" type="submit">
                  Apply filters
                </button>
                <Link className="vv-button-light w-full px-3" href="/frames">
                  Clear all
                </Link>
              </div>
            </form>
          </details>
          <form className="hidden gap-3 sm:grid sm:grid-cols-2 lg:grid-cols-8" action="/frames">
            {renderFilterFields()}
            <button className="vv-button-retail self-end" type="submit">
              <SlidersHorizontal className="h-4 w-4" />
              Apply
            </button>
          </form>
        </div>
      </section>

      {/* Featured Section (only on unfiltered view) */}
      {!hasActiveFilters && currentPage === 1 && featured.length > 0 ? (
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
              <p className="vv-kicker text-retail">{hasActiveFilters ? "Search results" : "All frames"}</p>
              <h2 className="text-3xl font-extrabold">
                {hasActiveFilters ? `${totalCount} frame${totalCount !== 1 ? "s" : ""} found` : "Complete collection"}
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
              <p className="mt-2 text-slate-600">Try adjusting your filters or browse the complete collection.</p>
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


