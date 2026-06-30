"use client";

import { createContext, useContext, useState, useEffect } from "react";

interface CompareContextType {
  compareSlugs: string[];
  addToCompare: (slug: string) => void;
  removeFromCompare: (slug: string) => void;
  clearCompare: () => void;
}

const CompareContext = createContext<CompareContextType | undefined>(undefined);

export function CompareProvider({ children }: { children: React.ReactNode }) {
  const [compareSlugs, setCompareSlugs] = useState<string[]>([]);

  useEffect(() => {
    const stored = localStorage.getItem("vv_compare");
    if (stored) {
      try {
        setCompareSlugs(JSON.parse(stored));
      } catch {
        // Ignore
      }
    }
  }, []);

  const addToCompare = (slug: string) => {
    if (compareSlugs.includes(slug)) return;
    if (compareSlugs.length >= 3) {
      alert("You can compare up to 3 products at a time.");
      return;
    }
    const updated = [...compareSlugs, slug];
    setCompareSlugs(updated);
    localStorage.setItem("vv_compare", JSON.stringify(updated));
  };

  const removeFromCompare = (slug: string) => {
    const updated = compareSlugs.filter((s) => s !== slug);
    setCompareSlugs(updated);
    localStorage.setItem("vv_compare", JSON.stringify(updated));
  };

  const clearCompare = () => {
    setCompareSlugs([]);
    localStorage.removeItem("vv_compare");
  };

  return (
    <CompareContext.Provider value={{ compareSlugs, addToCompare, removeFromCompare, clearCompare }}>
      {children}
    </CompareContext.Provider>
  );
}

export function useCompare() {
  const context = useContext(CompareContext);
  if (!context) {
    throw new Error("useCompare must be used within a CompareProvider");
  }
  return context;
}
