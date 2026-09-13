"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  MapPin, 
  Navigation, 
  Wrench, 
  Bot, 
  CheckCircle2, 
  Clock, 
  Sparkles, 
  Check, 
  FileText,
  Camera,
  AlertTriangle,
  Zap,
  ExternalLink,
  ShieldCheck,
  UserCheck
} from "lucide-react";
import { MissionLifecycleStepper, StageId } from "@/components/MissionLifecycleStepper";
import { API_BASE_URL, getApiBaseUrl } from "@/lib/config";
import { useWorkerAuth } from "@/lib/auth-context";

interface WorkerMissionClientProps {
  id: string;
  initialMission?: any;
}

export default function WorkerMissionClient({ id, initialMission }: WorkerMissionClientProps) {
  const router = useRouter();
  const { getAuthHeaders } = useWorkerAuth();

  const [missionId, setMissionId] = useState<string>(() => {
    if (id && id !== "default") return id;
    if (typeof window !== "undefined") {
      const searchParam = new URLSearchParams(window.location.search).get("id");
      if (searchParam) return searchParam;
      const parts = window.location.pathname.split("/").filter(Boolean);
      // ["worker", "missions", "RG-M-XXXX"]
      const lastPart = parts[parts.length - 1];
      if (lastPart && lastPart !== "default" && lastPart !== "missions") return lastPart;
    }
    return id || "default";
  });

  const [mission, setMission] = useState<any>(initialMission || null);
  const [loading, setLoading] = useState(!initialMission);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      const searchParam = new URLSearchParams(window.location.search).get("id");
      const parts = window.location.pathname.split("/").filter(Boolean);
      const lastPart = parts[parts.length - 1];
      const resolved = searchParam || (lastPart && lastPart !== "default" && lastPart !== "missions" ? lastPart : id);
      if (resolved && resolved !== "default" && resolved !== missionId) {
        setMissionId(resolved);
      }
    }
  }, [id, missionId]);

  const fetchMission = async () => {
    try {
      const baseUrl = getApiBaseUrl();
      let targetId = missionId && missionId !== "default" ? missionId : (id && id !== "default" ? id : null);

      if (!targetId) {
        try {
          const listRes = await fetch(`${baseUrl}/api/missions/assigned`, {
            headers: getAuthHeaders(),
            cache: "no-store"
          });
          if (listRes.ok) {
            const list = await listRes.json();
            if (Array.isArray(list) && list.length > 0) {
              const foundId = list[0].mission_id || list[0].missionId;
              if (foundId && typeof foundId === "string") {
                targetId = foundId;
                setMissionId(foundId);
              }
            }
          }
        } catch (_) {}
      }

      if (!targetId) targetId = "RG-M-DE042E";

      const res = await fetch(`${baseUrl}/api/missions/${targetId}`, {
        headers: getAuthHeaders(),
        cache: "no-store"
      });
      if (res.ok) {
        const data = await res.json();
        setMission(data);
      }
    } catch (e) {
      console.error("Failed to load mission:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMission();
    // Poll every 3 seconds for real-time mission state changes
    const timer = setInterval(fetchMission, 3000);
    return () => clearInterval(timer);
  }, [missionId]);

  const mapStageToStepper = (status?: string): StageId => {
    if (!status) return "submitted";
    switch (status) {
      case "SUBMITTED":
      case "GEOCODED":
        return "submitted";
      case "TRIAGED":
      case "DUPLICATE_CHECKED":
      case "RISK_ASSESSED":
      case "TECHNICIAN_MATCHED":
        return "triaged";
      case "AWAITING_ACCEPTANCE":
      case "ACCEPTED":
      case "EN_ROUTE":
      case "DISPATCHED":
        return "dispatched";
      case "ON_SITE":
      case "REPAIR_IN_PROGRESS":
      case "IN_PROGRESS":
      case "PROOF_SUBMITTED":
      case "COMPLETION_SUBMITTED":
        return "repaired";
      case "VERIFYING":
      case "AI_VERIFYING":
      case "VERIFIED":
      case "CLOSED":
      default:
        return "verified";
    }
  };

  const handleAction = async (action: "accept" | "en-route" | "on-site" | "start") => {
    setActionLoading(true);
    try {
      const baseUrl = getApiBaseUrl();
      await fetch(`${baseUrl}/api/missions/${missionId}/${action}`, {
        method: "POST",
        headers: getAuthHeaders()
      });
      await fetchMission();
    } catch (e) {
      console.error(`Action ${action} error`, e);
    } finally {
      setActionLoading(false);
    }
  };

  const factors = mission?.match_factors || {
    skill: 40,
    distance: 14,
    workload: 10,
    availability: 15,
    coverage: 9,
    certification: 8
  };

  const priorityScore = mission?.priority || mission?.risk_score || 50;
  const isHighRisk = mission?.risk_band === "HIGH" || mission?.risk_band === "CRITICAL" || priorityScore >= 70;
  const missionTitle = mission?.title || `Repair ${mission?.category || "Infrastructure"} Incident`;
  const locationText = mission?.location || "Assigned Campus Coordinate";
  const incidentDesc = mission?.description || "No description provided.";
  const displayStatus = (mission?.status || "AWAITING_ACCEPTANCE").replaceAll("_", " ");

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-amber-500 selection:text-slate-950">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md px-4 sm:px-6 py-3 sticky top-0 z-40 flex items-center justify-between">
        <Link 
          href="/worker" 
          className="inline-flex items-center text-xs font-semibold text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Back to Shift
        </Link>
        <div className="flex items-center space-x-2">
          <span className="font-mono text-xs font-bold text-amber-400 uppercase tracking-wider">
            MISSION {missionId}
          </span>
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
        </div>
        <div className="w-16 text-right">
          <span className="text-[10px] font-mono text-slate-400 bg-slate-800/80 px-2 py-1 rounded">
            LIVE SYNC
          </span>
        </div>
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full p-4 sm:p-6 space-y-5">
        {/* Mission Title & Badges */}
        <div className="space-y-2">
          <div className="flex items-center flex-wrap gap-2">
            <span className={`text-[10px] font-bold font-mono px-2.5 py-0.5 rounded-full border ${
              isHighRisk 
                ? "text-rose-400 bg-rose-500/15 border-rose-500/30" 
                : "text-amber-400 bg-amber-500/15 border-amber-500/30"
            }`}>
              {mission?.risk_band || "MEDIUM"} PRIORITY • {priorityScore}
            </span>
            <span className="text-[10px] font-bold font-mono text-indigo-400 bg-indigo-500/15 border border-indigo-500/30 px-2.5 py-0.5 rounded-full uppercase">
              {mission?.department || "ELECTRICAL"} DEPT
            </span>
            <span className="text-[10px] font-bold font-mono text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 rounded-full uppercase">
              {displayStatus}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
            {missionTitle}
          </h1>
        </div>

        {/* 5-Stage Visual Stepper */}
        <div className="glass-panel rounded-2xl p-4 border border-slate-800 bg-slate-900/60 shadow-lg">
          <MissionLifecycleStepper currentStage={mapStageToStepper(mission?.status)} interactive={true} />
        </div>

        {/* Citizen Problem Report Card */}
        <div className="glass-panel rounded-2xl p-5 border border-amber-500/30 bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/20 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="h-7 w-7 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center">
                <FileText className="h-4 w-4" />
              </div>
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                Resident Problem Brief
              </span>
            </div>
            <span className="text-[10px] font-semibold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
              Live Submission
            </span>
          </div>
          <p className="text-sm font-medium text-slate-100 leading-relaxed bg-slate-950/80 p-3.5 rounded-xl border border-slate-800">
            &ldquo;{incidentDesc}&rdquo;
          </p>
          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
            <span>Category: <strong className="text-slate-200 capitalize">{(mission?.category || "Infrastructure").replace("_", " ")}</strong></span>
            <span>Skill Match: <strong className="text-emerald-400 capitalize">{(mission?.required_skill || "General").replace("_", " ")}</strong></span>
          </div>
        </div>

        {/* Target Location Card */}
        <div className="glass-panel rounded-2xl p-4 border border-slate-800 bg-slate-900/70 shadow flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Target Incident Location
            </span>
            <h4 className="text-sm font-bold text-white flex items-center">
              <MapPin className="h-4 w-4 mr-1 text-rose-400 shrink-0" />
              <span>{locationText}</span>
            </h4>
            {mission?.coordinates && (
              <span className="text-[11px] font-mono text-indigo-400 block pl-5">
                {mission.coordinates.lat.toFixed(4)}, {mission.coordinates.lng.toFixed(4)} • Verified GPS
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => alert(`Amazon Location Routes: Calculating shortest route to ${locationText}...`)}
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white transition flex items-center space-x-1.5 shadow-lg shadow-indigo-600/20"
          >
            <Navigation className="h-3.5 w-3.5" />
            <span>Navigate</span>
          </button>
        </div>

        {/* Citizen Photo Evidence (if present) */}
        {mission?.photo_evidence && (
          <div className="glass-panel rounded-2xl p-4 border border-slate-800 bg-slate-900/70 shadow space-y-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center">
              <Camera className="h-3.5 w-3.5 mr-1.5 text-indigo-400" />
              Resident Photographic Evidence
            </span>
            <div className="relative h-44 w-full rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
              <img 
                src={mission.photo_evidence.startsWith('http') || mission.photo_evidence.startsWith('data:') ? mission.photo_evidence : `/${mission.photo_evidence}`} 
                alt="Citizen Evidence" 
                onError={(e) => {
                  (e.currentTarget.parentElement as HTMLElement).style.display = 'none';
                }}
                className="w-full h-full object-cover"
              />
            </div>
          </div>
        )}

        {/* Autonomous AI Match Rationale */}
        <div className="glass-panel rounded-2xl p-4 border border-indigo-500/25 bg-slate-900/70 shadow space-y-2.5">
          <div className="flex items-center space-x-2">
            <Bot className="h-4 w-4 text-indigo-400" />
            <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider">
              Autonomous Dispatch Rationale (ResourceAgent)
            </span>
          </div>
          <div className="text-xs space-y-1.5 bg-slate-950/80 p-3 rounded-xl border border-slate-800 font-mono">
            <div className="flex justify-between">
              <span className="text-slate-400">Trade Skill Match (40% max):</span>
              <span className="text-emerald-400 font-bold">+{factors.skill}% (Qualified)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Shift Availability (15% max):</span>
              <span className="text-emerald-400 font-bold">+{factors.availability}% (On Duty)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Sector Proximity (15% max):</span>
              <span className="text-emerald-400 font-bold">+{factors.distance}% (Dispatched Zone)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Zone Coverage (10% max):</span>
              <span className="text-emerald-400 font-bold">+{factors.coverage}%</span>
            </div>
            <div className="flex justify-between pt-1.5 border-t border-slate-800 text-indigo-400 font-bold">
              <span>Total Match Score:</span>
              <span>{mission?.match_score ? `${Math.round(mission.match_score * 100)}%` : "85%"} Ranked Fit</span>
            </div>
          </div>
        </div>

        {/* Dynamic Technician Action Controls */}
        <div className="pt-2 space-y-2">
          {mission?.status === "AWAITING_ACCEPTANCE" && (
            <button
              type="button"
              onClick={() => handleAction("accept")}
              disabled={actionLoading}
              className="w-full py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-60 text-xs font-bold text-white transition flex items-center justify-center space-x-2 shadow-lg shadow-indigo-600/30"
            >
              <Check className="h-4 w-4" />
              <span>{actionLoading ? "Accepting..." : "Accept Mission Assignment"}</span>
            </button>
          )}

          {mission?.status === "ACCEPTED" && (
            <button
              type="button"
              onClick={() => handleAction("en-route")}
              disabled={actionLoading}
              className="w-full py-3.5 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-60 text-xs font-bold text-slate-950 transition flex items-center justify-center space-x-2 shadow-lg shadow-amber-600/30 font-extrabold"
            >
              <Navigation className="h-4 w-4" />
              <span>{actionLoading ? "Updating..." : "Mark En Route to Incident Site"}</span>
            </button>
          )}

          {mission?.status === "EN_ROUTE" && (
            <button
              type="button"
              onClick={() => handleAction("on-site")}
              disabled={actionLoading}
              className="w-full py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-xs font-bold text-white transition flex items-center justify-center space-x-2 shadow-lg shadow-blue-600/30"
            >
              <MapPin className="h-4 w-4" />
              <span>{actionLoading ? "Confirming..." : "Confirm Arrival On Site"}</span>
            </button>
          )}

          {mission?.status === "ON_SITE" && (
            <button
              type="button"
              onClick={() => handleAction("start")}
              disabled={actionLoading}
              className="w-full py-3.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-60 text-xs font-bold text-white transition flex items-center justify-center space-x-2 shadow-lg shadow-purple-600/30"
            >
              <Wrench className="h-4 w-4" />
              <span>{actionLoading ? "Starting..." : "Start Repair Operations"}</span>
            </button>
          )}

          {(mission?.status === "REPAIR_IN_PROGRESS" || mission?.status === "IN_PROGRESS") && (
            <button
              type="button"
              onClick={() => { window.location.href = `/worker/missions/${missionId}/complete/`; }}
              className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white transition flex items-center justify-center space-x-2 shadow-lg shadow-emerald-600/30"
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>Complete Work & Submit Proof</span>
            </button>
          )}

          {(mission?.status === "PROOF_SUBMITTED" || mission?.status === "VERIFIED" || mission?.status === "CLOSED") && (
            <div className="p-4 text-center rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-mono font-semibold flex items-center justify-center gap-2">
              <CheckCircle2 className="h-4 w-4" />
              <span>Proof Submitted • Verification Status: {mission?.status}</span>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
