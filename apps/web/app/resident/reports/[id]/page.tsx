"use client";

import { use } from "react";
import Link from "next/link";
import { 
  ArrowLeft, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  ShieldCheck, 
  Bot, 
  Wrench,
  Camera,
  Info
} from "lucide-react";

export default function ReportTrackingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md px-4 py-3 sticky top-0 z-40">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <Link href="/resident" className="inline-flex items-center text-xs font-semibold text-slate-400 hover:text-white transition">
            <ArrowLeft className="h-4 w-4 mr-1" />
            My Reports
          </Link>
          <span className="font-bold text-xs tracking-wider text-slate-400">{id}</span>
          <div className="w-10" />
        </div>
      </header>

      <main className="flex-1 max-w-xl mx-auto w-full p-4 sm:p-6 space-y-6">
        {/* Title & Location */}
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/20">
            Lighting Infrastructure
          </span>
          <h1 className="text-2xl font-bold text-white mt-2">Broken Streetlight</h1>
          <p className="text-xs text-slate-400 flex items-center mt-1">
            <MapPin className="h-3.5 w-3.5 mr-1 text-slate-500" />
            North Gate 2, University Road
          </p>
        </div>

        {/* Current Autonomous Agent Status Banner */}
        <div className="glass-panel rounded-2xl p-4 border border-indigo-500/30 bg-slate-900/80">
          <div className="flex items-start space-x-3">
            <div className="h-8 w-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Bot className="h-4 w-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">Current Autonomous Status</h4>
              <p className="text-sm font-medium text-slate-200 mt-1">
                Technician completed repair. RepairGrid CompletionVerifierAgent is analyzing evidence.
              </p>
              <span className="text-xs text-indigo-300/80 mt-1 block">
                No resident action required at this moment.
              </span>
            </div>
          </div>
        </div>

        {/* Vertical Timeline */}
        <div className="glass-panel rounded-2xl p-6 border border-slate-800">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-6">Mission Progress Timeline</h3>
          
          <div className="space-y-6 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-slate-800">
            {/* Step 1 */}
            <div className="relative flex items-start space-x-4">
              <div className="h-7 w-7 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center flex-shrink-0 z-10 font-bold text-xs">
                ✓
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">Report Submitted & Geolocated</h4>
                <p className="text-xs text-slate-400 mt-0.5">Citizen photo and location confirmed via Amazon Location.</p>
                <span className="text-[10px] text-slate-500 mt-1 block">Yesterday, 18:24</span>
              </div>
            </div>

            {/* Step 2 */}
            <div className="relative flex items-start space-x-4">
              <div className="h-7 w-7 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center flex-shrink-0 z-10 font-bold text-xs">
                ✓
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">Autonomous Duplicate & Risk Check</h4>
                <p className="text-xs text-slate-400 mt-0.5">DuplicateAgent checked 25m radius; Risk score calculated at 85.</p>
                <span className="text-[10px] text-slate-500 mt-1 block">Yesterday, 18:25</span>
              </div>
            </div>

            {/* Step 3 */}
            <div className="relative flex items-start space-x-4">
              <div className="h-7 w-7 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center flex-shrink-0 z-10 font-bold text-xs">
                ✓
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">Technician Dispatched</h4>
                <p className="text-xs text-slate-400 mt-0.5">ResourceAgent matched Ahmed (Electrical Specialist, 96% fit).</p>
                <span className="text-[10px] text-slate-500 mt-1 block">Today, 08:15</span>
              </div>
            </div>

            {/* Step 4 */}
            <div className="relative flex items-start space-x-4">
              <div className="h-7 w-7 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center flex-shrink-0 z-10 font-bold text-xs">
                ✓
              </div>
              <div>
                <h4 className="text-sm font-semibold text-white">Technician Arrived On-Site</h4>
                <p className="text-xs text-slate-400 mt-0.5">Arrival verified in North Gate campus zone.</p>
                <span className="text-[10px] text-slate-500 mt-1 block">Today, 09:30</span>
              </div>
            </div>

            {/* Step 5 */}
            <div className="relative flex items-start space-x-4">
              <div className="h-7 w-7 rounded-full bg-indigo-500 text-white flex items-center justify-center flex-shrink-0 z-10 animate-pulse font-bold text-xs">
                ●
              </div>
              <div>
                <h4 className="text-sm font-semibold text-indigo-300">Repair Proof Submitted</h4>
                <p className="text-xs text-slate-400 mt-0.5">Technician uploaded completion attestation and after-photo.</p>
                <span className="text-[10px] text-indigo-400 mt-1 block">Today, 10:45 (Verifying now)</span>
              </div>
            </div>

            {/* Step 6 */}
            <div className="relative flex items-start space-x-4 opacity-50">
              <div className="h-7 w-7 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center flex-shrink-0 z-10 font-bold text-xs text-slate-500">
                ○
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-300">Resident & Operator Verification</h4>
                <p className="text-xs text-slate-500 mt-0.5">Guardian policy review and resident confirmation.</p>
              </div>
            </div>

            {/* Step 7 */}
            <div className="relative flex items-start space-x-4 opacity-40">
              <div className="h-7 w-7 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center flex-shrink-0 z-10 font-bold text-xs text-slate-500">
                ○
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-400">Mission Closure & Health Delta</h4>
                <p className="text-xs text-slate-500 mt-0.5">Community Lighting Health updated.</p>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
