import Link from "next/link";
import Image from "next/image";
import { Metadata } from "next";
import { ArrowRight, Filter, SlidersHorizontal, Sparkles, Star, Truck, X } from "lucide-react";
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

const CATEGORY_TILES = [
  {
    label: "Men",
    value: "Men",
    image: "/assets/category-men.png",
    gradient: "from-slate-900/70 to-ink/60",
  },
  {
    label: "Women",
    value: "Women",
    image: "/assets/category-women.png",
    gradient: "from-rose-900/60 to-slate-900/50",
  },
  {
    label: "Kids",
    value: "Kids",
    image: "/assets/category-kids.png",
    gradient: "from-teal-900/50 to-slate-900/40",
  },
];

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

  // Active filter summary for clear display
  const activeFilters: { key: string; label: string; value: string }[] = [];
  if (params.gender) activeFilters.push({ key: "gender", label: "Gender", value: params.gender });
  if (params.category) activeFilters.push({ key: "category", label: "Category", value: params.category.replace(/-/g, " ") });
  if (params.shape) activeFilters.push({ key: "shape", label: "Shape", value: params.shape });
  if (params.material) activeFilters.push({ key: "material", label: "Material", value: params.material });
  if (params.q) activeFilters.push({ key: "q", label: "Search", value: params.q });


  return (
    <main>

      {/* ─── Category Tiles: Men / Women / Kids ─── */}
      {!hasActiveFilters && currentPage === 1 && (
        <section className="bg-white border-b border-slate-100">
          <div className="vv-container py-8">
            <p className="vv-kicker text-retail mb-4">Shop by category</p>
            <div className="grid gap-4 sm:grid-cols-3">
              {CATEGORY_TILES.map((tile) => (
                <Link
                  key={tile.value}
                  href={`/frames?gender=${tile.value}`}
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

      {/* ─── Search & Filter Bar ─── */}
      <section className="store-band">
        <div className="vv-container py-4">
          <form className="grid gap-3 sm:grid-cols-2 lg:grid-cols-8" action="/frames">
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
            <div className="flex gap-2 self-end">
              <button className="vv-button-retail flex-1" type="submit">
                <SlidersHorizontal className="h-4 w-4" />
                Apply
              </button>
              {hasActiveFilters && (
                <Link href="/frames" className="vv-button-light shrink-0 text-sm">
                  <X className="h-4 w-4" />
                  Reset
                </Link>
              )}
            </div>
          </form>

          {/* Active filter chips */}
          {activeFilters.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-500">Active filters:</span>
              {activeFilters.map((f) => {
                const newParams = new URLSearchParams();
                if (params.q && f.key !== "q") newParams.set("q", params.q);
                if (params.category && f.key !== "category") newParams.set("category", params.category);
                if (params.gender && f.key !== "gender") newParams.set("gender", params.gender);
                if (params.shape && f.key !== "shape") newParams.set("shape", params.shape);
                if (params.material && f.key !== "material") newParams.set("material", params.material);
                if (params.sort) newParams.set("sort", params.sort);
                const removeUrl = `/frames${newParams.toString() ? `?${newParams.toString()}` : ""}`;

                return (
                  <Link
                    key={f.key}
                    href={removeUrl}
                    className="inline-flex items-center gap-1 rounded-full bg-teal-50 border border-teal-200 px-2.5 py-1 text-xs font-bold text-teal-700 hover:bg-teal-100 transition"
                  >
                    {f.label}: {f.value}
                    <X className="h-3 w-3 text-teal-500" />
                  </Link>
                );
              })}
            </div>
          )}
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
              {params.gender ? <p className="mt-1 text-sm text-teal-700 font-bold">Filtered: {params.gender}&apos;s frames</p> : null}
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
