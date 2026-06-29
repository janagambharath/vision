import { Send } from "lucide-react";

export function AppointmentPanel({ light = false }: { light?: boolean }) {
  return (
    <form action="/api/leads" method="post" className={light ? "vv-card grid gap-4 p-6" : "grid gap-4 rounded-vv border border-white/15 bg-white/10 p-6 shadow-strong"}>
      <input type="hidden" name="source" value="appointment_form" />
      <input type="hidden" name="intent" value="Appointment request" />
      <h2 className={light ? "text-2xl font-extrabold text-slate-950" : "text-2xl font-extrabold text-white"}>Request an appointment</h2>
      <label className="grid gap-2 text-sm font-bold">
        Full name
        <input className={light ? "vv-input" : "store-input"} type="text" name="name" autoComplete="name" required />
      </label>
      <label className="grid gap-2 text-sm font-bold">
        Phone number
        <input className={light ? "vv-input" : "store-input"} type="tel" name="phone" autoComplete="tel" required />
      </label>
      <label className="grid gap-2 text-sm font-bold">
        Service required
        <select className={light ? "vv-input" : "store-input"} name="payload[service]" required>
          <option value="">Select a service</option>
          <option>Comprehensive Eye Test</option>
          <option>Prescription Lens Guidance</option>
          <option>LASIK Evaluation</option>
          <option>Cataract Consultation</option>
          <option>Retina Care</option>
          <option>Glaucoma Evaluation</option>
          <option>Diagnostics</option>
          <option>Showroom Consultation</option>
        </select>
      </label>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="grid gap-2 text-sm font-bold">
          Preferred date
          <input className={light ? "vv-input" : "store-input"} type="date" name="payload[date]" />
        </label>
        <label className="grid gap-2 text-sm font-bold">
          Preferred time
          <input className={light ? "vv-input" : "store-input"} type="text" name="payload[time]" placeholder="Morning / evening" />
        </label>
      </div>
      <label className="grid gap-2 text-sm font-bold">
        Message
        <textarea className={light ? "vv-input min-h-28 py-3" : "store-input min-h-28 py-3"} name="payload[message]" />
      </label>
      <button className={light ? "vv-button-primary" : "vv-button-retail"} type="submit">
        <Send className="h-4 w-4" />
        Send Appointment Request
      </button>
    </form>
  );
}
