"use client";

import React, { useState } from "react";
import { 
  Camera, 
  Cpu, 
  Truck, 
  Wrench, 
  CheckCircle2, 
  Sparkles, 
  ChevronRight,
  Info,
  ShieldCheck
} from "lucide-react";
import { Badge } from "@/components/ui/badge";

export type StageId = "submitted" | "triaged" | "dispatched" | "repaired" | "verified";
export type LifecycleStage = StageId;

interface MissionLifecycleStepperProps {
  currentStage?: StageId;
  interactive?: boolean;
  onStageSelect?: (stage: StageId) => void;
  missionData?: {
    status?: string;
    riskScore?: number;
    riskBand?: string;
    locationName?: string;
    technicianName?: string;
    matchScorePct?: number;
    visionConfidence?: number;
  };
}

export function MissionLifecycleStepper({ 
  currentStage = "repaired", 
  interactive = true,
  onStageSelect,
  missionData
}: MissionLifecycleStepperProps) {
  const [selectedStage, setSelectedStage] = useState<StageId>(currentStage);

  React.useEffect(() => {
    setSelectedStage(currentStage);
  }, [currentStage]);

  const stages: {
    id: StageId;
    stepNumber: number;
    label: string;
    sublabel: string;
    agent: string;
    icon: React.ElementType;
    details: {
      headline: string;
      description: string;
      rulesApplied: string[];
      getMetrics: (stageState: "COMPLETED" | "ACTIVE_NOW" | "UPCOMING") => { label: string; value: string }[];
    };
  }[] = [
    {
      id: "submitted",
      stepNumber: 1,
      label: "Intake Captured",
      sublabel: "GPS & Photo",
      agent: "IntakeAgent",
      icon: Camera,
      details: {
        headline: "Multimodal Incident Ingestion",
        description: "Resident captures broken asset photo. Reverse-geocoded to coordinates via Amazon Location Service.",
        rulesApplied: ["Multimodal feature extraction (Nova 2 Lite)", "District boundary coordinate validation", "Asset ID spatial cross-reference"],
        getMetrics: (state) => [
          { label: "Confidence", value: "97%" },
          { label: "Location", value: missionData?.locationName ? (missionData.locationName.length > 20 ? missionData.locationName.slice(0, 18) + "..." : missionData.locationName) : "GPS Verified" },
          { label: "Latency", value: "0.4s" }
        ]
      }
    },
    {
      id: "triaged",
      stepNumber: 2,
      label: "AI Triage & Risk",
      sublabel: "Deduplication",
      agent: "DuplicateAgent + RiskAgent",
      icon: Cpu,
      details: {
        headline: "Autonomous Clustering & 6-Factor Policy",
        description: "Scans active reports within 25–50m radius. Merges duplicates at >=95% confidence and calculates transparent risk formula.",
        rulesApplied: [
          "Spatial geohash clustering (25m radius)",
          "Deterministic 6-Factor Risk Policy (Safety 35%, Traffic 20%, School 10%)",
          "Municipal department auto-classification"
        ],
        getMetrics: (state) => [
          { label: "Risk Score", value: missionData?.riskScore ? `${missionData.riskScore} (${missionData.riskBand || 'MED'})` : "48 (MED)" },
          { label: "Duplicate Match", value: "None (Unique)" },
          { label: "Department", value: "Electrical" }
        ]
      }
    },
    {
      id: "dispatched",
      stepNumber: 3,
      label: "Smart Dispatch",
      sublabel: "Skill & Distance",
      agent: "ResourceAgent + Guardian",
      icon: Truck,
      details: {
        headline: "Deterministic Multi-Attribute Ranking",
        description: "Matches certified technicians based on verified trade skills, current shift availability, and travel matrix.",
        rulesApplied: [
          "Multi-attribute scoring: Skill (25%) + Distance (25%) + Workload (15%) + Cert (15%)",
          "Guardian Pre-action Safety Gate check",
          "Optimistic concurrency mission reservation"
        ],
        getMetrics: (state) => [
          { label: "Technician", value: missionData?.technicianName || "Ahmed Khan" },
          { label: "Match Score", value: `${missionData?.matchScorePct || 96}% Match` },
          { label: "Status", value: state === "COMPLETED" ? "Accepted" : (missionData?.status || "DISPATCHED") }
        ]
      }
    },
    {
      id: "repaired",
      stepNumber: 4,
      label: "On-Site Repair",
      sublabel: "Field Execution",
      agent: "Field Worker PWA",
      icon: Wrench,
      details: {
        headline: "Physical Remediation & Proof Capture",
        description: "Technician arrives on site, performs the repair, and submits a timestamped completion photo with GPS verification.",
        rulesApplied: [
          "GPS proximity lock (worker within incident zone)",
          "Material usage attestation",
          "Before / After physical visual delta validation"
        ],
        getMetrics: (state) => state === "UPCOMING" ? [
          { label: "Stage Status", value: "Pending Execution" },
          { label: "Assigned Tech", value: missionData?.technicianName || "Ahmed Khan" },
          { label: "Current State", value: missionData?.status || "ACCEPTED" }
        ] : [
          { label: "Status", value: missionData?.status ? missionData.status.replace(/_/g, " ") : "REPAIR IN PROGRESS" },
          { label: "Field Worker", value: missionData?.technicianName || "Ahmed Khan" },
          { label: "Photo Evidence", value: "Attached" }
        ]
      }
    },
    {
      id: "verified",
      stepNumber: 5,
      label: "Verified & Closed",
      sublabel: "Evidence Review",
      agent: "CompletionVerifierAgent",
      icon: CheckCircle2,
      details: {
        headline: "Autonomous Proof-of-Repair & Closure",
        description: "The system compares original and completion evidence. Low-confidence and safety-critical cases require operator review.",
        rulesApplied: [
          "Before / After visual delta verification",
          "Safety-critical auto-close gate (CRITICAL requires human operator)",
          "Automated resident resolution notification"
        ],
        getMetrics: (state) => state === "UPCOMING" ? [
          { label: "Stage Status", value: "Upcoming (Pending Repair)" },
          { label: "Evidence Gate", value: "Standby for Proof" },
          { label: "Current Case State", value: missionData?.status || "IN PROGRESS" }
        ] : [
          { label: "Vision Confidence", value: `${Math.round((missionData?.visionConfidence || 0.96) * 100)}%` },
          { label: "Asset Continuity", value: "Confirmed" },
          { label: "Mission Status", value: missionData?.status === "CLOSED" ? "RESOLVED & CLOSED" : (missionData?.status || "VERIFYING") }
        ]
      }
    }
  ];

  const currentIdx = stages.findIndex(s => s.id === currentStage);
  const selectedIdx = stages.findIndex(s => s.id === selectedStage);
  const activeDetails = stages.find(s => s.id === selectedStage)?.details;
  const activeStageObj = stages.find(s => s.id === selectedStage);

  const stageState: "COMPLETED" | "ACTIVE_NOW" | "UPCOMING" = 
    selectedIdx < currentIdx 
      ? "COMPLETED" 
      : selectedIdx === currentIdx 
      ? "ACTIVE_NOW" 
      : "UPCOMING";

  return (
    <div className="w-full space-y-4">
      {/* Visual Pipeline Bar */}
      <div className="bg-white dark:bg-[#0d0d10] border border-zinc-200 dark:border-zinc-800 rounded-xl p-4 sm:p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center space-x-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            <span className="text-xs font-semibold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
              Autonomous Mission Pipeline
            </span>
          </div>
          <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 hidden sm:inline">
            Strands Graph Active
          </span>
        </div>

        {/* Stepper Steps */}
        <div className="grid grid-cols-5 gap-2 relative">
          {stages.map((stage, idx) => {
            const Icon = stage.icon;
            const isCompleted = idx < currentIdx;
            const isCurrent = idx === currentIdx;
            const isSelected = stage.id === selectedStage;

            return (
              <button
                key={stage.id}
                type="button"
                onClick={() => {
                  if (interactive) {
                    setSelectedStage(stage.id);
                    onStageSelect?.(stage.id);
                  }
                }}
                className={`flex flex-col items-center text-center p-2 sm:p-2.5 rounded-lg transition-all duration-200 group relative ${
                  isSelected 
                    ? "bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-300 dark:border-zinc-700 shadow-sm" 
                    : "hover:bg-zinc-50 dark:hover:bg-zinc-900/50"
                }`}
              >
                {/* Step Circle Icon */}
                <div 
                  className={`h-8 w-8 sm:h-9 sm:w-9 rounded-full flex items-center justify-center transition-all duration-200 mb-1.5 shadow-sm ${
                    isCurrent 
                      ? "bg-emerald-500 text-white ring-4 ring-emerald-500/20 animate-pulse" 
                      : isCompleted
                      ? "bg-emerald-100 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800"
                      : "bg-zinc-100 dark:bg-zinc-800 text-zinc-400 border border-zinc-200 dark:border-zinc-700/60"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                </div>

                {/* Step Labels */}
                <span className={`text-[11px] sm:text-xs font-semibold leading-tight line-clamp-1 ${
                  isSelected 
                    ? "text-zinc-900 dark:text-white" 
                    : "text-zinc-700 dark:text-zinc-300"
                }`}>
                  {stage.label}
                </span>
                <span className="text-[10px] text-zinc-500 dark:text-zinc-400 hidden sm:block mt-0.5 font-mono">
                  {stage.sublabel}
                </span>

                {/* Active indicator dot */}
                {isCurrent && (
                  <span className="absolute -top-1 right-2 px-1 py-0.2 rounded-full text-[9px] font-bold font-mono bg-emerald-500 text-white uppercase tracking-wider shadow">
                    LIVE
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Selected Stage Detail Drawer */}
        {activeDetails && activeStageObj && (
          <div className="mt-4 pt-4 border-t border-zinc-200 dark:border-zinc-800/80 bg-slate-50/70 dark:bg-zinc-900/40 rounded-lg p-3.5 sm:p-4 text-left transition-all">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2.5">
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="text-[10px] font-mono border-emerald-300 bg-emerald-50 text-emerald-800 dark:border-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                  Node 0{activeStageObj.stepNumber} • {activeStageObj.agent}
                </Badge>
                {stageState === "COMPLETED" && (
                  <Badge className="text-[10px] font-mono bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20">
                    Stage Completed ✓
                  </Badge>
                )}
                {stageState === "ACTIVE_NOW" && (
                  <Badge className="text-[10px] font-mono bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20 animate-pulse">
                    Current Active Stage ●
                  </Badge>
                )}
                {stageState === "UPCOMING" && (
                  <Badge className="text-[10px] font-mono bg-zinc-200/60 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400 border-zinc-300 dark:border-zinc-700">
                    Upcoming Stage (Not Reached Yet)
                  </Badge>
                )}
              </div>
              <span className="text-[11px] text-zinc-500 font-mono">
                Click any step above to inspect
              </span>
            </div>

            <div className="flex items-center justify-between mt-1 mb-2">
              <h4 className="text-xs sm:text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                {activeDetails.headline}
              </h4>
            </div>

            <p className="text-xs text-zinc-600 dark:text-zinc-400 leading-relaxed mb-3">
              {activeDetails.description}
            </p>

            {/* Metrics pills */}
            <div className="grid grid-cols-3 gap-2 mb-3">
              {activeDetails.getMetrics(stageState).map((m, i) => (
                <div key={i} className="bg-white dark:bg-zinc-800/80 p-2 rounded border border-zinc-200 dark:border-zinc-700/60">
                  <div className="text-[10px] text-zinc-500 uppercase font-mono">{m.label}</div>
                  <div className="text-xs font-bold text-zinc-900 dark:text-zinc-100 font-mono mt-0.5">{m.value}</div>
                </div>
              ))}
            </div>

            {/* Rule tags */}
            <div className="flex flex-wrap gap-1.5">
              {activeDetails.rulesApplied.map((rule, i) => (
                <span 
                  key={i} 
                  className="inline-flex items-center text-[10px] px-2 py-0.5 rounded bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200 dark:border-zinc-700"
                >
                  <ShieldCheck className="h-2.5 w-2.5 mr-1 text-emerald-600 dark:text-emerald-400" />
                  {rule}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
