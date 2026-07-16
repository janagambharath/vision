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
  ChevronDown,
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
const AI_PRIVACY_CONSENT_VERSION = "2026-07-v1";

function fittedDimensions(width: number, height: number) {
  const longestSide = Math.max(width, height);
  if (!longestSide || longestSide <= MAX_CAPTURE_DIMENSION) return { width, height };
  const scale = MAX_CAPTURE_DIMENSION / longestSide;
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
}

export default function VirtualTryOn({ productSlug = "", frames }: VirtualTryOnProps) {
  const tryOnFrames = useMemo(() => frames ?? [], [frames]);
  const [selectedIndex, setSelectedIndex] = useState(() => Math.max(0, tryOnFrames.findIndex((frame) => frame.slug === productSlug)));
  const [step, setStep] = useState<TryOnStep>("idle");
  const [error, setError] = useState<string | null>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [resultPhoto, setResultPhoto] = useState<string | null>(null);
  const [privacyConsent, setPrivacyConsent] = useState(false);
  const [generationMessage, setGenerationMessage] = useState("Preparing your secure preview…");
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [isFramePickerOpen, setIsFramePickerOpen] = useState(false);

  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const selfieFileInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sliderRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const selectedFrame = tryOnFrames[selectedIndex];

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    setCameraReady(false);
  }, []);

  useEffect(() => {
    const nextIndex = tryOnFrames.findIndex((frame) => frame.slug === productSlug);
    setSelectedIndex(nextIndex >= 0 ? nextIndex : 0);
  }, [productSlug, tryOnFrames]);

  useEffect(() => () => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    abortRef.current?.abort();
  }, []);

  // Attach the camera stream to the video element once React has rendered it.
  // This replaces the previous setTimeout(0) which raced against React's render
  // commit and frequently left videoElementRef.current as null.
  useEffect(() => {
    if (step !== "camera" || !streamRef.current) return;

    let cancelled = false;

    function tryAttach() {
      if (cancelled) return;
      const video = videoElementRef.current;
      if (!video) {
        // Video element is not yet in the DOM — wait for the next frame.
        requestAnimationFrame(tryAttach);
        return;
      }
      if (video.srcObject !== streamRef.current) {
        video.srcObject = streamRef.current;
      }
      video.play()
        .then(() => { if (!cancelled) setCameraReady(true); })
        .catch(() => {
          // Autoplay may be blocked — user gesture is still required on some
          // browsers. Try once more after a brief delay.
          if (!cancelled) {
            window.setTimeout(() => {
              video.play()
                .then(() => { if (!cancelled) setCameraReady(true); })
                .catch(() => undefined);
            }, 200);
          }
        });
    }

    // Use rAF to ensure the DOM is committed after React render.
    requestAnimationFrame(tryAttach);

    return () => { cancelled = true; };
  }, [step]);

  // The site-wide WhatsApp button otherwise sits on top of the primary
  // generation action on small screens.
  useEffect(() => {
    document.body.classList.add("try-on-active");
    return () => document.body.classList.remove("try-on-active");
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

  const startCamera = async () => {
    setError(null);
    setCapturedPhoto(null);
    setResultPhoto(null);
    setCameraReady(false);
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setError("Camera access needs HTTPS and browser permission. Use the phone-photo option instead.");
      setStep("idle");
      return;
    }
    try {
      stopCamera();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 1080 }, height: { ideal: 1080 } },
        audio: false
      });
      streamRef.current = stream;
      // Transition to the camera step — the useEffect above will reliably
      // attach the stream once the <video> element is mounted by React.
      setStep("camera");
    } catch (cameraError) {
      const detail = cameraError instanceof DOMException && cameraError.name === "NotAllowedError"
        ? "Camera permission was denied."
        : "Unable to access your camera.";
      setError(`${detail} Check browser permissions or use the phone-photo option instead.`);
      setStep("idle");
    }
  };

  const capturePhoto = () => {
    const video = videoElementRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    if (!video.videoWidth || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
      setError("Camera is still starting. Wait a moment until you can see yourself, then capture again.");
      return;
    }
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

  const prepareSelfieFile = async (file: File) => {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Choose a JPEG, PNG, or WebP selfie.");
      return;
    }
    if (file.size > 12 * 1024 * 1024) {
      setError("Choose a selfie smaller than 12 MB.");
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    const image = document.createElement("img");
    try {
      const dataUri = await new Promise<string>((resolve, reject) => {
        image.onload = () => {
          const dimensions = fittedDimensions(image.naturalWidth, image.naturalHeight);
          const canvas = document.createElement("canvas");
          canvas.width = dimensions.width;
          canvas.height = dimensions.height;
          const context = canvas.getContext("2d");
          if (!context) return reject(new Error("Canvas is unavailable."));
          context.drawImage(image, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL("image/jpeg", 0.88));
        };
        image.onerror = () => reject(new Error("The selected photo could not be read."));
        image.src = objectUrl;
      });
      setError(null);
      setCapturedPhoto(dataUri);
      setResultPhoto(null);
      stopCamera();
      setStep("review");
    } catch (fileError) {
      setError(fileError instanceof Error ? fileError.message : "The selected photo could not be prepared.");
      setStep("idle");
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  };

  const handleSelfieFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (file) void prepareSelfieFile(file);
  };

  const generateAiTryOn = async () => {
    if (!capturedPhoto || !selectedFrame) return;
    if (!privacyConsent) {
      setError("Please confirm the temporary image-processing notice before generating a preview.");
      return;
    }
    setError(null);
    setStep("generating");
    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const response = await fetch("/api/ai/try-on", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          frameSlug: selectedFrame.slug,
          customerImage: capturedPhoto,
          privacyConsent: true,
          privacyConsentVersion: AI_PRIVACY_CONSENT_VERSION
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

  const selectFrame = (index: number) => {
    setSelectedIndex(index);
    setStep("idle");
    setCapturedPhoto(null);
    setResultPhoto(null);
    setError(null);
    setIsFramePickerOpen(false);
  };

  const renderFrameOptions = () => tryOnFrames.map((frame, index) => (
    <button
      key={frame.slug}
      type="button"
      onClick={() => selectFrame(index)}
      className={`flex min-w-0 items-center gap-3 rounded-xl border p-3 text-left transition ${selectedIndex === index ? "border-teal-500 bg-teal-50 ring-2 ring-teal-200" : "border-slate-200 hover:border-slate-300 hover:bg-slate-50"}`}
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
  ));

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
    <div className="grid gap-4 lg:grid-cols-[320px_1fr] lg:gap-6">
      <aside className="order-2 self-start rounded-2xl border border-slate-200 bg-white p-4 shadow-soft lg:order-1 lg:sticky lg:top-28 lg:p-6">
        <h2 className="text-lg font-extrabold text-slate-800">Select Frame</h2>
        <p className="mt-1 text-xs text-slate-500">The selected product image is used automatically. No frame upload or positioning is needed.</p>
        <div className="mt-4 lg:hidden">
          <button
            type="button"
            onClick={() => setIsFramePickerOpen((open) => !open)}
            aria-expanded={isFramePickerOpen}
            aria-controls="mobile-frame-picker"
            className="flex min-h-[58px] w-full items-center gap-3 rounded-xl border border-teal-200 bg-teal-50 px-3 text-left transition hover:border-teal-400"
          >
            <div className="relative h-10 w-14 shrink-0 overflow-hidden rounded-lg bg-white">
              <Image src={selectedFrame.img} alt="" fill className="object-contain p-1" sizes="56px" />
            </div>
            <span className="min-w-0 flex-1">
              <span className="block text-[10px] font-bold uppercase text-teal-700">Selected frame</span>
              <span className="block truncate text-sm font-extrabold text-slate-800">{selectedFrame.brand} {selectedFrame.name}</span>
            </span>
            <ChevronDown className={`h-5 w-5 shrink-0 text-teal-700 transition-transform ${isFramePickerOpen ? "rotate-180" : ""}`} />
          </button>
          {isFramePickerOpen ? (
            <div id="mobile-frame-picker" className="mt-3 grid max-h-80 gap-2 overflow-y-auto pr-1 [scrollbar-width:thin]">
              {renderFrameOptions()}
            </div>
          ) : null}
        </div>
        <div className="mt-4 hidden max-h-[calc(100vh-20rem)] gap-2 overflow-y-auto pr-1 [scrollbar-width:thin] lg:grid">
          {renderFrameOptions()}
        </div>
        <div className="mt-5 rounded-xl border border-teal-100 bg-teal-50 p-3 text-xs leading-relaxed text-teal-900">
          <strong className="block">AI preview, not a fit guarantee</strong>
          The frame is selected from the product catalog ({selectedFrame.imageRole === "transparent" ? "transparent reference" : "product-image fallback"}). Confirm fit and prescription with the clinic.
        </div>
        <Link href={`/frames/${selectedFrame.slug}`} className="vv-button-retail mt-5 flex justify-center gap-2 py-2.5 text-xs">
          <ShoppingBag className="h-4 w-4" /> View frame details
        </Link>
      </aside>

      <section className="order-1 relative flex min-h-[420px] flex-col items-center justify-center overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 p-4 lg:order-2 lg:min-h-[540px] lg:p-6">
        {error ? (
          <div className="absolute left-3 right-3 top-3 z-30 flex items-start gap-3 rounded-xl border border-amber-800/40 bg-amber-950/90 p-3 text-amber-200 backdrop-blur-sm sm:left-4 sm:right-4 sm:top-4 sm:p-4">
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
            <button type="button" onClick={() => selfieFileInputRef.current?.click()} className="vv-button flex w-full max-w-xs justify-center gap-2 border-slate-600 py-3 text-slate-200"><Camera className="h-5 w-5" /> Use phone camera or photo</button>
          </div>
        ) : null}

        {step === "camera" ? (
          <>
            <div className="relative aspect-square w-full max-w-lg overflow-hidden rounded-xl border border-slate-800 bg-slate-900 shadow-2xl">
              <video ref={videoElementRef} autoPlay playsInline muted className="h-full w-full scale-x-[-1] object-cover" />
              {!cameraReady ? (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 bg-slate-900/80 backdrop-blur-sm">
                  <Loader2 className="h-8 w-8 animate-spin text-teal-400" />
                  <p className="text-xs font-bold text-slate-300">Connecting camera…</p>
                </div>
              ) : null}
              <div className="pointer-events-none absolute inset-[13%_22%] rounded-[45%] border-2 border-dashed border-teal-300/70" />
              <p className="absolute bottom-3 left-3 right-3 rounded-lg bg-black/60 px-3 py-2 text-center text-xs font-bold text-white backdrop-blur-sm">{CAMERA_GUIDANCE}</p>
            </div>
            <div className="mt-6 flex gap-3"><button type="button" onClick={capturePhoto} disabled={!cameraReady} className="vv-button bg-white text-slate-900 border-white disabled:opacity-50 disabled:cursor-not-allowed"><Camera className="h-4 w-4" /> Capture selfie</button><button type="button" onClick={() => { stopCamera(); setStep("idle"); }} className="vv-button border-slate-700 text-slate-300">Cancel</button></div>
          </>
        ) : null}

        {step === "review" && capturedPhoto ? (
          <div className="flex w-full max-w-lg flex-col gap-5">
            <div className="relative aspect-square overflow-hidden rounded-xl border border-slate-700 bg-slate-900 shadow-2xl">{/* The source is a camera data URL, which is incompatible with next/image optimization. */}<img src={capturedPhoto} alt="Captured selfie ready for AI try-on" className="h-full w-full object-cover" /><div className="absolute bottom-3 left-3 right-3 rounded-lg bg-black/65 px-3 py-2 text-center text-xs font-bold text-white backdrop-blur-sm">{selectedFrame.brand} {selectedFrame.name} will be added automatically by AI.</div></div>
            <label className="flex items-start gap-2 rounded-lg border border-slate-700 bg-slate-900/70 p-3 text-left text-xs leading-5 text-slate-300"><input type="checkbox" checked={privacyConsent} onChange={(event) => setPrivacyConsent(event.target.checked)} className="mt-1" /><span>I consent to temporary processing of this selfie and preview by Google Gemini and Cloudinary. Both are automatically deleted within 30 days; do not use this tool for medical assessment.</span></label>
            <button type="button" onClick={generateAiTryOn} disabled={!privacyConsent} className="vv-button flex justify-center gap-2 border-0 bg-gradient-to-r from-teal-500 to-emerald-600 py-3 font-bold text-white disabled:cursor-not-allowed disabled:opacity-50"><Sparkles className="h-5 w-5" /> Generate AI preview</button>
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
            <div className="grid grid-cols-2 gap-3"><button type="button" onClick={downloadResult} className="vv-button-retail justify-center"><Download className="h-4 w-4" /> Save</button><button type="button" onClick={shareResult} className="vv-button border-slate-700 text-white justify-center"><Share2 className="h-4 w-4" /> Share</button><button type="button" onClick={shareWhatsApp} className="vv-button border-emerald-700 text-emerald-300 justify-center"><MessageCircle className="h-4 w-4" /> WhatsApp</button><Link href={`/frames/${selectedFrame.slug}`} className="vv-button border-teal-600 text-teal-200 justify-center"><ShoppingBag className="h-4 w-4" /> Buy this frame</Link><Link href={`/frames/try-at-home?productIds=${encodeURIComponent(selectedFrame.slug)}`} className="vv-button border-dashed border-slate-600 text-slate-300 justify-center">Request a home trial</Link><Link href="/frames" className="vv-button border-slate-700 text-slate-300 justify-center">Continue shopping</Link></div>
            <button type="button" onClick={retake} className="text-center text-sm font-bold text-slate-400 underline hover:text-white">Try another selfie</button>
          </div>
        ) : null}
        <canvas ref={canvasRef} className="hidden" />
        <input ref={selfieFileInputRef} type="file" accept="image/jpeg,image/png,image/webp" capture="user" className="hidden" onChange={handleSelfieFile} />
      </section>
    </div>
  );
}
