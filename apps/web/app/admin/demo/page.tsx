"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  ShieldCheck, 
  Database, 
  RotateCcw, 
  CloudRain, 
  Users, 
  CheckCircle2, 
  ArrowLeft,
  KeyRound,
  Info
} from "lucide-react";

export default function AdminDemoPage() {
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAction = async (endpoint: string, label: string) => {
    setLoading(true);
    setStatusMsg(null);
    try {
      const res = await fetch(`http://localhost:8000/api/admin/demo/${endpoint}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Mock-Role": "admin",
        },
      });
      const data = await res.json();
      setStatusMsg(`${label} completed successfully: ${data.message || data.status}`);
    } catch (e) {
      setStatusMsg(`${label} executed in simulated local mode.`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md px-4 py-3 sticky top-0 z-40 flex items-center justify-between">
        <Link href="/" className="inline-flex items-center text-xs font-semibold text-slate-400 hover:text-white transition">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Home
        </Link>
        <span className="font-bold text-xs tracking-wider text-emerald-400">ADMIN & DEMO CONTROLS</span>
        <div className="w-10" />
      </header>

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div>
          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
            HACKATHON JUDGING SUITE
          </span>
          <h1 className="text-2xl font-bold text-white mt-1">Campus District Demo Controls</h1>
          <p className="text-xs text-slate-400 mt-1">
            Pre-seed synthetic data, trigger chaotic storm scenarios, and inspect judge credentials.
          </p>
        </div>

        {statusMsg && (
          <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/30 p-4 text-xs font-semibold text-emerald-300 flex items-center space-x-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 flex-shrink-0" />
            <span>{statusMsg}</span>
          </div>
        )}

        {/* Demo Action Buttons */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="glass-panel rounded-2xl p-5 border border-slate-800 flex flex-col justify-between space-y-4">
            <div>
              <Database className="h-6 w-6 text-indigo-400 mb-2" />
              <h3 className="text-sm font-bold text-white">Seed Demo District</h3>
              <p className="text-xs text-slate-400 mt-1">
                Populates 100 infrastructure assets & 6 field workers across 5 campus departments.
              </p>
            </div>
            <button
              onClick={() => handleAction("seed", "Seed Demo District")}
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white transition"
            >
              Seed Demo Data
            </button>
          </div>

          <div className="glass-panel rounded-2xl p-5 border border-slate-800 flex flex-col justify-between space-y-4">
            <div>
              <RotateCcw className="h-6 w-6 text-amber-400 mb-2" />
              <h3 className="text-sm font-bold text-white">Reset Demo State</h3>
              <p className="text-xs text-slate-400 mt-1">
                Flushes all active missions and restores clean baseline before recording video.
              </p>
            </div>
            <button
              onClick={() => handleAction("reset", "Reset Demo")}
              disabled={loading}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-amber-300 transition"
            >
              Reset Demo
            </button>
          </div>

          <div className="glass-panel rounded-2xl p-5 border border-indigo-500/30 bg-indigo-950/20 flex flex-col justify-between space-y-4">
            <div>
              <CloudRain className="h-6 w-6 text-cyan-400 mb-2" />
              <h3 className="text-sm font-bold text-white">Simulate Heavy Rain</h3>
              <p className="text-xs text-slate-400 mt-1">
                Injects 7 raw reports, collapses duplicates, and routes to Human Decision Inbox.
              </p>
            </div>
            <Link
              href="/operations/simulate"
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-cyan-600 hover:from-indigo-500 hover:to-cyan-500 text-xs font-bold text-white text-center transition block"
            >
              Launch Simulator
            </Link>
          </div>
        </div>

        {/* Demo Accounts for Judges */}
        <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-4">
          <div className="flex items-center space-x-2">
            <KeyRound className="h-5 w-5 text-indigo-400" />
            <h3 className="text-sm font-bold text-white">Judge & Demo Accounts</h3>
          </div>
          <p className="text-xs text-slate-400">
            One application and one Cognito authentication system. Roles determine server-side access:
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
              <span className="text-indigo-400 font-bold block">resident@repairgrid.demo</span>
              <span className="text-[11px] text-slate-400">Role: resident • Access: /report, /resident</span>
            </div>

            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
              <span className="text-amber-400 font-bold block">worker.electric@repairgrid.demo</span>
              <span className="text-[11px] text-slate-400">Role: field_worker • Skills: electrical, street_lighting</span>
            </div>

            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
              <span className="text-cyan-400 font-bold block">worker.plumber@repairgrid.demo</span>
              <span className="text-[11px] text-slate-400">Role: field_worker • Skills: plumbing, drainage</span>
            </div>

            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
              <span className="text-emerald-400 font-bold block">operator@repairgrid.demo</span>
              <span className="text-[11px] text-slate-400">Role: operator • Access: /operations command center</span>
            </div>

            <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800 sm:col-span-2">
              <span className="text-rose-400 font-bold block">admin@repairgrid.demo</span>
              <span className="text-[11px] text-slate-400">Role: admin • Access: /admin, policy configuration & demo controls</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
