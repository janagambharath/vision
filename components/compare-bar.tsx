"use client";

import Link from "next/link";
import { useCompare } from "@/components/compare-context";
import { X, ArrowRight, BarChart2 } from "lucide-react";

export function CompareBar() {
  const { compareSlugs, removeFromCompare, clearCompare } = useCompare();

  if (compareSlugs.length === 0) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-white border-t border-slate-200 shadow-2xl py-4 px-6 animate-slide-up">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        
        {/* Left count */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-teal-50 grid place-items-center text-retail shrink-0">
            <BarChart2 className="h-5 w-5" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-800 text-sm">Compare Frames</h3>
            <p className="text-xs text-slate-500">{compareSlugs.length} of 3 selected</p>
          </div>
        </div>

        {/* Selected slugs lists */}
        <div className="flex flex-wrap gap-2 flex-1 max-w-lg">
          {compareSlugs.map((slug) => {
            // Clean up slug text for display labels
            const displayName = slug
              .split("-")
              .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
              .join(" ");

            return (
              <span
                key={slug}
                className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-full pl-3 pr-1.5 py-1 text-xs font-bold text-slate-700"
              >
                {displayName}
                <button
                  onClick={() => removeFromCompare(slug)}
                  className="h-4.5 w-4.5 rounded-full bg-slate-200 hover:bg-red-100 hover:text-red-700 grid place-items-center transition"
                >
                  <X className="h-2.5 w-2.5" />
                </button>
              </span>
            );
          })}
        </div>

        {/* Action button triggers */}
        <div className="flex items-center gap-2">
          <button
            onClick={clearCompare}
            className="text-xs font-bold text-slate-500 hover:text-slate-700 px-3 py-2"
          >
            Clear all
          </button>
          
          <Link
            href={`/frames/compare?slugs=${compareSlugs.join(",")}`}
            className="vv-button-retail text-xs py-2 px-4 inline-flex items-center gap-1.5"
          >
            Compare Now
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>

      </div>
    </div>
  );
}
