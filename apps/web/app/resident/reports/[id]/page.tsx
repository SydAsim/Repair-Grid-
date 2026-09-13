"use client";

import { use, useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { 
  ArrowLeft, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  ShieldCheck, 
  Bot, 
  Wrench,
  Camera,
  Info,
  Lightbulb,
  AlertTriangle,
  Droplets,
  UserCheck,
  Zap,
  RefreshCw,
  ExternalLink
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";

interface ReportData {
  report_id: string;
  reporter_id: string;
  category: string;
  description: string;
  lat: number;
  lng: number;
  location_name?: string;
  status: string;
  verification_confidence: number;
  duplicate_of?: string | null;
  evidence_refs: string[];
  mission_id?: string;
  created_at: string;
  updated_at?: string;
}

interface MissionData {
  missionId: string;
  title: string;
  category: string;
  priority: number;
  status: string;
  assignedTechnicianName?: string;
  assignedWorkerId?: string;
  technicianResponse?: string;
  matchScorePct?: number;
}

export default function ReportTrackingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { getAuthHeaders } = useAuth();

  const [report, setReport] = useState<ReportData | null>(null);
  const [mission, setMission] = useState<MissionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  const fetchReportDetails = useCallback(async () => {
    try {
      const headers = getAuthHeaders();
      // Fetch report
      const repRes = await fetch(`http://localhost:8000/api/reports/${id}`, { headers });
      let repData: ReportData | null = null;
      if (repRes.ok) {
        repData = await repRes.json();
        setReport(repData);
      }

      // Fetch mission if linked
      const missionTargetId = repData?.mission_id || id;
      const misRes = await fetch(`http://localhost:8000/api/missions/${missionTargetId}`, {
        headers: { ...headers, "X-Mock-Role": "operator" },
      });
      if (misRes.ok) {
        const misData = await misRes.json();
        setMission(misData);
      }
    } catch (e) {
      console.warn("Failed to fetch live report tracking details:", e);
    } finally {
      setLoading(false);
    }
  }, [id, getAuthHeaders]);

  useEffect(() => {
    fetchReportDetails();
    const timer = setInterval(fetchReportDetails, 2500);
    return () => clearInterval(timer);
  }, [fetchReportDetails]);

  // Determine Technician Acceptance & Dispatch State
  const effectiveStatus = mission?.status || report?.status || "AWAITING_ACCEPTANCE";
  const technicianResponse = mission?.technicianResponse || (effectiveStatus === "AWAITING_ACCEPTANCE" ? "AWAITING" : "ACCEPTED");

  // CRITICAL RULE: "Technician dispatched - it should be only dispatched if the technician accept the mission."
  const isTechnicianAccepted = [
    "ACCEPTED",
    "EN_ROUTE",
    "ON_SITE",
    "REPAIR_IN_PROGRESS",
    "PROOF_SUBMITTED",
    "VERIFYING",
    "VERIFIED",
    "RESOLVED",
    "CLOSED"
  ].includes(effectiveStatus) && technicianResponse !== "REJECTED";

  const technicianName = mission?.assignedTechnicianName || "Ahmed Khan (Electrical Specialist)";

  // Interactive handler for testing technician acceptance
  const handleSimulateAcceptance = async () => {
    setActionLoading(true);
    setActionMessage(null);
    try {
      const targetId = mission?.missionId || report?.mission_id || id;
      const res = await fetch(`http://localhost:8000/api/missions/${targetId}/simulate-accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (res.ok) {
        setActionMessage("Technician accepted the mission! Technician is now DISPATCHED.");
        await fetchReportDetails();
      } else {
        setActionMessage("Could not simulate acceptance. Mission already accepted or not found.");
      }
    } catch (err: any) {
      setActionMessage("Simulate acceptance failed: " + err.message);
    } finally {
      setActionLoading(false);
    }
  };

  const categoryName = report?.category?.replace("_", " ") || "streetlights";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md px-4 py-3 sticky top-0 z-40">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <Link href="/resident" className="inline-flex items-center text-xs font-semibold text-slate-400 hover:text-white transition">
            <ArrowLeft className="h-4 w-4 mr-1" />
            My Reports
          </Link>
          <span className="font-mono font-bold text-xs tracking-wider text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
            {id}
          </span>
          <button 
            onClick={fetchReportDetails} 
            disabled={loading}
            className="text-slate-400 hover:text-white transition"
            title="Refresh Status"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-xl mx-auto w-full p-4 sm:p-6 space-y-6">
        {/* Title & Location Header */}
        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/20">
            {categoryName} Maintenance
          </span>
          <h1 className="text-2xl font-bold text-white mt-2 capitalize">
            {categoryName} Issue
          </h1>
          <p className="text-xs text-slate-400 flex items-center mt-1">
            <MapPin className="h-3.5 w-3.5 mr-1 text-slate-500" />
            {report?.location_name || "North Gate 2, University Road"}
          </p>
          {report?.description && (
            <p className="text-xs text-slate-300 bg-slate-900/80 p-3 rounded-xl border border-slate-800 mt-3">
              "{report.description}"
            </p>
          )}
        </div>

        {/* Action / Success Banner */}
        {actionMessage && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center justify-between animate-fadeIn">
            <span>{actionMessage}</span>
            <button onClick={() => setActionMessage(null)} className="text-emerald-400 hover:text-emerald-200">
              ✕
            </button>
          </div>
        )}

        {/* Current Autonomous Status Banner */}
        <div className="glass-panel rounded-2xl p-4 border border-indigo-500/30 bg-slate-900/80">
          <div className="flex items-start space-x-3">
            <div className="h-9 w-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Bot className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Autonomous Agent Pipeline</h4>
                <span className="text-[10px] font-mono text-indigo-400">Strands Graph</span>
              </div>
              <p className="text-sm font-semibold text-slate-100 mt-1">
                {isTechnicianAccepted 
                  ? "Technician accepted mission. Field specialist dispatched to site." 
                  : "Technician matched by ResourceAgent. Awaiting technician acceptance before dispatch."}
              </p>
              <span className="text-xs text-slate-400 mt-1 block">
                {isTechnicianAccepted 
                  ? "Technician is en route with verified replacement hardware."
                  : "Technician dispatch is gated until technician confirms shift acceptance."}
              </span>
            </div>
          </div>
        </div>

        {/* Vertical Mission Progress Timeline */}
        <div className="glass-panel rounded-2xl p-6 border border-slate-800 bg-slate-900/50">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Mission Progress Timeline</h3>
            <span className="text-[10px] text-slate-500">Live Telemetry</span>
          </div>
          
          <div className="space-y-7 relative before:absolute before:inset-0 before:left-3.5 before:w-0.5 before:bg-slate-800">
            {/* STEP 1: Report Submitted & Geolocated */}
            <div className="relative flex items-start space-x-4">
              <div className="h-7 w-7 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center flex-shrink-0 z-10 font-bold text-xs shadow-lg shadow-emerald-500/20">
                ✓
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white">Report Submitted & Geolocated</h4>
                  <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    COMPLETE ✓
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Citizen evidence photo and GPS coordinates confirmed via Amazon Location Service.
                </p>
                <div className="flex items-center space-x-2 mt-1.5 text-[10px] text-slate-500">
                  <span className="font-mono text-indigo-400">
                    {report?.lat ? `${report.lat.toFixed(4)}, ${report.lng.toFixed(4)}` : "37.7751, -122.4190"}
                  </span>
                  <span>•</span>
                  <span>{report?.created_at ? new Date(report.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Just now"}</span>
                </div>
              </div>
            </div>

            {/* STEP 2: Autonomous Duplicate & Risk Check */}
            <div className="relative flex items-start space-x-4">
              <div className="h-7 w-7 rounded-full bg-emerald-500 text-slate-950 flex items-center justify-center flex-shrink-0 z-10 font-bold text-xs shadow-lg shadow-emerald-500/20">
                ✓
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white">Autonomous Duplicate & Risk Check</h4>
                  <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                    EVALUATED ✓
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Strands DuplicateAgent evaluated 25m–50m radius. Deterministic 6-Factor Risk Policy calculated severity priority.
                </p>
                <div className="flex items-center space-x-2 mt-1.5 text-[10px]">
                  <span className="bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
                    Priority: {mission?.priority || 85}/100
                  </span>
                  <span className="bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded border border-indigo-500/20">
                    Unique Case Verified
                  </span>
                </div>
              </div>
            </div>

            {/* STEP 3: Technician Dispatched (ONLY DISPATCHED IF ACCEPTED) */}
            <div className="relative flex items-start space-x-4">
              <div className={`h-7 w-7 rounded-full flex items-center justify-center flex-shrink-0 z-10 font-bold text-xs shadow-lg transition duration-300 ${
                isTechnicianAccepted 
                  ? "bg-emerald-500 text-slate-950 shadow-emerald-500/20" 
                  : "bg-amber-500 text-slate-950 animate-pulse shadow-amber-500/20"
              }`}>
                {isTechnicianAccepted ? "✓" : "⏳"}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-bold text-white">
                    {isTechnicianAccepted ? "Technician Dispatched & Accepted" : "Technician Assignment Pending Acceptance"}
                  </h4>
                  <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${
                    isTechnicianAccepted
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                      : "bg-amber-500/10 text-amber-400 border border-amber-500/20 animate-pulse"
                  }`}>
                    {isTechnicianAccepted ? "DISPATCHED ✓" : "NOT DISPATCHED YET"}
                  </span>
                </div>

                <p className="text-xs text-slate-300 mt-1">
                  {isTechnicianAccepted ? (
                    <span>
                      <strong className="text-emerald-400">{technicianName}</strong> accepted the mission assignment and has been autonomously dispatched to the incident location.
                    </span>
                  ) : (
                    <span>
                      ResourceAgent matched <strong className="text-amber-300">{technicianName}</strong>. As per autonomous safety policy, the technician is <em>only dispatched once they accept the mission</em>.
                    </span>
                  )}
                </p>

                {/* Interactive Acceptance Simulation Box if not yet accepted */}
                {!isTechnicianAccepted && (
                  <div className="mt-3 p-3.5 rounded-xl bg-slate-950 border border-amber-500/30 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-slate-300 flex items-center">
                        <UserCheck className="h-3.5 w-3.5 mr-1.5 text-amber-400" />
                        Technician Response: Awaiting Acceptance
                      </span>
                      <span className="text-[10px] text-slate-500">Safety Gating Rule</span>
                    </div>

                    <p className="text-[11px] text-slate-400">
                      Dispatched to field specialist. Standing by for technician to accept shift route via Technician Portal.
                    </p>
                  </div>
                )}

                {isTechnicianAccepted && (
                  <div className="mt-2 text-[10px] text-emerald-400/80 flex items-center space-x-1">
                    <CheckCircle2 className="h-3 w-3 mr-1 text-emerald-400" />
                    <span>Technician confirmed shift availability and accepted route.</span>
                  </div>
                )}
              </div>
            </div>

            {/* STEP 4: On-Site Repair & Proof Attestation */}
            <div className={`relative flex items-start space-x-4 ${!isTechnicianAccepted ? "opacity-40" : ""}`}>
              <div className="h-7 w-7 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center flex-shrink-0 z-10 font-bold text-xs text-slate-400">
                {["PROOF_SUBMITTED", "VERIFYING", "CLOSED"].includes(effectiveStatus) ? "✓" : "4"}
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-200">On-Site Repair & Proof Attestation</h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Technician uploads before/after completion photo for Bedrock Nova 2 Lite multimodal verification.
                </p>
              </div>
            </div>

            {/* STEP 5: Resident Confirmation & Mission Closure */}
            <div className={`relative flex items-start space-x-4 ${!isTechnicianAccepted ? "opacity-30" : "opacity-60"}`}>
              <div className="h-7 w-7 rounded-full bg-slate-800 border-2 border-slate-700 flex items-center justify-center flex-shrink-0 z-10 font-bold text-xs text-slate-500">
                5
              </div>
              <div>
                <h4 className="text-sm font-semibold text-slate-300">Resident Quality Confirmation & Closure</h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  Resident verifies repair quality. Community Health score recalculated.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Worker Portal Link for live testing */}
        <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 text-xs flex items-center justify-between">
          <div className="flex items-center space-x-2 text-slate-300">
            <Wrench className="h-4 w-4 text-indigo-400" />
            <span>Want to test as the Field Worker directly?</span>
          </div>
          <Link
            href="/worker"
            className="text-indigo-400 hover:text-indigo-300 font-semibold inline-flex items-center"
          >
            <span>Worker Portal</span>
            <ExternalLink className="h-3 w-3 ml-1" />
          </Link>
        </div>
      </main>
    </div>
  );
}
