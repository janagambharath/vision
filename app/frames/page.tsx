import Link from "next/link";
import { Metadata } from "next";
import { Filter, Search, ShieldCheck, SlidersHorizontal, Truck } from "lucide-react";
import { ProductCard } from "@/components/product-card";
import { getStoreProducts } from "@/lib/store-data";
import { filterOptions, productIsSellable } from "@/lib/inventory";
import { SITE_URL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Frames Store",
  description:
    "Browse verified Vision Vistara optical frames with search, filters, lens upsell, try-at-home, cart, checkout, and order tracking.",
  alternates: { canonical: `${SITE_URL}/frames` }
};

export default async function FramesPage({
  searchParams
}: {
  searchParams?: Promise<{ q?: string; category?: string; sort?: string; compare?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const products = await getStoreProducts({ query: params.q, category: params.category, includeDrafts: true });
  const sortedProducts = [...products].sort((a, b) => {
    if (params.sort === "price-asc") return (a.pricePaise ?? Number.MAX_SAFE_INTEGER) - (b.pricePaise ?? Number.MAX_SAFE_INTEGER);
    if (params.sort === "price-desc") return (b.pricePaise ?? 0) - (a.pricePaise ?? 0);
    if (params.sort === "new") return a.slug.localeCompare(b.slug);
    return Number(productIsSellable(b)) - Number(productIsSellable(a));
  });
  const publishedProducts = sortedProducts.filter(productIsSellable);
  const draftProducts = sortedProducts.filter((product) => !productIsSellable(product));

  return (
    <main>
      <section className="bg-ink text-white">
        <div className="vv-container grid gap-10 py-16 lg:grid-cols-[1fr_360px]">
          <div>
            <p className="mb-3 text-xs font-extrabold uppercase text-teal-300">Vision Vistara Frames</p>
            <h1 className="max-w-4xl text-4xl font-extrabold leading-tight md:text-6xl">A dedicated optical e-commerce store under the clinic brand.</h1>
            <p className="mt-5 max-w-2xl text-lg text-slate-300">
              Product browsing, frame details, lens options, cart, checkout, try-at-home, delivery, tracking, reviews, and admin inventory live here, not on the clinic homepage.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link className="vv-button-retail" href="/frames/search">
                <Search className="h-5 w-5" />
                Search Collection
              </Link>
              <Link className="vv-button-light" href="/frames/try-at-home">
                <Truck className="h-5 w-5" />
                Book Try at Home
              </Link>
            </div>
          </div>
          <aside className="rounded-vv border border-white/15 bg-white/10 p-5">
            <ShieldCheck className="h-10 w-10 text-teal-300" />
            <h2 className="mt-5 text-xl font-extrabold">No fake catalog</h2>
            <p className="mt-2 text-sm text-slate-300">
              Only inventory-backed products are migrated. Frames with missing verified price or product terms are held in draft and blocked from checkout.
            </p>
          </aside>
        </div>
      </section>

      <section className="store-band">
        <div className="vv-container py-5">
          <form className="grid gap-3 lg:grid-cols-[1fr_220px_220px_auto]" action="/frames">
            <label className="grid gap-2 text-sm font-extrabold text-slate-600">
              Search frames
              <input className="store-input" type="search" name="q" defaultValue={params.q ?? ""} placeholder="Brand, SKU, material, shape" />
            </label>
            <label className="grid gap-2 text-sm font-extrabold text-slate-600">
              Category
              <select className="store-input" name="category" defaultValue={params.category ?? ""}>
                <option value="">All categories</option>
                {filterOptions.map((option) => (
                  <option key={option} value={option}>
                    {option.replace(/-/g, " ")}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-extrabold text-slate-600">
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

      <section className="vv-section bg-paper">
        <div className="vv-container">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="vv-kicker text-retail">Published catalog</p>
              <h2 className="text-3xl font-extrabold">Checkout-ready frames</h2>
              <p className="mt-2 text-slate-600">Products appear here only after verified price, stock, terms, and media are complete.</p>
            </div>
            <span className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-extrabold text-slate-600">
              {publishedProducts.length} published
            </span>
          </div>

          {publishedProducts.length ? (
            <div className="grid gap-5 lg:grid-cols-3">
              {publishedProducts.map((product) => (
                <ProductCard key={product.slug} product={product} />
              ))}
            </div>
          ) : (
            <div className="vv-card p-8">
              <Filter className="h-10 w-10 text-amber-600" />
              <h3 className="mt-4 text-2xl font-extrabold">No frames are published for sale yet.</h3>
              <p className="mt-2 max-w-2xl text-slate-600">
                The migrated real inventory is present below, but price and policy verification is incomplete. Admin can publish products after entering verified retail prices, warranty, return policy, complete image views, and stock status.
              </p>
              <Link className="vv-button-light mt-5" href="/admin/products">
                Open admin products
              </Link>
            </div>
          )}
        </div>
      </section>

      <section className="vv-section bg-white">
        <div className="vv-container">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
            <div>
              <p className="vv-kicker text-amber-700">Inventory verification queue</p>
              <h2 className="text-3xl font-extrabold">Migrated real frame records</h2>
              <p className="mt-2 text-slate-600">These are real inventory-backed records. They are visible for migration transparency but blocked from checkout.</p>
            </div>
            <span className="rounded-full border border-amber-200 bg-amber-50 px-4 py-2 text-sm font-extrabold text-amber-800">
              {draftProducts.length} draft
            </span>
          </div>
          <div className="grid gap-5 lg:grid-cols-2">
            {draftProducts.map((product) => (
              <ProductCard key={product.slug} product={product} />
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
