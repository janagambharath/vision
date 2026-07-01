"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Camera,
  Check,
  ArrowLeftRight,
  AlertCircle,
  ShoppingBag,
  Sparkles,
  Download,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  MonitorSmartphone,
  Aperture,
  RotateCcw,
  Loader2,
  ImageIcon,
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

/* ─────── default frames from active inventory ─────── */

const defaultFrames: TryOnFrame[] = [
  {
    slug: "supersight-b-titanium-6009",
    name: "B-Titanium IP 6009",
    brand: "Supersight Evelicar",
    img: "/assets/inventory/supersight-b-titanium-6009/ar-front.png",
    pricePaise: 429900,
  },
  {
    slug: "suphous-pink-96409",
    name: "Suphous 96409",
    brand: "Suphous Eyewear",
    img: "/assets/inventory/suphous-pink-96409/ar-front.png",
    pricePaise: 279900,
  },
];

/* ─────────── face landmark indices ─────────── */
// MediaPipe Face Mesh key points for eyewear placement
const NOSE_BRIDGE = 6;
const LEFT_EYE_OUTER = 33;
const RIGHT_EYE_OUTER = 263;

/* ─────────────── component ─────────────── */

export default function VirtualTryOn({
  productSlug = "",
  frames,
}: VirtualTryOnProps) {
  const tryOnFrames = frames && frames.length > 0 ? frames : defaultFrames;

  const [selectedIndex, setSelectedIndex] = useState(() => {
    if (productSlug) {
      const idx = tryOnFrames.findIndex((f) => f.slug === productSlug);
      return idx >= 0 ? idx : 0;
    }
    return 0;
  });

  const selectedFrame = tryOnFrames[selectedIndex];

  // Camera & detection state
  const [step, setStep] = useState<
    "idle" | "camera" | "captured" | "generating" | "result"
  >("idle");
  const [error, setError] = useState<string | null>(null);
  const [faceDetected, setFaceDetected] = useState(false);

  // Captured images
  const [rawPhoto, setRawPhoto] = useState<string | null>(null);
  const [compositePhoto, setCompositePhoto] = useState<string | null>(null);
  const [aiPhoto, setAiPhoto] = useState<string | null>(null);

  // Before/After slider
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);

  // Refs
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const faceMeshRef = useRef<any>(null);
  const animFrameRef = useRef<number>(0);
  const frameImgRef = useRef<HTMLImageElement | null>(null);

  /* ─────── preload frame image ─────── */
  useEffect(() => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.src = selectedFrame.img;
    frameImgRef.current = img;
  }, [selectedFrame.img]);

  /* ─────── cleanup on unmount ─────── */
  useEffect(() => {
    return () => {
      stopCamera();
      if (faceMeshRef.current) {
        faceMeshRef.current.close();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ─────── start camera ─────── */
  const startCamera = useCallback(async () => {
    setError(null);
    setRawPhoto(null);
    setCompositePhoto(null);
    setAiPhoto(null);
    setFaceDetected(false);

    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "user",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }

      setStep("camera");
      initFaceMesh();
    } catch (err: any) {
      console.error("Camera access failed:", err);
      setError(
        "Unable to access camera. Please check browser permissions and try again."
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ─────── stop camera ─────── */
  const stopCamera = useCallback(() => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = 0;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  /* ─────── MediaPipe Face Mesh init ─────── */
  const initFaceMesh = useCallback(async () => {
    try {
      // Dynamic import for client-side only
      const FaceMeshModule = await import("@mediapipe/face_mesh");
      const FaceMesh = FaceMeshModule.FaceMesh;

      const faceMesh = new FaceMesh({
        locateFile: (file: string) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
      });

      faceMesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });

      faceMesh.onResults((results: any) => {
        if (
          results.multiFaceLandmarks &&
          results.multiFaceLandmarks.length > 0
        ) {
          setFaceDetected(true);
          drawOverlay(results.multiFaceLandmarks[0]);
        } else {
          setFaceDetected(false);
          clearOverlay();
        }
      });

      faceMeshRef.current = faceMesh;
      startDetectionLoop(faceMesh);
    } catch (err) {
      console.warn("MediaPipe Face Mesh load failed, using basic overlay:", err);
      // Fallback: basic centered overlay without face detection
      startBasicOverlayLoop();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ─────── detection loop ─────── */
  const startDetectionLoop = useCallback(
    (faceMesh: any) => {
      const detect = async () => {
        if (
          videoRef.current &&
          videoRef.current.readyState >= 2 &&
          streamRef.current
        ) {
          try {
            await faceMesh.send({ image: videoRef.current });
          } catch {
            // Frame send error, continue loop
          }
        }
        if (streamRef.current) {
          animFrameRef.current = requestAnimationFrame(detect);
        }
      };
      animFrameRef.current = requestAnimationFrame(detect);
    },
    []
  );

  /* ─────── basic overlay loop (fallback) ─────── */
  const startBasicOverlayLoop = useCallback(() => {
    const draw = () => {
      if (!overlayCanvasRef.current || !videoRef.current || !streamRef.current)
        return;
      const canvas = overlayCanvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      canvas.width = videoRef.current.videoWidth || 640;
      canvas.height = videoRef.current.videoHeight || 480;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Draw frame at center (basic positioning)
      const img = frameImgRef.current;
      if (img && img.complete && img.naturalWidth > 0) {
        const frameW = canvas.width * 0.45;
        const frameH = frameW * (img.naturalHeight / img.naturalWidth);
        const x = (canvas.width - frameW) / 2;
        const y = canvas.height * 0.3;

        ctx.shadowColor = "rgba(0, 0, 0, 0.3)";
        ctx.shadowBlur = 12;
        ctx.shadowOffsetY = 6;
        ctx.drawImage(img, x, y, frameW, frameH);
        ctx.shadowColor = "transparent";
      }

      setFaceDetected(true); // Mark as usable in fallback mode
      if (streamRef.current) {
        animFrameRef.current = requestAnimationFrame(draw);
      }
    };
    animFrameRef.current = requestAnimationFrame(draw);
  }, []);

  /* ─────── draw frame overlay on landmarks ─────── */
  const drawOverlay = useCallback(
    (landmarks: any[]) => {
      if (!overlayCanvasRef.current || !videoRef.current) return;
      const canvas = overlayCanvasRef.current;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      const vw = videoRef.current.videoWidth || 640;
      const vh = videoRef.current.videoHeight || 480;
      canvas.width = vw;
      canvas.height = vh;

      ctx.clearRect(0, 0, vw, vh);

      const img = frameImgRef.current;
      if (!img || !img.complete || img.naturalWidth === 0) return;

      // Get key facial points
      const leftOuter = landmarks[LEFT_EYE_OUTER];
      const rightOuter = landmarks[RIGHT_EYE_OUTER];
      const noseBridge = landmarks[NOSE_BRIDGE];

      if (!leftOuter || !rightOuter || !noseBridge) return;

      // Calculate eye span in pixels (mirrored because camera is mirrored)
      const leftX = (1 - leftOuter.x) * vw;
      const rightX = (1 - rightOuter.x) * vw;
      const eyeSpan = Math.abs(leftX - rightX);

      // Frame width = eye span + padding for temples
      const frameW = eyeSpan * 1.55;
      const frameH = frameW * (img.naturalHeight / img.naturalWidth);

      // Position: center between eyes, slightly above nose bridge
      const centerX = ((1 - noseBridge.x) * vw);
      const bridgeY = noseBridge.y * vh;


      // Calculate rotation from eye angle
      const angle = Math.atan2(
        (1 - rightOuter.y) * vh - (1 - leftOuter.y) * vh,
        rightX - leftX
      );

      ctx.save();
      ctx.translate(centerX, bridgeY);
      ctx.rotate(-angle);

      // Subtle shadow for realism
      ctx.shadowColor = "rgba(0, 0, 0, 0.25)";
      ctx.shadowBlur = 10;
      ctx.shadowOffsetY = 4;

      ctx.drawImage(
        img,
        -frameW / 2,
        -frameH * 0.45,
        frameW,
        frameH
      );

      ctx.restore();
    },
    []
  );

  /* ─────── clear overlay ─────── */
  const clearOverlay = useCallback(() => {
    if (!overlayCanvasRef.current) return;
    const ctx = overlayCanvasRef.current.getContext("2d");
    if (ctx) {
      ctx.clearRect(
        0,
        0,
        overlayCanvasRef.current.width,
        overlayCanvasRef.current.height
      );
    }
  }, []);

  /* ─────── take photo ─────── */
  const takePhoto = useCallback(() => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const w = video.videoWidth;
    const h = video.videoHeight;
    canvas.width = w;
    canvas.height = h;

    // Draw mirrored video for the raw "before" photo
    ctx.save();
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, w, h);
    ctx.restore();

    const rawDataUrl = canvas.toDataURL("image/jpeg", 0.92);
    setRawPhoto(rawDataUrl);

    // Draw composite with frame overlay for the "after" photo
    if (overlayCanvasRef.current) {
      ctx.drawImage(overlayCanvasRef.current, 0, 0, w, h);
    }

    const compositeDataUrl = canvas.toDataURL("image/jpeg", 0.92);
    setCompositePhoto(compositeDataUrl);

    stopCamera();
    setStep("captured");
  }, [stopCamera]);

  /* ─────── retake ─────── */
  const retake = useCallback(() => {
    setRawPhoto(null);
    setCompositePhoto(null);
    setAiPhoto(null);
    setStep("idle");
    startCamera();
  }, [startCamera]);

  /* ─────── AI enhancement (optional, honest) ─────── */
  const generateAiEnhancement = useCallback(async () => {
    if (!compositePhoto) return;
    setStep("generating");
    setError(null);

    try {
      const res = await fetch("/api/ai/try-on", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: compositePhoto,
          frameSlug: selectedFrame.slug,
        }),
      });
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "AI enhancement failed");

      if (data.source === "ai_enhanced" && data.image) {
        setAiPhoto(data.image);
        setStep("result");
      } else {
        // No AI model available — inform the user honestly
        setError(
          "AI enhancement is not available right now. Your composite preview is ready to use."
        );
        setStep("captured");
      }
    } catch (err: any) {
      setError(
        err.message || "AI enhancement failed. Your composite preview is still available."
      );
      setStep("captured");
    }
  }, [compositePhoto, selectedFrame.slug]);

  /* ─────── download ─────── */
  const handleDownload = useCallback(() => {
    const photo = aiPhoto || compositePhoto;
    if (!photo) return;

    const link = document.createElement("a");
    link.href = photo;
    link.download = `vision-vistara-tryon-${selectedFrame.slug}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }, [aiPhoto, compositePhoto, selectedFrame.slug]);

  /* ─────── WhatsApp share ─────── */
  const handleWhatsApp = useCallback(() => {
    const text = encodeURIComponent(
      `Hi Vision Vistara! I tried the ${selectedFrame.brand} ${selectedFrame.name} using your virtual try-on. I'd like to know more about this frame.`
    );
    window.open(`https://wa.me/917842938316?text=${text}`, "_blank");
  }, [selectedFrame]);

  /* ─────── slider drag ─────── */
  const handleSliderMove = useCallback(
    (clientX: number) => {
      if (!sliderRef.current) return;
      const rect = sliderRef.current.getBoundingClientRect();
      const x = clientX - rect.left;
      setSliderPosition(Math.max(0, Math.min(100, (x / rect.width) * 100)));
    },
    []
  );

  useEffect(() => {
    const onUp = () => setIsDragging(false);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("touchend", onUp);
    return () => {
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("touchend", onUp);
    };
  }, []);

  /* ─────── frame navigation ─────── */
  const prevFrame = () =>
    setSelectedIndex((i) => (i > 0 ? i - 1 : tryOnFrames.length - 1));
  const nextFrame = () =>
    setSelectedIndex((i) => (i < tryOnFrames.length - 1 ? i + 1 : 0));

  /* ─────────────────── RENDER ─────────────────── */

  const formatPrice = (paise: number | null) => {
    if (paise === null) return "Price on request";
    return `₹${(paise / 100).toLocaleString("en-IN")}`;
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      {/* ─── Sidebar ─── */}
      <aside className="rounded-2xl border border-slate-200 bg-white p-6 flex flex-col gap-5 shadow-soft self-start lg:sticky lg:top-28">
        <div>
          <h2 className="text-lg font-extrabold text-slate-800">
            Select Frame
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Choose a frame to try on with your camera.
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

        {/* Quick nav for mobile */}
        <div className="flex gap-2 lg:hidden">
          <button
            onClick={prevFrame}
            className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
          >
            <ChevronLeft className="h-3.5 w-3.5" /> Previous
          </button>
          <button
            onClick={nextFrame}
            className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-50"
          >
            Next <ChevronRight className="h-3.5 w-3.5" />
          </button>
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
        {/* Error banner */}
        {error && (
          <div className="absolute top-4 left-4 right-4 z-30 rounded-xl border border-red-800/50 bg-red-950/90 text-red-300 p-4 flex items-start gap-3 backdrop-blur-sm">
            <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold text-sm block">Try-On Notice</span>
              <p className="text-xs mt-0.5 opacity-90">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* ──── IDLE STATE ──── */}
        {step === "idle" && !error && (
          <div className="grid justify-items-center gap-5 text-center py-8">
            <div className="relative">
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-teal-500/20 to-teal-700/20 flex items-center justify-center">
                <Aperture className="h-12 w-12 text-teal-400" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-8 h-8 rounded-full bg-teal-500 flex items-center justify-center shadow-lg">
                <Camera className="h-4 w-4 text-white" />
              </div>
            </div>
            <div>
              <h3 className="text-xl font-extrabold text-white">
                Virtual Frame Try-On
              </h3>
              <p className="text-sm text-slate-400 mt-2 max-w-sm">
                See how frames look on your face using your camera. Your stream
                stays private — nothing is uploaded until you choose to save.
              </p>
            </div>
            <div className="flex flex-col gap-3 w-full max-w-xs">
              <button
                onClick={startCamera}
                className="vv-button-retail py-3 font-bold flex items-center justify-center gap-2 w-full"
              >
                <Camera className="h-5 w-5" />
                Open Camera
              </button>
              <div className="flex items-center gap-2 text-[10px] text-slate-500 justify-center">
                <MonitorSmartphone className="h-3.5 w-3.5" />
                Works on mobile and desktop browsers
              </div>
            </div>
          </div>
        )}

        {/* ──── CAMERA LIVE ──── */}
        {step === "camera" && (
          <>
            <div className="relative w-full max-w-lg aspect-[4/3] rounded-xl overflow-hidden bg-slate-900 border border-slate-800 shadow-2xl">
              <video
                ref={videoRef}
                playsInline
                muted
                className="w-full h-full object-cover scale-x-[-1]"
              />
              {/* Overlay canvas for frame positioning */}
              <canvas
                ref={overlayCanvasRef}
                className="absolute inset-0 w-full h-full object-cover scale-x-[-1] pointer-events-none"
              />
              {/* Face detection indicator */}
              <div
                className={`absolute top-3 left-3 flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-bold backdrop-blur-md transition-all duration-300 ${
                  faceDetected
                    ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                    : "bg-amber-500/20 text-amber-300 border border-amber-500/30 animate-pulse"
                }`}
              >
                <div
                  className={`w-2 h-2 rounded-full ${
                    faceDetected ? "bg-emerald-400" : "bg-amber-400"
                  }`}
                />
                {faceDetected ? "Face detected" : "Position your face"}
              </div>

              {/* Selected frame label */}
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between bg-black/60 rounded-lg px-3 py-2 backdrop-blur-sm">
                <div className="flex items-center gap-2">
                  <Eye className="h-3.5 w-3.5 text-teal-400" />
                  <span className="text-xs font-bold text-white">
                    {selectedFrame.name}
                  </span>
                </div>
                <span className="text-[10px] text-slate-400">
                  {selectedFrame.brand}
                </span>
              </div>
            </div>

            {/* Camera controls */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={takePhoto}
                disabled={!faceDetected}
                className="vv-button bg-white text-slate-900 border-white font-bold flex items-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-100"
              >
                <Camera className="h-4 w-4" />
                {faceDetected ? "Capture Photo" : "Detecting face..."}
              </button>
              <button
                onClick={() => {
                  stopCamera();
                  setStep("idle");
                }}
                className="vv-button border-slate-700 text-slate-300 font-bold hover:border-slate-500 hover:text-white"
              >
                <X className="h-4 w-4" />
                Cancel
              </button>
            </div>
          </>
        )}

        {/* ──── CAPTURED STATE ──── */}
        {step === "captured" && compositePhoto && (
          <div className="w-full max-w-lg flex flex-col gap-5">
            <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden border border-slate-700 bg-slate-900 shadow-2xl">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={compositePhoto}
                alt="Your try-on preview"
                className="w-full h-full object-cover"
              />
              <div className="absolute top-3 left-3 bg-teal-600/90 text-white text-[10px] font-black uppercase px-2.5 py-1 rounded-md tracking-wider backdrop-blur-sm">
                <div className="flex items-center gap-1.5">
                  <ImageIcon className="h-3 w-3" />
                  Frame Preview
                </div>
              </div>
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between bg-black/70 rounded-lg px-3 py-2 backdrop-blur-sm">
                <span className="text-xs font-bold text-white flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5 text-teal-400" />
                  {selectedFrame.name}
                </span>
                <button
                  onClick={retake}
                  className="text-xs text-teal-300 hover:text-white font-bold flex items-center gap-1"
                >
                  <RotateCcw className="h-3 w-3" />
                  Retake
                </button>
              </div>
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={generateAiEnhancement}
                className="col-span-2 vv-button font-bold bg-gradient-to-r from-teal-500 to-emerald-600 text-white border-0 shadow-lg hover:shadow-xl flex items-center justify-center gap-2 py-3 transition-all"
              >
                <Sparkles className="h-5 w-5" />
                Enhance with AI (Optional)
              </button>
              <button
                onClick={handleDownload}
                className="vv-button border-slate-700 text-white font-bold justify-center hover:border-teal-500"
              >
                <Download className="h-4 w-4" />
                Save Image
              </button>
              <button
                onClick={handleWhatsApp}
                className="vv-button border-emerald-700 text-emerald-300 font-bold justify-center hover:bg-emerald-900/30"
              >
                <MessageCircle className="h-4 w-4" />
                Send to WhatsApp
              </button>
            </div>

            <p className="text-[11px] text-slate-500 text-center">
              The preview shows the selected frame positioned on your face using
              camera detection. Results are approximate — visit the clinic for
              precise fitting.
            </p>
          </div>
        )}

        {/* ──── GENERATING STATE ──── */}
        {step === "generating" && (
          <div className="grid justify-items-center gap-5 text-center py-12">
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-teal-500/10 flex items-center justify-center animate-pulse">
                <Loader2 className="h-10 w-10 text-teal-400 animate-spin" />
              </div>
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-white">
                Enhancing your preview...
              </h3>
              <p className="text-sm text-slate-400 mt-2">
                AI model is refining lighting and frame integration. This may
                take a few seconds.
              </p>
            </div>
          </div>
        )}

        {/* ──── AI RESULT with Before/After ──── */}
        {step === "result" && aiPhoto && rawPhoto && (
          <div className="w-full max-w-lg flex flex-col gap-5">
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
                alt="AI enhanced try-on"
                className="w-full h-full object-cover pointer-events-none"
              />
              {/* Before: Raw photo */}
              <div
                className="absolute inset-0 overflow-hidden"
                style={{
                  clipPath: `polygon(0 0, ${sliderPosition}% 0, ${sliderPosition}% 100%, 0 100%)`,
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={rawPhoto}
                  alt="Before capture"
                  className="w-full h-full object-cover pointer-events-none"
                />
              </div>

              {/* Slider handle */}
              <div
                className="absolute top-0 bottom-0 w-0.5 bg-white/80 z-20 pointer-events-none"
                style={{ left: `${sliderPosition}%` }}
              >
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-9 h-9 bg-white text-slate-800 rounded-full border-2 border-teal-400 flex items-center justify-center shadow-lg pointer-events-none">
                  <ArrowLeftRight className="h-3.5 w-3.5" />
                </div>
              </div>

              {/* Labels */}
              <div className="absolute top-3 left-3 bg-slate-800/80 text-slate-300 text-[10px] font-bold px-2 py-1 rounded backdrop-blur-sm z-20">
                Before
              </div>
              <div className="absolute top-3 right-3 bg-teal-600/80 text-white text-[10px] font-bold px-2 py-1 rounded backdrop-blur-sm z-20">
                AI Enhanced
              </div>

              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between bg-black/70 rounded-lg px-3 py-2 backdrop-blur-sm z-20">
                <span className="text-xs text-white font-bold flex items-center gap-1.5">
                  <ArrowLeftRight className="h-3.5 w-3.5 text-teal-400" />
                  Drag to compare
                </span>
                <button
                  onClick={retake}
                  className="text-xs text-teal-300 hover:text-white font-bold"
                >
                  Try Another
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleDownload}
                className="vv-button-retail justify-center font-bold flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Download
              </button>
              <button
                onClick={handleWhatsApp}
                className="vv-button border-slate-700 text-white justify-center font-bold flex items-center gap-2 hover:border-emerald-500"
              >
                <MessageCircle className="h-4 w-4" />
                WhatsApp
              </button>
            </div>

            <p className="text-[11px] text-slate-500 text-center">
              AI enhancement uses a generative model to refine lighting and
              integration. Results are approximate — visit the clinic for
              precise fitting and prescription advice.
            </p>
          </div>
        )}

        {/* Hidden canvas for compositing */}
        <canvas ref={canvasRef} className="hidden" />
      </section>
    </div>
  );
}
