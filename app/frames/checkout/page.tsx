import Link from "next/link";
import { CreditCard, Upload } from "lucide-react";
import { checkoutAction } from "@/lib/orders";
import { calculateCartTotals, getCartOrNull } from "@/lib/cart";
import { formatMoney } from "@/lib/money";

export const metadata = {
  title: "Checkout",
  description: "Guest checkout for Vision Vistara frames with delivery, prescription support, payment, and WhatsApp-assisted fallback."
};

export default async function CheckoutPage() {
  const cart = await getCartOrNull();
  const items = cart?.items ?? [];
  const totals = calculateCartTotals(cart);

  if (!items.length) {
    return (
      <main className="vv-section bg-paper">
        <div className="vv-container">
          <h1 className="text-3xl font-extrabold">Your cart is empty.</h1>
          <Link className="vv-button-retail mt-5" href="/frames">Browse frames</Link>
        </div>
      </main>
    );
  }

  return (
    <main className="vv-section bg-paper">
      <div className="vv-container">
        <div className="mb-8">
          <p className="vv-kicker text-retail">Checkout</p>
          <h1 className="text-4xl font-extrabold">Guest checkout with payment and prescription support.</h1>
          <p className="mt-2 text-slate-600">Orders are persisted in Railway PostgreSQL and can continue through Razorpay or WhatsApp-assisted fallback.</p>
        </div>

        <form action={checkoutAction} className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <section className="vv-card grid gap-5 p-6">
            <h2 className="text-2xl font-extrabold">Customer and delivery</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Name" name="name" required />
              <Field label="Phone" name="phone" type="tel" required />
              <Field label="Email optional" name="email" type="email" />
              <Field label="Pincode" name="pincode" required />
            </div>
            <Field label="Address line 1" name="line1" required />
            <Field label="Address line 2 optional" name="line2" />
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="City" name="city" required />
              <Field label="State optional" name="state" />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="grid gap-2 text-sm font-extrabold text-slate-600">
                Delivery method
                <select className="store-input" name="deliveryMethod" required>
                  <option value="DELIVERY">Delivery</option>
                  <option value="TRY_AT_HOME">Try at home</option>
                  <option value="STORE_PICKUP">Store pickup</option>
                </select>
              </label>
              <label className="grid gap-2 text-sm font-extrabold text-slate-600">
                Payment method
                <select className="store-input" name="paymentMethod" required>
                  <option value="RAZORPAY">Razorpay</option>
                  <option value="UPI">UPI</option>
                  <option value="CARD">Card</option>
                  <option value="NETBANKING">Netbanking</option>
                  <option value="COD">Cash on delivery if supported</option>
                  <option value="WHATSAPP_ASSISTED">WhatsApp-assisted fallback</option>
                </select>
              </label>
            </div>

            <label className="grid gap-2 text-sm font-extrabold text-slate-600">
              Prescription upload
              <span className="flex min-h-12 items-center gap-2 rounded-vv border border-dashed border-slate-300 bg-white px-3 text-sm text-slate-500">
                <Upload className="h-4 w-4" />
                Cloudinary upload route is scaffolded; connect signed upload before accepting files.
              </span>
            </label>

            <label className="grid gap-2 text-sm font-extrabold text-slate-600">
              Notes
              <textarea className="store-input min-h-28 py-3" name="notes" placeholder="Prescription, delivery, or WhatsApp note" />
            </label>

            <label className="flex gap-3 text-sm font-bold text-slate-600">
              <input type="checkbox" name="acceptedReturns" required />
              I accept the return policy for configured prescription eyewear.
            </label>
            <label className="flex gap-3 text-sm font-bold text-slate-600">
              <input type="checkbox" name="acceptedTerms" required />
              I accept Vision Vistara checkout terms.
            </label>
          </section>

          <aside className="vv-card sticky top-28 self-start p-6">
            <h2 className="text-2xl font-extrabold">Order summary</h2>
            <div className="mt-5 grid gap-3">
              {items.map((item) => (
                <div key={item.id} className="rounded-vv border border-slate-200 p-3 text-sm">
                  <strong>{item.product.name}</strong>
                  <p className="text-slate-500">Qty {item.quantity} · {item.lensOption?.name ?? "Frame only"}</p>
                </div>
              ))}
            </div>
            <dl className="mt-5 grid gap-3 text-sm">
              <SummaryRow label="Frame subtotal" value={formatMoney(totals.subtotalPaise)} />
              <SummaryRow label="Lens add-ons" value={formatMoney(totals.lensTotalPaise)} />
              <SummaryRow label="Delivery" value={formatMoney(totals.shippingPaise)} />
              <SummaryRow label="Grand total" value={formatMoney(totals.grandTotalPaise)} strong />
            </dl>
            <button className="vv-button-retail mt-5 w-full" type="submit">
              <CreditCard className="h-4 w-4" />
              Place order
            </button>
          </aside>
        </form>
      </div>
    </main>
  );
}

function Field({ label, name, type = "text", required = false }: { label: string; name: string; type?: string; required?: boolean }) {
  return (
    <label className="grid gap-2 text-sm font-extrabold text-slate-600">
      {label}
      <input className="store-input" type={type} name={name} required={required} />
    </label>
  );
}

function SummaryRow({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={strong ? "flex justify-between border-t border-slate-200 pt-3 text-base font-extrabold" : "flex justify-between text-slate-600"}>
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}
