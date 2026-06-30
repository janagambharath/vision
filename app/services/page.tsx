import type { Metadata } from "next";
import Link from "next/link";
import { Activity, CalendarCheck, Eye, Glasses, Heart, MessageCircle, ShieldCheck, Sparkles, Stethoscope, Zap } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { SectionHeading } from "@/components/section-heading";
import { SiteHeader } from "@/components/site-header";
import { CLINIC_PHONE, SITE_URL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Services",
  description: "Vision Vistara eye care services — comprehensive eye tests, LASIK consultation, cataract guidance, retina care, glaucoma screening, paediatric eye care, and prescription lens fitting.",
  alternates: { canonical: `${SITE_URL}/services` }
};

const services: Array<{ icon: LucideIcon; title: string; description: string; details: string[] }> = [
  {
    icon: Stethoscope,
    title: "Comprehensive eye test",
    description: "Complete visual assessment including refraction, visual acuity, colour vision, binocular function, and near-distance-intermediate checks.",
    details: ["Digital refraction", "Auto-refractometry", "Visual acuity at all distances", "Colour vision screening", "30–45 min consultation"]
  },
  {
    icon: Zap,
    title: "LASIK & laser consultation",
    description: "Detailed suitability assessment for LASIK, PRK, and other refractive procedures. Includes corneal evaluation and realistic outcome discussion.",
    details: ["Corneal topography review", "Eligibility criteria check", "Risk and benefit discussion", "Referral coordination", "Post-op guidance if applicable"]
  },
  {
    icon: Sparkles,
    title: "Cataract consultation",
    description: "Pre-operative assessment support including lens options, biometry, and surgical readiness evaluation for cataract patients.",
    details: ["Visual impact assessment", "IOL biometry support", "Lens option comparison", "Surgical readiness check", "Post-op prescription planning"]
  },
  {
    icon: Activity,
    title: "Retina & glaucoma screening",
    description: "Screening-oriented care for retinal conditions and glaucoma, supported by OCT imaging and visual field analysis when clinically indicated.",
    details: ["Fundoscopy examination", "OCT retinal scan", "Visual field mapping", "IOP measurement", "Monitoring and referral"]
  },
  {
    icon: Heart,
    title: "Paediatric eye care",
    description: "Age-appropriate eye examinations for children. Early detection of amblyopia, strabismus, refractive errors, and developmental delays.",
    details: ["Child-friendly assessment", "Amblyopia screening", "Squint evaluation", "Glasses fitting for kids", "Follow-up scheduling"]
  },
  {
    icon: Glasses,
    title: "Prescription lens fitting",
    description: "Expert lens recommendation matched to prescription, lifestyle, comfort, and budget. Frame selection support with the dedicated store.",
    details: ["Prescription verification", "Lens type matching", "Coating recommendations", "Frame compatibility check", "Home trial available"]
  },
  {
    icon: Eye,
    title: "Contact lens consultation",
    description: "Contact lens fitting including trial lenses, handling instruction, hygiene guidance, and follow-up schedule for new and existing wearers.",
    details: ["Trial lens fitting", "Wearing schedule planning", "Care and hygiene training", "Follow-up appointments", "Specialty lens referrals"]
  },
  {
    icon: ShieldCheck,
    title: "Computer vision syndrome",
    description: "Assessment and management of digital eye strain for IT professionals, students, and heavy screen users. Blue-light and ergonomic advice.",
    details: ["Screen-specific refraction", "Blue-light lens advice", "Ergonomic assessment", "20-20-20 rule coaching", "Workplace recommendations"]
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
            <p className="mb-4 text-xs font-extrabold uppercase text-cyan-300">Eye Care Services</p>
            <h1 className="max-w-3xl text-4xl font-extrabold leading-tight md:text-6xl">
              Complete eye care with practical optical support.
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-slate-300">
              Keep the clinic visit focused: check the eyes, understand the prescription, choose the right lenses, and plan treatment only when needed.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link className="vv-button-primary" href="/appointments">
                <CalendarCheck className="h-5 w-5" />
                Book Appointment
              </Link>
              <a className="vv-button bg-emerald-400 text-ink" href={`https://wa.me/91${CLINIC_PHONE}?text=Hello%20Vision%20Vistara%2C%20I'd%20like%20to%20enquire%20about%20services.`} target="_blank" rel="noopener">
                <MessageCircle className="h-5 w-5" />
                WhatsApp Enquiry
              </a>
            </div>
          </div>
        </section>

        <section className="vv-section bg-paper">
          <div className="vv-container">
            <SectionHeading kicker="What we offer" title="Services tailored to your eye care needs." />
            <div className="grid gap-6 md:grid-cols-2">
              {services.map((service) => {
                const Icon = service.icon;
                return (
                  <article key={service.title} className="vv-card overflow-hidden">
                    <div className="border-b border-slate-100 p-6">
                      <Icon className="h-12 w-12 rounded-vv bg-blue-50 p-3 text-clinic" />
                      <h3 className="mt-5 text-xl font-extrabold">{service.title}</h3>
                      <p className="mt-3 text-slate-600">{service.description}</p>
                    </div>
                    <div className="bg-slate-50 p-6">
                      <p className="mb-3 text-xs font-extrabold uppercase text-slate-500">What to expect</p>
                      <ul className="grid gap-2">
                        {service.details.map((detail) => (
                          <li key={detail} className="flex items-center gap-2 text-sm text-slate-700">
                            <span className="h-1.5 w-1.5 rounded-full bg-clinic" />
                            {detail}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="store-band">
          <div className="vv-container grid items-center gap-6 py-12 md:grid-cols-[1fr_auto]">
            <div>
              <h2 className="text-2xl font-extrabold">Need prescription glasses after your eye test?</h2>
              <p className="mt-2 text-slate-600">Browse frames, choose lenses, and order — all inside the dedicated frames store.</p>
            </div>
            <Link className="vv-button-retail" href="/frames">
              <Glasses className="h-5 w-5" />
              Visit Frames Store
            </Link>
          </div>
        </section>
      </main>
    </>
  );
}
