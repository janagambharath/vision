import type { PrescriptionStatus, PrescriptionType } from "@prisma/client";
import { configureCloudinary } from "@/lib/integrations/cloudinary";

const BASE_VALUES = new Set(["IN", "OUT", "UP", "DOWN"]);
const DECIMAL_VALUE_PATTERN = /^[+-]?(?:\d+(?:\.\d+)?|\.\d+)$/;

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

function decimal(value: FormDataEntryValue | null, label: string, min: number, max: number, increment: number) {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return null;
  if (!DECIMAL_VALUE_PATTERN.test(raw)) {
    throw new PrescriptionValidationError(`${label} must be a decimal number.`);
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed) || parsed < min || parsed > max) {
    throw new PrescriptionValidationError(`${label} must be between ${min} and ${max}.`);
  }

  // Store clinically meaningful values with a fixed two-decimal representation.
  // This avoids accepting values that a browser number input would normally reject
  // (for example -1.13 for a 0.25D field) when a request is submitted directly.
  const hundredths = Math.round(parsed * 100);
  if (Math.abs(parsed * 100 - hundredths) > Number.EPSILON * 100 || hundredths % Math.round(increment * 100) !== 0) {
    throw new PrescriptionValidationError(`${label} must use ${increment.toFixed(increment === 0.5 ? 1 : 2)} increments.`);
  }
  return hundredths / 100;
}

function axis(value: FormDataEntryValue | null, label: string) {
  const raw = typeof value === "string" ? value.trim() : "";
  if (!raw) return null;
  if (!/^\d+$/.test(raw)) throw new PrescriptionValidationError(`${label} must be a whole number from 0 to 180.`);
  const parsed = Number(raw);
  if (!Number.isSafeInteger(parsed) || parsed < 0 || parsed > 180) throw new PrescriptionValidationError(`${label} must be between 0 and 180.`);
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
  const sphere = decimal(formData.get(`${prefix}Sphere`), `${label} sphere`, -20, 20, 0.25);
  const cylinder = decimal(formData.get(`${prefix}Cylinder`), `${label} cylinder`, -8, 0, 0.25);
  const eyeAxis = axis(formData.get(`${prefix}Axis`), `${label} axis`);
  const add = decimal(formData.get(`${prefix}Add`), `${label} ADD`, 0, 4, 0.25);
  const pd = decimal(formData.get(`${prefix}Pd`), `${label} PD`, 20, 45, 0.5);
  const prism = decimal(formData.get(`${prefix}Prism`), `${label} prism`, 0, 15, 0.25);
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
  if (eyeBase !== null && prism === null) {
    throw new PrescriptionValidationError(`${label} prism is required when base is entered.`);
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
  if ([right.sphere, right.cylinder, right.add, right.prism, left.sphere, left.cylinder, left.add, left.prism].every((value) => value === null)) {
    throw new PrescriptionValidationError("Enter at least one sphere, cylinder, ADD, or prism value for a manual prescription.");
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
  const result = await cloudinary.uploader.destroy(prescription.filePublicId, {
    resource_type: prescription.fileResourceType === "raw" ? "raw" : "image",
    type: "authenticated",
    invalidate: true
  }) as { result?: unknown };
  // Cloudinary deletion is idempotent. Any other response is unconfirmed and
  // must be surfaced to the caller instead of silently claiming medical-file
  // cleanup succeeded.
  if (result.result !== "ok" && result.result !== "not found") {
    throw new Error("Cloudinary did not confirm prescription asset deletion.");
  }
}
