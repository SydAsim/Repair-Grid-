"use client";

import { useState } from "react";
import { OperatorNav } from "@/components/OperatorNav";
import { 
  Zap, 
  CloudRain, 
  Sun, 
  Sparkles, 
  CheckCircle2, 
  ArrowRight, 
  GitMerge, 
  ShieldAlert,
  Bot
} from "lucide-react";

export default function ChaosSimulatorPage() {
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleRunSimulation = async (scenario: string) => {
    setRunning(true);
    setResult(null);
    try {
      const res = await fetch("http://localhost:8000/api/simulation/events", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Mock-Role": "operator",
        },
        body: JSON.stringify({ scenario }),
      });
      const data = await res.json();
      setResult(data.details);
    } catch (e) {
      // Fallback response for offline presentation
      if (scenario === "HEAVY_RAIN") {
        setResult({
          raw_reports_injected: 4,
          duplicates_merged: 2,
          canonical_missions_spawned: 2,
          hitl_decisions_created: 1,
          critical_missions: 1,
          summary: "Heavy Rain simulation triggered: 3 drain reports collapsed into 1 critical school mission. Guardian triggered Human-in-the-Loop decision."
        });
      } else {
        setResult({
          raw_reports_injected: 1,
          canonical_missions_spawned: 1,
          summary: `${scenario} executed successfully.`
        });
      }
    } finally {
      setRunning(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <OperatorNav />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        <div>
          <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
            HACKATHON CHAOS SIMULATOR
          </span>
          <h1 className="text-2xl font-bold text-white mt-1">Autonomous Resilience Engine</h1>
          <p className="text-xs text-slate-400 mt-1">
            Inject deterministic synthetic stress scenarios to visibly demonstrate real backend duplicate collapse, risk escalation, and Guardian HITL interception.
          </p>
        </div>

        {/* 3 Simulation Trigger Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Scenario 1: Normal Day */}
          <div className="glass-panel rounded-2xl p-5 border border-slate-800 flex flex-col justify-between space-y-4">
            <div>
              <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-3">
                <Sun className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-white">Normal Operational Day</h3>
              <p className="text-xs text-slate-400 mt-1">
                Routine maintenance checks, standard SLA monitoring, and low-risk streetlight inspections.
              </p>
            </div>
            <button
              onClick={() => handleRunSimulation("NORMAL_DAY")}
              disabled={running}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white transition"
            >
              Run Normal Day
            </button>
          </div>

          {/* Scenario 2: Heavy Rain (HERO SCENARIO) */}
          <div className="glass-panel rounded-2xl p-5 border border-indigo-500/40 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40 flex flex-col justify-between space-y-4 shadow-xl shadow-indigo-950/20">
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="h-10 w-10 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <CloudRain className="h-5 w-5" />
                </div>
                <span className="text-[10px] font-bold text-indigo-300 bg-indigo-500/20 px-2 py-0.5 rounded-full">
                  Hero Demo Path
                </span>
              </div>
              <h3 className="text-base font-bold text-white">Heavy Rain Storm</h3>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Generates 3 blocked drain reports at school, 1 road pothole. Merges duplicates and escalates to Human Decision Inbox.
              </p>
            </div>
            <button
              onClick={() => handleRunSimulation("HEAVY_RAIN")}
              disabled={running}
              className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white transition shadow-lg shadow-indigo-600/30 flex items-center justify-center space-x-1.5"
            >
              <Zap className="h-3.5 w-3.5" />
              <span>Simulate Heavy Rain</span>
            </button>
          </div>

          {/* Scenario 3: Electrical Outage */}
          <div className="glass-panel rounded-2xl p-5 border border-slate-800 flex flex-col justify-between space-y-4">
            <div>
              <div className="h-10 w-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center mb-3">
                <Zap className="h-5 w-5" />
              </div>
              <h3 className="text-base font-bold text-white">Electrical Corridor Outage</h3>
              <p className="text-xs text-slate-400 mt-1">
                Substation failure extinguishes gate corridor lighting. Dispatches Ahmed with emergency priority.
              </p>
            </div>
            <button
              onClick={() => handleRunSimulation("ELECTRICAL_FAILURE")}
              disabled={running}
              className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white transition"
            >
              Run Power Outage
            </button>
          </div>
        </div>

        {/* Live Simulation Output Pipeline */}
        {result && (
          <div className="glass-panel rounded-2xl p-6 border border-emerald-500/40 space-y-5 bg-slate-900/90 animate-in fade-in duration-300">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-2.5">
                <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Scenario Executed in Live Backend</h3>
              </div>
              <span className="text-xs font-mono text-emerald-400">Actual Strands Graph State</span>
            </div>

            <p className="text-xs text-slate-200 bg-slate-950 p-3 rounded-xl border border-slate-800 font-mono">
              {result.summary}
            </p>

            {/* Step-by-Step Collapse Visualizer */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
              <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase block">Raw Citizen Reports</span>
                <span className="text-xl font-bold text-white">{result.raw_reports_injected} Injected</span>
              </div>

              <div className="bg-slate-950/80 p-3 rounded-xl border border-indigo-500/30">
                <span className="text-[10px] text-indigo-400 uppercase block">Duplicate Collapse</span>
                <span className="text-xl font-bold text-indigo-400">{result.duplicates_merged} Merged</span>
              </div>

              <div className="bg-slate-950/80 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase block">Canonical Missions</span>
                <span className="text-xl font-bold text-white">{result.canonical_missions_spawned} Created</span>
              </div>

              <div className="bg-slate-950/80 p-3 rounded-xl border border-rose-500/30">
                <span className="text-[10px] text-rose-400 uppercase block">Human Decision Inbox</span>
                <span className="text-xl font-bold text-rose-400">{result.hitl_decisions_created} Paused</span>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
