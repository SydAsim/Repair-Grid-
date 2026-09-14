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
  RefreshCw,
  Camera
} from "lucide-react";
import { API_BASE_URL } from "@/lib/config";
import { useOperatorAuth } from "@/lib/auth-context";
import { InteractiveLiveMap, MapIncident } from "@/components/InteractiveLiveMap";

export default function LivingMapPage() {
  const { getAuthHeaders } = useOperatorAuth();
  const [rawMissions, setRawMissions] = useState<any[]>([]);
  const [incidents, setIncidents] = useState<MapIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("ALL");
  const [selectedIncident, setSelectedIncident] = useState<MapIncident | null>(null);

  const fetchLiveMissions = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/ops/missions`, {
        headers: getAuthHeaders(),
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        setRawMissions(data);
        const mapped: MapIncident[] = data.map((m: any, idx: number) => {
          const cat = m.category || "streetlights";
          const lat = m.lat || (m.coordinates && m.coordinates.lat) || 37.7751 + (idx * 0.0004);
          const lng = m.lng || (m.coordinates && m.coordinates.lng) || -122.4190 + (idx * 0.0003);
          const reportsCount = Array.isArray(m.reportIds) ? m.reportIds.length : (m.reportId ? 1 : 1);
          const beforePhoto = m.photoEvidence || m.beforePhoto || "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=800";
          const afterPhoto = m.afterPhoto;

          return {
            id: m.missionId,
            title: m.title || `Incident ${m.missionId}`,
            category: cat,
            priority: (m.riskBand || "MEDIUM") as any,
            status: m.status?.replaceAll("_", " ") || "ACTIVE",
            assignedTo: m.assignedTechnicianName || "Awaiting Technician",
            eta: m.status === "APPROVED" || m.status === "CLOSED" ? "Completed" : "Under 2h SLA",
            location: m.location || "North Gate 2, University Road",
            lat,
            lng,
            imageUrl: beforePhoto,
            beforePhoto,
            afterPhoto,
            reporterName: m.reporterName || "Syed Asim (Resident)",
            technicianNotes: m.technicianNotes,
            description: m.description,
            reportsCount,
          };
        });

        setIncidents(mapped);
        if (mapped.length > 0 && !selectedIncident) {
          setSelectedIncident(mapped[0]);
        }
      }
    } catch (e) {
      console.warn("Failed to load map missions:", e);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders, selectedIncident]);

  useEffect(() => {
    fetchLiveMissions();
    const timer = setInterval(fetchLiveMissions, 8000);
    return () => clearInterval(timer);
  }, [fetchLiveMissions]);

  const filtered = incidents.filter((m) => filter === "ALL" || m.category === filter);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <OperatorNav />

      {/* Filter Header Bar */}
      <div className="border-b border-slate-800 bg-slate-900/80 px-4 py-2.5 flex items-center justify-between">
        <div className="flex items-center space-x-2 overflow-x-auto">
          <span className="text-xs text-slate-400 font-semibold mr-2 flex items-center">
            <Filter className="h-3.5 w-3.5 mr-1" />
            Filter Layer:
          </span>
          <button
            onClick={() => setFilter("ALL")}
            className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
              filter === "ALL" ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            All Incidents ({incidents.length})
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
            <span className="hidden sm:inline">Refresh Live GPS</span>
          </button>
          <span className="text-xs font-mono text-emerald-400 hidden sm:inline flex items-center">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse" />
            AWS Location Service Active
          </span>
        </div>
      </div>

      <div className="flex-1 flex flex-col lg:flex-row relative overflow-hidden">
        {/* Real-time Interactive Live Map Viewport */}
        <div className="flex-1 relative min-h-[500px]">
          <InteractiveLiveMap
            incidents={filtered}
            activeIncidentId={selectedIncident?.id}
            onSelectIncident={(inc) => setSelectedIncident(inc)}
            showWorkerSimulation={true}
            workerName="Ahmed Khan (Technician Van #04)"
            mode="operations"
            initialCenter={[-122.4195, 37.7745]}
            initialZoom={15.5}
            className="w-full h-full"
          />
        </div>

        {/* Selected Mission Sidebar Drawer */}
        {selectedIncident && (
          <div className="w-full lg:w-96 bg-slate-900/95 border-t lg:border-t-0 lg:border-l border-slate-800 p-5 flex flex-col justify-between overflow-y-auto max-h-[85vh]">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <span className="text-xs font-mono font-bold text-indigo-400">{selectedIncident.id}</span>
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                  selectedIncident.status.includes("APPROVED") || selectedIncident.status.includes("VERIFIED")
                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
                    : selectedIncident.priority === "CRITICAL"
                    ? "bg-rose-500/15 text-rose-400 border border-rose-500/30"
                    : "bg-amber-500/15 text-amber-400 border border-amber-500/30"
                }`}>
                  {selectedIncident.status}
                </span>
              </div>

              <div>
                <h3 className="text-base font-bold text-white">{selectedIncident.title}</h3>
                <p className="text-xs text-slate-400 flex items-center mt-1">
                  <MapPin className="h-3.5 w-3.5 mr-1 text-rose-400 shrink-0" />
                  <span>{selectedIncident.location}</span>
                </p>
                <p className="text-[10px] font-mono text-indigo-400 mt-1">
                  GPS: {selectedIncident.lat.toFixed(4)}, {selectedIncident.lng.toFixed(4)}
                </p>
              </div>

              {/* Verified Reporter */}
              {selectedIncident.reporterName && (
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Reporter:</span>
                    <strong className="text-white">{selectedIncident.reporterName}</strong>
                  </div>
                  {selectedIncident.description && (
                    <p className="text-slate-300 italic text-[11px] pt-1 border-t border-slate-850">
                      &ldquo;{selectedIncident.description}&rdquo;
                    </p>
                  )}
                </div>
              )}

              {/* Before vs After Photos */}
              {selectedIncident.afterPhoto ? (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block font-semibold">
                    Before / After Photo Comparison:
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <span className="text-[9px] font-mono text-rose-400 font-bold block">1. Before (Resident)</span>
                      <div className="h-28 rounded-lg overflow-hidden border border-rose-500/30 bg-slate-950">
                        <img src={selectedIncident.beforePhoto} alt="Before" className="w-full h-full object-cover" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] font-mono text-emerald-400 font-bold block">2. After (Repaired)</span>
                      <div className="h-28 rounded-lg overflow-hidden border border-emerald-500/40 bg-slate-950">
                        <img src={selectedIncident.afterPhoto} alt="After" className="w-full h-full object-cover" />
                      </div>
                    </div>
                  </div>
                </div>
              ) : selectedIncident.beforePhoto ? (
                <div className="space-y-1">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block font-semibold">
                    Resident Photographic Evidence:
                  </span>
                  <div className="h-36 rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
                    <img src={selectedIncident.beforePhoto} alt="Evidence" className="w-full h-full object-cover" />
                  </div>
                </div>
              ) : null}

              {/* Data Grid */}
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block uppercase">Resident Reports</span>
                  <span className="text-sm font-bold text-white">{selectedIncident.reportsCount || 1} linked</span>
                </div>
                <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] text-slate-400 block uppercase">Assigned Tech</span>
                  <span className="text-xs font-bold text-indigo-300 truncate block mt-0.5">{selectedIncident.assignedTo}</span>
                </div>
              </div>

              {/* Technician Notes */}
              {selectedIncident.technicianNotes && (
                <div className="bg-slate-950/60 p-3 rounded-xl border border-slate-800 space-y-1 text-xs">
                  <span className="text-slate-400 font-semibold block text-[10px] uppercase">Technician Scope:</span>
                  <p className="text-slate-200 text-[11px] leading-relaxed">
                    &ldquo;{selectedIncident.technicianNotes}&rdquo;
                  </p>
                </div>
              )}
            </div>

            <div className="pt-4 space-y-2">
              <Link
                href={`/operations/missions/${selectedIncident.id}`}
                className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white text-center transition flex items-center justify-center space-x-2 shadow-lg shadow-indigo-600/20"
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
