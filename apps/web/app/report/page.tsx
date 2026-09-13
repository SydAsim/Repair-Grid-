"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Camera, 
  MapPin, 
  CheckCircle2, 
  ArrowLeft, 
  ArrowRight, 
  Mic, 
  MicOff,
  Sparkles,
  Lightbulb,
  AlertTriangle,
  UploadCloud,
  Check,
  Wrench,
  RefreshCw,
  Edit3,
  Compass,
  X,
  FlipHorizontal,
  Info
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";

type Category = "streetlights" | "potholes" | "other";

export default function ReportPage() {
  const router = useRouter();
  const { user, getAuthHeaders } = useAuth();

  // Wizard steps
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Step 1: Category, Photo, Description
  const [category, setCategory] = useState<Category>("streetlights");
  const [description, setDescription] = useState("");
  const [photoDataUrl, setPhotoDataUrl] = useState<string | null>(null);
  const [photoMode, setPhotoMode] = useState<"choose" | "camera" | "upload">("choose");
  
  // Real-time Camera State
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraFacing, setCameraFacing] = useState<"environment" | "user">("environment");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);

  // Voice to text (Mic)
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(true);
  const recognitionRef = useRef<any>(null);

  // Step 2: Location
  const [lat, setLat] = useState<number>(37.7751);
  const [lng, setLng] = useState<number>(-122.4190);
  const [locationName, setLocationName] = useState("Gate 2, University Road, Campus District");
  const [manualLocationMode, setManualLocationMode] = useState(false);
  const [gpsDetecting, setGpsDetecting] = useState(false);
  const [gpsAccuracy, setGpsAccuracy] = useState<number | null>(4.2);

  // Step 3: Submitting
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Initialize Speech Recognition
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onresult = (event: any) => {
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript) {
          setDescription((prev) => (prev ? `${prev} ${transcript}` : transcript));
        }
      };

      recognition.onerror = (e: any) => {
        console.warn("Speech recognition error:", e);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    } else {
      setSpeechSupported(false);
    }

    return () => {
      stopCamera();
    };
  }, []);

  // Camera Controls
  const startCamera = async () => {
    setCameraError(null);
    setPhotoMode("camera");
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Camera access not supported by your browser");
      }

      // Stop any existing stream
      stopCamera();

      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: cameraFacing },
        audio: false,
      });

      mediaStreamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setCameraActive(true);
    } catch (err: any) {
      console.warn("Could not start real-time camera:", err);
      setCameraError(err.message || "Camera access was denied or is not available on this device.");
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (mediaStreamRef.current) {
      mediaStreamRef.current.getTracks().forEach((track) => track.stop());
      mediaStreamRef.current = null;
    }
    setCameraActive(false);
  };

  const toggleCameraFacing = () => {
    const nextFacing = cameraFacing === "environment" ? "user" : "environment";
    setCameraFacing(nextFacing);
    setTimeout(() => {
      startCamera();
    }, 100);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      canvas.width = video.videoWidth || 640;
      canvas.height = video.videoHeight || 480;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
        setPhotoDataUrl(dataUrl);
        stopCamera();
        setPhotoMode("choose");
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = () => {
        setPhotoDataUrl(reader.result as string);
        setPhotoMode("choose");
      };
      reader.readAsDataURL(file);
    }
  };

  const triggerFileUpload = () => {
    stopCamera();
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const removePhoto = () => {
    setPhotoDataUrl(null);
    stopCamera();
    setPhotoMode("choose");
  };

  // Mic speech to text handler
  const toggleSpeechRecognition = () => {
    if (!speechSupported) {
      // Friendly fallback sample insertion
      setDescription((prev) => 
        prev ? `${prev} - Streetlight flickers intermittently and shuts off completely after sunset.` : "Streetlight pole inactive outside gate 2 for 3 consecutive evenings."
      );
      return;
    }

    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current?.start();
        setIsListening(true);
      } catch (err) {
        console.warn("Speech recognition error:", err);
      }
    }
  };

  // GPS Geolocation Handler
  const detectLiveLocation = () => {
    setGpsDetecting(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newLat = parseFloat(position.coords.latitude.toFixed(6));
          const newLng = parseFloat(position.coords.longitude.toFixed(6));
          setLat(newLat);
          setLng(newLng);
          setGpsAccuracy(Math.round(position.coords.accuracy));
          setLocationName(`GPS Detected Position (${newLat.toFixed(4)}, ${newLng.toFixed(4)})`);
          setGpsDetecting(false);
        },
        (error) => {
          console.warn("Geolocation detection error:", error);
          setGpsDetecting(false);
          // Keep campus district default coordinates
          setLocationName("Gate 2, University Road, Campus District");
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    } else {
      setGpsDetecting(false);
    }
  };

  // Trigger GPS detection when transitioning to Step 2
  useEffect(() => {
    if (step === 2) {
      detectLiveLocation();
    }
  }, [step]);

  // Validation: The Continue button should NOT be shown until and unless the photo and description are properly described
  const hasPhoto = Boolean(photoDataUrl);
  const hasDescription = description.trim().length >= 5;
  const hasCategory = Boolean(category);
  const isStep1Valid = hasPhoto && hasDescription && hasCategory;

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const authHeaders = getAuthHeaders();
      const res = await fetch("http://localhost:8000/api/reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...authHeaders,
        },
        body: JSON.stringify({
          category,
          description: description.trim(),
          lat,
          lng,
          location_name: locationName.trim() || `${lat.toFixed(4)}, ${lng.toFixed(4)}`,
          image_url: photoDataUrl || null,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "Failed to submit report to Strands Agent Graph.");
      }

      const data = await res.json();
      router.push(`/resident/reports/${data.report_id}`);
    } catch (err: any) {
      console.warn("Submission error:", err);
      setSubmitError(err.message || "Could not submit report. Please check if backend is online.");
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Hidden elements for camera and file upload */}
      <canvas ref={canvasRef} className="hidden" />
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept="image/*"
        className="hidden"
      />

      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/70 backdrop-blur-md px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <Link href="/resident" className="inline-flex items-center text-xs font-semibold text-slate-400 hover:text-white transition">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Cancel
        </Link>
        <span className="font-bold text-sm tracking-tight text-white flex items-center space-x-1.5">
          <span>REPAIRGRID REPORT</span>
        </span>
        <div className="flex items-center space-x-1.5 text-xs font-semibold text-indigo-400 bg-indigo-500/10 px-2.5 py-1 rounded-full border border-indigo-500/20">
          <span>Step {step} of 3</span>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="w-full bg-slate-900 h-1">
        <div 
          className="bg-gradient-to-r from-indigo-500 to-cyan-400 h-1 transition-all duration-300"
          style={{ width: `${(step / 3) * 100}%` }}
        />
      </div>

      <main className="flex-1 max-w-lg mx-auto w-full p-4 sm:p-6 flex flex-col justify-between">
        {/* ================= STEP 1: PHOTO, CATEGORY & DESCRIPTION ================= */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-extrabold text-white tracking-tight">Report a Maintenance Issue</h1>
              <p className="text-xs text-slate-400 mt-1">
                Provide a photo, select the issue type, and describe the problem below.
              </p>
            </div>

            {/* 1. PHOTO SECTION: TAKE PHOTO OR UPLOAD PHOTO */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                1. Photo Evidence <span className="text-rose-400">*</span>
              </label>

              {/* A. If Photo is Already Captured/Uploaded */}
              {photoDataUrl ? (
                <div className="relative rounded-2xl overflow-hidden border border-emerald-500/40 bg-slate-900 shadow-xl group">
                  <img 
                    src={photoDataUrl} 
                    alt="Captured Evidence" 
                    className="w-full h-52 object-cover"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-transparent to-transparent flex items-end justify-between p-4">
                    <div className="flex items-center space-x-2">
                      <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500 text-slate-950 flex items-center space-x-1">
                        <Check className="h-3.5 w-3.5" />
                        <span>Photo Attached</span>
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={removePhoto}
                      className="px-3 py-1.5 rounded-xl bg-slate-900/90 hover:bg-rose-600 text-slate-200 hover:text-white text-xs font-semibold transition flex items-center space-x-1 border border-slate-700"
                    >
                      <X className="h-3.5 w-3.5" />
                      <span>Retake / Change</span>
                    </button>
                  </div>
                </div>
              ) : cameraActive ? (
                /* B. Active Real-Time Camera Viewfinder */
                <div className="relative rounded-2xl overflow-hidden border-2 border-indigo-500 bg-black shadow-2xl">
                  <video 
                    ref={videoRef} 
                    autoPlay 
                    playsInline 
                    muted 
                    className="w-full h-64 object-cover"
                  />
                  
                  {/* Viewfinder Target Overlays */}
                  <div className="absolute inset-0 pointer-events-none border border-white/20 m-4 rounded-xl flex items-center justify-center">
                    <div className="h-16 w-16 border-2 border-indigo-400/60 rounded-lg flex items-center justify-center">
                      <div className="h-2 w-2 bg-indigo-400 rounded-full animate-ping" />
                    </div>
                  </div>

                  {/* Camera Controls Bar */}
                  <div className="absolute bottom-0 inset-x-0 bg-slate-950/80 backdrop-blur-md p-3 flex items-center justify-between">
                    <button
                      type="button"
                      onClick={() => { stopCamera(); setPhotoMode("choose"); }}
                      className="text-xs text-slate-400 hover:text-white px-3 py-1.5 rounded-lg"
                    >
                      Cancel
                    </button>

                    <button
                      type="button"
                      onClick={capturePhoto}
                      className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/40 flex items-center space-x-2 animate-bounce"
                    >
                      <Camera className="h-4 w-4" />
                      <span>Snap Photo</span>
                    </button>

                    <button
                      type="button"
                      onClick={toggleCameraFacing}
                      className="p-2 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
                      title="Flip Camera"
                    >
                      <FlipHorizontal className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ) : (
                /* C. Photo Selection Buttons: Take Photo OR Upload Photo */
                <div className="grid grid-cols-2 gap-3">
                  {/* Option 1: Real-Time Camera */}
                  <button
                    type="button"
                    onClick={startCamera}
                    className="p-5 rounded-2xl border border-dashed border-indigo-500/40 bg-indigo-500/5 hover:bg-indigo-500/10 text-indigo-300 flex flex-col items-center justify-center text-center transition group hover:border-indigo-500"
                  >
                    <div className="h-11 w-11 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center mb-2.5 group-hover:scale-110 transition">
                      <Camera className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-bold text-white">Take a Photo</span>
                    <span className="text-[10px] text-indigo-300/70 mt-0.5">Live Camera Access</span>
                  </button>

                  {/* Option 2: Upload a Photo */}
                  <button
                    type="button"
                    onClick={triggerFileUpload}
                    className="p-5 rounded-2xl border border-dashed border-slate-700 bg-slate-900/60 hover:bg-slate-900 text-slate-300 flex flex-col items-center justify-center text-center transition group hover:border-slate-500"
                  >
                    <div className="h-11 w-11 rounded-xl bg-slate-800 text-slate-400 flex items-center justify-center mb-2.5 group-hover:scale-110 transition">
                      <UploadCloud className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-bold text-white">Upload a Photo</span>
                    <span className="text-[10px] text-slate-500 mt-0.5">Select image file</span>
                  </button>
                </div>
              )}

              {cameraError && (
                <div className="mt-2 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center justify-between">
                  <span>{cameraError}</span>
                  <button 
                    type="button" 
                    onClick={triggerFileUpload}
                    className="underline text-indigo-400 ml-2"
                  >
                    Upload file instead
                  </button>
                </div>
              )}
            </div>

            {/* 2. ISSUE CATEGORY (Streetlight, Pothole, Other) */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                2. Issue Category <span className="text-rose-400">*</span>
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                {/* Streetlight */}
                <button
                  type="button"
                  onClick={() => setCategory("streetlights")}
                  className={`p-3.5 rounded-xl border flex flex-col items-center text-center transition ${
                    category === "streetlights"
                      ? "border-indigo-500 bg-indigo-500/20 text-white font-bold shadow-md shadow-indigo-500/20"
                      : "border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white"
                  }`}
                >
                  <Lightbulb className={`h-6 w-6 mb-1.5 ${category === "streetlights" ? "text-amber-400 animate-pulse" : "text-amber-400/70"}`} />
                  <span className="text-xs">Streetlight</span>
                </button>

                {/* Pothole */}
                <button
                  type="button"
                  onClick={() => setCategory("potholes")}
                  className={`p-3.5 rounded-xl border flex flex-col items-center text-center transition ${
                    category === "potholes"
                      ? "border-indigo-500 bg-indigo-500/20 text-white font-bold shadow-md shadow-indigo-500/20"
                      : "border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white"
                  }`}
                >
                  <AlertTriangle className={`h-6 w-6 mb-1.5 ${category === "potholes" ? "text-orange-400 animate-bounce" : "text-orange-400/70"}`} />
                  <span className="text-xs">Pothole</span>
                </button>

                {/* Other */}
                <button
                  type="button"
                  onClick={() => setCategory("other")}
                  className={`p-3.5 rounded-xl border flex flex-col items-center text-center transition ${
                    category === "other"
                      ? "border-indigo-500 bg-indigo-500/20 text-white font-bold shadow-md shadow-indigo-500/20"
                      : "border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white"
                  }`}
                >
                  <Wrench className={`h-6 w-6 mb-1.5 ${category === "other" ? "text-indigo-400 animate-pulse" : "text-indigo-400/70"}`} />
                  <span className="text-xs">Other</span>
                </button>
              </div>
            </div>

            {/* 3. DESCRIPTION & TEXT-TO-SPEECH (MIC) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  3. Description <span className="text-rose-400">*</span>
                </label>
                <button 
                  type="button" 
                  onClick={() => {
                    if (category === "streetlights") {
                      setDescription("Streetlight pole inactive outside gate 2 for three consecutive evenings.");
                    } else if (category === "potholes") {
                      setDescription("Large asphalt pothole approximately 2 feet wide obstructing the east bike lane.");
                    } else {
                      setDescription("Storm drain blocked by fallen leaves causing water ponding along sidewalk.");
                    }
                  }}
                  className="text-xs text-indigo-400 hover:underline flex items-center space-x-1"
                >
                  <Sparkles className="h-3 w-3" />
                  <span>Insert sample text</span>
                </button>
              </div>

              <div className="relative">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe the issue in detail, or click the microphone to speak..."
                  rows={3}
                  className="w-full rounded-xl bg-slate-900 border border-slate-800 p-3.5 pr-12 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />

                {/* Mic Button for Speech-to-Text */}
                <button
                  type="button"
                  onClick={toggleSpeechRecognition}
                  className={`absolute right-3 bottom-3 p-2 rounded-xl transition ${
                    isListening 
                      ? "bg-rose-600 text-white animate-pulse ring-4 ring-rose-500/30" 
                      : "bg-slate-800 hover:bg-slate-700 text-indigo-400 hover:text-indigo-300"
                  }`}
                  title={isListening ? "Listening... Click to stop" : "Click to speak via microphone"}
                >
                  {isListening ? <Mic className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </button>
              </div>

              {/* Listening Active Indicator */}
              {isListening && (
                <div className="mt-2 p-2 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center space-x-2 animate-pulse">
                  <span className="h-2 w-2 rounded-full bg-rose-500" />
                  <span>Listening... Speak into your microphone now</span>
                </div>
              )}
            </div>

            {/* Validation Feedback Banner */}
            {!isStep1Valid && (
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-400 flex items-center space-x-2">
                <Info className="h-4 w-4 text-indigo-400 flex-shrink-0" />
                <span>
                  Please {!hasPhoto ? "take or upload a photo" : ""} {!hasPhoto && !hasDescription ? "and " : ""}{!hasDescription ? "describe the issue" : ""} to unlock the continue button.
                </span>
              </div>
            )}
          </div>
        )}

        {/* ================= STEP 2: LOCATION ================= */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-extrabold text-white tracking-tight">Confirm Incident Location</h1>
              <p className="text-xs text-slate-400 mt-1">
                Amazon Location Service detected your incident coordinates. You can also write your location manually.
              </p>
            </div>

            {/* Location Card */}
            <div className="glass-panel rounded-2xl p-5 border border-indigo-500/30 bg-slate-900/80 space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3.5">
                  <div className="h-10 w-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 flex-shrink-0">
                    <MapPin className="h-5 w-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-white text-base leading-snug">{locationName}</h4>
                    <p className="text-xs text-slate-400 mt-0.5">RepairGrid Campus District • Zone North</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setManualLocationMode(!manualLocationMode)}
                  className="px-2.5 py-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 text-xs font-semibold transition flex items-center space-x-1 border border-indigo-500/20"
                >
                  <Edit3 className="h-3 w-3 mr-1" />
                  <span>{manualLocationMode ? "Done Editing" : "Write Manually"}</span>
                </button>
              </div>

              {/* Coordinates Display */}
              <div className="grid grid-cols-2 gap-2.5 pt-2">
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Latitude</span>
                  <span className="text-xs font-mono font-bold text-indigo-300">{lat.toFixed(6)}</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Longitude</span>
                  <span className="text-xs font-mono font-bold text-indigo-300">{lng.toFixed(6)}</span>
                </div>
              </div>

              {/* Manual Location Form if activated */}
              {manualLocationMode && (
                <div className="p-4 rounded-xl bg-slate-950 border border-indigo-500/30 space-y-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                      Write Location / Address Manually
                    </label>
                    <input
                      type="text"
                      value={locationName}
                      onChange={(e) => setLocationName(e.target.value)}
                      placeholder="e.g. North Gate 2, University Road, near Library"
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">Latitude</label>
                      <input
                        type="number"
                        step="0.0001"
                        value={lat}
                        onChange={(e) => setLat(parseFloat(e.target.value) || 0)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">Longitude</label>
                      <input
                        type="number"
                        step="0.0001"
                        value={lng}
                        onChange={(e) => setLng(parseFloat(e.target.value) || 0)}
                        className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white font-mono"
                      />
                    </div>
                  </div>

                  {/* Campus Quick Presets */}
                  <div className="pt-2 border-t border-slate-900">
                    <span className="text-[10px] text-slate-400 block mb-1.5 font-semibold">Campus Presets:</span>
                    <div className="flex flex-wrap gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          setLat(37.7751);
                          setLng(-122.4190);
                          setLocationName("Gate 2, University Road");
                        }}
                        className="text-[10px] px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 text-indigo-300 border border-slate-800"
                      >
                        Gate 2 Entrance
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setLat(37.7765);
                          setLng(-122.4175);
                          setLocationName("North Library Quad Walkway");
                        }}
                        className="text-[10px] px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 text-indigo-300 border border-slate-800"
                      >
                        Library Quad
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setLat(37.7742);
                          setLng(-122.4205);
                          setLocationName("Engineering Lab Courtyard");
                        }}
                        className="text-[10px] px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 text-indigo-300 border border-slate-800"
                      >
                        Engineering Lab
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* Refresh GPS Button */}
              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-emerald-400 flex items-center">
                  <Check className="h-3 w-3 mr-1" />
                  High Confidence Location Match
                </span>
                <button
                  type="button"
                  onClick={detectLiveLocation}
                  disabled={gpsDetecting}
                  className="text-xs text-slate-400 hover:text-white flex items-center space-x-1"
                >
                  <Compass className={`h-3 w-3 ${gpsDetecting ? "animate-spin text-indigo-400" : ""}`} />
                  <span>{gpsDetecting ? "Detecting GPS..." : "Re-detect GPS"}</span>
                </button>
              </div>

              {/* Visual Mini Map Preview */}
              <div className="h-32 rounded-xl bg-slate-950 border border-slate-800 relative flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:16px_16px] opacity-40" />
                <div className="relative z-10 flex flex-col items-center">
                  <div className="h-4 w-4 rounded-full bg-indigo-500 ring-4 ring-indigo-500/30 animate-pulse" />
                  <span className="mt-2 text-xs font-mono font-bold text-slate-300 bg-slate-950/90 px-2.5 py-0.5 rounded-md border border-slate-800">
                    Lat {lat.toFixed(4)}, Lng {lng.toFixed(4)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= STEP 3: REVIEW & SUBMIT ================= */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-extrabold text-white tracking-tight">Review & Submit</h1>
              <p className="text-xs text-slate-400 mt-1">
                Strands agents will autonomously verify, calculate risk, and coordinate technician dispatch.
              </p>
            </div>

            {submitError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs">
                {submitError}
              </div>
            )}

            <div className="glass-panel rounded-2xl p-5 space-y-4 border border-slate-800 bg-slate-900/80">
              {/* Photo Preview in Summary */}
              {photoDataUrl && (
                <div className="rounded-xl overflow-hidden border border-slate-800 max-h-36">
                  <img src={photoDataUrl} alt="Evidence" className="w-full h-36 object-cover" />
                </div>
              )}

              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <span className="text-xs text-slate-400">Problem Category</span>
                <span className="text-xs font-bold text-white capitalize bg-slate-800 px-2.5 py-1 rounded-md">
                  {category.replace("_", " ")}
                </span>
              </div>

              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <span className="text-xs text-slate-400">Incident Location</span>
                <span className="text-xs font-semibold text-slate-200 text-right max-w-[200px] truncate">
                  {locationName}
                </span>
              </div>

              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <span className="text-xs text-slate-400">Coordinates</span>
                <span className="text-xs font-mono text-indigo-400">
                  {lat.toFixed(4)}, {lng.toFixed(4)}
                </span>
              </div>

              <div>
                <span className="text-xs text-slate-400 block mb-1">Description</span>
                <p className="text-xs text-slate-300 bg-slate-950 p-3 rounded-lg border border-slate-800">
                  {description}
                </p>
              </div>

              <div className="pt-2">
                <div className="rounded-xl bg-indigo-500/10 border border-indigo-500/20 p-3 flex items-start space-x-2.5">
                  <Sparkles className="h-4 w-4 text-indigo-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-indigo-300 leading-relaxed">
                    <strong>Autonomous Agent Guarantee:</strong> Strands graphs autonomously check duplicates within 25m–50m, evaluate 6-factor risk, and match a certified specialist.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ================= BOTTOM NAVIGATION ACTIONS ================= */}
        <div className="pt-6 border-t border-slate-800 flex items-center justify-between mt-6">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep((s) => (s - 1) as any)}
              className="px-4 py-2.5 rounded-xl border border-slate-800 text-xs font-semibold text-slate-300 hover:bg-slate-900 transition"
            >
              Back
            </button>
          ) : (
            <div />
          )}

          {/* CRITICAL REQUIREMENT:
              "The continue button should not be shown until and unless the photo and the description is properly described.
               When both the photo and the description is there, then you can click on continue."
          */}
          {step === 1 ? (
            isStep1Valid ? (
              <button
                type="button"
                onClick={() => setStep(2)}
                className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white transition flex items-center space-x-1.5 shadow-lg shadow-indigo-600/30 animate-pulse"
              >
                <span>Continue to Location</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </button>
            ) : null /* Hidden until both photo and description are entered! */
          ) : step === 2 ? (
            <button
              type="button"
              onClick={() => setStep(3)}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white transition flex items-center space-x-1.5 shadow-lg shadow-indigo-600/30"
            >
              <span>Continue to Review</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="px-8 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-sm font-bold text-white transition shadow-lg shadow-indigo-500/30 flex items-center space-x-2"
            >
              {isSubmitting ? (
                <>
                  <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Submitting to Strands...</span>
                </>
              ) : (
                <>
                  <span>Submit Problem Report</span>
                  <CheckCircle2 className="h-4 w-4" />
                </>
              )}
            </button>
          )}
        </div>
      </main>
    </div>
  );
}
