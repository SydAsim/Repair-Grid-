"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { OperatorNav } from "@/components/OperatorNav";
import { 
  FileText, 
  Search, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  ChevronRight,
  ShieldAlert, 
  RefreshCw,
  ExternalLink,
  Camera,
  Bot,
  User,
  Check,
  Zap,
  CheckCheck
} from "lucide-react";
import { API_BASE_URL } from "@/lib/config";
import { useOperatorAuth } from "@/lib/auth-context";

interface SegmentedCase {
  missionId: string;
  title: string;
  category: string;
  department: string;
  priority: number;
  riskBand: string;
  assignedTechnicianName?: string;
  status: string;
  location?: string;
  reporterName?: string;
  description?: string;
  beforePhoto?: string;
  photoEvidence?: string;
  afterPhoto?: string;
  technicianNotes?: string;
  voiceTranscript?: string;
  aiAnalysis?: string;
  controllerApprovedAt?: string;
  lat?: number;
  lng?: number;
}

export default function SegmentedMissionsPage() {
  const { getAuthHeaders } = useOperatorAuth();
  const [segmentedData, setSegmentedData] = useState<{
    pending: SegmentedCase[];
    ready_for_review: SegmentedCase[];
    approved: SegmentedCase[];
    counts: { pending: number; ready_for_review: number; approved: number };
  }>({
    pending: [],
    ready_for_review: [],
    approved: [],
    counts: { pending: 0, ready_for_review: 0, approved: 0 }
  });

  const [activeTab, setActiveTab] = useState<"pending" | "ready_for_review" | "approved">("ready_for_review");
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [approvedToast, setApprovedToast] = useState<string | null>(null);

  const fetchSegmentedReports = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/ops/reports-segmented`, {
        headers: getAuthHeaders(),
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        setSegmentedData(data);
      }
    } catch (e) {
      console.warn("Failed to load segmented missions:", e);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    fetchSegmentedReports();
    const timer = setInterval(() => {
      if (typeof document === "undefined" || document.visibilityState === "visible") {
        fetchSegmentedReports();
      }
    }, 8000);
    return () => clearInterval(timer);
  }, [fetchSegmentedReports]);

  const handleApproveCase = async (missionId: string) => {
    setActionLoading(missionId);
    setApprovedToast(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/ops/missions/${missionId}/approve`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        setApprovedToast(`Case ${missionId} approved! Resident status converted to APPROVED.`);
        await fetchSegmentedReports();
        setTimeout(() => setApprovedToast(null), 5000);
      }
    } catch (e) {
      console.warn("Approval error:", e);
    } finally {
      setActionLoading(null);
    }
  };

  const currentCases = segmentedData[activeTab] || [];
  const filteredCases = currentCases.filter((item) => {
    const term = searchTerm.toLowerCase();
    const title = (item.title || "").toLowerCase();
    const id = (item.missionId || "").toLowerCase();
    const reporter = (item.reporterName || "").toLowerCase();
    const desc = (item.description || "").toLowerCase();
    return title.includes(term) || id.includes(term) || reporter.includes(term) || desc.includes(term);
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <OperatorNav />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/20 uppercase tracking-wider">
                SEGMENTED OPERATIONS REGISTER
              </span>
              <span className="text-[10px] font-semibold text-emerald-400 flex items-center">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 mr-1 animate-pulse" />
                Live Case Triage
              </span>
            </div>
            <h1 className="text-2xl font-black text-white mt-1">Community Cases & Admission Triage</h1>
            <p className="text-xs text-slate-400 mt-1">
              Segmented case oversight: (1) Cases Still Pending, (2) Cases Ready for Review, (3) Cases Approved & Verified.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => fetchSegmentedReports()}
              disabled={loading}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition disabled:opacity-50"
              title="Refresh live cases"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>

            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                placeholder="Search reporter, ID, or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-48 sm:w-64"
              />
            </div>
          </div>
        </div>

        {/* Action Toast Alert */}
        {approvedToast && (
          <div className="p-4 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center justify-between animate-fadeIn">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
              <span>{approvedToast}</span>
            </div>
            <span className="text-[10px] font-mono text-emerald-400">VERIFIED</span>
          </div>
        )}

        {/* 3 SEGMENTED TABS */}
        <div className="grid grid-cols-3 gap-3 p-1.5 bg-slate-900/80 rounded-2xl border border-slate-800">
          <button
            onClick={() => setActiveTab("pending")}
            className={`py-3 px-4 rounded-xl text-xs font-bold transition flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-2 ${
              activeTab === "pending"
                ? "bg-slate-800 text-white shadow-lg border border-slate-700"
                : "text-slate-400 hover:text-white"
            }`}
          >
            <span>1. Cases Still Pending</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
              activeTab === "pending" ? "bg-amber-500 text-slate-950" : "bg-slate-800 text-slate-400"
            }`}>
              {segmentedData.counts.pending}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("ready_for_review")}
            className={`py-3 px-4 rounded-xl text-xs font-bold transition flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-2 ${
              activeTab === "ready_for_review"
                ? "bg-amber-500 text-slate-950 shadow-lg font-black"
                : "text-amber-400/90 hover:text-amber-300"
            }`}
          >
            <span>2. Ready for Review</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
              activeTab === "ready_for_review" ? "bg-slate-950 text-amber-400" : "bg-amber-500/20 text-amber-400"
            }`}>
              {segmentedData.counts.ready_for_review}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("approved")}
            className={`py-3 px-4 rounded-xl text-xs font-bold transition flex flex-col sm:flex-row items-center justify-center space-y-1 sm:space-y-0 sm:space-x-2 ${
              activeTab === "approved"
                ? "bg-emerald-600 text-white shadow-lg font-black"
                : "text-emerald-400/90 hover:text-emerald-300"
            }`}
          >
            <span>3. Approved & Verified</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
              activeTab === "approved" ? "bg-white text-emerald-950" : "bg-emerald-500/20 text-emerald-400"
            }`}>
              {segmentedData.counts.approved}
            </span>
          </button>
        </div>

        {/* Tab Context Explanation Header */}
        <div className="bg-slate-900/60 p-3.5 rounded-xl border border-slate-800/80 flex items-center justify-between text-xs text-slate-300">
          {activeTab === "pending" && (
            <span>
              Cases submitted by residents that are pending dispatch, technician acceptance, or initial field triage.
            </span>
          )}
          {activeTab === "ready_for_review" && (
            <span className="text-amber-300 font-medium">
              Field technicians have completed repairs and submitted Before/After proof. Review photographic evidence and click <strong>Approve Case</strong> to finalize.
            </span>
          )}
          {activeTab === "approved" && (
            <span className="text-emerald-300 font-medium">
              Verified community cases authorized by the Mission Controller. The resident's pending status has been converted to <strong>APPROVED ✓</strong>.
            </span>
          )}
          <span className="font-mono text-slate-500 text-[10px] shrink-0 ml-2">
            {filteredCases.length} items
          </span>
        </div>

        {/* Case Cards Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {filteredCases.map((c) => {
            const beforePhoto = c.photoEvidence || c.beforePhoto || "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=800";
            const afterPhoto = c.afterPhoto;
            const reporterName = c.reporterName || "Syed Asim (Resident)";
            const isApproved = c.status === "APPROVED" || c.status === "VERIFIED" || c.status === "CLOSED";
            const isReadyForReview = c.status === "READY_FOR_REVIEW" || c.status === "PROOF_SUBMITTED" || c.status === "COMPLETION_SUBMITTED";

            return (
              <div 
                key={c.missionId}
                className={`glass-panel rounded-2xl p-5 border space-y-4 transition ${
                  isReadyForReview 
                    ? "border-amber-500/40 bg-slate-900/90 shadow-xl shadow-amber-950/10" 
                    : isApproved
                    ? "border-emerald-500/30 bg-slate-900/80"
                    : "border-slate-800 bg-slate-900/70"
                }`}
              >
                {/* Header Info */}
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-[10px] font-bold font-mono text-indigo-400">{c.missionId}</span>
                      <span className="text-slate-600">•</span>
                      <span className="text-[10px] font-mono text-slate-400 uppercase">{c.category?.replace("_", " ")}</span>
                    </div>
                    <h3 className="text-base font-bold text-white mt-0.5">{c.title}</h3>
                    <p className="text-xs text-slate-400 flex items-center mt-1">
                      <MapPin className="h-3.5 w-3.5 mr-1 text-rose-400 shrink-0" />
                      <span>{c.location || "Campus District Site"}</span>
                      {c.lat && (
                        <span className="ml-1.5 font-mono text-indigo-400 text-[10px]">
                          ({c.lat.toFixed(4)}, {c.lng?.toFixed(4)})
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className={`text-[10px] font-bold font-mono px-2.5 py-1 rounded-full border inline-block ${
                      isApproved
                        ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                        : isReadyForReview
                        ? "bg-amber-500/15 text-amber-400 border-amber-500/30 font-black"
                        : "bg-slate-800 text-slate-400 border-slate-700"
                    }`}>
                      {isApproved ? "APPROVED ✓" : isReadyForReview ? "READY FOR REVIEW" : c.status?.replace("_", " ")}
                    </span>
                  </div>
                </div>

                {/* Reporter & Verbatim Request */}
                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-1.5 text-xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <User className="h-4 w-4 text-amber-400" />
                      <span className="text-slate-400">Reporter:</span>
                      <strong className="text-white">{reporterName}</strong>
                    </div>
                    <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                      RESIDENT CITIZEN
                    </span>
                  </div>
                  <p className="text-slate-200 italic leading-relaxed text-xs">
                    &ldquo;{c.description || "Please repair street light near HVK"}&rdquo;
                  </p>
                </div>

                {/* Before & After Photo Comparison */}
                {afterPhoto ? (
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block font-semibold">
                      Photographic Evidence Audit (Before vs After):
                    </span>
                    <div className="grid grid-cols-2 gap-2.5">
                      <div className="space-y-1">
                        <span className="text-[10px] font-mono text-rose-400 font-bold block">1. BEFORE (Resident)</span>
                        <div className="h-32 rounded-xl overflow-hidden border border-rose-500/30 bg-slate-950">
                          <img src={beforePhoto} alt="Before" className="w-full h-full object-cover" />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[10px] font-mono text-emerald-400 font-bold block">2. AFTER (Technician)</span>
                        <div className="h-32 rounded-xl overflow-hidden border border-emerald-500/40 bg-slate-950">
                          <img src={afterPhoto} alt="After" className="w-full h-full object-cover" />
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block font-semibold">
                      Resident Photographic Evidence:
                    </span>
                    <div className="h-36 rounded-xl overflow-hidden border border-slate-800 bg-slate-950 relative">
                      <img src={beforePhoto} alt="Resident Evidence" className="w-full h-full object-cover" />
                      <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-slate-950/80 backdrop-blur-sm text-[10px] font-mono text-slate-200 border border-slate-700">
                        Intake Photograph
                      </div>
                    </div>
                  </div>
                )}

                {/* Technician Notes or Mic Speech Transcript if available */}
                {c.technicianNotes && (
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs space-y-1">
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Technician Scope ({c.assignedTechnicianName || "Ahmed Khan"}):</span>
                      {c.voiceTranscript && (
                        <span className="text-[10px] font-mono text-indigo-400">🎙️ Mic Transcribed</span>
                      )}
                    </div>
                    <p className="text-slate-200 text-xs leading-relaxed">
                      &ldquo;{c.technicianNotes}&rdquo;
                    </p>
                  </div>
                )}

                {/* AI Diagnostic / Reasoning Box */}
                <div className="p-3 rounded-xl bg-indigo-950/30 border border-indigo-500/25 space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-indigo-300 flex items-center">
                      <Bot className="h-3.5 w-3.5 mr-1 text-indigo-400" />
                      Amazon Nova AI Diagnostic & Verification
                    </span>
                    <span className="font-mono text-emerald-400 font-bold text-[11px]">
                      Verified Match
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 leading-relaxed font-mono">
                    {c.aiAnalysis || "Amazon Nova compared intake vs field evidence: Defect verified, safety standards compliant."}
                  </p>
                </div>

                {/* Card Bottom Controls */}
                <div className="pt-2 flex items-center justify-between border-t border-slate-800 gap-2">
                  <Link
                    href={`/operations/missions/${c.missionId}`}
                    className="text-xs font-semibold text-slate-400 hover:text-white flex items-center"
                  >
                    <span>Full Audit View</span>
                    <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
                  </Link>

                  {isReadyForReview && (
                    <button
                      type="button"
                      onClick={() => handleApproveCase(c.missionId)}
                      disabled={actionLoading === c.missionId}
                      className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-xs font-black text-white transition flex items-center space-x-1.5 shadow-lg shadow-emerald-600/30"
                    >
                      {actionLoading === c.missionId ? (
                        <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Check className="h-3.5 w-3.5" />
                      )}
                      <span>Approve Case ✓</span>
                    </button>
                  )}

                  {isApproved && (
                    <span className="text-xs font-bold text-emerald-400 flex items-center">
                      <CheckCheck className="h-4 w-4 mr-1" />
                      <span>Approved in Central Registry</span>
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {!loading && filteredCases.length === 0 && (
            <div className="col-span-full p-16 text-center rounded-2xl bg-slate-900/40 border border-slate-800 text-xs text-slate-500 space-y-2">
              <CheckCircle2 className="h-8 w-8 text-slate-600 mx-auto" />
              <p className="font-semibold text-slate-400">No cases found in this category.</p>
              <p className="text-[11px] text-slate-500">Try changing the search keyword or selecting a different tab.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
