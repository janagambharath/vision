"use client";

import { useState, type ReactNode } from "react";
import { FileText, Stethoscope, Upload, UserRoundCheck } from "lucide-react";

export type PrescriptionChoice = "HAVE" | "EYE_TEST" | "UPLOAD_LATER" | "NONE" | "";

type Props = {
  requiresPrescription: boolean;
  choice: PrescriptionChoice;
  onChoiceChange: (choice: PrescriptionChoice) => void;
};

const eyeFields = [
  { label: "Sphere (SPH)", field: "Sphere", min: -20, max: 20, step: "0.25", placeholder: "e.g. -2.50", hint: "0.25D steps" },
  { label: "Cylinder (CYL)", field: "Cylinder", min: -8, max: 0, step: "0.25", placeholder: "e.g. -1.00", hint: "Axis required" },
  { label: "Axis", field: "Axis", min: 0, max: 180, step: "1", placeholder: "0–180", hint: "with CYL" },
  { label: "ADD", field: "Add", min: 0, max: 4, step: "0.25", placeholder: "e.g. +1.50", hint: "0.25D steps" },
  { label: "PD", field: "Pd", min: 20, max: 45, step: "0.5", placeholder: "e.g. 31.5", hint: "per eye, 0.5 mm" },
  { label: "Prism", field: "Prism", min: 0, max: 15, step: "0.25", placeholder: "e.g. 1.25", hint: "Base required" }
] as const;

function EyeFields({ side, label }: { side: "right" | "left"; label: string }) {
  return (
    <fieldset className="rounded-xl border border-slate-200 p-4">
      <legend className="px-1 text-sm font-extrabold text-slate-800">{label}</legend>
      <div className="grid gap-3 sm:grid-cols-2">
        {eyeFields.map(({ label: fieldLabel, field, min, max, step, placeholder, hint }) => (
          <label key={field} className="grid gap-1 text-xs font-bold text-slate-600">
            <span>{fieldLabel} <span className="font-normal text-slate-500">({hint})</span></span>
            <input className="store-input py-2" type="number" name={`${side}${field}`} min={min} max={max} step={step} inputMode="decimal" placeholder={placeholder} />
          </label>
        ))}
        <label className="grid gap-1 text-xs font-bold text-slate-600">
          <span>Base <span className="font-normal text-slate-500">(with Prism)</span></span>
          <select className="store-input py-2" name={`${side}Base`} defaultValue="">
            <option value="">Select when Prism is entered</option><option value="IN">IN</option><option value="OUT">OUT</option><option value="UP">UP</option><option value="DOWN">DOWN</option>
          </select>
        </label>
      </div>
    </fieldset>
  );
}

function ChoiceCard({ value, title, description, icon, choice, onChange, required }: {
  value: Exclude<PrescriptionChoice, "">; title: string; description: string; icon: ReactNode;
  choice: PrescriptionChoice; onChange: (choice: PrescriptionChoice) => void; required?: boolean;
}) {
  const active = choice === value;
  return (
    <label className={`flex cursor-pointer gap-3 rounded-xl border-2 p-4 transition ${active ? "border-teal-600 bg-teal-50" : "border-slate-200 bg-white hover:border-teal-300"}`}>
      <input className="mt-1" type="radio" name="prescriptionChoice" value={value} checked={active} required={required} onChange={() => onChange(value)} />
      <span className="text-teal-700">{icon}</span>
      <span><span className="block text-sm font-extrabold text-slate-900">{title}</span><span className="mt-1 block text-xs leading-relaxed text-slate-600">{description}</span></span>
    </label>
  );
}

