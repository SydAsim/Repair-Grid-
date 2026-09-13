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
  ExternalLink
} from "lucide-react";
import { API_BASE_URL } from "@/lib/config";
import { useOperatorAuth } from "@/lib/auth-context";

interface MissionRow {
  missionId: string;
  title: string;
  category: string;
  department: string;
  priority: number;
  riskBand: string;
  assignedTechnicianName?: string;
  status: string;
  location?: string;
  createdAt?: string;
  updatedAt?: string;
  slaDueAt?: string;
}

export default function MissionsListPage() {
  const { getAuthHeaders } = useOperatorAuth();
  const [missions, setMissions] = useState<MissionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("ALL");

  const fetchMissions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/ops/missions`, {
        headers: getAuthHeaders(),
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        setMissions(data);
      }
    } catch (e) {
      console.warn("Failed to load live missions:", e);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders]);

  useEffect(() => {
    fetchMissions();
    const timer = setInterval(() => {
      if (typeof document === "undefined" || document.visibilityState === "visible") {
        fetchMissions();
      }
    }, 8000);
    return () => clearInterval(timer);
  }, [fetchMissions]);

  const filtered = missions.filter((m) => {
    const id = m.missionId || "";
    const title = m.title || "";
    const matchesSearch = 
      title.toLowerCase().includes(searchTerm.toLowerCase()) || 
      id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatus === "ALL" || m.status === selectedStatus;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <OperatorNav />

      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2">
              <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/20">
                LIVE OPERATIONAL REGISTER
              </span>
              <span className="text-[10px] font-semibold text-emerald-400 flex items-center">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 mr-1 animate-pulse" />
                Real Database Feed
              </span>
            </div>
            <h1 className="text-2xl font-bold text-white mt-1">Community Missions Log</h1>
            <p className="text-xs text-slate-400 mt-1">
              Live tracking of all citizen problem reports, assigned technicians, and status transitions.
            </p>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={() => fetchMissions()}
              disabled={loading}
              className="p-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 hover:text-white transition disabled:opacity-50"
              title="Refresh live missions"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </button>

            <div className="relative">
              <Search className="h-4 w-4 absolute left-3 top-2.5 text-slate-500" />
              <input
                type="text"
                placeholder="Search live missions..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 rounded-xl bg-slate-900 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-48 sm:w-64"
              />
            </div>

            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="py-2 px-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-300 focus:outline-none focus:border-indigo-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="AWAITING_ACCEPTANCE">Awaiting Acceptance</option>
              <option value="ACCEPTED">Accepted</option>
              <option value="EN_ROUTE">En Route</option>
              <option value="ON_SITE">On Site</option>
              <option value="PROOF_SUBMITTED">Proof Submitted</option>
              <option value="VERIFIED">Verified</option>
              <option value="CLOSED">Closed</option>
            </select>
          </div>
        </div>

        {/* Live Missions Table */}
        <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/60 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Mission ID</th>
                  <th className="py-3.5 px-4">Title & Category</th>
                  <th className="py-3.5 px-4">Department</th>
                  <th className="py-3.5 px-4">Priority & Risk</th>
                  <th className="py-3.5 px-4">Assigned Technician</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-xs">
                {filtered.map((m) => {
                  const isCritical = m.riskBand === "CRITICAL";
                  return (
                    <tr key={m.missionId} className="hover:bg-slate-900/60 transition group">
                      <td className="py-3.5 px-4 font-mono font-bold text-indigo-400">
                        {m.missionId}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-white">
                        {m.title}
                        <span className="text-[10px] text-slate-500 block font-normal capitalize">
                          {m.category?.replace("_", " ")} • {m.location || "Campus Site"}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-300 capitalize">{m.department || "General"}</td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          isCritical
                            ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                            : m.riskBand === "HIGH"
                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            : "bg-slate-800 text-slate-400"
                        }`}>
                          {m.priority || 50} ({m.riskBand || "MEDIUM"})
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-200">
                        {m.assignedTechnicianName || "Awaiting Technician"}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-semibold ${
                          m.status === "CLOSED" || m.status === "VERIFIED"
                            ? "bg-emerald-500/10 text-emerald-400"
                            : m.status === "AWAITING_ACCEPTANCE"
                            ? "bg-amber-500/10 text-amber-400"
                            : "bg-blue-500/10 text-blue-400"
                        }`}>
                          {m.status?.replaceAll("_", " ")}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          href={`/operations/missions/${m.missionId}/`}
                          onClick={(e) => { e.preventDefault(); window.location.href = `/operations/missions/${m.missionId}/`; }}
                          className="inline-flex items-center space-x-1 text-xs font-semibold text-indigo-400 hover:text-indigo-300"
                        >
                          <span>Inspect</span>
                          <ChevronRight className="h-3.5 w-3.5" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}

                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-slate-500 text-xs">
                      No missions found matching your search.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
