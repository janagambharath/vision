"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, RotateCcw } from "lucide-react";

export default function TryOnErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("AI Try-on Error Boundary Caught:", error);
  }, [error]);

  return (
    <main className="vv-section bg-paper min-h-[70vh] flex items-center justify-center">
      <div className="vv-container max-w-lg text-center vv-card p-10 border border-amber-200 bg-amber-50 shadow-soft">
        <AlertCircle className="mx-auto h-12 w-12 text-amber-500 mb-4" />
        <h2 className="text-2xl font-extrabold text-amber-950">Camera or AI Preview Error</h2>
        <p className="mt-3 text-sm text-amber-800 leading-relaxed">
          The virtual try-on tool encountered a critical issue. This is usually caused by blocked camera permissions, unsupported browsers, or a temporary AI service outage.
        </p>
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4">
          <button
            onClick={() => reset()}
            className="vv-button flex justify-center items-center gap-2 bg-amber-600 text-white border-transparent hover:bg-amber-700 font-bold"
          >
            <RotateCcw className="h-4 w-4" /> Try reloading
          </button>
          <Link href="/frames" className="vv-button-retail flex justify-center py-2.5 px-6 font-bold">
            Back to store
          </Link>
        </div>
      </div>
    </main>
  );
}
