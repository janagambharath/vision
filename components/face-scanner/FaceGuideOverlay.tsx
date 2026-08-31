"use client";

import type { FaceGuidanceStatus } from "@/lib/face-measurement";

interface FaceGuideOverlayProps {
  status: FaceGuidanceStatus;
  message: string;
  confidence: number;
  showLandmarks?: boolean;
}

export function FaceGuideOverlay({ status, message, confidence, showLandmarks: _showLandmarks = false }: FaceGuideOverlayProps) {
  const isReady = status === "ready";
  const hasWarning = status !== "ready" && status !== "no_face";

  const ovalColor = isReady
    ? "rgba(16, 185, 129, 0.85)"
    : hasWarning
      ? "rgba(245, 158, 11, 0.7)"
      : "rgba(148, 163, 184, 0.5)";

  const glowColor = isReady
    ? "rgba(16, 185, 129, 0.3)"
    : "rgba(148, 163, 184, 0.1)";

  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      {/* Darkened edges to guide the user's face position */}
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 400 400"
        preserveAspectRatio="xMidYMid slice"
      >
        <defs>
          <mask id="face-guide-mask">
            <rect width="400" height="400" fill="white" />
            <ellipse cx="200" cy="190" rx="95" ry="125" fill="black" />
          </mask>
          {/* Pulse animation for scanning state */}
          {isReady && (
            <radialGradient id="scan-glow" cx="50%" cy="47.5%" r="35%">
              <stop offset="0%" stopColor={glowColor} />
              <stop offset="100%" stopColor="transparent" />
            </radialGradient>
          )}
        </defs>

        {/* Dark overlay with face-shaped cutout */}
        <rect
          width="400"
          height="400"
          fill="rgba(0, 0, 0, 0.45)"
          mask="url(#face-guide-mask)"
        />

        {/* Scanning glow */}
        {isReady && (
          <ellipse
            cx="200"
            cy="190"
            rx="100"
            ry="130"
            fill="url(#scan-glow)"
            className="animate-pulse"
          />
        )}

        {/* Face guide oval */}
        <ellipse
          cx="200"
          cy="190"
          rx="95"
          ry="125"
          fill="none"
          stroke={ovalColor}
          strokeWidth={isReady ? "3" : "2"}
          strokeDasharray={isReady ? "none" : "8 6"}
          className={isReady ? "face-guide-pulse" : ""}
        />

        {/* Corner markers */}
        {/* Top */}
        <line x1="200" y1="60" x2="200" y2="72" stroke={ovalColor} strokeWidth="2" strokeLinecap="round" />
        {/* Bottom */}
        <line x1="200" y1="308" x2="200" y2="320" stroke={ovalColor} strokeWidth="2" strokeLinecap="round" />
        {/* Left */}
        <line x1="100" y1="190" x2="112" y2="190" stroke={ovalColor} strokeWidth="2" strokeLinecap="round" />
        {/* Right */}
        <line x1="288" y1="190" x2="300" y2="190" stroke={ovalColor} strokeWidth="2" strokeLinecap="round" />

        {/* Crosshair at center when face detected */}
        {isReady && (
          <g opacity="0.5">
            <line x1="196" y1="186" x2="204" y2="186" stroke={ovalColor} strokeWidth="1" />
            <line x1="200" y1="182" x2="200" y2="190" stroke={ovalColor} strokeWidth="1" />
          </g>
        )}
      </svg>

      {/* Status indicator */}
      <div className="absolute bottom-4 left-3 right-3 sm:bottom-6 sm:left-4 sm:right-4">
        <div
          className={`rounded-xl px-4 py-3 text-center backdrop-blur-md transition-all duration-300 ${
            isReady
              ? "border border-emerald-500/40 bg-emerald-950/80 text-emerald-200"
              : hasWarning
                ? "border border-amber-500/40 bg-amber-950/80 text-amber-200"
                : "border border-slate-600/40 bg-slate-950/80 text-slate-300"
          }`}
        >
          <div className="flex items-center justify-center gap-2">
            {isReady && (
              <span className="flex h-2 w-2">
                <span className="absolute inline-flex h-2 w-2 animate-ping rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
              </span>
            )}
            <p className="text-sm font-bold">{message}</p>
          </div>
          {isReady && (
            <p className="mt-1 text-[11px] text-emerald-300/70">
              Confidence: {Math.round(confidence * 100)}%
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
