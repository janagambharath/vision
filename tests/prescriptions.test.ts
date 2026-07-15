import assert from "node:assert/strict";
import test from "node:test";
import { parsePrescriptionSubmission, PrescriptionValidationError } from "../lib/prescriptions";

function manualForm() {
  const form = new FormData();
  form.set("prescriptionChoice", "HAVE");
  form.set("prescriptionSubmission", "MANUAL");
  form.set("rightSphere", "-2.50");
  form.set("rightCylinder", "-1.00");
  form.set("rightAxis", "90");
  form.set("leftSphere", "-2.00");
  form.set("leftCylinder", "");
  form.set("leftAxis", "");
  return form;
}

test("manual prescriptions persist validated optical values", () => {
  const parsed = parsePrescriptionSubmission(manualForm(), true);
  assert.equal(parsed?.type, "MANUAL");
  assert.equal(parsed?.status, "NEEDS_REVIEW");
  assert.equal(parsed?.values.rightAxis, 90);
});

test("manual cylinder requires a valid axis", () => {
  const form = manualForm();
  form.set("rightAxis", "181");
  assert.throws(() => parsePrescriptionSubmission(form, true), PrescriptionValidationError);
});

test("prescription lenses cannot skip the prescription selection", () => {
  const form = new FormData();
  form.set("prescriptionChoice", "NONE");
  assert.throws(() => parsePrescriptionSubmission(form, true), PrescriptionValidationError);
});
