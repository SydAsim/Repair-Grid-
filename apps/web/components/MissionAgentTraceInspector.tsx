"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AlertTriangle, Bot, BrainCircuit, Check, ChevronDown, ChevronRight,
  Clock3, FileJson2, LockKeyhole, RefreshCw, ShieldCheck, Sparkles, UserCheck,
  Wrench,
} from "lucide-react";
import { API_BASE_URL } from "@/lib/config";

type TraceStep = { agent?: string; node?: string; status?: string; payload?: Record<string, unknown> };
type Mission = { missionId?: string; title?: string; status?: string; executionTrace?: TraceStep[]; riskBand?: string; riskScore?: number; assignedTechnicianName?: string; matchScorePct?: number; verificationResult?: Record<string, unknown> };
type Event = { eventId?: string; eventType?: string; actorType?: string; actorId?: string; timestamp?: string; structuredPayload?: Record<string, unknown> };

const agentCopy: Record<string, { label: string; purpose: string }> = {
  IntakeAgent: { label: "Intake", purpose: "Normalized the resident report and prepared evidence." },
  DuplicateAgent: { label: "Duplicate check", purpose: "Checked nearby open reports before creating new work." },
  VerificationAgent: { label: "Evidence review", purpose: "Assessed whether the submitted evidence supports the report." },
  RiskAgent: { label: "Risk assessment", purpose: "Calculated operational priority using bounded policy rules." },
  OwnershipAgent: { label: "Department routing", purpose: "Selected the responsible team and required trade skill." },
  MissionAgent: { label: "Mission creation", purpose: "Created the canonical repair mission for this case." },
  ResourceAgent: { label: "Technician match", purpose: "Ranked eligible, available technicians and created the offer." },
  GuardianAgent: { label: "Safety gate", purpose: "Applied confidence and safety policies before action." },
};

const pretty = (value: unknown) => {
  if (typeof value === "number") return value <= 1 && value >= 0 ? `${Math.round(value * 100)}%` : String(value);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (value === null || value === undefined || value === "") return "—";
  if (Array.isArray(value)) return value.map(item => typeof item === "string" ? item.replaceAll("_", " ") : JSON.stringify(item)).join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value).replaceAll("_", " ");
};

