"use client";

import { OperatorNav } from "@/components/OperatorNav";
import { 
  ShieldCheck, 
  ShieldAlert, 
  CheckCircle2, 
  Lock, 
  Bot, 
  AlertOctagon,
  FileText,
  Percent
} from "lucide-react";

export default function TrustCenterPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <OperatorNav />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div>
          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
            GUARDIAN AUDIT & SAFETY ENGINE
          </span>
          <h1 className="text-2xl font-bold text-white mt-1">Autonomous Operations Trust Center</h1>
          <p className="text-xs text-slate-400 mt-1">
            Verifiable metrics on autonomous executions, safety policy blocks, and human-in-the-loop escalations.
          </p>
        </div>

        {/* Top 4 Metrics Counter */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-panel rounded-2xl p-5 border border-slate-800">
            <span className="text-xs text-slate-400 uppercase font-semibold">Total Agent Actions</span>
            <div className="mt-2 flex items-baseline space-x-2">
              <span className="text-3xl font-extrabold text-white">147</span>
              <span className="text-xs text-slate-500">today</span>
            </div>
          </div>

          <div className="glass-panel rounded-2xl p-5 border border-slate-800">
            <span className="text-xs text-slate-400 uppercase font-semibold">Human Approvals</span>
            <div className="mt-2 flex items-baseline space-x-2">
              <span className="text-3xl font-extrabold text-indigo-400">4</span>
              <span className="text-xs text-slate-500">decisions</span>
            </div>
          </div>

          <div className="glass-panel rounded-2xl p-5 border border-rose-500/30 bg-rose-950/10">
            <span className="text-xs text-rose-400 uppercase font-semibold">Guardian Blocks</span>
            <div className="mt-2 flex items-baseline space-x-2">
              <span className="text-3xl font-extrabold text-rose-400">3</span>
              <span className="text-xs text-rose-300/60">safety rules</span>
            </div>
          </div>

          <div className="glass-panel rounded-2xl p-5 border border-emerald-500/30 bg-emerald-950/10">
            <span className="text-xs text-emerald-400 uppercase font-semibold">Autonomous Action Rate</span>
            <div className="mt-2 flex items-baseline space-x-2">
              <span className="text-3xl font-extrabold text-emerald-400">97.2%</span>
              <span className="text-xs text-emerald-300/60">safe autonomy</span>
            </div>
          </div>
        </div>

        {/* Latest Guardian Safety Blocks */}
        <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center">
            <ShieldAlert className="h-4 w-4 mr-2 text-rose-400" />
            Guardian Action Interception Log
          </h3>

          <div className="space-y-3">
            {/* Block 1 */}
            <div className="p-4 rounded-xl border border-rose-500/30 bg-slate-900/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-400 font-mono">MISSION RG-3112</span>
                <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                  ACTION BLOCKED
                </span>
              </div>
              <div className="text-xs text-slate-300">
                <strong className="text-white">Attempted Action:</strong> MissionAgent requested <code className="text-amber-400 bg-slate-950 px-1 py-0.5 rounded">close_mission(RG-3112)</code>
              </div>
              <div className="text-xs text-slate-300">
                <strong className="text-white">Guardian Intercept Reason:</strong> Completion confidence is 67%, below policy threshold (85%). Created operator review decision DEC-BLK-041.
              </div>
            </div>

            {/* Block 2 */}
            <div className="p-4 rounded-xl border border-rose-500/30 bg-slate-900/80 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-rose-400 font-mono">MISSION RG-3011</span>
                <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
                  ACTION BLOCKED
                </span>
              </div>
              <div className="text-xs text-slate-300">
                <strong className="text-white">Attempted Action:</strong> Autonomous dispatch on CRITICAL safety school flood
              </div>
              <div className="text-xs text-slate-300">
                <strong className="text-white">Guardian Intercept Reason:</strong> Policy rule <code className="text-indigo-400 bg-slate-950 px-1 py-0.5 rounded">SAFETY_CRITICAL_CLOSURE_NEVER_AUTO</code> triggered. Paused for human sign-off.
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
