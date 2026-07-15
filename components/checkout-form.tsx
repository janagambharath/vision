"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import Link from "next/link";
import { CreditCard, Lock, ShieldCheck, RefreshCw, Smartphone, CheckCircle2 } from "lucide-react";
import { formatMoney } from "@/lib/money";
import { checkoutAction } from "@/lib/orders";
import type { CheckoutCart, CheckoutTotals, CheckoutCartItem } from "@/types/checkout";
import { checkoutSchema } from "@/lib/validations";
import PrescriptionStep, { type PrescriptionChoice } from "@/components/prescription-step";

interface CheckoutFormProps {
  cart: CheckoutCart;
  totals: CheckoutTotals;
  error?: string;
}

export default function CheckoutForm({ cart, totals, error }: CheckoutFormProps) {
  const [pincode, setPincode] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [loadingPincode, setLoadingPincode] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("RAZORPAY");
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [prescriptionChoice, setPrescriptionChoice] = useState<PrescriptionChoice>("");

  const handlePincodeChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, "");
    setPincode(value);

    if (value.length === 6) {
      setLoadingPincode(true);
      try {
        const res = await fetch(`https://api.postalpincode.in/pincode/${value}`);
        const data = await res.json();
        if (data && data[0] && data[0].Status === "Success") {
          const postOffices = data[0].PostOffice;
          if (postOffices && postOffices.length > 0) {
            setCity(postOffices[0].District);
            setState(postOffices[0].State);
          }
        }
      } catch (err) {
        console.error("Failed to fetch pincode details:", err);
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

  const paymentOptions = [
    { id: "RAZORPAY", label: "Razorpay (All-in-one)", desc: "Cards, Netbanking, UPI" },
    { id: "COD", label: "Cash On Delivery", desc: "Pay cash at your doorstep" },
    { id: "WHATSAPP_ASSISTED", label: "WhatsApp Assisted", desc: "Complete order with support" }
  ];

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
      className="grid gap-6 lg:grid-cols-[1fr_380px]"
    >
      <input type="hidden" name="paymentMethod" value={paymentMethod} />

      <section className="vv-card grid gap-5 p-6">
        {error ? <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-800">{error}</div> : null}
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
            Email optional
            <input className={inputClass("email")} type="email" name="email" />
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
            State optional
            <input
              className={inputClass("state")}
              type="text"
              name="state"
              value={state}
              onChange={(e) => setState(e.target.value)}
            />
            {errors.state && <span className="text-xs text-red-500 font-normal">{errors.state}</span>}
          </label>
        </div>

        <div className="grid gap-4">
          <label className="grid gap-2 text-sm font-extrabold text-slate-600">
            Delivery method
            <select className={inputClass("deliveryMethod")} name="deliveryMethod" required>
              <option value="DELIVERY">Delivery</option>
              <option value="TRY_AT_HOME">Try at home</option>
              <option value="STORE_PICKUP">Store pickup</option>
            </select>
            {errors.deliveryMethod && <span className="text-xs text-red-500 font-normal">{errors.deliveryMethod}</span>}
          </label>
        </div>

        {/* Custom Interactive Payment Method Selector */}
        <div className="grid gap-2 mt-2">
          <span className="text-sm font-extrabold text-slate-600">Payment method</span>
          <div className="grid gap-3 sm:grid-cols-2">
            {paymentOptions.map((opt) => {
              const active = paymentMethod === opt.id;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setPaymentMethod(opt.id)}
                  className={`flex flex-col text-left p-4 rounded-vv border-2 transition-all ${
                    active
                      ? "border-retail bg-teal-50/20"
                      : "border-slate-200 hover:border-slate-300 bg-white"
                  }`}
                >
                  <span className="font-extrabold text-sm text-slate-800 flex items-center gap-1.5">
                    {opt.label}
                    {active && <CheckCircle2 className="h-4 w-4 text-retail" />}
                  </span>
                  <span className="text-xs text-slate-500 mt-1">{opt.desc}</span>
                </button>
              );
            })}
          </div>
          {errors.paymentMethod && <span className="text-xs text-red-500 font-normal">{errors.paymentMethod}</span>}
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

      <aside className="vv-card sticky top-28 self-start p-6 grid gap-6">
        <div>
          <h2 className="text-2xl font-extrabold border-b border-slate-100 pb-2">Order summary</h2>
          <div className="mt-4 grid gap-3">
            {items.map((item: CheckoutCartItem) => {
              const imgUrl = item.product.images?.[0]?.url || "/placeholder-frame.png";
              return (
                <div key={item.id} className="flex gap-3 rounded-vv border border-slate-200 p-3 text-sm items-center bg-white">
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
                    <p className="text-slate-500 truncate">Qty {item.quantity} · {item.lensOption?.name ?? "Frame only"}</p>
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
          <SummaryRow label="Delivery" value={formatMoney(totals.shippingPaise)} />
          <SummaryRow label={`Tax (${Math.round((totals.taxPaise / (totals.subtotalPaise + totals.lensTotalPaise - totals.discountPaise)) * 100 || 12)}% GST)`} value={formatMoney(totals.taxPaise)} />
          {totals.discountPaise > 0 ? (
            <div className="flex justify-between text-emerald-600 font-bold">
              <dt>Discount</dt>
              <dd>-{formatMoney(totals.discountPaise)}</dd>
            </div>
          ) : null}
          <div className="border-t border-slate-200 pt-3 flex justify-between font-extrabold text-base">
            <dt>Grand total</dt>
            <dd className="text-retail">{formatMoney(totals.grandTotalPaise)}</dd>
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
            <CreditCard className="h-4 w-4" />
          )}
          {isPending ? "Processing..." : "Place order"}
        </button>

        {/* Premium Trust Badges */}
        <div className="grid gap-3 border-t border-slate-100 pt-5 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <Lock className="h-4 w-4 text-emerald-600 shrink-0" />
            <span><strong>256-bit SSL secured</strong> - SSL encryption safeguards card details.</span>
          </div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
            <span><strong>Razorpay secured payments</strong> - Safe instant online payment.</span>
          </div>
          <div className="flex items-center gap-2">
            <Smartphone className="h-4 w-4 text-emerald-600 shrink-0" />
            <span><strong>7-day returns & free exchange</strong> - Risk-free trial assurance.</span>
          </div>
        </div>
      </aside>
    </form>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-slate-600">
      <dt>{label}</dt>
      <dd className="font-semibold">{value}</dd>
    </div>
  );
}
