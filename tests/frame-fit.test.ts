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
import { advanceFaceStability, analyzeFacePosition, calibrateWithCard, computeFaceMeasurements, computeIrisMeasurementFromSamples } from "../lib/face-measurement";

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


test("recommendations include every measured frame regardless of purchase availability", async () => {
  const { recommendMeasuredFrames } = await import("../lib/frame-recommendations");
  const face: FaceMeasurements = { faceWidthMm: 138, faceHeightMm: 180, estimatedPdMm: 63,
    interocularWidthMm: 63, noseWidthMm: 30, faceShape: "Oval", recommendedSize: "Large",
    measurementQuality: "Fair", calibrationMethod: "card" };
  const candidates = Array.from({ length: 125 }, (_, index) => ({
    name: `Frame ${index}`, featured: false, frameWidth: index === 124 ? 138 : 155,
    lensWidth: 52, bridgeWidth: 18, templeLength: 140, frameHeight: 40, faceShapes: [],
    sellable: index === 0, codAvailable: index === 0, inventoryQuantity: index === 0 ? 1 : 0
  }));
  const ranked = recommendMeasuredFrames(face, candidates);
  assert.equal(ranked.length, 125);
  assert.equal(ranked[0].product.name, "Frame 124");
  assert.equal(ranked[0].product.sellable, false);
  assert.equal(ranked[0].product.codAvailable, false);
  assert.equal(ranked[0].product.inventoryQuantity, 0);
  assert.ok(ranked[0].fit.fitScore > ranked[124].fit.fitScore);
  assert.equal(recommendMeasuredFrames(face, [{ ...candidates[0], frameWidth: 0, lensWidth: null }]).length, 0);
});


test("standard saved text markings become sizing inputs without inventing total width", async () => {
  const { resolveFrameSpecifications, hasFrameSizing } = await import("../lib/frame-specifications");
  for (const measurements of ["50-20-140", "48[]18-138", "SP-88988 49\u25a118-145", "1313 55 17 144"]) {
    const specs = resolveFrameSpecifications({ measurements });
    assert.ok(specs.lensWidth);
    assert.ok(specs.bridgeWidth);
    assert.ok(specs.templeLength);
    assert.equal(specs.frameWidth, null);
    assert.equal(hasFrameSizing({ measurements }), true);
  }
  assert.equal(hasFrameSizing({ measurements: "Fit check required" }), false);
  assert.equal(hasFrameSizing({ measurements: "M-135-54" }), false);
  assert.equal(resolveFrameSpecifications({ measurements: "50-20-140", lensWidth: 52, frameWidth: 138 }).lensWidth, 52);
});

test("frames with only saved text measurements are ranked alongside total-width frames", async () => {
  const { recommendMeasuredFrames } = await import("../lib/frame-recommendations");
  const face: FaceMeasurements = { faceWidthMm: 138, faceHeightMm: 180, estimatedPdMm: 63, interocularWidthMm: 63,
    noseWidthMm: 30, faceShape: "Oval", recommendedSize: "Large", measurementQuality: "Fair", calibrationMethod: "card" };
  const base = { featured: false, frameWidth: null, lensWidth: null, bridgeWidth: null, templeLength: null, frameHeight: null, faceShapes: [] };
  const ranked = recommendMeasuredFrames(face, [
    { ...base, name: "Saved marking", measurements: "52-18-140" },
    { ...base, name: "Measured total", frameWidth: 138 },
    { ...base, name: "No measurements" }
  ]);
  assert.equal(ranked.length, 2);
  assert.ok(ranked.some(item => item.product.name === "Saved marking" && item.fit.fitScore > 0));
});


function alignedFace() {
  const points = Array.from({ length: 478 }, () => ({ x: 0.5, y: 0.5, z: 0 }));
  points[234].x = 0.34; points[454].x = 0.66;
  points[10].y = 0.18; points[152].y = 0.82;
  points[33] = { x: 0.38, y: 0.4, z: 0 }; points[133] = { x: 0.45, y: 0.4, z: 0 };
  points[263] = { x: 0.62, y: 0.4, z: 0 }; points[362] = { x: 0.55, y: 0.4, z: 0 };
  points[159] = { x: 0.415, y: 0.39, z: 0 }; points[145] = { x: 0.415, y: 0.41, z: 0 };
  points[386] = { x: 0.585, y: 0.39, z: 0 }; points[374] = { x: 0.585, y: 0.41, z: 0 };
  return points;
}

test("strict face guidance rejects turned, tilted, blinking and clipped captures", () => {
  assert.equal(analyzeFacePosition(alignedFace(), 1, 1280, 720).status, "ready");
  assert.equal(analyzeFacePosition(alignedFace(), 2).status, "multiple_faces");
  const turned = alignedFace(); turned[1].x = 0.56;
  assert.equal(analyzeFacePosition(turned, 1).status, "head_turned");
  const tilted = alignedFace(); tilted[263].y = 0.46;
  assert.equal(analyzeFacePosition(tilted, 1).status, "head_tilted");
  const blink = alignedFace(); blink[159].y = blink[145].y;
  assert.equal(analyzeFacePosition(blink, 1).status, "eyes_closed");
  const clipped = alignedFace(); clipped[10].y = -0.01;
  assert.equal(analyzeFacePosition(clipped, 1).status, "face_clipped");
  const distant = alignedFace(); distant[234].x = 0.39; distant[454].x = 0.61;
  assert.equal(analyzeFacePosition(distant, 1).status, "too_far");
});

