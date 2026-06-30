import Link from "next/link";
import { Plus, Edit, Eye, Star, Search, Filter } from "lucide-react";
import { requireAdmin } from "@/lib/admin-auth";
import { productIsSellable } from "@/lib/inventory";
import { formatMoney } from "@/lib/money";
import { getStoreProducts } from "@/lib/store-data";

export const metadata = { title: "Admin Products" };

export default async function AdminProductsPage({
  searchParams
}: {
  searchParams?: Promise<{ q?: string; status?: string }>;
}) {
  await requireAdmin();
  const params = (await searchParams) ?? {};

  let products = await getStoreProducts({ includeDrafts: true });

  if (params.q) {
    const q = params.q.toLowerCase().trim();
    products = products.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.brand.toLowerCase().includes(q) ||
        p.sku.toLowerCase().includes(q)
    );
  }

  if (params.status) {
    products = products.filter((p) => p.status === params.status);
  }

  return (
    <main className="vv-section">
      <div className="vv-container">
        {/* Header */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="vv-kicker text-retail">Admin</p>
            <h1 className="text-4xl font-extrabold">Frames Catalog</h1>
            <p className="mt-2 text-slate-600">Manage, edit, feature, and publish optical frames and sunglasses.</p>
          </div>
          <Link href="/admin/products/new" className="vv-button-retail inline-flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Add New Product
          </Link>
        </div>

        {/* Search & Filters */}
        <div className="vv-card mb-6 p-4">
          <form className="grid gap-3 md:grid-cols-3" method="get" action="/admin/products">
            <label className="grid gap-1 text-sm font-extrabold text-slate-600">
              Search Products
              <div className="relative">
                <input className="store-input pl-9" type="search" name="q" defaultValue={params.q ?? ""} placeholder="Search name, brand, SKU..." />
                <Search className="absolute left-3 top-3.5 h-4 w-4 text-slate-400" />
              </div>
            </label>

            <label className="grid gap-1 text-sm font-extrabold text-slate-600">
              Filter by Status
              <select className="store-input" name="status" defaultValue={params.status ?? ""}>
                <option value="">All Statuses</option>
                <option value="ACTIVE">Active (Live)</option>
                <option value="DRAFT">Draft</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </label>

            <button className="vv-button-retail self-end" type="submit">
              <Filter className="h-4 w-4" />
              Apply Filters
            </button>
          </form>
        </div>

        {/* Product List Grid */}
        <div className="grid gap-4">
          {products.length ? (
            products.map((product) => {
              return (
                <article key={product.slug} className="vv-card grid gap-4 p-5 md:grid-cols-[1fr_auto] items-center hover:shadow-strong transition">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-xl font-extrabold text-slate-900">{product.brand} {product.name}</h2>
                      {product.featured ? (
                        <span className="inline-flex items-center gap-0.5 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-700 border border-amber-200">
                          <Star className="h-3 w-3 fill-amber-500 text-amber-500" />
                          Featured
                        </span>
                      ) : null}
                      <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        product.status === "ACTIVE"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : product.status === "DRAFT"
                          ? "bg-amber-50 text-amber-700 border border-amber-200"
                          : "bg-slate-100 text-slate-700 border border-slate-200"
                      }`}>
                        {product.status}
                      </span>
                    </div>
                    <p className="mt-1.5 text-sm text-slate-500">
                      SKU: <strong className="text-slate-800">{product.sku}</strong> · 
                      Price: <strong className="text-retail">{formatMoney(product.pricePaise)}</strong> · 
                      Stock: <strong className={product.inventoryQuantity <= 2 ? "text-red-600 font-extrabold" : "text-slate-800"}>{product.inventoryQuantity} pcs</strong>
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {product.material} · {product.colour} · {product.shape} · {product.rimType}
                    </p>
                  </div>
                  
                  <div className="flex flex-wrap gap-2 md:self-center">
                    <Link className="vv-button-light text-sm py-2" href={`/frames/${product.slug}`} target="_blank">
                      <Eye className="h-4 w-4" />
                      Preview
                    </Link>
                    <Link className="vv-button-retail text-sm py-2" href={`/admin/products/${product.slug}/edit`}>
                      <Edit className="h-4 w-4" />
                      Edit Details
                    </Link>
                  </div>
                </article>
              );
            })
          ) : (
            <div className="vv-card p-12 text-center text-slate-500">
              No products found matching filters.
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
