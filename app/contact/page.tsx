import { AppointmentPanel } from "@/components/appointment-panel";
import { SiteHeader } from "@/components/site-header";
import { CLINIC_PHONE } from "@/lib/constants";

export default function ContactPage() {
  return (
    <>
      <SiteHeader />
      <main className="vv-section bg-ink text-white">
        <div className="vv-container grid gap-10 lg:grid-cols-[.85fr_1.15fr]">
          <div>
            <p className="vv-kicker text-cyan-300">Contact</p>
            <h1 className="text-4xl font-extrabold">Get online guidance or request a confirmed home visit.</h1>
            <p className="mt-4 text-slate-300">Vision Vistara operates online with scheduled home visits confirmed for each request. We do not offer walk-ins or a public showroom.</p>
            <div className="mt-8 grid gap-3 text-slate-200">
              <p><strong>Phone / WhatsApp:</strong> {CLINIC_PHONE}</p>
              <p><strong>Home trials:</strong> Request from any valid Indian pincode; route and team availability are confirmed before booking</p>
              <p><strong>Optometrist:</strong> Siddagoni Saidulu, DOA</p>
            </div>
          </div>
          <AppointmentPanel />
        </div>
      </main>
    </>
  );
}
