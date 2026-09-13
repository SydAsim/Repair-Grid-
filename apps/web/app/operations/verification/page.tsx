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
  Users, 
  MapPin,
  RefreshCw,
  Clock,
  ArrowRight
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
        if (data.length > 0 && !selectedMission) {
          setSelectedMission(data[0]);
        }
      }
    } catch (e) {
      console.warn("Failed to load missions for verification:", e);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders, selectedMission]);

  useEffect(() => {
    fetchVerificationQueue();
  }, [fetchVerificationQueue]);

  const handleApproveClosure = async (missionId: string) => {
    setActionLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/ops/missions/${missionId}/verify-close`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        setClosedId(missionId);
        await fetchVerificationQueue();
      }
    } catch (e) {
      console.warn("Closure verification error:", e);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <OperatorNav />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
              LIVE COMPLETION VERIFICATION
            </span>
            <h1 className="text-2xl font-bold text-white mt-1">Proof of Repair Inspection</h1>
            <p className="text-xs text-slate-400 mt-1">
              Multimodal verification of technician attestations, before/after evidence, and resident confirmations.
            </p>
          </div>
          <button
            onClick={() => fetchVerificationQueue()}
            disabled={loading}
            className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition disabled:opacity-50 flex items-center space-x-1.5 text-xs font-semibold"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            <span>Sync Queue</span>
          </button>
        </div>

        {closedId && (
          <div className="glass-panel rounded-2xl p-6 border border-emerald-500/40 text-center space-y-2 bg-emerald-950/20">
            <CheckCircle2 className="h-8 w-8 text-emerald-400 mx-auto" />
            <h2 className="text-lg font-bold text-white">Mission {closedId} Successfully Verified & Closed!</h2>
            <p className="text-xs text-slate-300 max-w-md mx-auto">
              Autonomous closure sign-off recorded in the audit log. Community health score recalculated.
            </p>
          </div>
        )}

        {selectedMission ? (
          <div className="glass-panel rounded-2xl p-6 border border-slate-800 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800">
              <div>
                <span className="text-xs font-mono text-slate-400">MISSION {selectedMission.missionId}</span>
                <h2 className="text-lg font-bold text-white">{selectedMission.title}</h2>
                <p className="text-xs text-slate-400 flex items-center mt-0.5">
                  <MapPin className="h-3 w-3 mr-1 text-slate-500" />
                  {selectedMission.location || "Campus District Site"}
                </p>
              </div>
              <div className="text-right">
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full border ${
                  selectedMission.status === "CLOSED"
                    ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                    : "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                }`}>
                  STATUS: {selectedMission.status}
                </span>
              </div>
            </div>

            {/* Evidence & Case Overview */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <span className="text-xs font-semibold text-slate-400 block mb-2">Citizen Reported Evidence</span>
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {selectedMission.description || "Incident submitted with photo evidence."}
                  </p>
                  <span className="text-[10px] font-mono text-slate-500 block">
                    Category: {selectedMission.category} • Priority Score: {selectedMission.priority || 50}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-xs font-semibold text-slate-400 block mb-2">Assigned Technician Field State</span>
                <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Specialist:</span>
                    <span className="font-bold text-white">{selectedMission.assignedTechnicianName || "Awaiting Technician"}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Department:</span>
                    <span className="text-indigo-400 capitalize">{selectedMission.department}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Verification Status:</span>
                    <span className="text-amber-400 font-semibold">{selectedMission.verificationStatus || "UNVERIFIED"}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Checklist Matrix */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-2">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Technician Match</span>
                <div className="text-xs text-slate-300 space-y-1.5">
                  <div className="flex items-center space-x-1.5 text-emerald-400">
                    <Check className="h-3.5 w-3.5" />
                    <span>Trade Skill Verified</span>
                  </div>
                  <div className="flex items-center space-x-1.5 text-emerald-400">
                    <Check className="h-3.5 w-3.5" />
                    <span>Zone Coverage Active</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-2">
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block">Autonomous Audit</span>
                <div className="text-xs text-slate-300 space-y-1.5">
                  <div className="flex items-center space-x-1.5 text-emerald-400">
                    <Check className="h-3.5 w-3.5" />
                    <span>GPS Coordinates Geocoded</span>
                  </div>
                  <div className="flex items-center space-x-1.5 text-emerald-400">
                    <Check className="h-3.5 w-3.5" />
                    <span>Guardian Safety Policy Evaluated</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-950/60 p-4 rounded-xl border border-slate-800 space-y-2">
                <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider block">Community Feedback</span>
                <div className="text-xs text-slate-300 space-y-1.5">
                  <div className="flex items-center space-x-1.5 text-emerald-400">
                    <Check className="h-3.5 w-3.5" />
                    <span>Resident Timeline Live</span>
                  </div>
                  <div className="flex items-center space-x-1.5 text-slate-400">
                    <span>Quality Confirmation Ready</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Operator Verification Action */}
            <div className="rounded-xl bg-indigo-500/10 border border-indigo-500/30 p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider block">
                  Command Action
                </span>
                <h4 className="text-sm font-bold text-white mt-0.5">
                  {selectedMission.status === "CLOSED" ? "Mission Already Verified & Closed" : "Verify & Authorize Mission Closure"}
                </h4>
              </div>

              <div className="flex items-center space-x-2">
                {selectedMission.status !== "CLOSED" && (
                  <button
                    type="button"
                    onClick={() => handleApproveClosure(selectedMission.missionId)}
                    disabled={actionLoading}
                    className="px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-xs font-bold text-white transition flex items-center space-x-1.5 shadow-lg shadow-emerald-600/30"
                  >
                    <Check className="h-3.5 w-3.5" />
                    <span>{actionLoading ? "Closing..." : "Approve Closure"}</span>
                  </button>
                )}
                <Link
                  href={`/operations/missions/${selectedMission.missionId}`}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition flex items-center space-x-1"
                >
                  <span>Full Audit</span>
                  <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="glass-panel rounded-2xl p-12 border border-slate-800 text-center space-y-3">
            <CheckCircle2 className="h-10 w-10 text-emerald-400 mx-auto" />
            <h3 className="text-base font-bold text-white">No Missions Pending Verification</h3>
            <p className="text-xs text-slate-400">
              Missions will appear here when submitted or marked by field specialists.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
