import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, Minus, PackageCheck, Plus, ShoppingBag, Tag, Trash2, X } from "lucide-react";
import { getCartOrNull, calculateCartTotals } from "@/lib/cart";
import { removeCartItem, updateCartItemQuantity, applyCouponAction, removeCouponAction } from "@/lib/cart-actions";
import { formatMoney } from "@/lib/money";

export const metadata = {
  title: "Cart",
  description: "Review Vision Vistara frame selections, lens add-ons, delivery, coupons, and checkout."
};

export default async function CartPage({
  searchParams
}: {
  searchParams?: Promise<{ error?: string; couponError?: string; couponApplied?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const cart = await getCartOrNull();
  const totals = calculateCartTotals(cart);
  const items = cart?.items ?? [];
  const hasBlockedItem = items.some((item) => item.product.status !== "ACTIVE" || typeof item.product.pricePaise !== "number");

  return (
    <main className="vv-section bg-paper">
      <div className="vv-container">
        <Link href="/frames" className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" />
          Continue shopping
        </Link>

        <div className="mb-8">
          <p className="vv-kicker text-retail flex items-center gap-2">
            <ShoppingBag className="h-4 w-4" />
            Cart
          </p>
          <h1 className="text-4xl font-extrabold">Review your order.</h1>
          <p className="mt-2 text-sm text-slate-500">{items.length} item{items.length !== 1 ? "s" : ""} in cart</p>
        </div>

        {params.error ? (
          <div className="mb-5 rounded-vv border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-900">
            Checkout is blocked until all product and lens prices are verified.
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <div className="grid gap-4">
            {!items.length ? (
              <div className="vv-card p-8">
                <PackageCheck className="h-12 w-12 text-retail" />
                <h2 className="mt-4 text-2xl font-extrabold">Your cart is empty.</h2>
                <p className="mt-2 text-slate-600">Browse our collection and add frames to get started.</p>
                <Link className="vv-button-retail mt-5" href="/frames">
                  <ShoppingBag className="h-4 w-4" />
                  Browse frames
                </Link>
              </div>
            ) : (
              items.map((item) => {
                const image = item.product.images?.[0];
                return (
                  <article key={item.id} className="vv-card grid gap-4 p-5 sm:grid-cols-[100px_1fr_auto]">
                    {/* Product Image */}
                    <Link href={`/frames/${item.product.slug}`} className="relative aspect-square overflow-hidden rounded-vv bg-slate-50">
                      {image ? (
                        <Image src={image.url} alt={image.alt} fill className="object-contain p-2" sizes="100px" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-slate-300">
                          <ShoppingBag className="h-8 w-8" />
                        </div>
                      )}
                    </Link>

                    {/* Product Info */}
                    <div>
                      <p className="text-xs font-extrabold uppercase text-slate-500">{item.product.brand}</p>
                      <h2 className="text-lg font-extrabold">
                        <Link href={`/frames/${item.product.slug}`} className="hover:text-retail">{item.product.name}</Link>
                      </h2>
                      <p className="mt-1 text-sm text-slate-500">SKU {item.product.sku}</p>
                      <p className="mt-2 text-sm text-slate-600">
                        Lens: <span className="font-bold">{item.lensOption?.name ?? "Frame only"}</span>
                        {item.lensOption?.pricePaise ? ` (+${formatMoney(item.lensOption.pricePaise)})` : ""}
                      </p>
                      <p className="mt-1 text-xs font-bold text-slate-500">
                        {item.deliveryMethod.replace(/_/g, " ")}
                      </p>

                      {/* Quantity Controls */}
                      <div className="mt-3 flex items-center gap-2">
                        <form action={updateCartItemQuantity} className="inline">
                          <input type="hidden" name="id" value={item.id} />
                          <input type="hidden" name="quantity" value={Math.max(1, item.quantity - 1)} />
                          <button className="grid h-8 w-8 place-items-center rounded-vv border border-slate-200 text-slate-500 hover:border-retail hover:text-retail disabled:opacity-50" type="submit" disabled={item.quantity <= 1}>
                            <Minus className="h-3 w-3" />
                          </button>
                        </form>
                        <span className="w-8 text-center font-extrabold">{item.quantity}</span>
                        <form action={updateCartItemQuantity} className="inline">
                          <input type="hidden" name="id" value={item.id} />
                          <input type="hidden" name="quantity" value={Math.min(5, item.quantity + 1)} />
                          <button className="grid h-8 w-8 place-items-center rounded-vv border border-slate-200 text-slate-500 hover:border-retail hover:text-retail disabled:opacity-50" type="submit" disabled={item.quantity >= 5}>
                            <Plus className="h-3 w-3" />
                          </button>
                        </form>
                      </div>
                    </div>

                    {/* Price & Remove */}
                    <div className="grid content-between gap-3 text-right">
                      <strong className="text-lg text-retail">
                        {formatMoney(((item.product.pricePaise ?? 0) + (item.lensOption?.pricePaise ?? 0)) * item.quantity)}
                      </strong>
                      <form action={removeCartItem}>
                        <input type="hidden" name="id" value={item.id} />
                        <button className="inline-flex items-center gap-1 text-sm font-bold text-red-500 hover:text-red-700" type="submit">
                          <Trash2 className="h-3.5 w-3.5" />
                          Remove
                        </button>
                      </form>
                    </div>
                  </article>
                );
              })
            )}
          </div>

          {/* Order Summary Sidebar */}
          {items.length > 0 ? (
            <aside className="vv-card sticky top-28 self-start p-6">
              <h2 className="text-xl font-extrabold">Order summary</h2>

              <dl className="mt-5 grid gap-3 text-sm">
                <SummaryRow label="Frame subtotal" value={formatMoney(totals.subtotalPaise)} />
                <SummaryRow label="Lens add-ons" value={formatMoney(totals.lensTotalPaise)} />
                <SummaryRow label="Delivery" value={formatMoney(totals.shippingPaise)} />
                <SummaryRow label="GST (12%)" value={formatMoney(totals.taxPaise)} />
                {totals.discountPaise > 0 ? (
                  <SummaryRow label="Discount" value={`-${formatMoney(totals.discountPaise)}`} className="text-emerald-600" />
                ) : null}
                <div className="border-t border-slate-200 pt-3">
                  <SummaryRow label="Grand total" value={formatMoney(totals.grandTotalPaise)} strong />
                </div>
              </dl>

              {/* Coupon */}
              <div className="mt-5 border-t border-slate-100 pt-5">
                {cart?.coupon ? (
                  <div className="flex items-center justify-between rounded-vv bg-emerald-50 p-3">
                    <div className="flex items-center gap-2 text-sm font-bold text-emerald-700">
                      <CheckCircle2 className="h-4 w-4" />
                      {cart.coupon.code} applied
                    </div>
                    <form action={removeCouponAction}>
                      <button type="submit" className="text-slate-400 hover:text-red-500">
                        <X className="h-4 w-4" />
                      </button>
                    </form>
                  </div>
                ) : (
                  <form className="grid gap-2" action={applyCouponAction}>
                    <label className="flex items-center gap-2 text-sm font-extrabold text-slate-600">
                      <Tag className="h-4 w-4" />
                      Coupon code
                    </label>
                    <div className="flex gap-2">
                      <input className="store-input flex-1" type="text" name="code" placeholder="Enter coupon" />
                      <button className="vv-button-light shrink-0" type="submit">Apply</button>
                    </div>
                    {params.couponError ? (
                      <p className="text-xs font-bold text-red-500">
                        {params.couponError === "invalid" ? "Invalid coupon code." : params.couponError === "expired" ? "This coupon has expired." : "Please enter a coupon code."}
                      </p>
                    ) : null}
                    {params.couponApplied ? (
                      <p className="text-xs font-bold text-emerald-600">Coupon applied successfully!</p>
                    ) : null}
                  </form>
                )}
              </div>

              <Link
                className="vv-button-retail mt-5 w-full"
                aria-disabled={!items.length || hasBlockedItem}
                href={!items.length || hasBlockedItem ? "/frames/cart?error=pricing-required" : "/frames/checkout"}
              >
                Checkout
                <ArrowRight className="h-4 w-4" />
              </Link>

              <p className="mt-3 text-center text-xs text-slate-500">
                Secure checkout · 7-day returns · Free exchange
              </p>
            </aside>
          ) : null}
        </div>
      </div>
    </main>
  );
}

function SummaryRow({ label, value, strong = false, className = "" }: { label: string; value: string; strong?: boolean; className?: string }) {
  return (
    <div className={`flex justify-between ${strong ? "text-base font-extrabold" : `text-slate-600 ${className}`}`}>
      <dt>{label}</dt>
      <dd className="font-bold">{value}</dd>
    </div>
  );
}
