"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { CreditCard, Lock, ShieldCheck, RefreshCw, Smartphone, CheckCircle2 } from "lucide-react";
import { formatMoney } from "@/lib/money";
import { checkoutAction } from "@/lib/orders";

interface CheckoutFormProps {
  cart: any;
  totals: {
    subtotalPaise: number;
    lensTotalPaise: number;
    shippingPaise: number;
    taxPaise: number;
    discountPaise: number;
    grandTotalPaise: number;
  };
}

export default function CheckoutForm({ cart, totals }: CheckoutFormProps) {
  const [pincode, setPincode] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [loadingPincode, setLoadingPincode] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState("RAZORPAY");
  const [isPending, startTransition] = useTransition();

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

  const paymentOptions = [
    { id: "RAZORPAY", label: "Razorpay (All-in-one)", desc: "Cards, Netbanking, UPI" },
    { id: "UPI", label: "UPI", desc: "Google Pay, PhonePe, Paytm" },
    { id: "CARD", label: "Credit/Debit Card", desc: "Visa, Mastercard, RuPay" },
    { id: "COD", label: "Cash On Delivery", desc: "Pay cash at your doorstep" },
    { id: "WHATSAPP_ASSISTED", label: "WhatsApp Assisted", desc: "Complete order with support" }
  ];

  const items = cart?.items ?? [];

  return (
    <form
      action={(formData) => {
        startTransition(async () => {
          await checkoutAction(formData);
        });
      }}
      method="POST"
      encType="multipart/form-data"
      className="grid gap-6 lg:grid-cols-[1fr_380px]"
    >
      <input type="hidden" name="paymentMethod" value={paymentMethod} />

      <section className="vv-card grid gap-5 p-6">
        <h2 className="text-2xl font-extrabold">Customer and delivery</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-extrabold text-slate-600">
            Name
            <input className="store-input" type="text" name="name" required />
          </label>
          <label className="grid gap-2 text-sm font-extrabold text-slate-600">
            Phone
            <input className="store-input" type="tel" name="phone" required />
          </label>
          <label className="grid gap-2 text-sm font-extrabold text-slate-600">
            Email optional
            <input className="store-input" type="email" name="email" />
          </label>
          <label className="grid gap-2 text-sm font-extrabold text-slate-600 relative">
            Pincode
            <input
              className="store-input"
              type="text"
              name="pincode"
              maxLength={6}
              value={pincode}
              onChange={handlePincodeChange}
              required
            />
            {loadingPincode && (
              <RefreshCw className="absolute right-3 bottom-3.5 h-4 w-4 animate-spin text-slate-400" />
            )}
          </label>
        </div>

        <label className="grid gap-2 text-sm font-extrabold text-slate-600">
          Address line 1
          <input className="store-input" type="text" name="line1" required />
        </label>
        <label className="grid gap-2 text-sm font-extrabold text-slate-600">
          Address line 2 optional
          <input className="store-input" type="text" name="line2" />
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label className="grid gap-2 text-sm font-extrabold text-slate-600">
            City
            <input
              className="store-input"
              type="text"
              name="city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              required
            />
          </label>
          <label className="grid gap-2 text-sm font-extrabold text-slate-600">
            State optional
            <input
              className="store-input"
              type="text"
              name="state"
              value={state}
              onChange={(e) => setState(e.target.value)}
            />
          </label>
        </div>

        <div className="grid gap-4">
          <label className="grid gap-2 text-sm font-extrabold text-slate-600">
            Delivery method
            <select className="store-input" name="deliveryMethod" required>
              <option value="DELIVERY">Delivery</option>
              <option value="TRY_AT_HOME">Try at home</option>
              <option value="STORE_PICKUP">Store pickup</option>
            </select>
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
        </div>

        <label className="grid gap-2 text-sm font-extrabold text-slate-600 mt-2">
          Prescription upload (optional — required for prescription lenses)
          <input
            className="store-input"
            type="file"
            name="prescription"
            accept="image/jpeg,image/png,image/webp,application/pdf"
          />
          <span className="text-xs text-slate-400 font-normal">
            JPEG, PNG, or PDF · Max 10MB · Required for single vision, progressive, or anti-glare lens orders
          </span>
        </label>

        <label className="grid gap-2 text-sm font-extrabold text-slate-600">
          Notes
          <textarea className="store-input min-h-28 py-3" name="notes" placeholder="Prescription power notes, delivery, or WhatsApp note" />
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

      <aside className="vv-card sticky top-28 self-start p-6 grid gap-6">
        <div>
          <h2 className="text-2xl font-extrabold border-b border-slate-100 pb-2">Order summary</h2>
          <div className="mt-4 grid gap-3">
            {items.map((item: any) => {
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
          <SummaryRow label="Delivery" value={formatMoney(totals.shippingPaise)} />
          <SummaryRow label="GST (12%)" value={formatMoney(totals.taxPaise)} />
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
