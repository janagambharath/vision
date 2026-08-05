import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { CalendarCheck, Heart, MessageCircle, ShieldCheck, UserCheck } from "lucide-react";
import { SectionHeading } from "@/components/section-heading";
import { SiteHeader } from "@/components/site-header";
import { CLINIC_NAME, CLINIC_PHONE, SITE_URL } from "@/lib/constants";
import { LOCAL_SERVICE_AREA_LABEL } from "@/lib/local-service";

export const metadata: Metadata = {
  title: "About",
  description: `Learn about ${CLINIC_NAME} — online prescription guidance, confirmed home-visit requests, and eyewear support.`,
  alternates: { canonical: `${SITE_URL}/about` }
};

export default function AboutPage() {
  return <><SiteHeader /><main>
    <section className="relative isolate overflow-hidden bg-ink text-white"><div className="absolute inset-0 -z-10 bg-[linear-gradient(135deg,rgba(5,9,19,.95),rgba(21,80,184,.4))]" /><div className="vv-container py-24 md:py-32"><p className="mb-4 text-xs font-extrabold uppercase text-cyan-300">About Vision Vistara</p><h1 className="max-w-3xl text-4xl font-extrabold leading-tight md:text-6xl">Prescription eyewear guidance for Hyderabad, made practical.</h1><p className="mt-6 max-w-2xl text-lg text-slate-300">Vision Vistara provides optometrist-guided prescription support, local frame fitting, and route-confirmed home trials in {LOCAL_SERVICE_AREA_LABEL}. We do not operate a walk-in showroom.</p></div></section>
    <section className="vv-section bg-white" id="doctor"><div className="vv-container grid gap-12 lg:grid-cols-[320px_1fr]"><div className="relative"><Image src="/assets/siddagoni-saidulu-doctor.jpeg" width={320} height={400} alt="Optometrist Siddagoni Saidulu" className="rounded-vv object-cover object-[center_28%] shadow-soft" /></div><div><SectionHeading kicker="Lead optometrist" title="Siddagoni Saidulu, DOA"><p>Vision Vistara combines professional optical guidance with a practical online and home-visit service. Every prescription-related order is reviewed before lens processing.</p></SectionHeading><div className="mt-8 grid gap-4 sm:grid-cols-2">{[[ShieldCheck, "Prescription review before processing"], [Heart, "Patient-first guidance"], [UserCheck, "Confirmed home-visit requests"], [CalendarCheck, "Referral when specialist equipment is needed"]].map(([Icon, text]) => { const ItemIcon = Icon as typeof ShieldCheck; return <div key={text as string} className="flex items-start gap-3 rounded-vv border border-slate-200 p-4"><ItemIcon className="mt-0.5 h-5 w-5 shrink-0 text-clinic" /><span className="text-sm font-bold text-slate-700">{text as string}</span></div>; })}</div></div></div></section>
    <section className="vv-section bg-paper"><div className="vv-container"><SectionHeading kicker="How we work" title="A simple online-to-home-visit experience." /><div className="grid gap-6 md:grid-cols-3">{[["Choose online", "Browse frames, compare options, and use virtual try-on from home."], ["Request support", "Ask for online guidance or a home visit. Pincode, stock, and capacity are confirmed before booking."], ["Complete with confidence", "Upload a prescription or enter it manually; staff review it before prescription lenses are processed."]].map(([title, body]) => <article key={title} className="vv-card p-8"><h2 className="text-xl font-extrabold">{title}</h2><p className="mt-3 text-slate-600">{body}</p></article>)}</div></div></section>
    <section className="store-band"><div className="vv-container grid items-center gap-6 py-12 md:grid-cols-[1fr_auto_auto]"><div><h2 className="text-2xl font-extrabold">Need help choosing frames or lenses?</h2><p className="mt-2 text-slate-600">Start online, request a confirmed home visit, or browse the frames store.</p></div><Link className="vv-button-primary" href="/appointments"><CalendarCheck className="h-5 w-5" />Request Guidance</Link><a className="vv-button bg-emerald-400 text-ink" href={`https://wa.me/91${CLINIC_PHONE}?text=Hello%20Vision%20Vistara%2C%20I%20need%20online%20guidance%20or%20a%20home%20visit.`} target="_blank" rel="noopener"><MessageCircle className="h-5 w-5" />WhatsApp Us</a></div></section>
  </main></>;
}
