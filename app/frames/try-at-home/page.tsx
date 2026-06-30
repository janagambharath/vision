import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, CalendarCheck, CheckCircle2, Home, Package, Truck } from "lucide-react";
import { tryAtHomeAction } from "@/lib/orders";
import { getStoreProducts } from "@/lib/store-data";
import { formatMoney } from "@/lib/money";
import { HOME_TRIAL_DEPOSIT_PAISE, HOME_TRIAL_SERVICE_FEE_PAISE, MAX_HOME_TRIAL_FRAMES, SITE_URL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Try at Home",
  description: "Select up to 5 frames for a Vision Vistara home trial. Try them on in the comfort of your home before buying.",
  alternates: { canonical: `${SITE_URL}/frames/try-at-home` }
};

export default async function TryAtHomePage({
  searchParams
}: {
  searchParams?: Promise<{ productIds?: string; request?: string; error?: string }>;
}) {
  const params = (await searchParams) ?? {};
  const products = await getStoreProducts({});
  const eligibleProducts = products.filter((p) => p.tryAtHomeEligible && p.status === "ACTIVE");
  const preselectedIds = params.productIds?.split(",").filter(Boolean) ?? [];

  // Success state
  if (params.request) {
    return (
      <main className="vv-section bg-paper">
        <div className="vv-container max-w-2xl text-center">
          <CheckCircle2 className="mx-auto h-16 w-16 text-retail" />
          <h1 className="mt-6 text-4xl font-extrabold">Home trial booked!</h1>
          <p className="mt-4 text-lg text-slate-600">
            Your try-at-home request has been submitted. Our team will contact you within 24 hours to confirm the visit.
          </p>
          <p className="mt-2 text-sm text-slate-500">Request ID: {params.request}</p>
          <div className="mt-8 flex justify-center gap-3">
            <Link className="vv-button-retail" href="/frames">Continue Shopping</Link>
            <Link className="vv-button-light" href="/frames/orders/demo">Track Orders</Link>
          </div>
        </div>
      </main>
    );
  }

  const timeSlots = [
    "10:00 AM – 12:00 PM",
    "12:00 PM – 2:00 PM",
    "2:00 PM – 4:00 PM",
    "4:00 PM – 6:00 PM",
    "6:00 PM – 8:00 PM"
  ];

  return (
    <main className="vv-section bg-paper">
      <div className="vv-container">
        <Link href="/frames" className="mb-6 inline-flex items-center gap-2 text-sm font-bold text-slate-500 hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" />
          Back to store
        </Link>

        <div className="mb-8">
          <p className="vv-kicker text-retail flex items-center gap-2">
            <Home className="h-4 w-4" />
            Try at Home
          </p>
          <h1 className="text-4xl font-extrabold">Try frames at home before you buy.</h1>
          <p className="mt-3 text-slate-600">
            Select up to {MAX_HOME_TRIAL_FRAMES} frames, choose a date and time, and our team will bring them to your doorstep.
          </p>
        </div>

        {params.error ? (
          <div className="mb-6 rounded-vv border border-red-200 bg-red-50 p-4 text-sm font-bold text-red-800">
            Please fill in all required fields correctly.
          </div>
        ) : null}

        {/* Info Cards */}
        <div className="mb-8 grid gap-4 md:grid-cols-3">
          <InfoCard icon={<Package className="h-8 w-8" />} title="Select frames" body={`Choose 1–${MAX_HOME_TRIAL_FRAMES} frames you'd like to try.`} />
          <InfoCard icon={<CalendarCheck className="h-8 w-8" />} title="Pick a slot" body="Choose your preferred date and time window." />
          <InfoCard icon={<Truck className="h-8 w-8" />} title="We deliver" body="Our team brings the frames to your door." />
        </div>

        <form action={tryAtHomeAction} className="grid gap-8 lg:grid-cols-[1fr_380px]">
          {/* Frame Selector */}
          <div>
            <h2 className="mb-4 text-2xl font-extrabold">Select frames to try</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {eligibleProducts.map((product) => {
                const frontImage = product.images[0];
                const isPreselected = preselectedIds.includes(product.slug);
                return (
                  <label key={product.slug} className="vv-card cursor-pointer overflow-hidden transition has-[:checked]:border-retail has-[:checked]:ring-2 has-[:checked]:ring-teal-200 hover:shadow-strong">
                    <input type="checkbox" name="productIds" value={product.slug} defaultChecked={isPreselected} className="peer sr-only" />
                    <div className="grid grid-cols-[80px_1fr] gap-3 p-3">
                      <div className="relative aspect-square overflow-hidden rounded bg-slate-50">
                        {frontImage ? (
                          <Image src={frontImage.url} alt={frontImage.alt} fill className="object-contain p-1" sizes="80px" />
                        ) : null}
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-500">{product.brand}</p>
                        <p className="truncate font-extrabold">{product.name}</p>
                        <p className="mt-1 text-sm font-bold text-retail">{formatMoney(product.pricePaise)}</p>
                        <p className="mt-1 text-xs text-slate-400">{product.colour} · {product.shape}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 border-t border-slate-100 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-500 peer-checked:bg-teal-50 peer-checked:text-retail">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      <span className="peer-checked:hidden">Select</span>
                      <span className="hidden peer-checked:inline">Selected</span>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Booking Form */}
          <aside className="vv-card sticky top-28 self-start p-6">
            <h2 className="text-xl font-extrabold">Your details</h2>
            <div className="mt-5 grid gap-4">
              <label className="grid gap-1 text-sm font-extrabold text-slate-600">
                Name
                <input className="store-input" type="text" name="name" required placeholder="Full name" />
              </label>
              <label className="grid gap-1 text-sm font-extrabold text-slate-600">
                Phone
                <input className="store-input" type="tel" name="phone" required placeholder="e.g. 9876543210" />
              </label>
              <label className="grid gap-1 text-sm font-extrabold text-slate-600">
                Full address
                <textarea className="store-input min-h-20 py-2" name="address" required placeholder="House/flat, street, area, city, pincode" />
              </label>
              <label className="grid gap-1 text-sm font-extrabold text-slate-600">
                Preferred date
                <input className="store-input" type="date" name="preferredDate" required min={new Date().toISOString().split("T")[0]} />
              </label>
              <label className="grid gap-1 text-sm font-extrabold text-slate-600">
                Time slot
                <select className="store-input" name="preferredSlot" required>
                  {timeSlots.map((slot) => (
                    <option key={slot} value={slot}>{slot}</option>
                  ))}
                </select>
              </label>
              <label className="grid gap-1 text-sm font-extrabold text-slate-600">
                Notes (optional)
                <textarea className="store-input min-h-16 py-2" name="notes" placeholder="Prescription info, special requests..." />
              </label>
            </div>

            <div className="mt-5 rounded-vv bg-slate-50 p-4 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-600">Service fee</span>
                <strong>{formatMoney(HOME_TRIAL_SERVICE_FEE_PAISE)}</strong>
              </div>
              <div className="mt-2 flex justify-between">
                <span className="text-slate-600">Deposit (3+ frames)</span>
                <strong>{formatMoney(HOME_TRIAL_DEPOSIT_PAISE)}</strong>
              </div>
              <p className="mt-3 text-xs text-slate-500">
                Deposit is fully refundable. Adjusted against purchase if you buy.
              </p>
            </div>

            <button className="vv-button-retail mt-5 w-full" type="submit">
              <Home className="h-4 w-4" />
              Book Home Trial
            </button>
          </aside>
        </form>
      </div>
    </main>
  );
}

function InfoCard({ icon, title, body }: { icon: React.ReactNode; title: string; body: string }) {
  return (
    <div className="vv-card p-5">
      <div className="text-retail">{icon}</div>
      <h3 className="mt-3 font-extrabold">{title}</h3>
      <p className="mt-1 text-sm text-slate-600">{body}</p>
    </div>
  );
}
