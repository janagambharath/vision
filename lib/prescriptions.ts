import type { PrescriptionStatus, PrescriptionType } from "@prisma/client";
import { configureCloudinary } from "@/lib/integrations/cloudinary";

const BASE_VALUES = new Set(["IN", "OUT", "UP", "DOWN"]);

export type PrescriptionSubmission = {
  type: PrescriptionType;
  status: PrescriptionStatus;
  upload: File | null;
  values: {
    rightSphere: number | null;
    rightCylinder: number | null;
    rightAxis: number | null;
    rightAdd: number | null;
    rightPd: number | null;
    rightPrism: number | null;
    rightBase: string | null;
    leftSphere: number | null;
    leftCylinder: number | null;
    leftAxis: number | null;
    leftAdd: number | null;
    leftPd: number | null;
    leftPrism: number | null;
    leftBase: string | null;
    prescriptionDate: Date | null;
    doctorName: string | null;
    clinicName: string | null;
    notes: string | null;
  };
};

export class PrescriptionValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PrescriptionValidationError";
  }
}

function text(value: FormDataEntryValue | null, max: number) {
  const valueText = typeof value === "string" ? value.trim() : "";
  if (valueText.length > max) throw new PrescriptionValidationError("Prescription details are too long.");
  return valueText || null;
}

function decimal(value: FormDataEntryValue | null, label: string, min: number, max: number) {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return null;
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    throw new PrescriptionValidationError(`${label} must be between ${min} and ${max}.`);
  }
  return parsed;
}

function axis(value: FormDataEntryValue | null, label: string) {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return null;
  if (!/^\d+$/.test(raw)) throw new PrescriptionValidationError(`${label} must be a whole number from 0 to 180.`);
  const parsed = Number(raw);
  if (parsed < 0 || parsed > 180) throw new PrescriptionValidationError(`${label} must be between 0 and 180.`);
  return parsed;
}

function base(value: FormDataEntryValue | null, label: string) {
  const raw = typeof value === "string" ? value.trim().toUpperCase() : "";
  if (!raw) return null;
  if (!BASE_VALUES.has(raw)) throw new PrescriptionValidationError(`${label} must be IN, OUT, UP, or DOWN.`);
  return raw;
}

