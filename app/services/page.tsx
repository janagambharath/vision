import type { Metadata } from "next";
import Link from "next/link";
import { CalendarCheck, Eye, Glasses, Heart, MessageCircle, ShieldCheck, Stethoscope } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { SectionHeading } from "@/components/section-heading";
import { SiteHeader } from "@/components/site-header";
import { CLINIC_PHONE, SITE_URL } from "@/lib/constants";
import { LOCAL_SERVICE_AREA_LABEL } from "@/lib/local-service";

export const metadata: Metadata = {
  title: "Online & Home Visit Eye Care",
  description: "Vision Vistara provides online prescription guidance, scheduled home-visit requests, frame fitting, lens support, and referral coordination.",
  alternates: { canonical: `${SITE_URL}/services` }
};

const services: Array<{ icon: LucideIcon; title: string; description: string; details: string[] }> = [
  {
    icon: Stethoscope,
    title: "Online eye-care guidance",
    description: "Share your concern, existing prescription, and vision history for practical next-step guidance before you buy eyewear or seek in-person care.",
    details: ["WhatsApp and phone support", "Prescription explanation", "Clear next-step guidance", "Referral when needed"]
  },
  {
    icon: Glasses,
    title: "Scheduled home frame fitting",
    description: "Choose eligible frames online and request a route-confirmed home visit in our select Hyderabad service zone. Every request is confirmed before a visit is booked.",
    details: ["Select up to five eligible frames", "Route and stock confirmation", "Preferred time window", "No walk-in location required"]
  },
  {
    icon: Eye,
    title: "Prescription and lens guidance",
    description: "Get help matching your existing prescription, lifestyle, frame choice, and lens options. Prescription orders are reviewed before lens processing.",
    details: ["Upload or enter prescription", "Lens package explanation", "Frame compatibility check", "Staff review before processing"]
  },
  {
    icon: Heart,
    title: "Kids eyewear support",
    description: "Get frame-selection help for children. A valid doctor prescription is required before we process prescription eyewear for a child.",
    details: ["Child-friendly frame selection", "Prescription-required safeguard", "Home-trial request where eligible", "Parent support on WhatsApp"]
  },
  {
    icon: ShieldCheck,
    title: "Diagnostic and specialist referral",
    description: "Advanced eye tests and procedures need specialist equipment. We can guide the next step and coordinate a referral; they are not promised during an online consultation or home visit.",
    details: ["Referral guidance", "Existing report review", "Treatment-pathway explanation", "No at-home equipment claims"]
  }
];

export default function ServicesPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <section className="relative isolate overflow-hidden bg-ink text-white">
          <div className="absolute inset-0 -z-10 bg-[linear-gradient(135deg,rgba(5,9,19,.95),rgba(21,80,184,.35))]" />
          <div className="vv-container py-24 md:py-32">
            <p className="mb-4 text-xs font-extrabold uppercase text-cyan-300">Online and home-visit care</p>
            <h1 className="max-w-3xl text-4xl font-extrabold leading-tight md:text-6xl">Eye-care guidance and eyewear support, without a walk-in location.</h1>
            <p className="mt-6 max-w-2xl text-lg text-slate-300">Start online, request a scheduled home visit in {LOCAL_SERVICE_AREA_LABEL}, and get a clear referral when specialist equipment or treatment is needed.</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link className="vv-button-primary" href="/appointments"><CalendarCheck className="h-5 w-5" />Request guidance</Link>
              <a className="vv-button bg-emerald-400 text-ink" href={`https://wa.me/91${CLINIC_PHONE}?text=Hello%20Vision%20Vistara%2C%20I%20need%20online%20guidance%20or%20a%20home%20visit.`} target="_blank" rel="noopener"><MessageCircle className="h-5 w-5" />WhatsApp Us</a>
            </div>
          </div>
        </section>

        <section className="vv-section bg-paper">
          <div className="vv-container">
            <SectionHeading kicker="How we help" title="Simple online support with confirmed home visits." />
            <div className="grid gap-6 md:grid-cols-2">
              {services.map((service) => {
                const Icon = service.icon;
                return <article key={service.title} className="vv-card overflow-hidden"><div className="border-b border-slate-100 p-6"><Icon className="h-12 w-12 rounded-vv bg-blue-50 p-3 text-clinic" /><h2 className="mt-5 text-xl font-extrabold">{service.title}</h2><p className="mt-3 text-slate-600">{service.description}</p></div><ul className="grid gap-2 bg-slate-50 p-6">{service.details.map((detail) => <li key={detail} className="flex items-center gap-2 text-sm text-slate-700"><span className="h-1.5 w-1.5 rounded-full bg-clinic" />{detail}</li>)}</ul></article>;
              })}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
