import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateFrameFit,
  classifyFrameSize,
  recommendedFrameWidthRange,
  rankProductsByFit,
  type FaceMeasurements,
  type ProductMeasurements,
} from "../lib/frame-fit";
import { analyzeFacePosition, calibrateWithCard, computeFaceMeasurements } from "../lib/face-measurement";

test("calibrateWithCard uses a standard horizontal card width and validates its aspect ratio", () => {
  const calibration = calibrateWithCard({
    topLeft: { x: 0, y: 0 },
    topRight: { x: 428, y: 0 },
    bottomLeft: { x: 0, y: 270 },
    bottomRight: { x: 428, y: 270 },
  });

  assert.equal(calibration.method, "card");
  assert.ok(Math.abs(calibration.pixelsPerMm - 5) < 0.01);
  assert.equal(calibration.confidence, 0.95);
});

test("calculateFrameFit scores matching frame width highly", () => {
  const face: FaceMeasurements = {
    faceWidthMm: 138,
    faceHeightMm: 180,
    estimatedPdMm: 63,
    interocularWidthMm: 63,
    noseWidthMm: 18,
    faceShape: "Oval",
    recommendedSize: "Medium",
    measurementQuality: "Good",
    calibrationMethod: "card",
  };

  const matchingProduct: ProductMeasurements = {
    frameWidth: 138,
    lensWidth: 52,
    bridgeWidth: 18,
    templeLength: 140,
    frameHeight: 42,
    faceShapes: ["Oval", "Square"],
  };

  const fit = calculateFrameFit(face, matchingProduct);
  assert.ok(fit.fitScore >= 90, `Expected score >= 90, got ${fit.fitScore}`);
  assert.equal(fit.fitLevel, "Excellent");
  assert.ok(fit.reasons.length > 0);
});

test("calculateFrameFit penalizes mismatched frame width", () => {
  const face: FaceMeasurements = {
    faceWidthMm: 148, // Wide face
    faceHeightMm: 190,
    estimatedPdMm: 68,
    interocularWidthMm: 68,
    noseWidthMm: 20,
    faceShape: "Round",
    recommendedSize: "Large",
    measurementQuality: "Good",
    calibrationMethod: "card",
  };

  const narrowProduct: ProductMeasurements = {
    frameWidth: 120, // Very narrow frame
    lensWidth: 46,
    bridgeWidth: 15,
    templeLength: 135,
    frameHeight: 38,
    faceShapes: ["Oval"],
  };

  const fit = calculateFrameFit(face, narrowProduct);
  assert.ok(fit.fitScore < 60, `Expected score < 60 for narrow frame on wide face, got ${fit.fitScore}`);
  assert.equal(fit.fitLevel, "Less Suitable");
  assert.ok(fit.reasons.some((r) => r.includes("narrower") || r.includes("narrow")));
});

test("classifyFrameSize correctly assigns size buckets", () => {
  assert.equal(classifyFrameSize(120), "Small");
  assert.equal(classifyFrameSize(124), "Small");
  assert.equal(classifyFrameSize(125), "Medium");
  assert.equal(classifyFrameSize(135), "Medium");
  assert.equal(classifyFrameSize(138), "Large");
  assert.equal(classifyFrameSize(145), "Large");
  assert.equal(classifyFrameSize(155), "Extra Large");
});

test("recommendedFrameWidthRange calculates acceptable frame width bounds", () => {
  const range = recommendedFrameWidthRange(138);
  assert.equal(range.min, 134);
  assert.equal(range.max, 144);
});

test("rankProductsByFit ranks matching products higher", () => {
  const face: FaceMeasurements = {
    faceWidthMm: 136,
    faceHeightMm: 180,
    estimatedPdMm: 62,
    interocularWidthMm: 62,
    noseWidthMm: 17,
    faceShape: "Square",
    recommendedSize: "Medium",
    measurementQuality: "Good",
    calibrationMethod: "card",
  };

  const products = [
    { id: "1", name: "Narrow Frame", frameWidth: 118, lensWidth: 45, bridgeWidth: 14, templeLength: 130, frameHeight: 35, faceShapes: ["Round"] },
    { id: "2", name: "Perfect Frame", frameWidth: 136, lensWidth: 52, bridgeWidth: 17, templeLength: 140, frameHeight: 40, faceShapes: ["Square", "Round"] },
    { id: "3", name: "Slightly Wide", frameWidth: 142, lensWidth: 54, bridgeWidth: 18, templeLength: 142, frameHeight: 42, faceShapes: ["Square"] },
  ];

  const ranked = rankProductsByFit(face, products);
  assert.equal(ranked[0].id, "2");
  assert.ok(ranked[0].fit.fitScore >= ranked[1].fit.fitScore);
  assert.ok(ranked[1].fit.fitScore >= ranked[2].fit.fitScore);
});


