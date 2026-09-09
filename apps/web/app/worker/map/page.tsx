"use client";

import Link from "next/link";
import { ArrowLeft, MapPin, Navigation, Route, Clock, CheckCircle2 } from "lucide-react";

export default function WorkerMapPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md px-4 py-3 sticky top-0 z-40 flex items-center justify-between">
        <Link href="/worker" className="inline-flex items-center text-xs font-semibold text-slate-400 hover:text-white transition">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Field Shift
        </Link>
        <span className="font-bold text-xs tracking-wider text-white">TODAY'S OPTIMIZED ROUTE</span>
        <div className="w-12" />
      </header>

      <div className="p-4 bg-slate-900/50 border-b border-slate-800 flex items-center justify-between">
        <div>
          <span className="text-xs text-slate-400">Route Overview</span>
          <h2 className="text-sm font-bold text-white">3 Missions • 7.4 km Total</h2>
        </div>
        <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/20">
          ~2h 10m Estimated
        </span>
      </div>

      <div className="flex-1 relative bg-slate-900 flex items-center justify-center min-h-[400px]">
        <div className="absolute inset-0 bg-[radial-gradient(#334155_1.5px,transparent_1.5px)] [background-size:24px_24px] opacity-40" />

        {/* Route Graph Graphic */}
        <div className="relative z-10 w-full max-w-md p-6 space-y-6">
          {/* Stop 1 */}
          <div className="glass-panel rounded-2xl p-4 border border-rose-500/40 bg-slate-900/90 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 rounded-full bg-rose-500 text-white font-bold text-xs flex items-center justify-center ring-4 ring-rose-500/20">
                1
              </div>
              <div>
                <span className="text-[10px] font-bold text-rose-400">STOP 1 • 1.2 KM</span>
                <h4 className="text-sm font-bold text-white">RG-2841: Broken Streetlight</h4>
                <p className="text-[11px] text-slate-400">North Gate 2, University Road</p>
              </div>
            </div>
            <Link
              href="/worker/missions/RG-2841"
              className="px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white"
            >
              Start
            </Link>
          </div>

          {/* Stop 2 */}
          <div className="glass-panel rounded-2xl p-4 border border-slate-800 bg-slate-900/70 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 rounded-full bg-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center">
                2
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400">STOP 2 • 2.1 KM</span>
                <h4 className="text-sm font-bold text-white">RG-2953: Library Quad Post</h4>
                <p className="text-[11px] text-slate-400">South Walkway Lamp</p>
              </div>
            </div>
            <span className="text-xs text-slate-500 font-medium">Queued</span>
          </div>

          {/* Stop 3 */}
          <div className="glass-panel rounded-2xl p-4 border border-slate-800 bg-slate-900/70 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="h-8 w-8 rounded-full bg-slate-700 text-slate-300 font-bold text-xs flex items-center justify-center">
                3
              </div>
              <div>
                <span className="text-[10px] font-bold text-slate-400">STOP 3 • 4.1 KM</span>
                <h4 className="text-sm font-bold text-white">RG-2970: Science Block Lantern</h4>
                <p className="text-[11px] text-slate-400">East Walkway</p>
              </div>
            </div>
            <span className="text-xs text-slate-500 font-medium">Queued</span>
          </div>
        </div>

        <div className="absolute bottom-4 left-4 z-20 text-[10px] text-slate-400 bg-slate-950/80 px-3 py-1.5 rounded-lg border border-slate-800 backdrop-blur">
          Amazon Location Routes • Esri Route Optimization Matrix
        </div>
      </div>
    </div>
  );
}
