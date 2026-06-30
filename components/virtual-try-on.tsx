"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { Camera, RefreshCw, ZoomIn, ZoomOut, Check, ArrowLeftRight, AlertCircle, ShoppingBag, Sparkles, Download, Share2, Eye } from "lucide-react";

interface VirtualTryOnProps {
  productSlug?: string;
}

const tryOnFrames = [
  { slug: "supersight-b-titanium-6009", name: "B-Titanium IP 6009", img: "/assets/inventory/supersight-b-titanium-6009/ar-front.png" },
  { slug: "suphous-pink-96409", name: "Suphous 96409 Pink", img: "/assets/inventory/suphous-pink-96409/ar-front.png" }
];

export default function VirtualTryOn({ productSlug = "" }: VirtualTryOnProps) {
  const [selectedSlug, setSelectedSlug] = useState(productSlug || tryOnFrames[0].slug);
  const [cameraActive, setCameraActive] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Overlay adjustment controls
  const [scale, setScale] = useState(1.0);
  const [offsetX, setOffsetX] = useState(0);
  const [offsetY, setOffsetY] = useState(0);
  
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [aiPhoto, setAiPhoto] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  
  // Before/After slider control (0 to 100 percentage)
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);
  const sliderRef = useRef<HTMLDivElement>(null);

  const selectedFrame = tryOnFrames.find(f => f.slug === selectedSlug) ?? tryOnFrames[0];

  const startCamera = async () => {
    setError(null);
    setCapturedPhoto(null);
    setAiPhoto(null);
    try {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user", width: { ideal: 640 }, height: { ideal: 480 } }
      });
      
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play().catch(e => {
          console.error("Autoplay interaction required:", e);
        });
      }
      setCameraActive(true);
    } catch (err) {
      console.error("Camera access failed:", err);
      setError("Unable to access camera. Please check permissions in your browser settings.");
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const takePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw mirrored video stream
    ctx.save();
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    ctx.restore();

    // Capture standard portrait photo without overlays to serve as the "Before" state for comparison
    const rawPhoto = canvas.toDataURL("image/jpeg");

    // Draw overlay frame on top of canvas for the "After" composite state
    const imgElement = document.getElementById("tryon-overlay-img") as HTMLImageElement | null;
    if (imgElement && imgElement.complete) {
      const frameWidth = canvas.width * 0.55 * scale;
      const frameHeight = frameWidth * (imgElement.naturalHeight / imgElement.naturalWidth);
      
      const x = (canvas.width - frameWidth) / 2 + offsetX;
      const y = canvas.height * 0.35 + offsetY;
      
      ctx.drawImage(imgElement, x, y, frameWidth, frameHeight);
    }

    const compositedPhoto = canvas.toDataURL("image/jpeg");
    setCapturedPhoto(compositedPhoto);
    stopCamera();
  };

  const generateAiTryOn = async () => {
    if (!capturedPhoto) return;
    setIsGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/ai/try-on", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ image: capturedPhoto, frameSlug: selectedSlug })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to generate AI image");
      
      setAiPhoto(data.image);
    } catch (err: any) {
      setError(err.message || "An error occurred during AI generation.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownload = () => {
    const activePhoto = aiPhoto || capturedPhoto;
    if (!activePhoto) return;

    const link = document.createElement("a");
    link.href = activePhoto;
    link.download = `vision-vistara-tryon-${selectedSlug}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleShareWhatsApp = () => {
    const text = encodeURIComponent(`Check out my virtual try-on preview for the ${selectedFrame.name} glasses at Vision Vistara!`);
    const waUrl = `https://wa.me/?text=${text}`;
    window.open(waUrl, "_blank");
  };

  // Drag handlers for the Before/After comparison slider
  const handleSliderMove = (clientX: number) => {
    if (!sliderRef.current) return;
    const rect = sliderRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches[0]) {
      handleSliderMove(e.touches[0].clientX);
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      handleSliderMove(e.clientX);
    }
  };

  useEffect(() => {
    const handleMouseUp = () => setIsDragging(false);
    window.addEventListener("mouseup", handleMouseUp);
    return () => {
      window.removeEventListener("mouseup", handleMouseUp);
      stopCamera();
    };
  }, [isDragging]);

  return (
    <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
      {/* Sidebar Selector */}
      <aside className="vv-card p-6 flex flex-col gap-4">
        <h2 className="text-lg font-extrabold text-slate-800">Select Trial Frame</h2>
        
        <div className="grid gap-2">
          {tryOnFrames.map((frame) => (
            <button
              key={frame.slug}
              type="button"
              onClick={() => setSelectedSlug(frame.slug)}
              className={`p-3 text-left rounded border font-bold text-xs flex items-center justify-between transition ${
                selectedSlug === frame.slug
                  ? "border-retail bg-teal-50/10 text-retail"
                  : "border-slate-200 bg-white hover:border-slate-300"
              }`}
            >
              <span>{frame.name}</span>
              {selectedSlug === frame.slug && <Check className="h-4 w-4" />}
            </button>
          ))}
        </div>

        {/* Dynamic adjustment tools */}
        {cameraActive && (
          <div className="border-t border-slate-100 pt-4 grid gap-3">
            <h3 className="text-xs font-extrabold text-slate-500 uppercase">Adjust Fitting</h3>
            
            <div className="flex items-center justify-between text-xs font-bold">
              <span>Frame Scale</span>
              <div className="flex gap-2">
                <button onClick={() => setScale(s => Math.max(0.7, s - 0.05))} className="p-1 border border-slate-200 rounded hover:bg-slate-50"><ZoomOut className="h-4 w-4" /></button>
                <button onClick={() => setScale(s => Math.min(1.4, s + 0.05))} className="p-1 border border-slate-200 rounded hover:bg-slate-50"><ZoomIn className="h-4 w-4" /></button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs font-bold">
              <span>Horizontal Shift</span>
              <div className="flex gap-2">
                <button onClick={() => setOffsetX(x => x - 5)} className="p-1 border border-slate-200 rounded hover:bg-slate-50"><ArrowLeftRight className="h-4 w-4 rotate-180" /></button>
                <button onClick={() => setOffsetX(x => x + 5)} className="p-1 border border-slate-200 rounded hover:bg-slate-50"><ArrowLeftRight className="h-4 w-4" /></button>
              </div>
            </div>
          </div>
        )}

        <Link
          href={`/frames/${selectedSlug}`}
          className="vv-button-retail py-2.5 px-4 text-xs font-bold justify-center mt-auto flex items-center gap-1.5"
        >
          <ShoppingBag className="h-4 w-4" />
          View frame details
        </Link>
      </aside>

      {/* Camera Viewport */}
      <section className="vv-card p-6 bg-slate-950 border border-slate-900 flex flex-col items-center justify-center min-h-[480px] relative text-center">
        
        {error && (
          <div className="rounded border border-red-900 bg-red-950/20 text-red-400 p-4 max-w-md flex items-start gap-3 z-10">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <div>
              <span className="font-extrabold text-sm block">Try-On Error</span>
              <p className="text-xs mt-0.5">{error}</p>
            </div>
          </div>
        )}

        {/* Video feed */}
        {cameraActive && !capturedPhoto && (
          <div className="relative w-full max-w-md aspect-[4/3] rounded overflow-hidden bg-slate-900 border border-slate-800">
            <video
              ref={videoRef}
              playsInline
              muted
              className="w-full h-full object-cover scale-x-[-1]"
            />
            {/* Real-time frame overlay alignment */}
            <div className="absolute inset-0 pointer-events-none grid place-items-center">
              <img
                id="tryon-overlay-img"
                src={selectedFrame.img}
                alt="Overlay Glasses"
                style={{
                  width: `${55 * scale}%`,
                  transform: `translateX(${offsetX}px) translateY(${offsetY}px)`,
                  transition: "none"
                }}
                className="object-contain"
              />
            </div>
          </div>
        )}

        {/* Static Snapshot Overlay View (Before AI refinement) */}
        {capturedPhoto && !aiPhoto && (
          <div className="w-full max-w-md flex flex-col gap-4">
            <div className="w-full aspect-[4/3] rounded overflow-hidden border border-slate-800 bg-slate-900 relative shadow-xl">
              <img src={capturedPhoto} alt="Captured snapshot" className="w-full h-full object-cover" />
              <div className="absolute bottom-3 left-3 right-3 flex justify-between gap-3 bg-black/60 p-2 rounded backdrop-blur">
                <span className="text-xs text-white font-extrabold flex items-center gap-1">📸 Fitted snapshot ready</span>
                <button onClick={() => {
                  setCapturedPhoto(null);
                  startCamera();
                }} className="text-xs text-white underline font-bold">Retake</button>
              </div>
            </div>

            <div className="flex gap-3">
              <button 
                onClick={generateAiTryOn}
                disabled={isGenerating}
                className="vv-button-retail flex-1 font-bold bg-gradient-to-r from-teal-500 to-emerald-600 text-white border-0 shadow-lg hover:shadow-xl flex items-center justify-center gap-2 py-3 transition-all"
              >
                {isGenerating ? <RefreshCw className="h-5 w-5 animate-spin" /> : <Sparkles className="h-5 w-5" />}
                {isGenerating ? "Processing AI Try-On..." : "Enhance with Generative AI"}
              </button>
              
              <button 
                onClick={handleDownload}
                className="p-3 border border-slate-800 text-white rounded hover:bg-slate-900"
                title="Download Snapshot"
              >
                <Download className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}

        {/* AI Enhanced Result view with Before/After Slider */}
        {aiPhoto && (
          <div className="w-full max-w-md flex flex-col gap-4">
            <div 
              ref={sliderRef}
              onMouseMove={handleMouseMove}
              onTouchMove={handleTouchMove}
              onMouseDown={() => setIsDragging(true)}
              className="w-full aspect-[4/3] rounded overflow-hidden border-2 border-teal-500 bg-slate-900 relative shadow-2xl select-none cursor-ew-resize"
            >
              {/* After: AI Generated Photo */}
              <img src={aiPhoto} alt="AI Generated Try-On" className="w-full h-full object-cover pointer-events-none" />
              
              {/* Before: Raw Overlay Snapshot */}
              <div 
                className="absolute inset-0 overflow-hidden" 
                style={{ clipPath: `polygon(0 0, ${sliderPosition}% 0, ${sliderPosition}% 100%, 0 100%)` }}
              >
                <img src={capturedPhoto!} alt="Before capture" className="w-full h-full object-cover pointer-events-none" />
              </div>

              {/* Slider Line handle divider */}
              <div 
                className="absolute top-0 bottom-0 w-0.5 bg-white shadow-xl z-20 pointer-events-none"
                style={{ left: `${sliderPosition}%` }}
              >
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 bg-white text-slate-800 rounded-full border border-teal-500 flex items-center justify-center pointer-events-none shadow-lg">
                  <ArrowLeftRight className="h-3 w-3" />
                </div>
              </div>

              <div className="absolute top-3 left-3 bg-teal-500 text-white text-[10px] font-black uppercase px-2 py-1 rounded-sm tracking-wider z-20 shadow-md">
                AI Enhanced
              </div>

              <div className="absolute bottom-3 left-3 right-3 flex justify-between gap-3 bg-black/60 p-2 rounded backdrop-blur z-20">
                <span className="text-xs text-white font-extrabold flex items-center gap-1"><Eye className="h-4 w-4 text-teal-400" /> Slide to compare</span>
                <button onClick={() => {
                  setAiPhoto(null);
                  setCapturedPhoto(null);
                  startCamera();
                }} className="text-xs text-white underline font-bold">Try Another</button>
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
                onClick={handleShareWhatsApp}
                className="vv-button-light justify-center font-bold flex items-center gap-2 border-slate-800 text-white hover:bg-slate-900"
              >
                <Share2 className="h-4 w-4" />
                WhatsApp
              </button>
            </div>
            
            <p className="text-xs text-slate-500">
              Generative AI model refines lighting vectors, lens reflections, and facial integration from your photo.
            </p>
          </div>
        )}

        {/* Initial Camera State */}
        {!cameraActive && !capturedPhoto && !error && (
          <div className="grid justify-items-center gap-4 text-slate-300">
            <Camera className="h-16 w-16 text-slate-500 animate-pulse" />
            <div>
              <h3 className="text-lg font-extrabold text-white">Live Virtual Try-On</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">Enable camera to overlay selected frames on your face. Private and secure stream.</p>
            </div>
            <button onClick={startCamera} className="vv-button-retail mt-2 font-bold flex items-center gap-1">
              Start Camera Stream
            </button>
          </div>
        )}

        {cameraActive && !capturedPhoto && (
          <div className="flex gap-4 mt-6 z-10">
            <button onClick={takePhoto} className="vv-button-retail font-bold bg-white text-slate-900 border-white flex items-center gap-1.5">
              <Camera className="h-4 w-4" />
              Capture Photo
            </button>
            <button onClick={stopCamera} className="vv-button-light font-bold text-slate-300 border-slate-800 hover:text-white">
              Stop Camera
            </button>
          </div>
        )}

        {/* Hidden Canvas helper */}
        <canvas ref={canvasRef} className="hidden" />

      </section>
    </div>
  );
}
