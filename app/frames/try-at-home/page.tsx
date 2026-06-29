import Link from "next/link";
import { CalendarClock, Home, PackageCheck } from "lucide-react";
import { tryAtHomeAction } from "@/lib/orders";
import { MAX_HOME_TRIAL_FRAMES } from "@/lib/constants";
import { getStoreProducts } from "@/lib/store-data";

export const metadata = {
  title: "Try at Home",
  description: "Choose 1 to 5 Vision Vistara frames, select a visit date and slot, enter address, and create a trackable home-trial request."
};

export default async function TryAtHomePage({
  searchParams
}: {
  searchParams?: Promise<{ productIds?: string; request?: string; error?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const products = await getStoreProducts({ includeDrafts: true });
  const selectedSlugs = (params.productIds ?? "").split(",").map((item) => item.trim()).filter(Boolean).slice(0, MAX_HOME_TRIAL_FRAMES);
  const selectedProducts = products.filter((product) => selectedSlugs.includes(product.slug));

  return (
    <main className="vv-section bg-paper">
      <div className="vv-container">
        <div className="mb-8">
          <p className="vv-kicker text-retail">Try at home</p>
          <h1 className="text-4xl font-extrabold">Book a trackable home-trial request.</h1>
          <p className="mt-2 max-w-2xl text-slate-600">
            Choose 1 to 5 frames, select a delivery date and time slot, enter address, and let staff handle the visit or courier flow from admin.
          </p>
        </div>

        {params.request ? (
          <div className="mb-6 rounded-vv border border-emerald-200 bg-emerald-50 p-5 text-emerald-900">
            <PackageCheck className="h-7 w-7" />
            <strong className="mt-3 block text-lg">Try-at-home request saved.</strong>
            <p className="mt-1 text-sm">Request ID: {params.request}. Staff can manage this from admin leads and try-at-home queues.</p>
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <form action={tryAtHomeAction} className="vv-card grid gap-5 p-6">
            <h2 className="text-2xl font-extrabold">Visit details</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Full name" name="name" required />
              <Field label="Phone" name="phone" type="tel" required />
            </div>
            <label className="grid gap-2 text-sm font-extrabold text-slate-600">
              Address
              <textarea className="store-input min-h-28 py-3" name="address" required />
            </label>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Preferred date" name="preferredDate" type="date" required />
              <label className="grid gap-2 text-sm font-extrabold text-slate-600">
                Preferred slot
                <select className="store-input" name="preferredSlot" required>
                  <option value="">Select slot</option>
                  <option>10:00 AM - 12:00 PM</option>
                  <option>12:00 PM - 2:00 PM</option>
                  <option>2:00 PM - 5:00 PM</option>
                  <option>5:00 PM - 8:00 PM</option>
                </select>
              </label>
            </div>

            <fieldset className="grid gap-3">
              <legend className="text-sm font-extrabold text-slate-600">Choose frames</legend>
              <div className="grid gap-2 md:grid-cols-2">
                {products.map((product) => (
                  <label key={product.slug} className="flex items-center gap-3 rounded-vv border border-slate-200 bg-white p-3 text-sm font-bold">
                    <input type="checkbox" name="productIds" value={product.slug} defaultChecked={selectedSlugs.includes(product.slug)} />
                    {product.brand} {product.name}
                  </label>
                ))}
              </div>
            </fieldset>

            <label className="grid gap-2 text-sm font-extrabold text-slate-600">
              Notes optional
              <textarea className="store-input min-h-24 py-3" name="notes" placeholder="Preferred fit, prescription note, or landmark" />
            </label>
            <button className="vv-button-retail" type="submit">
              <CalendarClock className="h-4 w-4" />
              Confirm home-trial request
            </button>
          </form>

          <aside className="vv-card self-start p-6">
            <Home className="h-9 w-9 text-retail" />
            <h2 className="mt-4 text-2xl font-extrabold">Selected frames</h2>
            <p className="mt-2 text-sm text-slate-600">Select up to {MAX_HOME_TRIAL_FRAMES} frames. Draft products are allowed for home-trial intake, but checkout remains blocked until price verification.</p>
            <div className="mt-5 grid gap-3">
              {selectedProducts.length ? (
                selectedProducts.map((product) => (
                  <div key={product.slug} className="rounded-vv border border-slate-200 p-3 text-sm">
                    <strong>{product.name}</strong>
                    <p className="text-slate-500">{product.brand} · SKU {product.sku}</p>
                  </div>
                ))
              ) : (
                <p className="rounded-vv border border-dashed border-slate-300 p-4 text-sm text-slate-500">No frames preselected. Choose from the list.</p>
              )}
            </div>
            <Link className="vv-button-light mt-5 w-full" href="/frames">Back to storefront</Link>
          </aside>
        </div>
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
