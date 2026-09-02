import assert from "node:assert/strict";
import test from "node:test";
import {
  calculateFrameFit,
  classifyFrameSize,
  recommendedFrameWidthRange,
  rankProductsByFit,
  getFitLevel,
  type FaceMeasurements,
  type ProductMeasurements,
} from "../lib/frame-fit";
import { calibrateWithCard } from "../lib/face-measurement";

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
