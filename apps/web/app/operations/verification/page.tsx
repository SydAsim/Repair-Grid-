"use client";

import { useState } from "react";
import { OperatorNav } from "@/components/OperatorNav";
import { 
  CheckCircle2, 
  X, 
  Check, 
  ShieldCheck, 
  Bot, 
  Users, 
  Camera, 
  MapPin,
  Sparkles,
  ArrowRight
} from "lucide-react";

export default function VerificationQueuePage() {
  const [closed, setClosed] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <OperatorNav />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div>
          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
            COMPLETION VERIFICATION QUEUE
          </span>
          <h1 className="text-2xl font-bold text-white mt-1">Proof of Repair Inspection</h1>
          <p className="text-xs text-slate-400 mt-1">
            Combines technician attestation, multimodal Bedrock Nova 2 Lite image analysis, and citizen feedback.
          </p>
        </div>

        {closed ? (
          <div className="glass-panel rounded-2xl p-8 border border-emerald-500/40 text-center space-y-4">
            <div className="h-12 w-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-bold text-white">Mission RG-2841 Successfully Closed!</h2>
            <p className="text-xs text-slate-300 max-w-md mx-auto">
              Autonomous closure sign-off logged in audit history. Community Lighting Health recovered +4 points.
            </p>
            <button
              onClick={() => setClosed(false)}
              className="mt-4 px-6 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200"
            >
              Inspect Another Mission
            </button>
          </div>
        ) : (
          <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <span className="text-xs font-mono text-slate-400">MISSION RG-2841</span>
                <h2 className="text-lg font-bold text-white">Restore Lighting at Gate 2</h2>
                <p className="text-xs text-slate-400 flex items-center mt-0.5">
                  <MapPin className="h-3 w-3 mr-1 text-slate-500" />
                  North Gate 2, University Road
                </p>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
                  AI CONFIDENCE 96%
                </span>
              </div>
            </div>

            {/* Before / After Photo Comparison */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className="text-xs font-semibold text-slate-400 block mb-2">Before Repair (Citizen Evidence)</span>
                <div className="h-48 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center relative overflow-hidden">
                  <div className="text-center p-4">
                    <span className="text-xs font-bold text-rose-400 uppercase bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20">
                      Inactive Luminaire
                    </span>
                    <p className="text-xs text-slate-400 mt-2">Dark streetlight with extinguished LED array</p>
                  </div>
                </div>
              </div>

              <div>
                <span className="text-xs font-semibold text-slate-400 block mb-2">After Repair (Technician Attestation)</span>
                <div className="h-48 rounded-xl bg-slate-900 border border-emerald-500/40 flex items-center justify-center relative overflow-hidden">
                  <div className="text-center p-4">
                    <span className="text-xs font-bold text-emerald-400 uppercase bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                      Illuminated Luminaire
                    </span>
                    <p className="text-xs text-emerald-300 mt-2">Active illumination, driver replacement complete</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Verification Checklist Matrix */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              {/* Technician Proof */}
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Technician Proof</span>
                <div className="text-xs text-slate-300 space-y-1.5">
                  <div className="flex items-center space-x-1.5 text-emerald-400">
                    <Check className="h-3.5 w-3.5" />
                    <span>Ahmed (Assigned Tech)</span>
                  </div>
                  <div className="flex items-center space-x-1.5 text-emerald-400">
                    <Check className="h-3.5 w-3.5" />
                    <span>Scope Completed</span>
                  </div>
                  <div className="flex items-center space-x-1.5 text-emerald-400">
                    <Check className="h-3.5 w-3.5" />
                    <span>Driver Tested Operational</span>
                  </div>
                </div>
              </div>

              {/* AI Verification */}
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-2">
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block">AI Multimodal Verification</span>
                <div className="text-xs text-slate-300 space-y-1.5">
                  <div className="flex items-center space-x-1.5 text-emerald-400">
                    <Check className="h-3.5 w-3.5" />
                    <span>Same Location (GPS Match)</span>
                  </div>
                  <div className="flex items-center space-x-1.5 text-emerald-400">
                    <Check className="h-3.5 w-3.5" />
                    <span>Same Infrastructure Asset</span>
                  </div>
                  <div className="flex items-center space-x-1.5 text-emerald-400">
                    <Check className="h-3.5 w-3.5" />
                    <span>Visible Condition Change</span>
                  </div>
                </div>
              </div>

              {/* Community Confirmation */}
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-2">
                <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block">Community Feedback</span>
                <div className="text-xs text-slate-300 space-y-1.5">
                  <div className="flex items-center space-x-1.5 text-emerald-400">
                    <Check className="h-3.5 w-3.5" />
                    <span>3 Residents Notified</span>
                  </div>
                  <div className="flex items-center space-x-1.5 text-emerald-400">
                    <Check className="h-3.5 w-3.5" />
                    <span>2 Confirmed Fixed 👍</span>
                  </div>
                  <div className="flex items-center space-x-1.5 text-slate-400">
                    <span>○ 1 Pending</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Recommendation Banner */}
            <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-4 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block">
                  CompletionVerifier Recommendation
                </span>
                <h4 className="text-sm font-bold text-white mt-0.5">CLOSE MISSION (HIGH CONFIDENCE)</h4>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  onClick={() => alert("Reopened for supervisor inspection")}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-300 transition"
                >
                  Reject Proof
                </button>
                <button
                  type="button"
                  onClick={() => setClosed(true)}
                  className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white transition flex items-center space-x-1.5 shadow-lg shadow-emerald-600/30"
                >
                  <Check className="h-3.5 w-3.5" />
                  <span>Approve Closure</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