export function MissionAgentTraceInspector({ missionId }: { missionId: string }) {
  const [mission, setMission] = useState<Mission | null>(null);
  const [events, setEvents] = useState<Event[]>([]);
  const [selected, setSelected] = useState(0);
  const [rawOpen, setRawOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true); setSelected(0);
    Promise.all([
      fetch(`${API_BASE_URL}/api/ops/missions/${missionId}`, { headers: { "X-Mock-Role": "operator" }, cache: "no-store" }).then(response => response.ok ? response.json() : null),
      fetch(`${API_BASE_URL}/api/ops/missions/${missionId}/events`, { headers: { "X-Mock-Role": "operator" }, cache: "no-store" }).then(response => response.ok ? response.json() : []),
    ]).then(([missionData, eventData]) => { if (active) { setMission(missionData); setEvents(Array.isArray(eventData) ? eventData : []); } }).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, [missionId]);

  const steps = useMemo(() => mission?.executionTrace || [], [mission]);
  const current = steps[selected];
  const completed = steps.filter(step => step.status === "COMPLETED").length;
  const agentEvents = events.filter(event => ["AGENT", "SYSTEM"].includes(event.actorType || ""));

  if (loading) return <div className="rg-card h-[520px] animate-pulse" />;
  if (!mission) return <div className="rg-card p-10 text-center text-sm text-slate-500">This case could not be loaded.</div>;

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-[26px] border border-blue-200/70 bg-white p-6 shadow-[0_26px_70px_-42px_rgba(37,99,235,.55)] dark:border-blue-400/15 dark:bg-slate-950/65">
        <div className="rg-orb -right-16 -top-20 h-56 w-56 bg-blue-300/25 dark:bg-blue-500/15" />
        <div className="relative flex flex-col justify-between gap-5 lg:flex-row lg:items-end"><div><p className="rg-kicker flex items-center gap-2"><BrainCircuit className="h-3.5 w-3.5" /> Case decision record</p><h2 className="mt-2 text-2xl font-extrabold tracking-[-.035em] text-slate-950 dark:text-white">{mission.title}</h2><p className="mt-2 text-xs text-slate-500 dark:text-slate-400">{missionId} · Current state: <strong className="text-slate-800 dark:text-slate-200">{mission.status?.replaceAll("_", " ")}</strong></p></div><div className="flex flex-wrap gap-2"><span className="rounded-full bg-blue-50 px-3 py-1.5 text-[10px] font-extrabold text-blue-700 dark:bg-blue-400/10 dark:text-blue-200">{completed}/{steps.length} steps completed</span><span className="rounded-full bg-emerald-50 px-3 py-1.5 text-[10px] font-extrabold text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-200">Immutable case history</span></div></div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[.85fr_1.15fr]">
        <div className="rg-card overflow-hidden"><div className="border-b border-slate-200/80 p-5 dark:border-white/[.07]"><h3 className="text-sm font-extrabold text-slate-950 dark:text-white">Workflow steps</h3><p className="mt-1 text-[11px] leading-4 text-slate-500">Each item is recorded by this case’s backend execution.</p></div><div className="max-h-[620px] overflow-y-auto p-2">{steps.length === 0 ? <div className="p-8 text-center"><Clock3 className="mx-auto h-6 w-6 text-slate-300" /><p className="mt-2 text-xs text-slate-500">No structured execution trace was stored for this case.</p></div> : steps.map((step, index) => { const meta = agentCopy[step.agent || ""] || { label: step.agent || "System step", purpose: "Recorded a structured case action." }; const active = selected === index; const interrupted = step.status === "INTERRUPTED" || step.status === "FAILED"; return <button key={`${step.agent}-${step.node}-${index}`} onClick={() => setSelected(index)} className={`flex w-full items-start gap-3 rounded-xl p-3 text-left transition ${active ? "bg-blue-50 dark:bg-blue-400/[.08]" : "hover:bg-slate-50 dark:hover:bg-white/[.035]"}`}><span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${interrupted ? "bg-amber-50 text-amber-600 dark:bg-amber-400/10 dark:text-amber-300" : step.status === "COMPLETED" ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-400/10 dark:text-emerald-300" : "bg-blue-50 text-blue-600 dark:bg-blue-400/10 dark:text-blue-300"}`}>{interrupted ? <AlertTriangle className="h-4 w-4" /> : step.status === "COMPLETED" ? <Check className="h-4 w-4" /> : <RefreshCw className="h-4 w-4" />}</span><span className="min-w-0 flex-1"><span className="flex items-center justify-between gap-2"><span className="text-xs font-extrabold text-slate-900 dark:text-white">{meta.label}</span><span className="text-[8px] font-bold uppercase tracking-wider text-slate-400">{step.status}</span></span><span className="mt-1 line-clamp-2 block text-[10px] leading-4 text-slate-500">{meta.purpose}</span></span><ChevronRight className={`mt-2 h-3.5 w-3.5 ${active ? "text-blue-500" : "text-slate-300"}`} /></button>; })}</div></div>

        <div className="space-y-5">
          <div className="rg-card p-5 sm:p-6"><div className="flex items-start justify-between gap-4"><div><p className="rg-kicker">Safe explanation</p><h3 className="mt-2 text-lg font-extrabold text-slate-950 dark:text-white">{current ? (agentCopy[current.agent || ""]?.label || current.agent) : "Select a workflow step"}</h3><p className="mt-1 text-xs text-slate-500">{current ? (agentCopy[current.agent || ""]?.purpose || "Structured case action") : "Choose a step to inspect its recorded result."}</p></div><span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 dark:bg-blue-400/10 dark:text-blue-300"><Bot className="h-5 w-5" /></span></div>
            {current && <div className="mt-5 grid gap-3 sm:grid-cols-2">{Object.entries(current.payload || {}).slice(0, 10).map(([key, value]) => <div key={key} className="rounded-xl border border-slate-100 bg-slate-50/75 p-3 dark:border-white/[.06] dark:bg-white/[.03]"><p className="text-[9px] font-bold uppercase tracking-[.12em] text-slate-400">{key.replaceAll("_", " ")}</p><p className="mt-1.5 break-words text-xs font-semibold leading-5 text-slate-800 dark:text-slate-200">{pretty(value)}</p></div>)}</div>}
            {current && Object.keys(current.payload || {}).length === 0 && <p className="mt-5 rounded-xl bg-slate-50 p-4 text-xs text-slate-500 dark:bg-white/[.04]">This step recorded completion without an additional public payload.</p>}
            <div className="mt-5 flex items-start gap-3 rounded-xl border border-emerald-200/70 bg-emerald-50/70 p-4 dark:border-emerald-400/15 dark:bg-emerald-400/[.06]"><LockKeyhole className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-300" /><div><p className="text-xs font-extrabold text-emerald-900 dark:text-emerald-100">Decision transparency without private reasoning</p><p className="mt-1 text-[11px] leading-4 text-emerald-800/70 dark:text-emerald-200/65">RepairGrid stores inputs, outcomes, confidence and policies. Private model chain-of-thought is never displayed or logged.</p></div></div>
          </div>

          <div className="rg-card overflow-hidden"><button onClick={() => setRawOpen(value => !value)} className="flex w-full items-center justify-between p-5 text-left"><div className="flex items-center gap-3"><span className="flex h-9 w-9 items-center justify-center rounded-xl bg-slate-100 text-slate-600 dark:bg-white/[.06] dark:text-slate-300"><FileJson2 className="h-4 w-4" /></span><div><p className="text-xs font-extrabold text-slate-900 dark:text-white">Structured record</p><p className="mt-0.5 text-[10px] text-slate-500">Exact stored payload for audit and debugging</p></div></div><ChevronDown className={`h-4 w-4 text-slate-400 transition ${rawOpen ? "rotate-180" : ""}`} /></button>{rawOpen && <pre className="max-h-72 overflow-auto border-t border-slate-200 bg-slate-950 p-4 text-[10px] leading-5 text-blue-100 dark:border-white/[.07]">{JSON.stringify(current || {}, null, 2)}</pre>}</div>
        </div>
      </section>

      <section className="rg-card p-5 sm:p-6"><div className="flex items-center justify-between"><div><h3 className="text-sm font-extrabold text-slate-950 dark:text-white">Unified case events</h3><p className="mt-1 text-[11px] text-slate-500">Agent, system and human actions share one chronological history.</p></div><Sparkles className="h-5 w-5 text-blue-500" /></div><div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{agentEvents.slice(-9).reverse().map((event, index) => <div key={event.eventId || index} className="rounded-xl border border-slate-100 bg-slate-50/60 p-4 dark:border-white/[.06] dark:bg-white/[.025]"><div className="flex items-center justify-between gap-2"><span className="truncate text-[10px] font-extrabold text-slate-800 dark:text-slate-200">{event.eventType?.replaceAll("_", " ")}</span><span className="text-[8px] font-bold uppercase tracking-wider text-slate-400">{event.actorType}</span></div><p className="mt-2 line-clamp-2 text-[10px] leading-4 text-slate-500">{event.actorId}</p><p className="mt-2 text-[9px] font-semibold text-slate-400">{event.timestamp ? new Date(event.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Recorded"}</p></div>)}</div></section>
    </div>
  );
}
