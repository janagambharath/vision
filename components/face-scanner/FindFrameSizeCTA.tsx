"use client";

import { useState } from "react";
import { Scan } from "lucide-react";
import dynamic from "next/dynamic";

const FaceScannerModal = dynamic(() => import("./FaceScannerModal"), { ssr: false });

interface FindFrameSizeCTAProps {
  variant?: "banner" | "inline" | "compact";
}

export function FindFrameSizeCTA({ variant = "banner" }: FindFrameSizeCTAProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Check if user already has measurements stored
  const hasMeasurements = typeof window !== "undefined" && localStorage.getItem("vv_face_measurements");

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
          className="group flex items-center gap-3 rounded-2xl border border-teal-200 bg-gradient-to-r from-teal-50 to-emerald-50 px-5 py-3.5 text-left transition hover:border-teal-300 hover:shadow-md"
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
      <section className="border-b border-teal-100 bg-gradient-to-r from-teal-50 via-emerald-50 to-cyan-50">
        <div className="vv-container py-4 sm:py-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-sm">
                <Scan className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-extrabold text-slate-800">
                  Not sure which size fits you?
                </p>
                <p className="text-xs text-slate-500">
                  Use your camera to estimate face measurements and discover frames that may fit you.
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsOpen(true)}
                className="vv-button-retail text-sm"
                id="find-frame-size-cta"
              >
                <Scan className="h-4 w-4" />
                {hasMeasurements ? "Re-measure My Face" : "Find My Frame Size"}
              </button>
            </div>
          </div>
        </div>
      </section>
      {isOpen && <FaceScannerModal onClose={() => setIsOpen(false)} />}
    </>
  );
}
