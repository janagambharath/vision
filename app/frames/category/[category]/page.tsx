import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ProductCard } from "@/components/product-card";
import { getStoreProducts, getStoreProductsCount, getCategories, normalizeCatalogPage, normalizeStoreProductSort, PUBLIC_CATALOG_PAGE_SIZE } from "@/lib/store-data";
import { SITE_URL } from "@/lib/constants";
import { serializeJsonLd } from "@/lib/json-ld";
import { toPublicStoreProduct } from "@/lib/inventory";

export const dynamic = "force-dynamic";

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

export default async function CategoryPage({
  params,
  searchParams
}: {
  params: Promise<{ category: string }>;
  searchParams?: Promise<{ page?: string; sort?: string }>;
}) {
  const { category } = await params;
  const query = (await searchParams) ?? {};
  const sort = normalizeStoreProductSort(query.sort);
  const requestedPage = normalizeCatalogPage(query.page);
  const catalogOptions = { category, sort };
  const [totalCount, categories] = await Promise.all([
    getStoreProductsCount(catalogOptions),
    getCategories()
  ]);
  const totalPages = Math.max(1, Math.ceil(totalCount / PUBLIC_CATALOG_PAGE_SIZE));
  const currentPage = Math.min(requestedPage, totalPages);
  const products = await getStoreProducts({ ...catalogOptions, page: currentPage, limit: PUBLIC_CATALOG_PAGE_SIZE });
  const currentCat = categories.find(c => c.slug === category);
  const label = currentCat?.name ?? category.replace(/-/g, " ");
  const pageHref = (page: number) => {
    const params = new URLSearchParams();
    if (sort !== "featured") params.set("sort", sort);
    if (page > 1) params.set("page", String(page));
    const search = params.toString();
    return search ? `/frames/category/${category}?${search}` : `/frames/category/${category}`;
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: SITE_URL
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Frames",
        item: `${SITE_URL}/frames`
      },
      {
        "@type": "ListItem",
        position: 3,
        name: label,
        item: `${SITE_URL}/frames/category/${category}`
      }
    ]
  };

  return (
    <main className="vv-section bg-paper">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: serializeJsonLd(breadcrumbSchema) }} />
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
          <p className="mt-2 text-slate-600">{totalCount} frame{totalCount !== 1 ? "s" : ""} available in this category.</p>
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

        <form action={`/frames/category/${category}`} className="mb-8 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4">
          <label className="grid gap-1 text-sm font-extrabold text-slate-600">
            Sort frames
            <select className="store-input min-w-52" name="sort" defaultValue={sort}>
              <option value="featured">Featured</option>
              <option value="new">New arrivals</option>
              <option value="price-asc">Price: low to high</option>
              <option value="price-desc">Price: high to low</option>
            </select>
          </label>
          <button className="vv-button-retail" type="submit">Apply</button>
        </form>

        {products.length ? (
          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {products.map((product) => (
              <ProductCard key={product.slug} product={toPublicStoreProduct(product)} />
            ))}
          </div>
        ) : (
          <div className="vv-card p-8">
            <h3 className="text-xl font-extrabold">No frames in this category yet.</h3>
            <p className="mt-2 text-slate-600">Browse the full collection or try a different category.</p>
            <Link className="vv-button-retail mt-5" href="/frames">Browse all frames</Link>
          </div>
        )}

        {totalPages > 1 ? (
          <nav className="mt-8 flex flex-wrap items-center justify-center gap-3" aria-label={`${label} frame pages`}>
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
    </main>
  );
}
