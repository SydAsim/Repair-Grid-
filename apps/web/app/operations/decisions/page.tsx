"use client";

import { useState, useEffect } from "react";
import { OperatorNav } from "@/components/OperatorNav";
import { 
  Inbox, 
  AlertTriangle, 
  Check, 
  X, 
  Bot, 
  CheckCircle2, 
  ShieldAlert, 
  Clock, 
  MapPin,
  Sparkles
} from "lucide-react";

export default function DecisionsInboxPage() {
  const [decisions, setDecisions] = useState<any[]>([
    {
      decisionId: "DEC-RAIN-001",
      missionId: "RG-3011",
      type: "SAFETY_CRITICAL_ESCALATION",
      title: "Blocked drain beside campus primary school",
      proposedAction: "Escalate priority to CRITICAL and dispatch emergency suction equipment",
      agentName: "RiskAgent",
      confidence: 0.96,
      currentPriority: "HIGH (82)",
      suggestedPriority: "CRITICAL (95)",
      location: "Campus Primary School Entrance",
      evidence: [
        "7 corroborating citizen reports merged autonomously",
        "Primary school entrance location with high child pedestrian traffic",
        "Standing water depth exceeds 10cm",
        "Weather forecast indicates continued rain for next 3 hours"
      ],
      status: "PENDING"
    }
  ]);

  const [resolvedStatus, setResolvedStatus] = useState<Record<string, string>>({});

  useEffect(() => {
    fetch("http://localhost:8000/api/ops/decisions?status=PENDING", {
      headers: { "X-Mock-Role": "operator" }
    })
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data && data.length > 0) {
          setDecisions(data);
        }
      })
      .catch(() => {});
  }, []);

  const handleResolve = async (id: string, action: "approve" | "reject") => {
    try {
      await fetch(`http://localhost:8000/api/decisions/${id}/${action}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Mock-Role": "operator"
        },
        body: JSON.stringify({ notes: `Operator ${action}d decision via Mission Control` }),
      });
    } catch (e) {
      // Fallback for demo
    }
    setResolvedStatus(prev => ({ ...prev, [id]: action.toUpperCase() }));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <OperatorNav />

      <main className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-bold text-rose-400 bg-rose-500/10 px-2.5 py-0.5 rounded-full border border-rose-500/20">
              STRANDS HUMAN-IN-THE-LOOP (HITL)
            </span>
            <span className="text-[10px] font-bold text-slate-400">
              SAFETY GATING
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white mt-1">Decision Required Inbox</h1>
          <p className="text-xs text-slate-400 mt-1">
            Consequential operations that policy forbids agents from executing autonomously. The Strands Graph pauses here until you take action.
          </p>
        </div>

        {/* Decision Cards */}
        <div className="space-y-6">
          {decisions.map((dec) => {
            const isResolved = resolvedStatus[dec.decisionId];
            return (
              <div 
                key={dec.decisionId}
                className={`glass-panel rounded-2xl p-6 border transition ${
                  isResolved
                    ? "border-slate-800 opacity-60"
                    : "border-rose-500/40 bg-slate-900/90 shadow-xl shadow-rose-950/20"
                }`}
              >
                <div className="flex items-start justify-between pb-4 border-b border-slate-800">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center font-bold">
                      <ShieldAlert className="h-5 w-5" />
                    </div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-slate-400 font-mono">{dec.missionId}</span>
                        <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider bg-rose-500/10 px-2 py-0.2 rounded-full border border-rose-500/20">
                          {dec.type.replace(/_/g, " ")}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-white mt-0.5">{dec.title || "Blocked Drain Escalation"}</h3>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-[10px] text-slate-500 block">Proposed By</span>
                    <span className="text-xs font-semibold text-indigo-400">{dec.agentName} (96% conf)</span>
                  </div>
                </div>

                {/* Proposal & Priority delta */}
                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80">
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider block mb-1">Proposed Action</span>
                    <p className="text-xs font-medium text-slate-200 leading-relaxed">
                      {dec.proposedAction}
                    </p>
                  </div>

                  <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/80 flex items-center justify-around text-center">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase block">Current Priority</span>
                      <span className="text-sm font-bold text-amber-400">{dec.currentPriority || "HIGH (82)"}</span>
                    </div>
                    <span className="text-xs text-slate-500">→</span>
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase block">Suggested</span>
                      <span className="text-sm font-bold text-rose-400">{dec.suggestedPriority || "CRITICAL (95)"}</span>
                    </div>
                  </div>
                </div>

                {/* Evidence List */}
                <div className="mt-4">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
                    Autonomous Evidence Gathered
                  </span>
                  <div className="space-y-1.5 bg-slate-950/40 p-3 rounded-xl border border-slate-800/60">
                    {(Array.isArray(dec.evidence) ? dec.evidence : []).map((ev: any, idx: number) => (
                      <div key={idx} className="flex items-center space-x-2 text-xs text-slate-300">
                        <Check className="h-3.5 w-3.5 text-emerald-400 flex-shrink-0" />
                        <span>{typeof ev === "string" ? ev : ev.fact}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Action Bar */}
                <div className="mt-6 pt-4 border-t border-slate-800 flex items-center justify-between">
                  {isResolved ? (
                    <div className="w-full text-center py-2 text-xs font-bold text-indigo-400 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
                      DECISION {isResolved} • STRANDS GRAPH UNPAUSED AND DISPATCHED
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => handleResolve(dec.decisionId, "reject")}
                        className="px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 transition flex items-center space-x-1.5"
                      >
                        <X className="h-3.5 w-3.5" />
                        <span>Reject Escalation</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleResolve(dec.decisionId, "approve")}
                        className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-indigo-600 hover:from-rose-500 hover:to-indigo-500 text-xs font-bold text-white transition flex items-center space-x-1.5 shadow-lg shadow-rose-600/30"
                      >
                        <Check className="h-3.5 w-3.5" />
                        <span>Approve Escalation (Unpause Graph)</span>
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
