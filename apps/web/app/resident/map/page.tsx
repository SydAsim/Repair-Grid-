"use client";

import { useState } from "react";
import Link from "next/link";
import { 
  ArrowLeft, 
  MapPin, 
  Lightbulb, 
  Droplets, 
  AlertTriangle, 
  Filter,
  Layers
} from "lucide-react";

interface MockMarker {
  id: string;
  category: "streetlights" | "potholes" | "blocked_drains";
  title: string;
  location: string;
  status: string;
  lat: number;
  lng: number;
}

const SAMPLE_MARKERS: MockMarker[] = [
  { id: "RG-R-101", category: "streetlights", title: "Streetlight Inactive", location: "Gate 2, University Road", status: "IN PROGRESS", lat: 37.7751, lng: -122.4190 },
  { id: "RG-R-102", category: "blocked_drains", title: "Storm Drain Flooding", location: "Campus Primary School", status: "ASSIGNED", lat: 37.7754, lng: -122.4187 },
  { id: "RG-R-103", category: "potholes", title: "Roadway Cavity", location: "Engineering Lane", status: "VERIFYING", lat: 37.7758, lng: -122.4181 },
  { id: "RG-R-104", category: "streetlights", title: "Corridor Lantern Out", location: "Library Quad", status: "RESOLVED", lat: 37.7760, lng: -122.4178 },
];

export default function ResidentMapPage() {
  const [filter, setFilter] = useState<string>("ALL");
  const [selectedIssue, setSelectedIssue] = useState<MockMarker | null>(SAMPLE_MARKERS[0]);

  const filteredMarkers = SAMPLE_MARKERS.filter(m => filter === "ALL" || m.category === filter);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md px-4 py-3 sticky top-0 z-40 flex items-center justify-between">
        <Link href="/resident" className="inline-flex items-center text-xs font-semibold text-slate-400 hover:text-white transition">
          <ArrowLeft className="h-4 w-4 mr-1" />
          Resident Hub
        </Link>
        <span className="font-bold text-xs tracking-wider text-white">CAMPUS COMMUNITY MAP</span>
        <div className="w-12" />
      </header>

      {/* Filter Tabs */}
      <div className="border-b border-slate-800/80 bg-slate-900/40 p-3 flex items-center space-x-2 overflow-x-auto">
        <button
          onClick={() => setFilter("ALL")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${
            filter === "ALL" ? "bg-indigo-600 text-white" : "bg-slate-800 text-slate-400 hover:text-white"
          }`}
        >
          All Issues
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

      <div className="flex-1 flex flex-col md:flex-row relative overflow-hidden">
        {/* Living Map Canvas */}
        <div className="flex-1 relative bg-slate-900 min-h-[350px] flex items-center justify-center">
          <div className="absolute inset-0 bg-[radial-gradient(#334155_1.5px,transparent_1.5px)] [background-size:24px_24px] opacity-40" />

          {/* Interactive Simulated Markers */}
          <div className="relative z-10 w-full h-full max-w-2xl max-h-[500px] p-8 flex items-center justify-around flex-wrap">
            {filteredMarkers.map((marker, idx) => (
              <div 
                key={marker.id}
                onClick={() => setSelectedIssue(marker)}
                className="cursor-pointer group flex flex-col items-center m-4"
              >
                <div className={`h-9 w-9 rounded-full flex items-center justify-center text-white shadow-lg transition-transform group-hover:scale-125 ${
                  marker.category === "streetlights" 
                    ? "bg-amber-500 ring-4 ring-amber-500/20"
                    : marker.category === "blocked_drains"
                    ? "bg-cyan-500 ring-4 ring-cyan-500/20"
                    : "bg-orange-500 ring-4 ring-orange-500/20"
                }`}>
                  {marker.category === "streetlights" && <Lightbulb className="h-4 w-4" />}
                  {marker.category === "blocked_drains" && <Droplets className="h-4 w-4" />}
                  {marker.category === "potholes" && <AlertTriangle className="h-4 w-4" />}
                </div>
                <span className="mt-1.5 text-[10px] font-bold text-slate-200 bg-slate-950/90 px-2 py-0.5 rounded-md border border-slate-800 shadow">
                  {marker.title}
                </span>
              </div>
            ))}
          </div>

          <div className="absolute bottom-4 left-4 z-20 text-[10px] text-slate-400 bg-slate-950/80 px-3 py-1.5 rounded-lg border border-slate-800 backdrop-blur">
            Amazon Location Service • Campus District Navigation Map
          </div>
        </div>

        {/* Selected Issue Drawer */}
        {selectedIssue && (
          <div className="w-full md:w-80 bg-slate-900/95 border-t md:border-t-0 md:border-l border-slate-800 p-5 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
                  {selectedIssue.category.replace("_", " ")}
                </span>
                <span className="text-[10px] font-semibold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md">
                  {selectedIssue.status}
                </span>
              </div>
              <h3 className="text-base font-bold text-white mb-1">{selectedIssue.title}</h3>
              <p className="text-xs text-slate-400 flex items-center mb-4">
                <MapPin className="h-3 w-3 mr-1 text-slate-500" />
                {selectedIssue.location}
              </p>

              <div className="rounded-xl bg-slate-950/60 p-3 border border-slate-800 space-y-2 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Privacy Protection:</span>
                  <span className="text-emerald-400 font-semibold">Anonymized ✓</span>
                </div>
                <div className="flex justify-between text-slate-400">
                  <span>Coordinates:</span>
                  <span className="text-slate-200 font-mono">{selectedIssue.lat.toFixed(4)}, {selectedIssue.lng.toFixed(4)}</span>
                </div>
              </div>
            </div>

            <Link
              href={`/resident/reports/${selectedIssue.id}`}
              className="mt-6 w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white text-center transition"
            >
              View Public Timeline
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
