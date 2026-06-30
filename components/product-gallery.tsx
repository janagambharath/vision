"use client";

import { useState } from "react";
import Image from "next/image";
import type { StoreProduct } from "@/lib/inventory";
import { Maximize2, X } from "lucide-react";

export function ProductGallery({ product }: { product: StoreProduct }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);

  const images = product.images.length > 0 ? product.images : [{ url: "/assets/vision-vistara-eye-logo.png", alt: "Vision Vistara", role: "front", sortOrder: 0 }];
  const activeImage = images[activeIdx] || images[0];

  return (
    <div className="grid gap-3">
      {/* Active Image Card */}
      <div className="vv-card relative aspect-[16/10] overflow-hidden bg-slate-50 group">
        <Image
          src={activeImage.url}
          alt={activeImage.alt}
          fill
          priority
          sizes="(max-width: 900px) 100vw, 55vw"
          className="object-contain p-8 transition-transform duration-300 group-hover:scale-105"
        />
        <button
          onClick={() => setIsZoomed(true)}
          className="absolute bottom-3 right-3 rounded-full bg-white/80 p-2 text-slate-800 backdrop-blur hover:bg-white transition shadow-soft"
          type="button"
          aria-label="Zoom image"
        >
          <Maximize2 className="h-4 w-4" />
        </button>
      </div>

      {/* Thumbnails */}
      {images.length > 1 ? (
        <div className="grid grid-cols-4 gap-3">
          {images.map((image, index) => (
            <button
              key={`${image.url}-${image.role}-${index}`}
              onClick={() => setActiveIdx(index)}
              className={`vv-card relative aspect-[4/3] overflow-hidden bg-slate-50 transition border-2 ${
                index === activeIdx ? "border-retail ring-2 ring-teal-100" : "border-slate-100 hover:border-slate-300"
              }`}
              type="button"
            >
              <Image src={image.url} alt={image.alt} fill sizes="120px" className="object-contain p-2" />
            </button>
          ))}
        </div>
      ) : null}

      {/* Lightbox / Zoom Modal */}
      {isZoomed ? (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 backdrop-blur-sm animate-in fade-in duration-200">
          <button
            onClick={() => setIsZoomed(false)}
            className="absolute top-4 right-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition"
            type="button"
            aria-label="Close zoom"
          >
            <X className="h-6 w-6" />
          </button>
          <div className="relative h-[85vh] w-[90vw]">
            <Image
              src={activeImage.url}
              alt={activeImage.alt}
              fill
              className="object-contain"
              sizes="90vw"
              priority
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
