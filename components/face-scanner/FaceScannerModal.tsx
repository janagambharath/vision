"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  Camera,
  Glasses,
  Smartphone,
  Sun,
  ScanFace,
  Hand,
  SwitchCamera,
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
import { CardCorners } from "./CardCorners";
import { FaceProfileCard } from "./FaceProfileCard";

import type { NormalizedLandmark, FaceMeasurementResult, CalibrationResult, FaceGuidance } from "@/lib/face-measurement";
import {
  analyzeFacePosition,
  advanceFaceStability,
  type FaceStability,
  computeIrisMeasurementFromSamples,
  prepareFaceScan,
  type FaceMeasurementSample,
  computeFaceMeasurements,
} from "@/lib/face-measurement";
import type { FaceMeasurements } from "@/lib/frame-fit";
import { openCamera, activeCameraFacing, type CameraFacing } from "@/lib/camera";
import { saveFaceMeasurement } from "@/lib/face-measurement-actions";

// ─── TYPES ───

type ScannerStep = "intro" | "camera" | "calibration" | "corners" | "scanning" | "results";

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
      numFaces: 2,
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
  const [cameraFacing, setCameraFacing] = useState<CameraFacing>("user");
  const [cameraVersion, setCameraVersion] = useState(0);
  const cameraRequestRef = useRef(0);
  const [modelLoading, setModelLoading] = useState(false);

  // Face detection state
  const [faceGuidance, setFaceGuidance] = useState<FaceGuidance>({ status: "no_face", message: "Position your face inside the guide", confidence: 0 });
  const [landmarksReady, setLandmarksReady] = useState(false);

  // Calibration
  const [calibrationMode, setCalibrationMode] = useState<"choosing" | "card">("choosing");

  // Results
  const [measurement, setMeasurement] = useState<FaceMeasurementResult | null>(null);
  const [capture, setCapture] = useState<{ image: string; width: number; height: number; landmarks: NormalizedLandmark[] } | null>(null);

  // Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number>(0);
  const landmarkerRef = useRef<any>(null);
  const latestLandmarksRef = useRef<NormalizedLandmark[] | null>(null);
  const stableFaceRef = useRef<FaceStability | null>(null);
  const recentSamplesRef = useRef<FaceMeasurementSample[]>([]);
  const preparedScanRef = useRef<ReturnType<typeof prepareFaceScan> | null>(null);
  const lastDetectionAtRef = useRef(0);
  const latestFaceCountRef = useRef(0);
  const detectionRunningRef = useRef(false);
  const mountedRef = useRef(false);
  const measurementTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── CLEANUP ───
  const stopCamera = useCallback(() => {
    cameraRequestRef.current++;
    preparedScanRef.current = null;
    stableFaceRef.current = null;
    recentSamplesRef.current = [];
    if (measurementTimerRef.current) clearTimeout(measurementTimerRef.current);
    measurementTimerRef.current = null;
    if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    detectionRunningRef.current = false;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraReady(false);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    document.body.classList.add("face-scanner-active");
    document.body.style.overflow = "hidden";
    trackEvent("face_scanner_opened");
    return () => {
      mountedRef.current = false;
      document.body.classList.remove("face-scanner-active");
      document.body.style.overflow = "";
      stopCamera();
    };
  }, [stopCamera]);

  // ─── START CAMERA ───
  const startCamera = async (facing: CameraFacing = cameraFacing) => {
    stopCamera();
    const requestId = cameraRequestRef.current;
    latestLandmarksRef.current = null;
    latestFaceCountRef.current = 0;
    stableFaceRef.current = null;
    recentSamplesRef.current = [];
    setLandmarksReady(false);
    setCalibrationMode("choosing");
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

      // Safari can require getUserMedia to be initiated directly from the
      // button tap. Start it immediately while the model loads in parallel.
      cameraPromise = openCamera(facing).then(cameraStream => {
        if (!mountedRef.current || requestId !== cameraRequestRef.current) {
          cameraStream.getTracks().forEach(track => track.stop());
        } else {
          // Make a camera opened during model loading available to close/switch cleanup.
          streamRef.current = cameraStream;
        }
        return cameraStream;
      });
      initializationStage = "model";
      const landmarkerPromise = loadFaceLandmarker();

      const [cameraStream, landmarker] = await Promise.all([
        cameraPromise.catch((err) => { initializationStage = "camera"; throw err; }),
        landmarkerPromise.catch((err) => { initializationStage = "model"; throw err; })
      ]);
      stream = cameraStream;
      if (!mountedRef.current || requestId !== cameraRequestRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      landmarkerRef.current = landmarker;
      setModelLoading(false);

      streamRef.current = stream;
      setCameraFacing(activeCameraFacing(stream, facing));
      setCameraVersion(version => version + 1);
      trackEvent("camera_permission_granted");

      // Transition to camera step — attach stream in effect
      setStep("camera");
    } catch (err) {
      setModelLoading(false);
      stream?.getTracks().forEach((track) => track.stop());
      // The camera can resolve after the model fails. Stop that late stream
      // too, so a failed start never leaves an iPhone camera indicator active.
      cameraPromise?.then((lateStream) => {
        if (lateStream !== stream) lateStream.getTracks().forEach((track) => track.stop());
      }).catch(() => {});
      if (!mountedRef.current || requestId !== cameraRequestRef.current) return;
      const isDenied = err instanceof DOMException && (err.name === "NotAllowedError" || err.name === "PermissionDeniedError");
      const detail = isDenied
        ? "Camera permission was denied. Tap the lock or settings icon in your browser URL bar above to allow camera access, then try again."
        : initializationStage === "model"
          ? "We couldn't load face detection. Check your connection and try again."
          : facing === "environment" ? "Back camera unavailable. Try the front camera or check camera permissions." : "We couldn't access your camera. Check browser camera permission and try again.";
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
      if (!detectionRunningRef.current) return;
      const video = videoRef.current;
      if (!video || !streamRef.current || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
        animFrameRef.current = requestAnimationFrame(detect);
        return;
      }

      const now = performance.now();
      if (video.currentTime === lastTimestamp) {
        animFrameRef.current = requestAnimationFrame(detect);
        return;
      }
      lastTimestamp = video.currentTime;

      try {
        const results = landmarker.detectForVideo(video, now);
        const faceCount = results.faceLandmarks?.length ?? 0;
        latestFaceCountRef.current = faceCount;
        const landmarks: NormalizedLandmark[] | null = faceCount > 0 ? results.faceLandmarks[0] : null;

        latestLandmarksRef.current = landmarks;

        const guidance = analyzeFacePosition(landmarks, faceCount, video.videoWidth, video.videoHeight);
        // Inference may itself take more than a second on slower phones.
        lastDetectionAtRef.current = performance.now();
        setFaceGuidance(guidance);

        if (guidance.status === "ready") {
          const stability = advanceFaceStability(stableFaceRef.current, landmarks!, now);
          stableFaceRef.current = stability.state;
          if (stability.state.frames === 1) recentSamplesRef.current = [];
          const capturedAt = lastDetectionAtRef.current;
          recentSamplesRef.current = [...recentSamplesRef.current, {
            landmarks: landmarks!.map(({ x, y, z }) => ({ x, y, z })),
            width: video.videoWidth, height: video.videoHeight, capturedAt
          }].filter(sample => capturedAt - sample.capturedAt <= 4_000).slice(-12);
          setLandmarksReady(stability.ready);
          if (!stability.ready) setFaceGuidance({ ...guidance, message: "Hold still for a moment to confirm your position" });
        } else {
          stableFaceRef.current = null;
          recentSamplesRef.current = [];
          setLandmarksReady(false);
        }
      } catch {
        latestLandmarksRef.current = null;
        lastDetectionAtRef.current = 0;
        stableFaceRef.current = null;
        recentSamplesRef.current = [];
        setLandmarksReady(false);
        setFaceGuidance({ status: "no_face", message: "Face detection interrupted. Hold still and try again.", confidence: 0 });
      }

      animFrameRef.current = requestAnimationFrame(detect);
    };

    animFrameRef.current = requestAnimationFrame(detect);
  }, []);

  // The video node is deliberately unmounted between camera, calibration, and
  // scanning views. Reattach the existing stream whenever a video view mounts;
  // otherwise Safari shows a black preview and the landmark loop has no frames.
  useEffect(() => {
    const needsVideo = step === "camera" || (step === "calibration" && calibrationMode === "card");
    if (!needsVideo) {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      detectionRunningRef.current = false;
      return;
    }
    if (modelLoading) return;

    // Every preview mounts a new video element. Do not let readiness or
    // samples from the previous element enable capture before it starts.
    setCameraReady(false);
    setLandmarksReady(false);
    latestLandmarksRef.current = null;
    latestFaceCountRef.current = 0;
    lastDetectionAtRef.current = 0;
    stableFaceRef.current = null;
    recentSamplesRef.current = [];

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
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      detectionRunningRef.current = false;
    };
  }, [calibrationMode, cameraVersion, modelLoading, startDetectionLoop, step]);

  // ─── CAPTURE & MEASURE ───
  const performMeasurement = useCallback((calibrationOverride?: CalibrationResult, captured?: { width: number; height: number; landmarks: NormalizedLandmark[] }, prepared?: ReturnType<typeof prepareFaceScan>) => {
    const video = videoRef.current;
    const landmarks = captured?.landmarks ?? prepared?.landmarks ?? latestLandmarksRef.current;
    const videoWidth = captured?.width ?? prepared?.width ?? video?.videoWidth ?? 0;
    const videoHeight = captured?.height ?? prepared?.height ?? video?.videoHeight ?? 0;
    if ((!video && !captured && !prepared) || !videoWidth || !videoHeight || !landmarks || landmarks.length < 468) {
      setError("Face landmarks were lost. Center your face in the guide and try again.");
      setLandmarksReady(false);
      stableFaceRef.current = null;
      setStep("camera");
      return;
    }

    if ((!captured && !prepared && (!landmarksReady || performance.now() - lastDetectionAtRef.current > 1_500)) ||
        analyzeFacePosition(landmarks, captured || prepared ? 1 : latestFaceCountRef.current, videoWidth, videoHeight).status !== "ready") {
      setError("Center your face, keep your head straight, and try again.");
      setStep(captured ? "corners" : "camera");
      return;
    }
    setError(null);
    setStep("scanning");
    trackEvent("calibration_completed", { method: calibrationOverride?.method ?? "heuristic" });

    // Freeze recent valid camera frames before the video view unmounts.
    const samples = prepared?.samples ?? recentSamplesRef.current.filter(sample =>
      performance.now() - sample.capturedAt <= 4_000 && sample.width === videoWidth && sample.height === videoHeight
    );

    if (measurementTimerRef.current) clearTimeout(measurementTimerRef.current);
    measurementTimerRef.current = setTimeout(() => {
      measurementTimerRef.current = null;
      if (!mountedRef.current) return;
      try {
        let result: FaceMeasurementResult;
        let cal: CalibrationResult;
        if (captured) {
          if (!calibrationOverride) throw new Error("Card calibration is missing. Mark the corners again.");
          cal = calibrationOverride;
          result = computeFaceMeasurements(landmarks, videoWidth, videoHeight, cal);
        } else {
          const aggregate = computeIrisMeasurementFromSamples(samples);
          result = aggregate.result;
          cal = aggregate.calibration;
        }

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
        window.dispatchEvent(new Event("vv-face-measurements-updated"));

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
        setCapture(null);
        setStep("results");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Measurement calculation failed. Please try again.");
        setStep(captured ? "corners" : "camera");
      }
    }, 1200); // Brief scanning animation delay
  }, [landmarksReady, stopCamera]);

  // ─── CALIBRATION HANDLERS ───
  const handleSkipCalibration = () => {
    trackEvent("calibration_skipped");
    const prepared = preparedScanRef.current;
    if (!prepared) {
      setError("Your scan is no longer available. Please scan again.");
      setStep("camera");
      return;
    }
    performMeasurement(undefined, undefined, prepared);
  };

  const handleCardCalibration = () => {
    setCalibrationMode("card");
    trackEvent("calibration_started", { method: "card" });
  };

  const handleCardAligned = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || !video.videoHeight || !landmarkerRef.current || !landmarksReady || performance.now() - lastDetectionAtRef.current > 1_500) {
      setError("Hold still with your face centred before capturing.");
      return;
    }
    try {
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not capture the camera. Please try again.");
      ctx.drawImage(video, 0, 0);
      // Detect on exactly the captured pixels, not stale landmarks from a previous video frame.
      const result = landmarkerRef.current.detectForVideo(canvas, performance.now());
      const landmarks = result.faceLandmarks?.[0];
      if (analyzeFacePosition(landmarks ?? null, result.faceLandmarks?.length ?? 0, canvas.width, canvas.height).status !== "ready") {
        throw new Error("Face the camera straight on, keep both eyes visible, and capture again.");
      }
      setCapture({ image: canvas.toDataURL("image/png"), width: canvas.width, height: canvas.height, landmarks });
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      detectionRunningRef.current = false;
      setError(null);
      setStep("corners");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not capture your face. Please try again.");
    }
  };

  // ─── RETRY ───
  const handleRetry = () => {
    setCapture(null);
    setMeasurement(null);
    setCalibrationMode("choosing");
    setLandmarksReady(false);
    stableFaceRef.current = null;
    setError(null);
    stopCamera();
    startCamera();
  };

  // ─── NAVIGATE ───
  const handleExploreFrames = () => {
    trackEvent("frame_size_results_viewed");
    onClose();
    router.push("/frames?recommended=true");
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
              { icon: Glasses, text: "Remove your glasses" },
              { icon: Smartphone, text: "Face the camera directly at eye level" },
              { icon: Sun, text: "Use good, even lighting" },
              { icon: ScanFace, text: "Keep your face inside the guide" },
              { icon: Hand, text: "Hold still during scanning" },
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-3 sm:last:col-span-2">
                <item.icon className="h-5 w-5 shrink-0 text-teal-700" strokeWidth={1.75} aria-hidden="true" />
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
              onClick={() => void startCamera()}
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
              className={`h-full w-full object-cover ${cameraFacing === "user" ? "scale-x-[-1]" : ""}`}
            />
            <button type="button" disabled={!cameraReady || modelLoading} onClick={() => void startCamera(cameraFacing === "user" ? "environment" : "user")}
              className="absolute right-3 top-3 z-30 flex items-center gap-2 rounded-full bg-black/65 px-3 py-2 text-xs font-bold text-white disabled:opacity-40">
              <SwitchCamera className="h-4 w-4" /> {cameraFacing === "user" ? "Back camera" : "Front camera"}
            </button>
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
                try {
                  if (latestFaceCountRef.current !== 1) throw new Error("Keep one face in the guide before continuing.");
                  preparedScanRef.current = prepareFaceScan(recentSamplesRef.current, performance.now());
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Please scan again.");
                  return;
                }
                setError(null);
                if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
                detectionRunningRef.current = false;
                setCameraReady(false);
                setLandmarksReady(false);
                setCalibrationMode("choosing");
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
          <h3 className="text-xl font-extrabold text-white">Improve accuracy</h3>
          <p className="mt-2 text-sm text-slate-400">
            Capture your face with a standard bank card, then mark its corners to set the scale. Without a card, sizing uses an average iris diameter.
          </p>

          <p className="mt-3 text-sm text-teal-300">Your scan is ready. Choose how to calibrate it.</p>
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
                  Capture a photo and mark four card corners
                </p>
              </div>
              <ChevronRight className="ml-auto h-5 w-5 text-teal-500 transition group-hover:translate-x-0.5" />
            </button>

            <button
              type="button"
              onClick={handleSkipCalibration}
              disabled={!preparedScanRef.current}
              className="group flex items-center gap-4 rounded-2xl border border-slate-700 bg-slate-900/60 p-5 text-left transition hover:border-slate-600 hover:bg-slate-900/80 disabled:cursor-not-allowed disabled:opacity-50"
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
              className={`h-full w-full object-cover ${cameraFacing === "user" ? "scale-x-[-1]" : ""}`}
            />
            <button type="button" disabled={!cameraReady || modelLoading} onClick={() => void startCamera(cameraFacing === "user" ? "environment" : "user")}
              className="absolute right-3 top-3 z-30 flex items-center gap-2 rounded-full bg-black/65 px-3 py-2 text-xs font-bold text-white disabled:opacity-40">
              <SwitchCamera className="h-4 w-4" /> {cameraFacing === "user" ? "Back camera" : "Front camera"}
            </button>
          </div>
          {!landmarksReady && <p role="status" className="text-center text-sm text-amber-300">{faceGuidance.message}</p>}
          <p className="text-xs text-slate-500 text-center">
            Hold a standard bank card horizontally beside your cheek, at the same distance as your face. Keep it flat, show all four corners, and leave both eyes visible. Use a blank card of the same size or cover printed details.
          </p>
          <button
            type="button"
            onClick={handleCardAligned}
            disabled={!cameraReady || modelLoading || !landmarksReady}
            className="vv-button-retail flex w-full justify-center gap-2 py-3.5 font-extrabold"
          >
            <Scan className="h-5 w-5" />
            Capture face and card
          </button>
          <button
            type="button"
            onClick={() => setCalibrationMode("choosing")}
            className="text-sm font-bold text-slate-400 transition hover:text-white"
          >
            Back to calibration choices
          </button>
        </div>
      )}

      {step === "corners" && capture && (
        <div className="max-h-[85dvh] w-full max-w-lg overflow-y-auto py-6">
          <CardCorners image={capture.image} width={capture.width} height={capture.height}
            onConfirm={(cal) => performMeasurement(cal, capture)}
            onRetake={() => { setCapture(null); setStep("calibration"); }} />
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
