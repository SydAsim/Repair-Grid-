"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import Link from "next/link";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { 
  Navigation, 
  Layers, 
  Maximize2, 
  RotateCcw, 
  Play, 
  Pause, 
  Radio, 
  Compass, 
  MapPin, 
  ShieldAlert, 
  Clock, 
  User, 
  ArrowRight, 
  CheckCircle2, 
  AlertTriangle,
  Lightbulb,
  Droplets,
  ExternalLink,
  ChevronRight,
  Plus,
  Minus,
  LocateFixed
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface MapIncident {
  id: string;
  title: string;
  category: "streetlights" | "potholes" | "blocked_drains" | string;
  priority: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | string;
  status: string;
  assignedTo: string;
  eta: string;
  location: string;
  lat: number;
  lng: number;
  imageUrl?: string;
  reportsCount?: number;
  reporterName?: string;
  beforePhoto?: string;
  afterPhoto?: string;
  technicianNotes?: string;
  description?: string;
  aiAnalysis?: string;
}

// Default realistic road waypoint route for Campus District
const CAMPUS_ROUTE_COORDS: [number, number][] = [
  [-122.4230, 37.7720], // Depot / Tech Base
  [-122.4222, 37.7728],
  [-122.4215, 37.7735], // Turn toward Quad
  [-122.4208, 37.7741],
  [-122.4198, 37.7746], // Turn onto University Road
  [-122.4193, 37.7749], // Approaching Gate 2
  [-122.4190, 37.7751], // Destination: RG-2841 Streetlight
];

const TURN_INSTRUCTIONS = [
  { progress: 0.0, text: "Head northeast on Campus Service Way", sub: "Speed: 30 km/h • 1.4 km to site" },
  { progress: 0.3, text: "In 200m, turn right onto University Road", sub: "Moderate campus foot traffic" },
  { progress: 0.65, text: "Continue straight past Science Hall", sub: "Approaching North Gate 2" },
  { progress: 0.9, text: "Slow down: Destination on your right", sub: "Look for pole #SL-2841" },
  { progress: 1.0, text: "Arrived at Scene • Mission RG-2841", sub: "Technician Ahmed Khan ready to repair" },
];

const MAP_STYLES = {
  streets: "https://basemaps.cartocdn.com/gl/voyager-gl-style/style.json",
  dark: "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json",
  satellite: {
    version: 8,
    sources: {
      "esri-sat": {
        type: "raster",
        tiles: ["https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}"],
        tileSize: 256,
        attribution: "&copy; Esri World Imagery",
      },
    },
    layers: [{ id: "esri-sat-layer", type: "raster", source: "esri-sat" }],
  },
  osm: {
    version: 8,
    sources: {
      "osm-tiles": {
        type: "raster",
        tiles: ["https://tile.openstreetmap.org/{z}/{x}/{y}.png"],
        tileSize: 256,
        attribution: "&copy; OpenStreetMap contributors",
      },
    },
    layers: [{ id: "osm-layer", type: "raster", source: "osm-tiles" }],
  },
};

interface InteractiveLiveMapProps {
  incidents?: MapIncident[];
  activeIncidentId?: string | null;
  onSelectIncident?: (incident: MapIncident) => void;
  showWorkerSimulation?: boolean;
  workerName?: string;
  initialCenter?: [number, number];
  initialZoom?: number;
  mode?: "operations" | "worker" | "resident";
  className?: string;
}

