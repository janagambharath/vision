// ─── FACE MEASUREMENT ENGINE ───
// Pure functions for processing MediaPipe Face Landmarker results into
// face measurements, face shape classification, and calibration math.
//
// This module runs entirely in the browser. It does NOT call any API.
// It does NOT use Gemini or any AI image model for measurement.

import type { FaceShape, MeasurementQuality, CalibrationMethod, FrameSize } from "@/lib/frame-fit";
import { classifyFrameSize } from "@/lib/frame-fit";

// ─── TYPES ───

/** A normalized 3D landmark from MediaPipe (x, y, z are 0..1 relative to image). */
export interface NormalizedLandmark {
  x: number;
  y: number;
  z: number;
}

export interface FaceMeasurementResult {
  faceWidthMm: number | null;
  faceHeightMm: number | null;
  estimatedPdMm: number | null;
  interocularWidthMm: number | null;
  noseWidthMm: number | null;
  faceShape: FaceShape | null;
  recommendedSize: FrameSize | null;
  measurementQuality: MeasurementQuality;
  calibrationMethod: CalibrationMethod;
  rawPixelMeasurements: RawPixelMeasurements;
}

export interface RawPixelMeasurements {
  faceWidthPx: number;
  faceHeightPx: number;
  eyeDistancePx: number;
  leftPupilPx: { x: number; y: number };
  rightPupilPx: { x: number; y: number };
  noseWidthPx: number;
}

export interface CalibrationResult {
  pixelsPerMm: number;
  confidence: number; // 0..1
  method: CalibrationMethod;
}

// ─── MEDIAPIPE LANDMARK INDICES ───
// Based on MediaPipe Face Landmarker's 478-landmark model.

const LANDMARK = {
  // Face boundary
  leftCheek: 234,       // Left outer edge of face
  rightCheek: 454,      // Right outer edge of face
  foreheadTop: 10,      // Top of forehead
  chinBottom: 152,      // Bottom of chin

  // Eyes — iris center landmarks (478 model)
  leftIrisCenter: 468,  // Left iris center
  rightIrisCenter: 473, // Right iris center

  // Eye corners (for fallback PD estimation)
  leftEyeInner: 133,    // Left eye inner corner
  rightEyeInner: 362,   // Right eye inner corner
  leftEyeOuter: 33,     // Left eye outer corner
  rightEyeOuter: 263,   // Right eye outer corner

  // Nose
  noseLeftAla: 129,     // Left nostril width
  noseRightAla: 358,    // Right nostril width
  noseTip: 1,           // Nose tip
  noseBridge: 6,        // Top of nose bridge

  // Jaw
  jawLeft: 234,
  jawRight: 454,
  jawMidLeft: 172,
  jawMidRight: 397,

  // Forehead / temples
  templeLeft: 21,
  templeRight: 251,
  foreheadLeft: 54,
  foreheadRight: 284,

  // Cheekbones
  cheekboneLeft: 116,
  cheekboneRight: 345,
} as const;

// ─── STANDARD REFERENCE VALUES ───

/** Average adult iris diameter in mm (used for heuristic calibration) */
const AVERAGE_IRIS_DIAMETER_MM = 11.7;

/** Standard bank/credit card dimensions in mm */
export const STANDARD_CARD = {
  widthMm: 85.6,
  heightMm: 53.98,
} as const;

// ─── UTILITY FUNCTIONS ───

