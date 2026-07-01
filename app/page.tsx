import Image from "next/image";
import Link from "next/link";
import {
  Activity,
  BadgeCheck,
  CalendarCheck,
  ChevronDown,
  ClipboardCheck,
  Eye,
  FileCheck2,
  Glasses,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  ScanLine,
  ShieldCheck,
  Sparkles,
  Star,
  Stethoscope,
  Store,
  UserCheck,
  Zap,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { SectionHeading } from "@/components/section-heading";
import { SiteHeader } from "@/components/site-header";
import { FadeIn, StaggerContainer, StaggerItem } from "@/components/fade-in";
import { AppointmentForm } from "@/components/appointment-form";
import { CLINIC_NAME, CLINIC_PHONE, CLINIC_WHATSAPP_NUMBER, SITE_URL } from "@/lib/constants";
import { prisma } from "@/lib/db";

export default function ClinicHomePage() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "MedicalClinic",
    name: CLINIC_NAME,
    url: SITE_URL,
    telephone: `+91 ${CLINIC_PHONE}`,
    image: `${SITE_URL}/assets/vision-vistara-hero.png`,
    medicalSpecialty: ["Optometry", "Ophthalmology"],
    areaServed: "Hyderabad",
    address: {
      "@type": "PostalAddress",
      addressLocality: "Hyderabad",
      addressRegion: "Telangana",
      addressCountry: "IN",
    },
  };

  /* Server action for appointment booking */
  async function bookAppointment(formData: FormData) {
    "use server";

    const name = String(formData.get("name") ?? "").trim();
    const phone = String(formData.get("phone") ?? "").trim();
    const service = String(formData.get("service") ?? "").trim();
    const preferredDate = String(formData.get("preferredDate") ?? "").trim();
    const timeSlot = String(formData.get("timeSlot") ?? "").trim();
    const notes = String(formData.get("notes") ?? "").trim();

    if (!name || !phone || !service || !preferredDate || !timeSlot) return;

    try {
      await prisma.lead.create({
        data: {
          name,
          phone,
          source: "appointment_form",
          status: "NEW",
          intent: service,
          payload: {
            preferredDate,
            timeSlot,
            notes: notes || undefined,
          },
        },
      });
    } catch (err) {
      console.error("Appointment booking failed:", err);
    }
  }

  return (
    <>
      <SiteHeader />
      <main>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
        />

        {/* ───────────── HERO ───────────── */}
        <section className="relative isolate overflow-hidden bg-ink text-white">
          <Image
            src="/assets/vision-vistara-hero.png"
            alt=""
            fill
            priority
            sizes="100vw"
            className="absolute inset-0 -z-20 object-cover"
          />
          <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[rgba(4,11,22,0.97)] via-[rgba(4,11,22,0.88)] to-[rgba(15,35,60,0.35)]" />
          <div className="vv-container min-h-[calc(100svh-80px)] py-24 md:py-32 flex flex-col justify-center relative">
            <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-hero-glow rounded-full blur-3xl opacity-30 -z-10 pointer-events-none" />
            <FadeIn className="max-w-3xl">
              <p className="mb-4 text-xs font-extrabold uppercase tracking-widest text-cyan-300">
                Vision Vistara Optics &amp; Lasers Eye Care
              </p>
              <h1 className="text-4xl font-extrabold leading-[1.08] md:text-6xl lg:text-7xl">
                Trusted eye care before every optical decision.
              </h1>
              <p className="mt-6 max-w-2xl text-lg text-slate-300 leading-relaxed">
                Consultation, prescription guidance, diagnostics, laser and
                cataract advice, and practical follow-up — from a calm,
                clinic-first experience.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link className="vv-button-primary" href="#appointment">
                  <CalendarCheck className="h-5 w-5" />
                  Book Appointment
                </Link>
                <Link className="vv-button-light" href="/frames">
                  <Glasses className="h-5 w-5" />
                  Visit Frames Store
                </Link>
                <a
                  className="vv-button bg-emerald-400 text-ink border-emerald-400 hover:bg-emerald-300"
                  href={`https://wa.me/${CLINIC_WHATSAPP_NUMBER}?text=${encodeURIComponent("Hello Vision Vistara, I would like to book an eye care appointment.")}`}
                  target="_blank"
                  rel="noopener"
                >
                  <MessageCircle className="h-5 w-5" />
                  WhatsApp Us
                </a>
              </div>
            </FadeIn>
          </div>
          {/* Scroll indicator */}
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 animate-bounce opacity-40">
            <ChevronDown className="h-6 w-6 text-white" />
          </div>
        </section>

        {/* ───────────── TRUST STRIP ───────────── */}
        <section className="border-b border-slate-100 bg-white/70 backdrop-blur-lg relative z-10">
          <StaggerContainer className="vv-container grid gap-3 py-6 md:grid-cols-4 -mt-10">
            {(
              [
                [BadgeCheck, "20+ years of eye care"],
                [UserCheck, "Doctor-led guidance"],
                [ScanLine, "Advanced diagnostics"],
                [Store, "Dedicated frames store"],
              ] satisfies Array<[LucideIcon, string]>
            ).map(([Icon, label]) => (
              <StaggerItem
                key={String(label)}
                className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white/90 backdrop-blur-md p-5 shadow-lg shadow-blue-900/5 font-extrabold text-slate-800 transition-transform hover:-translate-y-1"
              >
                <Icon className="h-6 w-6 text-clinic shrink-0" />
                {label as string}
              </StaggerItem>
            ))}
          </StaggerContainer>
        </section>

        {/* ───────────── ABOUT / DOCTOR ───────────── */}
        <section className="vv-section bg-white" id="about">
          <div className="vv-container grid gap-12 lg:grid-cols-[.9fr_1.1fr]">
            <div>
              <SectionHeading
                kicker="About the clinic"
                title="Medical credibility first, optical choice second."
              >
                <p>
                  Vision Vistara helps patients understand their vision needs
                  before choosing frames, lenses, diagnostics, or treatment. The
                  clinic experience stays focused on trust, consultation, and
                  personalised guidance.
                </p>
              </SectionHeading>
              <div className="vv-card grid grid-cols-[92px_1fr] items-center gap-4 p-4">
                <Image
                  src="/assets/siddagoni-saidulu-doctor.jpeg"
                  width={92}
                  height={112}
                  alt="Optometrist Siddagoni Saidulu"
                  className="h-28 rounded-vv object-cover object-[center_28%]"
                />
                <div>
                  <strong className="block text-lg font-extrabold">
                    Siddagoni Saidulu, DOA
                  </strong>
                  <span className="font-extrabold text-clinic">
                    20 years experience
                  </span>
                  <p className="mt-1 text-sm text-slate-600">
                    Expert in eye lasers and patient-first optical guidance.
                  </p>
                </div>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {(
                [
                  [
                    ShieldCheck,
                    "Trust-first guidance",
                    "Recommendations are explained clearly before treatment, lens, or frame decisions.",
                  ],
                  [
                    Eye,
                    "Clinical clarity",
                    "Eye checks and diagnostics support the right prescription and treatment path.",
                  ],
                  [
                    ClipboardCheck,
                    "Practical next steps",
                    "Patients leave with a simple plan for prescription, tests, follow-up, or optical purchase.",
                  ],
                  [
                    MessageCircle,
                    "Easy follow-up",
                    "Appointment, report, and optical queries can continue on phone or WhatsApp.",
                  ],
                ] satisfies Array<[LucideIcon, string, string]>
              ).map(([Icon, title, body]) => (
                <article key={String(title)} className="vv-card p-6">
                  <Icon className="h-10 w-10 rounded-vv bg-blue-50 p-2 text-clinic" />
                  <h3 className="mt-5 text-lg font-extrabold">
                    {title as string}
                  </h3>
                  <p className="mt-2 text-sm text-slate-600">
                    {body as string}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ───────────── SERVICES ───────────── */}
        <section className="vv-section bg-paper" id="services">
          <div className="vv-container">
            <SectionHeading
              kicker="Services and treatments"
              title="Complete eye care with practical optical support."
            >
              <p>
                Keep the clinic visit focused: check the eyes, understand the
                prescription, choose the right lenses, and plan treatment only
                when needed.
              </p>
            </SectionHeading>
            <div className="grid gap-4 md:grid-cols-3">
              {(
                [
                  [
                    Stethoscope,
                    "Comprehensive eye test",
                    "Refraction, visual clarity checks, and consultation for everyday comfort.",
                  ],
                  [
                    Zap,
                    "Laser eye care guidance",
                    "LASIK and laser suitability discussions with clear eligibility next steps.",
                  ],
                  [
                    Sparkles,
                    "Cataract consultation",
                    "Assessment support and guidance for lens planning and surgical referral needs.",
                  ],
                  [
                    Activity,
                    "Retina and glaucoma care",
                    "Screening-oriented guidance supported by diagnostics when clinically required.",
                  ],
                  [
                    Glasses,
                    "Prescription lenses",
                    "Lens recommendations are matched to the prescription, usage, comfort, and budget.",
                  ],
                  [
                    Store,
                    "Frames store handoff",
                    "Shopping, try-at-home, cart, checkout, and order tracking live in the dedicated store.",
                  ],
                ] satisfies Array<[LucideIcon, string, string]>
              ).map(([Icon, title, body]) => (
                <article key={String(title)} className="vv-card p-6">
                  <Icon className="h-10 w-10 rounded-vv bg-blue-50 p-2 text-clinic" />
                  <h3 className="mt-5 text-lg font-extrabold">
                    {title as string}
                  </h3>
                  <p className="mt-2 text-sm text-slate-600">
                    {body as string}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ───────────── FRAMES STORE CTA ───────────── */}
        <section className="store-band">
          <div className="vv-container grid items-center gap-6 py-12 md:grid-cols-[1fr_auto]">
            <div>
              <p className="vv-kicker">Frames are separate</p>
              <h2 className="text-3xl font-extrabold">
                Shop eyewear inside the dedicated Vision Vistara frames store.
              </h2>
              <p className="mt-3 max-w-2xl text-slate-600">
                Browse frame details, lens options, checkout, try-at-home, and
                tracking inside /frames. The main clinic page stays medically
                credible and appointment-led.
              </p>
            </div>
            <Link className="vv-button-retail" href="/frames">
              <Store className="h-5 w-5" />
              Visit Frames Store
            </Link>
          </div>
        </section>

        {/* ───────────── DIAGNOSTICS ───────────── */}
        <section className="vv-section bg-white" id="diagnostics">
          <div className="vv-container">
            <SectionHeading
              kicker="Diagnostics"
              title="Advanced testing support for confident treatment planning."
            >
              <p>
                Diagnostic recommendations are based on the patient&apos;s
                concern, eye condition, and treatment pathway.
              </p>
            </SectionHeading>
            <div className="grid gap-4 md:grid-cols-3">
              {(
                [
                  [
                    ScanLine,
                    "OCT",
                    "Retina and optic nerve imaging support for detailed evaluation.",
                  ],
                  [
                    Activity,
                    "Visual fields",
                    "Functional vision mapping for glaucoma and optic nerve monitoring.",
                  ],
                  [
                    FileCheck2,
                    "AL / IOL scan",
                    "Biometry support for cataract lens planning and surgical readiness.",
                  ],
                  [
                    Eye,
                    "Pentacam",
                    "Corneal analysis support for refractive and laser suitability checks.",
                  ],
                  [
                    ScanLine,
                    "Orbscan",
                    "Corneal mapping support for advanced eye care decisions.",
                  ],
                  [
                    ClipboardCheck,
                    "Report guidance",
                    "Clear next steps after tests so patients understand what happens next.",
                  ],
                ] satisfies Array<[LucideIcon, string, string]>
              ).map(([Icon, title, body]) => (
                <article key={String(title)} className="vv-card p-6">
                  <Icon className="h-10 w-10 rounded-vv bg-blue-50 p-2 text-clinic" />
                  <h3 className="mt-5 text-lg font-extrabold">
                    {title as string}
                  </h3>
                  <p className="mt-2 text-sm text-slate-600">
                    {body as string}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ───────────── TESTIMONIALS ───────────── */}
        <section className="vv-section bg-paper">
          <div className="vv-container">
            <SectionHeading
              kicker="Patient experiences"
              title="Calm guidance, clear explanations, and useful follow-up."
            />
            <div className="grid gap-4 md:grid-cols-3">
              {[
                {
                  quote:
                    "The clinic explained my prescription clearly and helped me understand which lens options made sense for my daily screen work.",
                  name: "Rahul M.",
                  role: "Optical patient",
                  rating: 5,
                },
                {
                  quote:
                    "The consultation was patient and clear. I knew which diagnostic test was needed and why before it was done.",
                  name: "Priya S.",
                  role: "Diagnostics patient",
                  rating: 5,
                },
                {
                  quote:
                    "WhatsApp booking made follow-up simple, and the frame store made choosing glasses easy after my eye test.",
                  name: "Anil K.",
                  role: "Frame customer",
                  rating: 4,
                },
              ].map(({ quote, name, role, rating }) => (
                <article key={name} className="vv-card p-6">
                  <div className="flex gap-0.5 mb-3">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`h-4 w-4 ${
                          i < rating
                            ? "text-amber-400 fill-amber-400"
                            : "text-slate-200"
                        }`}
                      />
                    ))}
                  </div>
                  <p className="text-slate-700 italic leading-relaxed">
                    &ldquo;{quote}&rdquo;
                  </p>
                  <div className="mt-5 border-t border-slate-100 pt-3">
                    <strong className="block text-sm font-extrabold text-slate-800">
                      {name}
                    </strong>
                    <span className="text-xs text-clinic font-bold">
                      {role}
                    </span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ───────────── APPOINTMENT BOOKING ───────────── */}
        <section className="vv-section bg-white" id="appointment">
          <div className="vv-container">
            <SectionHeading
              kicker="Book an appointment"
              title="Schedule your eye care visit."
            >
              <p>
                Fill in the form below and our team will confirm your appointment
                within 24 hours. Same-day slots available on request.
              </p>
            </SectionHeading>
            <div className="vv-card p-8 max-w-3xl">
              <AppointmentForm action={bookAppointment} />
            </div>
          </div>
        </section>

        {/* ───────────── FAQ ───────────── */}
        <section className="vv-section bg-paper">
          <div className="vv-container grid gap-10 lg:grid-cols-[.8fr_1.2fr]">
            <SectionHeading
              kicker="FAQ"
              title="Common questions before a clinic visit."
            >
              <p>
                The site keeps medical care central while sending product-heavy
                shopping flows to the dedicated store.
              </p>
            </SectionHeading>
            <div className="grid gap-3">
              {[
                [
                  "Can I book an eye test before buying frames?",
                  "Yes. The appointment flow is consultation-first, then lens and frame selection if needed.",
                ],
                [
                  "Where can I browse frames?",
                  "Frame browsing, product details, cart, checkout, try-at-home, and tracking are handled inside the /frames store.",
                ],
                [
                  "Does camera try-on replace a prescription check?",
                  "No. Try-on helps with appearance and preference. Prescription and lens guidance should still come from the clinic.",
                ],
                [
                  "Can I contact the clinic on WhatsApp?",
                  "Yes. Appointment requests and follow-up questions can be sent to Vision Vistara on WhatsApp.",
                ],
                [
                  "What happens after my eye test?",
                  "You receive a clear next-step plan — prescription, lens recommendation, diagnostic test, or follow-up visit.",
                ],
              ].map(([question, answer]) => (
                <details key={question} className="vv-card group">
                  <summary className="cursor-pointer font-extrabold p-5 flex items-center justify-between gap-3 list-none [&::-webkit-details-marker]:hidden">
                    {question}
                    <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition-transform duration-300 group-open:rotate-180" />
                  </summary>
                  <p className="px-5 pb-5 text-slate-600 leading-relaxed -mt-1">
                    {answer}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ───────────── CONTACT ───────────── */}
        <section className="vv-section bg-white" id="contact">
          <div className="vv-container">
            <SectionHeading kicker="Contact" title="Visit or reach out.">
              <p>
                Appointments can be made in person, over the phone, or through
                WhatsApp. Walk-ins are welcome when slots are available.
              </p>
            </SectionHeading>
            <div className="grid gap-4 md:grid-cols-3">
              <a
                href={`tel:+91${CLINIC_PHONE}`}
                className="vv-card p-6 flex items-start gap-4 hover:border-clinic"
              >
                <Phone className="h-8 w-8 rounded-vv bg-blue-50 p-2 text-clinic shrink-0" />
                <div>
                  <strong className="block font-extrabold text-slate-800">
                    Phone
                  </strong>
                  <span className="text-sm text-slate-600">
                    +91 {CLINIC_PHONE}
                  </span>
                </div>
              </a>
              <a
                href={`https://wa.me/${CLINIC_WHATSAPP_NUMBER}`}
                target="_blank"
                rel="noopener"
                className="vv-card p-6 flex items-start gap-4 hover:border-emerald-500"
              >
                <MessageCircle className="h-8 w-8 rounded-vv bg-emerald-50 p-2 text-emerald-600 shrink-0" />
                <div>
                  <strong className="block font-extrabold text-slate-800">
                    WhatsApp
                  </strong>
                  <span className="text-sm text-slate-600">
                    Chat with us anytime
                  </span>
                </div>
              </a>
              <a
                href="mailto:contact@visionvistara.online"
                className="vv-card p-6 flex items-start gap-4 hover:border-clinic"
              >
                <Mail className="h-8 w-8 rounded-vv bg-blue-50 p-2 text-clinic shrink-0" />
                <div>
                  <strong className="block font-extrabold text-slate-800">
                    Email
                  </strong>
                  <span className="text-sm text-slate-600">
                    contact@visionvistara.online
                  </span>
                </div>
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* ───────────── FOOTER ───────────── */}
      <footer className="bg-ink py-12 text-slate-400">
        <div className="vv-container">
          <div className="grid gap-8 md:grid-cols-4">
            <div>
              <Link href="/" className="text-xl font-extrabold text-white">
                Vision Vistara
              </Link>
              <p className="mt-3 text-sm leading-relaxed">
                Trusted eye care and optical guidance from a clinic-first experience in Hyderabad.
              </p>
            </div>
            <div>
              <h4 className="font-extrabold text-white text-sm mb-3">Clinic</h4>
              <nav className="grid gap-2 text-sm">
                <Link href="#about" className="hover:text-white transition">About</Link>
                <Link href="#services" className="hover:text-white transition">Services</Link>
                <Link href="#diagnostics" className="hover:text-white transition">Diagnostics</Link>
                <Link href="#appointment" className="hover:text-white transition">Book Appointment</Link>
              </nav>
            </div>
            <div>
              <h4 className="font-extrabold text-white text-sm mb-3">Frames Store</h4>
              <nav className="grid gap-2 text-sm">
                <Link href="/frames" className="hover:text-white transition">Browse Frames</Link>
                <Link href="/frames/try-on" className="hover:text-white transition">Virtual Try-On</Link>
                <Link href="/frames/try-at-home" className="hover:text-white transition">Try at Home</Link>
                <Link href="/frames/cart" className="hover:text-white transition">Cart</Link>
              </nav>
            </div>
            <div>
              <h4 className="font-extrabold text-white text-sm mb-3">Contact</h4>
              <div className="grid gap-2 text-sm">
                <a href={`tel:+91${CLINIC_PHONE}`} className="flex items-center gap-2 hover:text-white transition">
                  <Phone className="h-3.5 w-3.5" /> +91 {CLINIC_PHONE}
                </a>
                <a href={`https://wa.me/${CLINIC_WHATSAPP_NUMBER}`} target="_blank" rel="noopener" className="flex items-center gap-2 hover:text-white transition">
                  <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                </a>
                <a href="mailto:contact@visionvistara.online" className="flex items-center gap-2 hover:text-white transition">
                  <Mail className="h-3.5 w-3.5" /> Email Us
                </a>
                <span className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5" /> Hyderabad, Telangana
                </span>
              </div>
            </div>
          </div>
          <div className="mt-10 pt-6 border-t border-slate-800 flex flex-col md:flex-row justify-between gap-3 text-xs">
            <p>© 2026 Vision Vistara Optics &amp; Lasers Eye Care. All rights reserved.</p>
            <p>Phone: {CLINIC_PHONE} · Hyderabad, Telangana</p>
          </div>
        </div>
      </footer>
    </>
  );
}
