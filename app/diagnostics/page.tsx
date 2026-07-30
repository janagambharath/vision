import type { Metadata } from "next";
import Link from "next/link";
import { Activity, CalendarCheck, Eye, FileCheck2, MessageCircle, ScanLine } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { SectionHeading } from "@/components/section-heading";
import { SiteHeader } from "@/components/site-header";
import { CLINIC_PHONE, SITE_URL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Diagnostic Guidance & Referrals",
  description: "Vision Vistara provides online guidance and referral coordination for specialist eye diagnostics in Hyderabad.",
  alternates: { canonical: `${SITE_URL}/diagnostics` }
};

const pathways: Array<{ icon: LucideIcon; title: string; description: string }> = [
  { icon: ScanLine, title: "Retina and glaucoma tests", description: "OCT, visual-field, and eye-pressure testing require specialist equipment. We can help you understand when a referral is appropriate." },
  { icon: Eye, title: "Corneal and LASIK assessment", description: "LASIK suitability and corneal imaging must be performed at an equipped specialist centre; they are not an online or at-home test." },
  { icon: FileCheck2, title: "Cataract planning", description: "Biometry and surgical planning are completed by an equipped eye-care provider. We can help explain your reports and next steps." },
  { icon: Activity, title: "Existing report review", description: "Share an existing prescription or report for guidance on eyewear, questions to ask, and when urgent specialist care may be needed." }
];

export default function DiagnosticsPage() {
  return <><SiteHeader /><main><section className="relative isolate overflow-hidden bg-ink text-white"><div className="absolute inset-0 -z-10 bg-[linear-gradient(135deg,rgba(5,9,19,.95),rgba(21,80,184,.35))]" /><div className="vv-container py-24 md:py-32"><p className="mb-4 text-xs font-extrabold uppercase text-cyan-300">Diagnostic guidance</p><h1 className="max-w-3xl text-4xl font-extrabold leading-tight md:text-6xl">Know when specialist equipment and referral are needed.</h1><p className="mt-6 max-w-2xl text-lg text-slate-300">Vision Vistara does not claim to perform advanced imaging during online consultations or home visits. We provide guidance and referral coordination when appropriate.</p><div className="mt-8 flex flex-wrap gap-3"><Link className="vv-button-primary" href="/appointments"><CalendarCheck className="h-5 w-5" />Request guidance</Link><a className="vv-button bg-emerald-400 text-ink" href={`https://wa.me/91${CLINIC_PHONE}?text=Hello%20Vision%20Vistara%2C%20I%20need%20guidance%20on%20an%20eye%20test%20or%20report.`} target="_blank" rel="noopener"><MessageCircle className="h-5 w-5" />WhatsApp Us</a></div></div></section><section className="vv-section bg-paper"><div className="vv-container"><SectionHeading kicker="Referral pathways" title="Clear next steps without false at-home equipment claims." /><div className="grid gap-6 md:grid-cols-2">{pathways.map(({ icon: Icon, title, description }) => <article key={title} className="vv-card p-6"><Icon className="h-10 w-10 rounded-vv bg-blue-50 p-2 text-clinic" /><h2 className="mt-5 text-xl font-extrabold">{title}</h2><p className="mt-3 text-slate-600">{description}</p></article>)}</div></div></section></main></>;
}
