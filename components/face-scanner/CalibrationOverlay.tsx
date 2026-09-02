"use client";

interface CalibrationOverlayProps {
  status: "waiting" | "aligning" | "detected" | "error";
  message: string;
}

export function CalibrationOverlay({ status, message }: CalibrationOverlayProps) {
  const isDetected = status === "detected";
  const isError = status === "error";

  const borderColor = isDetected
    ? "rgba(16, 185, 129, 0.9)"
    : isError
      ? "rgba(239, 68, 68, 0.7)"
      : "rgba(148, 163, 184, 0.6)";

  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      <svg
        className="absolute inset-0 h-full w-full"
        viewBox="0 0 400 400"
        preserveAspectRatio="xMidYMid slice"
      >
        {/* Card guide rectangle — standard card aspect ratio 85.6:53.98 ≈ 1.586:1 */}
        <rect
          x="100"
          y="230"
          width="200"
          height="126"
          rx="8"
          ry="8"
          fill="none"
          stroke={borderColor}
          strokeWidth={isDetected ? "3" : "2"}
          strokeDasharray={isDetected ? "none" : "10 6"}
          className={isDetected ? "" : ""}
        />

        {/* Corner brackets */}
        {/* Top-left */}
        <path d="M100,248 L100,230 L118,230" fill="none" stroke={borderColor} strokeWidth="3" strokeLinecap="round" />
        {/* Top-right */}
        <path d="M300,248 L300,230 L282,230" fill="none" stroke={borderColor} strokeWidth="3" strokeLinecap="round" />
        {/* Bottom-left */}
        <path d="M100,338 L100,356 L118,356" fill="none" stroke={borderColor} strokeWidth="3" strokeLinecap="round" />
        {/* Bottom-right */}
        <path d="M300,338 L300,356 L282,356" fill="none" stroke={borderColor} strokeWidth="3" strokeLinecap="round" />

        {/* Card icon inside */}
        {!isDetected && (
          <g opacity="0.4">
            <rect x="170" y="270" width="60" height="38" rx="4" fill="none" stroke={borderColor} strokeWidth="1.5" />
            <line x1="170" y1="282" x2="230" y2="282" stroke={borderColor} strokeWidth="1.5" />
            <rect x="175" y="290" width="20" height="8" rx="2" fill={borderColor} opacity="0.5" />
          </g>
        )}

        {/* Success checkmark */}
        {isDetected && (
          <g>
            <circle cx="200" cy="293" r="16" fill="rgba(16, 185, 129, 0.2)" stroke="rgba(16, 185, 129, 0.8)" strokeWidth="2" />
            <polyline points="192,293 198,299 210,287" fill="none" stroke="rgba(16, 185, 129, 0.9)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          </g>
        )}
      </svg>

      {/* Status text */}
      <div className="absolute bottom-4 left-3 right-3 sm:bottom-6 sm:left-4 sm:right-4">
        <div
          className={`rounded-xl px-4 py-3 text-center backdrop-blur-md transition-all duration-300 ${
            isDetected
              ? "border border-emerald-500/40 bg-emerald-950/80 text-emerald-200"
              : isError
                ? "border border-red-500/40 bg-red-950/80 text-red-200"
                : "border border-slate-600/40 bg-slate-950/80 text-slate-300"
          }`}
        >
          <p className="text-sm font-bold">{message}</p>
          {!isDetected && !isError && (
            <p className="mt-1 text-[11px] opacity-60">
              Keep your face above the card and fit all four card corners inside the guide
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
