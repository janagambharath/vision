import { getAdminRole, isManagerOrOwner, requireAdmin } from "@/lib/admin-auth";
import { getStoreProducts } from "@/lib/store-data";
import { updateInventoryAction, receiveStockAction } from "@/lib/inventory-actions";
import { AlertTriangle, Plus, Package } from "lucide-react";

export default async function AdminInventoryPage() {
  const session = await requireAdmin();
  const canManage = isManagerOrOwner(getAdminRole(session));
  const products = await getStoreProducts({ includeDrafts: true });

  const lowStockProducts = products.filter(
    (p) => p.inventoryStatus === "LOW_STOCK" || p.inventoryStatus === "OUT_OF_STOCK"
  );

  return (
    <main className="vv-section bg-paper min-h-screen">
      <div className="vv-container">
        {/* Header */}
        <div className="mb-8">
          <p className="vv-kicker text-retail">Inventory Management</p>
          <h1 className="text-4xl font-extrabold text-slate-900">Stock & Alerts</h1>
          <p className="mt-2 text-slate-600">Track and receive inventory adjustments in real-time.</p>
        </div>

        {/* Alerts Banner */}
        {lowStockProducts.length > 0 ? (
          <div className="mb-6 rounded-vv border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0" />
            <div>
              <span className="font-extrabold text-base block">Restock attention needed</span>
              <p className="mt-0.5">There are <strong>{lowStockProducts.length}</strong> products currently out of stock or running low.</p>
            </div>
          </div>
        ) : null}

        {/* Products Stock List */}
        <div className="grid gap-4">
          {products.map((product) => {
            const isLow = product.inventoryStatus === "LOW_STOCK" || product.inventoryStatus === "OUT_OF_STOCK";
            return (
              <article
                key={product.slug}
                className={`vv-card p-6 grid gap-6 ${canManage ? "md:grid-cols-[1fr_auto_auto]" : ""} items-center hover:shadow-md transition-all ${
                  isLow ? "border-l-4 border-l-amber-500 bg-amber-50/10" : ""
                }`}
              >
                <div>
                  <h2 className="text-xl font-extrabold text-slate-800 flex items-center gap-2">
                    <Package className="h-5 w-5 text-slate-400" />
                    {product.name}
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    {product.brand} · SKU: <strong>{product.sku}</strong>
                  </p>
                  <span className={`inline-block mt-2 rounded-full px-2 py-0.5 text-xs font-bold ${
                    product.inventoryStatus === "OUT_OF_STOCK"
                      ? "bg-red-50 text-red-700 border border-red-100"
                      : isLow
                      ? "bg-amber-50 text-amber-700 border border-amber-100"
                      : "bg-emerald-50 text-emerald-700 border border-emerald-100"
                  }`}>
                    {product.inventoryStatus.replace(/_/g, " ")}
                  </span>
                </div>

                {canManage ? <>
                {/* Direct Set Stock Form */}
                <form action={updateInventoryAction} className="flex items-center gap-2">
                  <input type="hidden" name="slug" value={product.slug} />
                  <label className="text-xs font-bold text-slate-500 flex flex-col">
                    Set Stock
                    <input
                      className="store-input w-24 text-center mt-1 py-1.5"
                      type="number"
                      name="quantity"
                      defaultValue={product.inventoryQuantity}
                      min="0"
                      max="9999"
                      required
                    />
                  </label>
                  <button className="vv-button-retail py-2 px-3 mt-4 text-xs font-bold" type="submit">
                    Set
                  </button>
                </form>

                {/* Receive Stock Form */}
                <form action={receiveStockAction} className="flex items-center gap-2 border-t border-slate-100 md:border-t-0 pt-4 md:pt-0">
                  <input type="hidden" name="slug" value={product.slug} />
                  <label className="text-xs font-bold text-slate-500 flex flex-col">
                    Receive Stock (+)
                    <input
                      className="store-input w-24 text-center mt-1 py-1.5"
                      type="number"
                      name="addQuantity"
                      placeholder="Add qty"
                      min="1"
                      max="999"
                      required
                    />
                  </label>
                  <button className="vv-button bg-slate-800 hover:bg-slate-900 text-white py-2 px-3 mt-4 text-xs font-bold flex items-center gap-1" type="submit">
                    <Plus className="h-3.5 w-3.5" />
                    Add
                  </button>
                </form>
                </> : <p className="text-sm text-slate-500">Inventory is read-only for staff accounts.</p>}
              </article>
            );
          })}
        </div>
      </div>
    </main>
  );
}
