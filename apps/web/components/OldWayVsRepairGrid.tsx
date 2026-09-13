"use client";

import React, { useState } from "react";
import { 
  XCircle, 
  CheckCircle2, 
  Clock, 
  Zap, 
  ArrowRight,
  ShieldCheck,
  Cpu,
  Mail,
  Users
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function OldWayVsRepairGrid() {
  const [activeTab, setActiveTab] = useState<"comparison" | "savings">("comparison");

  return (
    <div className="w-full bg-white dark:bg-[#0d0d10] border border-zinc-200 dark:border-zinc-800 rounded-xl p-6 mb-16 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 font-mono">
              The Civic Maintenance Revolution
            </span>
            <Badge variant="outline" className="text-[10px] font-mono border-emerald-300 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300">
              99.2% Latency Reduction
            </Badge>
          </div>
          <h3 className="text-lg font-bold text-zinc-900 dark:text-white mt-1">
            Manual Administrative Delay vs. Autonomous Agent Operation
          </h3>
        </div>

        <div className="inline-flex rounded-lg border border-zinc-200 dark:border-zinc-800 p-0.5 bg-zinc-100 dark:bg-zinc-900 self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setActiveTab("comparison")}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
              activeTab === "comparison"
                ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
            }`}
          >
            Workflow Breakdown
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("savings")}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
              activeTab === "savings"
                ? "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white shadow-sm"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
            }`}
          >
            Cost & Time Impact
          </button>
        </div>
      </div>

      {activeTab === "comparison" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* The Old Way */}
          <div className="p-5 rounded-xl border border-red-200 dark:border-red-950/60 bg-red-50/40 dark:bg-red-950/10 flex flex-col justify-between">
            <div>
              <div className="flex items-center space-x-2 text-red-700 dark:text-red-400 font-semibold text-xs mb-3">
                <XCircle className="h-4 w-4" />
                <span>The Traditional Civic Process (3 to 4 Weeks)</span>
              </div>
              <ul className="space-y-3 text-xs text-zinc-700 dark:text-zinc-300">
                <li className="flex items-start space-x-2">
                  <span className="text-red-500 font-bold">•</span>
                  <span><strong>Opaque Inboxes:</strong> 25 duplicate citizen complaints flood customer service for a single dark lamp post.</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-red-500 font-bold">•</span>
                  <span><strong>Subjective Triage:</strong> Unranked spreadsheets; severe electrical hazards wait behind routine requests.</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-red-500 font-bold">•</span>
                  <span><strong>Mismatched Dispatch:</strong> General handymen sent to high-voltage lines, requiring days of back-and-forth re-routing.</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-red-500 font-bold">•</span>
                  <span><strong>Ghost Closures:</strong> Work orders closed on paper with zero photographic before/after verification.</span>
                </li>
              </ul>
            </div>

            <div className="mt-5 pt-3 border-t border-red-200/80 dark:border-red-900/40 text-[11px] font-mono text-red-600 dark:text-red-400 font-medium">
              Average Resolution: 18–24 Business Days
            </div>
          </div>

          {/* The RepairGrid Way */}
          <div className="p-5 rounded-xl border border-emerald-200 dark:border-emerald-950/60 bg-emerald-50/40 dark:bg-emerald-950/10 flex flex-col justify-between">
            <div>
              <div className="flex items-center space-x-2 text-emerald-700 dark:text-emerald-400 font-semibold text-xs mb-3">
                <CheckCircle2 className="h-4 w-4" />
                <span>The RepairGrid Autonomous OS (4 Minutes to Dispatch)</span>
              </div>
              <ul className="space-y-3 text-xs text-zinc-700 dark:text-zinc-300">
                <li className="flex items-start space-x-2">
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">•</span>
                  <span><strong>Autonomous Spatial Deduplication:</strong> DuplicateAgent collapses duplicates within 25–50m into one canonical master ticket.</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">•</span>
                  <span><strong>Deterministic 6-Factor Risk Policy:</strong> Objective priority calculated from Safety (35%), School proximity, and Weather.</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">•</span>
                  <span><strong>Multi-Attribute Worker Dispatch:</strong> Certified electrical specialist matched instantly via Amazon Location travel routes.</span>
                </li>
                <li className="flex items-start space-x-2">
                  <span className="text-emerald-600 dark:text-emerald-400 font-bold">•</span>
                  <span><strong>First-Class Bedrock Nova Vision Proof:</strong> CompletionVerifierAgent compares before/after photos with 96% AI confidence.</span>
                </li>
              </ul>
            </div>

            <div className="mt-5 pt-3 border-t border-emerald-200/80 dark:border-emerald-900/40 text-[11px] font-mono text-emerald-700 dark:text-emerald-400 font-semibold">
              Average Triage & Dispatch: 1.2 Seconds
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/40">
            <span className="text-xs text-zinc-500 font-medium">Duplicate Truck Rolls Avoided</span>
            <div className="text-2xl font-bold font-mono text-zinc-900 dark:text-white mt-1">74%</div>
            <p className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-1">
              Autonomous spatial clustering prevents sending multiple repair crews to the same incident.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/40">
            <span className="text-xs text-zinc-500 font-medium">Safety Hazard Response Time</span>
            <div className="text-2xl font-bold font-mono text-emerald-600 dark:text-emerald-400 mt-1">&lt; 15 mins</div>
            <p className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-1">
              Deterministic priority math immediately escalates school-adjacent and electrocution hazards to top queue.
            </p>
          </div>

          <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900/40">
            <span className="text-xs text-zinc-500 font-medium">Municipal Admin Cost per Ticket</span>
            <div className="text-2xl font-bold font-mono text-zinc-900 dark:text-white mt-1">$0.003</div>
            <p className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-1">
              100% serverless Bedrock Nova 2 Lite pay-per-token execution with zero idle cloud overhead.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
