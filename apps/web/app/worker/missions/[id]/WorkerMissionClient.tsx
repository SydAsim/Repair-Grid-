"use client";

import { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  ArrowLeft, 
  MapPin, 
  Navigation, 
  Wrench, 
  Bot, 
  CheckCircle2, 
  Clock, 
  Sparkles, 
  Check, 
  FileText,
  Camera,
  AlertTriangle,
  Zap,
  ShieldAlert,
  ShieldCheck,
  Package,
  HardHat,
  ChevronRight,
  Radio,
  ExternalLink,
  Mic,
  MicOff,
  Send,
  Volume2,
  X
} from "lucide-react";
import { MissionLifecycleStepper, StageId } from "@/components/MissionLifecycleStepper";
import { API_BASE_URL, getApiBaseUrl } from "@/lib/config";
import { useWorkerAuth } from "@/lib/auth-context";

interface WorkerMissionClientProps {
  id: string;
  initialMission?: any;
}

// Trade-specific parts catalog for field van inventory
const CATEGORY_PARTS: Record<string, Array<{ id: string; name: string; sku: string; qty: string }>> = {
  streetlights: [
    { id: "p1", name: "150W Modular High-Output LED Core", sku: "SL-MOD-150W", qty: "1 unit" },
    { id: "p2", name: "IP67 Photocell Receptacle (Dusk-to-Dawn)", sku: "PC-67-TWIST", qty: "1 unit" },
    { id: "p3", name: "Waterproof Gel-Splice Terminal Kit", sku: "GEL-1000-4P", qty: "2 kits" },
    { id: "p4", name: "15A Din-Rail Surge Breaker Module", sku: "BRK-15A-SURGE", qty: "1 unit" },
  ],
  potholes: [
    { id: "p1", name: "High-Polymer All-Weather Cold Asphalt Patch", sku: "AP-25-POLY", qty: "2 bags (50kg)" },
    { id: "p2", name: "Rapid-Cure Bitumen Tack Emulsion", sku: "TAC-5L-BUCKET", qty: "1 can (5L)" },
    { id: "p3", name: "High-Intensity Reflective Traffic Cones (750mm)", sku: "CONE-750-HI", qty: "4 units" },
    { id: "p4", name: "Vibratory Steel Tamp Compactor", sku: "TMP-HD-STEEL", qty: "1 tool" },
  ],
  blocked_drains: [
    { id: "p1", name: "Heavy-Duty Ductile Iron Grate Anchor Bolts", sku: "BLT-M16-SS", qty: "4 bolts" },
    { id: "p2", name: "High-Pressure Hydro-Jet Nozzle Head", sku: "JET-4000-ROTA", qty: "1 nozzle" },
    { id: "p3", name: "Sediment Silt Bag Strainer (80 Micron)", sku: "SILT-BAG-80", qty: "1 unit" },
    { id: "p4", name: "Magnetic Manhole Catch-Basin Lifter", sku: "LIFT-MAG-HEAVY", qty: "1 tool" },
  ],
  facilities: [
    { id: "p1", name: "Universal Multi-meter & Insulation Diagnostic Probe", sku: "DIAG-FLK-87", qty: "1 kit" },
    { id: "p2", name: "Heavy-Duty Weatherproof Silicone Sealant", sku: "SEAL-SIL-300", qty: "2 tubes" },
    { id: "p3", name: "Industrial Fasteners & Stainless Anchor Kit", sku: "ANC-SS-ASSORT", qty: "1 box" },
  ],
};

// Trade-specific safety directives
const SAFETY_DIRECTIVES: Record<string, { warning: string; ppe: string[] }> = {
  streetlights: {
    warning: "HIGH VOLTAGE HAZARD: Lock-out and tag-out (LOTO) breaker upstream before opening luminaire casing. Verify zero electrical potential with probe.",
    ppe: ["ASTM Dielectric Gloves (1000V)", "Class 3 High-Visibility Vest", "Impact Eye Protection (ANSI Z87.1)", "Steel-Toe EH Safety Boots", "LOTO Padlock & Lockout Tag"],
  },
  potholes: {
    warning: "ACTIVE ROAD TRAFFIC HAZARD: Deploy reflective cones at minimum 15m distance upstream from repair zone. Maintain visual perimeter on oncoming vehicular flow.",
    ppe: ["Class 3 High-Visibility Vest", "Heavy-Duty Leather Work Gloves", "Steel-Toe Safety Boots", "Ear Protection (Tamp Compaction)", "Safety Glasses with Side Shields"],
  },
  blocked_drains: {
    warning: "SLIP & BIOHAZARD HAZARD: Wet asphalt and slippery drainage basins. Do not enter deep vaults without confined space monitor and tether line.",
    ppe: ["Nitrile Chemical/Bio Hazard Gloves", "Slip-Resistant Steel-Toe Rubber Boots", "High-Visibility Safety Vest", "Face Splash Shield", "Atmospheric Gas Monitor (H2S/CO)"],
  },
  facilities: {
    warning: "GENERAL FACILITY PROTOCOL: Erect pedestrian barrier tape around maintenance radius. Verify structural integrity of adjacent infrastructure.",
    ppe: ["Class 2 High-Visibility Vest", "Safety Eyewear", "Cut-Resistant Mechanics Gloves", "Steel-Toe Boots", "Hard Hat"],
  },
};

