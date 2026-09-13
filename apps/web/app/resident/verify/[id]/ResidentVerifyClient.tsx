"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  ThumbsUp, 
  ThumbsDown, 
  HelpCircle, 
  CheckCircle2, 
  MapPin
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ThemeToggle";
import { MissionLifecycleStepper } from "@/components/MissionLifecycleStepper";
import { API_BASE_URL, getApiBaseUrl } from "@/lib/config";

export default function ResidentVerifyClient({ id }: { id: string }) {
  const router = useRouter();

  const [reportId, setReportId] = useState<string>(() => {
    if (id && id !== "default") return id;
    if (typeof window !== "undefined") {
      const searchParam = new URLSearchParams(window.location.search).get("id");
      if (searchParam) return searchParam;
      const parts = window.location.pathname.split("/").filter(Boolean);
      const lastPart = parts[parts.length - 1];
      if (lastPart && lastPart !== "default" && lastPart !== "verify") return lastPart;
    }
    return id || "default";
  });

  const [submitted, setSubmitted] = useState<string | null>(null);

  const handleFeedback = async (type: "FIXED" | "STILL_BROKEN" | "UNVERIFIABLE") => {
    const baseUrl = getApiBaseUrl();
    const targetId = reportId && reportId !== "default" ? reportId : (id && id !== "default" ? id : "RG-R-101");
    try {
      await fetch(`${baseUrl}/api/reports/${targetId}/resolution-feedback`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Mock-Role": "resident",
        },
        body: JSON.stringify({ feedback: type }),
      });
    } catch (e) {
      // Offline fallback
    }
    setSubmitted(type);
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 flex flex-col selection:bg-zinc-200 dark:selection:bg-zinc-800 transition-colors">
      <header className="border-b border-zinc-200 dark:border-zinc-800/80 bg-white/80 dark:bg-[#09090b]/80 backdrop-blur-xl px-4 sm:px-6 h-14 sticky top-0 z-40 flex items-center justify-between transition-colors">
        <Link 
          href="/resident" 
          className="inline-flex items-center text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5 mr-1 text-zinc-400 dark:text-zinc-500" />
          Resident Hub
        </Link>
        <span className="font-semibold text-xs tracking-wider text-emerald-600 dark:text-emerald-400 uppercase">
          Quality Verification
        </span>
        <ThemeToggle />
      </header>

      <main className="flex-1 max-w-xl mx-auto w-full p-4 sm:p-6 space-y-5">
        <div>
          <Badge variant="success" className="text-[10px] font-mono">
            Citizen Quality Confirmation
          </Badge>
          <h1 className="text-xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50 mt-1.5">Repair Completed</h1>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 flex items-center mt-1">
            <MapPin className="h-3 w-3 mr-1 text-zinc-500" />
            Engineering Lane • Pothole Surface Patch
          </p>
        </div>

        {/* 5-Stage Visual Stepper */}
        <MissionLifecycleStepper currentStage="verified" interactive={true} />

        {/* Before & After Photo Comparison */}
        <Card className="shadcn-card p-5 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 shadow-sm space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {/* Before Photo */}
            <div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block mb-2 font-semibold">
                Original Problem (Reported)
              </span>
              <div className="h-40 rounded-lg bg-zinc-100 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 relative overflow-hidden group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600&auto=format&fit=crop&q=80"
                  alt="Original pothole"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20 pointer-events-none" />
                <Badge variant="destructive" className="absolute top-2 left-2 font-mono text-[10px] shadow-sm">
                  BEFORE
                </Badge>
                <span className="absolute bottom-2 left-2 text-[10px] text-white font-medium bg-black/60 px-1.5 py-0.5 rounded backdrop-blur-sm">
                  Exposed cavity & asphalt debris
                </span>
              </div>
            </div>

            {/* After Photo */}
            <div>
              <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 block mb-2 font-semibold">
                Technician Evidence (Repaired)
              </span>
              <div className="h-40 rounded-lg bg-emerald-50/50 dark:bg-zinc-950 border border-emerald-500/40 dark:border-emerald-500/30 relative overflow-hidden group">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="https://images.unsplash.com/photo-1578961952400-58fe8646b9d8?w=600&auto=format&fit=crop&q=80"
                  alt="Compacted repair patch"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-transparent to-black/20 pointer-events-none" />
                <Badge variant="success" className="absolute top-2 left-2 font-mono text-[10px] shadow-sm">
                  AFTER
                </Badge>
                <span className="absolute bottom-2 left-2 text-[10px] text-white font-medium bg-black/60 px-1.5 py-0.5 rounded backdrop-blur-sm">
                  Compacted & sealed roadway
                </span>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <div className="text-xs text-zinc-700 dark:text-zinc-300 bg-zinc-50 dark:bg-zinc-900/40 p-3 rounded border border-zinc-200 dark:border-zinc-800/80 leading-relaxed">
              <strong className="text-zinc-900 dark:text-zinc-200 font-semibold">Technician Notes:</strong> "Excavated loose debris, filled with cold asphalt mix, vibratory compacted, and sealed edges. Road tested safe."
            </div>
          </div>
        </Card>

        {/* Verification Action Buttons */}
        {submitted ? (
          <Card className="shadcn-card p-6 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 shadow-sm text-center space-y-3">
            <div className="h-10 w-10 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/20">
              <CheckCircle2 className="h-5 w-5" />
            </div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100">Thank You for Your Feedback!</h3>
            <p className="text-xs text-zinc-600 dark:text-zinc-400 max-w-sm mx-auto">
              {submitted === "FIXED" 
                ? "Your confirmation has been logged. Community Road Health metric has improved!"
                : "Your feedback was routed to Operations for on-site re-inspection."}
            </p>
            <div className="pt-2">
              <Link href="/resident">
                <Button size="sm" className="text-xs font-semibold">
                  Back to Resident Hub
                </Button>
              </Link>
            </div>
          </Card>
        ) : (
          <Card className="shadcn-card p-5 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 shadow-sm text-center space-y-4">
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">Has this problem actually been fixed?</h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
                Your feedback provides citizen verification that closes community missions.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2.5 pt-1">
              <button
                type="button"
                onClick={() => handleFeedback("FIXED")}
                className="p-3 rounded-lg border border-emerald-500/40 bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-500/5 dark:hover:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 transition flex flex-col items-center font-medium shadow-sm"
              >
                <ThumbsUp className="h-4 w-4 mb-1.5" />
                <span className="text-xs">Yes, Fixed</span>
              </button>

              <button
                type="button"
                onClick={() => handleFeedback("STILL_BROKEN")}
                className="p-3 rounded-lg border border-red-500/40 bg-red-50 hover:bg-red-100 dark:bg-red-500/5 dark:hover:bg-red-500/10 text-red-800 dark:text-red-300 transition flex flex-col items-center font-medium shadow-sm"
              >
                <ThumbsDown className="h-4 w-4 mb-1.5" />
                <span className="text-xs">Still Broken</span>
              </button>

              <button
                type="button"
                onClick={() => handleFeedback("UNVERIFIABLE")}
                className="p-3 rounded-lg border border-zinc-300 dark:border-zinc-800 bg-zinc-50 hover:bg-zinc-100 dark:bg-[#0d0d10] dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-200 transition flex flex-col items-center font-medium shadow-sm"
              >
                <HelpCircle className="h-4 w-4 mb-1.5" />
                <span className="text-xs">Can't Check</span>
              </button>
            </div>
          </Card>
        )}
      </main>
    </div>
  );
}