export function InteractiveLiveMap({
  incidents = [
    {
      id: "RG-2841",
      title: "Broken Streetlight Array",
      category: "streetlights",
      priority: "HIGH",
      status: "EN ROUTE",
      assignedTo: "Ahmed Khan (Electrical)",
      eta: "4 min",
      location: "North Gate 2, University Road",
      lat: 37.7751,
      lng: -122.4190,
      imageUrl: "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600&auto=format&fit=crop&q=80",
      reportsCount: 4,
    },
    {
      id: "RG-3011",
      title: "Blocked Storm Drain Outside School",
      category: "blocked_drains",
      priority: "CRITICAL",
      status: "DISPATCHED",
      assignedTo: "Drainage Rapid Response Unit #2",
      eta: "12 min",
      location: "Campus Primary School Gate",
      lat: 37.7754,
      lng: -122.4187,
      imageUrl: "https://images.unsplash.com/photo-1541888946425-d0fbb18086f6?w=600&auto=format&fit=crop&q=80",
      reportsCount: 7,
    },
    {
      id: "RG-2953",
      title: "Roadway Cavity (Pothole)",
      category: "potholes",
      priority: "MEDIUM",
      status: "ASSIGNED",
      assignedTo: "Darius Vance (Roads)",
      eta: "35 min",
      location: "Engineering Lane, Campus District",
      lat: 37.7758,
      lng: -122.4181,
      imageUrl: "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?w=600&auto=format&fit=crop&q=80",
      reportsCount: 2,
    },
  ],
  activeIncidentId = "RG-2841",
  onSelectIncident,
  showWorkerSimulation = true,
  workerName = "Ahmed Khan (Van #04)",
  initialCenter = [-122.4200, 37.7740],
  initialZoom = 15.5,
  mode = "operations",
  className = "",
}: InteractiveLiveMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<maplibregl.Map | null>(null);
  const workerMarkerRef = useRef<maplibregl.Marker | null>(null);
  const incidentMarkersRef = useRef<maplibregl.Marker[]>([]);

  // State
  const [activeStyle, setActiveStyle] = useState<"streets" | "dark" | "satellite">("streets");
  const [selectedIncident, setSelectedIncident] = useState<MapIncident | null>(
    incidents.find((i) => i.id === activeIncidentId) || incidents[0] || null
  );
  const [isSimulating, setIsSimulating] = useState(true);
  const [simProgress, setSimProgress] = useState(0.25); // 0 to 1
  const [simSpeed, setSimSpeed] = useState<1 | 2 | 4>(1);
  const [isPitch3D, setIsPitch3D] = useState(false);
  const [turnInstruction, setTurnInstruction] = useState(TURN_INSTRUCTIONS[0]);
  const [remainingDistance, setRemainingDistance] = useState("1.1 km");
  const [remainingEta, setRemainingEta] = useState("4 min");

  // Sync selected incident with prop if changed
  useEffect(() => {
    if (activeIncidentId) {
      const found = incidents.find((i) => i.id === activeIncidentId);
      if (found) {
        setSelectedIncident(found);
        flyToIncident(found);
      }
    }
  }, [activeIncidentId, incidents]);

  // Interpolate position along route
  const getPositionOnRoute = (t: number): [number, number] => {
    const coords = CAMPUS_ROUTE_COORDS;
    const totalSegments = coords.length - 1;
    const scaled = t * totalSegments;
    const index = Math.min(Math.floor(scaled), totalSegments - 1);
    const fraction = scaled - index;

    const start = coords[index];
    const end = coords[index + 1];

    const lng = start[0] + (end[0] - start[0]) * fraction;
    const lat = start[1] + (end[1] - start[1]) * fraction;
    return [lng, lat];
  };

  // Update navigation instructions and ETA based on simulation progress
  useEffect(() => {
    let instruction = TURN_INSTRUCTIONS[0];
    for (const inst of TURN_INSTRUCTIONS) {
      if (simProgress >= inst.progress) {
        instruction = inst;
      }
    }
    setTurnInstruction(instruction);

    const distMeters = Math.max(0, Math.round((1 - simProgress) * 1400));
    setRemainingDistance(distMeters > 1000 ? `${(distMeters / 1000).toFixed(1)} km` : `${distMeters} m`);

    const secondsLeft = Math.max(0, Math.round((1 - simProgress) * 240));
    const mins = Math.floor(secondsLeft / 60);
    const secs = secondsLeft % 60;
    setRemainingEta(secondsLeft <= 0 ? "Arrived" : `${mins}m ${secs}s`);
  }, [simProgress]);

  // Animation Loop for live technician GPS movement
  useEffect(() => {
    if (!isSimulating || !showWorkerSimulation) return;

    const interval = setInterval(() => {
      setSimProgress((prev) => {
        const step = 0.003 * simSpeed;
        if (prev + step >= 1.0) {
          return 1.0; // Stay at destination
        }
        return prev + step;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isSimulating, simSpeed, showWorkerSimulation]);

  // Update worker marker coordinate on map
  useEffect(() => {
    if (!workerMarkerRef.current) return;
    const [lng, lat] = getPositionOnRoute(simProgress);
    workerMarkerRef.current.setLngLat([lng, lat]);
  }, [simProgress]);

  // Fly camera to a specific incident
  const flyToIncident = (incident: MapIncident) => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo({
        center: [incident.lng, incident.lat],
        zoom: 16.5,
        speed: 1.2,
        curve: 1.4,
      });
    }
  };

  // Recenter on live worker
  const locateWorker = () => {
    if (mapInstanceRef.current) {
      const [lng, lat] = getPositionOnRoute(simProgress);
      mapInstanceRef.current.flyTo({
        center: [lng, lat],
        zoom: 16.8,
        pitch: 45,
        speed: 1.5,
      });
    }
  };

  // Toggle 3D Tilt
  const toggle3D = () => {
    if (!mapInstanceRef.current) return;
    const nextPitch = isPitch3D ? 0 : 50;
    mapInstanceRef.current.easeTo({ pitch: nextPitch, duration: 800 });
    setIsPitch3D(!isPitch3D);
  };

  // Zoom helpers
  const zoomIn = () => mapInstanceRef.current?.zoomIn({ duration: 300 });
  const zoomOut = () => mapInstanceRef.current?.zoomOut({ duration: 300 });

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    // Detect system dark mode if applicable
    const isDark = document.documentElement.classList.contains("dark");
    const defaultStyle = isDark ? MAP_STYLES.dark : MAP_STYLES.streets;

    const map = new maplibregl.Map({
      container: mapContainerRef.current,
      style: defaultStyle,
      center: initialCenter,
      zoom: initialZoom,
      pitch: 35,
      bearing: -15,
      attributionControl: false,
    });

    mapInstanceRef.current = map;

    map.on("load", () => {
      // 1. Add Navigation Route Line
      if (!map.getSource("navigation-route")) {
        map.addSource("navigation-route", {
          type: "geojson",
          data: {
            type: "Feature",
            properties: {},
            geometry: {
              type: "LineString",
              coordinates: CAMPUS_ROUTE_COORDS,
            },
          },
        });

        // Route shadow/casing
        map.addLayer({
          id: "route-casing",
          type: "line",
          source: "navigation-route",
          layout: {
            "line-join": "round",
            "line-cap": "round",
          },
          paint: {
            "line-color": "#1e1b4b",
            "line-width": 8,
            "line-opacity": 0.6,
          },
        });

        // Route main line (Glowing Cyan/Indigo)
        map.addLayer({
          id: "route-line",
          type: "line",
          source: "navigation-route",
          layout: {
            "line-join": "round",
            "line-cap": "round",
          },
          paint: {
            "line-color": "#6366f1",
            "line-width": 5,
            "line-opacity": 0.95,
          },
        });
      }

      // 2. Add Incident Markers
      incidentMarkersRef.current.forEach((m) => m.remove());
      incidentMarkersRef.current = [];

      incidents.forEach((incident) => {
        const el = document.createElement("div");
        el.className = "cursor-pointer group";

        const categoryColor =
          incident.category === "streetlights"
            ? "bg-amber-500 ring-amber-500/30 text-amber-950"
            : incident.category === "blocked_drains"
            ? "bg-cyan-500 ring-cyan-500/30 text-cyan-950"
            : "bg-orange-500 ring-orange-500/30 text-orange-950";

        const iconSymbol =
          incident.category === "streetlights"
            ? "💡"
            : incident.category === "blocked_drains"
            ? "🌊"
            : "🕳️";

        el.innerHTML = `
          <div class="relative flex flex-col items-center">
            <div class="h-9 w-9 rounded-full ${categoryColor} ring-4 shadow-xl flex items-center justify-center font-bold text-sm transform transition-transform group-hover:scale-125">
              <span>${iconSymbol}</span>
            </div>
            <div class="mt-1 bg-zinc-900/90 text-white text-[10px] font-mono px-2 py-0.5 rounded shadow border border-white/20 whitespace-nowrap opacity-90 group-hover:opacity-100">
              ${incident.id}
            </div>
          </div>
        `;

        el.addEventListener("click", () => {
          setSelectedIncident(incident);
          if (onSelectIncident) onSelectIncident(incident);
          map.flyTo({ center: [incident.lng, incident.lat], zoom: 16.5 });
        });

        const marker = new maplibregl.Marker({ element: el })
          .setLngLat([incident.lng, incident.lat])
          .addTo(map);

        incidentMarkersRef.current.push(marker);
      });

      // 3. Add Live Moving Worker Marker (Vehicle Beacon)
      if (showWorkerSimulation) {
        const workerEl = document.createElement("div");
        workerEl.className = "relative flex items-center justify-center cursor-pointer";
        workerEl.innerHTML = `
          <div class="relative">
            <!-- Pulsing outer radar beacon -->
            <span class="absolute -inset-2 rounded-full bg-emerald-400 opacity-75 animate-ping"></span>
            <!-- Inner vehicle icon container -->
            <div class="relative h-11 w-11 rounded-full bg-emerald-600 text-white shadow-2xl ring-4 ring-emerald-400/40 flex items-center justify-center font-bold text-xs border-2 border-white">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                <polygon points="3 11 22 2 13 21 11 13 3 11"/>
              </svg>
            </div>
            <div class="absolute -bottom-5 left-1/2 -translate-x-1/2 bg-zinc-950/90 text-emerald-400 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded border border-emerald-500/40 whitespace-nowrap shadow-md">
              LIVE TECH
            </div>
          </div>
        `;

        workerEl.addEventListener("click", locateWorker);

        const [startLng, startLat] = getPositionOnRoute(simProgress);
        const workerMarker = new maplibregl.Marker({ element: workerEl })
          .setLngLat([startLng, startLat])
          .addTo(map);

        workerMarkerRef.current = workerMarker;
      }
    });

    return () => {
      map.remove();
    };
  }, []);

  // Switch map tile style
  const changeStyle = (styleKey: "streets" | "dark" | "satellite") => {
    setActiveStyle(styleKey);
    if (!mapInstanceRef.current) return;

    const styleUrl =
      styleKey === "streets"
        ? MAP_STYLES.streets
        : styleKey === "dark"
        ? MAP_STYLES.dark
        : (MAP_STYLES.satellite as any);

    mapInstanceRef.current.setStyle(styleUrl);
  };

  return (
    <div className={`relative w-full h-full flex flex-col overflow-hidden bg-zinc-950 ${className}`}>
      {/* ========================================================================= */}
      {/* GOOGLE MAPS NAVIGATION BANNER (TURN-BY-TURN HUD) */}
      {/* ========================================================================= */}
      {showWorkerSimulation && (
        <div className="absolute top-3 left-3 right-3 sm:left-4 sm:right-auto sm:max-w-md z-30 pointer-events-auto">
          <div className="bg-zinc-900/95 dark:bg-black/90 text-white rounded-2xl p-3.5 shadow-2xl border border-zinc-700/80 backdrop-blur-xl flex items-center justify-between space-x-3 transition-all">
            <div className="h-10 w-10 rounded-xl bg-indigo-600 flex items-center justify-center text-white flex-shrink-0 shadow-md">
              <Navigation className="h-5 w-5 transform rotate-45" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-mono uppercase tracking-wider text-emerald-400 font-bold">
                  {remainingEta === "Arrived" ? "MISSION TARGET REACHED" : "LIVE ROUTE DISPATCH"}
                </span>
              </div>
              <h4 className="text-xs sm:text-sm font-bold truncate mt-0.5 text-zinc-100">
                {turnInstruction.text}
              </h4>
              <p className="text-[11px] text-zinc-400 truncate">
                {turnInstruction.sub}
              </p>
            </div>

            <div className="text-right flex-shrink-0 border-l border-zinc-700/80 pl-3">
              <span className="text-base font-extrabold text-white block leading-tight font-mono">
                {remainingDistance}
              </span>
              <span className="text-[10px] font-mono text-zinc-400 block font-semibold">
                ETA: {remainingEta}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MAP CANVAS VIEWPORT */}
      {/* ========================================================================= */}
      <div ref={mapContainerRef} className="w-full h-full min-h-[480px] flex-1" />

      {/* ========================================================================= */}
      {/* FLOATING CONTROLS (GOOGLE MAPS STYLE) */}
      {/* ========================================================================= */}
      <div className="absolute top-3 right-3 z-30 flex flex-col space-y-2 pointer-events-auto">
        {/* Style Switcher */}
        <div className="bg-white/90 dark:bg-zinc-900/90 rounded-xl shadow-xl border border-zinc-200 dark:border-zinc-800 p-1 flex items-center space-x-1 backdrop-blur-md">
          <button
            type="button"
            onClick={() => changeStyle("streets")}
            className={`px-2 py-1 rounded-lg text-xs font-semibold transition-all ${
              activeStyle === "streets"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
            }`}
          >
            Streets
          </button>
          <button
            type="button"
            onClick={() => changeStyle("dark")}
            className={`px-2 py-1 rounded-lg text-xs font-semibold transition-all ${
              activeStyle === "dark"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
            }`}
          >
            Dark
          </button>
          <button
            type="button"
            onClick={() => changeStyle("satellite")}
            className={`px-2 py-1 rounded-lg text-xs font-semibold transition-all ${
              activeStyle === "satellite"
                ? "bg-indigo-600 text-white shadow-sm"
                : "text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100"
            }`}
          >
            Satellite
          </button>
        </div>

        {/* Navigation & Camera Controls */}
        <div className="bg-white/90 dark:bg-zinc-900/90 rounded-xl shadow-xl border border-zinc-200 dark:border-zinc-800 p-1 flex flex-col space-y-1 backdrop-blur-md items-center">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={locateWorker}
            className="h-8 w-8 p-0 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40"
            title="Focus Technician GPS"
          >
            <LocateFixed className="h-4 w-4" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={toggle3D}
            className={`h-8 w-8 p-0 font-bold text-xs ${
              isPitch3D ? "text-indigo-600 dark:text-indigo-400" : "text-zinc-600 dark:text-zinc-400"
            }`}
            title="Toggle 3D Perspective"
          >
            3D
          </Button>

          <div className="w-5 h-px bg-zinc-200 dark:bg-zinc-800" />

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={zoomIn}
            className="h-8 w-8 p-0 text-zinc-700 dark:text-zinc-300"
            title="Zoom In"
          >
            <Plus className="h-4 w-4" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={zoomOut}
            className="h-8 w-8 p-0 text-zinc-700 dark:text-zinc-300"
            title="Zoom Out"
          >
            <Minus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SIMULATION CONTROLLER BAR (BOTTOM LEFT) */}
      {/* ========================================================================= */}
      {showWorkerSimulation && (
        <div className="absolute bottom-4 left-4 z-30 pointer-events-auto">
          <div className="bg-white/95 dark:bg-zinc-900/90 text-zinc-900 dark:text-zinc-100 rounded-xl px-3 py-2 shadow-xl border border-zinc-200 dark:border-zinc-800 backdrop-blur-md flex items-center space-x-2.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsSimulating(!isSimulating)}
              className="h-7 px-2 text-xs border-zinc-300 dark:border-zinc-700"
            >
              {isSimulating ? <Pause className="h-3 w-3 mr-1 text-amber-500" /> : <Play className="h-3 w-3 mr-1 text-emerald-500" />}
              <span>{isSimulating ? "Pause GPS" : "Resume GPS"}</span>
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setSimProgress(0)}
              className="h-7 w-7 p-0 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
              title="Reset Route"
            >
              <RotateCcw className="h-3.5 w-3.5" />
            </Button>

            <div className="flex items-center space-x-1 text-[11px] font-mono">
              <span className="text-zinc-500">Speed:</span>
              <button
                type="button"
                onClick={() => setSimSpeed(1)}
                className={`px-1.5 py-0.5 rounded font-bold ${
                  simSpeed === 1 ? "bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900" : "text-zinc-500"
                }`}
              >
                1x
              </button>
              <button
                type="button"
                onClick={() => setSimSpeed(2)}
                className={`px-1.5 py-0.5 rounded font-bold ${
                  simSpeed === 2 ? "bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900" : "text-zinc-500"
                }`}
              >
                2x
              </button>
              <button
                type="button"
                onClick={() => setSimSpeed(4)}
                className={`px-1.5 py-0.5 rounded font-bold ${
                  simSpeed === 4 ? "bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900" : "text-zinc-500"
                }`}
              >
                4x
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ACTIVE INCIDENT DETAILS DRAWER / CARD (BOTTOM RIGHT) */}
      {/* ========================================================================= */}
      {selectedIncident && (
        <div className="absolute bottom-4 right-4 max-w-sm w-[calc(100%-2rem)] sm:w-80 z-30 pointer-events-auto">
          <div className="bg-white/95 dark:bg-zinc-900/95 text-zinc-900 dark:text-zinc-100 rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 p-4 backdrop-blur-md space-y-3">
            {/* Header */}
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <Badge
                    variant={
                      selectedIncident.priority === "CRITICAL"
                        ? "destructive"
                        : selectedIncident.priority === "HIGH"
                        ? "warning"
                        : "secondary"
                    }
                    className="text-[10px] font-mono px-1.5 py-0"
                  >
                    {selectedIncident.priority}
                  </Badge>
                  <span className="text-[11px] font-mono font-bold text-zinc-500">
                    {selectedIncident.id}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-zinc-950 dark:text-zinc-50 mt-1 line-clamp-1">
                  {selectedIncident.title}
                </h3>
              </div>
            </div>

            {/* Reporter Information if available */}
            {selectedIncident.reporterName && (
              <div className="flex items-center justify-between text-[11px] bg-zinc-100 dark:bg-zinc-800/60 p-2 rounded-lg">
                <span className="text-zinc-500 dark:text-zinc-400">Reporter:</span>
                <strong className="text-zinc-900 dark:text-white">{selectedIncident.reporterName}</strong>
              </div>
            )}

            {/* Thumbnail Images: Before / After comparison if afterPhoto exists, else single */}
            {selectedIncident.afterPhoto ? (
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <span className="text-[9px] font-mono text-rose-500 font-bold block">1. Before (Resident)</span>
                  <div className="h-20 w-full rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-black">
                    <img
                      src={selectedIncident.beforePhoto || selectedIncident.imageUrl || "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600"}
                      alt="Before Repair"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-[9px] font-mono text-emerald-500 font-bold block">2. After (Repaired)</span>
                  <div className="h-20 w-full rounded-lg overflow-hidden border border-emerald-500/40 bg-black">
                    <img
                      src={selectedIncident.afterPhoto}
                      alt="After Repair"
                      className="w-full h-full object-cover"
                    />
                  </div>
                </div>
              </div>
            ) : selectedIncident.imageUrl || selectedIncident.beforePhoto ? (
              <div className="h-24 w-full rounded-lg overflow-hidden border border-zinc-200 dark:border-zinc-800 relative group">
                <img
                  src={selectedIncident.imageUrl || selectedIncident.beforePhoto}
                  alt={selectedIncident.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute bottom-1.5 left-2 bg-black/70 text-white text-[9px] font-mono px-1.5 py-0.5 rounded backdrop-blur-sm">
                  {selectedIncident.reportsCount || 1} Citizen Report
                </div>
              </div>
            ) : null}

            {/* Location & Status Info */}
            <div className="space-y-1.5 text-xs">
              <div className="flex items-center text-zinc-600 dark:text-zinc-400">
                <MapPin className="h-3.5 w-3.5 mr-1.5 text-zinc-500 flex-shrink-0" />
                <span className="truncate font-medium">{selectedIncident.location}</span>
              </div>
              <div className="flex items-center text-zinc-600 dark:text-zinc-400">
                <User className="h-3.5 w-3.5 mr-1.5 text-zinc-500 flex-shrink-0" />
                <span className="truncate">{selectedIncident.assignedTo}</span>
              </div>
              {selectedIncident.status && (
                <div className="flex items-center justify-between text-[11px] pt-0.5">
                  <span className="text-zinc-500">Status:</span>
                  <span className={`font-mono font-bold px-2 py-0.5 rounded text-[10px] ${
                    selectedIncident.status.includes("APPROVED") || selectedIncident.status.includes("VERIFIED")
                      ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                      : "bg-indigo-500/10 text-indigo-400"
                  }`}>
                    {selectedIncident.status}
                  </span>
                </div>
              )}
            </div>

            {/* CTA Navigation button */}
            <div className="pt-1 flex items-center space-x-2">
              <Link
                href={
                  mode === "worker"
                    ? `/worker/missions/${selectedIncident.id}/`
                    : `/operations/missions`
                }
                onClick={(e) => {
                  if (mode === "worker") {
                    e.preventDefault();
                    window.location.href = `/worker/missions/${selectedIncident.id}/`;
                  }
                }}
                className="flex-1"
              >
                <Button size="sm" className="w-full text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white">
                  <span>View Mission</span>
                  <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </Button>
              </Link>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => flyToIncident(selectedIncident)}
                className="h-8 text-xs border-zinc-300 dark:border-zinc-700"
                title="Center Camera on Pin"
              >
                Focus
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default InteractiveLiveMap;
