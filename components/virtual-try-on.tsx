"use client";
/* eslint-disable @next/next/no-img-element -- camera data URLs and signed generation results cannot use next/image. */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  AlertCircle,
  ArrowLeftRight,
  Camera,
  Check,
  Download,
  Loader2,
  MessageCircle,
  RotateCcw,
  Share2,
  ShoppingBag,
  Sparkles,
  X
} from "lucide-react";

interface TryOnFrame {
  slug: string;
  name: string;
  brand: string;
  img: string;
  imageRole: "transparent" | "front" | "fallback";
  pricePaise: number | null;
}

interface VirtualTryOnProps {
  productSlug?: string;
  frames?: TryOnFrame[];
}

type TryOnStep = "idle" | "camera" | "review" | "generating" | "result";

const CAMERA_GUIDANCE = "Centre your face in the guide, keep your glasses off, and use even light.";
const MAX_CAPTURE_DIMENSION = 1440;

function fittedDimensions(width: number, height: number) {
  const longestSide = Math.max(width, height);
  if (!longestSide || longestSide <= MAX_CAPTURE_DIMENSION) return { width, height };
  const scale = MAX_CAPTURE_DIMENSION / longestSide;
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

function loadImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.crossOrigin = "anonymous";
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("The selected frame image could not be prepared."));
    image.src = source;
  });
}

/**
 * FLUX.1 Kontext accepts one image. This invisible, automatic conditioning image
 * combines the captured selfie with the server-selected product asset. It is never
 * shown as a local try-on result and customers never position the frame themselves.
 */
async function createAutomaticConditioningImage(customerPhoto: string, frameImageUrl: string) {
  const [customerImage, frameImage] = await Promise.all([loadImage(customerPhoto), loadImage(frameImageUrl)]);
  const canvas = document.createElement("canvas");
  const dimensions = fittedDimensions(customerImage.naturalWidth, customerImage.naturalHeight);
  canvas.width = dimensions.width;
  canvas.height = dimensions.height;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Your browser could not prepare the AI preview.");

  context.drawImage(customerImage, 0, 0, canvas.width, canvas.height);
  const frameWidth = canvas.width * 0.5;
  const frameHeight = frameWidth * (frameImage.naturalHeight / frameImage.naturalWidth);
  const frameX = (canvas.width - frameWidth) / 2;
  const frameY = canvas.height * 0.29;
  context.drawImage(frameImage, frameX, frameY, frameWidth, frameHeight);

  return canvas.toDataURL("image/jpeg", 0.88);
}

