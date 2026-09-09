"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  ArrowLeft, 
  Wrench, 
  MapPin, 
  Navigation, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Zap,
  Route,
  UserCheck
} from "lucide-react";

export default function WorkerHomePage() {
  const [isAvailable, setIsAvailable] = useState(true);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md px-4 py-3 sticky top-0 z-40 flex items-center justify-between">
        <Link href="/" className="inline-flex items-center text-xs font-semibold text-slate-400 hover:text-white transition">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Home
        </Link>
        <span className="font-bold text-xs tracking-wider text-amber-400">FIELD OPERATIONS</span>
        <Link href="/worker/map" className="text-xs font-semibold text-indigo-400 flex items-center">
          <Route className="h-3.5 w-3.5 mr-1" />
          Route
        </Link>
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full p-4 sm:p-6 space-y-6">
        {/* Worker Profile Card */}
        <div className="glass-panel rounded-2xl p-5 border border-amber-500/20 bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3.5">
              <div className="h-12 w-12 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center font-bold text-lg">
                AK
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">Ahmed Khan</h1>
                <p className="text-xs text-slate-400">Electrical Specialist • North Campus</p>
              </div>
            </div>

            <button
              onClick={() => setIsAvailable(!isAvailable)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition flex items-center space-x-1.5 border ${
                isAvailable
                  ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/30"
                  : "bg-slate-800 text-slate-400 border-slate-700"
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${isAvailable ? "bg-emerald-400 animate-pulse" : "bg-slate-500"}`} />
              <span>{isAvailable ? "AVAILABLE" : "OFF SHIFT"}</span>
            </button>
          </div>

          {/* Today's Route Metric Pill */}
          <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-slate-800 text-center">
            <div className="bg-slate-950/60 rounded-xl p-2.5 border border-slate-800/60">
              <span className="text-[10px] text-slate-400 block uppercase">Missions</span>
              <span className="text-sm font-extrabold text-white">3 Active</span>
            </div>
            <div className="bg-slate-950/60 rounded-xl p-2.5 border border-slate-800/60">
              <span className="text-[10px] text-slate-400 block uppercase">Route</span>
              <span className="text-sm font-extrabold text-indigo-400">7.4 km</span>
            </div>
            <div className="bg-slate-950/60 rounded-xl p-2.5 border border-slate-800/60">
              <span className="text-[10px] text-slate-400 block uppercase">Est. Time</span>
              <span className="text-sm font-extrabold text-emerald-400">~2h 10m</span>
            </div>
          </div>
        </div>

        {/* Priority Next Mission Hero Card */}
        <div>
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Next Dispatched Mission</h2>
            <span className="text-[11px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full border border-rose-500/20">
              🔴 HIGH PRIORITY
            </span>
          </div>

          <div className="glass-panel rounded-2xl p-5 border border-indigo-500/40 space-y-4 bg-slate-900/90 shadow-xl shadow-indigo-950/20">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold text-slate-400">MISSION RG-2841</span>
                <h3 className="text-lg font-bold text-white mt-0.5">Broken Streetlight</h3>
                <p className="text-xs text-slate-400 flex items-center mt-1">
                  <MapPin className="h-3.5 w-3.5 mr-1 text-slate-500" />
                  University Gate 2 • 1.2 km away
                </p>
              </div>
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center flex-shrink-0">
                <Zap className="h-5 w-5" />
              </div>
            </div>

            <p className="text-xs text-slate-300 bg-slate-950/80 p-3 rounded-xl border border-slate-800 leading-relaxed">
              Streetlight inactive for 3 nights. Inspect LED driver & junction circuit. Dispatched by Strands ResourceAgent (96% fit match).
            </p>

            <div className="pt-2 flex items-center space-x-3">
              <Link
                href="/worker/missions/RG-2841"
                className="flex-1 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white text-center transition shadow-lg shadow-indigo-600/30 flex items-center justify-center space-x-2"
              >
                <Navigation className="h-4 w-4" />
                <span>Start Mission</span>
              </Link>
              <Link
                href="/worker/missions/RG-2841/complete"
                className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 text-center transition"
              >
                Submit Proof
              </Link>
            </div>
          </div>
        </div>

        {/* Remaining Today's Queue */}
        <div>
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">Later Today</h2>
          <div className="space-y-2.5">
            <div className="glass-panel rounded-xl p-3.5 flex items-center justify-between border border-slate-800">
              <div>
                <span className="text-[10px] text-slate-500 font-mono">RG-2953</span>
                <h4 className="text-xs font-bold text-white">Library Quad Post 4 Lamp</h4>
                <p className="text-[11px] text-slate-400">2.1 km • Medium Priority</p>
              </div>
              <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-1 rounded-md">Queued</span>
            </div>

            <div className="glass-panel rounded-xl p-3.5 flex items-center justify-between border border-slate-800">
              <div>
                <span className="text-[10px] text-slate-500 font-mono">RG-2970</span>
                <h4 className="text-xs font-bold text-white">Science Block Walkway Lantern</h4>
                <p className="text-[11px] text-slate-400">4.1 km • Routine</p>
              </div>
              <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-1 rounded-md">Queued</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
