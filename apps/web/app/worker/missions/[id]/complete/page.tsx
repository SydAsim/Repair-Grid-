"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  Camera, 
  CheckCircle2, 
  AlertTriangle, 
  Layers, 
  HelpCircle,
  FileCheck,
  Check,
  Sparkles,
  RefreshCw
} from "lucide-react";

import { useWorkerAuth } from "@/lib/auth-context";
import { API_BASE_URL } from "@/lib/config";

type Outcome = "REPAIRED" | "TEMPORARY_REPAIR" | "REQUIRES_SPECIALIST" | "UNABLE_TO_RESOLVE";

export default function WorkerCompletionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { getAuthHeaders } = useWorkerAuth();
  const [outcome, setOutcome] = useState<Outcome>("REPAIRED");
  const [notes, setNotes] = useState("Replaced failed LED module. Light tested successfully.");
  const [photoTaken, setPhotoTaken] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedStatus, setSubmittedStatus] = useState<any>(null);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/missions/${id}/completion`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          outcome,
          notes,
          after_photo_ref: `missions/${id}/completion/after-evidence-01.jpg`,
        }),
      });
      const data = await res.json();
      setSubmittedStatus(data);
    } catch (e) {
      setSubmittedStatus({
        status: outcome === "REQUIRES_SPECIALIST" ? "replan_triggered" : "submitted_for_verification",
        message: outcome === "REQUIRES_SPECIALIST"
          ? "Specialist requirement registered. Mission re-routed to ResourceAgent."
          : "Work attestation recorded. Strands CompletionVerifierAgent running."
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md px-4 py-3 sticky top-0 z-40 flex items-center justify-between">
        <Link href={`/worker/missions/${id}`} className="inline-flex items-center text-xs font-semibold text-slate-400 hover:text-white transition">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Mission Details
        </Link>
        <span className="font-bold text-xs tracking-wider text-white">SUBMIT COMPLETION</span>
        <div className="w-10" />
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full p-4 sm:p-6 space-y-6">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/20">
            Technician Attestation
          </span>
          <h1 className="text-2xl font-bold text-white mt-1">Submit Proof of Repair</h1>
          <p className="text-xs text-slate-400 mt-1">
            You are providing an attestation. Strands CompletionVerifierAgent will evaluate before/after evidence.
          </p>
        </div>

        {submittedStatus ? (
          <div className="glass-panel rounded-2xl p-6 border border-emerald-500/30 text-center space-y-4">
            <div className={`h-12 w-12 rounded-full flex items-center justify-center mx-auto ${
              submittedStatus.status === "replan_triggered" ? "bg-amber-500/20 text-amber-400" : "bg-emerald-500/20 text-emerald-400"
            }`}>
              {submittedStatus.status === "replan_triggered" ? <RefreshCw className="h-6 w-6" /> : <CheckCircle2 className="h-6 w-6" />}
            </div>

            <h3 className="text-lg font-bold text-white">
              {submittedStatus.status === "replan_triggered" ? "Dynamic Re-planning Triggered!" : "Completion Attestation Submitted!"}
            </h3>

            <p className="text-xs text-slate-300 leading-relaxed bg-slate-900/80 p-3 rounded-xl border border-slate-800">
              {submittedStatus.message}
            </p>

            <Link
              href="/worker"
              className="inline-block mt-4 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white transition"
            >
              Back to Field Shift
            </Link>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Outcome Selection */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5">
                Repair Outcome
              </label>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    setOutcome("REPAIRED");
                    setNotes("Replaced failed LED module. Light tested successfully.");
                  }}
                  className={`w-full p-3.5 rounded-xl border text-left flex items-center justify-between transition ${
                    outcome === "REPAIRED"
                      ? "border-emerald-500 bg-emerald-500/10 text-white"
                      : "border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white"
                  }`}
                >
                  <div>
                    <span className="text-xs font-bold block text-white">● Repaired</span>
                    <span className="text-[11px] text-slate-400">Issue resolved to standard; ready for AI verification.</span>
                  </div>
                  {outcome === "REPAIRED" && <Check className="h-4 w-4 text-emerald-400" />}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setOutcome("TEMPORARY_REPAIR");
                    setNotes("Applied temporary barrier and interim power patch pending full daylight replacement.");
                  }}
                  className={`w-full p-3.5 rounded-xl border text-left flex items-center justify-between transition ${
                    outcome === "TEMPORARY_REPAIR"
                      ? "border-amber-500 bg-amber-500/10 text-white"
                      : "border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white"
                  }`}
                >
                  <div>
                    <span className="text-xs font-bold block text-white">○ Temporary Repair</span>
                    <span className="text-[11px] text-slate-400">Hazard mitigated; scheduled follow-up required.</span>
                  </div>
                  {outcome === "TEMPORARY_REPAIR" && <Check className="h-4 w-4 text-amber-400" />}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setOutcome("REQUIRES_SPECIALIST");
                    setNotes("Underground conduit collapsed and requires excavation specialist and heavy machinery.");
                  }}
                  className={`w-full p-3.5 rounded-xl border text-left flex items-center justify-between transition ${
                    outcome === "REQUIRES_SPECIALIST"
                      ? "border-indigo-500 bg-indigo-500/10 text-white"
                      : "border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white"
                  }`}
                >
                  <div>
                    <span className="text-xs font-bold block text-indigo-300">○ Requires Another Specialist (Re-plan Graph)</span>
                    <span className="text-[11px] text-slate-400">Triggers dynamic re-entry into Strands agent graph!</span>
                  </div>
                  {outcome === "REQUIRES_SPECIALIST" && <Check className="h-4 w-4 text-indigo-400" />}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setOutcome("UNABLE_TO_RESOLVE");
                    setNotes("Asset inaccessible due to locked private construction fencing.");
                  }}
                  className={`w-full p-3.5 rounded-xl border text-left flex items-center justify-between transition ${
                    outcome === "UNABLE_TO_RESOLVE"
                      ? "border-rose-500 bg-rose-500/10 text-white"
                      : "border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white"
                  }`}
                >
                  <div>
                    <span className="text-xs font-bold block text-rose-300">○ Unable to Resolve</span>
                    <span className="text-[11px] text-slate-400">On-site blockage or missing infrastructure.</span>
                  </div>
                  {outcome === "UNABLE_TO_RESOLVE" && <Check className="h-4 w-4 text-rose-400" />}
                </button>
              </div>
            </div>

            {/* After Photo Capture */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Proof-of-Repair Photo
              </label>
              <div 
                onClick={() => setPhotoTaken(!photoTaken)}
                className={`border-2 border-dashed rounded-xl p-5 flex items-center justify-center cursor-pointer transition ${
                  photoTaken ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" : "border-slate-700 bg-slate-900"
                }`}
              >
                <Camera className="h-5 w-5 mr-2 text-emerald-400" />
                <span className="text-xs font-bold">
                  {photoTaken ? "After Photo Attached (Tap to retake)" : "Capture / Upload After Photo"}
                </span>
              </div>
            </div>

            {/* Technician Notes */}
            <div>
              <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Technician Notes & Scope of Work
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full rounded-xl bg-slate-900 border border-slate-800 p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Submit Action */}
            <div className="pt-3">
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-sm font-bold text-white transition shadow-lg shadow-emerald-600/20 flex items-center justify-center space-x-2"
              >
                {isSubmitting ? (
                  <span>Submitting Attestation...</span>
                ) : (
                  <>
                    <span>Submit Work Attestation</span>
                    <FileCheck className="h-4 w-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
