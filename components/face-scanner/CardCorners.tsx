"use client";

import { useState } from "react";
import { calibrateWithCard, type CalibrationResult } from "@/lib/face-measurement";

export function CardCorners({ image, width, height, onConfirm, onRetake }: {
  image: string; width: number; height: number;
  onConfirm: (calibration: CalibrationResult) => void; onRetake: () => void;
}) {
  const [points, setPoints] = useState<{ x: number; y: number }[]>([]);
  const [error, setError] = useState("");
  const names = ["top-left", "top-right", "bottom-right", "bottom-left"];
  return <div className="w-full max-w-lg space-y-4 text-center text-white">
    <h3 className="text-xl font-bold">Mark the card corners</h3>
    <p className="text-sm">{points.length < 4 ? `Tap the ${names[points.length]} corner of your card in the photo.` : "Check all four points sit on the card corners."}</p>
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full touch-manipulation rounded-xl bg-slate-900" role="img" aria-label="Captured photo: tap the four card corners in clockwise order"
      onClick={(event) => {
        if (points.length === 4) return;
        const transform = event.currentTarget.getScreenCTM();
        if (!transform) return;
        const point = new DOMPoint(event.clientX, event.clientY).matrixTransform(transform.inverse());
        if (point.x < 0 || point.x > width || point.y < 0 || point.y > height) return;
        setPoints([...points, { x: point.x, y: point.y }]);
        setError("");
      }}>
      <image href={image} width={width} height={height} />
      <polyline points={points.map(p => `${p.x},${p.y}`).join(" ")} fill="none" stroke="#2dd4bf" strokeWidth={width / 180} />
      {points.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={width / 70} fill="#0d9488" stroke="white" strokeWidth={width / 300} />)}
    </svg>
    {error && <p role="alert" className="text-sm text-amber-200">{error}</p>}
    <button type="button" disabled={points.length !== 4} className="vv-button-retail w-full justify-center disabled:opacity-40" onClick={() => {
      try {
        const calibration = calibrateWithCard({ topLeft: points[0], topRight: points[1], bottomRight: points[2], bottomLeft: points[3] });
        onConfirm({ ...calibration, confidence: Math.min(calibration.confidence, 0.7) });
      } catch (err) { setError(err instanceof Error ? err.message : "Mark the corners again."); }
    }}>Use card size</button>
    <div className="flex justify-center gap-6">
      <button type="button" onClick={() => { setPoints([]); setError(""); }}>Reset corners</button>
      <button type="button" onClick={onRetake}>Retake photo</button>
    </div>
    <p className="text-xs text-slate-300">The photo stays in this browser and is discarded when you finish or close.</p>
  </div>;
}
