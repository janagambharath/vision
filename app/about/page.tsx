import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { Award, BadgeCheck, CalendarCheck, Eye, Heart, MessageCircle, ShieldCheck, Sparkles, UserCheck } from "lucide-react";
import { SectionHeading } from "@/components/section-heading";
import { SiteHeader } from "@/components/site-header";
import { CLINIC_NAME, CLINIC_PHONE, SITE_URL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "About",
  description: `Learn about ${CLINIC_NAME} — 20+ years of trusted eye care, diagnostics, laser guidance, and prescription support in Hyderabad.`,
  alternates: { canonical: `${SITE_URL}/about` }
};

export default function AboutPage() {
  return (
    <>
      <SiteHeader />
      <main>
        {/* Hero */}
        <section className="relative isolate overflow-hidden bg-ink text-white">
          <div className="absolute inset-0 -z-10 bg-[linear-gradient(135deg,rgba(5,9,19,.95),rgba(21,80,184,.4))]" />
          <div className="vv-container py-24 md:py-32">
            <p className="mb-4 text-xs font-extrabold uppercase text-cyan-300">About Vision Vistara</p>
            <h1 className="max-w-3xl text-4xl font-extrabold leading-tight md:text-6xl">
              20 years of patient-first eye care in Hyderabad.
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-slate-300">
              Vision Vistara Optics &amp; Lasers Eye Care was built on one principle: every patient deserves calm, clear guidance before any optical or treatment decision.
            </p>
          </div>
        </section>

        {/* Doctor Profile */}
        <section className="vv-section bg-white" id="doctor">
          <div className="vv-container grid gap-12 lg:grid-cols-[320px_1fr]">
            <div className="relative">
              <Image
                src="/assets/siddagoni-saidulu-doctor.jpeg"
                width={320}
                height={400}
                alt="Optometrist Siddagoni Saidulu"
                className="rounded-vv object-cover object-[center_28%] shadow-soft"
              />
              <div className="absolute -bottom-4 -right-4 rounded-vv border border-slate-200 bg-white p-4 shadow-soft">
                <Award className="h-8 w-8 text-clinic" />
                <p className="mt-2 text-sm font-extrabold">20+ Years Experience</p>
              </div>
            </div>
            <div>
              <SectionHeading kicker="Lead optometrist" title="Siddagoni Saidulu, DOA">
                <p>
                  With over two decades of experience in optometry, lasers, and patient-first eye care, Saidulu brings diagnostic precision and practical guidance to every consultation. His approach prioritises explanation and understanding over rushed decisions.
                </p>
              </SectionHeading>
              <div className="mt-8 grid gap-4 sm:grid-cols-2">
                {([
                  [Eye, "Comprehensive refraction and visual acuity assessment"],
                  [Sparkles, "LASIK and laser eye care suitability evaluation"],
                  [ShieldCheck, "Cataract lens planning and surgical readiness"],
                  [Heart, "Retina and glaucoma screening support"]
                ] as const).map(([Icon, text]) => (
                  <div key={text} className="flex items-start gap-3 rounded-vv border border-slate-200 p-4">
                    <Icon className="mt-0.5 h-5 w-5 shrink-0 text-clinic" />
                    <span className="text-sm font-bold text-slate-700">{text}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* Values */}
        <section className="vv-section bg-paper">
          <div className="vv-container">
            <SectionHeading kicker="Our values" title="What guides every patient interaction." />
            <div className="grid gap-6 md:grid-cols-3">
              {([
                [ShieldCheck, "Trust before transaction", "No frame or lens recommendation comes before understanding the patient's vision, lifestyle, and comfort needs."],
                [UserCheck, "Doctor-led guidance", "Every prescription, treatment suggestion, and optical recommendation is reviewed by the lead optometrist personally."],
                [BadgeCheck, "Transparent next steps", "Patients leave with a clear plan — whether it's a test, a follow-up, a prescription, or a frame fitting. No ambiguity."]
              ] as const).map(([Icon, title, body]) => (
                <article key={title} className="vv-card p-8">
                  <Icon className="h-12 w-12 rounded-vv bg-blue-50 p-3 text-clinic" />
                  <h3 className="mt-6 text-xl font-extrabold">{title}</h3>
                  <p className="mt-3 text-slate-600">{body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* Clinic Overview */}
        <section className="vv-section bg-white">
          <div className="vv-container grid gap-10 lg:grid-cols-2">
            <div>
              <SectionHeading kicker="The clinic" title="A calm, clinic-first experience in Hyderabad.">
                <p>
                  Vision Vistara is designed for patients who want to understand their eyes before making decisions. The clinic separates medical care from retail — the frames store lives at /frames, and the clinic stays focused on consultations, prescriptions, and diagnostics.
                </p>
              </SectionHeading>
              <div className="mt-6 grid gap-3">
                <Stat label="Years of experience" value="20+" />
                <Stat label="Patients guided" value="10,000+" />
                <Stat label="Diagnostic tests supported" value="6+" />
                <Stat label="Optical frames in store" value="200+" />
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {([
                ["Separate clinic and store", "Medical consultations stay on the main site. Shopping happens in the dedicated /frames store."],
                ["WhatsApp follow-up", "Appointment requests, prescription queries, and follow-up can continue easily via WhatsApp."],
                ["Home trial service", "Select up to 5 frames for a home trial before committing to a purchase."],
                ["Prescription processing", "Prescription lenses are custom-processed after the eye test and frame selection."]
              ]).map(([title, body]) => (
                <article key={title} className="rounded-vv border border-slate-200 bg-slate-50 p-5">
                  <h3 className="font-extrabold">{title}</h3>
                  <p className="mt-2 text-sm text-slate-600">{body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="store-band">
          <div className="vv-container grid items-center gap-6 py-12 md:grid-cols-[1fr_auto_auto]">
            <div>
              <h2 className="text-2xl font-extrabold">Ready to take the first step?</h2>
              <p className="mt-2 text-slate-600">Book an eye test, ask a question, or visit the frames store.</p>
            </div>
            <Link className="vv-button-primary" href="/appointments">
              <CalendarCheck className="h-5 w-5" />
              Book Appointment
            </Link>
            <a className="vv-button bg-emerald-400 text-ink" href={`https://wa.me/91${CLINIC_PHONE}?text=Hello%20Vision%20Vistara%2C%20I'd%20like%20to%20know%20more%20about%20the%20clinic.`} target="_blank" rel="noopener">
              <MessageCircle className="h-5 w-5" />
              WhatsApp Us
            </a>
          </div>
        </section>
      </main>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
      <span className="text-sm font-bold text-slate-600">{label}</span>
      <strong className="text-xl font-extrabold text-clinic">{value}</strong>
    </div>
  );
}
