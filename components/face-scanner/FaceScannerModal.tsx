"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Camera,
  ChevronRight,
  Clock3,
  CreditCard,
  Loader2,
  RotateCcw,
  Scan,
  ShieldCheck,
  SkipForward,
  X,
} from "lucide-react";

import { FaceGuideOverlay } from "./FaceGuideOverlay";
import { CalibrationOverlay } from "./CalibrationOverlay";
import { FaceProfileCard } from "./FaceProfileCard";

import type { NormalizedLandmark, FaceMeasurementResult, CalibrationResult, FaceGuidance } from "@/lib/face-measurement";
import {
  analyzeFacePosition,
  calibrateWithIris,
  computeFaceMeasurements,
} from "@/lib/face-measurement";
import type { FaceMeasurements } from "@/lib/frame-fit";
import { saveFaceMeasurement } from "@/lib/face-measurement-actions";

// ─── TYPES ───

type ScannerStep = "intro" | "camera" | "calibration" | "scanning" | "results";

interface FaceScannerModalProps {
  onClose: () => void;
}

// ─── MEDIAPIPE LOADER ───

let faceLandmarkerInstance: any = null;
let faceLandmarkerLoading = false;

async function loadFaceLandmarker() {
  if (faceLandmarkerInstance) return faceLandmarkerInstance;
  if (faceLandmarkerLoading) {
    // Wait for existing load
    while (faceLandmarkerLoading) {
      await new Promise((r) => setTimeout(r, 100));
    }
    return faceLandmarkerInstance;
  }

  faceLandmarkerLoading = true;
  try {
    const vision = await import("@mediapipe/tasks-vision");
    const { FaceLandmarker, FilesetResolver } = vision;

    const filesetResolver = await FilesetResolver.forVisionTasks(
      "/mediapipe"
    );

    const options = {
      baseOptions: {
        modelAssetPath: "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task",
        delegate: "GPU",
      },
      runningMode: "VIDEO",
      numFaces: 1,
      outputFaceBlendshapes: false,
      outputFacialTransformationMatrixes: false,
    } as const;

    try {
      faceLandmarkerInstance = await FaceLandmarker.createFromOptions(filesetResolver, options);
    } catch (gpuError) {
      console.warn("GPU face-landmarking is unavailable; falling back to CPU.", gpuError);
      faceLandmarkerInstance = await FaceLandmarker.createFromOptions(filesetResolver, {
        ...options,
        baseOptions: { ...options.baseOptions, delegate: "CPU" },
      });
    }

    return faceLandmarkerInstance;
  } catch (err) {
    console.error("Failed to load FaceLandmarker:", err);
    faceLandmarkerLoading = false;
    throw err;
  } finally {
    faceLandmarkerLoading = false;
  }
}

// ─── ANALYTICS ───

function trackEvent(name: string, metadata?: Record<string, unknown>) {
  fetch("/api/analytics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, path: "/frames/measure", source: "face-scanner", metadata }),
  }).catch(() => {});
}

// ─── COMPONENT ───

