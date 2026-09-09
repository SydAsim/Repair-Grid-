"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Camera, 
  MapPin, 
  CheckCircle2, 
  ArrowLeft, 
  ArrowRight, 
  Mic, 
  Sparkles,
  Lightbulb,
  Droplets,
  AlertTriangle,
  UploadCloud,
  Check
} from "lucide-react";

type Category = "streetlights" | "potholes" | "blocked_drains";

export default function ReportPage() {
  const router = useRouter();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [category, setCategory] = useState<Category>("streetlights");
  const [description, setDescription] = useState("");
  const [photoUploaded, setPhotoUploaded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Default coordinates (Campus District Gate 2)
  const [lat] = useState(37.7751);
  const [lng] = useState(-122.4190);
  const [locationName] = useState("Gate 2, University Road");

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch("http://localhost:8000/api/reports", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Mock-Role": "resident",
          "X-Mock-User-Id": "resident-asim-001",
        },
        body: JSON.stringify({
          category,
          description: description || `Reported ${category.replace("_", " ")} requiring municipal/campus maintenance.`,
          lat,
          lng,
          image_url: photoUploaded ? `reports/RG-R-NEW/before/photo.jpg` : null,
        }),
      });
      const data = await res.json();
      router.push(`/resident/reports/${data.report_id || "RG-R-101"}`);
    } catch (e) {
      // Fallback redirect for offline demo preview
      router.push(`/resident/reports/RG-R-101`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/70 backdrop-blur-md px-4 py-3 flex items-center justify-between sticky top-0 z-40">
        <Link href="/" className="inline-flex items-center text-xs font-semibold text-slate-400 hover:text-white transition">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Cancel
        </Link>
        <span className="font-bold text-sm tracking-tight text-white">REPAIRGRID REPORT</span>
        <div className="flex items-center space-x-1.5 text-xs font-medium text-indigo-400">
          <span>Step {step} of 3</span>
        </div>
      </header>

      {/* Progress Bar */}
      <div className="w-full bg-slate-900 h-1">
        <div 
          className="bg-indigo-500 h-1 transition-all duration-300"
          style={{ width: `${(step / 3) * 100}%` }}
        />
      </div>

      <main className="flex-1 max-w-lg mx-auto w-full p-4 sm:p-6 flex flex-col justify-between">
        {/* Step 1: Capture */}
        {step === 1 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">What's broken?</h1>
              <p className="text-sm text-slate-400">Show or describe the issue in the Campus District.</p>
            </div>

            {/* Photo Capture Area */}
            <div 
              onClick={() => setPhotoUploaded(!photoUploaded)}
              className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center cursor-pointer transition ${
                photoUploaded 
                  ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300" 
                  : "border-slate-700 bg-slate-900/50 hover:bg-slate-900 text-slate-400"
              }`}
            >
              {photoUploaded ? (
                <>
                  <div className="h-12 w-12 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400 mb-3">
                    <Check className="h-6 w-6" />
                  </div>
                  <span className="text-sm font-semibold text-white">Photo Captured</span>
                  <span className="text-xs text-emerald-400 mt-1">Tap to change image</span>
                </>
              ) : (
                <>
                  <div className="h-12 w-12 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-3">
                    <Camera className="h-6 w-6" />
                  </div>
                  <span className="text-sm font-semibold text-white">Tap to Take or Upload Photo</span>
                  <span className="text-xs text-slate-500 mt-1">Supports camera & image gallery</span>
                </>
              )}
            </div>

            {/* Category Pills (MVP 3 Categories) */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2.5">
                Issue Category (Hackathon MVP)
              </label>
              <div className="grid grid-cols-3 gap-2.5">
                <button
                  type="button"
                  onClick={() => setCategory("streetlights")}
                  className={`p-3 rounded-xl border flex flex-col items-center text-center transition ${
                    category === "streetlights"
                      ? "border-indigo-500 bg-indigo-500/20 text-white font-semibold"
                      : "border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white"
                  }`}
                >
                  <Lightbulb className="h-5 w-5 mb-1.5 text-amber-400" />
                  <span className="text-xs">Streetlight</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCategory("potholes")}
                  className={`p-3 rounded-xl border flex flex-col items-center text-center transition ${
                    category === "potholes"
                      ? "border-indigo-500 bg-indigo-500/20 text-white font-semibold"
                      : "border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white"
                  }`}
                >
                  <AlertTriangle className="h-5 w-5 mb-1.5 text-orange-400" />
                  <span className="text-xs">Pothole</span>
                </button>

                <button
                  type="button"
                  onClick={() => setCategory("blocked_drains")}
                  className={`p-3 rounded-xl border flex flex-col items-center text-center transition ${
                    category === "blocked_drains"
                      ? "border-indigo-500 bg-indigo-500/20 text-white font-semibold"
                      : "border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white"
                  }`}
                >
                  <Droplets className="h-5 w-5 mb-1.5 text-cyan-400" />
                  <span className="text-xs">Blocked Drain</span>
                </button>
              </div>
            </div>

            {/* Text & Voice Note */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                  Description
                </label>
                <button 
                  type="button" 
                  onClick={() => setDescription("Streetlight outside Gate 2 has not worked for three evenings.")}
                  className="text-xs text-indigo-400 hover:underline flex items-center space-x-1"
                >
                  <Sparkles className="h-3 w-3" />
                  <span>Insert sample</span>
                </button>
              </div>
              <div className="relative">
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what you see (e.g. Streetlight pole inactive outside gate 2)..."
                  rows={3}
                  className="w-full rounded-xl bg-slate-900 border border-slate-800 p-3.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => setDescription("Streetlight outside Gate 2 has not worked for three evenings.")}
                  className="absolute right-3 bottom-3 p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300"
                  title="Voice input simulation"
                >
                  <Mic className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Location */}
        {step === 2 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">Confirm Location</h1>
              <p className="text-sm text-slate-400">Amazon Location Service reversed geocode detected.</p>
            </div>

            <div className="glass-panel rounded-2xl p-5 border border-indigo-500/30">
              <div className="flex items-start space-x-3.5">
                <div className="h-10 w-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 flex-shrink-0">
                  <MapPin className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-base">{locationName}</h4>
                  <p className="text-xs text-slate-400 mt-0.5">RepairGrid Campus District • Zone North</p>
                  <div className="mt-3 flex items-center space-x-2">
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <Check className="h-3 w-3 mr-1" />
                      94% Location Confidence
                    </span>
                  </div>
                </div>
              </div>

              {/* Simulated Mini Map Preview */}
              <div className="mt-4 h-36 rounded-xl bg-slate-900 border border-slate-800 relative flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:16px_16px] opacity-40" />
                <div className="relative z-10 flex flex-col items-center">
                  <div className="h-4 w-4 rounded-full bg-indigo-500 ring-4 ring-indigo-500/30 animate-pulse" />
                  <span className="mt-2 text-xs font-medium text-slate-300 bg-slate-950/80 px-2 py-0.5 rounded-md border border-slate-800">
                    Lat {lat.toFixed(4)}, Lng {lng.toFixed(4)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Review */}
        {step === 3 && (
          <div className="space-y-6">
            <div>
              <h1 className="text-2xl font-bold text-white mb-1">Review & Submit</h1>
              <p className="text-sm text-slate-400">The Strands autonomous agent system will handle the rest.</p>
            </div>

            <div className="glass-panel rounded-2xl p-5 space-y-4 border border-slate-800">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <span className="text-xs text-slate-400">Problem Category</span>
                <span className="text-xs font-bold text-white capitalize bg-slate-800 px-2.5 py-1 rounded-md">
                  {category.replace("_", " ")}
                </span>
              </div>

              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <span className="text-xs text-slate-400">Location</span>
                <span className="text-xs font-medium text-slate-200">{locationName}</span>
              </div>

              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <span className="text-xs text-slate-400">Evidence Photo</span>
                <span className="text-xs font-semibold text-emerald-400">
                  {photoUploaded ? "Attached ✓" : "Default Campus Asset ✓"}
                </span>
              </div>

              <div>
                <span className="text-xs text-slate-400 block mb-1">Description</span>
                <p className="text-xs text-slate-300 bg-slate-900 p-2.5 rounded-lg border border-slate-800">
                  {description || "Streetlight outside Gate 2 has not worked for three evenings."}
                </p>
              </div>

              <div className="pt-2">
                <div className="rounded-xl bg-indigo-500/10 border border-indigo-500/20 p-3.5 flex items-start space-x-2.5">
                  <Sparkles className="h-4 w-4 text-indigo-400 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-indigo-300 leading-relaxed">
                    <strong>Don't know which department handles this?</strong><br />
                    That's our job. Strands agents will autonomously verify, deduplicate, route to the right department, and dispatch a qualified technician.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Bottom Actions */}
        <div className="pt-6 border-t border-slate-800 flex items-center justify-between">
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

          {step < 3 ? (
            <button
              type="button"
              onClick={() => setStep((s) => (s + 1) as any)}
              className="px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition flex items-center space-x-1.5 shadow-lg shadow-indigo-600/20"
            >
              <span>Continue</span>
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
                <span>Submitting to Strands...</span>
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