test("card calibration rejects crossed, undersized, and distorted corners", () => {
  const valid = { topLeft: { x: 0, y: 0 }, topRight: { x: 428, y: 0 }, bottomRight: { x: 428, y: 270 }, bottomLeft: { x: 0, y: 270 } };
  assert.throws(() => calibrateWithCard({ ...valid, bottomRight: valid.bottomLeft, bottomLeft: valid.bottomRight }));
  assert.throws(() => calibrateWithCard({ ...valid, topRight: { x: 428, y: 0 }, bottomRight: { x: 280, y: 270 } }));
  assert.throws(() => calibrateWithCard({ ...valid, bottomRight: { x: 428, y: 428 }, bottomLeft: { x: 0, y: 428 } }));
  assert.throws(() => calibrateWithCard({ topLeft: { x: 0, y: 0 }, topRight: { x: 20, y: 0 }, bottomRight: { x: 20, y: 13 }, bottomLeft: { x: 0, y: 13 } }));
});

test("measurement rejects unreliable scale and incomplete landmarks", () => {
  assert.throws(() => computeFaceMeasurements([], 1280, 720, { pixelsPerMm: 5, confidence: 0.2, method: "heuristic" }), /unclear/);
  assert.throws(() => computeFaceMeasurements([], 1280, 720, { pixelsPerMm: NaN, confidence: 0.7, method: "card" }), /unclear/);
  assert.throws(() => computeFaceMeasurements([], 1280, 720, { pixelsPerMm: 5, confidence: NaN, method: "card" }), /unclear/);
  assert.throws(() => computeFaceMeasurements([], 1280, 720, { pixelsPerMm: 5, confidence: 0.7, method: "card" }), /incomplete/);
  assert.equal(analyzeFacePosition([{ x: 0.5, y: 0.5, z: 0 }], 1).status, "no_face");
});

test("temple length alone cannot produce an excellent personalised fit", () => {
  const face: FaceMeasurements = {
    faceWidthMm: null, faceHeightMm: null, estimatedPdMm: null, interocularWidthMm: null,
    noseWidthMm: null, faceShape: null, recommendedSize: null, measurementQuality: "Approximate", calibrationMethod: "heuristic"
  };
  const product: ProductMeasurements = { frameWidth: 138, lensWidth: null, bridgeWidth: null, templeLength: 140, frameHeight: null, faceShapes: [] };
  assert.equal(calculateFrameFit(face, product).fitScore, 0);
  assert.equal(calculateFrameFit({ ...face, faceWidthMm: 138 }, { ...product, frameWidth: null }).fitScore, 0);
  assert.equal(calculateFrameFit({ ...face, faceWidthMm: NaN }, product).fitScore, 0);
});


test("stored profiles require a finite positive face width and tolerate corrupt data", async () => {
  const { parseStoredFaceMeasurements } = await import("../lib/face-profile");
  assert.equal(parseStoredFaceMeasurements("not json"), null);
  assert.equal(parseStoredFaceMeasurements("null"), null);
  assert.equal(parseStoredFaceMeasurements(JSON.stringify({ faceShape: "Oval" })), null);
  assert.equal(parseStoredFaceMeasurements(JSON.stringify({ faceWidthMm: -1 })), null);
  const profile = parseStoredFaceMeasurements(JSON.stringify({ faceWidthMm: 138, faceShape: "invalid" }));
  assert.equal(profile?.faceWidthMm, 138);
  assert.equal(profile?.faceShape, null);
});


test("captured face and card measurements flow into ranked recommendations", () => {
  const landmarks = Array.from({ length: 478 }, () => ({ x: 0.5, y: 0.5, z: 0 }));
  const place = (index: number, x: number, y: number) => { landmarks[index] = { x: x / 1280, y: y / 1280, z: 0 }; };
  place(234, 295, 640); place(454, 985, 640);
  place(10, 640, 250); place(152, 640, 1000);
  place(468, 482.5, 500); place(473, 797.5, 500);
  place(129, 555, 640); place(358, 725, 640);
  place(54, 390, 350); place(284, 890, 350);
  place(116, 300, 600); place(345, 980, 600);
  place(172, 400, 850); place(397, 880, 850);
  const calibration = calibrateWithCard({ topLeft: { x: 0, y: 0 }, topRight: { x: 428, y: 0 }, bottomRight: { x: 428, y: 270 }, bottomLeft: { x: 0, y: 270 } });
  const face = computeFaceMeasurements(landmarks, 1280, 1280, calibration);
  assert.equal(face.faceWidthMm, 138);
  assert.equal(face.estimatedPdMm, 63);
  const ranked = rankProductsByFit(face, [
    { id: "narrow", frameWidth: 115, lensWidth: 45, bridgeWidth: 16, templeLength: 140, frameHeight: 40, faceShapes: [] },
    { id: "matching", frameWidth: 138, lensWidth: 52, bridgeWidth: 18, templeLength: 140, frameHeight: 40, faceShapes: [] }
  ]);
  assert.equal(ranked[0].id, "matching");
  assert.ok(ranked[0].fit.fitScore >= 90);
  assert.ok(ranked[1].fit.fitScore < ranked[0].fit.fitScore);
});
