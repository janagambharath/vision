"use client";

import { useEffect, useState } from "react";
import { ArrowRight, Ruler, Scan } from "lucide-react";
import dynamic from "next/dynamic";

const FaceScannerModal = dynamic(() => import("./FaceScannerModal"), { ssr: false });

interface FindFrameSizeCTAProps {
  variant?: "banner" | "inline" | "compact";
}

export function FindFrameSizeCTA({ variant = "banner" }: FindFrameSizeCTAProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [hasMeasurements, setHasMeasurements] = useState(false);

  useEffect(() => {
    setHasMeasurements(Boolean(localStorage.getItem("vv_face_measurements")));
  }, []);

  if (variant === "compact") {
    return (
      <>
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="inline-flex items-center gap-1.5 rounded-full border border-teal-200 bg-teal-50 px-3 py-1.5 text-xs font-bold text-teal-700 transition hover:bg-teal-100 hover:border-teal-300"
        >
          <Scan className="h-3.5 w-3.5" />
          {hasMeasurements ? "Re-measure" : "Find My Size"}
        </button>
        {isOpen && <FaceScannerModal onClose={() => setIsOpen(false)} />}
      </>
    );
  }

  if (variant === "inline") {
    return (
      <>
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="group flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-5 py-3.5 text-left transition hover:border-teal-500 hover:bg-teal-50"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-100 text-teal-600 transition group-hover:bg-teal-200">
            <Scan className="h-5 w-5" />
          </div>
          <div>
            <span className="block text-sm font-extrabold text-slate-800">
              {hasMeasurements ? "Update My Frame Size" : "Find My Frame Size"}
            </span>
            <span className="block text-[11px] text-slate-500">
              Camera-based face scan · 30 seconds
            </span>
          </div>
        </button>
        {isOpen && <FaceScannerModal onClose={() => setIsOpen(false)} />}
      </>
    );
  }

  // Default: banner
  return (
    <>
      <section className="border-y border-slate-200 bg-white">
        <div className="vv-container py-4 sm:py-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex min-w-0 items-center gap-3 sm:gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-teal-800">
                <Ruler className="h-5 w-5" aria-hidden="true" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900">
                  Need help finding your size?
                </p>
                <p className="mt-0.5 text-xs text-slate-600">
                  Use your camera for frame size and fit suggestions.
                </p>
              </div>
            </div>
            <div className="sm:shrink-0">
              <button
                type="button"
                onClick={() => setIsOpen(true)}
                className="inline-flex min-h-11 w-full items-center justify-center gap-3 rounded-lg border border-teal-800 bg-teal-800 px-5 py-3 text-sm font-semibold text-white transition-colors hover:bg-teal-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-700 focus-visible:ring-offset-2 sm:w-auto"
                id="find-frame-size-cta"
              >
                {hasMeasurements ? "Measure again" : "Find my size"}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </div>
      </section>
      {isOpen && <FaceScannerModal onClose={() => setIsOpen(false)} />}
    </>
  );
}