test("steady tracking requires both enough frames and elapsed time, and resets after motion", () => {
  const points = alignedFace();
  let result = advanceFaceStability(null, points, 0);
  for (let index = 1; index <= 25; index++) result = advanceFaceStability(result.state, points, index * 10);
  assert.equal(result.ready, false);
  result = advanceFaceStability(result.state, points, 1250);
  assert.equal(result.ready, true);
  const moved = alignedFace(); moved[1].x += 0.04;
  result = advanceFaceStability(result.state, moved, 1300);
  assert.equal(result.ready, false);
  assert.equal(result.state.frames, 1);
  assert.equal(advanceFaceStability(null, points, 2000).ready, false);
});

test("unreliable calibration is still rejected", () => {
  assert.throws(() => computeFaceMeasurements(alignedFace(), 1280, 720,
    { pixelsPerMm: 5, confidence: 0.45, method: "heuristic" }), /unclear/);
});


test("readiness becomes available at phone camera FPS despite normal landmark jitter", () => {
  let result = advanceFaceStability(null, alignedFace(), 0);
  for (let frame = 1; frame <= 3; frame++) {
    const points = alignedFace();
    points[1].x += frame % 2 ? 0.015 : -0.008;
    result = advanceFaceStability(result.state, points, frame * 250);
  }
  assert.equal(result.ready, true, "Next must unlock after a short steady hold on a 4 FPS camera");
  assert.equal(result.state.frames, 4);
});

test("natural pose variation does not lock the capture controls", () => {
  const points = alignedFace();
  points[1].x = 0.53;
  points[263].y = 0.42;
  assert.equal(analyzeFacePosition(points, 1, 1280, 720).status, "ready");
});


test("face guidance follows the visible square crop on landscape and portrait cameras", () => {
  const square = alignedFace();
  const toCamera = (width: number, height: number) => {
    const visible = Math.min(width, height);
    return square.map(point => ({
      x: (point.x * visible + (width - visible) / 2) / width,
      y: (point.y * visible + (height - visible) / 2) / height,
      z: point.z
    }));
  };
  for (const [width, height] of [[720, 720], [1280, 720], [720, 1280]]) {
    assert.equal(analyzeFacePosition(toCamera(width, height), 1, width, height).status, "ready");
  }
  const clipped = toCamera(1280, 720);
  clipped[10].y = -0.01;
  assert.equal(analyzeFacePosition(clipped, 1, 1280, 720).status, "face_clipped");
});


function realisticIrisSample(irisDiameterPx: number, capturedAt: number) {
  const points = alignedFace();
  const place = (index: number, x: number, y: number) => { points[index] = { x: x / 1280, y: y / 1280, z: 0 }; };
  place(234, 295, 640); place(454, 985, 640);
  place(10, 640, 250); place(152, 640, 1000);
  place(468, 482.5, 500); place(473, 797.5, 500);
  place(129, 555, 640); place(358, 725, 640);
  place(54, 390, 350); place(284, 890, 350);
  place(116, 300, 600); place(345, 980, 600);
  place(172, 400, 850); place(397, 880, 850);
  place(469, 482.5 - irisDiameterPx / 2, 500); place(471, 482.5 + irisDiameterPx / 2, 500);
  place(474, 797.5 - irisDiameterPx / 2, 500); place(476, 797.5 + irisDiameterPx / 2, 500);
  return { landmarks: points, width: 1280, height: 1280, capturedAt };
}

test("iris estimate uses the middle of stable frames and rejects an outlier", () => {
  const samples = [58, 58.5, 59, 58.2, 35].map((diameter, index) => realisticIrisSample(diameter, index * 250));
  const aggregate = computeIrisMeasurementFromSamples(samples);
  assert.equal(aggregate.sampleCount, 4);
  assert.ok(Math.abs(aggregate.result.faceWidthMm! - 139) < 3);
  assert.equal(aggregate.result.measurementQuality, "Approximate");
  assert.equal(aggregate.calibration.method, "heuristic");
});

test("iris estimate asks for another scan when too few frames are usable", () => {
  const samples = [58, 58, 2, 2].map((diameter, index) => realisticIrisSample(diameter, index * 250));
  assert.throws(() => computeIrisMeasurementFromSamples(samples), /steady measurement/);
});

test("iris estimate rejects unstable scales rather than saving a misleading result", () => {
  const samples = [30, 45, 60, 75, 95].map((diameter, index) => realisticIrisSample(diameter, index * 250));
  assert.throws(() => computeIrisMeasurementFromSamples(samples), /changed while scanning/);
});
