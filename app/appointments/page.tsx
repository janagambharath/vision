import { AppointmentPanel } from "@/components/appointment-panel";
import { SiteHeader } from "@/components/site-header";

export default function AppointmentsPage() {
  return (
    <>
      <SiteHeader />
      <main className="vv-section bg-paper">
        <div className="vv-container max-w-3xl">
          <p className="vv-kicker">Appointments</p>
          <h1 className="text-4xl font-extrabold">Request a Vision Vistara appointment.</h1>
          <p className="mt-3 text-slate-600">The request is saved as a lead in PostgreSQL and can fall back to WhatsApp follow-up.</p>
          <div className="mt-8">
            <AppointmentPanel light />
          </div>
        </div>
      </main>
    </>
  );
}
