import { AppointmentPanel } from "@/components/appointment-panel";
import { SiteHeader } from "@/components/site-header";
import { CLINIC_PHONE } from "@/lib/constants";
import { LOCAL_HOME_TRIAL_PROMISE, LOCAL_SERVICE_AREA_LABEL } from "@/lib/local-service";

export default function ContactPage() {
  return (
    <>
      <SiteHeader />
      <main className="vv-section bg-ink text-white">
        <div className="vv-container grid gap-10 lg:grid-cols-[.85fr_1.15fr]">
          <div>
            <p className="vv-kicker text-cyan-300">Contact</p>
            <h1 className="text-4xl font-extrabold">Optometrist-guided eyewear for select Hyderabad customers.</h1>
            <p className="mt-4 text-slate-300">Vision Vistara operates online with route-confirmed home trials and local delivery. We do not claim a walk-in showroom.</p>
            <div className="mt-8 grid gap-3 text-slate-200">
              <p><strong>Phone / WhatsApp:</strong> {CLINIC_PHONE}</p>
              <p><strong>Home trials:</strong> {LOCAL_HOME_TRIAL_PROMISE} — {LOCAL_SERVICE_AREA_LABEL}</p>
              <p><strong>Optometrist:</strong> Siddagoni Saidulu, DOA</p>
            </div>
          </div>
          <AppointmentPanel />
        </div>
      </main>
    </>
  );
}
