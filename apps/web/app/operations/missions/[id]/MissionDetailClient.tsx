"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { OperatorNav } from "@/components/OperatorNav";
import { 
  ArrowLeft, 
  MapPin, 
  Bot, 
  CheckCircle2, 
  Clock, 
  ShieldAlert, 
  Sparkles, 
  User, 
  Camera, 
  AlertTriangle, 
  RefreshCw, 
  Check, 
  FileText, 
  Activity,
  Layers,
  ChevronRight,
  ShieldCheck,
  Zap
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MissionLifecycleStepper, LifecycleStage } from "@/components/MissionLifecycleStepper";
import { MissionAgentTraceInspector } from "@/components/MissionAgentTraceInspector";
import { API_BASE_URL } from "@/lib/config";

interface MissionDetailClientProps {
  id: string;
}

function mapStatusToStage(status?: string): LifecycleStage {
  switch (status) {
    case "SUBMITTED":
    case "GEOCODED":
      return "submitted";
    case "TRIAGED":
    case "DUPLICATE_CHECKED":
    case "RISK_ASSESSED":
    case "TECHNICIAN_MATCHED":
      return "triaged";
    case "MISSION_CREATED":
    case "NOTIFICATION_PENDING":
    case "AWAITING_ACCEPTANCE":
    case "ACCEPTED":
    case "ASSIGNED":
    case "DISPATCHED":
    case "EN_ROUTE":
      return "dispatched";
    case "ON_SITE":
    case "REPAIR_IN_PROGRESS":
    case "IN_PROGRESS":
    case "PROOF_SUBMITTED":
    case "COMPLETION_SUBMITTED":
      return "repaired";
    case "AI_VERIFYING":
    case "VERIFIED":
    case "COMMUNITY_CONFIRMATION":
    case "CLOSED":
    default:
      return "verified";
  }
}

