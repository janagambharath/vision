"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, MessageCircle, Send } from "lucide-react";

export function AppointmentPanel({ light = false }: { light?: boolean }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [whatsAppUrl, setWhatsAppUrl] = useState<string | null>(null);

  async function submitAppointment(formData: FormData) {
    setPending(true);
    setError(null);

    try {
      const response = await fetch("/api/leads", {
        method: "POST",
        body: formData,
        headers: { Accept: "application/json" },
      });
      const result = await response.json().catch(() => null);

      if (!response.ok || !result?.ok) {
        setError(result?.error ?? "We could not save your request. Please call or WhatsApp us directly.");
        return;
      }

      setWhatsAppUrl(typeof result.whatsappUrl === "string" ? result.whatsappUrl : null);
    } catch {
      setError("We could not reach the clinic. Please call or WhatsApp us directly.");
    } finally {
      setPending(false);
    }
  }

  if (whatsAppUrl) {
    return (
      <div className={light ? "vv-card p-6 text-center" : "rounded-vv border border-white/15 bg-white/10 p-6 text-center shadow-strong"}>
        <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-500" />
        <h2 className={light ? "mt-4 text-2xl font-extrabold text-slate-950" : "mt-4 text-2xl font-extrabold text-white"}>Request received</h2>
        <p className={light ? "mt-2 text-sm text-slate-600" : "mt-2 text-sm text-slate-300"}>
          Our team will confirm availability and your preferred slot. Send the details on WhatsApp for the fastest response.
        </p>
        <a className="vv-button-retail mt-5" href={whatsAppUrl} target="_blank" rel="noopener noreferrer">
          <MessageCircle className="h-4 w-4" />
          Continue on WhatsApp
        </a>
      </div>
    );
  }

  return (
    <form action={submitAppointment} className={light ? "vv-card grid gap-4 p-6" : "grid gap-4 rounded-vv border border-white/15 bg-white/10 p-6 shadow-strong"}>
      <input type="hidden" name="source" value="appointment_form" />
      <input type="hidden" name="intent" value="Appointment request" />
      <h2 className={light ? "text-2xl font-extrabold text-slate-950" : "text-2xl font-extrabold text-white"}>Request an appointment</h2>
      <label className="grid gap-2 text-sm font-bold">
        Full name
        <input className={light ? "vv-input" : "store-input"} type="text" name="name" autoComplete="name" required disabled={pending} />
      </label>
      <label className="grid gap-2 text-sm font-bold">
        Phone number
        <input className={light ? "vv-input" : "store-input"} type="tel" name="phone" autoComplete="tel" required disabled={pending} />
      </label>
      <label className="grid gap-2 text-sm font-bold">
        Service required
        <select className={light ? "vv-input" : "store-input"} name="payload[service]" required disabled={pending}>
          <option value="">Select a service</option>
          <option>Comprehensive Eye Test</option>
          <option>Prescription Lens Guidance</option>
          <option>LASIK Evaluation</option>
          <option>Cataract Consultation</option>
          <option>Retina Care</option>
          <option>Glaucoma Evaluation</option>
          <option>Diagnostics</option>
          <option>Showroom Consultation</option>
        </select>
      </label>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-bold">
          Preferred date
          <input className={light ? "vv-input" : "store-input"} type="date" name="payload[date]" disabled={pending} />
        </label>
        <label className="grid gap-2 text-sm font-bold">
          Preferred time
          <input className={light ? "vv-input" : "store-input"} type="text" name="payload[time]" placeholder="Morning / evening" disabled={pending} />
        </label>
      </div>
      <label className="grid gap-2 text-sm font-bold">
        Message
        <textarea className={light ? "vv-input min-h-28 py-3" : "store-input min-h-28 py-3"} name="payload[message]" disabled={pending} />
      </label>
      {error ? <p className="rounded-vv border border-red-200 bg-red-50 p-3 text-sm font-bold text-red-700" role="alert">{error}</p> : null}
      <button className={light ? "vv-button-primary" : "vv-button-retail"} type="submit" disabled={pending}>
        {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        {pending ? "Sending request..." : "Send Appointment Request"}
      </button>
      <p className={light ? "text-xs text-slate-500" : "text-xs text-slate-300"}>We will confirm your requested slot before it is booked.</p>
    </form>
  );
}