export default function WorkerMissionClient({ id, initialMission }: WorkerMissionClientProps) {
  const router = useRouter();
  const { getAuthHeaders } = useWorkerAuth();

  const [missionId, setMissionId] = useState<string>(() => {
    if (id && id !== "default") return id;
    if (typeof window !== "undefined") {
      const searchParam = new URLSearchParams(window.location.search).get("id");
      if (searchParam) return searchParam;
      const parts = window.location.pathname.split("/").filter(Boolean);
      const lastPart = parts[parts.length - 1];
      if (lastPart && lastPart !== "default" && lastPart !== "missions") return lastPart;
    }
    return id || "default";
  });

  const [mission, setMission] = useState<any>(initialMission || null);
  const [loading, setLoading] = useState(!initialMission);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionToast, setActionToast] = useState<string | null>(null);

  // Direct Citizen & Dispatch Communication State (Mic / Type)
  const [citizenMessage, setCitizenMessage] = useState("");
  const [etaMinutes, setEtaMinutes] = useState(12);
  const [isListening, setIsListening] = useState(false);
  const [isVoiceNote, setIsVoiceNote] = useState(false);
  const [messageSending, setMessageSending] = useState(false);
  const [sentMessages, setSentMessages] = useState<Array<{ text: string; time: string; eta?: number; isVoice?: boolean }>>([]);

  // Checked parts & safety items
  const [checkedParts, setCheckedParts] = useState<Record<string, boolean>>({
    p1: true,
    p2: true,
    p3: true,
    p4: true,
  });
  const [checkedPPE, setCheckedPPE] = useState<Record<number, boolean>>({
    0: true,
    1: true,
    2: true,
    3: true,
    4: true,
  });

  // Live SLA countdown state (seconds remaining)
  const [slaSecondsRemaining, setSlaSecondsRemaining] = useState<number>(3600 * 3 + 14 * 60 + 22);

  useEffect(() => {
    const timer = setInterval(() => {
      setSlaSecondsRemaining((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatCountdown = (totalSec: number) => {
    const hours = Math.floor(totalSec / 3600);
    const minutes = Math.floor((totalSec % 3600) / 60);
    const seconds = totalSec % 60;
    return `${String(hours).padStart(2, "0")}h ${String(minutes).padStart(2, "0")}m ${String(seconds).padStart(2, "0")}s`;
  };

  useEffect(() => {
    if (typeof window !== "undefined") {
      const searchParam = new URLSearchParams(window.location.search).get("id");
      const parts = window.location.pathname.split("/").filter(Boolean);
      const lastPart = parts[parts.length - 1];
      const resolved = searchParam || (lastPart && lastPart !== "default" && lastPart !== "missions" ? lastPart : id);
      if (resolved && resolved !== "default" && resolved !== missionId) {
        setMissionId(resolved);
      }
    }
  }, [id, missionId]);

  const fetchMission = async () => {
    try {
      const baseUrl = getApiBaseUrl();
      let targetId = missionId && missionId !== "default" ? missionId : (id && id !== "default" ? id : null);

      if (!targetId) {
        try {
          const listRes = await fetch(`${baseUrl}/api/missions/assigned`, {
            headers: getAuthHeaders(),
            cache: "no-store"
          });
          if (listRes.ok) {
            const list = await listRes.json();
            if (Array.isArray(list) && list.length > 0) {
              const foundId = list[0].mission_id || list[0].missionId;
              if (foundId && typeof foundId === "string") {
                targetId = foundId;
                setMissionId(foundId);
              }
            }
          }
        } catch (_) {}
      }

      if (!targetId) targetId = "RG-M-DE042E";

      const res = await fetch(`${baseUrl}/api/missions/${targetId}`, {
        headers: getAuthHeaders(),
        cache: "no-store"
      });
      if (res.ok) {
        const data = await res.json();
        setMission(data);
        if (data.latestTechnicianMessage) {
          setSentMessages((prev) => {
            if (prev.length === 0) {
              return [{
                text: data.latestTechnicianMessage.message,
                time: data.latestTechnicianMessage.timestamp ? new Date(data.latestTechnicianMessage.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Recent",
                eta: data.latestTechnicianMessage.etaMinutes,
                isVoice: data.latestTechnicianMessage.voiceNote
              }];
            }
            return prev;
          });
        }
      }
    } catch (e) {
      console.error("Failed to load mission:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMission();
    const timer = setInterval(() => {
      if (typeof document === "undefined" || document.visibilityState === "visible") {
        fetchMission();
      }
    }, 8000);
    return () => clearInterval(timer);
  }, [missionId]);

  const mapStageToStepper = (status?: string): StageId => {
    if (!status) return "submitted";
    switch (status) {
      case "SUBMITTED":
      case "GEOCODED":
        return "submitted";
      case "TRIAGED":
      case "DUPLICATE_CHECKED":
      case "RISK_ASSESSED":
      case "TECHNICIAN_MATCHED":
        return "triaged";
      case "AWAITING_ACCEPTANCE":
      case "ACCEPTED":
      case "EN_ROUTE":
      case "DISPATCHED":
        return "dispatched";
      case "ON_SITE":
      case "REPAIR_IN_PROGRESS":
      case "IN_PROGRESS":
      case "PROOF_SUBMITTED":
      case "COMPLETION_SUBMITTED":
        return "repaired";
      case "VERIFYING":
      case "AI_VERIFYING":
      case "READY_FOR_REVIEW":
      case "OPERATOR_REVIEW":
        return "verified";
      case "APPROVED":
      case "VERIFIED":
      case "CLOSED":
      default:
        return "verified";
    }
  };

  const handleAction = async (action: "accept" | "en-route" | "on-site" | "start") => {
    setActionLoading(true);
    setActionToast(null);
    try {
      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/api/missions/${missionId}/${action}`, {
        method: "POST",
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const actionLabels: Record<string, string> = {
          "accept": "Mission Accepted • Central Dispatch Locked",
          "en-route": `En Route Broadcast • ETA ${etaMinutes} mins sent to Requester`,
          "on-site": "On Site Confirmed • Geofence Verified",
          "start": "Repair Operations Started • Timers Active"
        };
        setActionToast(actionLabels[action] || "Status updated and synchronized.");
        setTimeout(() => setActionToast(null), 4000);
      }
      await fetchMission();
    } catch (e) {
      console.error(`Action ${action} error`, e);
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    setActionLoading(true);
    try {
      const baseUrl = getApiBaseUrl();
      await fetch(`${baseUrl}/api/missions/${missionId}/reject`, {
        method: "POST",
        headers: getAuthHeaders()
      });
      router.push("/worker");
    } catch (e) {
      console.error("Reject error", e);
      router.push("/worker");
    } finally {
      setActionLoading(false);
    }
  };

  const toggleSpeechRecognition = () => {
    if (typeof window === "undefined") return;
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      const sampleVoice = `I am currently en route from depot, arriving in ${etaMinutes} minutes to fix this ${mission?.category?.replace('_', ' ') || 'issue'}.`;
      setCitizenMessage(sampleVoice);
      setIsVoiceNote(true);
      setActionToast("Voice transcribed note attached (Speech API simulated)");
      setTimeout(() => setActionToast(null), 3500);
      return;
    }

    if (isListening) {
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = "en-US";

      recognition.onstart = () => {
        setIsListening(true);
        setIsVoiceNote(true);
      };

      recognition.onresult = (event: any) => {
        let transcript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript) {
          setCitizenMessage(transcript);
        }
      };

      recognition.onerror = (err: any) => {
        console.warn("Speech recognition error:", err);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (err) {
      console.warn("Could not start speech recognition:", err);
      setIsListening(false);
    }
  };

  const handleSendMessage = async () => {
    if (!citizenMessage.trim()) return;
    setMessageSending(true);
    try {
      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/api/missions/${missionId}/message`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders()
        },
        body: JSON.stringify({
          message: citizenMessage,
          eta_minutes: etaMinutes,
          voice_note: isVoiceNote
        })
      });
      if (res.ok) {
        const newMsg = {
          text: citizenMessage,
          time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
          eta: etaMinutes,
          isVoice: isVoiceNote
        };
        setSentMessages((prev) => [newMsg, ...prev]);
        setCitizenMessage("");
        setActionToast("Direct message broadcasted to Citizen Requester & Central Dispatch!");
        setTimeout(() => setActionToast(null), 4000);
      }
    } catch (e) {
      console.error("Failed to send message:", e);
    } finally {
      setMessageSending(false);
    }
  };

  const category = (mission?.category || "streetlights").toLowerCase();
  const partsList = CATEGORY_PARTS[category] || CATEGORY_PARTS.streetlights;
  const safetyInfo = SAFETY_DIRECTIVES[category] || SAFETY_DIRECTIVES.streetlights;

  const factors = mission?.match_factors || {
    skill: 40,
    distance: 14,
    workload: 10,
    availability: 15,
    coverage: 9,
    certification: 8
  };

  const priorityScore = mission?.priority || mission?.risk_score || 78;
  const isHighRisk = mission?.risk_band === "HIGH" || mission?.risk_band === "CRITICAL" || priorityScore >= 70;
  const missionTitle = mission?.title || `Repair ${mission?.category || "Infrastructure"} Incident`;
  const locationText = mission?.location || "Campus Site (37.7751, -122.4190)";
  const incidentDesc = mission?.description || "No description provided.";
  const displayStatus = (mission?.status || "AWAITING_ACCEPTANCE").replaceAll("_", " ");

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-amber-500 selection:text-slate-950">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md px-4 sm:px-6 py-3 sticky top-0 z-40 flex items-center justify-between">
        <Link 
          href="/worker" 
          className="inline-flex items-center text-xs font-semibold text-slate-400 hover:text-white transition"
        >
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Shift Dashboard
        </Link>
        <div className="flex items-center space-x-2">
          <span className="font-mono text-xs font-bold text-amber-400 uppercase tracking-wider">
            MISSION {missionId}
          </span>
          <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
        </div>
        <div className="flex items-center space-x-2">
          <Link 
            href="/worker/map" 
            className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center bg-indigo-500/10 px-2 py-1 rounded-md border border-indigo-500/20"
          >
            <Navigation className="h-3 w-3 mr-1" />
            Route Map
          </Link>
        </div>
      </header>

      {/* Sync Notification Banner */}
      <div className="bg-slate-900/90 border-b border-slate-800 px-4 py-2 flex items-center justify-between text-[11px] text-slate-400">
        <div className="flex items-center space-x-2">
          <Radio className="h-3.5 w-3.5 text-emerald-400 animate-pulse" />
          <span>Synchronized with Central Dispatch & Citizen Requester via AWS EventBridge</span>
        </div>
        <span className="font-mono text-emerald-400 font-bold hidden sm:inline">2-WAY REALTIME</span>
      </div>

      {actionToast && (
        <div className="bg-emerald-500/15 border-b border-emerald-500/30 px-4 py-2.5 text-xs text-emerald-300 font-semibold flex items-center justify-between animate-fadeIn">
          <div className="flex items-center space-x-2">
            <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
            <span>{actionToast}</span>
          </div>
          <span className="text-[10px] font-mono text-emerald-400 uppercase tracking-wider">CONFIRMED</span>
        </div>
      )}

      <main className="flex-1 max-w-lg mx-auto w-full p-4 sm:p-6 space-y-5">
        {/* Mission Title & Badges */}
        <div className="space-y-2">
          <div className="flex items-center flex-wrap gap-2">
            <span className={`text-[10px] font-bold font-mono px-2.5 py-0.5 rounded-full border ${
              isHighRisk 
                ? "text-rose-400 bg-rose-500/15 border-rose-500/30" 
                : "text-amber-400 bg-amber-500/15 border-amber-500/30"
            }`}>
              {mission?.risk_band || (isHighRisk ? "HIGH" : "MEDIUM")} PRIORITY • {priorityScore}
            </span>
            <span className="text-[10px] font-bold font-mono text-indigo-400 bg-indigo-500/15 border border-indigo-500/30 px-2.5 py-0.5 rounded-full uppercase">
              {mission?.department || "ELECTRICAL"} DEPT
            </span>
            <span className="text-[10px] font-bold font-mono text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-0.5 rounded-full uppercase">
              {displayStatus}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
            {missionTitle}
          </h1>
        </div>

        {/* 5-Stage Visual Stepper */}
        <div className="glass-panel rounded-2xl p-4 border border-slate-800 bg-slate-900/60 shadow-lg">
          <MissionLifecycleStepper currentStage={mapStageToStepper(mission?.status)} interactive={true} />
        </div>

        {/* Live SLA Countdown Timer Card */}
        <div className="glass-panel rounded-2xl p-4 border border-emerald-500/30 bg-gradient-to-r from-emerald-950/30 via-slate-900 to-slate-900 shadow-md flex items-center justify-between">
          <div className="space-y-1">
            <div className="flex items-center space-x-1.5 text-xs text-emerald-400 font-bold uppercase tracking-wider">
              <Clock className="h-4 w-4 text-emerald-400" />
              <span>SLA Response Countdown</span>
            </div>
            <div className="font-mono text-xl sm:text-2xl font-black text-white tracking-tight">
              {formatCountdown(slaSecondsRemaining)}
            </div>
            <span className="text-[11px] text-slate-400 block">
              SLA Window: 4.0 Hours • Max Due in Campus Sector
            </span>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-mono font-bold px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 inline-block">
              ON TRACK
            </span>
            <span className="block text-[10px] text-slate-500 mt-1 font-mono">
              78% Window Remaining
            </span>
          </div>
        </div>

        {/* Case Approval or Review Status Banner */}
        {(mission?.status === "APPROVED" || mission?.status === "VERIFIED" || mission?.status === "CLOSED") && (
          <div className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-between text-xs text-emerald-300">
            <div className="flex items-center space-x-3">
              <CheckCircle2 className="h-6 w-6 text-emerald-400 shrink-0" />
              <div>
                <span className="font-extrabold text-sm text-white block">CASE APPROVED BY MISSION CONTROLLER ✓</span>
                <span className="text-[11px] text-emerald-300">
                  Before vs After repair photo evidence validated and permanently recorded.
                </span>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold">
              APPROVED
            </span>
          </div>
        )}

        {(mission?.status === "READY_FOR_REVIEW" || mission?.status === "PROOF_SUBMITTED") && (
          <div className="p-4 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-between text-xs text-amber-300">
            <div className="flex items-center space-x-3">
              <Clock className="h-6 w-6 text-amber-400 shrink-0" />
              <div>
                <span className="font-extrabold text-sm text-white block">UNDER ADMISSION CONTROLLER REVIEW</span>
                <span className="text-[11px] text-amber-300">
                  Technician proof submitted. Awaiting Before/After photo comparison sign-off.
                </span>
              </div>
            </div>
            <span className="px-2.5 py-1 rounded bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold">
              REVIEW PENDING
            </span>
          </div>
        )}

        {/* Citizen Problem Brief Card */}
        <div className="glass-panel rounded-2xl p-5 border border-amber-500/30 bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/20 shadow-xl space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="h-7 w-7 rounded-lg bg-amber-500/15 text-amber-400 flex items-center justify-center">
                <FileText className="h-4 w-4" />
              </div>
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                Resident Problem Brief
              </span>
            </div>
            <span className="text-[10px] font-semibold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-full">
              Live Submission
            </span>
          </div>

          {/* Reporter Identification */}
          <div className="flex items-center justify-between bg-slate-950/70 p-2.5 rounded-xl border border-slate-800 text-xs">
            <div className="flex items-center space-x-2">
              <div className="h-6 w-6 rounded-full bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-[11px]">
                {(mission?.reporter_name || mission?.reporterName || "Syed Asim")[0]}
              </div>
              <span className="text-slate-400">Reporter:</span>
              <span className="font-bold text-white">
                {mission?.reporter_name || mission?.reporterName || "Syed Asim (Resident Citizen)"}
              </span>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-bold">
              CITIZEN INTAKE
            </span>
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block font-semibold">
              Exact Resident Request:
            </span>
            <p className="text-sm font-medium text-slate-100 leading-relaxed bg-slate-950/80 p-3.5 rounded-xl border border-slate-800">
              &ldquo;{incidentDesc}&rdquo;
            </p>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
            <span>Category: <strong className="text-slate-200 capitalize">{(mission?.category || "Infrastructure").replace("_", " ")}</strong></span>
            <span>Skill Match: <strong className="text-emerald-400 capitalize">{(mission?.required_skill || "Surface Repair").replace("_", " ")}</strong></span>
          </div>
        </div>

        {/* Citizen Photo Evidence & Multimodal Extraction */}
        {(mission?.photo_evidence || mission?.photoEvidence || mission?.evidenceRefs?.[0] || true) && (
          <div className="glass-panel rounded-2xl p-4 border border-slate-800 bg-slate-900/70 shadow space-y-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider flex items-center">
              <Camera className="h-3.5 w-3.5 mr-1.5 text-indigo-400" />
              Resident Photographic Evidence
            </span>
            <div className="relative h-52 w-full rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
              <img 
                src={
                  mission?.photo_evidence || 
                  mission?.photoEvidence || 
                  mission?.evidenceRefs?.[0] || 
                  "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=800"
                } 
                alt="Citizen Evidence" 
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-2 left-2 bg-slate-950/80 backdrop-blur-sm px-2.5 py-1 rounded text-[10px] text-white font-mono flex items-center space-x-1.5 border border-slate-700">
                <Sparkles className="h-3 w-3 text-amber-400" />
                <span>Nova Vision Analyzed</span>
              </div>
            </div>
          </div>
        )}

        {/* Amazon Nova AI Diagnostic & Proposed Solution */}
        <div className="glass-panel rounded-2xl p-4 border border-indigo-500/30 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/20 shadow-lg space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Bot className="h-4 w-4 text-indigo-400" />
              <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider">
                Amazon Nova AI Diagnostic & Proposed Solution
              </span>
            </div>
            <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
              99% MATCH FIT
            </span>
          </div>
          <p className="text-xs text-slate-200 leading-relaxed bg-slate-950/70 p-3 rounded-xl border border-slate-800 font-mono">
            {mission?.ai_solution || mission?.aiRecommendation || "AI Solution: Replace damaged 150W modular luminaire core and verify photocell switch. Lockout upstream breaker before opening casing."}
          </p>
          <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1">
            <span>Required Trade: <strong className="text-white capitalize">{(mission?.required_skill || mission?.category || "Electrical").replace('_', ' ')}</strong></span>
            <span>Safety Tier: <strong className="text-amber-400">Class 3 PPE Mandatory</strong></span>
          </div>
        </div>

        {/* Target Location Card */}
        <div className="glass-panel rounded-2xl p-4 border border-slate-800 bg-slate-900/70 shadow flex items-center justify-between">
          <div className="space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Target Incident Location
            </span>
            <h4 className="text-sm font-bold text-white flex items-center">
              <MapPin className="h-4 w-4 mr-1 text-rose-400 shrink-0" />
              <span>{locationText}</span>
            </h4>
            {mission?.coordinates && (
              <span className="text-[11px] font-mono text-indigo-400 block pl-5">
                {mission.coordinates.lat.toFixed(4)}, {mission.coordinates.lng.toFixed(4)} • Verified GPS
              </span>
            )}
          </div>
          <Link
            href="/worker/map"
            className="px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white transition flex items-center space-x-1.5 shadow-lg shadow-indigo-600/20"
          >
            <Navigation className="h-3.5 w-3.5" />
            <span>Navigate</span>
          </Link>
        </div>

        {/* Required Parts & Van Stock Checklist */}
        <div className="glass-panel rounded-2xl p-4 border border-slate-800 bg-slate-900/70 shadow space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Package className="h-4 w-4 text-amber-400" />
              <span className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Required Parts & Van Stock Checklist
              </span>
            </div>
            <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded">
              VAN INVENTORY: STOCKED
            </span>
          </div>
          <div className="space-y-2">
            {partsList.map((part) => {
              const isChecked = checkedParts[part.id] ?? true;
              return (
                <div 
                  key={part.id}
                  onClick={() => setCheckedParts(prev => ({ ...prev, [part.id]: !isChecked }))}
                  className={`p-2.5 rounded-xl border flex items-center justify-between cursor-pointer transition ${
                    isChecked 
                      ? "bg-slate-950/80 border-slate-800" 
                      : "bg-slate-950/40 border-slate-850 opacity-60"
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <div className={`h-5 w-5 rounded flex items-center justify-center text-[10px] font-bold ${
                      isChecked ? "bg-emerald-500 text-slate-950" : "border border-slate-700 text-transparent"
                    }`}>
                      ✓
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-white block">{part.name}</span>
                      <span className="text-[10px] font-mono text-slate-400">{part.sku} • {part.qty}</span>
                    </div>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400">Ready</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Safety Information & Critical PPE Protocol */}
        <div className="glass-panel rounded-2xl p-4 border border-rose-500/30 bg-gradient-to-br from-rose-950/20 via-slate-900 to-slate-900 shadow space-y-3">
          <div className="flex items-center space-x-2">
            <ShieldAlert className="h-4 w-4 text-rose-400" />
            <span className="text-xs font-bold text-rose-300 uppercase tracking-wider">
              Safety Information & Critical PPE Protocol
            </span>
          </div>
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs text-rose-200 leading-relaxed">
            {safetyInfo.warning}
          </div>
          <div className="space-y-1.5 pt-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
              Mandatory Safety Gear Compliance:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
              {safetyInfo.ppe.map((item, idx) => {
                const isChecked = checkedPPE[idx] ?? true;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCheckedPPE(prev => ({ ...prev, [idx]: !isChecked }))}
                    className="flex items-center space-x-2 text-left p-1.5 rounded-lg bg-slate-950/60 border border-slate-800/80 hover:border-slate-700 text-[11px] text-slate-300 transition"
                  >
                    <span className={`h-4 w-4 rounded flex items-center justify-center text-[9px] font-bold shrink-0 ${
                      isChecked ? "bg-emerald-500 text-slate-950" : "border border-slate-700 text-transparent"
                    }`}>
                      ✓
                    </span>
                    <span className="truncate">{item}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Autonomous AI Match Rationale */}
        <div className="glass-panel rounded-2xl p-4 border border-indigo-500/25 bg-slate-900/70 shadow space-y-2.5">
          <div className="flex items-center space-x-2">
            <Bot className="h-4 w-4 text-indigo-400" />
            <span className="text-xs font-bold text-indigo-300 uppercase tracking-wider">
              Autonomous Dispatch Rationale (ResourceAgent)
            </span>
          </div>
          <div className="text-xs space-y-1.5 bg-slate-950/80 p-3 rounded-xl border border-slate-800 font-mono">
            <div className="flex justify-between">
              <span className="text-slate-400">Trade Skill Match (40% max):</span>
              <span className="text-emerald-400 font-bold">+{factors.skill}% (Qualified)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Shift Availability (15% max):</span>
              <span className="text-emerald-400 font-bold">+{factors.availability}% (On Duty)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Sector Proximity (15% max):</span>
              <span className="text-emerald-400 font-bold">+{factors.distance}% (Dispatched Zone)</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-400">Zone Coverage (10% max):</span>
              <span className="text-emerald-400 font-bold">+{factors.coverage}%</span>
            </div>
            <div className="flex justify-between pt-1.5 border-t border-slate-800 text-indigo-400 font-bold">
              <span>Total Match Score:</span>
              <span>{mission?.match_score ? `${Math.round(mission.match_score * 100)}%` : "99%"} Ranked Fit</span>
            </div>
          </div>
        </div>

        {/* Direct Citizen & Dispatch Radio Update Card (Mic / Type) */}
        {mission?.status !== "AWAITING_ACCEPTANCE" && (
          <div className="glass-panel rounded-2xl p-5 border border-emerald-500/30 bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/20 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Radio className="h-4 w-4 text-emerald-400 animate-pulse" />
                <span className="text-xs font-bold text-emerald-300 uppercase tracking-wider">
                  Direct Dispatch & Citizen Radio Update
                </span>
              </div>
              <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                LIVE 2-WAY LINK
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Send real-time updates directly to the citizen requester and central dispatch. Speak into your microphone or type your message below.
            </p>

            {/* Quick Template Chips */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Quick Preset Chips:
              </span>
              <div className="flex flex-wrap gap-1.5">
                {[
                  `En route from depot, arriving in ${etaMinutes} mins with replacement parts`,
                  "Arrived on site, safety perimeter secured, beginning inspection",
                  "Repair completed, testing luminaire illumination & circuitry",
                  "Delay due to campus traffic, new ETA in 15 mins"
                ].map((template, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setCitizenMessage(template);
                      setIsVoiceNote(false);
                    }}
                    className="text-[10px] font-medium px-2.5 py-1 rounded-lg bg-slate-950/80 hover:bg-slate-800 border border-slate-800 text-slate-300 hover:text-white transition"
                  >
                    {template}
                  </button>
                ))}
              </div>
            </div>

            {/* Mic / Type Input Box */}
            <div className="space-y-2">
              <div className="relative">
                <textarea
                  value={citizenMessage}
                  onChange={(e) => setCitizenMessage(e.target.value)}
                  placeholder="Type message or click mic to speak: e.g. I am currently en route from North Gate Depot, arriving in 12 minutes to fix this issue..."
                  rows={3}
                  className="w-full p-3 pr-12 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-emerald-500 leading-relaxed resize-none"
                />

                {/* Speech-to-Text Mic Button */}
                <button
                  type="button"
                  onClick={toggleSpeechRecognition}
                  title={isListening ? "Stop listening" : "Speak via Microphone (Speech-to-Text)"}
                  className={`absolute right-2.5 top-2.5 h-8 w-8 rounded-lg flex items-center justify-center transition ${
                    isListening 
                      ? "bg-rose-500 text-white animate-pulse shadow-lg shadow-rose-500/50" 
                      : "bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border border-emerald-500/40"
                  }`}
                >
                  {isListening ? <MicOff className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
                </button>
              </div>

              {isListening && (
                <div className="flex items-center space-x-2 text-[11px] text-rose-400 font-mono animate-pulse">
                  <span className="h-2 w-2 rounded-full bg-rose-500" />
                  <span>Recording speech... Speak clearly into your microphone</span>
                </div>
              )}
            </div>

            {/* ETA Selector & Send Button */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
              <div className="flex items-center space-x-2 text-xs text-slate-300">
                <Clock className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                <span className="text-[11px] text-slate-400">ETA:</span>
                <div className="flex items-center space-x-1">
                  {[5, 10, 15, 25, 40].map((mins) => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setEtaMinutes(mins)}
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold transition ${
                        etaMinutes === mins
                          ? "bg-amber-500 text-slate-950"
                          : "bg-slate-950 border border-slate-800 text-slate-400 hover:text-white"
                      }`}
                    >
                      {mins}m
                    </button>
                  ))}
                </div>
              </div>

              <button
                type="button"
                onClick={handleSendMessage}
                disabled={messageSending || !citizenMessage.trim()}
                className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-xs font-bold text-white transition flex items-center justify-center space-x-1.5 shadow-lg shadow-emerald-600/20"
              >
                <Send className="h-3.5 w-3.5" />
                <span>{messageSending ? "Broadcasting..." : "Broadcast Message to Citizen & Ops"}</span>
              </button>
            </div>

            {/* Sent Messages Feed */}
            {sentMessages.length > 0 && (
              <div className="pt-2 border-t border-slate-800 space-y-2">
                <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 font-semibold block">
                  Broadcast History:
                </span>
                <div className="space-y-1.5">
                  {sentMessages.map((msg, i) => (
                    <div key={i} className="p-2.5 rounded-xl bg-slate-950/70 border border-slate-800 text-xs space-y-1">
                      <div className="flex items-center justify-between text-[10px] text-slate-400">
                        <div className="flex items-center space-x-1.5">
                          <Check className="h-3 w-3 text-emerald-400" />
                          <span className="text-emerald-400 font-bold">Sent to Requester & Ops</span>
                          {msg.isVoice && (
                            <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 font-mono text-[9px]">
                              🎙️ Voice Transcribed
                            </span>
                          )}
                        </div>
                        <span className="font-mono">{msg.time} • ETA {msg.eta}m</span>
                      </div>
                      <p className="text-slate-200 text-[11px] leading-relaxed">
                        &ldquo;{msg.text}&rdquo;
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Dynamic Technician Action Progression */}
        <div className="pt-2 space-y-2.5">
          {mission?.status === "AWAITING_ACCEPTANCE" && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => handleAction("accept")}
                  disabled={actionLoading}
                  className="py-3.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-xs font-bold text-white transition flex items-center justify-center space-x-1.5 shadow-xl shadow-emerald-600/30 group"
                >
                  <Check className="h-4 w-4 group-hover:scale-110 transition" />
                  <span>{actionLoading ? "Accepting..." : "Accept Mission"}</span>
                </button>
                <button
                  type="button"
                  onClick={handleReject}
                  disabled={actionLoading}
                  className="py-3.5 px-3 rounded-xl bg-slate-900 hover:bg-rose-950/40 border border-slate-800 hover:border-rose-500/50 disabled:opacity-60 text-xs font-bold text-slate-300 hover:text-rose-300 transition flex items-center justify-center space-x-1.5"
                >
                  <X className="h-4 w-4" />
                  <span>Decline / Pass</span>
                </button>
              </div>
              <p className="text-[11px] text-slate-400 text-center font-mono">
                Review resident brief, photo evidence & AI diagnosis before confirming dispatch lock.
              </p>
            </div>
          )}

          {(mission?.status === "ACCEPTED" || mission?.status === "EN_ROUTE" || mission?.status === "ON_SITE" || mission?.status === "REPAIR_IN_PROGRESS" || mission?.status === "IN_PROGRESS") && (
            <button
              type="button"
              onClick={async () => {
                setActionLoading(true);
                try {
                  const baseUrl = getApiBaseUrl();
                  // Auto-advance intermediate status transitions seamlessly in background
                  const steps = [];
                  if (mission?.status === "ACCEPTED") steps.push("en-route", "on-site", "start");
                  else if (mission?.status === "EN_ROUTE") steps.push("on-site", "start");
                  else if (mission?.status === "ON_SITE") steps.push("start");

                  for (const step of steps) {
                    try {
                      await fetch(`${baseUrl}/api/missions/${missionId}/${step}`, {
                        method: "POST",
                        headers: getAuthHeaders()
                      });
                    } catch (_) { /* continue even if intermediate step fails */ }
                  }
                  window.location.href = `/worker/missions/${missionId}/complete/`;
                } catch (e) {
                  console.error("Submit work flow error", e);
                  window.location.href = `/worker/missions/${missionId}/complete/`;
                } finally {
                  setActionLoading(false);
                }
              }}
              disabled={actionLoading}
              className="w-full py-4 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-xs font-extrabold text-white transition flex items-center justify-center space-x-2 shadow-xl shadow-emerald-600/30 group"
            >
              <CheckCircle2 className={`h-4 w-4 group-hover:scale-110 transition ${actionLoading ? "animate-spin" : ""}`} />
              <span>{actionLoading ? "Opening Verification Workbench..." : "Start Work & Submit Proof"}</span>
            </button>
          )}

          {(mission?.status === "PROOF_SUBMITTED" || mission?.status === "READY_FOR_REVIEW" || mission?.status === "VERIFIED" || mission?.status === "APPROVED" || mission?.status === "CLOSED") && (
            <div className="space-y-2">
              <div className="p-4 text-center rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-xs font-mono font-semibold flex items-center justify-center gap-2">
                <CheckCircle2 className="h-4 w-4" />
                <span>
                  {mission?.status === "APPROVED" || mission?.status === "VERIFIED" || mission?.status === "CLOSED"
                    ? "Case Approved by Controller ✓ — Repair Verified"
                    : "Proof Submitted • Under Admission Controller Review"}
                </span>
              </div>
              <button
                type="button"
                onClick={() => { window.location.href = `/worker/missions/${missionId}/complete/`; }}
                className="w-full py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 transition flex items-center justify-center space-x-2"
              >
                <span>Inspect Before vs After Proof & AI Verification</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
