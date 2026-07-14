"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";

export function OrderLookupForm({ initialOrderId = "" }: { initialOrderId?: string }) {
  const router = useRouter();
  const [orderId, setOrderId] = useState(initialOrderId);
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/orders/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: orderId, phone })
      });
      const payload = await response.json();
      if (!response.ok || !payload.publicId) throw new Error(payload.error ?? "Order details could not be verified.");
      router.push(`/frames/orders/${payload.publicId}`);
      router.refresh();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Order details could not be verified.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="vv-card mt-8 grid gap-4 p-6" onSubmit={submit}>
      <label className="grid gap-2 text-sm font-extrabold text-slate-600">
        Order ID
        <input className="store-input" value={orderId} onChange={(event) => setOrderId(event.target.value)} placeholder="VV-..." autoComplete="off" required />
      </label>
      <label className="grid gap-2 text-sm font-extrabold text-slate-600">
        Full phone number used at checkout
        <input className="store-input" value={phone} onChange={(event) => setPhone(event.target.value)} type="tel" inputMode="tel" autoComplete="tel" required />
      </label>
      {error ? <p className="rounded-vv border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-800">{error}</p> : null}
      <button className="vv-button-retail" type="submit" disabled={loading}>
        <Search className="h-4 w-4" />
        {loading ? "Verifying…" : "Track order"}
      </button>
    </form>
  );
}
