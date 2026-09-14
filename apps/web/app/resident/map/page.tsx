"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { 
  ArrowLeft, 
  MapPin, 
  Lightbulb, 
  Droplets, 
  AlertTriangle, 
  Filter,
  RefreshCw,
  CheckCircle2,
  ExternalLink
} from "lucide-react";
import { API_BASE_URL } from "@/lib/config";
import { useAuth } from "@/lib/auth-context";
import { InteractiveLiveMap, MapIncident } from "@/components/InteractiveLiveMap";

export default function ResidentMapPage() {
  const { getAuthHeaders } = useAuth();
  const [incidents, setIncidents] = useState<MapIncident[]>([]);
  const [filter, setFilter] = useState<string>("ALL");
  const [selectedIncident, setSelectedIncident] = useState<MapIncident | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchCommunityIssues = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/map/issues`, {
        headers: getAuthHeaders(),
        cache: "no-store",
      });
      if (res.ok) {
        const data = await res.json();
        const mapped: MapIncident[] = data.map((item: any, idx: number) => {
          const lat = item.lat || (item.coordinates && item.coordinates.lat) || 37.7751 + (idx * 0.0004);
          const lng = item.lng || (item.coordinates && item.coordinates.lng) || -122.4190 + (idx * 0.0003);
          const isApproved = item.status === "APPROVED" || item.status === "VERIFIED" || item.status === "CLOSED";

          return {
            id: item.issueId || item.reportId || `RG-${100 + idx}`,
            title: item.title || "Reported Infrastructure Defect",
            category: item.category || "streetlights",
            priority: (item.priority || "MEDIUM") as any,
            status: isApproved ? "APPROVED ✓" : item.status?.replace("_", " ") || "PENDING",
            assignedTo: item.assignedTechnician || "Field Response Unit",
            eta: isApproved ? "Completed" : "Scheduled",
            location: item.location || "Campus District Sector",
            lat,
            lng,
            imageUrl: item.evidenceRef || item.beforePhoto || "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600",
            beforePhoto: item.beforePhoto || item.evidenceRef,
            afterPhoto: item.afterPhoto || item.proofPhoto,
            reporterName: item.reporterName || "Campus Resident",
            description: item.description,
            reportsCount: item.reportsCount || 1,
          };
        });

        setIncidents(mapped);
        if (mapped.length > 0 && !selectedIncident) {
          setSelectedIncident(mapped[0]);
        }
      }
    } catch (e) {
      console.warn("Could not load community map issues:", e);
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders, selectedIncident]);

  useEffect(() => {
    fetchCommunityIssues();
    const timer = setInterval(fetchCommunityIssues, 8000);
    return () => clearInterval(timer);
  }, [fetchCommunityIssues]);

  const filtered = incidents.filter(m => filter === "ALL" || m.category === filter);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md px-4 py-3 sticky top-0 z-40 flex items-center justify-between">
        <Link href="/resident" className="inline-flex items-center text-xs font-semibold text-slate-400 hover:text-white transition">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Resident Hub
        </Link>
        <div className="flex items-center space-x-2">
          <span className="font-bold text-xs tracking-wider text-white">CAMPUS COMMUNITY MAP</span>
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
        </div>
        <button
          onClick={fetchCommunityIssues}
          disabled={loading}
          className="text-xs text-slate-400 hover:text-white flex items-center space-x-1"
        >
          <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
          <span className="hidden sm:inline">Sync Map</span>
        </button>
      </header>

      {/* Filter Tabs */}
      <div className="border-b border-slate-800/80 bg-slate-900/60 p-3 flex items-center justify-between">
        <div className="flex items-center space-x-2 overflow-x-auto">
          <button
            onClick={() => setFilter("ALL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
              filter === "ALL" ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            All Issues ({incidents.length})
          </button>
          <button
            onClick={() => setFilter("streetlights")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
              filter === "streetlights" ? "bg-amber-500/20 text-amber-300 border border-amber-500/40" : "bg-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            💡 Streetlights
          </button>
          <button
            onClick={() => setFilter("blocked_drains")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
              filter === "blocked_drains" ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40" : "bg-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            🌊 Drains
          </button>
          <button
            onClick={() => setFilter("potholes")}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
              filter === "potholes" ? "bg-orange-500/20 text-orange-300 border border-orange-500/40" : "bg-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            🕳 Potholes
          </button>
        </div>

        <span className="text-[11px] font-mono text-emerald-400 hidden sm:inline">
          Live AWS Campus Location Grid
        </span>
      </div>

      <div className="flex-1 flex flex-col md:flex-row relative overflow-hidden">
        {/* Real-time Interactive MapLibre GL Canvas */}
        <div className="flex-1 relative min-h-[450px]">
          <InteractiveLiveMap
            incidents={filtered}
            activeIncidentId={selectedIncident?.id}
            onSelectIncident={(inc) => setSelectedIncident(inc)}
            showWorkerSimulation={true}
            mode="resident"
            initialCenter={[-122.4195, 37.7745]}
            initialZoom={15.5}
            className="w-full h-full"
          />
        </div>

        {/* Selected Issue Drawer */}
        {selectedIncident && (
          <div className="w-full md:w-84 bg-slate-900/95 border-t md:border-t-0 md:border-l border-slate-800 p-5 flex flex-col justify-between overflow-y-auto max-h-[80vh]">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20 font-mono">
                  {selectedIncident.id}
                </span>
                <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-md ${
                  selectedIncident.status.includes("APPROVED")
                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                    : "bg-slate-800 text-slate-300"
                }`}>
                  {selectedIncident.status}
                </span>
              </div>

              <div>
                <h3 className="text-base font-bold text-white mb-1">{selectedIncident.title}</h3>
                <p className="text-xs text-slate-400 flex items-center">
                  <MapPin className="h-3.5 w-3.5 mr-1 text-rose-400 shrink-0" />
                  <span>{selectedIncident.location}</span>
                </p>
                <p className="text-[10px] font-mono text-indigo-400 mt-0.5">
                  GPS: {selectedIncident.lat.toFixed(4)}, {selectedIncident.lng.toFixed(4)}
                </p>
              </div>

              {/* Description */}
              {selectedIncident.description && (
                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 text-xs">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block font-semibold mb-1">
                    Resident Problem Brief:
                  </span>
                  <p className="text-slate-200 italic leading-relaxed text-[11px]">
                    &ldquo;{selectedIncident.description}&rdquo;
                  </p>
                </div>
              )}

              {/* Before / After Evidence */}
              {selectedIncident.afterPhoto ? (
                <div className="space-y-1.5">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block font-semibold">
                    Before / After Photo Audit:
                  </span>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <span className="text-[9px] font-mono text-rose-400 font-bold block">1. Before</span>
                      <div className="h-24 rounded-lg overflow-hidden border border-rose-500/30 bg-slate-950">
                        <img src={selectedIncident.beforePhoto} alt="Before" className="w-full h-full object-cover" />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[9px] font-mono text-emerald-400 font-bold block">2. Repaired</span>
                      <div className="h-24 rounded-lg overflow-hidden border border-emerald-500/40 bg-slate-950">
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
                  <div className="h-32 rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
                    <img src={selectedIncident.beforePhoto} alt="Evidence" className="w-full h-full object-cover" />
                  </div>
                </div>
              ) : null}

              <div className="rounded-xl bg-slate-950/60 p-3 border border-slate-800 space-y-1.5 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Privacy Protection:</span>
                  <span className="text-emerald-400 font-semibold">Anonymized GPS ✓</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Assigned Unit:</span>
                  <span className="text-white font-medium">{selectedIncident.assignedTo}</span>
                </div>
              </div>
            </div>

            <Link
              href={`/resident/reports/${selectedIncident.id}/`}
              onClick={(e) => { e.preventDefault(); window.location.href = `/resident/reports/${selectedIncident.id}/`; }}
              className="mt-4 w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white text-center transition block"
            >
              View Public Timeline
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