export default function VirtualTryOn({ productSlug = "", frames }: VirtualTryOnProps) {
  const tryOnFrames = useMemo(() => frames ?? [], [frames]);
  const [selectedIndex, setSelectedIndex] = useState(() => Math.max(0, tryOnFrames.findIndex((frame) => frame.slug === productSlug)));
  const [step, setStep] = useState<TryOnStep>("idle");
  const [error, setError] = useState<string | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [resultPhoto, setResultPhoto] = useState<string | null>(null);
  const [generationMessage, setGenerationMessage] = useState("Preparing your secure preview…");
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);

  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sliderRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const selectedFrame = tryOnFrames[selectedIndex];

  useEffect(() => {
    const nextIndex = tryOnFrames.findIndex((frame) => frame.slug === productSlug);
    setSelectedIndex(nextIndex >= 0 ? nextIndex : 0);
  }, [productSlug, tryOnFrames]);

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    abortRef.current?.abort();
  }, []);

  useEffect(() => {
    if (step !== "generating") return;
    const messages = [
      "Preparing your secure preview…",
      "Using the selected product frame…",
      "Generating natural optical alignment…",
      "Finishing your photorealistic preview…"
    ];
    let index = 0;
    setGenerationMessage(messages[index]);
    const timer = window.setInterval(() => {
      index = Math.min(index + 1, messages.length - 1);
      setGenerationMessage(messages[index]);
    }, 3_500);
    return () => window.clearInterval(timer);
  }, [step]);

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
  }, []);

  const startCamera = async () => {
    setError(null);
    setCapturedPhoto(null);
    setResultPhoto(null);
    try {
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1080 }, height: { ideal: 1080 } },
        audio: false
      });
      streamRef.current = stream;
      setStep("camera");
      window.setTimeout(() => {
        if (videoElementRef.current && streamRef.current) {
          videoElementRef.current.srcObject = streamRef.current;
          videoElementRef.current.play().catch(() => undefined);
        }
      }, 0);
    } catch {
      setError("Unable to access your camera. Check browser permissions and try again.");
      setStep("idle");
    }
  };

  const capturePhoto = () => {
    const video = videoElementRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    const dimensions = fittedDimensions(video.videoWidth || 720, video.videoHeight || 720);
    canvas.width = dimensions.width;
    canvas.height = dimensions.height;
    context.save();
    context.translate(canvas.width, 0);
    context.scale(-1, 1);
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    context.restore();
    setCapturedPhoto(canvas.toDataURL("image/jpeg", 0.88));
    stopCamera();
    setStep("review");
  };

  const generateAiTryOn = async () => {
    if (!capturedPhoto || !selectedFrame) return;
    setError(null);
    setStep("generating");
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const conditioningImage = await createAutomaticConditioningImage(capturedPhoto, selectedFrame.img);
      const response = await fetch("/api/ai/try-on", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          frameSlug: selectedFrame.slug,
          customerImage: capturedPhoto,
          conditioningImage
        }),
        signal: controller.signal
      });
      const body = await response.json().catch(() => null) as { image?: string; error?: string } | null;
      if (!response.ok || !body?.image) throw new Error(body?.error || "We couldn't generate your preview right now. Please try again.");
      setResultPhoto(body.image);
      setSliderPosition(50);
      setStep("result");
    } catch (generationError) {
      if (generationError instanceof DOMException && generationError.name === "AbortError") {
        setError("Generation cancelled. Your selfie was not shown as a fallback.");
      } else {
        setError(generationError instanceof Error ? generationError.message : "We couldn't generate your preview right now. Please try again.");
      }
      setStep("review");
    } finally {
      abortRef.current = null;
    }
  };

  const cancelGeneration = () => {
    abortRef.current?.abort();
  };

  const retake = () => {
    setResultPhoto(null);
    startCamera();
  };

  const handleSliderMove = (clientX: number) => {
    if (!sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    setSliderPosition(Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100)));
  };

  const downloadResult = async () => {
    if (!resultPhoto || !selectedFrame) return;
    try {
      const response = await fetch(resultPhoto);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `vision-vistara-ai-try-on-${selectedFrame.slug}.jpg`;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      window.open(resultPhoto, "_blank", "noopener,noreferrer");
    }
  };

  const shareResult = async () => {
    if (!selectedFrame) return;
    const url = resultPhoto ?? `${window.location.origin}/frames/${selectedFrame.slug}`;
    const shareData = {
      title: `${selectedFrame.brand} ${selectedFrame.name} AI Try-On`,
      text: `My AI try-on preview for ${selectedFrame.brand} ${selectedFrame.name}`,
      url
    };
    if (navigator.share) {
      await navigator.share(shareData).catch(() => undefined);
    } else {
      await navigator.clipboard?.writeText(url).catch(() => undefined);
      setError("Preview link copied to your clipboard.");
    }
  };

  const shareWhatsApp = () => {
    if (!selectedFrame) return;
    const resultUrl = resultPhoto ? ` Preview: ${resultPhoto}` : "";
    const message = encodeURIComponent(`I tried ${selectedFrame.brand} ${selectedFrame.name} with Vision Vistara's AI try-on.${resultUrl}`);
    window.open(`https://wa.me/917842938316?text=${message}`, "_blank", "noopener,noreferrer");
  };

  const formatPrice = (pricePaise: number | null) => pricePaise === null ? "Price on request" : `₹${(pricePaise / 100).toLocaleString("en-IN")}`;

  if (!selectedFrame) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
        <AlertCircle className="mx-auto h-10 w-10 text-amber-600" />
        <h2 className="mt-4 text-xl font-extrabold text-amber-950">No frames are ready for AI try-on</h2>
        <p className="mx-auto mt-2 max-w-xl text-sm font-semibold text-amber-800">Enable AI try-on and add a product image. A transparent image is preferred, but a front product image works automatically.</p>
        <Link href="/frames" className="vv-button-retail mt-5 inline-flex">Back to frames</Link>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <aside className="rounded-2xl border border-slate-200 bg-white p-6 shadow-soft self-start lg:sticky lg:top-28">
        <h2 className="text-lg font-extrabold text-slate-800">Select Frame</h2>
        <p className="mt-1 text-xs text-slate-500">The selected product image is used automatically. No frame upload or positioning is needed.</p>
        <div className="mt-4 grid gap-2">
          {tryOnFrames.map((frame, index) => (
            <button
              key={frame.slug}
              type="button"
              onClick={() => { setSelectedIndex(index); setStep("idle"); setCapturedPhoto(null); setResultPhoto(null); setError(null); }}
              className={`flex items-center gap-3 rounded-xl border p-3 text-left transition ${selectedIndex === index ? "border-teal-500 bg-teal-50 ring-2 ring-teal-200" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"}`}
            >
              <div className="relative h-10 w-14 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                <Image src={frame.img} alt={frame.name} fill className="object-contain p-1" sizes="56px" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-[10px] font-bold uppercase text-slate-400">{frame.brand}</span>
                <p className="truncate text-sm font-extrabold text-slate-800">{frame.name}</p>
                <span className="text-xs font-bold text-slate-500">{formatPrice(frame.pricePaise)}</span>
              </div>
              {selectedIndex === index ? <Check className="h-4 w-4 shrink-0 text-teal-600" /> : null}
            </button>
          ))}
        </div>
        <div className="mt-5 rounded-xl border border-teal-100 bg-teal-50 p-3 text-xs leading-relaxed text-teal-900">
          <strong className="block">AI preview, not a fit guarantee</strong>
          The frame is selected from the product catalog ({selectedFrame.imageRole === "transparent" ? "transparent reference" : "product-image fallback"}). Confirm fit and prescription with the clinic.
        </div>
        <Link href={`/frames/${selectedFrame.slug}`} className="vv-button-retail mt-5 flex justify-center gap-2 py-2.5 text-xs">
          <ShoppingBag className="h-4 w-4" /> View frame details
        </Link>
      </aside>

      <section className="relative flex min-h-[540px] flex-col items-center justify-center overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 p-6">
        {error ? (
          <div className="absolute left-4 right-4 top-4 z-30 flex items-start gap-3 rounded-xl border border-amber-800/40 bg-amber-950/90 p-4 text-amber-200 backdrop-blur-sm">
            <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
            <p className="flex-1 text-xs font-bold">{error}</p>
            <button type="button" onClick={() => setError(null)} aria-label="Dismiss message"><X className="h-4 w-4" /></button>
          </div>
        ) : null}

        {step === "idle" ? (
          <div className="grid justify-items-center gap-5 py-8 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-teal-500/10"><Camera className="h-10 w-10 text-teal-400" /></div>
            <div><h3 className="text-xl font-extrabold text-white">Try {selectedFrame.name} with AI</h3><p className="mt-2 max-w-sm text-sm text-slate-400">Take one selfie. We use this product&apos;s catalog image automatically to generate your preview.</p></div>
            <button type="button" onClick={startCamera} className="vv-button-retail flex w-full max-w-xs justify-center gap-2 py-3"><Camera className="h-5 w-5" /> Open camera</button>
          </div>
        ) : null}

        {step === "camera" ? (
          <>
            <div className="relative aspect-square w-full max-w-lg overflow-hidden rounded-xl border border-slate-800 bg-slate-900 shadow-2xl">
              <video ref={videoElementRef} playsInline muted className="h-full w-full scale-x-[-1] object-cover" />
              <div className="pointer-events-none absolute inset-[13%_22%] rounded-[45%] border-2 border-dashed border-teal-300/70" />
              <p className="absolute bottom-3 left-3 right-3 rounded-lg bg-black/60 px-3 py-2 text-center text-xs font-bold text-white backdrop-blur-sm">{CAMERA_GUIDANCE}</p>
            </div>
            <div className="mt-6 flex gap-3"><button type="button" onClick={capturePhoto} className="vv-button bg-white text-slate-900 border-white"><Camera className="h-4 w-4" /> Capture selfie</button><button type="button" onClick={() => { stopCamera(); setStep("idle"); }} className="vv-button border-slate-700 text-slate-300">Cancel</button></div>
          </>
        ) : null}

        {step === "review" && capturedPhoto ? (
          <div className="flex w-full max-w-lg flex-col gap-5">
            <div className="relative aspect-square overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-2xl">{/* The source is a camera data URL, which is incompatible with next/image optimization. */}<img src={capturedPhoto} alt="Captured selfie ready for AI try-on" className="h-full w-full object-cover" /><div className="absolute bottom-3 left-3 right-3 rounded-lg bg-black/65 px-3 py-2 text-center text-xs font-bold text-white backdrop-blur-sm">{selectedFrame.brand} {selectedFrame.name} will be added automatically by AI.</div></div>
            <button type="button" onClick={generateAiTryOn} className="vv-button flex justify-center gap-2 border-0 bg-gradient-to-r from-teal-500 to-emerald-600 py-3 font-bold text-white"><Sparkles className="h-5 w-5" /> Generate AI preview</button>
            <button type="button" onClick={retake} className="vv-button justify-center border-slate-700 text-slate-300"><RotateCcw className="h-4 w-4" /> Retake selfie</button>
          </div>
        ) : null}

        {step === "generating" ? (
          <div className="grid justify-items-center gap-5 py-12 text-center"><Loader2 className="h-12 w-12 animate-spin text-teal-400" /><div><h3 className="text-lg font-extrabold text-white">Generating AI preview…</h3><p className="mt-2 text-sm text-slate-400">{generationMessage}</p></div><button type="button" onClick={cancelGeneration} className="vv-button border-slate-700 text-slate-300">Cancel generation</button></div>
        ) : null}

        {step === "result" && capturedPhoto && resultPhoto ? (
          <div className="flex w-full max-w-lg flex-col gap-5">
            <div ref={sliderRef} onMouseDown={() => setIsDragging(true)} onMouseMove={(event) => isDragging && handleSliderMove(event.clientX)} onMouseUp={() => setIsDragging(false)} onMouseLeave={() => setIsDragging(false)} onTouchStart={() => setIsDragging(true)} onTouchMove={(event) => event.touches[0] && handleSliderMove(event.touches[0].clientX)} onTouchEnd={() => setIsDragging(false)} className="relative aspect-square cursor-ew-resize select-none overflow-hidden rounded-xl border-2 border-teal-500 bg-slate-900 shadow-2xl">
              {/* Generated and camera images use transient dynamic URLs, so they bypass next/image optimization. */}
              <img src={resultPhoto} alt="AI generated try-on preview" className="h-full w-full pointer-events-none object-cover" />
              <div className="absolute inset-0 overflow-hidden" style={{ clipPath: `polygon(0 0, ${sliderPosition}% 0, ${sliderPosition}% 100%, 0 100%)` }}><img src={capturedPhoto} alt="Original selfie" className="h-full w-full pointer-events-none object-cover" /></div>
              <div className="absolute bottom-0 top-0 z-20 w-0.5 bg-white" style={{ left: `${sliderPosition}%` }}><div className="absolute left-1/2 top-1/2 flex h-8 w-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full bg-white text-slate-800"><ArrowLeftRight className="h-3.5 w-3.5" /></div></div>
              <span className="absolute left-3 top-3 z-20 rounded bg-slate-800/80 px-2 py-1 text-[10px] font-bold text-white">Before</span><span className="absolute right-3 top-3 z-20 rounded bg-teal-600/80 px-2 py-1 text-[10px] font-bold text-white">AI preview</span>
            </div>
            <p className="rounded-lg border border-amber-800/40 bg-amber-950/70 px-3 py-2 text-center text-[11px] font-semibold text-amber-200">AI appearance preview only. Frame fit, prescription suitability, and final product details must be confirmed by the clinic.</p>
            <div className="grid grid-cols-2 gap-3"><button type="button" onClick={downloadResult} className="vv-button-retail justify-center"><Download className="h-4 w-4" /> Save</button><button type="button" onClick={shareResult} className="vv-button border-slate-700 text-white justify-center"><Share2 className="h-4 w-4" /> Share</button><button type="button" onClick={shareWhatsApp} className="vv-button border-emerald-700 text-emerald-300 justify-center"><MessageCircle className="h-4 w-4" /> WhatsApp</button><Link href={`/frames/${selectedFrame.slug}`} className="vv-button border-teal-600 text-teal-200 justify-center"><ShoppingBag className="h-4 w-4" /> Buy this frame</Link><Link href={`/frames/try-at-home?slug=${selectedFrame.slug}`} className="col-span-2 vv-button border-dashed border-slate-600 text-slate-300 justify-center">Try at home</Link></div>
            <button type="button" onClick={retake} className="text-center text-sm font-bold text-slate-400 underline hover:text-white">Try another selfie</button>
          </div>
        ) : null}
        <canvas ref={canvasRef} className="hidden" />
      </section>
    </div>
  );
}
