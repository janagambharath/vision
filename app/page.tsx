import Image from "next/image";
import Link from "next/link";
import {
  Activity,
  ArrowRight,
  BadgeCheck,
  CalendarCheck,
  ChevronDown,
  ClipboardCheck,
  Eye,
  FileCheck2,
  Glasses,
  Heart,
  Home,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  ScanLine,
  ShieldCheck,
  Sparkles,
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
import { serializeJsonLd } from "@/lib/json-ld";
import { headers } from "next/headers";
import { getClientIp, rateLimit } from "@/lib/rate-limit";
import { leadSchema } from "@/lib/validations";
import { LOCAL_HOME_TRIAL_PROMISE, LOCAL_SERVICE_AREA_LABEL } from "@/lib/local-service";

export const dynamic = "force-dynamic";

export default function ClinicHomePage() {
  const schema = {
    "@context": "https://schema.org",
    "@type": "MedicalOrganization",
    name: CLINIC_NAME,
    url: SITE_URL,
    areaServed: { "@type": "City", name: "Hyderabad, Telangana" },
    telephone: `+91 ${CLINIC_PHONE}`,
    image: `${SITE_URL}/assets/vision-vistara-hero.png`,
    medicalSpecialty: ["Optometry", "Ophthalmology"],
    contactPoint: {
      "@type": "ContactPoint",
      telephone: `+91 ${CLINIC_PHONE}`,
      contactType: "customer service",
      availableLanguage: ["en", "te"]
    },
  };

  /* Server action for appointment booking */
  async function bookAppointment(formData: FormData) {
    "use server";

    const headersList = await headers();
    const ip = getClientIp(headersList);
    const { allowed } = await rateLimit(`appointment:${ip}`, 5, 3600);
    
    if (!allowed) {
      return { error: "Too many appointment requests. Please try again later or call the clinic." };
    }

    const name = String(formData.get("name") ?? "").trim();
    const phone = String(formData.get("phone") ?? "").trim();
    const service = String(formData.get("service") ?? "").trim();
    const preferredDate = String(formData.get("preferredDate") ?? "").trim();
    const timeSlot = String(formData.get("timeSlot") ?? "").trim();
    const notes = String(formData.get("notes") ?? "").trim();

    const data = {
      name,
      phone,
      source: "appointment_form",
      intent: service,
      payload: {
        preferredDate,
        timeSlot,
        notes: notes || undefined,
      }
    };
    
    const result = leadSchema.safeParse(data);
    if (!result.success) {
      return { error: "Invalid form data. Please check your inputs and try again." };
    }

    try {
      await prisma.lead.create({
        data: {
          name: result.data.name,
          phone: result.data.phone,
          source: result.data.source,
          intent: result.data.intent,
          email: result.data.email,
          payload: result.data.payload as any,
          status: "NEW",
        }
      });
    } catch (err) {
      console.error("Appointment booking failed:", err);
      return { error: "Failed to book appointment. Please call us directly." };
    }
  }

  return (
    <>
      <SiteHeader />
      <main className="clinic-page overflow-hidden">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: serializeJsonLd(schema) }}
        />

        {/* ───────────── HERO ───────────── */}
        <section className="home-store-intro relative overflow-hidden text-white">
          <div className="vv-container grid gap-5 pb-4 pt-5 sm:pb-5 sm:pt-8 lg:grid-cols-[1.35fr_.65fr] lg:gap-7">
            <Link
              href="/frames"
              className="group relative isolate min-h-[300px] overflow-hidden rounded-[1.75rem] border border-white/15 shadow-2xl shadow-slate-950/25 sm:min-h-[360px]"
            >
              <Image
                src="/assets/frames-shop-cta.png"
                alt="Browse Vision Vistara frames collection"
                fill
                priority
                sizes="(max-width: 1024px) 100vw, 65vw"
                className="-z-20 object-cover transition duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 -z-10 bg-gradient-to-r from-slate-950 via-slate-950/75 to-slate-900/15" />
              <div className="flex h-full max-w-xl flex-col justify-end p-6 sm:p-9">
                <p className="text-[10px] font-extrabold uppercase tracking-[0.22em] text-cyan-200 sm:text-xs">Frames Store</p>
                <h2 className="mt-3 text-3xl font-extrabold leading-tight sm:text-5xl">Find the frame that feels like you.</h2>
                <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-200 sm:text-base">
                  Shop curated frames with prescription guidance and delivery in select Hyderabad neighbourhoods.
                </p>
                <span className="vv-button-retail mt-6 w-fit group-hover:shadow-[0_14px_28px_-8px_rgba(13,148,136,0.6)]">
                  <Glasses className="h-5 w-5" />
                  Shop frames
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              </div>
            </Link>

            <Link
              href="/frames/try-at-home"
              className="group relative isolate flex min-h-[300px] overflow-hidden rounded-[1.75rem] border border-blue-100 bg-gradient-to-br from-blue-100 via-white to-cyan-50 p-6 text-slate-900 shadow-xl shadow-blue-950/10 transition hover:-translate-y-1 hover:shadow-2xl hover:shadow-blue-950/15 sm:min-h-[360px] sm:p-7"
            >
              <div className="pointer-events-none absolute inset-y-0 right-0 z-0 w-[48%] overflow-hidden">
                <div className="absolute inset-y-0 left-0 z-10 w-1/2 bg-gradient-to-r from-blue-50 via-blue-50/75 to-transparent" />
                <Image
                  src="/assets/try-at-home.jpeg"
                  alt="Try at Home service"
                  fill
                  sizes="(max-width: 1024px) 46vw, 20vw"
                  className="object-contain mix-blend-multiply opacity-90 transition duration-700 group-hover:scale-105"
                />
              </div>
              <div className="relative z-10 flex max-w-[61%] flex-col justify-center">
                <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-blue-600 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wider text-white shadow-sm shadow-blue-600/30">
                  <Home className="h-3.5 w-3.5" />
                  Try at home
                </span>
                <h2 className="mt-3 text-xl font-extrabold leading-tight sm:text-2xl">Try optical frames from your sofa.</h2>
                <p className="mt-2 text-xs leading-relaxed text-slate-600 sm:text-sm">Available in {LOCAL_SERVICE_AREA_LABEL}. Review your selected frames, then let our team confirm the visit details.</p>
                <span className="mt-4 inline-flex w-fit items-center gap-2 rounded-full bg-blue-700 px-4 py-2 text-xs font-extrabold text-white shadow-lg shadow-blue-700/20 sm:text-sm">
                  Start a home trial <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                </span>
              </div>
            </Link>
          </div>
        </section>

        <section className="home-store-intro relative overflow-hidden pb-10 pt-0 sm:pb-14 sm:pt-0" id="lasik-evaluation">
          <div className="vv-container">
            <div className="grid overflow-hidden rounded-[2rem] border border-white/15 bg-gradient-to-br from-white via-blue-50 to-cyan-50 shadow-2xl shadow-slate-950/25 lg:grid-cols-[.9fr_1.1fr]">
              <div className="relative min-h-[240px] border-b border-blue-100 bg-white sm:min-h-[310px] lg:min-h-full lg:border-b-0 lg:border-r">
                <Image
                  src="/assets/lasik-evaluation-banner.jpeg"
                  alt="LASIK Evaluation: precise check, clear vision, better tomorrow"
                  fill
                  sizes="(max-width: 1024px) 100vw, 45vw"
                  className="object-contain p-4 sm:p-6"
                />
              </div>
              <div className="flex flex-col justify-center p-6 sm:p-10 lg:p-12">
                <p className="text-xs font-extrabold uppercase tracking-[0.2em] text-blue-700">LASIK evaluation</p>
                <h2 className="mt-3 text-3xl font-extrabold leading-tight text-slate-950 sm:text-4xl">
                  Start with a precise check for clearer vision.
                </h2>
                <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-600 sm:text-base">
                  A doctor-led LASIK evaluation helps us understand your eye health, prescription, and whether laser vision correction is suitable for you.
                </p>
                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                  <Link className="vv-button-primary w-full sm:w-fit" href="#appointment">
                    <CalendarCheck className="h-5 w-5" />
                    Book LASIK Evaluation
                  </Link>
                  <Link className="vv-button-light w-full sm:w-fit" href="#services">
                    Learn about laser care
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="clinic-hero relative isolate overflow-hidden text-slate-950">
          <div className="absolute -right-32 -top-32 h-[28rem] w-[28rem] rounded-full border border-blue-200/70" />
          <div className="absolute right-8 top-16 h-72 w-72 rounded-full border border-sky-200/80 sm:right-[18%]" />
          <div className="absolute -bottom-32 left-[30%] h-[28rem] w-[28rem] rounded-full bg-cyan-200/30 blur-3xl" />

          <div className="vv-container relative flex min-h-[620px] flex-col justify-center py-16 sm:min-h-[650px] sm:py-20 md:min-h-[calc(100svh-80px)] md:py-28">
            <FadeIn className="max-w-3xl">
              <p className="mb-4 text-[10px] sm:text-xs font-extrabold uppercase tracking-[0.2em] text-blue-700">
                Vision Vistara Optics &amp; Lasers Eye Care
              </p>
              <h1 className="text-3xl sm:text-4xl md:text-6xl lg:text-7xl font-extrabold leading-[1.08]">
                Trusted eye care before every optical decision.
              </h1>
              <p className="mt-5 sm:mt-6 max-w-2xl text-base sm:text-lg text-slate-600 leading-relaxed">
                Consultation, prescription guidance, diagnostics, laser and
                cataract advice, and practical follow-up — from a calm,
                clinic-first experience.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row flex-wrap gap-3">
                <Link className="vv-button-primary" href="#appointment">
                  <CalendarCheck className="h-5 w-5" />
                  Book Appointment
                </Link>
                <Link className="vv-button-light" href="/frames">
                  <Glasses className="h-5 w-5" />
                  Visit Frames Store
                </Link>
                <Link className="vv-button border-blue-200 bg-white/75 text-blue-800 hover:bg-blue-50" href="/frames/try-at-home">
                  <Home className="h-5 w-5" />
                  Try at Home
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
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 animate-bounce opacity-50 hidden sm:block">
            <ChevronDown className="h-6 w-6 text-blue-700" />
          </div>
        </section>

        {/* ───────────── TRUST STRIP ───────────── */}
        <section className="clinic-trust relative z-10 border-b border-blue-100">
          <StaggerContainer className="vv-container grid grid-cols-2 gap-3 py-6 md:grid-cols-4 -mt-8 sm:-mt-10">
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
                className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white/90 backdrop-blur-md p-4 sm:p-5 shadow-lg shadow-blue-900/5 text-sm sm:text-base font-extrabold text-slate-800 transition-transform hover:-translate-y-1"
              >
                <Icon className="h-5 w-5 sm:h-6 sm:w-6 text-clinic shrink-0" />
                <span className="leading-tight">{label as string}</span>
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
              <div className="vv-card grid grid-cols-[80px_1fr] sm:grid-cols-[92px_1fr] items-center gap-4 p-4">
                <Image
                  src="/assets/siddagoni-saidulu-doctor.jpeg"
                  width={92}
                  height={112}
                  alt="Optometrist Siddagoni Saidulu"
                  className="h-24 sm:h-28 rounded-vv object-cover object-[center_28%]"
                />
                <div>
                  <strong className="block text-base sm:text-lg font-extrabold">
                    Siddagoni Saidulu, DOA
                  </strong>
                  <span className="font-extrabold text-clinic text-sm sm:text-base">
                    20 years experience
                  </span>
                  <p className="mt-1 text-xs sm:text-sm text-slate-600">
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
                <article key={String(title)} className="vv-card p-5 sm:p-6">
                  <Icon className="h-10 w-10 rounded-vv bg-blue-50 p-2 text-clinic" />
                  <h3 className="mt-4 sm:mt-5 text-base sm:text-lg font-extrabold">
                    {title as string}
                  </h3>
                  <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
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
              kicker="Online and home-visit support"
              title="Practical eyewear guidance before you buy."
            >
              <p>
                Start online, request a route-confirmed home visit in select Hyderabad neighbourhoods,
                and get a specialist referral when equipment or treatment is needed.
              </p>
            </SectionHeading>
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              {(
                [
                  [
                    Stethoscope,
                    "Online prescription guidance",
                    "Understand an existing prescription and the right next step before choosing eyewear.",
                  ],
                  [
                    Zap,
                    "Referral guidance",
                    "Get practical next steps for LASIK, cataract, retina, or glaucoma concerns that need specialist care.",
                  ],
                  [
                    Sparkles,
                    "Scheduled home visits",
                    "Home visits are requested online and confirmed only after pincode, stock, and team checks.",
                  ],
                  [
                    Activity,
                    "Report and prescription support",
                    "Share an existing report or prescription for clear eyewear guidance and referral next steps.",
                  ],
                  [
                    Glasses,
                    "Prescription lenses",
                    "Lens recommendations are matched to the prescription, usage, comfort, and budget.",
                  ],
                  [
                    Heart,
                    "Personalised follow-up",
                    "WhatsApp follow-up for prescription, order, and home-visit questions.",
                  ],
                ] satisfies Array<[LucideIcon, string, string]>
              ).map(([Icon, title, body]) => (
                <article key={String(title)} className="vv-card p-5 sm:p-6">
                  <Icon className="h-10 w-10 rounded-vv bg-blue-50 p-2 text-clinic" />
                  <h3 className="mt-4 sm:mt-5 text-base sm:text-lg font-extrabold">
                    {title as string}
                  </h3>
                  <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
                    {body as string}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ───────────── DIAGNOSTICS ───────────── */}
        <section className="vv-section bg-white" id="diagnostics">
          <div className="vv-container">
            <SectionHeading
              kicker="Diagnostic referrals"
              title="Clear guidance when specialist equipment is needed."
            >
              <p>
                Advanced imaging and diagnostic equipment are not promised
                online or during a home visit. We guide the next step and referral.
              </p>
            </SectionHeading>
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              {(
                [
                  [
                    ScanLine,
                    "OCT referral",
                    "Retina and optic-nerve imaging is arranged through an equipped specialist provider.",
                  ],
                  [
                    Activity,
                    "Visual-field referral",
                    "Functional vision mapping is referred when a specialist advises it.",
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
                <article key={String(title)} className="vv-card p-5 sm:p-6">
                  <Icon className="h-10 w-10 rounded-vv bg-blue-50 p-2 text-clinic" />
                  <h3 className="mt-4 sm:mt-5 text-base sm:text-lg font-extrabold">
                    {title as string}
                  </h3>
                  <p className="mt-2 text-xs sm:text-sm text-slate-600 leading-relaxed">
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
              kicker="How we support you"
              title="Clear next steps, without a showroom visit."
            />
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              {(
                [
                  [
                    Glasses,
                    "Browse and shortlist online",
                    "Explore clinic-verified frames, compare options, and add the ones you want to try or buy.",
                  ],
                  [
                    Home,
                    "Request a confirmed home visit",
                    `${LOCAL_HOME_TRIAL_PROMISE}. We confirm your selected frames, preferred time, route, and team availability first.`,
                  ],
                  [
                    BadgeCheck,
                    "Get the right next step",
                    "Receive practical prescription and lens guidance online, or a specialist referral when a test or treatment is needed.",
                  ],
                ] satisfies Array<[LucideIcon, string, string]>
              ).map(([Icon, title, body]) => (
                <article key={title} className="vv-card p-5 sm:p-6">
                  <Icon className="h-10 w-10 rounded-vv bg-blue-50 p-2 text-clinic" />
                  <h3 className="mt-4 text-base font-extrabold text-slate-900 sm:text-lg">
                    {title}
                  </h3>
                  <p className="mt-2 text-xs leading-relaxed text-slate-600 sm:text-sm">
                    {body}
                  </p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ───────────── FRAMES STORE CTA ───────────── */}
        <section className="hidden">
          <div className="vv-container">
            <SectionHeading
              kicker="Frames Store"
              title="Your prescription is ready? Explore our curated collection."
            >
              <p>
                The Vision Vistara frames store is a separate, product-first
                experience with a carefully verified local collection, try-at-home, and full checkout.
              </p>
            </SectionHeading>
            <Link
              href="/frames"
              className="group relative block overflow-hidden rounded-3xl shadow-soft hover:shadow-strong transition-all duration-500"
            >
              <div className="relative aspect-[21/9] sm:aspect-[3/1]">
                <Image
                  src="/assets/frames-shop-cta.png"
                  alt="Browse Vision Vistara frames collection"
                  fill
                  className="object-cover transition-transform duration-700 group-hover:scale-105"
                  sizes="(max-width: 768px) 100vw, 1200px"
                />
                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-r from-ink/80 via-ink/50 to-transparent" />
                {/* Content */}
                <div className="absolute inset-0 flex flex-col justify-center px-6 sm:px-10 md:px-14">
                  <p className="text-[10px] sm:text-xs font-extrabold uppercase tracking-[0.2em] text-teal-300">
                    Curated local collection
                  </p>
                  <h3 className="mt-2 text-2xl sm:text-3xl md:text-4xl font-extrabold text-white leading-tight max-w-lg">
                    Shop Frames Collection
                  </h3>
                  <p className="mt-2 text-xs sm:text-sm text-slate-300 max-w-md hidden sm:block">
                    Try at home · Virtual try-on · Full checkout · Order tracking
                  </p>
                  <div className="mt-4 sm:mt-6 inline-flex">
                    <span className="vv-button-retail group-hover:shadow-[0_12px_24px_-6px_rgba(15,118,110,0.5)]">
                      <Glasses className="h-5 w-5" />
                      Shop Now
                      <ArrowRight className="h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" />
                    </span>
                  </div>
                </div>
              </div>
            </Link>
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
            <div className="vv-card p-6 sm:p-8 max-w-3xl">
              <AppointmentForm action={bookAppointment} />
            </div>
          </div>
        </section>

        {/* ───────────── FAQ ───────────── */}
        <section className="vv-section bg-paper">
          <div className="vv-container grid gap-10 lg:grid-cols-[.8fr_1.2fr]">
            <SectionHeading
              kicker="FAQ"
              title="Common questions before an online consultation or home visit."
            >
              <p>
                The site keeps professional guidance central while sending
                product-heavy shopping flows to the dedicated store.
              </p>
            </SectionHeading>
            <div className="grid gap-3">
              {[
                [
                  "Can I request guidance before buying frames?",
                  `Yes. Start with online guidance, then select frames and lenses or request a home visit in ${LOCAL_SERVICE_AREA_LABEL}.`,
                ],
                [
                  "Where can I browse frames?",
                  "Frame browsing, product details, cart, checkout, try-at-home, and tracking are handled inside the /frames store.",
                ],
                [
                  "Does camera try-on replace a prescription check?",
                  "No. Try-on helps with appearance and preference. Prescription and lens guidance still need professional review.",
                ],
                [
                  "Can I contact Vision Vistara on WhatsApp?",
                  "Yes. Online guidance, home-visit requests, and follow-up questions can be sent to Vision Vistara on WhatsApp.",
                ],
                [
                  "What happens after my eye test?",
                  "You receive a clear next-step plan — prescription, lens recommendation, diagnostic test, or follow-up visit.",
                ],
              ].map(([question, answer]) => (
                <details key={question} className="vv-card group">
                  <summary className="cursor-pointer font-extrabold p-4 sm:p-5 flex items-center justify-between gap-3 text-sm sm:text-base">
                    {question}
                    <ChevronDown className="h-4 w-4 shrink-0 text-slate-400 transition-transform duration-300 group-open:rotate-180" />
                  </summary>
                  <p className="px-4 sm:px-5 pb-4 sm:pb-5 text-xs sm:text-sm text-slate-600 leading-relaxed -mt-1">
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
          <SectionHeading kicker="Contact" title="WhatsApp-first support and local home visits.">
            <p>
                Request online guidance or a home visit over the phone or through
                WhatsApp. {LOCAL_HOME_TRIAL_PROMISE}; service availability is confirmed by pincode and team capacity.
            </p>
            </SectionHeading>
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
              <a
                href={`tel:+91${CLINIC_PHONE}`}
                className="vv-card p-5 sm:p-6 flex items-start gap-4 hover:border-clinic"
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
                className="vv-card p-5 sm:p-6 flex items-start gap-4 hover:border-emerald-500"
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
                className="vv-card p-5 sm:p-6 flex items-start gap-4 hover:border-clinic"
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
      <footer className="bg-ink py-12 sm:py-16 text-slate-400">
        <div className="vv-container">
          <div className="grid gap-8 sm:grid-cols-2 md:grid-cols-4">
            <div>
              <Link href="/" className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-full bg-white shrink-0 overflow-hidden">
                  <Image
                    src="/assets/vision-vistara-eye-logo.png"
                    width={36}
                    height={36}
                    alt=""
                    className="scale-125"
                  />
                </span>
                <span className="text-lg font-extrabold text-white">
                  Vision Vistara
                </span>
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
              <div className="grid gap-2.5 text-sm">
                <a href={`tel:+91${CLINIC_PHONE}`} className="flex items-center gap-2 hover:text-white transition">
                  <Phone className="h-3.5 w-3.5 shrink-0" /> +91 {CLINIC_PHONE}
                </a>
                <a href={`https://wa.me/${CLINIC_WHATSAPP_NUMBER}`} target="_blank" rel="noopener" className="flex items-center gap-2 hover:text-white transition">
                  <MessageCircle className="h-3.5 w-3.5 shrink-0" /> WhatsApp
                </a>
                <a href="mailto:contact@visionvistara.online" className="flex items-center gap-2 hover:text-white transition">
                  <Mail className="h-3.5 w-3.5 shrink-0" /> Email Us
                </a>
                <span className="flex items-center gap-2">
                  <MapPin className="h-3.5 w-3.5 shrink-0" /> Hyderabad, Telangana
                </span>
              </div>
            </div>
          </div>
          <div className="mt-10 pt-6 border-t border-slate-800 flex flex-col sm:flex-row justify-between gap-3 text-xs">
            <p>© 2026 Vision Vistara Optics &amp; Lasers Eye Care. All rights reserved.</p>
            <div className="flex gap-4">
              <Link href="/privacy" className="hover:text-white transition">Privacy Policy</Link>
              <Link href="/return-policy" className="hover:text-white transition">Returns</Link>
              <Link href="/terms" className="hover:text-white transition">Terms</Link>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
