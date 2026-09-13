"use client";

import Link from "next/link";
import { ArrowLeft, Navigation, MapPin, Route, ShieldAlert, Clock, CheckCircle2, ChevronRight } from "lucide-react";
import InteractiveLiveMap from "@/components/InteractiveLiveMap";

export default function WorkerMapPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md px-4 sm:px-6 py-3 sticky top-0 z-40 flex items-center justify-between">
        <Link 
          href="/worker" 
          className="inline-flex items-center text-xs font-semibold text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Field Shift Dashboard
        </Link>
        <div className="flex items-center space-x-2">
          <span className="font-mono text-xs font-bold text-amber-400 uppercase tracking-wider">
            GEOSPATIAL DISPATCH & ROUTE MAP
          </span>
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
        </div>
        <div className="flex items-center space-x-2 text-right">
          <span className="text-[10px] font-mono text-slate-400 bg-slate-800/80 px-2.5 py-1 rounded-full border border-slate-700">
            VAN #4 • AHMED KHAN
          </span>
        </div>
      </header>

      {/* Main Full-Height Interactive Map */}
      <main className="flex-1 relative flex flex-col">
        <InteractiveLiveMap mode="worker" />
      </main>
    </div>
  );
}
