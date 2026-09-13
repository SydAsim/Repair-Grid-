"use client";

import Link from "next/link";
import { OperatorNav } from "@/components/OperatorNav";
import { 
  CheckCircle2, 
  ArrowRight, 
  ShieldCheck,
  Activity,
  Users
} from "lucide-react";

export default function ChaosSimulatorPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <OperatorNav />

      <main className="flex-1 max-w-3xl mx-auto w-full px-4 sm:px-6 py-16 flex flex-col items-center justify-center text-center space-y-6">
        <div className="h-16 w-16 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center shadow-xl shadow-emerald-950/20">
          <ShieldCheck className="h-8 w-8" />
        </div>

        <div>
          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20 uppercase tracking-wider">
            Live Network Active • Synthetic Simulator Removed
          </span>
          <h1 className="text-3xl font-extrabold text-white mt-3">Autonomous Live Mode</h1>
          <p className="text-sm text-slate-400 mt-2 max-w-lg mx-auto leading-relaxed">
            The synthetic chaos simulator has been deactivated. The RepairGrid network is running on 100% authentic community data: submitted resident reports, real-time technician claims, and live Mission Control telemetry.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 w-full max-w-md pt-4">
          <Link
            href="/operations"
            className="p-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition shadow-lg shadow-indigo-600/20 flex items-center justify-center space-x-2"
          >
            <Activity className="h-4 w-4" />
            <span>Open Mission Control</span>
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <Link
            href="/report"
            className="p-4 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-200 font-semibold text-xs transition flex items-center justify-center space-x-2"
          >
            <Users className="h-4 w-4 text-emerald-400" />
            <span>Submit a Live Report</span>
          </Link>
        </div>
      </main>
    </div>
  );
}
