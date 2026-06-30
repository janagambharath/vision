"use client";

import { useState } from "react";
import { formatMoney } from "@/lib/money";
import { Check } from "lucide-react";

interface LensPackage {
  code: string;
  name: string;
  description: string;
  pricePaise: number | null;
  active: boolean;
  sortOrder: number;
}

interface LensSelectorProps {
  packages: LensPackage[];
}

export default function LensSelector({ packages }: LensSelectorProps) {
  const [selected, setSelected] = useState<string>(""); // empty is "Frame only"

  const activePackages = packages.filter(p => p.active);

  return (
    <div className="grid gap-3">
      <input type="hidden" name="lensCode" value={selected} />
      
      <div className="text-sm font-extrabold text-slate-600 mb-1">Select Lens Package</div>
      
      <div className="grid gap-3 sm:grid-cols-2">
        {/* Option 1: Frame Only */}
        <button
          type="button"
          onClick={() => setSelected("")}
          className={`flex flex-col text-left p-4 rounded-vv border-2 transition-all relative overflow-hidden bg-white ${
            selected === "" ? "border-retail bg-teal-50/5" : "border-slate-200 hover:border-slate-300"
          }`}
        >
          {selected === "" && (
            <span className="absolute right-3 top-3 h-5 w-5 rounded-full bg-retail text-white grid place-items-center">
              <Check className="h-3 w-3" />
            </span>
          )}
          <span className="font-extrabold text-sm text-slate-800">Frame only</span>
          <span className="text-xs text-slate-500 mt-1">Order the frame only without prescription lenses.</span>
          <span className="text-sm font-extrabold text-retail mt-3">Free</span>
        </button>

        {/* Dynamic packages */}
        {activePackages.map((pkg) => {
          const isSelected = selected === pkg.code;
          return (
            <button
              key={pkg.code}
              type="button"
              onClick={() => setSelected(pkg.code)}
              className={`flex flex-col text-left p-4 rounded-vv border-2 transition-all relative overflow-hidden bg-white ${
                isSelected ? "border-retail bg-teal-50/5" : "border-slate-200 hover:border-slate-300"
              }`}
            >
              {isSelected && (
                <span className="absolute right-3 top-3 h-5 w-5 rounded-full bg-retail text-white grid place-items-center">
                  <Check className="h-3 w-3" />
                </span>
              )}
              <span className="font-extrabold text-sm text-slate-800">{pkg.name}</span>
              <span className="text-xs text-slate-500 mt-1 leading-normal">{pkg.description}</span>
              <span className="text-sm font-extrabold text-retail mt-auto pt-3">
                {pkg.pricePaise !== null ? `+ ${formatMoney(pkg.pricePaise)}` : "Pricing Pending"}
              </span>
            </button>
          );
        })}
      </div>
      
      {selected !== "" && (
        <div className="mt-2 rounded-vv bg-teal-50/20 border border-teal-100 p-3 text-xs text-slate-600">
          <strong>What's included:</strong> Single Vision prescription power support, anti-scratch hard coating, premium microfibre cloth, and protection case.
        </div>
      )}
    </div>
  );
}