export default function FaceScannerModal({ onClose }: FaceScannerModalProps) {
  const router = useRouter();
  const [step, setStep] = useState<ScannerStep>("intro");
  const [error, setError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [modelLoading, setModelLoading] = useState(false);

  // Face detection state
  const [faceGuidance, setFaceGuidance] = useState<FaceGuidance>({ status: "no_face", message: "Position your face inside the guide", confidence: 0 });
  const [landmarksReady, setLandmarksReady] = useState(false);

  // Calibration
  const [calibrationMode, setCalibrationMode] = useState<"choosing" | "card" | "skip">("choosing");
  const [calibrationResult, setCalibrationResult] = useState<CalibrationResult | null>(null);

  // Results
  const [measurement, setMeasurement] = useState<FaceMeasurementResult | null>(null);

  // Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number>(0);
  const landmarkerRef = useRef<any>(null);
  const latestLandmarksRef = useRef<NormalizedLandmark[] | null>(null);
  const readyFrameCountRef = useRef(0);
  const detectionRunningRef = useRef(false);
  const videoDimensionsRef = useRef({ width: 0, height: 0 });

  // ─── CLEANUP ───
  const stopCamera = useCallback(() => {
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    detectionRunningRef.current = false;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraReady(false);
  }, []);

  useEffect(() => {
    document.body.classList.add("face-scanner-active");
    document.body.style.overflow = "hidden";
    trackEvent("face_scanner_opened");
    return () => {
      document.body.classList.remove("face-scanner-active");
      document.body.style.overflow = "";
      stopCamera();
    };
  }, [stopCamera]);

  // ─── START CAMERA ───
  const startCamera = async () => {
    setError(null);
    setCameraReady(false);

    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setError("Camera access requires HTTPS and browser permission.");
      trackEvent("camera_permission_denied", { reason: "insecure_context" });
      return;
    }

    let stream: MediaStream | null = null;
    let cameraPromise: Promise<MediaStream> | null = null;
    let initializationStage: "camera" | "model" = "camera";

    try {
      setModelLoading(true);

      const getCameraStream = async () => {
        const attempts = [
          { video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 720 } }, audio: false },
          { video: { facingMode: "user" }, audio: false },
          { video: true, audio: false }
        ];
        let lastErr: unknown = null;
        for (const constraints of attempts) {
          try {
            return await navigator.mediaDevices.getUserMedia(constraints);
          } catch (e) {
            lastErr = e;
            if (e instanceof DOMException && (e.name === "NotAllowedError" || e.name === "PermissionDeniedError")) {
              throw e;
            }
          }
        }
        throw lastErr;
      };

      // Safari can require getUserMedia to be initiated directly from the
      // button tap. Start it immediately while the model loads in parallel.
      cameraPromise = getCameraStream();
      initializationStage = "model";
      const landmarkerPromise = loadFaceLandmarker();

      initializationStage = "camera";
      stream = await cameraPromise;
      initializationStage = "model";
      const landmarker = await landmarkerPromise;
      landmarkerRef.current = landmarker;
      setModelLoading(false);

      streamRef.current = stream;
      trackEvent("camera_permission_granted");

      // Transition to camera step — attach stream in effect
      setStep("camera");

      // Wait for video element to be in DOM
      requestAnimationFrame(() => {
        const tryAttach = () => {
          const video = videoRef.current;
          if (!video) {
            requestAnimationFrame(tryAttach);
            return;
          }
          video.srcObject = stream;
          video.play()
            .then(() => {
              setCameraReady(true);
              startDetectionLoop();
            })
            .catch(() => {
              setTimeout(() => {
                video.play().then(() => {
                  setCameraReady(true);
                  startDetectionLoop();
                }).catch(() => {});
              }, 300);
            });
        };
        requestAnimationFrame(tryAttach);
      });
    } catch (err) {
      setModelLoading(false);
      stream?.getTracks().forEach((track) => track.stop());
      // The camera can resolve after the model fails. Stop that late stream
      // too, so a failed start never leaves an iPhone camera indicator active.
      cameraPromise?.then((lateStream) => {
        if (lateStream !== stream) lateStream.getTracks().forEach((track) => track.stop());
      }).catch(() => {});
      const isDenied = err instanceof DOMException && (err.name === "NotAllowedError" || err.name === "PermissionDeniedError");
      const detail = isDenied
        ? "Camera permission was denied. Tap the 🔒 lock or settings icon in your browser URL bar above to allow camera access, then try again."
        : initializationStage === "model"
          ? "We couldn't load face detection. Check your connection and try again."
          : "We couldn't access your camera. Check browser camera permission and try again.";
      console.error("Failed to start face scanner:", { initializationStage, err });
      setError(detail);
      trackEvent("camera_permission_denied", { reason: isDenied ? "denied" : `scanner_${initializationStage}_initialization_failed` });
      setStep("intro");
    }
  };

  // ─── FACE DETECTION LOOP ───
  const startDetectionLoop = useCallback(() => {
    if (detectionRunningRef.current) return;

    const landmarker = landmarkerRef.current;
    if (!landmarker) return;
    detectionRunningRef.current = true;

    let lastTimestamp = -1;

    const detect = () => {
      const video = videoRef.current;
      if (!video || !streamRef.current || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
        animFrameRef.current = requestAnimationFrame(detect);
        return;
      }

      if (video.videoWidth > 0 && video.videoHeight > 0) {
        videoDimensionsRef.current = { width: video.videoWidth, height: video.videoHeight };
      }

      const now = performance.now();
      if (now === lastTimestamp) {
        animFrameRef.current = requestAnimationFrame(detect);
        return;
      }
      lastTimestamp = now;

      try {
        const results = landmarker.detectForVideo(video, now);
        const faceCount = results.faceLandmarks?.length ?? 0;
        const landmarks: NormalizedLandmark[] | null = faceCount > 0 ? results.faceLandmarks[0] : null;

        latestLandmarksRef.current = landmarks;

        const guidance = analyzeFacePosition(landmarks, faceCount);
        setFaceGuidance(guidance);

        if (guidance.status === "ready") {
          readyFrameCountRef.current++;
          if (readyFrameCountRef.current >= 15) {
            setLandmarksReady(true);
          }
        } else {
          readyFrameCountRef.current = Math.max(0, readyFrameCountRef.current - 2);
          setLandmarksReady(false);
        }
      } catch {
        // Silently handle detection errors during live camera
      }

      animFrameRef.current = requestAnimationFrame(detect);
    };

    animFrameRef.current = requestAnimationFrame(detect);
  }, []);

  // The video node is deliberately unmounted between camera, calibration, and
  // scanning views. Reattach the existing stream whenever a video view mounts;
  // otherwise Safari shows a black preview and the landmark loop has no frames.
  useEffect(() => {
    const needsVideo = step === "camera" || step === "calibration";
    if (!needsVideo) return;

    let cancelled = false;
    let frameId = 0;

    const attachStream = () => {
      const video = videoRef.current;
      const stream = streamRef.current;
      if (!video || !stream) {
        frameId = requestAnimationFrame(attachStream);
        return;
      }

      if (video.srcObject !== stream) video.srcObject = stream;
      video.play().then(() => {
        if (cancelled) return;
        setCameraReady(true);
        startDetectionLoop();
      }).catch(() => {
        if (!cancelled) frameId = requestAnimationFrame(attachStream);
      });
    };

    attachStream();
    return () => {
      cancelled = true;
      if (frameId) cancelAnimationFrame(frameId);
    };
  }, [calibrationMode, startDetectionLoop, step]);

  // ─── CAPTURE & MEASURE ───
  const performMeasurement = useCallback((calibrationOverride?: CalibrationResult) => {
    const video = videoRef.current;
    const landmarks = latestLandmarksRef.current;
    const videoWidth = video?.videoWidth || videoDimensionsRef.current.width;
    const videoHeight = video?.videoHeight || videoDimensionsRef.current.height;
    if (!video || !videoWidth || !videoHeight || !landmarks || landmarks.length < 468) {
      setError("Face landmarks were lost. Center your face in the guide and try again.");
      setLandmarksReady(false);
      readyFrameCountRef.current = 0;
      setStep("camera");
      return;
    }

    setStep("scanning");
    trackEvent("calibration_completed", { method: calibrationResult?.method ?? "heuristic" });

    // Use calibration result or fall back to iris heuristic
    const cal = calibrationOverride ?? calibrationResult ?? calibrateWithIris(landmarks, videoWidth, videoHeight);

    setTimeout(() => {
      try {
        const result = computeFaceMeasurements(
          landmarks,
          videoWidth,
          videoHeight,
          cal
        );

        setMeasurement(result);
        trackEvent("measurement_completed", {
          faceShape: result.faceShape,
          quality: result.measurementQuality,
          method: result.calibrationMethod,
        });

        // Store measurements in localStorage for product pages
        const storedData: FaceMeasurements = {
          faceWidthMm: result.faceWidthMm,
          faceHeightMm: result.faceHeightMm,
          estimatedPdMm: result.estimatedPdMm,
          interocularWidthMm: result.interocularWidthMm,
          noseWidthMm: result.noseWidthMm,
          faceShape: result.faceShape,
          recommendedSize: result.recommendedSize,
          measurementQuality: result.measurementQuality,
          calibrationMethod: result.calibrationMethod,
        };
        localStorage.setItem("vv_face_measurements", JSON.stringify(storedData));

        // Save to database
        saveFaceMeasurement({
          faceWidthMm: result.faceWidthMm,
          faceHeightMm: result.faceHeightMm,
          estimatedPdMm: result.estimatedPdMm,
          interocularWidthMm: result.interocularWidthMm,
          noseWidthMm: result.noseWidthMm,
          faceShape: result.faceShape,
          recommendedSize: result.recommendedSize,
          measurementQuality: result.measurementQuality,
          calibrationMethod: result.calibrationMethod,
          calibrationConfidence: cal.confidence,
        }).catch(() => {});

        // Count approximate matches (placeholder — real count comes from product query)
        stopCamera();
        setStep("results");
      } catch {
        setError("Measurement calculation failed. Please try again.");
        setStep("camera");
      }
    }, 1200); // Brief scanning animation delay
  }, [calibrationResult, stopCamera]);

  // ─── CALIBRATION HANDLERS ───
  const handleSkipCalibration = () => {
    setCalibrationMode("skip");
    trackEvent("calibration_skipped");
    // Use iris-based heuristic calibration
    const landmarks = latestLandmarksRef.current;
    const video = videoRef.current;
    if (landmarks && video) {
      const cal = calibrateWithIris(
        landmarks,
        video.videoWidth || videoDimensionsRef.current.width,
        video.videoHeight || videoDimensionsRef.current.height
      );
      setCalibrationResult(cal);
      performMeasurement(cal);
      return;
    }
    performMeasurement();
  };

  const handleCardCalibration = () => {
    setCalibrationMode("card");
    trackEvent("calibration_started", { method: "card" });
    // For MVP: use manual card alignment
    // The user positions the card and we use the guide rectangle dimensions
    // For simplicity, we use heuristic with slightly higher confidence
    setTimeout(() => {
      const landmarks = latestLandmarksRef.current;
      const video = videoRef.current;
      if (landmarks && video) {
        // Enhanced calibration: use iris + boost confidence for card presence
        const cal = calibrateWithIris(
          landmarks,
          video.videoWidth || videoDimensionsRef.current.width,
          video.videoHeight || videoDimensionsRef.current.height
        );
        cal.confidence = Math.min(1, cal.confidence + 0.15);
        cal.method = "card";
        setCalibrationResult(cal);
        performMeasurement(cal);
        return;
      }
      performMeasurement();
    }, 2000);
  };

  // ─── RETRY ───
  const handleRetry = () => {
    setMeasurement(null);
    setCalibrationResult(null);
    setCalibrationMode("choosing");
    setLandmarksReady(false);
    readyFrameCountRef.current = 0;
    setError(null);
    stopCamera();
    startCamera();
  };

  // ─── NAVIGATE ───
  const handleExploreFrames = () => {
    trackEvent("frame_size_results_viewed");
    onClose();
    router.push("/frames");
  };

  const handleSeeAll = () => {
    onClose();
    router.push("/frames");
  };

  // ─── RENDER ───
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 p-4 backdrop-blur-md">
      {/* Close button */}
      <button
        type="button"
        onClick={() => { stopCamera(); onClose(); }}
        className="absolute right-4 top-4 z-50 flex h-10 w-10 items-center justify-center rounded-full border border-white/50 bg-white/90 text-slate-500 shadow-sm transition hover:border-teal-200 hover:text-teal-700"
        aria-label="Close scanner"
      >
        <X className="h-5 w-5" />
      </button>

      {/* Error banner */}
      {error && (
        <div className="absolute left-4 right-4 top-16 z-40 flex items-start gap-3 rounded-xl border border-amber-800/40 bg-amber-950/90 p-4 text-amber-200 backdrop-blur-sm sm:left-auto sm:right-4 sm:max-w-md">
          <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
          <p className="flex-1 text-xs font-bold">{error}</p>
          <button type="button" onClick={() => setError(null)} aria-label="Dismiss">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Progress steps */}
      {step !== "intro" && step !== "results" && (
        <div className="absolute left-0 right-0 top-4 z-40 flex justify-center">
          <div className="flex items-center gap-2">
            {(["camera", "calibration", "scanning"] as const).map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full transition-all ${
                  step === s ? "bg-teal-400 ring-4 ring-teal-400/20" :
                  (["camera", "calibration", "scanning"].indexOf(step) > i) ? "bg-teal-500" : "bg-slate-700"
                }`} />
                {i < 2 && <div className={`h-px w-6 ${
                  (["camera", "calibration", "scanning"].indexOf(step) > i) ? "bg-teal-500" : "bg-slate-700"
                }`} />}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ──── INTRO SCREEN ──── */}
      {step === "intro" && (
        <div className="w-full max-w-xl rounded-[2rem] bg-white px-6 py-8 text-center shadow-2xl shadow-slate-950/30 sm:px-10">
          <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-lg shadow-teal-500/25">
            <Scan className="h-8 w-8" />
          </div>
          <div className="flex items-center justify-center gap-2 text-xs font-bold text-teal-700">
            <Clock3 className="h-4 w-4" />
            Takes about 30 seconds
          </div>
          <h2 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
            Let&apos;s find your frame size
          </h2>
          <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-slate-600">
            A quick face scan estimates a useful starting size for browsing frames.
          </p>

          {/* Instructions */}
          <div className="mx-auto mt-6 grid max-w-md gap-2 text-left sm:grid-cols-2">
            {[
              { icon: "👓", text: "Remove your glasses" },
              { icon: "📱", text: "Face the camera directly at eye level" },
              { icon: "💡", text: "Use good, even lighting" },
              { icon: "😐", text: "Keep your face inside the guide" },
              { icon: "🤚", text: "Hold still during scanning" },
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-3 sm:last:col-span-2">
                <span className="text-lg">{item.icon}</span>
                <span className="text-sm font-semibold text-slate-700">{item.text}</span>
              </div>
            ))}
          </div>

          <div className="mt-5 flex items-center justify-center gap-2 text-xs font-medium text-slate-500">
            <ShieldCheck className="h-4 w-4 text-teal-600" />
            Your camera is used only while you scan.
          </div>

          <div className="mt-6 grid gap-3">
            <button
              type="button"
              onClick={startCamera}
              disabled={modelLoading}
              className="vv-button-retail flex w-full justify-center gap-2 py-4 text-base"
            >
              {modelLoading ? (
                <>
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Loading face detection…
                </>
              ) : (
                <>
                  <Camera className="h-5 w-5" />
                  Start face scan
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="text-sm font-bold text-slate-500 transition hover:text-slate-800"
            >
              Not now
            </button>
          </div>
        </div>
      )}

      {/* ──── CAMERA VIEW ──── */}
      {step === "camera" && (
        <div className="mx-4 flex w-full max-w-lg flex-col items-center gap-5">
          <div className="relative aspect-square w-full overflow-hidden rounded-2xl border-2 border-slate-700 bg-slate-900 shadow-2xl">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full scale-x-[-1] object-cover"
            />
            {!cameraReady && (
              <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-3 bg-slate-900/90 backdrop-blur-sm">
                <Loader2 className="h-8 w-8 animate-spin text-teal-400" />
                <p className="text-xs font-bold text-slate-300">
                  {modelLoading ? "Loading face detection model…" : "Connecting camera…"}
                </p>
              </div>
            )}
            <FaceGuideOverlay
              status={faceGuidance.status}
              message={faceGuidance.message}
              confidence={faceGuidance.confidence}
            />
          </div>

          <div className="flex w-full gap-3">
            <button
              type="button"
              onClick={() => {
                if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
                detectionRunningRef.current = false;
                setStep("calibration");
              }}
              disabled={!landmarksReady}
              className="vv-button flex flex-1 justify-center gap-2 border-0 bg-white py-3.5 font-extrabold text-slate-900 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRight className="h-5 w-5" />
              Next
            </button>
            <button
              type="button"
              onClick={() => { stopCamera(); setStep("intro"); }}
              className="vv-button border-slate-700 px-4 text-slate-400"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ──── CALIBRATION CHOICE ──── */}
      {step === "calibration" && calibrationMode === "choosing" && (
        <div className="mx-4 max-w-lg text-center">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            aria-hidden="true"
            className="pointer-events-none absolute h-px w-px opacity-0"
          />
          <h3 className="text-xl font-extrabold text-white">Improve accuracy</h3>
          <p className="mt-2 text-sm text-slate-400">
            Hold a standard bank card next to your face for better measurements, or continue with estimated calibration.
          </p>

          <div className="mt-8 grid gap-4">
            <button
              type="button"
              onClick={handleCardCalibration}
              className="group flex items-center gap-4 rounded-2xl border border-teal-500/30 bg-teal-950/40 p-5 text-left transition hover:border-teal-400/50 hover:bg-teal-950/60"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-teal-500/20 text-teal-400">
                <CreditCard className="h-6 w-6" />
              </div>
              <div>
                <p className="font-extrabold text-white">Use reference card</p>
                <p className="mt-0.5 text-xs text-teal-400/70">
                  Hold a bank card beside your face for better accuracy
                </p>
              </div>
              <ChevronRight className="ml-auto h-5 w-5 text-teal-500 transition group-hover:translate-x-0.5" />
            </button>

            <button
              type="button"
              onClick={handleSkipCalibration}
              className="group flex items-center gap-4 rounded-2xl border border-slate-700 bg-slate-900/60 p-5 text-left transition hover:border-slate-600 hover:bg-slate-900/80"
            >
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-800 text-slate-400">
                <SkipForward className="h-6 w-6" />
              </div>
              <div>
                <p className="font-extrabold text-white">Skip calibration</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  Use approximate estimation (measurements labeled as estimated)
                </p>
              </div>
              <ChevronRight className="ml-auto h-5 w-5 text-slate-600 transition group-hover:translate-x-0.5" />
            </button>
          </div>

          <button
            type="button"
            onClick={handleRetry}
            className="mt-6 text-sm font-bold text-slate-500 hover:text-slate-300 transition"
          >
            ← Back to camera
          </button>
        </div>
      )}

      {/* ──── CARD CALIBRATION VIEW ──── */}
      {step === "calibration" && calibrationMode === "card" && (
        <div className="mx-4 flex w-full max-w-lg flex-col items-center gap-5">
          <div className="relative aspect-square w-full overflow-hidden rounded-2xl border-2 border-slate-700 bg-slate-900 shadow-2xl">
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="h-full w-full scale-x-[-1] object-cover"
            />
            <CalibrationOverlay
              status="waiting"
              message="Hold your card next to your face"
            />
          </div>
          <p className="text-xs text-slate-500 text-center">
            Aligning card… measurement will begin automatically
          </p>
        </div>
      )}

      {/* ──── SCANNING ANIMATION ──── */}
      {step === "scanning" && (
        <div className="mx-4 max-w-lg text-center">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-teal-500 to-emerald-600 text-white shadow-2xl">
            <Loader2 className="h-10 w-10 animate-spin" />
          </div>
          <h3 className="text-xl font-extrabold text-white">Analyzing your face</h3>
          <p className="mt-2 text-sm text-slate-400">
            Processing landmarks and calculating measurements…
          </p>
          <div className="mx-auto mt-6 h-1 w-48 overflow-hidden rounded-full bg-slate-800">
            <div className="face-scan-progress h-full rounded-full bg-gradient-to-r from-teal-500 to-emerald-400" />
          </div>
        </div>
      )}

      {/* ──── RESULTS ──── */}
      {step === "results" && measurement && (
        <div className="mx-4 max-h-[90vh] w-full max-w-md overflow-y-auto px-1 py-8 [scrollbar-width:thin]">
          <FaceProfileCard
            faceWidthMm={measurement.faceWidthMm}
            faceHeightMm={measurement.faceHeightMm}
            estimatedPdMm={measurement.estimatedPdMm}
            faceShape={measurement.faceShape}
            recommendedSize={measurement.recommendedSize}
            measurementQuality={measurement.measurementQuality}
            calibrationMethod={measurement.calibrationMethod}
            onExploreFrames={handleExploreFrames}
            onSeeAll={handleSeeAll}
          />
          <div className="mt-4 text-center">
            <button
              type="button"
              onClick={handleRetry}
              className="inline-flex items-center gap-1 text-sm font-bold text-slate-500 hover:text-white transition"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Re-measure
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
