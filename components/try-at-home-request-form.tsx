"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState } from "react";
import { ArrowRight, CalendarCheck, CheckCircle2, Home, MapPin, Package, Pencil, ShieldCheck, Truck } from "lucide-react";
import { formatMoney } from "@/lib/money";
import { MAX_HOME_TRIAL_FRAMES } from "@/lib/constants";

type TrialProduct = {
  slug: string;
  name: string;
  brand: string;
  pricePaise: number | null;
  colour: string | null;
  shape: string | null;
  image?: { url: string; alt: string };
};

type PreviewDetails = {
  name: string;
  phone: string;
  address: string;
  pincode: string;
  preferredDate: string;
  preferredSlot: string;
  notes: string;
};

export function TryAtHomeRequestForm({
  products,
  initialProductIds,
  isSignedIn,
  loginHref,
  action
}: {
  products: TrialProduct[];
  initialProductIds: string[];
  isSignedIn: boolean;
  loginHref: string;
  action: (formData: FormData) => void | Promise<void>;
}) {
  const availableIds = new Set(products.map((product) => product.slug));
  const [selectedIds, setSelectedIds] = useState(() => initialProductIds.filter((id) => availableIds.has(id)).slice(0, MAX_HOME_TRIAL_FRAMES));
  const [preview, setPreview] = useState<PreviewDetails | null>(null);
  const [selectionError, setSelectionError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  if (!isSignedIn) {
    return (
      <section className="vv-card border border-blue-100 bg-white p-6 text-center shadow-xl shadow-blue-950/5 sm:p-8">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-blue-50 text-blue-700"><ShieldCheck className="h-6 w-6" /></span>
        <h2 className="mt-4 text-2xl font-extrabold text-slate-950">Sign in to request a home trial</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-slate-600">
          Signing in keeps your selected frames, request status, and visit confirmation together in My Account.
        </p>
        <Link className="vv-button-retail mt-6 inline-flex" href={loginHref}>
          Sign in to continue
          <ArrowRight className="h-4 w-4" />
        </Link>
      </section>
    );
  }

  const selectedProducts = selectedIds
    .map((id) => products.find((product) => product.slug === id))
    .filter((product): product is TrialProduct => Boolean(product));

  function toggleProduct(slug: string, checked: boolean) {
    setSelectionError(null);
    setSelectedIds((current) => {
      if (!checked) return current.filter((id) => id !== slug);
      if (current.includes(slug)) return current;
      if (current.length >= MAX_HOME_TRIAL_FRAMES) {
        setSelectionError(`You can request up to ${MAX_HOME_TRIAL_FRAMES} frames at a time.`);
        return current;
      }
      return [...current, slug];
    });
  }

  function openPreview() {
    const form = formRef.current;
    if (!form || !form.reportValidity()) return;
    if (selectedIds.length === 0) {
      setSelectionError("Select at least one frame before reviewing your request.");
      return;
    }
    const data = new FormData(form);
    setPreview({
      name: String(data.get("name") ?? ""),
      phone: String(data.get("phone") ?? ""),
      address: String(data.get("address") ?? ""),
      pincode: String(data.get("pincode") ?? ""),
      preferredDate: String(data.get("preferredDate") ?? ""),
      preferredSlot: String(data.get("preferredSlot") ?? ""),
      notes: String(data.get("notes") ?? "")
    });
    setSelectionError(null);
    requestAnimationFrame(() => document.getElementById("home-trial-preview")?.scrollIntoView({ behavior: "smooth", block: "start" }));
  }

  return (
    <form ref={formRef} action={action} className="grid gap-8 lg:grid-cols-[1fr_380px]">
      <input className="hidden" type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" />

      {preview ? (
        <section id="home-trial-preview" className="scroll-mt-28">
          <input type="hidden" name="name" value={preview.name} />
          <input type="hidden" name="phone" value={preview.phone} />
          <input type="hidden" name="address" value={preview.address} />
          <input type="hidden" name="pincode" value={preview.pincode} />
          <input type="hidden" name="preferredDate" value={preview.preferredDate} />
          <input type="hidden" name="preferredSlot" value={preview.preferredSlot} />
          <input type="hidden" name="notes" value={preview.notes} />
          {selectedIds.map((id) => <input key={id} type="hidden" name="productIds" value={id} />)}

          <div className="rounded-[2rem] border border-blue-200 bg-white p-5 shadow-xl shadow-blue-950/5 sm:p-7">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-100 pb-5">
              <div>
                <p className="vv-kicker text-retail">Final review</p>
                <h2 className="mt-1 text-2xl font-extrabold text-slate-950">Confirm your home-trial request</h2>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-slate-600">Please check your selected frames and visit details. We will confirm route, stock, and team availability before booking the visit.</p>
              </div>
              <button type="button" onClick={() => setPreview(null)} className="vv-button-light text-xs font-extrabold">
                <Pencil className="h-3.5 w-3.5" />
                Edit request
              </button>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {selectedProducts.map((product) => (
                <article key={product.slug} className="flex gap-3 rounded-2xl border border-slate-100 bg-slate-50/70 p-3">
                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-white">
                    {product.image ? <Image src={product.image.url} alt={product.image.alt} fill sizes="64px" className="object-contain p-1" /> : <Package className="m-5 h-6 w-6 text-slate-300" />}
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] font-bold text-slate-500">{product.brand}</p>
                    <h3 className="line-clamp-2 text-sm font-extrabold text-slate-900">{product.name}</h3>
                    <p className="mt-1 text-xs font-extrabold text-retail">{formatMoney(product.pricePaise ?? 0)}</p>
                  </div>
                </article>
              ))}
            </div>

            <dl className="mt-6 grid gap-3 rounded-2xl bg-blue-50/70 p-4 text-sm sm:grid-cols-2">
              <div><dt className="text-xs font-bold text-slate-500">Requested by</dt><dd className="mt-1 font-extrabold text-slate-900">{preview.name} · {preview.phone}</dd></div>
              <div><dt className="text-xs font-bold text-slate-500">Preferred visit</dt><dd className="mt-1 font-extrabold text-slate-900">{preview.preferredDate} · {preview.preferredSlot}</dd></div>
              <div className="sm:col-span-2"><dt className="flex items-center gap-1 text-xs font-bold text-slate-500"><MapPin className="h-3.5 w-3.5" /> Visit address</dt><dd className="mt-1 whitespace-pre-line font-semibold text-slate-800">{preview.address}, {preview.pincode}</dd></div>
              {preview.notes ? <div className="sm:col-span-2"><dt className="text-xs font-bold text-slate-500">Notes</dt><dd className="mt-1 whitespace-pre-line text-slate-700">{preview.notes}</dd></div> : null}
            </dl>
          </div>
        </section>
      ) : (
        <>
          <section>
            <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 className="text-2xl font-extrabold">Select frames to try</h2>
                <p className="mt-1 text-sm text-slate-600">Choose 1–{MAX_HOME_TRIAL_FRAMES} eligible frames. You can review everything before sending.</p>
              </div>
              <span className="rounded-full bg-teal-50 px-3 py-1 text-xs font-extrabold text-retail">{selectedIds.length}/{MAX_HOME_TRIAL_FRAMES} selected</span>
            </div>
            {selectionError ? <p className="mb-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold text-amber-800">{selectionError}</p> : null}
            <div className="grid gap-3 sm:grid-cols-2">
              {products.map((product) => {
                const selected = selectedIds.includes(product.slug);
                return (
                  <article key={product.slug} className="vv-card overflow-hidden transition has-[:checked]:border-retail has-[:checked]:ring-2 has-[:checked]:ring-teal-200 hover:shadow-strong">
                    <input id={`home-trial-${product.slug}`} type="checkbox" name="productIds" value={product.slug} checked={selected} onChange={(event) => toggleProduct(product.slug, event.target.checked)} className="sr-only" />
                    <label htmlFor={`home-trial-${product.slug}`} className="block cursor-pointer">
                      <div className="grid grid-cols-[80px_1fr] gap-3 p-3">
                        <div className="relative aspect-square overflow-hidden rounded bg-slate-50">
                          {product.image ? <Image src={product.image.url} alt={product.image.alt} fill className="object-contain p-1" sizes="80px" /> : null}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-slate-500">{product.brand}</p>
                          <p className="truncate font-extrabold">{product.name}</p>
                          <p className="mt-1 text-sm font-bold text-retail">{formatMoney(product.pricePaise ?? 0)}</p>
                          <p className="mt-1 text-xs text-slate-400">{product.colour ?? ""} {product.colour && product.shape ? "·" : ""} {product.shape ?? ""}</p>
                        </div>
                      </div>
                    </label>
                    <div className="flex items-center justify-between gap-2 border-t border-slate-100 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-500">
                      <label htmlFor={`home-trial-${product.slug}`} className="inline-flex cursor-pointer items-center gap-2 hover:text-retail"><CheckCircle2 className="h-3.5 w-3.5" />{selected ? "Selected" : "Select frame"}</label>
                      <Link href={`/frames/${product.slug}`} className="inline-flex items-center gap-1 rounded-full bg-white px-2.5 py-1 font-extrabold text-teal-700 shadow-sm ring-1 ring-slate-200 transition hover:bg-teal-50 hover:ring-teal-200">View frame <ArrowRight className="h-3.5 w-3.5" /></Link>
                    </div>
                  </article>
                );
              })}
            </div>
          </section>

          <aside className="vv-card sticky top-28 self-start p-6">
            <h2 className="text-xl font-extrabold">Your request details</h2>
            <div className="mt-5 grid gap-4">
              <label className="grid gap-1 text-sm font-extrabold text-slate-600">Name<input className="store-input" type="text" name="name" required placeholder="Full name" /></label>
              <label className="grid gap-1 text-sm font-extrabold text-slate-600">Phone<input className="store-input" type="tel" name="phone" required placeholder="e.g. 9876543210" /></label>
              <label className="grid gap-1 text-sm font-extrabold text-slate-600">Full address<textarea className="store-input min-h-20 py-2" name="address" required placeholder="House/flat, street, area, city" /></label>
              <label className="grid gap-1 text-sm font-extrabold text-slate-600">Pincode<input className="store-input" type="text" name="pincode" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} required placeholder="Any 6-digit pincode" /></label>
              <label className="grid gap-1 text-sm font-extrabold text-slate-600">Preferred date<input className="store-input" type="date" name="preferredDate" required min={new Date().toISOString().split("T")[0]} /></label>
              <label className="grid gap-1 text-sm font-extrabold text-slate-600">Preferred time window<select className="store-input" name="preferredSlot" defaultValue="10:00 AM – 12:00 PM" required>{["10:00 AM – 12:00 PM", "12:00 PM – 2:00 PM", "2:00 PM – 4:00 PM", "4:00 PM – 6:00 PM", "6:00 PM – 8:00 PM"].map((slot) => <option key={slot} value={slot}>{slot}</option>)}</select></label>
              <label className="grid gap-1 text-sm font-extrabold text-slate-600">Notes (optional)<textarea className="store-input min-h-16 py-2" name="notes" placeholder="Special requests for the visit..." /></label>
            </div>

            <div className="mt-5 rounded-vv bg-slate-50 p-4 text-sm"><p className="font-bold text-slate-700">No payment, deposit, or service fee is collected with this request.</p><p className="mt-2 text-xs text-slate-500">Any valid Indian pincode can be requested. We confirm route, frame availability, and team capacity before booking a visit.</p></div>
            <button className="vv-button-retail mt-5 w-full" type="button" onClick={openPreview}><CalendarCheck className="h-4 w-4" />Review selected frames</button>
          </aside>
        </>
      )}

      {preview ? (
        <aside className="vv-card sticky top-28 self-start p-6">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-teal-50 text-retail"><Truck className="h-5 w-5" /></span>
          <h2 className="mt-4 text-xl font-extrabold">Ready to request</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">Your request will appear in My Account after submission. The visit is confirmed only after our team verifies all details.</p>
          <button className="vv-button-retail mt-5 w-full" type="submit"><Home className="h-4 w-4" />Confirm home trial request</button>
        </aside>
      ) : null}
    </form>
  );
}
