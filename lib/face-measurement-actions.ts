"use server";

// ─── FACE MEASUREMENT SERVER ACTIONS ───
// Persist face measurement results and fetch recommended products.

import { prisma } from "@/lib/db";
import { cookies } from "next/headers";
import { CART_COOKIE } from "@/lib/constants";
import { getAdminAccess } from "@/lib/admin-auth";
import type { FaceMeasurements, FitResult, ProductMeasurements } from "@/lib/frame-fit";
import { calculateFrameFit } from "@/lib/frame-fit";

// ─── TYPES ───

export interface SaveMeasurementInput {
  faceWidthMm: number | null;
  faceHeightMm: number | null;
  estimatedPdMm: number | null;
  interocularWidthMm: number | null;
  noseWidthMm: number | null;
  faceShape: string | null;
  recommendedSize: string | null;
  measurementQuality: string;
  calibrationMethod: string;
  calibrationConfidence: number;
}

export interface RecommendedProduct {
  slug: string;
  name: string;
  brand: string;
  pricePaise: number | null;
  compareAtPaise: number | null;
  material: string | null;
  shape: string | null;
  size: string | null;
  frameWidth: number | null;
  lensWidth: number | null;
  bridgeWidth: number | null;
  templeLength: number | null;
  frameHeight: number | null;
  faceShapes: string[];
  image: { url: string; alt: string } | null;
  fit: FitResult;
}

// ─── SAVE MEASUREMENT ───

/**
 * Persist a face measurement to the database and return the record ID.
 * The session ID is taken from the cart cookie for anonymous users.
 */
export async function saveFaceMeasurement(input: SaveMeasurementInput): Promise<{ id: string }> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(CART_COOKIE)?.value ?? crypto.randomUUID();

  const record = await prisma.faceMeasurement.create({
    data: {
      sessionId,
      faceWidthMm: input.faceWidthMm,
      faceHeightMm: input.faceHeightMm,
      estimatedPdMm: input.estimatedPdMm,
      interocularWidthMm: input.interocularWidthMm,
      noseWidthMm: input.noseWidthMm,
      faceShape: input.faceShape,
      recommendedSize: input.recommendedSize,
      measurementQuality: input.measurementQuality,
      calibrationMethod: input.calibrationMethod,
      calibrationConfidence: input.calibrationConfidence,
    },
  });

  return { id: record.id };
}

// ─── GET RECOMMENDED PRODUCTS ───

/**
 * Fetch active products with frame measurements and score them against
 * the user's face measurements. Returns products sorted by fit score.
 */
export async function getRecommendedProducts(
  faceMeasurements: FaceMeasurements
): Promise<RecommendedProduct[]> {
  // Only fetch products that have at least a frame width defined
  const products = await prisma.product.findMany({
    where: {
      status: "ACTIVE",
      deletedAt: null,
      pricePaise: { not: null },
      frameWidth: { not: null },
    },
    select: {
      slug: true,
      name: true,
      brand: true,
      pricePaise: true,
      compareAtPaise: true,
      material: true,
      shape: true,
      size: true,
      frameWidth: true,
      lensWidth: true,
      bridgeWidth: true,
      templeLength: true,
      frameHeight: true,
      faceShapes: true,
      images: {
        orderBy: { sortOrder: "asc" },
        take: 1,
        select: { url: true, alt: true },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  // Score each product
  const scored: RecommendedProduct[] = products.map((product) => {
    const productMeasurements: ProductMeasurements = {
      frameWidth: product.frameWidth,
      lensWidth: product.lensWidth,
      bridgeWidth: product.bridgeWidth,
      templeLength: product.templeLength,
      frameHeight: product.frameHeight,
      faceShapes: product.faceShapes,
    };

    const fit = calculateFrameFit(faceMeasurements, productMeasurements);

    return {
      slug: product.slug,
      name: product.name,
      brand: product.brand,
      pricePaise: product.pricePaise,
      compareAtPaise: product.compareAtPaise,
      material: product.material,
      shape: product.shape,
      size: product.size,
      frameWidth: product.frameWidth,
      lensWidth: product.lensWidth,
      bridgeWidth: product.bridgeWidth,
      templeLength: product.templeLength,
      frameHeight: product.frameHeight,
      faceShapes: product.faceShapes,
      image: product.images[0] ?? null,
      fit,
    };
  });

  // Sort by fit score (best first)
  scored.sort((a, b) => b.fit.fitScore - a.fit.fitScore);

  return scored;
}

// ─── ADMIN ANALYTICS ───

export interface FaceScannerStats {
  totalScans: number;
  averageConfidence: number;
  faceShapeDistribution: { shape: string; count: number }[];
  calibrationMethodBreakdown: { method: string; count: number }[];
  qualityBreakdown: { quality: string; count: number }[];
  recentScans: {
    id: string;
    faceShape: string | null;
    recommendedSize: string | null;
    measurementQuality: string | null;
    calibrationMethod: string | null;
    createdAt: Date;
  }[];
}

export async function getFaceScannerStats(): Promise<FaceScannerStats> {
  // The page that renders these analytics is protected, but server actions
  // are independently callable. Enforce the same active-admin check here so
  // recent scan data cannot be read by invoking the action directly.
  if (!(await getAdminAccess())) {
    throw new Error("Unauthorized");
  }

  const [
    totalScans,
    avgConfidence,
    allMeasurements,
    recentScans,
  ] = await Promise.all([
    prisma.faceMeasurement.count(),
    prisma.faceMeasurement.aggregate({
      _avg: { calibrationConfidence: true },
    }),
    prisma.faceMeasurement.findMany({
      select: {
        faceShape: true,
        calibrationMethod: true,
        measurementQuality: true,
      },
    }),
    prisma.faceMeasurement.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        faceShape: true,
        recommendedSize: true,
        measurementQuality: true,
        calibrationMethod: true,
        createdAt: true,
      },
    }),
  ]);

  // Aggregate face shape distribution
  const shapeMap = new Map<string, number>();
  const methodMap = new Map<string, number>();
  const qualityMap = new Map<string, number>();

  for (const m of allMeasurements) {
    if (m.faceShape) shapeMap.set(m.faceShape, (shapeMap.get(m.faceShape) ?? 0) + 1);
    if (m.calibrationMethod) methodMap.set(m.calibrationMethod, (methodMap.get(m.calibrationMethod) ?? 0) + 1);
    if (m.measurementQuality) qualityMap.set(m.measurementQuality, (qualityMap.get(m.measurementQuality) ?? 0) + 1);
  }

  return {
    totalScans,
    averageConfidence: avgConfidence._avg.calibrationConfidence ?? 0,
    faceShapeDistribution: Array.from(shapeMap, ([shape, count]) => ({ shape, count }))
      .sort((a, b) => b.count - a.count),
    calibrationMethodBreakdown: Array.from(methodMap, ([method, count]) => ({ method, count }))
      .sort((a, b) => b.count - a.count),
    qualityBreakdown: Array.from(qualityMap, ([quality, count]) => ({ quality, count }))
      .sort((a, b) => b.count - a.count),
    recentScans,
  };
}
