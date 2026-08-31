"use client";

import { ArrowRight, Ruler, Scan, ShieldCheck } from "lucide-react";
import type { FaceShape, FrameSize, MeasurementQuality } from "@/lib/frame-fit";
import { getFaceShapeGuide, recommendedFrameWidthRange } from "@/lib/frame-fit";

interface FaceProfileCardProps {
  faceWidthMm: number | null;
  faceHeightMm: number | null;
  estimatedPdMm: number | null;
  faceShape: FaceShape | null;
  recommendedSize: FrameSize | null;
  measurementQuality: MeasurementQuality;
  calibrationMethod: "card" | "heuristic";
  matchCount: number;
  onExploreFrames: () => void;
  onSeeAll: () => void;
}

const SHAPE_ICONS: Record<FaceShape, string> = {
  Oval: "⬮",
  Round: "●",
  Square: "■",
  Heart: "♥",
  Diamond: "◆",
  Oblong: "▬",
  Triangle: "▲",
};

const QUALITY_STYLES: Record<MeasurementQuality, { bg: string; text: string; label: string }> = {
  Good: { bg: "bg-emerald-100", text: "text-emerald-700", label: "Good" },
  Fair: { bg: "bg-amber-100", text: "text-amber-700", label: "Fair" },
  Approximate: { bg: "bg-slate-100", text: "text-slate-600", label: "Approximate" },
};

export function FaceProfileCard({
  faceWidthMm,
  faceHeightMm: _faceHeightMm,
  estimatedPdMm,
  faceShape,
  recommendedSize,
  measurementQuality,
  calibrationMethod,
  matchCount,
  onExploreFrames,
  onSeeAll,
}: FaceProfileCardProps) {
  const quality = QUALITY_STYLES[measurementQuality];
  const shapeGuide = faceShape ? getFaceShapeGuide(faceShape) : null;
  const widthRange = faceWidthMm ? recommendedFrameWidthRange(faceWidthMm) : null;

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Header */}
      <div className="text-center mb-6">
        <div className="mx-auto mb-3 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-lg">
          <Scan className="h-8 w-8" />
        </div>
        <h2 className="text-2xl font-extrabold text-white">Your Frame Profile</h2>
        <p className="mt-1 text-sm text-slate-400">Estimated measurements for frame selection</p>
      </div>

      {/* Face Shape */}
      {faceShape && (
        <div className="rounded-2xl border border-slate-700 bg-slate-800/80 p-5 mb-4 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <span className="text-3xl">{SHAPE_ICONS[faceShape]}</span>
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-teal-400">Face Shape</p>
              <p className="text-xl font-extrabold text-white">{faceShape}</p>
            </div>
          </div>
          {shapeGuide && (
            <p className="mt-3 text-sm text-slate-400 leading-relaxed">{shapeGuide.description}</p>
          )}
        </div>
      )}

      {/* Measurements Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {faceWidthMm != null && (
          <div className="rounded-xl border border-slate-700 bg-slate-800/80 p-4 text-center backdrop-blur-sm">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Face Width</p>
            <p className="mt-1 text-2xl font-extrabold text-white">{Math.round(faceWidthMm)}</p>
            <p className="text-xs text-slate-500">mm</p>
          </div>
        )}
        {estimatedPdMm != null && (
          <div className="rounded-xl border border-slate-700 bg-slate-800/80 p-4 text-center backdrop-blur-sm">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Est. PD</p>
            <p className="mt-1 text-2xl font-extrabold text-white">{Math.round(estimatedPdMm)}</p>
            <p className="text-xs text-slate-500">mm</p>
          </div>
        )}
        {recommendedSize && (
          <div className="rounded-xl border border-slate-700 bg-slate-800/80 p-4 text-center backdrop-blur-sm">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Recommended Size</p>
            <p className="mt-1 text-lg font-extrabold text-white">{recommendedSize}</p>
          </div>
        )}
        {widthRange && (
          <div className="rounded-xl border border-slate-700 bg-slate-800/80 p-4 text-center backdrop-blur-sm">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Frame Width</p>
            <p className="mt-1 text-lg font-extrabold text-white">{widthRange.min}–{widthRange.max}</p>
            <p className="text-xs text-slate-500">mm range</p>
          </div>
        )}
      </div>

      {/* Measurement Quality */}
      <div className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-800/80 px-4 py-3 mb-4 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <Ruler className="h-4 w-4 text-slate-400" />
          <span className="text-xs font-bold text-slate-400">Measurement Quality</span>
        </div>
        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-bold ${quality.bg} ${quality.text}`}>
          {quality.label}
        </span>
      </div>

      {/* Recommendation summary */}
      {matchCount > 0 && (
        <div className="rounded-xl border border-teal-500/30 bg-teal-950/50 p-4 mb-5 text-center backdrop-blur-sm">
          <p className="text-lg font-extrabold text-teal-300">
            {matchCount} frame{matchCount !== 1 ? "s" : ""} may fit you
          </p>
          <p className="mt-1 text-xs text-teal-400/70">
            Based on your estimated measurements
          </p>
        </div>
      )}

      {/* Actions */}
      <div className="grid gap-3">
        <button
          type="button"
          onClick={onExploreFrames}
          className="vv-button flex w-full justify-center gap-2 border-0 bg-gradient-to-r from-teal-500 to-emerald-600 py-3.5 font-extrabold text-white shadow-lg hover:shadow-teal-500/25"
        >
          Explore Recommended Frames
          <ArrowRight className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={onSeeAll}
          className="vv-button flex w-full justify-center gap-2 border-slate-600 py-3 text-slate-300 hover:border-slate-500 hover:text-white"
        >
          See All Frames
        </button>
      </div>

      {/* Disclaimer */}
      <div className="mt-5 flex items-start gap-2 rounded-xl border border-slate-700/50 bg-slate-900/50 p-3">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-slate-500" />
        <p className="text-[11px] leading-relaxed text-slate-500">
          Measurements are estimates for frame selection and may vary from professional optical measurements.
          {calibrationMethod === "heuristic" && " Results use statistical estimation without a reference card."}
          {" "}Confirm fit and prescription with your optometrist.
        </p>
      </div>
    </div>
  );
}
