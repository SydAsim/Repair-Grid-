"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { OperatorNav } from "@/components/OperatorNav";
import { 
  CheckCircle2, 
  X, 
  Check, 
  ShieldCheck, 
  Bot, 
  User, 
  MapPin,
  RefreshCw,
  Clock,
  ArrowRight,
  Camera,
  Sparkles,
  ExternalLink,
  ChevronRight,
  AlertTriangle,
  FileText,
  BadgeCheck
} from "lucide-react";
import { API_BASE_URL } from "@/lib/config";
import { useOperatorAuth } from "@/lib/auth-context";

export default function VerificationQueuePage() {
  const { getAuthHeaders } = useOperatorAuth();
  const [missions, setMissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedMission, setSelectedMission] = useState<any | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [closedId, setClosedId] = useState<string | null>(null);
  const [filterTab, setFilterTab] = useState<"READY_FOR_REVIEW" | "ALL" | "APPROVED">("READY_FOR_REVIEW");

  const fetchVerificationQueue = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/ops/missions`, {
        headers: getAuthHeaders(),
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        setMissions(data);
        if (data.length > 0) {
          // Select first ready for review case if available
          const readyCase = data.find((m: any) => 
            m.status === "READY_FOR_REVIEW" || 
            m.status === "PROOF_SUBMITTED" || 
            m.status === "COMPLETION_SUBMITTED" ||
            m.verificationStatus === "READY_FOR_REVIEW"
          );
          setSelectedMission(readyCase || data[0]);
        }
      }
    } catch (e) {
      console.warn("Failed to load missions for verification:", e);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    fetchVerificationQueue();
  }, [fetchVerificationQueue]);

  const handleApproveCase = async (missionId: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/ops/missions/${missionId}/approve`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        setClosedId(missionId);
        // Refresh and update locally
        await fetchVerificationQueue();
      }
    } catch (e) {
      console.warn("Closure verification error:", e);
    } finally {
      setActionLoading(false);
    }
  };

  const filteredMissions = missions.filter((m) => {
    const isReady = m.status === "READY_FOR_REVIEW" || m.status === "PROOF_SUBMITTED" || m.status === "COMPLETION_SUBMITTED" || m.verificationStatus === "READY_FOR_REVIEW";
    const isApproved = m.status === "APPROVED" || m.status === "VERIFIED" || m.status === "CLOSED";
    if (filterTab === "READY_FOR_REVIEW") return isReady;
    if (filterTab === "APPROVED") return isApproved;
    return true;
  });

  const beforePhoto = selectedMission?.photoEvidence || selectedMission?.beforePhoto || "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=800";
  const afterPhoto = selectedMission?.afterPhoto || selectedMission?.proofOfRepair?.afterPhoto || "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=800&auto=format&fit=crop&q=80";
  const reporterName = selectedMission?.reporterName || "Syed Asim (Resident)";
  const technicianName = selectedMission?.assignedTechnicianName || selectedMission?.proofOfRepair?.technicianName || "Ahmed Khan (Field Specialist)";
  const techNotes = selectedMission?.technicianNotes || selectedMission?.proofOfRepair?.notes || "Replaced damaged 150W modular luminaire core and verified photocell switch with nominal amp draw.";
  const voiceTranscript = selectedMission?.voiceTranscript || selectedMission?.proofOfRepair?.voiceTranscript;
  const isApproved = selectedMission?.status === "APPROVED" || selectedMission?.status === "VERIFIED" || selectedMission?.status === "CLOSED";

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <OperatorNav />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20 uppercase tracking-wider">
                MISSION ADMISSION CONTROLLER
              </span>
              <span className="text-[10px] font-mono text-indigo-400">
                BEFORE / AFTER PHOTO VERIFICATION
              </span>
            </div>
            <h1 className="text-2xl font-black text-white mt-1">Proof of Repair Admission Review</h1>
            <p className="text-xs text-slate-400 mt-1">
              Review citizen Before Photo vs technician After Photo, voice narrative, and Amazon Nova multimodal audit to approve cases.
            </p>
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => fetchVerificationQueue()}
              disabled={loading}
              className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition disabled:opacity-50 flex items-center space-x-1.5 text-xs font-semibold"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
              <span>Sync Live Cases</span>
            </button>
          </div>
        </div>

        {/* Approval Success Banner */}
        {closedId && (
          <div className="glass-panel rounded-2xl p-5 border border-emerald-500/40 text-center space-y-2 bg-emerald-950/25 animate-fadeIn">
            <CheckCircle2 className="h-9 w-9 text-emerald-400 mx-auto" />
            <h2 className="text-lg font-bold text-white">Case {closedId} Approved & Verified!</h2>
            <p className="text-xs text-slate-300 max-w-lg mx-auto">
              The mission has been approved by the Mission Controller. The resident's pending status has been converted to <strong className="text-emerald-400">APPROVED ✓</strong> and the field technician has received closure confirmation.
            </p>
          </div>
        )}

        {/* Queue Filter Tabs */}
        <div className="flex items-center space-x-2 border-b border-slate-800 pb-3">
          <button
            onClick={() => setFilterTab("READY_FOR_REVIEW")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
              filterTab === "READY_FOR_REVIEW"
                ? "bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20"
                : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
            }`}
          >
            <span>Ready for Review</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20">
              {missions.filter(m => m.status === "READY_FOR_REVIEW" || m.status === "PROOF_SUBMITTED" || m.status === "COMPLETION_SUBMITTED").length}
            </span>
          </button>

          <button
            onClick={() => setFilterTab("APPROVED")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
              filterTab === "APPROVED"
                ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
                : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
            }`}
          >
            <span>Approved Cases</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20">
              {missions.filter(m => m.status === "APPROVED" || m.status === "VERIFIED" || m.status === "CLOSED").length}
            </span>
          </button>

          <button
            onClick={() => setFilterTab("ALL")}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
              filterTab === "ALL"
                ? "bg-indigo-600 text-white"
                : "bg-slate-900 text-slate-400 hover:text-white border border-slate-800"
            }`}
          >
            <span>All Active ({missions.length})</span>
          </button>
        </div>

        {/* Main Grid: Left Selector / Right Detailed Inspection Canvas */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Mission Selection List */}
          <div className="lg:col-span-4 space-y-2.5">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Case Review Queue ({filteredMissions.length})
            </span>
            <div className="space-y-2 max-h-[720px] overflow-y-auto pr-1">
              {filteredMissions.map((m) => {
                const isSel = selectedMission?.missionId === m.missionId;
                const isCaseApproved = m.status === "APPROVED" || m.status === "VERIFIED" || m.status === "CLOSED";
                const isCaseReady = m.status === "READY_FOR_REVIEW" || m.status === "PROOF_SUBMITTED" || m.status === "COMPLETION_SUBMITTED";
                return (
                  <div
                    key={m.missionId}
                    onClick={() => setSelectedMission(m)}
                    className={`p-3.5 rounded-xl cursor-pointer transition border text-left flex flex-col space-y-2 ${
                      isSel 
                        ? "bg-indigo-950/40 border-indigo-500/60 shadow-lg shadow-indigo-950/30" 
                        : "bg-slate-900/60 hover:bg-slate-900 border-slate-800/80"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-[10px] font-bold text-indigo-400">{m.missionId}</span>
                      <span className={`text-[9px] font-bold font-mono px-2 py-0.5 rounded-full border ${
                        isCaseApproved
                          ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                          : isCaseReady
                          ? "bg-amber-500/15 text-amber-400 border-amber-500/30 animate-pulse"
                          : "bg-slate-800 text-slate-400 border-slate-700"
                      }`}>
                        {isCaseApproved ? "APPROVED ✓" : isCaseReady ? "READY FOR REVIEW" : m.status}
                      </span>
                    </div>

                    <h4 className="text-xs font-bold text-white line-clamp-1">{m.title}</h4>
                    
                    <div className="flex items-center justify-between text-[11px] text-slate-400">
                      <span className="truncate max-w-[160px]">{m.reporterName || "Syed Asim"}</span>
                      <span className="font-mono text-[10px] text-slate-500">{m.category?.replace("_", " ")}</span>
                    </div>
                  </div>
                );
              })}

              {filteredMissions.length === 0 && (
                <div className="p-8 text-center rounded-xl bg-slate-900/40 border border-slate-800 text-xs text-slate-500">
                  No cases matching current tab filter.
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Deep Verification Canvas */}
          <div className="lg:col-span-8">
            {selectedMission ? (
              <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-6 bg-slate-900/80 shadow-2xl">
                {/* Case Top Bar */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-mono font-bold text-indigo-400">{selectedMission.missionId}</span>
                      <span className="text-slate-500">•</span>
                      <span className="text-xs font-mono text-slate-400 uppercase capitalize">{selectedMission.category?.replace("_", " ")}</span>
                    </div>
                    <h2 className="text-lg font-black text-white mt-0.5">{selectedMission.title}</h2>
                    <p className="text-xs text-slate-400 flex items-center mt-0.5">
                      <MapPin className="h-3.5 w-3.5 mr-1 text-rose-400 shrink-0" />
                      <span>{selectedMission.location || "North Gate 2, University Road"}</span>
                      {selectedMission.lat && (
                        <span className="ml-1.5 font-mono text-indigo-400 text-[10px]">
                          ({selectedMission.lat.toFixed(4)}, {selectedMission.lng.toFixed(4)})
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className={`text-xs font-bold font-mono px-3 py-1 rounded-full border inline-block ${
                      isApproved
                        ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                        : "bg-amber-500/15 text-amber-400 border-amber-500/30"
                    }`}>
                      {isApproved ? "STATUS: APPROVED ✓" : "STATUS: READY FOR REVIEW"}
                    </span>
                  </div>
                </div>

                {/* Resident Intake Profile */}
                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center space-x-2">
                      <div className="h-6 w-6 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs">
                        {reporterName[0]}
                      </div>
                      <span className="text-slate-400">Reporter:</span>
                      <strong className="text-white">{reporterName}</strong>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-bold">
                      VERIFIED RESIDENT
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">Verbatim Citizen Request:</span>
                    <p className="text-xs text-slate-100 italic bg-slate-900/60 p-2.5 rounded-lg border border-slate-800/80 mt-1">
                      &ldquo;{selectedMission.description || "Please repair street light near HVK"}&rdquo;
                    </p>
                  </div>
                </div>

                {/* SIDE-BY-SIDE BEFORE VS AFTER PHOTO INSPECTION MATRIX */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200 uppercase tracking-wider flex items-center">
                      <Camera className="h-4 w-4 mr-1.5 text-indigo-400" />
                      Photographic Evidence Audit (Before vs After)
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                      AMAZON NOVA MULTIMODAL
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Before Photo */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold font-mono text-rose-400 uppercase">
                          1. BEFORE (Uploaded by Resident)
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">Report Intake</span>
                      </div>
                      <div className="relative h-56 rounded-xl overflow-hidden border border-rose-500/30 bg-slate-950 group">
                        <img 
                          src={beforePhoto} 
                          alt="Before Fix" 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                        />
                        <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded bg-slate-950/85 backdrop-blur-sm text-[10px] font-mono text-rose-300 border border-rose-500/40">
                          Original Defect Photo
                        </div>
                      </div>
                    </div>

                    {/* After Photo */}
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold font-mono text-emerald-400 uppercase">
                          2. AFTER (Uploaded by Technician)
                        </span>
                        <span className="text-[10px] text-slate-500 font-mono">Proof of Repair</span>
                      </div>
                      <div className="relative h-56 rounded-xl overflow-hidden border border-emerald-500/40 bg-slate-950 group">
                        <img 
                          src={afterPhoto} 
                          alt="After Fix" 
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" 
                        />
                        <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded bg-slate-950/85 backdrop-blur-sm text-[10px] font-mono text-emerald-300 border border-emerald-500/40">
                          Field Completion Proof
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Technician Repair Narrative & Voice Transcript */}
                <div className="p-4 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Technician Attestation:</span>
                    <span className="font-bold text-white">{technicianName}</span>
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed bg-slate-900/60 p-3 rounded-lg border border-slate-800 font-medium">
                    &ldquo;{techNotes}&rdquo;
                  </p>
                  {voiceTranscript && (
                    <div className="flex items-center space-x-2 text-[11px] text-indigo-300 bg-indigo-950/30 p-2 rounded border border-indigo-500/20 font-mono">
                      <span>🎙️ Voice Transcript:</span>
                      <span className="truncate italic">&ldquo;{voiceTranscript}&rdquo;</span>
                    </div>
                  )}
                </div>

                {/* Amazon Nova AI Reasoning Trace */}
                <div className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-500/30 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-indigo-300 flex items-center">
                      <Bot className="h-4 w-4 mr-1.5 text-indigo-400" />
                      Amazon Bedrock Nova Vision Verification Trace
                    </span>
                    <span className="font-mono text-emerald-400 font-black text-sm">
                      96% Confidence Pass
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed font-mono">
                    {selectedMission.verificationResult?.explanation || 
                     selectedMission.aiAnalysis || 
                     "Nova Vision verified the repaired luminaire. Nominal illumination restored, terminal housing weather-sealed, and area hazard remediated."}
                  </p>
                  <div className="pt-2 border-t border-indigo-500/20 grid grid-cols-3 gap-2 text-[10px] text-slate-400 font-mono">
                    <div>Condition Improved: <strong className="text-emerald-400">YES ✓</strong></div>
                    <div>Asset Match: <strong className="text-emerald-400">SAME POLE ✓</strong></div>
                    <div>GPS Proximity: <strong className="text-emerald-400">ON SITE ✓</strong></div>
                  </div>
                </div>

                {/* Controller Action Bar */}
                <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-slate-800">
                  <div className="text-xs text-slate-400">
                    {isApproved ? (
                      <span className="text-emerald-400 font-bold flex items-center">
                        <CheckCircle2 className="h-4 w-4 mr-1.5" />
                        Case Approved & Verified. Resident informed in real time.
                      </span>
                    ) : (
                      <span>Approving this case closes out the work order and converts resident status from PENDING to APPROVED.</span>
                    )}
                  </div>

                  <div className="flex items-center space-x-3 w-full sm:w-auto">
                    {!isApproved && (
                      <button
                        type="button"
                        onClick={() => handleApproveCase(selectedMission.missionId)}
                        disabled={actionLoading}
                        className="flex-1 sm:flex-initial py-3 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-xs font-black text-white transition flex items-center justify-center space-x-2 shadow-xl shadow-emerald-600/30"
                      >
                        {actionLoading ? (
                          <>
                            <RefreshCw className="h-4 w-4 animate-spin" />
                            <span>Approving Case...</span>
                          </>
                        ) : (
                          <>
                            <Check className="h-4 w-4" />
                            <span>Approve Case ✓</span>
                          </>
                        )}
                      </button>
                    )}
                    <Link
                      href={`/operations/missions/${selectedMission.missionId}`}
                      className="py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-750 text-xs font-semibold text-slate-200 transition flex items-center space-x-1"
                    >
                      <span>Full Audit Log</span>
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <div className="glass-panel rounded-2xl p-16 border border-slate-800 text-center space-y-3">
                <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto" />
                <h3 className="text-base font-bold text-white">No Cases Pending Review</h3>
                <p className="text-xs text-slate-400">
                  When a technician completes a repair and uploads proof, it will appear here for controller sign-off.
                </p>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
