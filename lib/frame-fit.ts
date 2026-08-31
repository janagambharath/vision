// ─── FRAME FIT SCORING ENGINE ───
// Pure functions for calculating how well a frame fits a customer's face.
// No database, no UI — just math. All thresholds are configurable.

// ─── TYPES ───

export type FitLevel = "Excellent" | "Good" | "Possible" | "Less Suitable";

export interface FitResult {
  fitScore: number; // 0–100
  fitLevel: FitLevel;
  reasons: string[];
}

export interface FaceMeasurements {
  faceWidthMm: number | null;
  faceHeightMm: number | null;
  estimatedPdMm: number | null;
  interocularWidthMm: number | null;
  noseWidthMm: number | null;
  faceShape: FaceShape | null;
  recommendedSize: FrameSize | null;
  measurementQuality: MeasurementQuality;
  calibrationMethod: CalibrationMethod;
}

export type FaceShape = "Oval" | "Round" | "Square" | "Heart" | "Diamond" | "Oblong" | "Triangle";

export type FrameSize = "Small" | "Medium" | "Large" | "Extra Large";

export type MeasurementQuality = "Good" | "Fair" | "Approximate";

export type CalibrationMethod = "card" | "heuristic";

export interface ProductMeasurements {
  frameWidth: number | null;
  lensWidth: number | null;
  bridgeWidth: number | null;
  templeLength: number | null;
  frameHeight: number | null;
  faceShapes: string[]; // compatible face shapes
}

// ─── CONFIGURABLE THRESHOLDS ───

export const FIT_THRESHOLDS = {
  /** Fit score boundaries */
  excellent: 90,
  good: 75,
  possible: 60,

  /** Frame width tolerance: how many mm wider/narrower is acceptable */
  frameWidthIdealToleranceMm: 4,    // within ±4mm → full score
  frameWidthAcceptableToleranceMm: 10, // within ±10mm → partial score
  frameWidthWeight: 0.35,            // 35% of total score

  /** Lens width scoring */
  lensWidthIdealToleranceMm: 3,
  lensWidthAcceptableToleranceMm: 8,
  lensWidthWeight: 0.15,

  /** Bridge width scoring */
  bridgeWidthIdealToleranceMm: 2,
  bridgeWidthAcceptableToleranceMm: 5,
  bridgeWidthWeight: 0.15,

  /** Temple length scoring */
  templeLengthIdealToleranceMm: 5,
  templeLengthAcceptableToleranceMm: 15,
  templeLengthWeight: 0.10,

  /** Face shape compatibility */
  faceShapeWeight: 0.15,

  /** PD/bridge alignment */
  pdAlignmentWeight: 0.10,
} as const;

/** Recommended frame width range relative to face width */
export const FRAME_WIDTH_RANGE = {
  minOffset: -4,   // frame can be 4mm narrower than face
  maxOffset: 6,    // frame can be 6mm wider than face
} as const;

/** Size classification breakpoints (face width in mm) */
export const SIZE_BREAKPOINTS = {
  small: 125,      // < 125mm face width
  medium: 138,     // 125–138mm
  large: 148,      // 138–148mm
  // > 148mm = Extra Large
} as const;

/** Face shape → frame shape compatibility mapping */
export const FACE_SHAPE_FRAME_GUIDE: Record<FaceShape, { recommended: string[]; description: string }> = {
  Oval: {
    recommended: ["Rectangle", "Square", "Geometric", "Aviator", "Wayfarer"],
    description: "Most frame shapes complement an oval face. Rectangular and geometric frames add definition."
  },
  Round: {
    recommended: ["Rectangle", "Square", "Cat-Eye", "Geometric", "Angular"],
    description: "Angular and rectangular frames help define and elongate circular features."
  },
  Square: {
    recommended: ["Round", "Oval", "Aviator", "Cat-Eye", "Rimless"],
    description: "Round and oval frames soften strong jawline angles."
  },
  Heart: {
    recommended: ["Round", "Oval", "Rectangle", "Rimless", "Aviator"],
    description: "Bottom-heavy or rounded frames balance a wider forehead."
  },
  Diamond: {
    recommended: ["Oval", "Cat-Eye", "Rimless", "Rectangle"],
    description: "Frames that are wider than the cheekbones complement diamond faces."
  },
  Oblong: {
    recommended: ["Oversized", "Round", "Square", "Aviator", "Wayfarer"],
    description: "Wider or deeper frames add width and break the vertical line."
  },
  Triangle: {
    recommended: ["Cat-Eye", "Aviator", "Round", "Semi-Rimless"],
    description: "Top-heavy frames balance a wider jawline."
  },
};

