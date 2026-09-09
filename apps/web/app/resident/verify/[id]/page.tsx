"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  ThumbsUp, 
  ThumbsDown, 
  HelpCircle, 
  CheckCircle2, 
  MapPin, 
  Sparkles 
} from "lucide-react";

export default function ResidentVerifyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [submitted, setSubmitted] = useState<string | null>(null);

  const handleFeedback = async (type: "FIXED" | "STILL_BROKEN" | "UNVERIFIABLE") => {
    try {
      await fetch(`http://localhost:8000/api/reports/${id}/resolution-feedback`, {
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md px-4 py-3 sticky top-0 z-40">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <Link href="/resident" className="inline-flex items-center text-xs font-semibold text-slate-400 hover:text-white transition">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Resident Hub
          </Link>
          <span className="font-bold text-xs tracking-wider text-emerald-400">REPAIR VERIFICATION</span>
          <div className="w-10" />
        </div>
      </header>

      <main className="flex-1 max-w-xl mx-auto w-full p-4 sm:p-6 space-y-6">
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
            Citizen Quality Confirmation
          </span>
          <h1 className="text-2xl font-bold text-white mt-2">Repair Completed</h1>
          <p className="text-xs text-slate-400 flex items-center mt-1">
            <MapPin className="h-3.5 w-3.5 mr-1 text-slate-500" />
            Engineering Lane • Pothole Surface Patch
          </p>
        </div>

        {/* Before & After Photo Comparison */}
        <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {/* Before Photo */}
            <div>
              <span className="text-xs font-semibold text-slate-400 block mb-2">Original Problem</span>
              <div className="h-40 rounded-xl bg-slate-900 border border-slate-800 relative overflow-hidden flex items-center justify-center">
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent z-10" />
                <div className="text-center p-3 z-20">
                  <span className="text-xs font-bold text-rose-400 uppercase tracking-wider bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20">
                    Before
                  </span>
                  <p className="text-[11px] text-slate-300 mt-2">Pothole in roadway surface with exposed aggregate</p>
                </div>
              </div>
            </div>

            {/* After Photo */}
            <div>
              <span className="text-xs font-semibold text-slate-400 block mb-2">Technician Evidence</span>
              <div className="h-40 rounded-xl bg-slate-900 border border-emerald-500/30 relative overflow-hidden flex items-center justify-center">
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 to-transparent z-10" />
                <div className="text-center p-3 z-20">
                  <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                    After
                  </span>
                  <p className="text-[11px] text-emerald-300 mt-2">Cold asphalt compacted, seam sealed & tested</p>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <p className="text-xs text-slate-300 bg-slate-900/60 p-3 rounded-xl border border-slate-800">
              <strong className="text-white">Technician Notes:</strong> "Excavated loose debris, filled with high-grade cold asphalt mix, vibratory compacted, and sealed edges. No traffic impediment."
            </p>
          </div>
        </div>

        {/* Verification Action Buttons */}
        {submitted ? (
          <div className="glass-panel rounded-2xl p-6 border border-emerald-500/40 text-center space-y-3">
            <div className="h-12 w-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-bold text-white">Thank You for Your Feedback!</h3>
            <p className="text-xs text-slate-300">
              {submitted === "FIXED" 
                ? "Your confirmation has been logged. Community Road Health has improved!"
                : "Your response was flagged to the Operations Center for on-site re-inspection."}
            </p>
            <Link
              href="/resident"
              className="inline-block mt-4 px-6 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white transition"
            >
              Back to Resident Hub
            </Link>
          </div>
        ) : (
          <div className="glass-panel rounded-2xl p-5 border border-slate-800 text-center space-y-4">
            <h3 className="text-sm font-bold text-white">Has this problem actually been fixed?</h3>
            <p className="text-xs text-slate-400">
              Your feedback is the final validation authority that closes community missions.
            </p>

            <div className="grid grid-cols-3 gap-3 pt-2">
              <button
                type="button"
                onClick={() => handleFeedback("FIXED")}
                className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 transition flex flex-col items-center"
              >
                <ThumbsUp className="h-5 w-5 mb-1.5" />
                <span className="text-xs font-bold">Yes, Fixed</span>
              </button>

              <button
                type="button"
                onClick={() => handleFeedback("STILL_BROKEN")}
                className="p-3.5 rounded-xl border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 transition flex flex-col items-center"
              >
                <ThumbsDown className="h-5 w-5 mb-1.5" />
                <span className="text-xs font-bold">Still Broken</span>
              </button>

              <button
                type="button"
                onClick={() => handleFeedback("UNVERIFIABLE")}
                className="p-3.5 rounded-xl border border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition flex flex-col items-center"
              >
                <HelpCircle className="h-5 w-5 mb-1.5" />
                <span className="text-xs font-bold">Can't Verify</span>
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
