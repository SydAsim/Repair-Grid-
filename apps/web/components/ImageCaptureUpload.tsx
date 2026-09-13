"use client";

import { useState, useRef, useEffect } from "react";
import { 
  Camera, 
  Upload, 
  X, 
  Check, 
  Maximize2, 
  Trash2, 
  AlertCircle, 
  Sparkles, 
  SwitchCamera
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

// Pre-configured high-fidelity sample photos for quick 1-click testing
const SAMPLE_PHOTOS = {
  pothole: "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=800&auto=format&fit=crop&q=80",
  streetlight: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=800&auto=format&fit=crop&q=80",
  drain: "https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?w=800&auto=format&fit=crop&q=80",
};

interface ImageCaptureUploadProps {
  value?: string | null;
  onChange: (imageUrl: string | null, file?: File | null) => void;
  label?: string;
  categoryHint?: "streetlights" | "potholes" | "blocked_drains" | string;
  className?: string;
}

export function ImageCaptureUpload({
  value,
  onChange,
  label = "Upload or Snap Photo",
  categoryHint = "streetlights",
  className = "",
}: ImageCaptureUploadProps) {
  const [preview, setPreview] = useState<string | null>(value || null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileSize, setFileSize] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isCapturing, setIsCapturing] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [isZoomModalOpen, setIsZoomModalOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Sync state if value prop changes
  useEffect(() => {
    if (value !== undefined) {
      setPreview(value);
    }
  }, [value]);

  // Cleanup camera stream on unmount
  useEffect(() => {
    return () => {
      stopCameraStream();
    };
  }, []);

  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  // Start real live camera stream
  const startCamera = async (mode: "environment" | "user" = facingMode) => {
    stopCameraStream();
    setCameraError(null);
    setIsCameraOpen(true);

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera API is not supported in this browser.");
      }

      // Try preferred facing mode first, fallback to generic video if unavailable
      let stream: MediaStream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: { ideal: mode }, width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
      } catch (err) {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
    } catch (err: any) {
      console.warn("Camera access failed:", err);
      setCameraError(
        err.name === "NotAllowedError" || err.name === "PermissionDeniedError"
          ? "Camera permission denied. Please allow camera access in your browser or select an image file below."
          : `Unable to access camera (${err.message || "device not found"}). Use file upload or a sample photo.`
      );
    }
  };

  // Flip between front/back camera
  const toggleFacingMode = () => {
    const nextMode = facingMode === "environment" ? "user" : "environment";
    setFacingMode(nextMode);
    startCamera(nextMode);
  };

  // Snap photo from live video stream
  const takeSnapshot = () => {
    if (!videoRef.current) return;
    setIsCapturing(true);

    try {
      const video = videoRef.current;
      const canvas = document.createElement("canvas");
      canvas.width = video.videoWidth || 1280;
      canvas.height = video.videoHeight || 720;
      const ctx = canvas.getContext("2d");

      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.9);
        
        // Visual shutter flash effect before closing
        setTimeout(() => {
          setPreview(dataUrl);
          setFileName(`camera-capture-${Date.now()}.jpg`);
          setFileSize(`${Math.round((dataUrl.length * 0.75) / 1024)} KB`);
          onChange(dataUrl, null);
          stopCameraStream();
          setIsCameraOpen(false);
          setIsCapturing(false);
        }, 150);
      }
    } catch (err) {
      console.error("Failed to capture snapshot:", err);
      setIsCapturing(false);
    }
  };

  // Process standard file input or drop
  const handleFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      alert("Please choose a valid image file (JPEG, PNG, WEBP).");
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      setPreview(result);
      setFileName(file.name);
      setFileSize(`${Math.round(file.size / 1024)} KB`);
      onChange(result, file);
    };
    reader.readAsDataURL(file);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFile(file);
    }
  };

  const handleClear = () => {
    setPreview(null);
    setFileName(null);
    setFileSize(null);
    onChange(null, null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  // Quick preset sample photo
  const selectSamplePhoto = (type: "pothole" | "streetlight" | "drain") => {
    const url = SAMPLE_PHOTOS[type];
    setPreview(url);
    setFileName(`sample-${type}-verified.jpg`);
    setFileSize("340 KB");
    onChange(url, null);
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        onChange={handleInputChange}
        className="hidden"
        id="repairgrid-file-picker"
      />

      {/* STATE 1: Photo is attached and ready */}
      {preview ? (
        <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl bg-white dark:bg-zinc-900/60 p-3.5 shadow-sm space-y-3 transition-all">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="h-6 w-6 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <Check className="h-3.5 w-3.5 stroke-[3]" />
              </div>
              <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
                Photo Attached
              </span>
              <Badge variant="success" className="text-[10px] font-mono px-1.5 py-0 h-4">
                AI Ready
              </Badge>
            </div>

            <div className="flex items-center space-x-1">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsZoomModalOpen(true)}
                className="h-7 w-7 p-0 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
                title="Enlarge Photo"
              >
                <Maximize2 className="h-3.5 w-3.5" />
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleClear}
                className="h-7 w-7 p-0 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                title="Remove Photo"
              >
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>

          {/* Photo Preview Canvas */}
          <div className="relative rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-zinc-950 max-h-56 group flex items-center justify-center">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview}
              alt="Evidence photo"
              className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20 pointer-events-none" />

            {/* Overlay metadata */}
            <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-white text-[11px] font-mono">
              <span className="truncate max-w-[200px] bg-black/60 px-2 py-0.5 rounded backdrop-blur-sm">
                {fileName || "evidence_capture.jpg"}
              </span>
              {fileSize && (
                <span className="bg-black/60 px-2 py-0.5 rounded backdrop-blur-sm">
                  {fileSize}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={() => setIsZoomModalOpen(true)}
              className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity text-white text-xs font-medium"
            >
              <span className="bg-zinc-900/90 px-3 py-1.5 rounded-full border border-white/20 flex items-center space-x-1.5 shadow-lg">
                <Maximize2 className="h-3 w-3" />
                <span>Click to Expand</span>
              </span>
            </button>
          </div>

          {/* Action buttons to retake or pick another */}
          <div className="flex items-center space-x-2 pt-1">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 h-8 text-xs border-zinc-300 dark:border-zinc-700"
            >
              <Upload className="h-3 w-3 mr-1.5 text-zinc-500" />
              Choose Different
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => startCamera()}
              className="flex-1 h-8 text-xs border-zinc-300 dark:border-zinc-700 text-indigo-600 dark:text-indigo-400"
            >
              <Camera className="h-3 w-3 mr-1.5" />
              Retake Camera
            </Button>
          </div>

          {/* Multimodal AI scan verification notice */}
          <div className="flex items-center space-x-2 text-[11px] text-zinc-500 dark:text-zinc-400 bg-zinc-50 dark:bg-zinc-800/40 p-2 rounded-md border border-zinc-200/80 dark:border-zinc-800">
            <Sparkles className="h-3.5 w-3.5 text-indigo-500 flex-shrink-0" />
            <span>
              Evidence ready for secure case review.
            </span>
          </div>
        </div>
      ) : (
        /* STATE 2: Empty dropzone / upload trigger */
        <div className="space-y-2.5">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={`border-2 border-dashed rounded-xl p-6 flex flex-col items-center justify-center transition-all ${
              isDragging
                ? "border-indigo-500 bg-indigo-50/50 dark:bg-indigo-950/20 scale-[0.99]"
                : "border-zinc-300 dark:border-zinc-800 bg-white/60 dark:bg-[#0d0d10] hover:border-zinc-400 dark:hover:border-zinc-700"
            }`}
          >
            <div className="flex items-center justify-center space-x-3 mb-3">
              <div 
                onClick={() => startCamera()}
                className="h-12 w-12 rounded-full bg-indigo-50 dark:bg-indigo-950/50 border border-indigo-200 dark:border-indigo-800/80 flex items-center justify-center text-indigo-600 dark:text-indigo-400 cursor-pointer hover:scale-110 active:scale-95 transition-all shadow-sm"
                title="Open Camera"
              >
                <Camera className="h-5 w-5" />
              </div>
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="h-12 w-12 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 flex items-center justify-center text-zinc-700 dark:text-zinc-300 cursor-pointer hover:scale-110 active:scale-95 transition-all shadow-sm"
                title="Upload Image"
              >
                <Upload className="h-5 w-5" />
              </div>
            </div>

            <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 text-center">
              Snap Live Photo or Drop Image Here
            </h4>
            <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-1 text-center max-w-xs">
              Take a snapshot with your device camera or upload JPG/PNG (up to 15MB).
            </p>

            <div className="flex items-center space-x-2 mt-4">
              <Button
                type="button"
                size="sm"
                onClick={() => startCamera()}
                className="h-8 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm"
              >
                <Camera className="h-3.5 w-3.5 mr-1.5" />
                Open Camera
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="h-8 text-xs border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300"
              >
                <Upload className="h-3.5 w-3.5 mr-1.5 text-zinc-500" />
                Browse Files
              </Button>
            </div>
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* LIVE CAMERA VIEWFINDER MODAL */}
      {/* ========================================================================= */}
      {isCameraOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl flex flex-col relative">
            {/* Modal Header HUD */}
            <div className="px-4 py-3 border-b border-zinc-800/80 bg-zinc-900/80 flex items-center justify-between text-white">
              <div className="flex items-center space-x-2">
                <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                <span className="text-xs font-mono font-bold tracking-wider uppercase">
                  RepairGrid Live Viewfinder
                </span>
                <Badge variant="outline" className="text-[9px] font-mono border-zinc-700 text-zinc-400 py-0">
                  {facingMode === "environment" ? "REAR CAM" : "FRONT CAM"}
                </Badge>
              </div>

              <div className="flex items-center space-x-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={toggleFacingMode}
                  className="h-7 w-7 p-0 text-zinc-400 hover:text-white"
                  title="Switch Camera"
                >
                  <SwitchCamera className="h-4 w-4" />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    stopCameraStream();
                    setIsCameraOpen(false);
                  }}
                  className="h-7 w-7 p-0 text-zinc-400 hover:text-white"
                  title="Close Camera"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Video Viewport Area */}
            <div className="relative aspect-[4/3] bg-black overflow-hidden flex items-center justify-center">
              {cameraError ? (
                <div className="p-6 text-center space-y-3 max-w-sm">
                  <div className="h-10 w-10 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
                    <AlertCircle className="h-5 w-5" />
                  </div>
                  <h4 className="text-xs font-semibold text-zinc-100">Camera Unavailable</h4>
                  <p className="text-[11px] text-zinc-400 leading-relaxed">
                    {cameraError}
                  </p>
                  <div className="pt-2 flex flex-col space-y-2">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => {
                        stopCameraStream();
                        setIsCameraOpen(false);
                        fileInputRef.current?.click();
                      }}
                      className="text-xs bg-indigo-600 hover:bg-indigo-500 text-white"
                    >
                      <Upload className="h-3 w-3 mr-1.5" />
                      Pick Image File Instead
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        stopCameraStream();
                        setIsCameraOpen(false);
                        selectSamplePhoto("pothole");
                      }}
                      className="text-xs border-zinc-700 text-zinc-300"
                    >
                      Use Sample Incident Photo
                    </Button>
                  </div>
                </div>
              ) : (
                <>
                  <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted
                    className={`w-full h-full object-cover transition-opacity duration-300 ${
                      isCapturing ? "opacity-30" : "opacity-100"
                    }`}
                  />

                  {/* Tactical Target Reticle HUD Overlay */}
                  <div className="absolute inset-0 pointer-events-none p-6 flex flex-col justify-between">
                    {/* Corners */}
                    <div className="flex justify-between">
                      <div className="w-6 h-6 border-t-2 border-l-2 border-emerald-400/80" />
                      <div className="w-6 h-6 border-t-2 border-r-2 border-emerald-400/80" />
                    </div>

                    {/* Center Crosshair */}
                    <div className="self-center flex flex-col items-center justify-center">
                      <div className="w-12 h-12 rounded-full border border-dashed border-emerald-400/60 flex items-center justify-center animate-pulse">
                        <div className="w-2 h-2 rounded-full bg-emerald-400" />
                      </div>
                      <span className="text-[9px] font-mono text-emerald-400 mt-2 bg-black/60 px-2 py-0.5 rounded backdrop-blur-sm">
                        ALIGN INCIDENT IN FRAME
                      </span>
                    </div>

                    {/* Bottom Corners */}
                    <div className="flex justify-between">
                      <div className="w-6 h-6 border-b-2 border-l-2 border-emerald-400/80" />
                      <div className="w-6 h-6 border-b-2 border-r-2 border-emerald-400/80" />
                    </div>
                  </div>

                  {/* Visual Shutter Flash Effect */}
                  {isCapturing && (
                    <div className="absolute inset-0 bg-white animate-out fade-out duration-150 z-20 pointer-events-none" />
                  )}
                </>
              )}
            </div>

            {/* Modal Footer Controls */}
            {!cameraError && (
              <div className="p-4 bg-zinc-900 border-t border-zinc-800 flex items-center justify-between">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    stopCameraStream();
                    setIsCameraOpen(false);
                    fileInputRef.current?.click();
                  }}
                  className="text-xs text-zinc-400 hover:text-white"
                >
                  <Upload className="h-3.5 w-3.5 mr-1" />
                  Choose File
                </Button>

                {/* Big Shutter Button */}
                <button
                  type="button"
                  onClick={takeSnapshot}
                  disabled={isCapturing}
                  className="h-16 w-16 rounded-full bg-white hover:bg-zinc-200 active:scale-90 transition-all p-1 shadow-lg ring-4 ring-white/20 flex items-center justify-center group"
                  title="Take Photo"
                >
                  <div className="h-13 w-13 rounded-full border-2 border-zinc-900 flex items-center justify-center bg-white group-hover:bg-zinc-100">
                    <Camera className="h-6 w-6 text-zinc-950" />
                  </div>
                </button>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={toggleFacingMode}
                  className="text-xs text-zinc-400 hover:text-white"
                >
                  <SwitchCamera className="h-3.5 w-3.5 mr-1" />
                  Flip
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ZOOM / FULLSCREEN PHOTO PREVIEW MODAL */}
      {/* ========================================================================= */}
      {isZoomModalOpen && preview && (
        <div 
          onClick={() => setIsZoomModalOpen(false)}
          className="fixed inset-0 z-50 bg-black/90 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150"
        >
          <div 
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-3xl w-full bg-zinc-950 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl"
          >
            <div className="p-3 border-b border-zinc-800 bg-zinc-900/90 flex items-center justify-between text-white">
              <span className="text-xs font-mono font-semibold">
                High-Resolution Evidence Preview
              </span>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setIsZoomModalOpen(false)}
                className="h-7 w-7 p-0 text-zinc-400 hover:text-white"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-2 flex items-center justify-center bg-black max-h-[75vh]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview}
                alt="Enlarged evidence"
                className="max-h-[70vh] w-auto object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
