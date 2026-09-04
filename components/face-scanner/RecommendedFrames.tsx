"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Ruler, Scan, Sparkles } from "lucide-react";
import { ProductCard } from "@/components/product-card";
import { FindFrameSizeCTA } from "@/components/face-scanner/FindFrameSizeCTA";
import type { PublicStoreProduct } from "@/lib/inventory";
import { calculateFrameFit, type CalibrationMethod, type FaceMeasurements, type FaceShape, type FrameSize, type MeasurementQuality } from "@/lib/frame-fit";

interface RecommendedFramesProps {
  /** Active storefront products. Products without a frame width are excluded client-side. */
  products: PublicStoreProduct[];
}

const FACE_SHAPES: FaceShape[] = ["Oval", "Round", "Square", "Heart", "Diamond", "Oblong", "Triangle"];
const FRAME_SIZES: FrameSize[] = ["Small", "Medium", "Large", "Extra Large"];
const MEASUREMENT_QUALITIES: MeasurementQuality[] = ["Good", "Fair", "Approximate"];
const CALIBRATION_METHODS: CalibrationMethod[] = ["card", "heuristic"];

function isOneOf<T extends string>(value: unknown, options: readonly T[]): value is T {
  return typeof value === "string" && options.includes(value as T);
}

function nullableNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function parseStoredFaceMeasurements(value: string): FaceMeasurements | null {
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

    const hasUsefulProfileData =
      measurements.faceWidthMm != null ||
      measurements.estimatedPdMm != null ||
      measurements.noseWidthMm != null ||
      measurements.faceShape != null ||
      measurements.recommendedSize != null;

    return hasUsefulProfileData ? measurements : null;
  } catch {
    return null;
  }
}

function hasFrameWidth(product: PublicStoreProduct) {
  return typeof product.frameWidth === "number" && Number.isFinite(product.frameWidth) && product.frameWidth > 0;
}

export function RecommendedFrames({ products }: RecommendedFramesProps) {
  const [faceMeasurements, setFaceMeasurements] = useState<FaceMeasurements | null | undefined>(undefined);

  useEffect(() => {
    setFaceMeasurements(parseStoredFaceMeasurements(window.localStorage.getItem("vv_face_measurements") ?? ""));
  }, []);

  const measuredProducts = useMemo(
    () => products.filter((product) => product.sellable && hasFrameWidth(product)),
    [products]
  );

  const recommendations = useMemo(() => {
    if (!faceMeasurements) return [];

    return measuredProducts
      .map((product) => ({
        product,
        fit: calculateFrameFit(faceMeasurements, {
          frameWidth: product.frameWidth ?? null,
          lensWidth: product.lensWidth ?? null,
          bridgeWidth: product.bridgeWidth ?? null,
          templeLength: product.templeLength ?? null,
          frameHeight: product.frameHeight ?? null,
          faceShapes: product.faceShapes ?? [],
        }),
      }))
      .sort((left, right) => {
        const scoreDifference = right.fit.fitScore - left.fit.fitScore;
        if (scoreDifference !== 0) return scoreDifference;
        if (left.product.featured !== right.product.featured) return Number(right.product.featured) - Number(left.product.featured);
        return left.product.name.localeCompare(right.product.name);
      });
  }, [faceMeasurements, measuredProducts]);

  if (faceMeasurements === undefined) {
    return (
      <section className="vv-section bg-paper" aria-live="polite">
        <div className="vv-container">
          <div className="vv-card p-8 text-center">
            <p className="text-sm font-bold text-slate-600">Preparing your frame recommendations…</p>
          </div>
        </div>
      </section>
    );
  }

  if (!faceMeasurements) {
    return (
      <section className="vv-section bg-paper">
        <div className="vv-container">
          <div className="mx-auto max-w-2xl vv-card p-7 text-center sm:p-10">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-teal-100 text-teal-700">
              <Scan className="h-7 w-7" />
            </div>
            <p className="vv-kicker mt-5 text-retail">Personalised frame picks</p>
            <h1 className="mt-2 text-3xl font-extrabold text-slate-950">Find frames that start with your size.</h1>
            <p className="mx-auto mt-3 max-w-xl text-slate-600">
              Take a quick scan first. We will use your saved frame profile to rank frames with recorded size details.
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <FindFrameSizeCTA variant="inline" />
              <Link href="/frames" className="vv-button-light">
                <ArrowLeft className="h-4 w-4" />
                Browse all frames
              </Link>
            </div>
          </div>
        </div>
      </section>
    );
  }

  if (measuredProducts.length === 0) {
    return (
      <section className="vv-section bg-paper">
        <div className="vv-container">
          <div className="mx-auto max-w-2xl vv-card p-7 text-center sm:p-10">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
              <Ruler className="h-7 w-7" />
            </div>
            <p className="vv-kicker mt-5 text-retail">Recommendations are coming soon</p>
            <h1 className="mt-2 text-3xl font-extrabold text-slate-950">We need frame-size details before we can rank the collection.</h1>
            <p className="mx-auto mt-3 max-w-xl text-slate-600">
              Your profile is saved. As frame widths are added to the catalog, this page will automatically rank the best matches for you.
            </p>
            <Link href="/frames" className="vv-button-retail mt-6">
              Browse all frames
            </Link>
          </div>
        </div>
      </section>
    );
  }

  const profileSummary = [
    faceMeasurements.recommendedSize ? `${faceMeasurements.recommendedSize} frame size` : null,
    faceMeasurements.faceShape ? `${faceMeasurements.faceShape} face shape` : null,
  ].filter(Boolean);

  return (
    <section className="vv-section bg-paper">
      <div className="vv-container">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="vv-kicker flex items-center gap-2 text-retail">
              <Sparkles className="h-4 w-4" />
              Your frame recommendations
            </p>
            <h1 className="mt-2 text-3xl font-extrabold text-slate-950">Best fits from our measured frames.</h1>
            <p className="mt-2 max-w-2xl text-slate-600">
              Ranked using your saved profile and each frame&apos;s recorded width and available dimensions.
            </p>
            {profileSummary.length > 0 ? (
              <p className="mt-3 text-sm font-bold text-teal-800">Profile: {profileSummary.join(" · ")}</p>
            ) : null}
          </div>
          <Link href="/frames" className="vv-button-light">
            <ArrowLeft className="h-4 w-4" />
            Browse all frames
          </Link>
        </div>

        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
          {recommendations.map(({ product, fit }) => (
            <ProductCard key={product.slug} product={product} fitResult={fit} />
          ))}
        </div>

        <p className="mx-auto mt-8 max-w-2xl text-center text-xs leading-relaxed text-slate-500">
          These recommendations are a helpful starting point. Check the product dimensions and confirm comfort before ordering.
        </p>
      </div>
    </section>
  );
}