function parsePrescriptionDate(value: FormDataEntryValue | null) {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return null;
  const parsed = new Date(`${raw}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed > new Date()) {
    throw new PrescriptionValidationError("Prescription date must be a valid date that is not in the future.");
  }
  return parsed;
}

function parseEye(formData: FormData, prefix: "right" | "left", label: "Right eye (OD)" | "Left eye (OS)") {
  const sphere = decimal(formData.get(`${prefix}Sphere`), `${label} sphere`, -20, 20);
  const cylinder = decimal(formData.get(`${prefix}Cylinder`), `${label} cylinder`, -8, 0);
  const eyeAxis = axis(formData.get(`${prefix}Axis`), `${label} axis`);
  const add = decimal(formData.get(`${prefix}Add`), `${label} ADD`, 0, 4);
  const pd = decimal(formData.get(`${prefix}Pd`), `${label} PD`, 20, 45);
  const prism = decimal(formData.get(`${prefix}Prism`), `${label} prism`, 0, 15);
  const eyeBase = base(formData.get(`${prefix}Base`), `${label} base`);
  if (cylinder !== null && eyeAxis === null) {
    throw new PrescriptionValidationError(`${label} axis is required when cylinder is entered.`);
  }
  if (eyeAxis !== null && cylinder === null) {
    throw new PrescriptionValidationError(`${label} cylinder is required when axis is entered.`);
  }
  if (prism !== null && eyeBase === null) {
    throw new PrescriptionValidationError(`${label} base is required when prism is entered.`);
  }
  return { sphere, cylinder, axis: eyeAxis, add, pd, prism, base: eyeBase };
}

export function parsePrescriptionSubmission(formData: FormData, prescriptionRequired: boolean): PrescriptionSubmission | null {
  const choice = String(formData.get("prescriptionChoice") ?? (prescriptionRequired ? "" : "NONE"));
  if (!["HAVE", "EYE_TEST", "UPLOAD_LATER", "NONE"].includes(choice)) {
    throw new PrescriptionValidationError("Choose how you will provide the prescription.");
  }
  if (prescriptionRequired && choice === "NONE") {
    throw new PrescriptionValidationError("A prescription, eye test, or upload-later choice is required for the selected lenses.");
  }
  if (choice === "NONE") return null;

  const notes = text(formData.get("prescriptionNotes"), 1000);
  const blankValues = {
    rightSphere: null, rightCylinder: null, rightAxis: null, rightAdd: null, rightPd: null, rightPrism: null, rightBase: null,
    leftSphere: null, leftCylinder: null, leftAxis: null, leftAdd: null, leftPd: null, leftPrism: null, leftBase: null,
    prescriptionDate: null, doctorName: null, clinicName: null, notes
  };

  if (choice === "EYE_TEST") return { type: "EYE_TEST", status: "WAITING", upload: null, values: blankValues };
  if (choice === "UPLOAD_LATER") return { type: "UPLOAD_LATER", status: "WAITING", upload: null, values: blankValues };

  const method = String(formData.get("prescriptionSubmission") ?? "");
  if (method === "UPLOAD") {
    const upload = formData.get("prescription") as File | null;
    if (!upload || upload.size === 0) throw new PrescriptionValidationError("Choose a prescription PDF, PNG, JPEG, JPG, or WebP file to upload.");
    return { type: "UPLOAD", status: "NEEDS_REVIEW", upload, values: blankValues };
  }
  if (method !== "MANUAL") throw new PrescriptionValidationError("Choose whether to upload or enter the prescription manually.");

  const right = parseEye(formData, "right", "Right eye (OD)");
  const left = parseEye(formData, "left", "Left eye (OS)");
  if ([right.sphere, right.cylinder, right.add, left.sphere, left.cylinder, left.add].every((value) => value === null)) {
    throw new PrescriptionValidationError("Enter at least one sphere, cylinder, or ADD value for a manual prescription.");
  }
  return {
    type: "MANUAL",
    status: "NEEDS_REVIEW",
    upload: null,
    values: {
      rightSphere: right.sphere, rightCylinder: right.cylinder, rightAxis: right.axis, rightAdd: right.add,
      rightPd: right.pd, rightPrism: right.prism, rightBase: right.base,
      leftSphere: left.sphere, leftCylinder: left.cylinder, leftAxis: left.axis, leftAdd: left.add,
      leftPd: left.pd, leftPrism: left.prism, leftBase: left.base,
      prescriptionDate: parsePrescriptionDate(formData.get("prescriptionDate")),
      doctorName: text(formData.get("doctorName"), 120),
      clinicName: text(formData.get("clinicName"), 120),
      notes
    }
  };
}

export function prescriptionDownloadUrl(prescription: {
  filePublicId: string | null;
  fileResourceType: string | null;
}) {
  if (!prescription.filePublicId) return null;
  const cloudinary = configureCloudinary();
  return cloudinary.url(prescription.filePublicId, {
    resource_type: prescription.fileResourceType === "raw" ? "raw" : "image",
    type: "authenticated",
    sign_url: true,
    secure: true,
    expires_at: Math.floor(Date.now() / 1000) + 5 * 60
  });
}

export async function deletePrescriptionAsset(prescription: {
  filePublicId: string | null;
  fileResourceType: string | null;
}) {
  if (!prescription.filePublicId) return;
  const cloudinary = configureCloudinary();
  await cloudinary.uploader.destroy(prescription.filePublicId, {
    resource_type: prescription.fileResourceType === "raw" ? "raw" : "image",
    type: "authenticated",
    invalidate: true
  });
}
