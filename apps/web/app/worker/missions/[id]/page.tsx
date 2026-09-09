"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  MapPin, 
  Navigation, 
  Wrench, 
  FileText, 
  Camera, 
  Clock,
  CheckCircle2,
  AlertTriangle
} from "lucide-react";

export default function WorkerMissionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [started, setStarted] = useState(false);

  const handleStartMission = async () => {
    try {
      await fetch(`http://localhost:8000/api/missions/${id}/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Mock-Role": "field_worker",
        },
      });
    } catch (e) {
      // Offline fallback
    }
    setStarted(true);
    router.push(`/worker/missions/${id}/complete`);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md px-4 py-3 sticky top-0 z-40 flex items-center justify-between">
        <Link href="/worker" className="inline-flex items-center text-xs font-semibold text-slate-400 hover:text-white transition">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Shift
        </Link>
        <span className="font-bold text-xs tracking-wider text-white">MISSION {id}</span>
        <div className="w-10" />
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full p-4 sm:p-6 space-y-5">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 px-2.5 py-0.5 rounded-full border border-rose-500/20">
              🔴 HIGH PRIORITY
            </span>
            <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
              ELECTRICAL DEPT
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-white mt-2">Broken Streetlight</h1>
        </div>

        {/* Location & Navigation Card */}
        <div className="glass-panel rounded-2xl p-4 border border-slate-800 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Target Location</span>
            <h4 className="text-sm font-bold text-white mt-0.5">Gate 2, University Road</h4>
            <span className="text-xs text-indigo-400 mt-0.5 block">1.2 km from current GPS</span>
          </div>
          <button
            type="button"
            onClick={() => alert("Amazon Location Routes: Calculating shortest pedestrian and vehicular path to Gate 2...")}
            className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white transition flex items-center space-x-1.5 shadow"
          >
            <Navigation className="h-3.5 w-3.5" />
            <span>Navigate</span>
          </button>
        </div>

        {/* Problem Brief */}
        <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Citizen Problem Report</h3>
          <p className="text-xs text-slate-200 leading-relaxed bg-slate-900/60 p-3 rounded-xl border border-slate-800/80">
            Streetlight reportedly inactive for three consecutive evenings. Causes pedestrian safety concerns outside gate 2 near bus stop.
          </p>
        </div>

        {/* Evidence Summary */}
        <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-3">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Corroborating Evidence</h3>
          <div className="grid grid-cols-2 gap-3 text-center">
            <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
              <span className="text-lg font-bold text-white block">4</span>
              <span className="text-[10px] text-slate-400 uppercase">Resident Reports</span>
            </div>
            <div className="bg-slate-900/80 p-3 rounded-xl border border-slate-800">
              <span className="text-lg font-bold text-indigo-400 block">3</span>
              <span className="text-[10px] text-slate-400 uppercase">Photos Attached</span>
            </div>
          </div>
        </div>

        {/* Authorized Mission Instructions */}
        <div className="glass-panel rounded-2xl p-5 border border-slate-800 space-y-2">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Required Mission Scope</h3>
          <ul className="text-xs text-slate-300 space-y-2 list-disc list-inside">
            <li>Inspect reported luminaire & check local breaker switch</li>
            <li>Perform authorized maintenance (LED module / wiring repair)</li>
            <li>Submit completion proof photo & technician attestation</li>
          </ul>
        </div>

        {/* Start Mission Button */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleStartMission}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-600 to-indigo-600 hover:from-amber-500 hover:to-indigo-500 text-sm font-bold text-white transition shadow-lg shadow-indigo-500/20 flex items-center justify-center space-x-2"
          >
            <Wrench className="h-4 w-4" />
            <span>Mark Arrived & Begin Repair</span>
          </button>
        </div>
      </main>
    </div>
  );
}
