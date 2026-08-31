"use client";

import type { FitLevel } from "@/lib/frame-fit";

interface FitBadgeProps {
  fitLevel: FitLevel;
  fitScore?: number;
  size?: "sm" | "md";
  showScore?: boolean;
}

const BADGE_STYLES: Record<FitLevel, { bg: string; text: string; ring: string; icon: string }> = {
  "Excellent": {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    ring: "ring-emerald-200",
    icon: "✓",
  },
  "Good": {
    bg: "bg-teal-50",
    text: "text-teal-700",
    ring: "ring-teal-200",
    icon: "●",
  },
  "Possible": {
    bg: "bg-amber-50",
    text: "text-amber-700",
    ring: "ring-amber-200",
    icon: "◐",
  },
  "Less Suitable": {
    bg: "bg-slate-100",
    text: "text-slate-500",
    ring: "ring-slate-200",
    icon: "○",
  },
};

export function FitBadge({ fitLevel, fitScore, size = "sm", showScore = false }: FitBadgeProps) {
  const style = BADGE_STYLES[fitLevel];
  const sizeClasses = size === "sm"
    ? "px-2 py-0.5 text-[10px] gap-1"
    : "px-3 py-1 text-xs gap-1.5";

  return (
    <span
      className={`inline-flex items-center rounded-full font-bold ring-1 ${style.bg} ${style.text} ${style.ring} ${sizeClasses}`}
      title={fitScore != null ? `Fit score: ${fitScore}/100` : undefined}
    >
      <span className="leading-none">{style.icon}</span>
      <span>{fitLevel}{showScore && fitScore != null ? ` · ${fitScore}` : ""}</span>
    </span>
  );
}
