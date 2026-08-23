"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { Banknote, Lock, ShieldCheck, RefreshCw, Smartphone } from "lucide-react";
import { formatMoney } from "@/lib/money";
import { checkoutAction } from "@/lib/orders";
import type { CheckoutCart, CheckoutTotals, CheckoutCartItem } from "@/types/checkout";
import { checkoutSchema } from "@/lib/validations";
import PrescriptionStep, { type PrescriptionChoice } from "@/components/prescription-step";

interface CheckoutFormProps {
  cart: CheckoutCart;
  totals: CheckoutTotals;
  error?: string;
  checkoutScope: "CART" | "DIRECT";
  directCheckout: boolean;
}

export default function CheckoutForm({ cart, totals, error, checkoutScope, directCheckout }: CheckoutFormProps) {
  const [pincode, setPincode] = useState("");
  const [city, setCity] = useState("Hyderabad");
  const [state, setState] = useState("Telangana");
  const [loadingPincode, setLoadingPincode] = useState(false);
  const [pincodeMessage, setPincodeMessage] = useState<string | null>(null);
  const [isPincodeServiceable, setIsPincodeServiceable] = useState<boolean | null>(null);
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [prescriptionChoice, setPrescriptionChoice] = useState<PrescriptionChoice>("");

  const handlePincodeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "");
    setPincode(value);
    setPincodeMessage(null);
    setIsPincodeServiceable(null);

    if (value.length === 6) {
      setLoadingPincode(true);
      try {
        const [postcodeResponse, serviceabilityResponse] = await Promise.all([
          fetch(`https://api.postalpincode.in/pincode/${value}`),
          fetch(`/api/serviceability?pincode=${encodeURIComponent(value)}`)
        ]);
        const data = await postcodeResponse.json();
        if (data && data[0] && data[0].Status === "Success") {
          const postOffices = data[0].PostOffice;
          if (postOffices && postOffices.length > 0) {
            setCity(postOffices[0].District);
            setState(postOffices[0].State);
          }
        }
        const serviceability = await serviceabilityResponse.json().catch(() => null);
        if (serviceability && typeof serviceability.serviceable === "boolean") {
          setIsPincodeServiceable(serviceability.serviceable);
          setPincodeMessage(typeof serviceability.message === "string" ? serviceability.message : null);
        }
      } catch (err) {
        console.error("Failed to check pincode details:", err);
        setPincodeMessage("We could not verify this pincode yet. Please try again or contact us on WhatsApp.");
      } finally {
        setLoadingPincode(false);
      }
    }
  };

  const handleAction = (formData: FormData) => {
    const data = Object.fromEntries(formData.entries());
    const result = checkoutSchema.safeParse(data);
    
    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const err of result.error.errors) {
        if (err.path[0]) {
          fieldErrors[err.path[0] as string] = err.message;
        }
      }
      setErrors(fieldErrors);
      // Scroll to top to show errors
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    if (isPincodeServiceable !== true) {
      setErrors({ pincode: "Enter a supported Hyderabad pincode before placing your order." });
      return;
    }
    
    // Also handle file validation for prescription
    const file = formData.get("prescription") as File | null;
    if (file && file.size > 0) {
      if (file.size > 10 * 1024 * 1024) {
        setErrors({ prescription: "File size must be less than 10MB" });
        return;
      }
    }

    setErrors({});
    startTransition(async () => {
      await checkoutAction(formData);
    });
  };

  const items = cart?.items ?? [];
  const requiresPrescription = items.some((item: any) => item.lensOption?.requiresPrescription);
  const prescriptionSummary = prescriptionChoice === "HAVE" ? "Provided for review"
    : prescriptionChoice === "EYE_TEST" ? "Eye test requested"
      : prescriptionChoice === "UPLOAD_LATER" ? "Upload later"
        : prescriptionChoice === "NONE" ? "Not required" : requiresPrescription ? "Selection required" : "Not required";

  const inputClass = (name: string) => `store-input ${errors[name] ? "border-red-500 focus:border-red-500 focus:ring-red-500/10" : ""}`;

  return (
    <form
      action={handleAction}
      method="POST"
      encType="multipart/form-data"
      className="grid min-w-0 items-start gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(340px,380px)]"
    >
      <input type="hidden" name="paymentMethod" value="COD" />
      <input type="hidden" name="deliveryMethod" value="DELIVERY" />
      <input type="hidden" name="checkoutScope" value={checkoutScope} />
      <div className="absolute -left-[10000px] h-px w-px overflow-hidden" aria-hidden="true">
        <label htmlFor="checkout-website">Website</label>
        <input id="checkout-website" type="text" name="website" tabIndex={-1} autoComplete="off" />
      </div>

      <section className="vv-card min-w-0 grid gap-5 p-6">
        {error ? <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">{error}</div> : null}
        {directCheckout ? (
          <div className="rounded-lg border border-teal-200 bg-teal-50 px-4 py-3 text-sm font-semibold text-teal-900">
            Buy now checkout: only this selected frame is included. Your other cart items remain saved.
          </div>
        ) : null}
        <h2 className="text-2xl font-extrabold">Customer and delivery</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-extrabold text-slate-600">
            Name
            <input className={inputClass("name")} type="text" name="name" required />
            {errors.name && <span className="text-xs text-red-500 font-normal">{errors.name}</span>}
          </label>
          <label className="grid gap-2 text-sm font-extrabold text-slate-600">
            Phone
            <input className={inputClass("phone")} type="tel" name="phone" required />
            {errors.phone && <span className="text-xs text-red-500 font-normal">{errors.phone}</span>}
          </label>
          <label className="grid gap-2 text-sm font-extrabold text-slate-600">
            Email
            <input className={inputClass("email")} type="email" name="email" required />
            {errors.email && <span className="text-xs text-red-500 font-normal">{errors.email}</span>}
          </label>
          <label className="grid gap-2 text-sm font-extrabold text-slate-600 relative">
            Pincode
            <input
              className={inputClass("pincode")}
              type="text"
              name="pincode"
              maxLength={6}
              value={pincode}
              onChange={handlePincodeChange}
              required
            />
            {loadingPincode && (
              <RefreshCw className="absolute right-3 bottom-9 h-4 w-4 animate-spin text-slate-400" />
            )}
            {errors.pincode && <span className="text-xs text-red-500 font-normal">{errors.pincode}</span>}
            {pincodeMessage && !errors.pincode ? (
              <span className={`text-xs font-normal ${isPincodeServiceable ? "text-emerald-700" : "text-amber-700"}`}>
                {pincodeMessage}
              </span>
            ) : null}
          </label>
        </div>

        <label className="grid gap-2 text-sm font-extrabold text-slate-600">
          Address line 1
          <input className={inputClass("line1")} type="text" name="line1" required />
          {errors.line1 && <span className="text-xs text-red-500 font-normal">{errors.line1}</span>}
        </label>
        <label className="grid gap-2 text-sm font-extrabold text-slate-600">
          Address line 2 optional
          <input className={inputClass("line2")} type="text" name="line2" />
          {errors.line2 && <span className="text-xs text-red-500 font-normal">{errors.line2}</span>}
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-extrabold text-slate-600">
            City
            <input
              className={inputClass("city")}
              type="text"
              name="city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              required
            />
            {errors.city && <span className="text-xs text-red-500 font-normal">{errors.city}</span>}
          </label>
          <label className="grid gap-2 text-sm font-extrabold text-slate-600">
            State
            <input
              className={inputClass("state")}
              type="text"
              name="state"
              value={state}
              onChange={(e) => setState(e.target.value)}
              required
            />
            {errors.state && <span className="text-xs text-red-500 font-normal">{errors.state}</span>}
          </label>
        </div>

        <div className="grid gap-2">
          <span className="text-sm font-extrabold text-slate-600">Delivery method</span>
          <div className="rounded-vv border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-700">
            Home delivery
          </div>
        </div>

        {/* COD-only launch. The server validates this independently. */}
        <div className="grid gap-2 mt-2">
          <span className="text-sm font-extrabold text-slate-600">Payment method</span>
          <div className="rounded-vv border-2 border-retail bg-teal-50/20 p-4">
            <span className="flex items-center gap-2 text-sm font-extrabold text-slate-800">
              <Banknote className="h-4 w-4 text-retail" />
              Cash on delivery
            </span>
          <span className="mt-1 block text-xs text-slate-500">Pay in cash on local delivery. We confirm every order before dispatch.</span>
          </div>
        </div>

{/*
        <label className="grid gap-2 text-sm font-extrabold text-slate-600 mt-2">
          Prescription upload (optional — required for prescription lenses)
          <input
            className={inputClass("prescription")}
            type="file"
            name="prescription"
            accept="image/jpeg,image/png,image/webp,application/pdf"
          />
          <span className="text-xs text-slate-400 font-normal">
            JPEG, PNG, or PDF · Max 10MB · Required for single vision, progressive, or anti-glare lens orders
          </span>
          {errors.prescription && <span className="text-xs text-red-500 font-normal">{errors.prescription}</span>}
        </label>
*/}
        <PrescriptionStep requiresPrescription={requiresPrescription} choice={prescriptionChoice} onChoiceChange={setPrescriptionChoice} />

        <label className="grid gap-2 text-sm font-extrabold text-slate-600">
          Notes
          <textarea className={inputClass("notes") + " min-h-28 py-3"} name="notes" placeholder="Prescription power notes, delivery, or WhatsApp note" />
          {errors.notes && <span className="text-xs text-red-500 font-normal">{errors.notes}</span>}
        </label>

        <label className="flex gap-3 text-sm font-bold text-slate-600">
          <input type="checkbox" name="acceptedReturns" required />
          <span>I accept the <Link href="/return-policy" className="text-retail hover:underline" target="_blank">return policy</Link> for configured prescription eyewear.</span>
        </label>
        {errors.acceptedReturns && <span className="text-xs text-red-500 font-normal -mt-3">{errors.acceptedReturns}</span>}

        <label className="flex gap-3 text-sm font-bold text-slate-600">
          <input type="checkbox" name="acceptedTerms" required />
          <span>I accept Vision Vistara <Link href="/terms" className="text-retail hover:underline" target="_blank">checkout terms</Link> and <Link href="/privacy" className="text-retail hover:underline" target="_blank">privacy policy</Link>.</span>
        </label>
        {errors.acceptedTerms && <span className="text-xs text-red-500 font-normal -mt-3">{errors.acceptedTerms}</span>}
      </section>

      <aside className="vv-card w-full min-w-0 max-w-full self-start p-5 grid gap-5 sm:p-6 xl:sticky xl:top-24 xl:max-h-[calc(100vh-7rem)] xl:overflow-y-auto">
        <div>
          <h2 className="text-2xl font-extrabold border-b border-slate-100 pb-2">Order summary</h2>
          <div className="mt-4 grid gap-3">
            {items.map((item: CheckoutCartItem) => {
              const imgUrl = item.product.images?.[0]?.url || "/placeholder-frame.png";
              return (
                <div key={item.id} className="flex min-w-0 max-w-full gap-3 rounded-vv border border-slate-200 p-3 text-sm items-center bg-white">
                  <div className="relative h-12 w-12 shrink-0 border border-slate-100 rounded bg-slate-50 overflow-hidden">
                    <Image
                      src={imgUrl}
                      alt={item.product.name}
                      fill
                      className="object-contain p-1"
                      sizes="48px"
                    />
                  </div>
                  <div className="flex-1 min-w-0">
                    <strong className="block truncate text-slate-800">{item.product.name}</strong>
                    <p className="text-slate-500 truncate">Qty {item.quantity} · {item.lensOption?.name ?? "Frame with standard power"}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <dl className="grid gap-3 text-sm">
          <SummaryRow label="Frame subtotal" value={formatMoney(totals.subtotalPaise)} />
          <SummaryRow label="Lens add-ons" value={formatMoney(totals.lensTotalPaise)} />
          <SummaryRow label="Prescription" value={prescriptionSummary} />
          {totals.rxSurchargePaise > 0 ? (
            <div className="flex justify-between text-amber-600 font-bold text-sm">
              <dt>RX power surcharge</dt>
              <dd>{formatMoney(totals.rxSurchargePaise)}</dd>
            </div>
          ) : null}
          <SummaryRow label="Delivery" value={formatMoney(totals.shippingPaise)} />
          {totals.discountPaise > 0 ? (
            <div className="flex justify-between text-emerald-600 font-bold">
              <dt>Discount</dt>
              <dd>-{formatMoney(totals.discountPaise)}</dd>
            </div>
          ) : null}
          <div className="flex min-w-0 items-start justify-between gap-4 border-t border-slate-200 pt-3 font-extrabold text-base">
            <dt className="min-w-0">Grand total</dt>
            <dd className="shrink-0 text-right text-retail">{formatMoney(totals.grandTotalPaise)}</dd>
          </div>
        </dl>

        <button
          className="vv-button-retail py-3 justify-center w-full font-bold flex items-center gap-2"
          type="submit"
          disabled={isPending}
        >
          {isPending ? (
            <RefreshCw className="h-4 w-4 animate-spin" />
          ) : (
            <Banknote className="h-4 w-4" />
          )}
          {isPending ? "Processing..." : "Place order"}
        </button>

        {/* Premium Trust Badges */}
        <div className="grid gap-3 border-t border-slate-100 pt-5 text-xs text-slate-500">
          <div className="flex min-w-0 items-start gap-2">
            <Lock className="h-4 w-4 text-emerald-600 shrink-0" />
            <span className="min-w-0"><strong>Secure checkout</strong> - Your order details are sent over an encrypted connection.</span>
          </div>
          <div className="flex min-w-0 items-start gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
            <span className="min-w-0"><strong>Cash on delivery</strong> - Pay when your order is delivered.</span>
          </div>
          <div className="flex min-w-0 items-start gap-2">
            <Smartphone className="h-4 w-4 text-emerald-600 shrink-0" />
            <span className="min-w-0"><strong>Order confirmation</strong> - We will confirm your COD order before dispatch.</span>
          </div>
        </div>
      </aside>
    </form>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex min-w-0 items-start justify-between gap-4 text-slate-600">
      <dt className="min-w-0">{label}</dt>
      <dd className="shrink-0 text-right font-semibold">{value}</dd>
    </div>
  );
}
