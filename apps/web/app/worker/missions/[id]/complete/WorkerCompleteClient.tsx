"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  CheckCircle2, 
  FileCheck,
  Check,
  RefreshCw
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ThemeToggle } from "@/components/ThemeToggle";
import { MissionLifecycleStepper } from "@/components/MissionLifecycleStepper";
import { ImageCaptureUpload } from "@/components/ImageCaptureUpload";
import { API_BASE_URL, getApiBaseUrl } from "@/lib/config";

type Outcome = "REPAIRED" | "TEMPORARY_REPAIR" | "REQUIRES_SPECIALIST" | "INACCESSIBLE" | "UNABLE_TO_RESOLVE" | "NO_ISSUE_FOUND";

export default function WorkerCompleteClient({ id }: { id: string }) {
  const router = useRouter();

  const [missionId, setMissionId] = useState<string>(() => {
    if (id && id !== "default") return id;
    if (typeof window !== "undefined") {
      const searchParam = new URLSearchParams(window.location.search).get("id");
      if (searchParam) return searchParam;
      const parts = window.location.pathname.split("/").filter(Boolean);
      const completeIdx = parts.indexOf("complete");
      if (completeIdx > 0) {
        const candidate = parts[completeIdx - 1];
        if (candidate && candidate !== "default" && candidate !== "missions") return candidate;
      }
      const lastPart = parts[parts.length - 1];
      if (lastPart && lastPart !== "default" && lastPart !== "complete" && lastPart !== "missions") return lastPart;
    }
    return id || "default";
  });

  const [outcome, setOutcome] = useState<Outcome>("REPAIRED");
  const [notes, setNotes] = useState("Replaced failed LED module. Light tested successfully.");
  const [afterPhotoUrl, setAfterPhotoUrl] = useState<string | null>(
    "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=800&auto=format&fit=crop&q=80"
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedStatus, setSubmittedStatus] = useState<any>(null);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    const baseUrl = getApiBaseUrl();
    const photoPayload = afterPhotoUrl || "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=800";
    const targetId = missionId && missionId !== "default" ? missionId : (id && id !== "default" ? id : "RG-M-DE042E");
    try {
      const res = await fetch(`${baseUrl}/api/missions/${targetId}/completion`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Mock-Role": "field_worker",
          "X-Mock-User-Id": "worker-electric-001",
        },
        body: JSON.stringify({
          outcome,
          notes,
          after_photo_ref: photoPayload,
        }),
      });
      const data = await res.json();
      setSubmittedStatus({
        status: data.status,
        message: data.status === "VERIFIED"
          ? data.verification?.verificationMode === "AMAZON_BEDROCK"
            ? "Amazon Nova reviewed the repair evidence and the bounded closure policy passed."
            : "The local verification policy passed. This result is explicitly marked as a simulation."
          : "Work evidence was recorded and sent to the quality review queue.",
        verification: data.verification
      });
    } catch (e) {
      setSubmittedStatus({ status: "REVIEW_REQUIRED", message: "The proof could not be verified automatically. It remains available for operator review." });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 flex flex-col selection:bg-zinc-200 dark:selection:bg-zinc-800 transition-colors">
      <header className="border-b border-zinc-200 dark:border-zinc-800/80 bg-white/80 dark:bg-[#09090b]/80 backdrop-blur-xl px-4 sm:px-6 h-14 sticky top-0 z-40 flex items-center justify-between transition-colors">
        <Link 
          href={`/worker/missions/${missionId}`} 
          className="inline-flex items-center text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5 mr-1 text-zinc-400 dark:text-zinc-500" />
          Mission Details
        </Link>
        <span className="font-mono text-xs text-zinc-700 dark:text-zinc-300 font-semibold uppercase">Proof of Repair</span>
        <ThemeToggle />
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full p-4 sm:p-6 space-y-5">
        <div>
          <Badge variant="outline" className="text-[10px] font-mono text-zinc-600 dark:text-zinc-400 border-zinc-300 dark:border-zinc-800">
            Technician Attestation
          </Badge>
          <h1 className="text-xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50 mt-1.5">Submit Proof of Repair</h1>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-1">
            Submit clear completion evidence. Automated checks support the operator; they never replace safety rules.
          </p>
        </div>

        {/* 5-Stage Visual Stepper */}
        <MissionLifecycleStepper currentStage="repaired" interactive={true} />

        {submittedStatus ? (
          <Card className="shadcn-card p-6 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 shadow-sm text-center space-y-4">
            <div className="h-12 w-12 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center mx-auto border border-emerald-500/20">
              <CheckCircle2 className="h-6 w-6" />
            </div>

            <div>
              <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                {submittedStatus.status === "VERIFIED" ? "Evidence review passed" : "Proof submitted for review"}
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 font-mono">
                Mission {missionId} • Status: {submittedStatus.status}
              </p>
            </div>

            {submittedStatus.verification && (
              <div className="text-left bg-zinc-50 dark:bg-zinc-900/60 p-3.5 rounded border border-zinc-200 dark:border-zinc-800 space-y-2 text-xs font-mono">
                <div className="flex justify-between items-center text-emerald-600 dark:text-emerald-400 font-semibold">
                  <span>{submittedStatus.verification.verificationMode === "AMAZON_BEDROCK" ? "Amazon Nova confidence:" : "Local policy confidence:"}</span>
                  <span>{Math.round((submittedStatus.verification.confidence || 0) * 100)}%</span>
                </div>
                <div className="text-zinc-600 dark:text-zinc-300 leading-relaxed text-[11px]">
                  {submittedStatus.verification.explanation || "Evidence is available for operator review."}
                </div>
              </div>
            )}

            <div className="pt-2 flex items-center gap-2">
              <Link href="/worker" className="flex-1">
                <Button size="sm" className="w-full text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white">
                  Back to Field Shift
                </Button>
              </Link>
              <Link href={`/worker/missions/${missionId}`} className="flex-1">
                <Button variant="outline" size="sm" className="w-full text-xs border-zinc-300 dark:border-zinc-800">
                  Mission Audit
                </Button>
              </Link>
            </div>
          </Card>
        ) : (
          <div className="space-y-4">
            {/* Outcome Selection */}
            <div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block mb-2 font-semibold">
                Repair Outcome
              </span>
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    setOutcome("REPAIRED");
                    setNotes("Replaced failed LED module. Light tested successfully.");
                  }}
                  className={`w-full p-3 rounded-lg border text-left flex items-center justify-between transition-all ${
                    outcome === "REPAIRED"
                      ? "border-zinc-900 bg-zinc-100 text-zinc-950 dark:border-zinc-200 dark:bg-zinc-800/80 dark:text-zinc-100 shadow-sm font-semibold"
                      : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:text-zinc-900 dark:border-zinc-800 dark:bg-[#0d0d10] dark:text-zinc-400 dark:hover:border-zinc-700 dark:hover:text-zinc-200"
                  }`}
                >
                  <div>
                    <span className="text-xs font-medium block">● Repaired Standard</span>
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400">Fixed to standard; ready for multimodal AI check.</span>
                  </div>
                  {outcome === "REPAIRED" && <Check className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setOutcome("TEMPORARY_REPAIR");
                    setNotes("Applied temporary barrier and interim power patch pending full replacement.");
                  }}
                  className={`w-full p-3 rounded-lg border text-left flex items-center justify-between transition-all ${
                    outcome === "TEMPORARY_REPAIR"
                      ? "border-zinc-900 bg-zinc-100 text-zinc-950 dark:border-zinc-200 dark:bg-zinc-800/80 dark:text-zinc-100 shadow-sm font-semibold"
                      : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:text-zinc-900 dark:border-zinc-800 dark:bg-[#0d0d10] dark:text-zinc-400 dark:hover:border-zinc-700 dark:hover:text-zinc-200"
                  }`}
                >
                  <div>
                    <span className="text-xs font-medium block">○ Temporary Repair</span>
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400">Hazard mitigated; scheduled follow-up required.</span>
                  </div>
                  {outcome === "TEMPORARY_REPAIR" && <Check className="h-4 w-4 text-amber-500" />}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setOutcome("REQUIRES_SPECIALIST");
                    setNotes("Underground conduit damaged; requires excavation specialist & backhoe.");
                  }}
                  className={`w-full p-3 rounded-lg border text-left flex items-center justify-between transition-all ${
                    outcome === "REQUIRES_SPECIALIST"
                      ? "border-zinc-900 bg-zinc-100 text-zinc-950 dark:border-zinc-200 dark:bg-zinc-800/80 dark:text-zinc-100 shadow-sm font-semibold"
                      : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:text-zinc-900 dark:border-zinc-800 dark:bg-[#0d0d10] dark:text-zinc-400 dark:hover:border-zinc-700 dark:hover:text-zinc-200"
                  }`}
                >
                  <div>
                    <span className="text-xs font-medium block">○ Specialist Re-plan (Graph Re-entry)</span>
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400">Re-enters Strands Graph for new department matching.</span>
                  </div>
                  {outcome === "REQUIRES_SPECIALIST" && <Check className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setOutcome("UNABLE_TO_RESOLVE");
                    setNotes("Asset inaccessible behind locked construction gate.");
                  }}
                  className={`w-full p-3 rounded-lg border text-left flex items-center justify-between transition-all ${
                    outcome === "UNABLE_TO_RESOLVE"
                      ? "border-zinc-900 bg-zinc-100 text-zinc-950 dark:border-zinc-200 dark:bg-zinc-800/80 dark:text-zinc-100 shadow-sm font-semibold"
                      : "border-zinc-200 bg-white text-zinc-600 hover:border-zinc-300 hover:text-zinc-900 dark:border-zinc-800 dark:bg-[#0d0d10] dark:text-zinc-400 dark:hover:border-zinc-700 dark:hover:text-zinc-200"
                  }`}
                >
                  <div>
                    <span className="text-xs font-medium block">○ Unable to Resolve</span>
                    <span className="text-[11px] text-zinc-500 dark:text-zinc-400">Site blockage or missing infrastructure.</span>
                  </div>
                  {outcome === "UNABLE_TO_RESOLVE" && <Check className="h-4 w-4 text-red-500" />}
                </button>
              </div>
            </div>

            {/* After Photo Capture */}
            <div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block mb-2 font-semibold">
                Proof-of-Repair Evidence Photo
              </span>
              <ImageCaptureUpload
                value={afterPhotoUrl}
                onChange={(url) => setAfterPhotoUrl(url)}
                label="Take After-Repair Photo"
                categoryHint="streetlights"
              />
            </div>

            {/* Technician Notes */}
            <div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block mb-2 font-semibold">
                Technician Notes & Scope
              </span>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="text-xs bg-white dark:bg-zinc-900/60 border-zinc-200 dark:border-zinc-800"
              />
            </div>

            {/* Submit Action */}
            <div className="pt-2">
              <Button
                size="lg"
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="w-full h-10 text-xs font-semibold space-x-2"
              >
                {isSubmitting ? (
                  <span>Submitting to Strands...</span>
                ) : (
                  <>
                    <span>Submit Work Attestation</span>
                    <FileCheck className="h-4 w-4" />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
