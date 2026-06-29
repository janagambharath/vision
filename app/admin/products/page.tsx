import Link from "next/link";
import { requireAdmin } from "@/lib/admin-auth";
import { productIsSellable } from "@/lib/inventory";
import { formatMoney } from "@/lib/money";
import { getStoreProducts } from "@/lib/store-data";

export default async function AdminProductsPage() {
  await requireAdmin();
  const products = await getStoreProducts({ includeDrafts: true });

  return (
    <main className="vv-section">
      <div className="vv-container">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="vv-kicker text-retail">Products</p>
            <h1 className="text-4xl font-extrabold">Inventory and pricing</h1>
            <p className="mt-2 text-slate-600">Publish only after verified pricing, stock, warranty, return policy, images, and lens compatibility are complete.</p>
          </div>
          <form action="/api/admin/products" method="post">
            <button className="vv-button-retail" type="submit">Create draft product</button>
          </form>
        </div>

        <div className="grid gap-4">
          {products.map((product) => (
            <article key={product.slug} className="vv-card grid gap-4 p-5 lg:grid-cols-[1fr_auto]">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <h2 className="text-2xl font-extrabold">{product.brand} {product.name}</h2>
                  <span className={productIsSellable(product) ? "rounded-full bg-emerald-50 px-3 py-1 text-xs font-extrabold text-emerald-700" : "rounded-full bg-amber-50 px-3 py-1 text-xs font-extrabold text-amber-700"}>
                    {productIsSellable(product) ? "Published" : "Draft"}
                  </span>
                </div>
                <p className="mt-1 text-sm text-slate-500">SKU {product.sku} · {formatMoney(product.pricePaise)} · Stock {product.inventoryQuantity}</p>
                {product.blockers.length ? (
                  <ul className="mt-3 grid gap-1 text-sm text-amber-800">
                    {product.blockers.map((blocker) => (
                      <li key={blocker}>- {blocker}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
              <div className="grid gap-2">
                <Link className="vv-button-light" href={`/frames/${product.slug}`}>Preview</Link>
                <form action="/api/admin/products" method="post" className="grid gap-2 rounded-vv border border-slate-200 p-3">
                  <input type="hidden" name="_method" value="PATCH" />
                  <input type="hidden" name="slug" value={product.slug} />
                  <input className="store-input" name="pricePaise" placeholder="Price paise" />
                  <input className="store-input" name="quantity" placeholder="Qty" />
                  <button className="vv-button-retail" type="submit">Update price/stock</button>
                </form>
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
