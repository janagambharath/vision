import Image from "next/image";
import Link from "next/link";
import { Metadata } from "next";
import { ArrowRight, CalendarCheck, Filter, Sparkles, Star, Truck } from "lucide-react";
import { ProductCard } from "@/components/product-card";
import { getStoreProducts, getStoreProductsCount, getFeaturedProducts, normalizeCatalogPage, PUBLIC_CATALOG_PAGE_SIZE } from "@/lib/store-data";
import { SITE_URL } from "@/lib/constants";
import { toPublicStoreProduct } from "@/lib/inventory";
import { FindFrameSizeCTA } from "@/components/face-scanner/FindFrameSizeCTA";

export const metadata: Metadata = {
  title: "Frames Store",
  description:
    "Shop premium optical frames at Vision Vistara — verified frames with lens options, try-at-home, cart, checkout, and order tracking.",
  alternates: { canonical: `${SITE_URL}/frames` }
};

const AGE_GROUP_TILES = [
  {
    label: "Adults",
    value: "Adult",
    image: "/assets/category-adults.jpeg",
    description: "Everyday frames for adults"
  },
  {
    label: "Kids",
    value: "Kids",
    image: "/assets/category-kids-age.jpeg",
    description: "Comfortable frames for growing eyes"
  }
];

export default async function FramesPage({
  searchParams
}: {
  searchParams?: Promise<{ q?: string; ageGroup?: string; page?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const requestedPage = normalizeCatalogPage(params.page);
  const hasFilters = Boolean(params.q?.trim() || params.ageGroup);
  const ageGroupLabel = params.ageGroup === "Kids" ? "kids" : "adults";
  const catalogOptions = { query: params.q, ageGroup: params.ageGroup };
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
    if (params.ageGroup) query.set("ageGroup", params.ageGroup);
    if (page > 1) query.set("page", String(page));
    const search = query.toString();
    return search ? `/frames?${search}` : "/frames";
  };

  return (
    <main>
      {currentPage === 1 ? (
        <section className="border-b border-slate-100 bg-white">
          <div className="vv-container py-6 sm:py-8">
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <p className="vv-kicker mb-1 text-retail">Shop by age group</p>
                <h1 className="bg-gradient-to-r from-blue-800 via-blue-600 to-cyan-500 bg-clip-text text-2xl font-extrabold text-transparent sm:text-3xl">Frames for every stage.</h1>
              </div>
              {hasFilters ? (
                <Link href="/frames" className="text-sm font-extrabold text-teal-700 hover:text-teal-900">
                  View all frames
                </Link>
              ) : null}
            </div>
            <nav className="grid gap-4 sm:grid-cols-2" aria-label="Filter frames by age group">
              {AGE_GROUP_TILES.map((tile) => {
                const active = params.ageGroup === tile.value;
                return (
                  <Link
                    key={tile.value}
                    href={`/frames?ageGroup=${encodeURIComponent(tile.value)}`}
                    aria-current={active ? "page" : undefined}
                    className={`group relative isolate h-28 overflow-hidden rounded-2xl border transition sm:h-36 ${
                      active ? "border-teal-500 ring-2 ring-teal-400/50" : "border-slate-200 hover:border-teal-300"
                    }`}
                  >
                    <Image
                      src={tile.image}
                      alt={`${tile.label} eyewear`}
                      fill
                      sizes="(max-width: 640px) 100vw, 50vw"
                      className={`-z-20 object-cover transition duration-500 group-hover:scale-105 ${tile.value === "Kids" ? "object-[center_35%]" : "object-center"}`}
                    />
                    <div className="absolute inset-0 -z-10 bg-gradient-to-t from-slate-950/85 via-slate-950/25 to-transparent" />
                    <div className="absolute inset-x-0 bottom-0 p-4 text-white sm:p-5">
                      <p className="text-lg font-extrabold sm:text-xl">{tile.label}</p>
                      <p className="mt-0.5 text-[11px] font-bold text-white/80 sm:text-xs">{tile.description}</p>
                    </div>
                  </Link>
                );
              })}
            </nav>
          </div>
        </section>
      ) : null}

      {currentPage === 1 ? <FindFrameSizeCTA /> : null}

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
              {params.ageGroup ? <p className="mt-2 text-slate-600">Showing frames for {ageGroupLabel}.</p> : null}
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
              <h3 className="mt-4 text-2xl font-extrabold">Our local collection is being verified.</h3>
              <p className="mt-2 max-w-xl text-slate-600">We publish a frame only after its price, landed cost, physical stock, specifications, and images have been checked. Message us if you would like help choosing your first pair.</p>
              <Link className="vv-button-retail mt-5" href="https://wa.me/917842938316?text=Hello%20Vision%20Vistara%2C%20I%20would%20like%20help%20choosing%20frames.">
                Ask on WhatsApp
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
            <p className="mt-2 text-slate-300">Try up to 5 frames at home or book a doctor-led LASIK evaluation.</p>
          </div>
          <Link className="vv-button-retail" href="/frames/try-at-home">
            <Truck className="h-5 w-5" />
            Book Home Trial
          </Link>
          <Link className="vv-button-light" href="/#appointment">
            <CalendarCheck className="h-5 w-5" />
            Book LASIK Evaluation
          </Link>
        </div>
      </section>
    </main>
  );
}
