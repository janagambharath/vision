import Link from "next/link";
import { ArrowRight, PackageCheck, Trash2 } from "lucide-react";
import { getCartOrNull, calculateCartTotals, removeCartItem } from "@/lib/cart";
import { formatMoney } from "@/lib/money";

export const metadata = {
  title: "Cart",
  description: "Review Vision Vistara frame selections, lens add-ons, delivery, coupons, and checkout."
};

export default async function CartPage({
  searchParams
}: {
  searchParams?: Promise<{ error?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const cart = await getCartOrNull();
  const totals = calculateCartTotals(cart);
  const items = cart?.items ?? [];
  const hasBlockedItem = items.some((item) => item.product.status !== "ACTIVE" || typeof item.product.pricePaise !== "number");

  return (
    <main className="vv-section bg-paper">
      <div className="vv-container">
        <div className="mb-8">
          <p className="vv-kicker text-retail">Cart</p>
          <h1 className="text-4xl font-extrabold">Review your frame order.</h1>
          <p className="mt-2 text-slate-600">Cart records are stored server-side in PostgreSQL through a secure session cookie, not browser localStorage.</p>
        </div>

        {params.error ? (
          <div className="mb-5 rounded-vv border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-900">
            Checkout is blocked until all product and lens prices are verified.
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
          <div className="grid gap-4">
            {!items.length ? (
              <div className="vv-card p-8">
                <PackageCheck className="h-10 w-10 text-retail" />
                <h2 className="mt-4 text-2xl font-extrabold">Your cart is empty.</h2>
                <p className="mt-2 text-slate-600">Published frames will be available here after admin completes verified pricing and product terms.</p>
                <Link className="vv-button-retail mt-5" href="/frames">Browse frames</Link>
              </div>
            ) : (
              items.map((item) => (
                <article key={item.id} className="vv-card grid gap-4 p-5 md:grid-cols-[1fr_auto]">
                  <div>
                    <p className="text-xs font-extrabold uppercase text-slate-500">{item.product.brand}</p>
                    <h2 className="text-xl font-extrabold">{item.product.name}</h2>
                    <p className="mt-1 text-sm text-slate-500">SKU {item.product.sku} · Qty {item.quantity}</p>
                    <p className="mt-2 text-sm text-slate-600">Lens: {item.lensOption?.name ?? "Frame only"}</p>
                    <p className="mt-2 text-sm font-bold text-slate-700">Fulfilment: {item.deliveryMethod.replace(/_/g, " ")}</p>
                  </div>
                  <div className="grid content-between gap-3 text-right">
                    <strong className="text-lg text-retail">{formatMoney((item.product.pricePaise ?? 0) * item.quantity)}</strong>
                    <form action={removeCartItem}>
                      <input type="hidden" name="id" value={item.id} />
                      <button className="vv-button-light" type="submit">
                        <Trash2 className="h-4 w-4" />
                        Remove
                      </button>
                    </form>
                  </div>
                </article>
              ))
            )}
          </div>

          <aside className="vv-card sticky top-28 self-start p-6">
            <h2 className="text-2xl font-extrabold">Order summary</h2>
            <dl className="mt-5 grid gap-3 text-sm">
              <SummaryRow label="Frame subtotal" value={formatMoney(totals.subtotalPaise)} />
              <SummaryRow label="Lens add-ons" value={formatMoney(totals.lensTotalPaise)} />
              <SummaryRow label="Delivery estimate" value={formatMoney(totals.shippingPaise)} />
              <SummaryRow label="Discount" value={`-${formatMoney(totals.discountPaise)}`} />
              <div className="border-t border-slate-200 pt-3">
                <SummaryRow label="Grand total" value={formatMoney(totals.grandTotalPaise)} strong />
              </div>
            </dl>
            <form className="mt-5 grid gap-2" action="/api/coupons" method="post">
              <label className="grid gap-2 text-sm font-extrabold text-slate-600">
                Coupon code
                <input className="store-input" type="text" name="code" placeholder="Enter coupon" />
              </label>
              <button className="vv-button-light" type="submit">Apply coupon</button>
            </form>
            <Link className="vv-button-retail mt-5 w-full" aria-disabled={!items.length || hasBlockedItem} href={!items.length || hasBlockedItem ? "/frames/cart?error=pricing-required" : "/frames/checkout"}>
              Checkout
              <ArrowRight className="h-4 w-4" />
            </Link>
            <p className="mt-3 text-xs text-slate-500">Checkout requires verified frame pricing, active lens prices, stock, return policy, and terms acceptance.</p>
          </aside>
        </div>
      </div>
    </main>
  );
}

function SummaryRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={strong ? "flex justify-between text-base font-extrabold" : "flex justify-between text-slate-600"}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
