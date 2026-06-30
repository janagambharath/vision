import type { Metadata } from "next";
import Link from "next/link";
import { Activity, CalendarCheck, ClipboardCheck, Eye, FileCheck2, MessageCircle, ScanLine } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { SectionHeading } from "@/components/section-heading";
import { SiteHeader } from "@/components/site-header";
import { CLINIC_PHONE, SITE_URL } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Diagnostics",
  description: "Vision Vistara diagnostic services — OCT imaging, visual fields, biometry, Pentacam, Orbscan, fundoscopy, and report guidance for Hyderabad patients.",
  alternates: { canonical: `${SITE_URL}/diagnostics` }
};

const diagnostics: Array<{ icon: LucideIcon; title: string; description: string; when: string; duration: string }> = [
  {
    icon: ScanLine,
    title: "OCT (Optical Coherence Tomography)",
    description: "High-resolution cross-sectional imaging of the retina and optic nerve head. Essential for detecting and monitoring macular degeneration, diabetic retinopathy, and glaucoma.",
    when: "Recommended for patients with diabetes, family history of glaucoma, or unexplained vision changes.",
    duration: "10–15 minutes"
  },
  {
    icon: Activity,
    title: "Visual Field Analysis",
    description: "Automated perimetry mapping of peripheral and central vision. Identifies blind spots, vision loss patterns, and nerve damage progression in glaucoma patients.",
    when: "Recommended for glaucoma monitoring, optic nerve disorders, and neurological assessments.",
    duration: "15–20 minutes per eye"
  },
  {
    icon: FileCheck2,
    title: "AL / IOL Biometry Scan",
    description: "Precise axial length measurement and IOL power calculation for cataract surgery planning. Uses optical or ultrasound biometry for accurate lens implant selection.",
    when: "Required before cataract surgery for lens power calculation.",
    duration: "10–15 minutes"
  },
  {
    icon: Eye,
    title: "Pentacam Corneal Analysis",
    description: "3D anterior segment imaging measuring corneal thickness, curvature, and elevation maps. Critical for LASIK candidacy assessment and keratoconus screening.",
    when: "Recommended for refractive surgery evaluation, corneal disease, and contact lens fitting challenges.",
    duration: "5–10 minutes"
  },
  {
    icon: ScanLine,
    title: "Orbscan Topography",
    description: "Advanced corneal topography with anterior and posterior surface mapping. Provides detailed pachymetry and elevation analysis for complex corneal conditions.",
    when: "Recommended for pre-LASIK screening, post-surgical monitoring, and unusual corneal patterns.",
    duration: "5–10 minutes"
  },
  {
    icon: ClipboardCheck,
    title: "Fundoscopy & Slit Lamp Examination",
    description: "Direct and indirect examination of the eye's internal structures including lens, vitreous, retina, and optic disc. The cornerstone of any comprehensive eye assessment.",
    when: "Part of every comprehensive eye examination. Essential for diabetic eye screening.",
    duration: "10–20 minutes"
  }
];

export default function DiagnosticsPage() {
  return (
    <>
      <SiteHeader />
      <main>
        <section className="relative isolate overflow-hidden bg-ink text-white">
          <div className="absolute inset-0 -z-10 bg-[linear-gradient(135deg,rgba(5,9,19,.95),rgba(21,80,184,.35))]" />
          <div className="vv-container py-24 md:py-32">
            <p className="mb-4 text-xs font-extrabold uppercase text-cyan-300">Diagnostic Services</p>
            <h1 className="max-w-3xl text-4xl font-extrabold leading-tight md:text-6xl">
              Advanced testing for confident treatment planning.
            </h1>
            <p className="mt-6 max-w-2xl text-lg text-slate-300">
              Diagnostic recommendations are based on the patient&apos;s concern, eye condition, and treatment pathway. Each test produces a clear report with practical next steps.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link className="vv-button-primary" href="/appointments">
                <CalendarCheck className="h-5 w-5" />
                Book Diagnostic Visit
              </Link>
              <a className="vv-button bg-emerald-400 text-ink" href={`https://wa.me/91${CLINIC_PHONE}?text=Hello%20Vision%20Vistara%2C%20I%20need%20to%20book%20a%20diagnostic%20test.`} target="_blank" rel="noopener">
                <MessageCircle className="h-5 w-5" />
                WhatsApp Enquiry
              </a>
            </div>
          </div>
        </section>

        <section className="vv-section bg-paper">
          <div className="vv-container">
            <SectionHeading kicker="Available diagnostics" title="Equipment and tests to support clinical decisions." />
            <div className="grid gap-6">
              {diagnostics.map((test) => {
                const Icon = test.icon;
                return (
                  <article key={test.title} className="vv-card grid gap-6 p-6 lg:grid-cols-[1fr_320px]">
                    <div>
                      <div className="flex items-start gap-4">
                        <Icon className="mt-1 h-10 w-10 shrink-0 rounded-vv bg-blue-50 p-2 text-clinic" />
                        <div>
                          <h3 className="text-xl font-extrabold">{test.title}</h3>
                          <p className="mt-2 text-slate-600">{test.description}</p>
                        </div>
                      </div>
                    </div>
                    <div className="grid gap-3 rounded-vv bg-slate-50 p-5">
                      <div>
                        <p className="text-xs font-extrabold uppercase text-slate-500">When recommended</p>
                        <p className="mt-1 text-sm text-slate-700">{test.when}</p>
                      </div>
                      <div>
                        <p className="text-xs font-extrabold uppercase text-slate-500">Duration</p>
                        <p className="mt-1 text-sm font-bold text-clinic">{test.duration}</p>
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section className="vv-section bg-white">
          <div className="vv-container">
            <SectionHeading kicker="After the test" title="Clear reports with practical next steps.">
              <p>Every diagnostic test produces a report that is reviewed with the patient. The optometrist explains findings in plain language and outlines what comes next — whether it&apos;s monitoring, treatment, referral, or no action needed.</p>
            </SectionHeading>
            <div className="grid gap-4 md:grid-cols-3">
              {([
                ["Report review", "Results are explained during your visit. No jargon, no confusion."],
                ["Treatment planning", "If treatment is needed, a clear plan with timeline and options is provided."],
                ["Referral coordination", "When specialist care is needed, Vision Vistara coordinates referrals seamlessly."]
              ]).map(([title, body]) => (
                <article key={title} className="vv-card p-6">
                  <h3 className="text-lg font-extrabold">{title}</h3>
                  <p className="mt-3 text-sm text-slate-600">{body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>
    </>
  );
}