export default function PrescriptionStep({ requiresPrescription, choice, onChoiceChange }: Props) {
  return (
    <section className="grid gap-4 border-t border-slate-200 pt-5" aria-labelledby="prescription-heading">
      <div>
        <h2 id="prescription-heading" className="text-2xl font-extrabold">Prescription</h2>
        <p className="mt-1 text-sm text-slate-600">{requiresPrescription ? "Your selected lens requires a prescription before clinical verification and lens processing." : "No prescription is needed for your selected frame or zero-power lenses. You can still add one for lens guidance."}</p>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <ChoiceCard value="HAVE" title="I already have a prescription" description="Upload a current prescription or enter the values yourself." icon={<FileText className="h-5 w-5" />} choice={choice} onChange={onChoiceChange} required={requiresPrescription} />
        <ChoiceCard value="EYE_TEST" title="I need an eye test" description="Our clinic will contact you to arrange an eye test before lens processing." icon={<Stethoscope className="h-5 w-5" />} choice={choice} onChange={onChoiceChange} required={requiresPrescription} />
        <ChoiceCard value="UPLOAD_LATER" title="I want to upload prescription later" description="Place the order now; it remains on hold until you upload a valid prescription." icon={<Upload className="h-5 w-5" />} choice={choice} onChange={onChoiceChange} required={requiresPrescription} />
        {!requiresPrescription ? <ChoiceCard value="NONE" title="No prescription" description="Continue with a frame-only or zero-power order." icon={<UserRoundCheck className="h-5 w-5" />} choice={choice} onChange={onChoiceChange} /> : null}
      </div>
      {choice === "HAVE" ? <ExistingPrescriptionForm /> : null}
      {choice === "EYE_TEST" ? <p className="rounded-lg bg-blue-50 p-3 text-sm font-semibold text-blue-900">Your order will remain awaiting prescription while the clinic coordinates your eye-test appointment.</p> : null}
      {choice === "UPLOAD_LATER" ? <p className="rounded-lg bg-amber-50 p-3 text-sm font-semibold text-amber-900">You can upload your prescription later from My Account. Lens processing will not begin until it is verified.</p> : null}
    </section>
  );
}

function ExistingPrescriptionForm() {
  const [method, setMethod] = useState<"UPLOAD" | "MANUAL">("UPLOAD");
  return (
    <div className="grid gap-4 rounded-xl border border-teal-200 bg-teal-50/40 p-4">
      <div className="flex flex-wrap gap-4" role="radiogroup" aria-label="Prescription method">
        <label className="flex items-center gap-2 text-sm font-bold text-slate-800"><input type="radio" name="prescriptionSubmission" value="UPLOAD" checked={method === "UPLOAD"} onChange={() => setMethod("UPLOAD")} /> Upload prescription</label>
        <label className="flex items-center gap-2 text-sm font-bold text-slate-800"><input type="radio" name="prescriptionSubmission" value="MANUAL" checked={method === "MANUAL"} onChange={() => setMethod("MANUAL")} /> Enter manually</label>
      </div>
      {method === "UPLOAD" ? (
        <label className="grid gap-2 text-sm font-extrabold text-slate-700">
          Upload prescription file
          <input className="store-input" type="file" name="prescription" accept="application/pdf,image/png,image/jpeg,image/webp,.pdf,.png,.jpeg,.jpg,.webp" required />
          <span className="text-xs font-normal text-slate-500">PDF, PNG, JPEG, JPG, or WEBP. Maximum 10 MB. Stored as a private file.</span>
        </label>
      ) : (
        <div className="grid gap-4">
          <p className="text-xs font-semibold text-slate-600">Enter values exactly as written by your optometrist. Cylinder and Axis must be entered together; Prism and Base must be entered together. SPH, CYL, ADD, and Prism use 0.25D steps; PD uses 0.5 mm steps.</p>
          <div className="grid gap-4 xl:grid-cols-2"><EyeFields side="right" label="Right eye (OD)" /><EyeFields side="left" label="Left eye (OS)" /></div>
          <div className="grid gap-3 md:grid-cols-3">
            <label className="grid gap-1 text-xs font-bold text-slate-600">Prescription date<input className="store-input py-2" type="date" name="prescriptionDate" max={new Date().toISOString().slice(0, 10)} /></label>
            <label className="grid gap-1 text-xs font-bold text-slate-600">Doctor name<input className="store-input py-2" type="text" name="doctorName" maxLength={120} /></label>
            <label className="grid gap-1 text-xs font-bold text-slate-600">Clinic name<input className="store-input py-2" type="text" name="clinicName" maxLength={120} /></label>
          </div>
          <label className="grid gap-1 text-xs font-bold text-slate-600">Prescription notes<textarea className="store-input min-h-24 py-2" name="prescriptionNotes" maxLength={1000} placeholder="Optional instructions from the prescription" /></label>
        </div>
      )}
    </div>
  );
}
