"use client";

import { X, Ruler } from "lucide-react";

interface SizeGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SizeGuideModal({ isOpen, onClose }: SizeGuideModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-vv border border-slate-200 shadow-2xl max-w-2xl w-full p-6 relative max-h-[90vh] overflow-y-auto animate-fade-in">
        
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 h-8 w-8 rounded-full border border-slate-100 hover:bg-slate-50 text-slate-400 hover:text-slate-800 grid place-items-center transition"
        >
          <X className="h-4 w-4" />
        </button>

        {/* Content */}
        <div className="flex items-center gap-2 text-retail border-b border-slate-100 pb-3 mb-5">
          <Ruler className="h-6 w-6" />
          <h2 className="text-2xl font-extrabold text-slate-900 font-sans">Frame Size Guide</h2>
        </div>

        <div className="grid gap-6">
          {/* Explanation */}
          <div>
            <h3 className="font-extrabold text-slate-800 text-sm">Understanding Frame Measurements</h3>
            <p className="text-slate-600 text-xs mt-1 leading-relaxed">
              Standard frame sizing is represented in millimeters as three distinct numbers (e.g., <strong>52-18-140</strong>), printed on the inside of the frame temple:
            </p>
            <div className="mt-4 grid gap-3 grid-cols-3 text-center border border-slate-100 rounded-vv bg-slate-50 p-4">
              <div>
                <span className="block text-xl font-extrabold text-retail">52 mm</span>
                <span className="text-[10px] text-slate-500 font-bold uppercase mt-1 block">Lens Width</span>
              </div>
              <div>
                <span className="block text-xl font-extrabold text-retail">18 mm</span>
                <span className="text-[10px] text-slate-500 font-bold uppercase mt-1 block">Bridge Width</span>
              </div>
              <div>
                <span className="block text-xl font-extrabold text-retail">140 mm</span>
                <span className="text-[10px] text-slate-500 font-bold uppercase mt-1 block">Temple Length</span>
              </div>
            </div>
          </div>

          {/* Face Shape Fit Guide */}
          <div>
            <h3 className="font-extrabold text-slate-800 text-sm">Face Shape & Frame Fit Guide</h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 text-xs">
              <div className="p-3 border border-slate-100 rounded bg-white">
                <strong className="text-slate-800">Oval Face</strong>
                <p className="text-slate-500 mt-0.5">Most shapes work well. Rectangular, square, or geometric frames balance features best.</p>
              </div>
              <div className="p-3 border border-slate-100 rounded bg-white">
                <strong className="text-slate-800">Round Face</strong>
                <p className="text-slate-500 mt-0.5">Square, rectangular, or cat-eye frames help define and elongate circular features.</p>
              </div>
              <div className="p-3 border border-slate-100 rounded bg-white">
                <strong className="text-slate-800">Square Face</strong>
                <p className="text-slate-500 mt-0.5">Round, oval, or aviator frames soften sharp jawline angles and bring harmony.</p>
              </div>
              <div className="p-3 border border-slate-100 rounded bg-white">
                <strong className="text-slate-800">Heart Face</strong>
                <p className="text-slate-500 mt-0.5">Bottom-heavy rectangular or round frames balance wide foreheads beautifully.</p>
              </div>
            </div>
          </div>

          {/* Measurement steps */}
          <div className="border-t border-slate-100 pt-4">
            <h3 className="font-extrabold text-slate-800 text-sm">How to measure your current fit</h3>
            <ol className="list-decimal list-inside text-xs text-slate-600 space-y-2 mt-2 leading-relaxed">
              <li>Look at the inside temple arm of any comfortable pair of glasses you currently own.</li>
              <li>Locate the three numbers printed there (typically lens width, bridge width, temple length).</li>
              <li>Choose frames on Vision Vistara within 2-3mm of those numbers to ensure a perfect fit!</li>
            </ol>
          </div>
        </div>

        <button
          onClick={onClose}
          className="vv-button-retail mt-6 w-full py-2.5 justify-center font-bold"
        >
          Got it, close guide
        </button>

      </div>
    </div>
  );
}