// ─── CORE SCORING FUNCTIONS ───

/**
 * Calculate how well a frame fits a customer's estimated face measurements.
 *
 * Returns a score (0–100), a human-readable fit level, and an array of
 * reasons explaining the score.
 */
export function calculateFrameFit(
  face: FaceMeasurements,
  product: ProductMeasurements
): FitResult {
  const scores: { weight: number; score: number; reason: string }[] = [];

  // 1. Frame width vs face width (most important)
  if (face.faceWidthMm != null && product.frameWidth != null) {
    const diff = Math.abs(product.frameWidth - face.faceWidthMm);
    const isWider = product.frameWidth > face.faceWidthMm;
    const isNarrower = product.frameWidth < face.faceWidthMm;

    let score: number;
    if (diff <= FIT_THRESHOLDS.frameWidthIdealToleranceMm) {
      score = 100;
    } else if (diff <= FIT_THRESHOLDS.frameWidthAcceptableToleranceMm) {
      const range = FIT_THRESHOLDS.frameWidthAcceptableToleranceMm - FIT_THRESHOLDS.frameWidthIdealToleranceMm;
      score = 100 - ((diff - FIT_THRESHOLDS.frameWidthIdealToleranceMm) / range) * 60;
    } else {
      score = Math.max(0, 40 - (diff - FIT_THRESHOLDS.frameWidthAcceptableToleranceMm) * 3);
    }

    let reason: string;
    if (score >= 90) {
      reason = "Frame width closely matches your face width";
    } else if (isNarrower) {
      reason = `Frame may feel narrow (${Math.round(diff)}mm narrower than face)`;
    } else if (isWider) {
      reason = `Frame is ${Math.round(diff)}mm wider than your face`;
    } else {
      reason = "Frame width alignment checked";
    }

    scores.push({ weight: FIT_THRESHOLDS.frameWidthWeight, score, reason });
  }

  // 2. Lens width check
  if (product.lensWidth != null && (face.faceWidthMm != null || face.estimatedPdMm != null)) {
    // Proportional optical standard: lens width is ~38% of face width (e.g. 138mm face -> ~52mm lens)
    const idealLensWidth = face.faceWidthMm != null ? face.faceWidthMm * 0.38 : (face.estimatedPdMm! - 18) * 1.15;
    const diff = Math.abs(product.lensWidth - idealLensWidth);

    let score: number;
    if (diff <= FIT_THRESHOLDS.lensWidthIdealToleranceMm) {
      score = 100;
    } else if (diff <= FIT_THRESHOLDS.lensWidthAcceptableToleranceMm) {
      const range = FIT_THRESHOLDS.lensWidthAcceptableToleranceMm - FIT_THRESHOLDS.lensWidthIdealToleranceMm;
      score = 100 - ((diff - FIT_THRESHOLDS.lensWidthIdealToleranceMm) / range) * 50;
    } else {
      score = Math.max(0, 50 - (diff - FIT_THRESHOLDS.lensWidthAcceptableToleranceMm) * 4);
    }

    scores.push({
      weight: FIT_THRESHOLDS.lensWidthWeight,
      score,
      reason: score >= 80 ? "Lens width suits your facial proportions" : "Lens width may not align ideally with your proportions"
    });
  }

  // 3. Bridge width vs nose width
  if (face.noseWidthMm != null && product.bridgeWidth != null) {
    const diff = Math.abs(product.bridgeWidth - face.noseWidthMm);

    let score: number;
    if (diff <= FIT_THRESHOLDS.bridgeWidthIdealToleranceMm) {
      score = 100;
    } else if (diff <= FIT_THRESHOLDS.bridgeWidthAcceptableToleranceMm) {
      const range = FIT_THRESHOLDS.bridgeWidthAcceptableToleranceMm - FIT_THRESHOLDS.bridgeWidthIdealToleranceMm;
      score = 100 - ((diff - FIT_THRESHOLDS.bridgeWidthIdealToleranceMm) / range) * 50;
    } else {
      score = Math.max(0, 50 - (diff - FIT_THRESHOLDS.bridgeWidthAcceptableToleranceMm) * 5);
    }

    scores.push({
      weight: FIT_THRESHOLDS.bridgeWidthWeight,
      score,
      reason: score >= 80 ? "Bridge width fits your nose well" : "Bridge width may feel uncomfortable"
    });
  }

  // 4. Temple length (general comfort)
  if (product.templeLength != null) {
    // Standard adult temple lengths: 135–150mm. Score based on being in range.
    const idealMin = 135;
    const idealMax = 150;
    let score = 100;
    if (product.templeLength < idealMin) {
      score = Math.max(30, 100 - (idealMin - product.templeLength) * 5);
    } else if (product.templeLength > idealMax) {
      score = Math.max(30, 100 - (product.templeLength - idealMax) * 5);
    }

    scores.push({
      weight: FIT_THRESHOLDS.templeLengthWeight,
      score,
      reason: score >= 80 ? "Temple length is comfortable" : "Temple length may need adjustment"
    });
  }

  // 5. Face shape compatibility
  if (face.faceShape != null && product.faceShapes.length > 0) {
    const faceShapeLower = face.faceShape.toLowerCase();
    const isCompatible = product.faceShapes.some(
      (s) => s.toLowerCase() === faceShapeLower
    );

    scores.push({
      weight: FIT_THRESHOLDS.faceShapeWeight,
      score: isCompatible ? 100 : 50,
      reason: isCompatible
        ? `Frame shape complements your ${face.faceShape} face`
        : `Frame may not be the most flattering for ${face.faceShape} faces`
    });
  }

  // 6. PD / bridge alignment
  if (face.estimatedPdMm != null && product.lensWidth != null && product.bridgeWidth != null) {
    const frameOpticalCenter = product.lensWidth + product.bridgeWidth;
    const diff = Math.abs(frameOpticalCenter - face.estimatedPdMm);

    let score: number;
    if (diff <= 4) score = 100;
    else if (diff <= 10) score = 80;
    else score = Math.max(20, 60 - diff * 2);

    scores.push({
      weight: FIT_THRESHOLDS.pdAlignmentWeight,
      score,
      reason: score >= 80
        ? "Optical center aligns well with your eyes"
        : "Optical alignment may be slightly off"
    });
  }

  // Calculate weighted average
  if (scores.length === 0) {
    return {
      fitScore: 0,
      fitLevel: "Less Suitable",
      reasons: ["Insufficient measurement data to calculate fit"]
    };
  }

  const totalWeight = scores.reduce((sum, s) => sum + s.weight, 0);
  const weightedScore = scores.reduce((sum, s) => sum + s.score * s.weight, 0) / totalWeight;
  const fitScore = Math.round(Math.max(0, Math.min(100, weightedScore)));

  return {
    fitScore,
    fitLevel: getFitLevel(fitScore),
    reasons: scores
      .sort((a, b) => a.score - b.score) // Show worst fits first
      .map((s) => s.reason)
  };
}

