"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Camera,
  Check,
  ZoomIn,
  ZoomOut,
  ArrowLeftRight,
  AlertCircle,
  ShoppingBag,
  Sparkles,
  Download,
  X,
  Loader2,
  MessageCircle,
} from "lucide-react";

/* ─────────────────────── types ─────────────────────── */

interface TryOnFrame {
  slug: string;
  name: string;
  brand: string;
  img: string; // transparent PNG front-face overlay
  pricePaise: number | null;
}

interface VirtualTryOnProps {
  productSlug?: string;
  frames?: TryOnFrame[];
}

export default function VirtualTryOn({
  productSlug = "",
  frames,
}: VirtualTryOnProps) {
  const tryOnFrames = useMemo(() => frames ?? [], [frames]);

  const [selectedIndex, setSelectedIndex] = useState(() => {
    if (productSlug) {
      const idx = tryOnFrames.findIndex((f) => f.slug === productSlug);
      return idx >= 0 ? idx : 0;
    }
    return 0;
  });

  const selectedFrame = tryOnFrames[selectedIndex];

  useEffect(() => {
    if (!tryOnFrames.length) return;
    const idx = productSlug ? tryOnFrames.findIndex((f) => f.slug === productSlug) : -1;
    setSelectedIndex(idx >= 0 ? idx : 0);
  }, [productSlug, tryOnFrames]);

  // Try-On Flow Steps: 'idle' -> 'camera' -> 'adjust' -> 'generating' -> 'result'
  const [step, setStep] = useState<"idle" | "camera" | "adjust" | "generating" | "result">("idle");
  const [error, setError] = useState<string | null>(null);

  // Stream & Capture State
  const [, setStreamActive] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null); // Raw user photo
  const [compositePhoto, setCompositePhoto] = useState<string | null>(null); // User photo + overlaid glasses
  const [aiPhoto, setAiPhoto] = useState<string | null>(null); // AI-enhanced image

  // Manual overlay fitting adjustments
  const [scale, setScale] = useState(1.0);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);

  // Before/After comparison slider position (0 to 100)
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);

  const videoElementRef = useRef<HTMLVideoElement | null>(null);
  const videoRef = useCallback((el: HTMLVideoElement | null) => {
    videoElementRef.current = el;
    if (el && streamRef.current) {
      el.srcObject = streamRef.current;
      el.play().catch((e) => {
        console.error("Video play failed:", e);
      });
    }
  }, []);

  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  /* ─────── cleanup on unmount ─────── */
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  /* ─────── start camera ─────── */
  const startCamera = async () => {
    setError(null);
    setCapturedPhoto(null);
    setCompositePhoto(null);
    setAiPhoto(null);
    setStreamActive(false);

    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }

      // Asking for standard 640x480 for maximum compatibility across devices
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 640 },
          height: { ideal: 480 },
        },
      });

      streamRef.current = stream;

      // Update state and step to mount the video element in DOM
      setStreamActive(true);
      setStep("camera");

      // The callback ref will handle setting srcObject and calling play() once mounted
    } catch (err: any) {
      console.error("Camera access failed:", err);
      setError(
        "Unable to access camera. Please check browser permissions and try again."
      );
      setStep("idle");
    }
  };

  /* ─────── stop camera ─────── */
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setStreamActive(false);
  };

  /* ─────── capture photo ─────── */
  const capturePhoto = () => {
    if (!videoElementRef.current || !canvasRef.current) return;
    const video = videoElementRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Use actual video width & height
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    // Draw video frame mirrored (standard selfie perspective)
    ctx.save();
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.restore();

    const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
    setCapturedPhoto(dataUrl);
    
    // Stop camera feed immediately to preserve battery
    stopCamera();
    
    // Reset adjustments
    setScale(1.0);
    setOffsetX(0);
    setOffsetY(0);
    
    setStep("adjust");
  };

  /* ─────── generate composite image ─────── */
  const createComposite = (): Promise<string> => {
    return new Promise((resolve) => {
      if (!canvasRef.current || !capturedPhoto) return resolve("");
      const canvas = canvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve("");

      const baseImg = new window.Image();
      baseImg.onload = () => {
        canvas.width = baseImg.width;
        canvas.height = baseImg.height;
        ctx.drawImage(baseImg, 0, 0);

        // Overlay glasses
        const glassesImg = new window.Image();
        glassesImg.onload = () => {
          const glassesW = canvas.width * 0.48 * scale;
          const glassesH = glassesW * (glassesImg.naturalHeight / glassesImg.naturalWidth);
          
          const x = (canvas.width - glassesW) / 2 + offsetX;
          const y = canvas.height * 0.32 + offsetY;

          ctx.save();
          // Draw subtle drop shadow for realistic look
          ctx.shadowColor = "rgba(0, 0, 0, 0.25)";
          ctx.shadowBlur = 10;
          ctx.shadowOffsetY = 4;
          
          ctx.drawImage(glassesImg, x, y, glassesW, glassesH);
          ctx.restore();

          resolve(canvas.toDataURL("image/jpeg", 0.95));
        };
        glassesImg.src = selectedFrame.img;
      };
      baseImg.src = capturedPhoto;
    });
  };

  /* ─────── proceed to AI Try-On generation ─────── */
  const generateAiTryOn = async () => {
    setError(null);
    setStep("generating");

    try {
      // Create the final composite photo to send to AI
      const finalComposite = await createComposite();
      setCompositePhoto(finalComposite);

      const res = await fetch("/api/ai/try-on", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: finalComposite,
          frameSlug: selectedFrame.slug,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Enhancement failed");

      if (data.source === "ai_enhanced" && data.image) {
        setAiPhoto(data.image);
        setStep("result");
      } else {
        // Fallback: Use composite photo directly
        setAiPhoto(null);
        setStep("result");
        if (data.message) {
          setError(data.message);
        }
      }
    } catch (err: any) {
      console.error("AI Try-On failed:", err);
      setError(
        "AI enhancement is currently unavailable. Displaying local fit composite."
      );
      setStep("result");
    }
  };

  /* ─────── retake photo ─────── */
  const retake = () => {
    stopCamera();
    startCamera();
  };

  /* ─────── download ─────── */
  const handleDownload = () => {
    const photo = aiPhoto || compositePhoto || capturedPhoto;
    if (!photo) return;

    const link = document.createElement("a");
    link.href = photo;
    link.download = `vision-vistara-tryon-${selectedFrame.slug}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  /* ─────── WhatsApp share ─────── */
  const handleWhatsApp = () => {
    const text = encodeURIComponent(
      `Hi Vision Vistara! I tried on the ${selectedFrame.brand} ${selectedFrame.name} using your virtual fitting room. I'd like to check its availability.`
    );
    window.open(`https://wa.me/917842938316?text=${text}`, "_blank");
  };

  /* ─────── slider comparison handlers ─────── */
  const handleSliderMove = (clientX: number) => {
    if (!sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    setSliderPosition(Math.max(0, Math.min(100, (x / rect.width) * 100)));
  };

  useEffect(() => {
    const onUp = () => setIsDragging(false);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchend", onUp);
    };
  }, []);

  const formatPrice = (paise: number | null) => {
    if (paise === null) return "Price on request";
    return `₹${(paise / 100).toLocaleString("en-IN")}`;
  };

  if (!selectedFrame) {
    return (
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-8 text-center">
        <AlertCircle className="mx-auto h-10 w-10 text-amber-600" />
        <h2 className="mt-4 text-xl font-extrabold text-amber-950">
          No frames are ready for virtual try-on
        </h2>
        <p className="mx-auto mt-2 max-w-xl text-sm font-semibold text-amber-800">
          Add a transparent AR overlay image in the product dashboard and enable virtual try-on for at least one active frame.
        </p>
        <Link href="/frames" className="vv-button-retail mt-5 inline-flex">
          Back to frames
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      {/* ─── Sidebar ─── */}
      <aside className="rounded-2xl border border-slate-200 bg-white p-6 flex flex-col gap-5 shadow-soft self-start lg:sticky lg:top-28">
        <div>
          <h2 className="text-lg font-extrabold text-slate-800">
            Select Frame
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Choose a frame to try on.
          </p>
        </div>

        <div className="grid gap-2">
          {tryOnFrames.map((frame, idx) => (
            <button
              key={frame.slug}
              type="button"
              onClick={() => setSelectedIndex(idx)}
              className={`group p-3 text-left rounded-xl border transition-all duration-200 flex items-center gap-3 ${
                selectedIndex === idx
                  ? "border-teal-500 bg-teal-50/60 ring-2 ring-teal-200"
                  : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"
              }`}
            >
              <div className="relative w-14 h-10 shrink-0 rounded-lg bg-slate-100 overflow-hidden">
                <Image
                  src={frame.img}
                  alt={frame.name}
                  fill
                  className="object-contain p-1"
                  sizes="56px"
                />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-[10px] font-bold text-slate-400 uppercase">
                  {frame.brand}
                </span>
                <p
                  className={`text-sm font-extrabold truncate ${
                    selectedIndex === idx ? "text-teal-700" : "text-slate-800"
                  }`}
                >
                  {frame.name}
                </p>
                <span className="text-xs font-bold text-slate-500">
                  {formatPrice(frame.pricePaise)}
                </span>
              </div>
              {selectedIndex === idx && (
                <Check className="h-4 w-4 text-teal-600 shrink-0" />
              )}
            </button>
          ))}
        </div>

        {/* Dynamic fitting adjustments during overlay stage */}
        {step === "adjust" && (
          <div className="border-t border-slate-100 pt-4 grid gap-3">
            <h3 className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
              Adjust Fit Position
            </h3>
            
            <div className="grid gap-1.5">
              <div className="flex justify-between text-xs font-bold text-slate-600">
                <span>Scale Frame</span>
                <span>{Math.round(scale * 100)}%</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setScale((s) => Math.max(0.6, s - 0.05))}
                  className="flex-1 py-1 px-2 border border-slate-200 rounded hover:bg-slate-50 flex justify-center"
                >
                  <ZoomOut className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setScale((s) => Math.min(1.5, s + 0.05))}
                  className="flex-1 py-1 px-2 border border-slate-200 rounded hover:bg-slate-50 flex justify-center"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="grid gap-1.5">
              <span className="text-xs font-bold text-slate-600">Vertical Alignment</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setOffsetY((y) => y - 5)}
                  className="flex-1 py-1 px-2 border border-slate-200 rounded hover:bg-slate-50 text-xs font-bold"
                >
                  Move Up
                </button>
                <button
                  onClick={() => setOffsetY((y) => y + 5)}
                  className="flex-1 py-1 px-2 border border-slate-200 rounded hover:bg-slate-50 text-xs font-bold"
                >
                  Move Down
                </button>
              </div>
            </div>

            <div className="grid gap-1.5">
              <span className="text-xs font-bold text-slate-600">Horizontal Alignment</span>
              <div className="flex gap-2">
                <button
                  onClick={() => setOffsetX((x) => x - 5)}
                  className="flex-1 py-1 px-2 border border-slate-200 rounded hover:bg-slate-50 text-xs font-bold"
                >
                  Move Left
                </button>
                <button
                  onClick={() => setOffsetX((x) => x + 5)}
                  className="flex-1 py-1 px-2 border border-slate-200 rounded hover:bg-slate-50 text-xs font-bold"
                >
                  Move Right
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Transparency/Fitting Notice */}
        <div className="rounded-xl border border-slate-100 bg-slate-50 p-3.5 text-xs text-slate-500 leading-normal mt-2">
          <div className="flex items-center gap-1.5 font-bold text-slate-700 mb-1">
            <Sparkles className="h-3.5 w-3.5 text-teal-600" />
            <span>Fitting System Notice</span>
          </div>
          <p className="text-[11px]">
            <strong>Local Overlay Fit:</strong> Precise geometric mapping that preserves exact frame sizes, colors, and rim shapes. Best for validating sizing.
          </p>
          <p className="mt-1.5 text-[11px]">
            <strong>Generative AI Try-On:</strong> Blends lighting, shadows, and textures for a realistic look. This is a simulation; frame details may vary slightly from real products.
          </p>
        </div>

        <Link
          href={`/frames/${selectedFrame.slug}`}
          className="vv-button-retail py-2.5 px-4 text-xs font-bold justify-center mt-auto flex items-center gap-1.5"
        >
          <ShoppingBag className="h-4 w-4" />
          View Frame Details
        </Link>
      </aside>

      {/* ─── Main Viewport ─── */}
      <section className="rounded-2xl border border-slate-800 bg-slate-950 p-6 flex flex-col items-center justify-center min-h-[520px] relative overflow-hidden">
        {/* Error / Alert notice */}
        {error && (
          <div className="absolute top-4 left-4 right-4 z-30 rounded-xl border border-amber-800/40 bg-amber-950/90 text-amber-300 p-4 flex items-start gap-3 backdrop-blur-sm">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-xs font-bold">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-amber-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* ──── IDLE STATE ──── */}
        {step === "idle" && (
          <div className="grid justify-items-center gap-5 text-center py-8">
            <div className="w-20 h-20 rounded-full bg-teal-500/10 flex items-center justify-center">
              <Camera className="h-10 w-10 text-teal-400" />
            </div>
            <div>
              <h3 className="text-xl font-extrabold text-white">
                AI Virtual Try-On
              </h3>
              <p className="text-sm text-slate-400 mt-2 max-w-sm">
                Take a selfie to overlay your selected frame and trigger photorealistic AI generation.
              </p>
            </div>
            <button
              onClick={startCamera}
              className="vv-button-retail py-3 font-bold flex items-center justify-center gap-2 w-full max-w-xs"
            >
              <Camera className="h-5 w-5" />
              Start Try-On
            </button>
          </div>
        )}

        {/* ──── CAMERA SCREEN ──── */}
        {step === "camera" && (
          <>
            <div className="relative w-full max-w-lg aspect-[4/3] rounded-xl overflow-hidden bg-slate-900 border border-slate-800 shadow-2xl">
              <video
                ref={videoRef}
                playsInline
                muted
                className="w-full h-full object-cover scale-x-[-1]"
              />
              <div className="absolute top-3 left-3 bg-teal-500/20 text-teal-300 border border-teal-500/30 px-3 py-1.5 rounded-full text-[10px] font-bold">
                Camera Live
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={capturePhoto}
                className="vv-button bg-white text-slate-900 border-white font-bold flex items-center gap-2 shadow-lg"
              >
                <Camera className="h-4 w-4" />
                Capture Selfie
              </button>
              <button
                onClick={() => {
                  stopCamera();
                  setStep("idle");
                }}
                className="vv-button border-slate-700 text-slate-300 font-bold"
              >
                Cancel
              </button>
            </div>
          </>
        )}

        {/* ──── ADJUST/FIT SCREEN ──── */}
        {step === "adjust" && capturedPhoto && (
          <div className="w-full max-w-lg flex flex-col gap-5">
            <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden border border-slate-700 bg-slate-900 shadow-2xl">
              {/* Selfie Background */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={capturedPhoto}
                alt="Selfie"
                className="w-full h-full object-cover"
              />
              
              {/* Glasses Overlay */}
              <div className="absolute inset-0 pointer-events-none grid place-items-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={selectedFrame.img}
                  alt="Overlaid frame"
                  style={{
                    width: `${48 * scale}%`,
                    transform: `translateX(${offsetX}px) translateY(${offsetY}px)`,
                    filter: "drop-shadow(0px 8px 12px rgba(0,0,0,0.3))",
                  }}
                  className="object-contain"
                />
              </div>

              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between bg-black/60 rounded-lg px-3 py-2 backdrop-blur-sm">
                <span className="text-xs font-bold text-white">
                  Fit glasses to your eyes using side sliders
                </span>
                <button
                  onClick={retake}
                  className="text-xs text-teal-300 hover:text-white font-bold"
                >
                  Retake
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={generateAiTryOn}
                className="col-span-2 vv-button font-bold bg-gradient-to-r from-teal-500 to-emerald-600 text-white border-0 shadow-lg hover:shadow-xl flex items-center justify-center gap-2 py-3"
              >
                <Sparkles className="h-5 w-5" />
                Generate AI Try-On
              </button>
              <button
                onClick={() => setStep("camera")}
                className="vv-button border-slate-700 text-slate-300 font-bold justify-center"
              >
                Retake Photo
              </button>
              <button
                onClick={handleWhatsApp}
                className="vv-button border-emerald-700 text-emerald-300 font-bold justify-center"
              >
                WhatsApp Fit Enquiry
              </button>
            </div>
          </div>
        )}

        {/* ──── GENERATING STATE ──── */}
        {step === "generating" && (
          <div className="grid justify-items-center gap-5 text-center py-12">
            <Loader2 className="h-12 w-12 text-teal-400 animate-spin" />
            <div>
              <h3 className="text-lg font-extrabold text-white">
                Generating AI Try-on...
              </h3>
              <p className="text-sm text-slate-400 mt-2">
                Blending lighting and skin tones with frame textures.
              </p>
            </div>
          </div>
        )}

        {/* ──── RESULT SCREEN ──── */}
        {step === "result" && capturedPhoto && (
          <div className="w-full max-w-lg flex flex-col gap-5">
            {aiPhoto ? (
              /* Before/After comparison slider */
              <div
                ref={sliderRef}
                onMouseMove={(e) => isDragging && handleSliderMove(e.clientX)}
                onTouchMove={(e) =>
                  e.touches[0] && handleSliderMove(e.touches[0].clientX)
                }
                onMouseDown={() => setIsDragging(true)}
                className="w-full aspect-[4/3] rounded-xl overflow-hidden border-2 border-teal-500 bg-slate-900 relative shadow-2xl select-none cursor-ew-resize"
              >
                {/* After: AI Enhanced */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={aiPhoto}
                  alt="AI Try-On"
                  className="w-full h-full object-cover pointer-events-none"
                />
                
                {/* Before: Fitted composite */}
                <div
                  className="absolute inset-0 overflow-hidden"
                  style={{
                    clipPath: `polygon(0 0, ${sliderPosition}% 0, ${sliderPosition}% 100%, 0 100%)`,
                  }}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={compositePhoto || capturedPhoto}
                    alt="Original photo"
                    className="w-full h-full object-cover pointer-events-none"
                  />
                </div>

                {/* Slider handle */}
                <div
                  className="absolute top-0 bottom-0 w-0.5 bg-white z-20 pointer-events-none"
                  style={{ left: `${sliderPosition}%` }}
                >
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white text-slate-800 rounded-full border border-teal-500 flex items-center justify-center shadow-lg pointer-events-none">
                    <ArrowLeftRight className="h-3.5 w-3.5" />
                  </div>
                </div>

                <div className="absolute top-3 left-3 bg-slate-800/80 text-white text-[10px] font-bold px-2 py-0.5 rounded backdrop-blur-sm z-20">
                  Before
                </div>
                <div className="absolute top-3 right-3 bg-teal-600/80 text-white text-[10px] font-bold px-2 py-0.5 rounded backdrop-blur-sm z-20">
                  AI Enhanced
                </div>
                
                <div className="absolute bottom-3 left-3 right-3 bg-amber-950/90 border border-amber-800/40 text-amber-300 text-[10px] font-semibold px-2 py-1 rounded backdrop-blur-sm z-20 text-center leading-normal">
                  ⚠️ AI simulation preview: Frame details/dimensions may vary slightly from real product.
                </div>
              </div>
            ) : (
              /* Composite fallback preview */
              <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden border border-slate-700 bg-slate-900 shadow-2xl">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={compositePhoto || capturedPhoto}
                  alt="Fit composite"
                  className="w-full h-full object-cover"
                />
                <div className="absolute top-3 left-3 bg-teal-600 text-white text-[10px] font-bold px-2 py-1 rounded">
                  Fitted Composite Preview
                </div>
                
                <div className="absolute bottom-3 left-3 right-3 bg-teal-950/90 border border-teal-800/40 text-teal-300 text-[10px] font-semibold px-2.5 py-1.5 rounded backdrop-blur-sm text-center leading-normal">
                  💡 High-fidelity overlay fits exact frame geometry & details onto your photo.
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleDownload}
                className="vv-button-retail justify-center font-bold flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Download Image
              </button>
              <button
                onClick={handleWhatsApp}
                className="vv-button border-slate-700 text-white justify-center font-bold flex items-center gap-2"
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp Share
              </button>
              <button
                onClick={() => setStep("adjust")}
                className="col-span-2 vv-button border-dashed border-slate-700 text-slate-400 justify-center hover:text-white"
              >
                Adjust Fit Positioning
              </button>
            </div>
            
            <button
              onClick={retake}
              className="text-sm font-bold text-slate-400 hover:text-white underline text-center"
            >
              Try Another Frame
            </button>
          </div>
        )}

        <canvas ref={canvasRef} className="hidden" />
      </section>
    </div>
  );
}
