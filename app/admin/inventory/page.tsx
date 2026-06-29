import { requireAdmin } from "@/lib/admin-auth";
import { getStoreProducts } from "@/lib/store-data";

export default async function AdminInventoryPage() {
  await requireAdmin();
  const products = await getStoreProducts({ includeDrafts: true });

  return (
    <main className="vv-section">
      <div className="vv-container">
        <p className="vv-kicker text-retail">Inventory</p>
        <h1 className="text-4xl font-extrabold">Stock and low-stock alerts</h1>
        <div className="mt-8 grid gap-3">
          {products.map((product) => (
            <article key={product.slug} className="vv-card grid gap-3 p-5 md:grid-cols-[1fr_auto]">
              <div>
                <h2 className="text-xl font-extrabold">{product.name}</h2>
                <p className="mt-1 text-sm text-slate-600">{product.brand} · SKU {product.sku}</p>
              </div>
              <div className="text-right">
                <strong className="block text-2xl text-retail">{product.inventoryQuantity}</strong>
                <span className="text-xs font-extrabold uppercase text-slate-500">{product.inventoryStatus.replace(/_/g, " ")}</span>
              </div>
            </article>
          ))}
        </div>
      </div>
    </main>
  );
}
