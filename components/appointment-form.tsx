"use client";

import { useState, useTransition } from "react";
import { CalendarCheck, CheckCircle2, Loader2, Phone, User, FileText, Clock } from "lucide-react";

interface AppointmentFormProps {
  action: (formData: FormData) => Promise<void>;
}

const timeSlots = [
  "10:00 AM – 11:00 AM",
  "11:00 AM – 12:00 PM",
  "12:00 PM – 1:00 PM",
  "2:00 PM – 3:00 PM",
  "3:00 PM – 4:00 PM",
  "4:00 PM – 5:00 PM",
  "5:00 PM – 6:00 PM",
];

const services = [
  "Comprehensive Eye Test",
  "Prescription Check",
  "LASIK Consultation",
  "Cataract Assessment",
  "Glaucoma Screening",
  "Retina Check",
  "Pediatric Eye Exam",
  "Contact Lens Fitting",
];

export function AppointmentForm({ action }: AppointmentFormProps) {
  const [submitted, setSubmitted] = useState(false);
  const [isPending, startTransition] = useTransition();

  const handleSubmit = (formData: FormData) => {
    startTransition(async () => {
      await action(formData);
      setSubmitted(true);
    });
  };

  if (submitted) {
    return (
      <div className="text-center py-12">
        <CheckCircle2 className="mx-auto h-14 w-14 text-clinic" />
        <h3 className="mt-4 text-2xl font-extrabold text-slate-900">
          Appointment request received!
        </h3>
        <p className="mt-2 text-slate-600">
          Our team will contact you within 24 hours to confirm your appointment slot.
        </p>
        <button
          onClick={() => setSubmitted(false)}
          className="mt-4 text-sm font-bold text-clinic hover:underline"
        >
          Book another appointment
        </button>
      </div>
    );
  }

  return (
    <form action={handleSubmit} className="grid gap-5 md:grid-cols-2">
      <label className="grid gap-1.5 text-sm font-extrabold text-slate-600">
        <span className="flex items-center gap-1.5">
          <User className="h-3.5 w-3.5" /> Full Name
        </span>
        <input
          className="vv-input"
          type="text"
          name="name"
          required
          placeholder="Your full name"
          disabled={isPending}
        />
      </label>

      <label className="grid gap-1.5 text-sm font-extrabold text-slate-600">
        <span className="flex items-center gap-1.5">
          <Phone className="h-3.5 w-3.5" /> Phone Number
        </span>
        <input
          className="vv-input"
          type="tel"
          name="phone"
          required
          placeholder="e.g. 9876543210"
          pattern="[6-9][0-9]{9}"
          title="Enter a valid 10-digit Indian mobile number"
          disabled={isPending}
        />
      </label>

      <label className="grid gap-1.5 text-sm font-extrabold text-slate-600">
        <span className="flex items-center gap-1.5">
          <FileText className="h-3.5 w-3.5" /> Service Needed
        </span>
        <select className="vv-input" name="service" required disabled={isPending}>
          <option value="">Select a service...</option>
          {services.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </label>

      <label className="grid gap-1.5 text-sm font-extrabold text-slate-600">
        <span className="flex items-center gap-1.5">
          <CalendarCheck className="h-3.5 w-3.5" /> Preferred Date
        </span>
        <input
          className="vv-input"
          type="date"
          name="preferredDate"
          required
          min={new Date().toISOString().split("T")[0]}
          disabled={isPending}
        />
      </label>

      <label className="grid gap-1.5 text-sm font-extrabold text-slate-600">
        <span className="flex items-center gap-1.5">
          <Clock className="h-3.5 w-3.5" /> Preferred Time
        </span>
        <select className="vv-input" name="timeSlot" required disabled={isPending}>
          {timeSlots.map((slot) => (
            <option key={slot} value={slot}>{slot}</option>
          ))}
        </select>
      </label>

      <label className="grid gap-1.5 text-sm font-extrabold text-slate-600">
        Notes (optional)
        <textarea
          className="vv-input min-h-[52px] py-3"
          name="notes"
          placeholder="Any specific concerns or existing conditions..."
          disabled={isPending}
        />
      </label>

      <div className="md:col-span-2">
        <button
          className="vv-button-primary w-full md:w-auto"
          type="submit"
          disabled={isPending}
        >
          {isPending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <CalendarCheck className="h-5 w-5" />
          )}
          {isPending ? "Submitting..." : "Request Appointment"}
        </button>
        <p className="mt-2 text-xs text-slate-500">
          We'll confirm your appointment within 24 hours via phone or WhatsApp.
        </p>
      </div>
    </form>
  );
}
