"use client";

import { useState } from "react";
import { OperatorNav } from "@/components/OperatorNav";
import { 
  Bot, 
  CheckCircle2, 
  Clock, 
  Zap, 
  ArrowDown, 
  GitBranch, 
  ShieldCheck, 
  Terminal,
  Activity
} from "lucide-react";

interface NodeTelemetry {
  id: string;
  name: string;
  agent: string;
  status: "COMPLETED" | "RUNNING" | "PAUSED_HITL";
  duration: string;
  tool: string;
  confidence: number;
  outcome: string;
}

const GRAPH_NODES: NodeTelemetry[] = [
  { id: "intake", name: "Intake Agent", agent: "IntakeAgent", status: "COMPLETED", duration: "0.8s", tool: "report_get", confidence: 0.97, outcome: "Category: streetlights, asset identified" },
  { id: "enrich", name: "Location & Vision", agent: "EnrichmentAgent", status: "COMPLETED", duration: "1.1s", tool: "location_reverse_geocode", confidence: 0.94, outcome: "North Gate 2, University Road" },
  { id: "duplicate", name: "Duplicate Detection", agent: "DuplicateAgent", status: "COMPLETED", duration: "0.6s", tool: "report_find_nearby", confidence: 0.96, outcome: "Distance: 24.5m (Auto-merged into RG-M-201)" },
  { id: "verify", name: "Physical Verification", agent: "VerificationAgent", status: "COMPLETED", duration: "1.2s", tool: "evidence_get_metadata", confidence: 0.96, outcome: "Physical asset existence verified" },
  { id: "risk", name: "Deterministic Risk Engine", agent: "RiskAgent", status: "COMPLETED", duration: "0.3s", tool: "policy_lookup", confidence: 0.95, outcome: "Score: 85 (HIGH risk band)" },
  { id: "ownership", name: "Department Ownership", agent: "OwnershipAgent", status: "COMPLETED", duration: "0.5s", tool: "department_lookup", confidence: 0.98, outcome: "Dept: electrical, Skill: street_lighting" },
  { id: "mission", name: "Mission Dispatch", agent: "MissionAgent", status: "COMPLETED", duration: "0.4s", tool: "mission_create", confidence: 1.0, outcome: "Mission RG-M-201 created with 8h SLA" },
  { id: "resource", name: "Worker Match Engine", agent: "ResourceAgent", status: "COMPLETED", duration: "0.5s", tool: "worker_get_available", confidence: 0.96, outcome: "Matched Ahmed Khan (Score: 0.96)" },
  { id: "guardian", name: "Guardian Policy Check", agent: "GuardianAgent", status: "COMPLETED", duration: "0.2s", tool: "guardian_evaluate", confidence: 1.0, outcome: "Action permitted: routine low-risk dispatch" },
  { id: "completion", name: "Proof-of-Repair Verifier", agent: "CompletionVerifierAgent", status: "COMPLETED", duration: "1.4s", tool: "evidence_compare_vision", confidence: 0.96, outcome: "Autonomous closure recommended" },
];

export default function AgentNetworkPage() {
  const [selectedNode, setSelectedNode] = useState<NodeTelemetry>(GRAPH_NODES[4]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <OperatorNav />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div>
          <div className="flex items-center space-x-2">
            <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/20">
              STRANDS GRAPH RUNTIME
            </span>
            <span className="text-[10px] font-bold text-emerald-400">
              NO CHAIN-OF-THOUGHT LEAK
            </span>
          </div>
          <h1 className="text-2xl font-bold text-white mt-1">Live Agent Graph Execution</h1>
          <p className="text-xs text-slate-400 mt-1">
            Displaying real-time execution telemetry, deterministic policy evaluations, tool invocations, and confidence scoring.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Strands Graph Node Flow */}
          <div className="lg:col-span-2 glass-panel rounded-2xl p-6 border border-slate-800 space-y-3">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-4 flex items-center justify-between">
              <span>Execution Pipeline</span>
              <span className="text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                10 Nodes Evaluated • 0 Infinite Loops
              </span>
            </h3>

            <div className="space-y-2.5">
              {GRAPH_NODES.map((node, index) => {
                const isSelected = selectedNode.id === node.id;
                return (
                  <div
                    key={node.id}
                    onClick={() => setSelectedNode(node)}
                    className={`p-3.5 rounded-xl border transition cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? "border-indigo-500 bg-indigo-500/15 shadow-md shadow-indigo-500/10"
                        : "border-slate-800 bg-slate-900/60 hover:bg-slate-800/60"
                    }`}
                  >
                    <div className="flex items-center space-x-3">
                      <div className="h-7 w-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center font-bold text-xs">
                        {index + 1}
                      </div>
                      <div>
                        <div className="flex items-center space-x-2">
                          <h4 className="text-xs font-bold text-white">{node.name}</h4>
                          <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-1.5 py-0.2 rounded">
                            {node.tool}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5 truncate max-w-sm">{node.outcome}</p>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-xs font-bold text-indigo-400 block">{node.duration}</span>
                      <span className="text-[10px] text-emerald-400">{(node.confidence * 100).toFixed(0)}% conf</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Node Inspector Telemetry Panel */}
          <div className="glass-panel rounded-2xl p-6 border border-indigo-500/30 bg-slate-900/90 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 font-mono block">NODE INSPECTOR</span>
                  <h3 className="text-base font-bold text-white mt-0.5">{selectedNode.name}</h3>
                </div>
                <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                  {selectedNode.status}
                </span>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Agent Class</span>
                  <span className="font-mono text-indigo-400 font-semibold">{selectedNode.agent}</span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Invoked Tool</span>
                  <span className="font-mono text-amber-400">{selectedNode.tool}()</span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Execution Latency</span>
                  <span className="font-semibold text-white">{selectedNode.duration}</span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Confidence Rating</span>
                  <span className="font-semibold text-emerald-400">{(selectedNode.confidence * 100).toFixed(1)}%</span>
                </div>

                <div>
                  <span className="text-slate-400 block text-[10px] uppercase">Structured Outcome</span>
                  <p className="mt-1 p-2.5 rounded-lg bg-slate-950 border border-slate-800 font-mono text-[11px] text-slate-200">
                    {selectedNode.outcome}
                  </p>
                </div>
              </div>

              <div className="pt-2">
                <div className="rounded-xl bg-slate-950 p-3 border border-slate-800 text-[11px] text-slate-400">
                  <span className="text-emerald-400 font-semibold">Privacy Safety Rule:</span> Private LLM chain-of-thought is excluded from logs and client state. Only deterministic operational metadata is exposed.
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-800 text-[10px] text-slate-500 text-center">
              AgentCore Runtime • us-east-1 • Strands Graph Engine
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
