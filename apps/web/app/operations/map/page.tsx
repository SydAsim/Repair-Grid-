"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { OperatorNav } from "@/components/OperatorNav";
import { 
  Lightbulb, 
  Droplets, 
  AlertTriangle, 
  MapPin, 
  Filter, 
  CheckCircle2, 
  Clock, 
  User, 
  ArrowRight,
  Zap,
  RefreshCw
} from "lucide-react";
import { API_BASE_URL } from "@/lib/config";
import { useOperatorAuth } from "@/lib/auth-context";

interface MissionMarker {
  id: string;
  title: string;
  category: "streetlights" | "potholes" | "blocked_drains" | string;
  priority: string;
  priorityScore: number;
  status: string;
  assignedTo: string;
  eta: string;
  reportsCount: number;
  photosCount: number;
  verificationConf: number;
  location: string;
  lat: number;
  lng: number;
}

export default function LivingMapPage() {
  const { getAuthHeaders } = useOperatorAuth();
  const [missions, setMissions] = useState<MissionMarker[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("ALL");
  const [selectedMission, setSelectedMission] = useState<MissionMarker | null>(null);

  const fetchLiveMissions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/ops/missions`, {
        headers: getAuthHeaders(),
        cache: "no-store",
      });
      if (res.ok) {
        const rawMissions = await res.json();
        const markers: MissionMarker[] = rawMissions.map((m: any, idx: number) => {
          const cat = m.category || "streetlights";
          const lat = m.lat || (m.coordinates && m.coordinates.lat) || 37.7750 + (idx * 0.0005);
          const lng = m.lng || (m.coordinates && m.coordinates.lng) || -122.4190 + (idx * 0.0004);
          const reportsCount = Array.isArray(m.reportIds) ? m.reportIds.length : (m.reportId ? 1 : 1);
          const photosCount = m.photoEvidence ? 1 : (m.evidenceRefs ? m.evidenceRefs.length : 1);

          return {
            id: m.missionId,
            title: m.title || `Incident ${m.missionId}`,
            category: cat,
            priority: m.riskBand || "MEDIUM",
            priorityScore: m.priority || 50,
            status: m.status?.replaceAll("_", " ") || "ACTIVE",
            assignedTo: m.assignedTechnicianName || "Awaiting Technician",
            eta: m.status === "CLOSED" ? "Completed" : "Under 2h SLA",
            reportsCount,
            photosCount,
            verificationConf: m.verificationConfidence ? Math.round(m.verificationConfidence * 100) : 95,
            location: m.location || "Campus District Site",
            lat,
            lng,
          };
        });

        setMissions(markers);
        if (markers.length > 0 && !selectedMission) {
          setSelectedMission(markers[0]);
        }
      }
    } catch (e) {
      console.warn("Failed to load map missions:", e);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders, selectedMission]);

  useEffect(() => {
    fetchLiveMissions();
    const timer = setInterval(fetchLiveMissions, 5000);
    return () => clearInterval(timer);
  }, [fetchLiveMissions]);

  const filtered = missions.filter((m) => filter === "ALL" || m.category === filter);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <OperatorNav />

      {/* Filter Header Bar */}
      <div className="border-b border-slate-800 bg-slate-900/60 px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center space-x-2 overflow-x-auto">
          <span className="text-xs text-slate-400 font-semibold mr-2 flex items-center">
            <Filter className="h-3.5 w-3.5 mr-1" />
            Category:
          </span>
          <button
            onClick={() => setFilter("ALL")}
            className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
              filter === "ALL" ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            All Active ({missions.length})
          </button>
          <button
            onClick={() => setFilter("streetlights")}
            className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
              filter === "streetlights" ? "bg-amber-500/20 text-amber-300 border border-amber-500/40" : "bg-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            💡 Lighting
          </button>
          <button
            onClick={() => setFilter("blocked_drains")}
            className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
              filter === "blocked_drains" ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40" : "bg-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            🌊 Drainage
          </button>
          <button
            onClick={() => setFilter("potholes")}
            className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
              filter === "potholes" ? "bg-orange-500/20 text-orange-300 border border-orange-500/40" : "bg-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            🕳 Roads
          </button>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => fetchLiveMissions()}
            disabled={loading}
            className="text-xs text-slate-400 hover:text-white flex items-center space-x-1"
          >
            <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
            <span className="hidden sm:inline">Refresh Live Pins</span>
          </button>
          <span className="text-xs font-mono text-slate-500 hidden sm:inline">
            Realtime Incident Coordinates
          </span>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row relative overflow-hidden">
        {/* Living Map Canvas */}
        <div className="flex-1 relative bg-slate-900 min-h-[450px] flex items-center justify-center">
          <div className="absolute inset-0 bg-[radial-gradient(#334155_1.5px,transparent_1.5px)] [background-size:24px_24px] opacity-40" />

          {/* Interactive Markers from Live Data */}
          <div className="relative z-10 w-full h-full max-w-4xl max-h-[550px] p-8 flex items-center justify-around flex-wrap">
            {filtered.map((mission) => {
              const isSelected = selectedMission?.id === mission.id;
              const isCritical = mission.priority === "CRITICAL";
              return (
                <div
                  key={mission.id}
                  onClick={() => setSelectedMission(mission)}
                  className={`cursor-pointer group flex flex-col items-center m-4 p-2 rounded-xl transition ${
                    isSelected ? "bg-slate-800/80 ring-2 ring-indigo-500" : "hover:bg-slate-800/40"
                  }`}
                >
                  <div className={`h-11 w-11 rounded-full flex items-center justify-center text-white shadow-xl transition-transform group-hover:scale-125 ${
                    isCritical
                      ? "bg-rose-500 ring-8 ring-rose-500/30 animate-pulse"
                      : mission.category === "streetlights"
                      ? "bg-amber-500 ring-4 ring-amber-500/20"
                      : "bg-cyan-500 ring-4 ring-cyan-500/20"
                  }`}>
                    {mission.category === "streetlights" && <Lightbulb className="h-5 w-5" />}
                    {mission.category === "blocked_drains" && <Droplets className="h-5 w-5" />}
                    {mission.category === "potholes" && <AlertTriangle className="h-5 w-5" />}
                  </div>

                  <div className="mt-2 text-center">
                    <span className="text-[11px] font-bold text-white bg-slate-950/90 px-2.5 py-1 rounded-md border border-slate-800 shadow block font-mono">
                      {mission.id}
                    </span>
                    <span className="text-[9px] font-semibold text-slate-400 block mt-0.5 max-w-[110px] truncate">
                      {mission.status}
                    </span>
                  </div>
                </div>
              );
            })}

            {filtered.length === 0 && (
              <div className="text-center text-slate-500 text-xs py-16">
                No active incidents in this category. Submit a report from the resident portal to see it pin live.
              </div>
            )}
          </div>

          <div className="absolute bottom-4 left-4 z-20 text-[10px] text-slate-400 bg-slate-950/80 px-3 py-1.5 rounded-lg border border-slate-800 backdrop-blur">
            Live Campus Infrastructure Mesh • Connected to Real Database
          </div>
        </div>

        {/* Selected Mission Drawer */}
        {selectedMission && (
          <div className="w-full lg:w-96 bg-slate-900/95 border-t lg:border-t-0 lg:border-l border-slate-800 p-6 flex flex-col justify-between overflow-y-auto">
            <div className="space-y-5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <span className="text-xs font-mono font-bold text-slate-400">{selectedMission.id}</span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                  selectedMission.priority === "CRITICAL"
                    ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                    : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                }`}>
                  {selectedMission.priority} ({selectedMission.priorityScore})
                </span>
              </div>

              <div>
                <h3 className="text-lg font-bold text-white">{selectedMission.title}</h3>
                <p className="text-xs text-slate-400 flex items-center mt-1">
                  <MapPin className="h-3.5 w-3.5 mr-1 text-slate-500 shrink-0" />
                  <span>{selectedMission.location}</span>
                </p>
                <p className="text-[10px] font-mono text-slate-500 mt-1">
                  GPS: {selectedMission.lat.toFixed(4)}, {selectedMission.lng.toFixed(4)}
                </p>
              </div>

              {/* AI Verification Meter */}
              <div>
                <div className="flex justify-between text-xs font-semibold mb-1">
                  <span className="text-slate-400">AI Verification Confidence</span>
                  <span className="text-emerald-400">{selectedMission.verificationConf}%</span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div 
                    className="bg-emerald-500 h-full rounded-full"
                    style={{ width: `${selectedMission.verificationConf}%` }}
                  />
                </div>
              </div>

              {/* Data Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block uppercase">Resident Reports</span>
                  <span className="text-sm font-bold text-white">{selectedMission.reportsCount} linked</span>
                </div>
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block uppercase">Evidence Items</span>
                  <span className="text-sm font-bold text-white">{selectedMission.photosCount} item</span>
                </div>
              </div>

              {/* Worker & Status */}
              <div className="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-slate-400">Assigned Technician:</span>
                  <span className="font-semibold text-white">{selectedMission.assignedTo}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Mission Status:</span>
                  <span className="font-semibold text-indigo-400">{selectedMission.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">SLA:</span>
                  <span className="font-semibold text-amber-400">{selectedMission.eta}</span>
                </div>
              </div>
            </div>

            <div className="pt-6">
              <Link
                href={`/operations/missions/${selectedMission.id}`}
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white text-center transition flex items-center justify-center space-x-2 shadow-lg shadow-indigo-600/20"
              >
                <span>Open Full Incident View</span>
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
