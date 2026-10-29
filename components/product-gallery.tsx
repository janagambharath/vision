"use client";

import { type PointerEvent, useRef, useState } from "react";
import Image from "next/image";
import type { StoreImage } from "@/lib/inventory";
import { ChevronLeft, ChevronRight, Maximize2, X } from "lucide-react";

export function ProductGallery({ images: productImages }: { images: StoreImage[] }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [isZoomed, setIsZoomed] = useState(false);
  const gesture = useRef<{ id: number; x: number; y: number } | null>(null);

  const galleryImages = productImages.filter((image) => image.role !== "ar");
  const images =
    galleryImages.length > 0
      ? galleryImages
      : [{ url: "/assets/vision-vistara-eye-logo.png", alt: "Vision Vistara", role: "front", sortOrder: 0 }];
  const currentIdx = activeIdx < images.length ? activeIdx : 0;
  const activeImage = images[currentIdx];
  const changeImage = (direction: number) => {
    setActiveIdx((index) => ((index < images.length ? index : 0) + direction + images.length) % images.length);
  };
  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!event.isPrimary || event.button !== 0 || images.length < 2 || (event.target as Element).closest("button")) return;
    gesture.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture(event.pointerId);
  };
  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const start = gesture.current;
    gesture.current = null;
    if (!start || start.id !== event.pointerId) return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.abs(dx) >= 40 && Math.abs(dx) > Math.abs(dy) * 1.25) {
      changeImage(dx < 0 ? 1 : -1);
    }
  };
  const swipeHandlers = {
    onPointerDown,
    onPointerUp,
    onPointerCancel: () => { gesture.current = null; },
    onLostPointerCapture: () => { gesture.current = null; }
  };
  const navigation = (zoomed = false) => images.length > 1 ? (
    <>
      <button type="button" aria-label="Previous product image" onClick={() => changeImage(-1)}
        className={`absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full p-2 shadow-soft ${zoomed ? "bg-black/50 text-white" : "bg-white/90 text-slate-800"}`}>
        <ChevronLeft className="h-5 w-5" />
      </button>
      <button type="button" aria-label="Next product image" onClick={() => changeImage(1)}
        className={`absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full p-2 shadow-soft ${zoomed ? "bg-black/50 text-white" : "bg-white/90 text-slate-800"}`}>
        <ChevronRight className="h-5 w-5" />
      </button>
      <span aria-live="polite" className="absolute bottom-3 left-3 rounded-full bg-white/90 px-3 py-1 text-xs text-slate-800">
        {currentIdx + 1} / {images.length}
      </span>
    </>
  ) : null;

  return (
    <div className="grid w-full content-start self-start gap-3">
      {/* Active Image Card */}
      <div {...swipeHandlers} style={{ touchAction: "pan-y pinch-zoom" }} className="vv-card relative aspect-square select-none overflow-hidden bg-slate-50 group sm:aspect-[16/10]">
        <Image
          draggable={false}
          src={activeImage.url}
          alt={activeImage.alt}
          fill
          priority
          sizes="(max-width: 900px) 100vw, 55vw"
          className="object-contain p-3 transition-transform duration-300 group-hover:scale-105 sm:p-6 lg:p-8"
        />
        {navigation()}
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
              aria-label={`View product image ${index + 1}`}
              aria-pressed={index === currentIdx}
              className={`vv-card relative aspect-square overflow-hidden bg-slate-50 transition border-2 sm:aspect-[4/3] ${
                index === currentIdx ? "border-retail ring-2 ring-teal-100" : "border-slate-100 hover:border-slate-300"
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
          <div {...swipeHandlers} style={{ touchAction: "pan-y pinch-zoom" }} className="relative h-[85vh] w-[90vw] select-none">
            <Image
              draggable={false}
              src={activeImage.url}
              alt={activeImage.alt}
              fill
              className="object-contain"
              sizes="90vw"
              priority
            />
            {navigation(true)}
          </div>
        </div>
      ) : null}
    </div>
  );
}