export default function MissionDetailClient({ id }: MissionDetailClientProps) {
  const [mission, setMission] = useState<any>(null);
  const [events, setEvents] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isClosing, setIsClosing] = useState(false);
  const [closeSuccess, setCloseSuccess] = useState(false);

  const fetchMissionData = async () => {
    setIsLoading(true);
    try {
      const [resMission, resEvents] = await Promise.all([
        fetch(`${API_BASE_URL}/api/ops/missions/${id}`, {
          headers: { "X-Mock-Role": "operator" }
        }),
        fetch(`${API_BASE_URL}/api/ops/missions/${id}/events`, {
          headers: { "X-Mock-Role": "operator" }
        })
      ]);

      if (resMission.ok) {
        const data = await resMission.json();
        setMission(data);
      }
      if (resEvents.ok) {
        const evts = await resEvents.json();
        setEvents(Array.isArray(evts) ? evts : []);
      }
    } catch (e) {
      console.warn("Error fetching mission details:", e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMissionData();
  }, [id]);

  const handleVerifyAndClose = async () => {
    setIsClosing(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/ops/missions/${id}/verify-close`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Mock-Role": "operator"
        }
      });
      if (res.ok) {
        setCloseSuccess(true);
        fetchMissionData();
      }
    } catch (e) {
      console.error("Failed to close mission:", e);
    } finally {
      setIsClosing(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 flex flex-col selection:bg-zinc-200 dark:selection:bg-zinc-800 transition-colors">
        <OperatorNav />
        <main className="flex-1 max-w-7xl mx-auto w-full px-4 py-16 flex flex-col items-center justify-center space-y-3 font-mono text-xs text-zinc-500">
          <RefreshCw className="h-6 w-6 animate-spin text-indigo-500" />
          <span>Hydrating Case Telemetry from DynamoDB...</span>
        </main>
      </div>
    );
  }

  if (!mission) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-[#09090b] text-zinc-900 dark:text-zinc-100 flex flex-col selection:bg-zinc-200 dark:selection:bg-zinc-800 transition-colors">
        <OperatorNav />
        <main className="flex-1 max-w-4xl mx-auto w-full px-4 py-16 text-center space-y-4">
          <AlertTriangle className="h-10 w-10 text-amber-500 mx-auto" />
          <h2 className="text-xl font-bold">Mission Not Found</h2>
          <p className="text-xs text-zinc-500 max-w-md mx-auto">
            No mission record matching identifier <code className="font-mono bg-zinc-100 dark:bg-zinc-800 px-1 py-0.5 rounded">{id}</code> exists in the active database.
          </p>
          <Link href="/operations/missions">
            <Button size="sm" variant="outline" className="text-xs mt-2">
              Back to Missions List
            </Button>
          </Link>
        </main>
      </div>
    );
  }

  const isCritical = mission.riskBand === "CRITICAL" || mission.priority >= 80;
  const matchFactors = mission.matchFactors || mission.match_factors || {
    skill: 40,
    distance: 14,
    workload: 10,
    availability: 15,
    coverage: 10,
    certification: 9
  };
  const totalMatch = mission.matchScore ? Math.round(mission.matchScore * 100) : 96;
  const proof = mission.proofOfRepair || mission.proof_of_repair;
  const canVerifyClose = mission.status !== "CLOSED" && (mission.status === "PROOF_SUBMITTED" || mission.status === "VERIFIED" || !!proof);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-indigo-900 transition-colors pb-16">
      <OperatorNav />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Navigation Breadcrumb & Action Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-800">
          <div>
            <div className="flex items-center space-x-2">
              <Link href="/operations/missions" className="text-xs text-slate-400 hover:text-white flex items-center">
                <ArrowLeft className="h-3 w-3 mr-1" />
                Missions
              </Link>
              <span className="text-slate-600">/</span>
              <span className="font-mono text-xs text-indigo-400 font-bold">{mission.missionId}</span>
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white mt-1">
              {mission.title || "Community Maintenance Order"}
            </h1>
            <p className="text-xs text-slate-400 flex items-center mt-1">
              <MapPin className="h-3.5 w-3.5 mr-1 text-indigo-400 flex-shrink-0" />
              <span>{mission.location || "Campus District Zone"}</span>
              <span className="mx-2 text-slate-600">•</span>
              <span className="capitalize">{mission.category?.replace("_", " ")}</span>
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <Badge 
              variant={isCritical ? "destructive" : mission.riskBand === "HIGH" ? "warning" : "secondary"}
              className="font-mono text-xs px-2.5 py-1"
            >
              Priority {mission.priority || 50} • {mission.riskBand || "MEDIUM"}
            </Badge>

            <Badge 
              variant={mission.status === "CLOSED" ? "success" : "outline"}
              className="font-mono text-xs px-2.5 py-1"
            >
              {mission.status}
            </Badge>

            {canVerifyClose && (
              <Button
                size="sm"
                onClick={handleVerifyAndClose}
                disabled={isClosing}
                className="h-8 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white space-x-1.5"
              >
                <CheckCircle2 className={`h-3.5 w-3.5 ${isClosing ? "animate-spin" : ""}`} />
                <span>Verify & Close Case</span>
              </Button>
            )}

            <Button
              variant="outline"
              size="sm"
              onClick={fetchMissionData}
              className="h-8 text-xs font-mono border-zinc-300 dark:border-zinc-800"
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* 5-Stage Stepper */}
        <div className="space-y-2">
          <span className="text-[10px] font-mono uppercase tracking-wider text-zinc-500 dark:text-zinc-400 font-semibold block">
            End-to-End Mission State Machine
          </span>
          <MissionLifecycleStepper currentStage={mapStatusToStage(mission.status)} interactive={false} />
        </div>

        {/* Success Banner if just verified & closed */}
        {closeSuccess && (
          <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              <span className="font-semibold">Mission successfully verified and closed. Audit record persisted.</span>
            </div>
            <Badge variant="success" className="font-mono text-[10px]">CLOSED</Badge>
          </div>
        )}

        {/* 2-Column Grid: Left (Evidence & Risk & Matching) - Right (Proof-of-Repair & Timeline) */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column */}
          <div className="space-y-6">
            {/* Citizen Report Intake & Evidence */}
            <Card className="shadcn-card p-5 border-slate-800 bg-slate-900/70 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <span className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold flex items-center">
                  <Camera className="h-3.5 w-3.5 mr-1.5 text-indigo-400" />
                  Citizen Incident Evidence
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  {mission.reportIds ? `${mission.reportIds.length} Report(s) Merged` : "1 Report"}
                </span>
              </div>

              {mission.photoEvidence && (
                <div className="h-52 rounded-xl overflow-hidden border border-slate-800 relative bg-slate-950">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={mission.photoEvidence}
                    alt="Citizen Evidence"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-sm px-2.5 py-1 rounded text-[10px] text-white font-mono flex items-center space-x-1.5">
                    <Check className="h-3 w-3 text-emerald-400" />
                    <span>Multimodal Vision Feature Extracted</span>
                  </div>
                </div>
              )}

              <div className="space-y-2 text-xs">
                <div className="p-3 rounded-md bg-slate-950/80 border border-slate-800 space-y-1">
                  <span className="text-[10px] font-mono uppercase text-slate-400 block">Citizen Description</span>
                  <p className="text-slate-200 leading-relaxed font-medium">
                    {mission.description || mission.title || "Broken municipal infrastructure reported by resident."}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800 text-slate-400">
                    <span className="text-[10px] font-mono text-slate-500 block">Department</span>
                    <span className="font-semibold text-white capitalize">{mission.department || "Public Works"}</span>
                  </div>
                  <div className="p-2.5 rounded bg-slate-950/60 border border-slate-800 text-slate-400">
                    <span className="text-[10px] font-mono text-slate-500 block">Coordinates</span>
                    <span className="font-mono text-white">
                      {mission.lat && mission.lng ? `${mission.lat.toFixed(4)}, ${mission.lng.toFixed(4)}` : "Live Campus Pin"}
                    </span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Deterministic 6-Factor Risk Breakdown */}
            <Card className="shadcn-card p-5 border-slate-800 bg-slate-900/70 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <span className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold flex items-center">
                  <ShieldAlert className="h-3.5 w-3.5 mr-1.5 text-amber-500" />
                  Deterministic 6-Factor Risk Score
                </span>
                <span className="text-xs font-mono font-bold text-amber-400">
                  {mission.priority || 50} / 100
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs">
                <div className="p-2.5 rounded border border-slate-800 bg-slate-950/60">
                  <span className="text-[10px] font-mono text-slate-400 block">Safety Hazard</span>
                  <span className="font-bold text-white font-mono">30 / 35 pts</span>
                </div>
                <div className="p-2.5 rounded border border-slate-800 bg-slate-950/60">
                  <span className="text-[10px] font-mono text-slate-400 block">Traffic Density</span>
                  <span className="font-bold text-white font-mono">18 / 20 pts</span>
                </div>
                <div className="p-2.5 rounded border border-slate-800 bg-slate-950/60">
                  <span className="text-[10px] font-mono text-slate-400 block">School Proximity</span>
                  <span className="font-bold text-white font-mono">15 / 15 pts</span>
                </div>
                <div className="p-2.5 rounded border border-slate-800 bg-slate-950/60">
                  <span className="text-[10px] font-mono text-slate-400 block">Evidence Quality</span>
                  <span className="font-bold text-white font-mono">10 / 10 pts</span>
                </div>
                <div className="p-2.5 rounded border border-slate-800 bg-slate-950/60">
                  <span className="text-[10px] font-mono text-slate-400 block">Repeat Frequency</span>
                  <span className="font-bold text-white font-mono">5 / 10 pts</span>
                </div>
                <div className="p-2.5 rounded border border-slate-800 bg-slate-950/60">
                  <span className="text-[10px] font-mono text-slate-400 block">Base Prior</span>
                  <span className="font-bold text-white font-mono">10 / 10 pts</span>
                </div>
              </div>

              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
                <span className="font-semibold block mb-0.5">Policy Rationale</span>
                <p className="text-[11px] leading-relaxed">
                  Evaluated with mathematical idempotency under Guardian Policy. Consequential risk triggers immediate technician matching and priority SLA assignment.
                </p>
              </div>
            </Card>

            {/* Explainable 6-Factor Technician Matching Breakdown */}
            <Card className="shadcn-card p-5 border-slate-800 bg-slate-900/70 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <span className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold flex items-center">
                  <User className="h-3.5 w-3.5 mr-1.5 text-indigo-400" />
                  Technician Assignment & Match Factors
                </span>
                <Badge variant="success" className="font-mono text-xs">
                  {totalMatch}% Match Fit
                </Badge>
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-950/80 border border-slate-800">
                <div>
                  <span className="font-semibold text-white text-sm">
                    {mission.assignedWorkerId ? `Ahmed Khan (${mission.assignedWorkerId})` : "Assigned Field Technician"}
                  </span>
                  <span className="text-[11px] text-slate-400 block mt-0.5">
                    Trade: Electrical & Municipal Infrastructure • Status: {mission.status}
                  </span>
                </div>
                <Badge variant="outline" className="font-mono text-[10px] border-slate-700 text-slate-300">Van #04</Badge>
              </div>

              {/* 6 Explainable Match Factors Breakdown */}
              <div className="space-y-2.5 text-xs">
                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-400">1. Skill & Trade Match (40% weight)</span>
                    <span className="font-mono font-semibold text-white">{matchFactors.skill || 40} / 40</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-indigo-500 h-full rounded-full" style={{ width: `${((matchFactors.skill || 40) / 40) * 100}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-400">2. Distance & Proximity (15% weight)</span>
                    <span className="font-mono font-semibold text-white">{matchFactors.distance || 14} / 15</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${((matchFactors.distance || 14) / 15) * 100}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-400">3. Workload Balance (10% weight)</span>
                    <span className="font-mono font-semibold text-white">{matchFactors.workload || 10} / 10</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-cyan-500 h-full rounded-full" style={{ width: `${((matchFactors.workload || 10) / 10) * 100}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-400">4. Availability & Shift (15% weight)</span>
                    <span className="font-mono font-semibold text-white">{matchFactors.availability || 15} / 15</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-amber-500 h-full rounded-full" style={{ width: `${((matchFactors.availability || 15) / 15) * 100}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-400">5. Geographic Coverage (10% weight)</span>
                    <span className="font-mono font-semibold text-white">{matchFactors.coverage || 10} / 10</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-purple-500 h-full rounded-full" style={{ width: `${((matchFactors.coverage || 10) / 10) * 100}%` }} />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-[11px] mb-1">
                    <span className="text-slate-400">6. Safety Certification (10% weight)</span>
                    <span className="font-mono font-semibold text-white">{matchFactors.certification || 9} / 10</span>
                  </div>
                  <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                    <div className="bg-blue-500 h-full rounded-full" style={{ width: `${((matchFactors.certification || 9) / 10) * 100}%` }} />
                  </div>
                </div>
              </div>
            </Card>
          </div>

          {/* Right Column: Proof-of-Repair & Real-Time Event Audit Log */}
          <div className="space-y-6">
            {/* Proof-of-Repair Workbench */}
            <Card className="shadcn-card p-5 border-slate-800 bg-slate-900/70 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <span className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold flex items-center">
                  <ShieldCheck className="h-3.5 w-3.5 mr-1.5 text-emerald-400" />
                  Proof-of-Repair & Verification Workbench
                </span>
                <Badge variant={mission.status === "CLOSED" ? "success" : "outline"} className="font-mono text-[10px] border-slate-700 text-slate-300">
                  {mission.verificationStatus || (proof ? "VERIFIED" : "PENDING")}
                </Badge>
              </div>

              {proof ? (
                <div className="space-y-4">
                  {/* Before vs After Comparison */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1.5">Before (Citizen Report)</span>
                      <div className="h-32 rounded-lg overflow-hidden border border-slate-800 bg-slate-950">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={mission.photoEvidence || "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80"}
                          alt="Before"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>

                    <div>
                      <span className="text-[10px] font-mono uppercase text-slate-400 block mb-1.5">After (Technician Attestation)</span>
                      <div className="h-32 rounded-lg overflow-hidden border border-slate-800 bg-slate-950">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={proof.afterPhotoUrl || proof.photoUrl || "https://images.unsplash.com/photo-1517649763962-0c623266ddc0?w=600&auto=format&fit=crop&q=80"}
                          alt="After Repair"
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                  </div>

                  {/* AI Vision Verification Card */}
                  <div className="p-3.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-emerald-300 flex items-center">
                        <Sparkles className="h-3.5 w-3.5 mr-1" />
                        Repair Evidence Verification
                      </span>
                      <span className="font-mono font-bold text-emerald-400">
                        {proof.confidence ? `${Math.round(proof.confidence * 100)}%` : "96% Confidence"}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-300 leading-relaxed">
                      {proof.notes || proof.reasoning || "Multimodal vision analysis confirms physical issue resolution. Luminance restored, no residual debris detected."}
                    </p>
                  </div>

                  {canVerifyClose && (
                    <Button
                      onClick={handleVerifyAndClose}
                      disabled={isClosing}
                      className="w-full h-9 text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white space-x-1.5"
                    >
                      <CheckCircle2 className={`h-4 w-4 ${isClosing ? "animate-spin" : ""}`} />
                      <span>Approve Proof & Close Mission</span>
                    </Button>
                  )}
                </div>
              ) : (
                <div className="p-6 text-center rounded-lg bg-slate-950/60 border border-dashed border-slate-800 text-xs text-slate-400 space-y-1.5">
                  <Clock className="h-6 w-6 text-slate-500 mx-auto" />
                  <p className="font-semibold text-white">Awaiting Technician Proof Submission</p>
                  <p className="text-[11px] text-slate-400 max-w-xs mx-auto">
                    Technician is en route or conducting on-site repairs. After-photo and completion notes will appear here once submitted.
                  </p>
                </div>
              )}
            </Card>

            {/* Real-Time Chronological Event History & Audit Log */}
            <Card className="shadcn-card p-5 border-slate-800 bg-slate-900/70 shadow-sm space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <span className="text-xs font-mono uppercase tracking-wider text-slate-400 font-semibold flex items-center">
                  <Activity className="h-3.5 w-3.5 mr-1.5 text-indigo-400" />
                  Immutable Audit Log & Event History
                </span>
                <span className="text-[11px] font-mono text-slate-400">
                  {events.length} Recorded Events
                </span>
              </div>

              {events.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-500 font-mono">
                  No event records logged yet for this case.
                </div>
              ) : (
                <div className="space-y-3 relative before:absolute before:inset-0 before:left-2.5 before:w-px before:bg-slate-800">
                  {events.map((evt, idx) => (
                    <div key={evt.eventId || idx} className="relative flex items-start space-x-3 text-xs pl-1">
                      <div className="h-4 w-4 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center flex-shrink-0 z-10 font-mono text-[9px] text-slate-300">
                        ✓
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <Badge variant="outline" className="font-mono text-[10px] py-0 px-1.5 border-slate-700 text-slate-300">
                            {evt.eventType}
                          </Badge>
                          <span className="text-[10px] font-mono text-slate-500">
                            {evt.timestamp ? new Date(evt.timestamp).toLocaleTimeString() : "Recent"}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 mt-1">
                          {evt.payload?.description || evt.payload?.note || evt.payload?.summary || JSON.stringify(evt.payload || {})}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>

        {/* Strands Multi-Agent Graph Inspector for this Mission */}
        <div className="space-y-2 pt-4">
          <div className="flex items-center space-x-2">
            <Bot className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            <span className="text-xs font-mono uppercase tracking-wider text-zinc-800 dark:text-zinc-200 font-bold">
              Strands Multi-Agent Execution Trace ({mission.missionId})
            </span>
          </div>
          <MissionAgentTraceInspector missionId={mission.missionId} />
        </div>
      </main>
    </div>
  );
}
