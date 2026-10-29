import type { CalibrationMethod, FaceMeasurements, FaceShape, FrameSize, MeasurementQuality } from "./frame-fit";

const FACE_SHAPES: FaceShape[] = ["Oval", "Round", "Square", "Heart", "Diamond", "Oblong", "Triangle"];
const FRAME_SIZES: FrameSize[] = ["Small", "Medium", "Large", "Extra Large"];
const MEASUREMENT_QUALITIES: MeasurementQuality[] = ["Good", "Fair", "Approximate"];
const CALIBRATION_METHODS: CalibrationMethod[] = ["card", "heuristic"];

function isOneOf<T extends string>(value: unknown, options: readonly T[]): value is T {
  return typeof value === "string" && options.includes(value as T);
}

function nullableNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}

export function parseStoredFaceMeasurements(value: string): FaceMeasurements | null {
  try {
    const parsed: unknown = JSON.parse(value);
    if (!parsed || typeof parsed !== "object") return null;

    const stored = parsed as Record<string, unknown>;
    const measurements: FaceMeasurements = {
      faceWidthMm: nullableNumber(stored.faceWidthMm),
      faceHeightMm: nullableNumber(stored.faceHeightMm),
      estimatedPdMm: nullableNumber(stored.estimatedPdMm),
      interocularWidthMm: nullableNumber(stored.interocularWidthMm),
      noseWidthMm: nullableNumber(stored.noseWidthMm),
      faceShape: isOneOf(stored.faceShape, FACE_SHAPES) ? stored.faceShape : null,
      recommendedSize: isOneOf(stored.recommendedSize, FRAME_SIZES) ? stored.recommendedSize : null,
      measurementQuality: isOneOf(stored.measurementQuality, MEASUREMENT_QUALITIES) ? stored.measurementQuality : "Approximate",
      calibrationMethod: isOneOf(stored.calibrationMethod, CALIBRATION_METHODS) ? stored.calibrationMethod : "heuristic",
    };

    return measurements.faceWidthMm != null ? measurements : null;
  } catch {
    return null;
  }
}
