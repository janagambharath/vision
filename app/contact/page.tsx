import { AppointmentPanel } from "@/components/appointment-panel";
import { SiteHeader } from "@/components/site-header";
import {
  CLINIC_ADDRESS,
  CLINIC_GOOGLE_BUSINESS_URL,
  CLINIC_GOOGLE_MAPS_URL,
  CLINIC_HOURS,
  CLINIC_PHONE
} from "@/lib/constants";

export default function ContactPage() {
  return (
    <>
      <SiteHeader />
      <main className="vv-section bg-ink text-white">
        <div className="vv-container grid gap-10 lg:grid-cols-[.85fr_1.15fr]">
          <div>
            <p className="vv-kicker text-cyan-300">Contact</p>
            <h1 className="text-4xl font-extrabold">Book your eye test, diagnostics visit, or showroom consultation.</h1>
            <p className="mt-4 text-slate-300">For eye care, diagnostics, prescription guidance, or optical purchase support, contact the clinic directly.</p>
            <div className="mt-8 grid gap-3 text-slate-200">
              <p><strong>Phone / WhatsApp:</strong> {CLINIC_PHONE}</p>
              <p><strong>Service area:</strong> Serving patients across Hyderabad</p>
              {CLINIC_ADDRESS ? (
                <p>
                  <strong>Clinic address:</strong>{" "}
                  {CLINIC_GOOGLE_MAPS_URL ? <a href={CLINIC_GOOGLE_MAPS_URL} target="_blank" rel="noopener noreferrer" className="underline hover:text-cyan-300">{CLINIC_ADDRESS}</a> : CLINIC_ADDRESS}
                </p>
              ) : null}
              {CLINIC_HOURS ? <p><strong>Clinic hours:</strong> {CLINIC_HOURS}</p> : null}
              {CLINIC_GOOGLE_BUSINESS_URL ? <p><a href={CLINIC_GOOGLE_BUSINESS_URL} target="_blank" rel="noopener noreferrer" className="font-bold underline hover:text-cyan-300">View Google reviews and directions</a></p> : null}
              <p><strong>Optometrist:</strong> Siddagoni Saidulu, DOA</p>
            </div>
          </div>
          <AppointmentPanel />
        </div>
      </main>
    </>
  );
}
