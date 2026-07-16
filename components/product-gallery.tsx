"use client";

import { useState } from "react";
import Image from "next/image";
import type { StoreImage } from "@/lib/inventory";
import { Maximize2, X } from "lucide-react";

export function ProductGallery({ images: productImages }: { images: StoreImage[] }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);

  const galleryImages = productImages.filter((image) => image.role !== "ar");
  const images =
    galleryImages.length > 0
      ? galleryImages
      : [{ url: "/assets/vision-vistara-eye-logo.png", alt: "Vision Vistara", role: "front", sortOrder: 0 }];
  const activeImage = images[activeIdx] || images[0];

  return (
    <div className="grid gap-3">
      {/* Active Image Card */}
      <div className="vv-card relative aspect-square overflow-hidden bg-slate-50 group sm:aspect-[16/10]">
        <Image
          src={activeImage.url}
          alt={activeImage.alt}
          fill
          priority
          sizes="(max-width: 900px) 100vw, 55vw"
          className="object-contain p-3 transition-transform duration-300 group-hover:scale-105 sm:p-6 lg:p-8"
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
        <div className="grid grid-flow-col auto-cols-[76px] grid-rows-1 gap-3 overflow-x-auto pb-1 [scrollbar-width:thin] sm:grid-flow-row sm:auto-cols-auto sm:grid-cols-4 sm:overflow-visible sm:pb-0">
          {images.map((image, index) => (
            <button
              key={`${image.url}-${image.role}-${index}`}
              onClick={() => setActiveIdx(index)}
              className={`vv-card relative aspect-square overflow-hidden bg-slate-50 transition border-2 sm:aspect-[4/3] ${
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