/**
 * Convert a numeric score to a human-readable fit level.
 */
export function getFitLevel(score: number): FitLevel {
  if (score >= FIT_THRESHOLDS.excellent) return "Excellent";
  if (score >= FIT_THRESHOLDS.good) return "Good";
  if (score >= FIT_THRESHOLDS.possible) return "Possible";
  return "Less Suitable";
}

/**
 * Classify face width into a standard frame size.
 */
export function classifyFrameSize(faceWidthMm: number): FrameSize {
  if (faceWidthMm < SIZE_BREAKPOINTS.small) return "Small";
  if (faceWidthMm < SIZE_BREAKPOINTS.medium) return "Medium";
  if (faceWidthMm < SIZE_BREAKPOINTS.large) return "Large";
  return "Extra Large";
}

/**
 * Calculate the recommended frame width range for a given face width.
 */
export function recommendedFrameWidthRange(faceWidthMm: number): { min: number; max: number } {
  return {
    min: Math.round(faceWidthMm + FRAME_WIDTH_RANGE.minOffset),
    max: Math.round(faceWidthMm + FRAME_WIDTH_RANGE.maxOffset),
  };
}

/**
 * Get the face shape guide for a given face shape.
 */
export function getFaceShapeGuide(shape: FaceShape) {
  return FACE_SHAPE_FRAME_GUIDE[shape];
}

/**
 * Batch-score an array of products against face measurements.
 * Returns products sorted by fit score (best first).
 */
export function rankProductsByFit<T extends ProductMeasurements>(
  face: FaceMeasurements,
  products: T[]
): (T & { fit: FitResult })[] {
  return products
    .map((product) => ({
      ...product,
      fit: calculateFrameFit(face, product),
    }))
    .sort((a, b) => b.fit.fitScore - a.fit.fitScore);
}
