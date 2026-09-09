"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { OperatorNav } from "@/components/OperatorNav";
import { 
  Activity, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Users, 
  Bot, 
  ArrowRight, 
  Sparkles, 
  Zap,
  TrendingUp,
  ShieldAlert
} from "lucide-react";

export default function OperationsOverviewPage() {
  const [summary, setSummary] = useState<any>({
    community_health: 84,
    category_health: { lighting: 88, roads: 76, drainage: 82 },
    formula_breakdown: "100 - (3 critical * 4) - (38 open * 1) + (8 recovery bonus)",
    open_missions: 38,
    critical_missions: 3,
    resolved_today: 17,
    pending_decisions: 1,
    available_workers: 4,
    agent_actions_today: 147,
    auto_action_rate: 97.2,
  });

  useEffect(() => {
    fetch("http://localhost:8000/api/ops/summary", {
      headers: { "X-Mock-Role": "operator" }
    })
      .then(res => res.ok ? res.json() : null)
      .then(data => { if (data) setSummary(data); })
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <OperatorNav />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* Hero Top Grid: Community Health & Key Stats */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Community Health Hero Card */}
          <div className="glass-panel rounded-2xl p-6 border border-indigo-500/30 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-400">
                  Community Health Metric
                </span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  +4% TODAY
                </span>
              </div>
              
              <div className="mt-6 flex items-baseline space-x-4">
                <span className="text-6xl font-black tracking-tight text-white">{summary.community_health}</span>
                <span className="text-sm font-semibold text-slate-400">/ 100 Objective Index</span>
              </div>

              <p className="text-xs text-slate-400 mt-2 font-mono">
                {summary.formula_breakdown}
              </p>
            </div>

            {/* Category Health Breakdown */}
            <div className="mt-6 pt-4 border-t border-slate-800 grid grid-cols-3 gap-2 text-center">
              <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/60">
                <span className="text-[10px] text-slate-400 block">Lighting</span>
                <span className="text-sm font-bold text-amber-400">{summary.category_health.lighting}%</span>
              </div>
              <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/60">
                <span className="text-[10px] text-slate-400 block">Roads</span>
                <span className="text-sm font-bold text-orange-400">{summary.category_health.roads}%</span>
              </div>
              <div className="bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/60">
                <span className="text-[10px] text-slate-400 block">Drainage</span>
                <span className="text-sm font-bold text-cyan-400">{summary.category_health.drainage}%</span>
              </div>
            </div>
          </div>

          {/* Operational Metrics Counter Grid */}
          <div className="lg:col-span-2 grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="glass-panel rounded-2xl p-5 border border-slate-800 flex flex-col justify-between">
              <span className="text-xs font-semibold text-slate-400 uppercase">Open Missions</span>
              <div>
                <span className="text-3xl font-extrabold text-white">{summary.open_missions}</span>
                <span className="text-[10px] text-slate-500 block mt-1">Across 5 departments</span>
              </div>
            </div>

            <div className="glass-panel rounded-2xl p-5 border border-rose-500/30 bg-rose-950/10 flex flex-col justify-between">
              <span className="text-xs font-semibold text-rose-400 uppercase flex items-center">
                <ShieldAlert className="h-3.5 w-3.5 mr-1" />
                Critical
              </span>
              <div>
                <span className="text-3xl font-extrabold text-rose-400">{summary.critical_missions}</span>
                <span className="text-[10px] text-rose-300/70 block mt-1">Safety-gated (HITL)</span>
              </div>
            </div>

            <div className="glass-panel rounded-2xl p-5 border border-emerald-500/30 bg-emerald-950/10 flex flex-col justify-between">
              <span className="text-xs font-semibold text-emerald-400 uppercase">Fixed Today</span>
              <div>
                <span className="text-3xl font-extrabold text-emerald-400">{summary.resolved_today}</span>
                <span className="text-[10px] text-emerald-300/70 block mt-1">Verified & confirmed</span>
              </div>
            </div>

            <div className="glass-panel rounded-2xl p-5 border border-indigo-500/30 flex flex-col justify-between">
              <span className="text-xs font-semibold text-indigo-400 uppercase">Autonomous Rate</span>
              <div>
                <span className="text-3xl font-extrabold text-indigo-400">{summary.auto_action_rate}%</span>
                <span className="text-[10px] text-indigo-300/70 block mt-1">{summary.agent_actions_today} actions run</span>
              </div>
            </div>

            {/* Quick Navigation Cards */}
            <Link
              href="/operations/decisions"
              className="col-span-2 glass-panel-interactive rounded-2xl p-4 border border-rose-500/40 bg-slate-900 flex items-center justify-between"
            >
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center font-bold">
                  !
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Decision Required Inbox</h4>
                  <p className="text-xs text-slate-400">1 Strands Human-in-the-Loop item awaiting sign-off</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-rose-400" />
            </Link>

            <Link
              href="/operations/simulate"
              className="col-span-2 glass-panel-interactive rounded-2xl p-4 border border-indigo-500/40 bg-slate-900 flex items-center justify-between"
            >
              <div className="flex items-center space-x-3">
                <div className="h-10 w-10 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                  <Zap className="h-5 w-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Chaos Simulator</h4>
                  <p className="text-xs text-slate-400">Test Heavy Rain & Electrical Failure autonomy</p>
                </div>
              </div>
              <ArrowRight className="h-4 w-4 text-indigo-400" />
            </Link>
          </div>
        </div>

        {/* Live Agent Operational Activity Stream */}
        <div className="glass-panel rounded-2xl p-6 border border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center">
                <span className="h-2 w-2 rounded-full bg-emerald-400 mr-2 animate-pulse" />
                Live Strands Agent Activity Feed
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">Real-time structured telemetry (no private model chain-of-thought)</p>
            </div>
            <Link href="/operations/agents" className="text-xs text-indigo-400 hover:underline font-semibold">
              View Agent Graph →
            </Link>
          </div>

          <div className="space-y-3">
            <div className="glass-panel rounded-xl p-3.5 flex items-center justify-between border border-slate-800">
              <div className="flex items-center space-x-3">
                <span className="h-2 w-2 rounded-full bg-cyan-400" />
                <div>
                  <span className="text-xs font-bold text-white">DuplicateAgent</span>
                  <p className="text-xs text-slate-300 mt-0.5">Merged 3 incoming citizen reports into canonical mission RG-M-201 (96% confidence)</p>
                </div>
              </div>
              <span className="text-[10px] font-mono text-slate-500">Just now</span>
            </div>

            <div className="glass-panel rounded-xl p-3.5 flex items-center justify-between border border-slate-800">
              <div className="flex items-center space-x-3">
                <span className="h-2 w-2 rounded-full bg-rose-400" />
                <div>
                  <span className="text-xs font-bold text-white">RiskAgent</span>
                  <p className="text-xs text-slate-300 mt-0.5">Escalated Primary School storm drain RG-3011 to CRITICAL risk</p>
                </div>
              </div>
              <span className="text-[10px] font-mono text-slate-500">1m ago</span>
            </div>

            <div className="glass-panel rounded-xl p-3.5 flex items-center justify-between border border-slate-800">
              <div className="flex items-center space-x-3">
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                <div>
                  <span className="text-xs font-bold text-white">ResourceAgent</span>
                  <p className="text-xs text-slate-300 mt-0.5">Assigned Ahmed Khan to North Gate streetlight mission (96% fit match)</p>
                </div>
              </div>
              <span className="text-[10px] font-mono text-slate-500">2m ago</span>
            </div>

            <div className="glass-panel rounded-xl p-3.5 flex items-center justify-between border border-slate-800">
              <div className="flex items-center space-x-3">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                <div>
                  <span className="text-xs font-bold text-white">CompletionVerifierAgent</span>
                  <p className="text-xs text-slate-300 mt-0.5">Verified before/after evidence for RG-1841 with 96% confidence</p>
                </div>
              </div>
              <span className="text-[10px] font-mono text-slate-500">4m ago</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