function distance2D(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

function toPixelCoords(
  landmark: NormalizedLandmark,
  imageWidth: number,
  imageHeight: number
): { x: number; y: number } {
  return {
    x: landmark.x * imageWidth,
    y: landmark.y * imageHeight,
  };
}

// ─── CALIBRATION ───

/**
 * Calculate pixels-per-mm using a known reference card.
 *
 * The caller provides the four corner coordinates of the detected card
 * in pixel space. We compute the average of the two longer edges and
 * divide by the known card width (85.6mm).
 */
export function calibrateWithCard(
  cardCorners: { topLeft: { x: number; y: number }; topRight: { x: number; y: number }; bottomLeft: { x: number; y: number }; bottomRight: { x: number; y: number } }
): CalibrationResult {
  const topEdge = distance2D(cardCorners.topLeft, cardCorners.topRight);
  const bottomEdge = distance2D(cardCorners.bottomLeft, cardCorners.bottomRight);
  const leftEdge = distance2D(cardCorners.topLeft, cardCorners.bottomLeft);
  const rightEdge = distance2D(cardCorners.topRight, cardCorners.bottomRight);

  // Determine which pair is the width and which is the height. Comparing the
  // two averaged edge pairs preserves the card's 1.586:1 aspect ratio.
  const horizontalEdge = (topEdge + bottomEdge) / 2;
  const verticalEdge = (leftEdge + rightEdge) / 2;
  const avgLong = Math.max(horizontalEdge, verticalEdge);
  const avgShort = Math.min(horizontalEdge, verticalEdge);

  // Check aspect ratio to validate it's a real card
  const aspect = avgLong / avgShort;
  const expectedAspect = STANDARD_CARD.widthMm / STANDARD_CARD.heightMm;
  const aspectError = Math.abs(aspect - expectedAspect) / expectedAspect;

  let confidence: number;
  if (aspectError < 0.05) confidence = 0.95;
  else if (aspectError < 0.10) confidence = 0.80;
  else if (aspectError < 0.20) confidence = 0.60;
  else confidence = 0.35;

  // Use the longer dimension as card width
  const cardWidthPx = avgLong;

  const pixelsPerMm = cardWidthPx / STANDARD_CARD.widthMm;

  return { pixelsPerMm, confidence, method: "card" };
}

/**
 * Estimate pixels-per-mm using iris diameter heuristic.
 *
 * The average human iris is ~11.7mm in diameter. We measure the iris
 * width in pixels and compute an approximate scale factor.
 *
 * This is less accurate than card calibration but enables measurement
 * without any physical reference.
 */
export function calibrateWithIris(
  landmarks: NormalizedLandmark[],
  imageWidth: number,
  imageHeight: number
): CalibrationResult {
  // MediaPipe 478 model: landmarks 468–472 are left iris, 473–477 are right iris
  // Iris landmark layout: center, left, top, right, bottom (like a cross)
  if (landmarks.length < 478) {
    // Fallback: use inter-eye distance with statistical average PD
    const leftEyeInner = toPixelCoords(landmarks[LANDMARK.leftEyeInner], imageWidth, imageHeight);
    const rightEyeInner = toPixelCoords(landmarks[LANDMARK.rightEyeInner], imageWidth, imageHeight);
    const interEyePx = distance2D(leftEyeInner, rightEyeInner);
    // Average inner interpupillary distance ~30mm
    const pixelsPerMm = interEyePx / 30;
    return { pixelsPerMm, confidence: 0.45, method: "heuristic" };
  }

  // Use iris landmarks for better accuracy
  const leftIrisLeft = toPixelCoords(landmarks[469], imageWidth, imageHeight);
  const leftIrisRight = toPixelCoords(landmarks[471], imageWidth, imageHeight);
  const rightIrisLeft = toPixelCoords(landmarks[474], imageWidth, imageHeight);
  const rightIrisRight = toPixelCoords(landmarks[476], imageWidth, imageHeight);

  const leftIrisDiameterPx = distance2D(leftIrisLeft, leftIrisRight);
  const rightIrisDiameterPx = distance2D(rightIrisLeft, rightIrisRight);
  const avgIrisDiameterPx = (leftIrisDiameterPx + rightIrisDiameterPx) / 2;

  if (avgIrisDiameterPx < 5) {
    // Too small to be reliable
    return { pixelsPerMm: 1, confidence: 0.2, method: "heuristic" };
  }

  const pixelsPerMm = avgIrisDiameterPx / AVERAGE_IRIS_DIAMETER_MM;

  // Confidence depends on how symmetric the two iris measurements are
  const irisDiff = Math.abs(leftIrisDiameterPx - rightIrisDiameterPx) / avgIrisDiameterPx;
  let confidence: number;
  if (irisDiff < 0.08) confidence = 0.72;
  else if (irisDiff < 0.15) confidence = 0.60;
  else confidence = 0.45;

  return { pixelsPerMm, confidence, method: "heuristic" };
}

// ─── FACE MEASUREMENTS ───

/**
 * Compute face measurements from MediaPipe landmarks and a calibration scale.
 */
export function computeFaceMeasurements(
  landmarks: NormalizedLandmark[],
  imageWidth: number,
  imageHeight: number,
  calibration: CalibrationResult
): FaceMeasurementResult {
  const { pixelsPerMm, method: calibrationMethod } = calibration;

  // Get pixel coordinates for key landmarks
  const leftCheek = toPixelCoords(landmarks[LANDMARK.leftCheek], imageWidth, imageHeight);
  const rightCheek = toPixelCoords(landmarks[LANDMARK.rightCheek], imageWidth, imageHeight);
  const foreheadTop = toPixelCoords(landmarks[LANDMARK.foreheadTop], imageWidth, imageHeight);
  const chinBottom = toPixelCoords(landmarks[LANDMARK.chinBottom], imageWidth, imageHeight);
  const noseLeft = toPixelCoords(landmarks[LANDMARK.noseLeftAla], imageWidth, imageHeight);
  const noseRight = toPixelCoords(landmarks[LANDMARK.noseRightAla], imageWidth, imageHeight);

  // Raw pixel measurements
  const faceWidthPx = distance2D(leftCheek, rightCheek);
  const faceHeightPx = distance2D(foreheadTop, chinBottom);
  const noseWidthPx = distance2D(noseLeft, noseRight);

  // Eye positions
  let leftPupilPx: { x: number; y: number };
  let rightPupilPx: { x: number; y: number };

  if (landmarks.length >= 478) {
    // Use iris center landmarks
    leftPupilPx = toPixelCoords(landmarks[LANDMARK.leftIrisCenter], imageWidth, imageHeight);
    rightPupilPx = toPixelCoords(landmarks[LANDMARK.rightIrisCenter], imageWidth, imageHeight);
  } else {
    // Fallback: midpoint of eye corners
    const leftInner = toPixelCoords(landmarks[LANDMARK.leftEyeInner], imageWidth, imageHeight);
    const leftOuter = toPixelCoords(landmarks[LANDMARK.leftEyeOuter], imageWidth, imageHeight);
    const rightInner = toPixelCoords(landmarks[LANDMARK.rightEyeInner], imageWidth, imageHeight);
    const rightOuter = toPixelCoords(landmarks[LANDMARK.rightEyeOuter], imageWidth, imageHeight);
    leftPupilPx = { x: (leftInner.x + leftOuter.x) / 2, y: (leftInner.y + leftOuter.y) / 2 };
    rightPupilPx = { x: (rightInner.x + rightOuter.x) / 2, y: (rightInner.y + rightOuter.y) / 2 };
  }
  const eyeDistancePx = distance2D(leftPupilPx, rightPupilPx);

  const rawPixelMeasurements: RawPixelMeasurements = {
    faceWidthPx,
    faceHeightPx,
    eyeDistancePx,
    leftPupilPx,
    rightPupilPx,
    noseWidthPx,
  };

  // Convert to millimeters
  const faceWidthMm = round1(faceWidthPx / pixelsPerMm);
  const faceHeightMm = round1(faceHeightPx / pixelsPerMm);
  const estimatedPdMm = round1(eyeDistancePx / pixelsPerMm);
  const interocularWidthMm = estimatedPdMm;
  const noseWidthMm = round1(noseWidthPx / pixelsPerMm);

  // Classify face shape
  const faceShape = classifyFaceShape(landmarks, imageWidth, imageHeight);

  // Classify recommended size
  const recommendedSize = faceWidthMm ? classifyFrameSize(faceWidthMm) : null;

  // Determine measurement quality
  let measurementQuality: MeasurementQuality;
  if (calibrationMethod === "card" && calibration.confidence >= 0.75) {
    measurementQuality = "Good";
  } else if (calibration.confidence >= 0.55) {
    measurementQuality = "Fair";
  } else {
    measurementQuality = "Approximate";
  }

  return {
    faceWidthMm,
    faceHeightMm,
    estimatedPdMm,
    interocularWidthMm,
    noseWidthMm,
    faceShape,
    recommendedSize,
    measurementQuality,
    calibrationMethod,
    rawPixelMeasurements,
  };
}

// ─── FACE SHAPE CLASSIFICATION ───

/**
 * Classify face shape based on geometric ratios of facial landmarks.
 *
 * Uses the following ratios:
 * - Face width / face height (aspect ratio)
 * - Forehead width / jaw width
 * - Cheekbone width relative to forehead and jaw
 */
export function classifyFaceShape(
  landmarks: NormalizedLandmark[],
  imageWidth: number,
  imageHeight: number
): FaceShape {
  const forehead = {
    left: toPixelCoords(landmarks[LANDMARK.foreheadLeft], imageWidth, imageHeight),
    right: toPixelCoords(landmarks[LANDMARK.foreheadRight], imageWidth, imageHeight),
  };
  const cheekbone = {
    left: toPixelCoords(landmarks[LANDMARK.cheekboneLeft], imageWidth, imageHeight),
    right: toPixelCoords(landmarks[LANDMARK.cheekboneRight], imageWidth, imageHeight),
  };
  const jaw = {
    left: toPixelCoords(landmarks[LANDMARK.jawMidLeft], imageWidth, imageHeight),
    right: toPixelCoords(landmarks[LANDMARK.jawMidRight], imageWidth, imageHeight),
  };
  const foreheadTop = toPixelCoords(landmarks[LANDMARK.foreheadTop], imageWidth, imageHeight);
  const chin = toPixelCoords(landmarks[LANDMARK.chinBottom], imageWidth, imageHeight);

  const foreheadWidth = distance2D(forehead.left, forehead.right);
  const cheekboneWidth = distance2D(cheekbone.left, cheekbone.right);
  const jawWidth = distance2D(jaw.left, jaw.right);
  const faceHeight = distance2D(foreheadTop, chin);
  const faceWidth = Math.max(foreheadWidth, cheekboneWidth, jawWidth);

  const aspectRatio = faceWidth / faceHeight;
  const foreheadToJaw = foreheadWidth / jawWidth;
  const cheekboneToCheekbone = cheekboneWidth / faceWidth;

  // Classification logic based on facial geometry
  if (aspectRatio > 0.85) {
    // Wide face
    if (foreheadToJaw > 1.1 && cheekboneToCheekbone > 0.9) {
      return "Heart";
    }
    if (Math.abs(foreheadToJaw - 1.0) < 0.12) {
      return "Square";
    }
    return "Round";
  }

  if (aspectRatio < 0.68) {
    return "Oblong";
  }

  // Medium aspect ratio
  if (cheekboneToCheekbone > 0.95 && foreheadToJaw > 0.85 && foreheadToJaw < 1.15) {
    // Cheekbones are the widest, balanced forehead and jaw
    return "Diamond";
  }

  if (foreheadToJaw < 0.85) {
    return "Triangle";
  }

  if (foreheadToJaw > 1.15) {
    return "Heart";
  }

  // Balanced proportions = Oval
  return "Oval";
}

// ─── FACE POSITION GUIDANCE ───

export type FaceGuidanceStatus =
  | "no_face"
  | "multiple_faces"
  | "too_far"
  | "too_close"
  | "too_left"
  | "too_right"
  | "too_high"
  | "too_low"
  | "head_tilted"
  | "ready";

export interface FaceGuidance {
  status: FaceGuidanceStatus;
  message: string;
  confidence: number;
}

/**
 * Analyze face position and provide guidance to the user.
 */
export function analyzeFacePosition(
  landmarks: NormalizedLandmark[] | null,
  faceCount: number
): FaceGuidance {
  if (faceCount === 0 || !landmarks || landmarks.length === 0) {
    return { status: "no_face", message: "Position your face inside the guide", confidence: 0 };
  }

  if (faceCount > 1) {
    return { status: "multiple_faces", message: "Only one face should be visible", confidence: 0 };
  }

  // Check if face is centered (nose tip should be near center)
  const noseTip = landmarks[LANDMARK.noseTip];

  // Check horizontal position
  if (noseTip.x < 0.3) {
    return { status: "too_left", message: "Move slightly to the right", confidence: 0.4 };
  }
  if (noseTip.x > 0.7) {
    return { status: "too_right", message: "Move slightly to the left", confidence: 0.4 };
  }

  // Check vertical position
  if (noseTip.y < 0.3) {
    return { status: "too_high", message: "Move your face down a bit", confidence: 0.4 };
  }
  if (noseTip.y > 0.7) {
    return { status: "too_low", message: "Move your face up a bit", confidence: 0.4 };
  }

  // Check face size (too close / too far)
  const leftCheek = landmarks[LANDMARK.leftCheek];
  const rightCheek = landmarks[LANDMARK.rightCheek];
  const faceWidth = Math.abs(rightCheek.x - leftCheek.x);

  if (faceWidth < 0.25) {
    return { status: "too_far", message: "Move closer to the camera", confidence: 0.5 };
  }
  if (faceWidth > 0.75) {
    return { status: "too_close", message: "Move further from the camera", confidence: 0.5 };
  }

  // Check head tilt
  const leftEye = landmarks[LANDMARK.leftEyeOuter];
  const rightEye = landmarks[LANDMARK.rightEyeOuter];
  const eyeTilt = Math.abs(leftEye.y - rightEye.y);
  if (eyeTilt > 0.04) {
    return { status: "head_tilted", message: "Keep your head straight", confidence: 0.5 };
  }

  // All checks passed
  const centeredness = 1 - (Math.abs(noseTip.x - 0.5) + Math.abs(noseTip.y - 0.45));
  const confidence = Math.min(1, Math.max(0.6, centeredness + faceWidth * 0.5));

  return { status: "ready", message: "Hold still — scanning", confidence };
}

// ─── HELPERS ───

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}
