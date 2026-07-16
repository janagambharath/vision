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

test("manual optical values enforce the clinical increments used by the form", () => {
  const form = manualForm();
  form.set("rightSphere", "-2.13");
  assert.throws(() => parsePrescriptionSubmission(form, true), /0\.25 increments/);

  form.set("rightSphere", "-2.50");
  form.set("rightPd", "31.25");
  assert.throws(() => parsePrescriptionSubmission(form, true), /0\.5 increments/);
});

test("manual prism and base values must be entered together", () => {
  const missingBase = manualForm();
  missingBase.set("rightPrism", "1.25");
  assert.throws(() => parsePrescriptionSubmission(missingBase, true), /base is required/);

  const missingPrism = manualForm();
  missingPrism.set("rightBase", "IN");
  assert.throws(() => parsePrescriptionSubmission(missingPrism, true), /prism is required/);

  const paired = manualForm();
  paired.set("rightPrism", "1.25");
  paired.set("rightBase", "OUT");
  const parsed = parsePrescriptionSubmission(paired, true);
  assert.equal(parsed?.values.rightPrism, 1.25);
  assert.equal(parsed?.values.rightBase, "OUT");
});

test("prescription lenses cannot skip the prescription selection", () => {
  const form = new FormData();
  form.set("prescriptionChoice", "NONE");
  assert.throws(() => parsePrescriptionSubmission(form, true), PrescriptionValidationError);
});
