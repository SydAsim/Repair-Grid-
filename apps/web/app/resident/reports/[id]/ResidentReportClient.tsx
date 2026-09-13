"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { 
  ArrowLeft, 
  MapPin, 
  Bot, 
  Info,
  Calendar,
  ShieldCheck
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ThemeToggle";
import { MissionLifecycleStepper, StageId } from "@/components/MissionLifecycleStepper";
import { API_BASE_URL } from "@/lib/config";

interface ReportData {
  report_id: string;
  category: string;
  description: string;
  lat: number;
  lng: number;
  location_name?: string;
  status: string;
  verification_confidence?: number;
  created_at?: string;
}

export default function ResidentReportClient({ id }: { id: string }) {
  const [report, setReport] = useState<ReportData | null>(null);
  const [mission, setMission] = useState<any | null>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const loadReportAndEvents = async () => {
    try {
      const [resRep, resEvt] = await Promise.all([
        fetch(`${API_BASE_URL}/api/reports/${id}`, {
          headers: {
            "X-Mock-Role": "resident",
            "X-Mock-User-Id": "resident-asim-001",
          },
        }),
        fetch(`${API_BASE_URL}/api/reports/${id}/events`, {
          headers: {
            "X-Mock-Role": "resident",
            "X-Mock-User-Id": "resident-asim-001",
          },
        })
      ]);

      if (resRep.ok) {
        const data = await resRep.json();
        setReport(data);

        const mId = data.mission_id;
        if (mId) {
          try {
            const resM = await fetch(`${API_BASE_URL}/api/missions/${mId}`, {
              headers: { "X-Mock-Role": "resident" }
            });
            if (resM.ok) {
              const mData = await resM.json();
              setMission(mData);
            }
          } catch (_) {}
        }
      }
      if (resEvt.ok) {
        const evts = await resEvt.json();
        setEvents(Array.isArray(evts) ? evts : []);
      }
    } catch (e) {
      console.warn("Could not fetch report details:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadReportAndEvents();
    const interval = setInterval(loadReportAndEvents, 3500);
    return () => clearInterval(interval);
  }, [id]);

  const categoryLabel = report?.category
    ? report.category.replace("_", " ").toUpperCase()
    : "CIVIC INFRASTRUCTURE";

  const displayTitle = report?.description || "Civic Maintenance Report";
  const displayLocation = report?.location_name || (report?.lat && report?.lng ? `${report.lat.toFixed(4)}, ${report.lng.toFixed(4)}` : "Reported Location Pin");

  const effectiveStatus = (report?.status === "CLOSED" || mission?.status === "CLOSED")
    ? "CLOSED"
    : (mission?.status || report?.status || "SUBMITTED");

  // Map report status to lifecycle stage
  const getStage = (status?: string): StageId => {
    switch (status) {
      case "RESOLVED":
      case "CLOSED":
        return "verified";
      case "PROOF_SUBMITTED":
      case "COMPLETION_SUBMITTED":
      case "ON_SITE":
      case "REPAIR_IN_PROGRESS":
      case "IN_PROGRESS":
        return "repaired";
      case "ASSIGNED":
      case "DISPATCHED":
      case "EN_ROUTE":
      case "ACCEPTED":
      case "AWAITING_ACCEPTANCE":
        return "dispatched";
      case "TRIAGED":
      case "DUPLICATE_CHECKED":
      case "VERIFYING":
      case "MERGED":
        return "triaged";
      case "SUBMITTED":
      case "GEOCODED":
      default:
        return "submitted";
    }
  };

  const getStatusBanner = (status?: string) => {
    switch (status) {
      case "CLOSED":
      case "RESOLVED":
        return {
          badgeText: "Case Verified & Closed",
          badgeColor: "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800",
          message: "The repair evidence was reviewed and the case was closed by Operations. Thank you for helping keep our community maintained."
        };
      case "VERIFIED":
        return {
          badgeText: "Evidence Review Complete",
          badgeColor: "text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 border-emerald-300 dark:border-emerald-800",
          message: "The repair evidence passed its automated checks and is awaiting final supervisor sign-off."
        };
      case "PROOF_SUBMITTED":
      case "COMPLETION_SUBMITTED":
        return {
          badgeText: "Repair Proof Submitted",
          badgeColor: "text-purple-700 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/60 border-purple-300 dark:border-purple-800",
          message: "The field technician submitted completion evidence. Quality review is now in progress."
        };
      case "REPAIR_IN_PROGRESS":
        return {
          badgeText: "Repair In Progress",
          badgeColor: "text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800",
          message: "Field technician is currently on site actively conducting physical repairs."
        };
      case "ON_SITE":
        return {
          badgeText: "Technician On Site",
          badgeColor: "text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800",
          message: "Technician has arrived at the incident location and verified the safety perimeter."
        };
      case "EN_ROUTE":
        return {
          badgeText: "Technician En Route",
          badgeColor: "text-blue-700 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 border-blue-300 dark:border-blue-800",
          message: "Technician has departed and is currently en route to the reported site."
        };
      case "ACCEPTED":
        return {
          badgeText: "Technician Assigned & Accepted",
          badgeColor: "text-indigo-700 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 border-indigo-300 dark:border-indigo-800",
          message: "Technician has accepted the mission assignment and is preparing the required equipment and tools."
        };
      case "AWAITING_ACCEPTANCE":
        return {
          badgeText: "Awaiting Worker Acceptance",
          badgeColor: "text-zinc-700 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800/80 border-zinc-300 dark:border-zinc-700",
          message: "Mission matched and dispatched. Awaiting confirmation from the assigned field technician."
        };
      case "SUBMITTED":
      default:
        return {
          badgeText: "Report Ingested",
          badgeColor: "text-zinc-700 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800/80 border-zinc-300 dark:border-zinc-700",
          message: "Report received into Strands Graph. Multi-agent triaging, spatial deduplication, and risk scoring in progress."
        };
    }
  };

  const banner = getStatusBanner(effectiveStatus);
  const techName = mission?.assigned_technician_name || mission?.assignedTechnicianName || "Ahmed Khan";
  const techMatchPct = mission?.match_score_pct || mission?.matchScorePct || 85;
  const riskScoreVal = mission?.risk_score || mission?.riskScore || 48;
  const riskBandVal = mission?.risk_band || mission?.riskBand || "MEDIUM";

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 flex flex-col selection:bg-zinc-200 dark:selection:bg-zinc-800 transition-colors">
      <header className="border-b border-zinc-200 dark:border-zinc-800/80 bg-white/80 dark:bg-[#09090b]/80 backdrop-blur-xl px-4 sm:px-6 h-14 sticky top-0 z-40 flex items-center justify-between transition-colors">
        <Link 
          href="/resident" 
          className="inline-flex items-center text-xs font-medium text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5 mr-1 text-zinc-400 dark:text-zinc-500" />
          My Reports
        </Link>
        <span className="font-mono text-xs text-zinc-700 dark:text-zinc-300 font-semibold">{id}</span>
        <ThemeToggle />
      </header>

      <main className="flex-1 max-w-xl mx-auto w-full p-4 sm:p-6 space-y-5">
        {/* Title & Location */}
        <div>
          <Badge variant="outline" className="text-[10px] font-mono text-zinc-600 dark:text-zinc-400 border-zinc-300 dark:border-zinc-800">
            {categoryLabel}
          </Badge>
          <h1 className="text-xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50 mt-1.5 line-clamp-2">
            {displayTitle}
          </h1>
          <p className="text-xs text-zinc-600 dark:text-zinc-400 flex items-center mt-1">
            <MapPin className="h-3.5 w-3.5 mr-1.5 text-indigo-500 flex-shrink-0" />
            <span className="font-medium text-zinc-800 dark:text-zinc-200">{displayLocation}</span>
          </p>
        </div>

        {/* 5-Stage Visual Stepper */}
        <MissionLifecycleStepper 
          currentStage={getStage(effectiveStatus)} 
          interactive={true} 
          missionData={{
            status: effectiveStatus,
            riskScore: riskScoreVal,
            riskBand: riskBandVal,
            locationName: displayLocation,
            technicianName: techName,
            matchScorePct: techMatchPct,
            visionConfidence: mission?.verification_result?.confidence || mission?.verificationResult?.confidence || 0.96
          }}
        />

        {/* Current Autonomous Agent Status Banner */}
        <Card className="shadcn-card p-4 border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900/40 shadow-sm">
          <div className="flex items-start space-x-3">
            <div className="h-8 w-8 rounded-lg bg-indigo-50 dark:bg-zinc-800 text-indigo-600 dark:text-zinc-300 flex items-center justify-center border border-indigo-200 dark:border-zinc-700/60 flex-shrink-0 mt-0.5">
              <Bot className="h-4 w-4" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold">
                  AgentCore Graph Active Telemetry
                </span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-semibold ${banner.badgeColor}`}>
                  {banner.badgeText}
                </span>
              </div>
              <p className="text-xs font-medium text-zinc-800 dark:text-zinc-200 mt-1 leading-relaxed">
                {banner.message}
              </p>
              <span className="text-[11px] font-mono text-zinc-500 dark:text-zinc-400 mt-1 block">
                Lifecycle State: <strong className="text-zinc-800 dark:text-zinc-200">{effectiveStatus}</strong>
              </span>
            </div>
          </div>
        </Card>

        {/* Vertical Timeline Card */}
        <Card className="shadcn-card p-5 border-zinc-200 dark:border-zinc-800 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[11px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold">
              Mission Progress Timeline
            </span>
            <span className="text-[10px] font-mono text-emerald-600 dark:text-emerald-400">
              ● Live Multi-Agent Updates
            </span>
          </div>
          
          {events.length === 0 ? (
            <div className="space-y-4 relative before:absolute before:inset-0 before:left-3 before:w-px before:bg-zinc-200 dark:before:bg-zinc-800">
              <div className="relative flex items-start space-x-3.5">
                <div className="h-6 w-6 rounded-full bg-emerald-500 text-white flex items-center justify-center flex-shrink-0 z-10 font-bold text-xs shadow-sm">
                  ✓
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">Report Submitted & Geocoded</h4>
                  <p className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-0.5">Photo and coordinates logged into Strands Multi-Agent Graph.</p>
                  <span className="text-[10px] font-mono text-zinc-500 mt-0.5 block">
                    {report?.created_at ? new Date(report.created_at).toLocaleTimeString() : "Just now"}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 relative before:absolute before:inset-0 before:left-3 before:w-px before:bg-zinc-200 dark:before:bg-zinc-800">
              {events.map((evt, idx) => {
                const isLatest = idx === events.length - 1;
                return (
                  <div key={evt.eventId || idx} className="relative flex items-start space-x-3.5">
                    <div className={`h-6 w-6 rounded-full flex items-center justify-center flex-shrink-0 z-10 font-bold text-xs shadow-sm ${
                      isLatest ? "bg-indigo-600 text-white animate-pulse" : "bg-emerald-500 text-white"
                    }`}>
                      {isLatest ? "●" : "✓"}
                    </div>
                    <div>
                      <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 capitalize">
                        {evt.eventType.toLowerCase().replace(/_/g, " ")}
                      </h4>
                      <p className="text-[11px] text-zinc-600 dark:text-zinc-400 mt-0.5">
                        {evt.payload?.description || evt.payload?.note || evt.payload?.summary || "Automated state transition verified."}
                      </p>
                      <span className="text-[10px] font-mono text-zinc-500 mt-0.5 block">
                        {evt.timestamp ? new Date(evt.timestamp).toLocaleTimeString() : "Recent"}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </Card>

        {/* Explainable AI Decision Card */}
        <Card className="shadcn-card p-5 border-zinc-200 dark:border-zinc-800 shadow-sm bg-gradient-to-br from-white to-slate-50 dark:from-[#0d0d10] dark:to-zinc-900">
          <div className="flex items-center space-x-2 mb-3">
            <Info className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <h3 className="text-xs font-bold text-zinc-900 dark:text-zinc-100 uppercase tracking-wider font-mono">
              Explainable AI: Case Resolution Architecture
            </h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-zinc-900 dark:text-white">Deterministic 6-Factor Risk Score</span>
                <Badge variant="outline" className="font-mono text-[10px] text-amber-600 dark:text-amber-400">
                  {effectiveStatus === "CLOSED" ? "Resolved" : `Score: ${riskScoreVal} (${riskBandVal})`}
                </Badge>
              </div>
              <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Evaluated across pedestrian hazard severity, traffic density on {displayLocation}, school proximity buffer, duplicate clustering, and historical infrastructure wear.
              </p>
            </div>

            <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60">
              <div className="flex items-center justify-between mb-1">
                <span className="font-semibold text-zinc-900 dark:text-white">Technician Matching Policy</span>
                <span className="font-mono text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                  {techName} ({techMatchPct}% Match)
                </span>
              </div>
              <p className="text-[11px] text-zinc-600 dark:text-zinc-400 leading-relaxed">
                Autonomous ResourceAgent matched field technician on trade certification, GPS travel proximity, van inventory tools, and current shift availability.
              </p>
            </div>
          </div>
        </Card>
      </main>
    </div>
  );
}
