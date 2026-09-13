"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bot,
  CheckCircle2,
  ChevronRight,
  CircleDot,
  Clock3,
  MapPin,
  RefreshCw,
  ShieldCheck,
  Users,
  Wrench,
  Lock,
  Mail,
  User,
  Shield,
  Sparkles,
  Eye,
  EyeOff
} from "lucide-react";
import { OperatorNav } from "@/components/OperatorNav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { API_BASE_URL } from "@/lib/config";
import { useOperatorAuth } from "@/lib/auth-context";

type Summary = {
  community_health: number;
  category_health: { lighting: number; roads: number; drainage: number };
  formula_breakdown: string;
  active_missions: number;
  critical_missions: number;
  resolved_today: number;
  pending_decisions: number;
  available_workers: number;
  agent_actions_today: number;
  proof_pending: number;
  verification_pending: number;
};

type Mission = {
  missionId: string;
  title: string;
  status: string;
  riskBand: string;
  priority: number;
  location: string;
  department: string;
  assignedTechnicianName?: string;
  verificationStatus?: string;
  updatedAt?: string;
  createdAt?: string;
};

type CaseEvent = {
  eventId: string;
  missionId: string;
  eventType: string;
  actorType: string;
  actorId: string;
  timestamp: string;
};

const initialSummary: Summary = {
  community_health: 100,
  category_health: { lighting: 100, roads: 100, drainage: 100 },
  formula_breakdown: "Loading live operational score…",
  active_missions: 0,
  critical_missions: 0,
  resolved_today: 0,
  pending_decisions: 0,
  available_workers: 0,
  agent_actions_today: 0,
  proof_pending: 0,
  verification_pending: 0,
};

function titleCase(value: string) {
  return value.replaceAll("_", " ").toLowerCase().replace(/\b\w/g, (character) => character.toUpperCase());
}

function statusVariant(status: string): "success" | "warning" | "info" | "secondary" | "destructive" {
  if (["CLOSED", "VERIFIED", "RESOLVED"].includes(status)) return "success";
  if (["PROOF_SUBMITTED", "OPERATOR_REVIEW", "AWAITING_ACCEPTANCE"].includes(status)) return "warning";
  if (["EN_ROUTE", "ON_SITE", "REPAIR_IN_PROGRESS", "ACCEPTED"].includes(status)) return "info";
  if (["REJECTED", "FAILED"].includes(status)) return "destructive";
  return "secondary";
}

function riskVariant(risk: string): "destructive" | "warning" | "secondary" | "success" {
  if (risk === "CRITICAL") return "destructive";
  if (risk === "HIGH") return "warning";
  if (risk === "LOW") return "success";
  return "secondary";
}

export default function OperationsOverviewPage() {
  const { user, isLoading: authLoading, login, register, getAuthHeaders } = useOperatorAuth();

  // Auth form state
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authName, setAuthName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authSubmitting, setAuthSubmitting] = useState(false);

  // Operational State
  const [summary, setSummary] = useState<Summary>(initialSummary);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [events, setEvents] = useState<CaseEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const refresh = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const headers = getAuthHeaders();
    try {
      const [summaryResponse, missionResponse, eventResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/api/ops/summary`, { headers, cache: "no-store" }),
        fetch(`${API_BASE_URL}/api/ops/missions`, { headers, cache: "no-store" }),
        fetch(`${API_BASE_URL}/api/ops/events`, { headers, cache: "no-store" }),
      ]);
      if (summaryResponse.ok) setSummary(await summaryResponse.json());
      if (missionResponse.ok) setMissions(await missionResponse.json());
      if (eventResponse.ok) setEvents(await eventResponse.json());
      setLastUpdated(new Date());
    } catch (e) {
      console.warn("Operations refresh error:", e);
    } finally {
      setLoading(false);
    }
  }, [user, getAuthHeaders]);

  useEffect(() => {
    if (user) {
      refresh().catch(() => setLoading(false));
      const timer = window.setInterval(() => refresh().catch(() => undefined), 3000);
      return () => window.clearInterval(timer);
    }
  }, [user, refresh]);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthSubmitting(true);

    if (authMode === "register") {
      if (!authName.trim()) {
        setAuthError("Please enter your operator full name.");
        setAuthSubmitting(false);
        return;
      }
      if (!authEmail.trim() || !authEmail.includes("@")) {
        setAuthError("Please enter a valid official email.");
        setAuthSubmitting(false);
        return;
      }
      if (authPassword.length < 4) {
        setAuthError("Password must be at least 4 characters.");
        setAuthSubmitting(false);
        return;
      }

      const res = await register(authName, authEmail, authPassword);
      if (!res.success) {
        setAuthError(res.error || "Operator registration failed.");
      }
    } else {
      if (!authEmail.trim()) {
        setAuthError("Please enter your operator email.");
        setAuthSubmitting(false);
        return;
      }

      const res = await login(authEmail, authPassword);
      if (!res.success) {
        setAuthError(res.error || "Authentication failed. Check your credentials.");
      }
    }
    setAuthSubmitting(false);
  };

  const handleQuickLogin = async (demoEmail: string) => {
    setAuthError("");
    setAuthSubmitting(true);
    setAuthEmail(demoEmail);
    setAuthPassword("password123");
    const res = await login(demoEmail, "password123");
    if (!res.success) {
      setAuthError(res.error || "Quick login failed.");
    }
    setAuthSubmitting(false);
  };

  const attention = useMemo(
    () => missions.filter((mission) => ["PROOF_SUBMITTED", "OPERATOR_REVIEW", "AWAITING_ACCEPTANCE"].includes(mission.status) || mission.verificationStatus === "OPERATOR_REVIEW"),
    [missions]
  );

  // Sort missions so the newest report submissions appear first!
  const visibleMissions = useMemo(
    () => [...missions].sort((a, b) => {
      const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
      const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
      return timeB - timeA;
    }).slice(0, 8),
    [missions]
  );

  const metrics = [
    { label: "Active missions", value: summary.active_missions, hint: `${missions.length} total live cases`, icon: Wrench },
    { label: "Needs attention", value: attention.length, hint: "Review or assignment", icon: AlertTriangle },
    { label: "Available workers", value: summary.available_workers, hint: "Ready for dispatch", icon: Users },
    { label: "Resolved today", value: summary.resolved_today, hint: "Verified closures", icon: CheckCircle2 },
  ];

  // If not logged in as Operator, render Mission Control authentication gate
  if (!user && !authLoading) {
    return (
      <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col">
        <header className="border-b border-zinc-800 bg-zinc-950/90 backdrop-blur px-6 py-4 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center text-xs font-semibold text-zinc-400 hover:text-white transition">
            <ChevronRight className="h-4 w-4 mr-1 rotate-180" /> Back to Home
          </Link>
          <div className="flex items-center space-x-2">
            <span className="h-2 w-2 rounded-full bg-indigo-500 animate-pulse" />
            <span className="text-xs font-mono font-bold tracking-widest text-indigo-400">MISSION CONTROL COMMAND</span>
          </div>
          <div className="w-16" />
        </header>

        <main className="flex-1 max-w-md mx-auto w-full p-6 flex flex-col justify-center">
          <div className="rounded-2xl p-8 border border-zinc-800 bg-zinc-900/60 backdrop-blur-xl shadow-2xl shadow-indigo-950/20 space-y-6">
            <div className="text-center space-y-2">
              <div className="h-14 w-14 rounded-2xl bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center mx-auto shadow-lg shadow-indigo-950">
                <Shield className="h-7 w-7" />
              </div>
              <h1 className="text-2xl font-bold tracking-tight text-white">Operator Mission Control</h1>
              <p className="text-xs text-zinc-400">
                Authorized command personnel access for community triage, Living GIS mapping, and Guardian HITL supervision.
              </p>
            </div>

            {/* Auth Toggle */}
            <div className="grid grid-cols-2 p-1 bg-zinc-950 rounded-xl border border-zinc-800">
              <button
                type="button"
                onClick={() => { setAuthMode("login"); setAuthError(""); }}
                className={`py-2 text-xs font-semibold rounded-lg transition ${
                  authMode === "login" 
                    ? "bg-indigo-600 text-white shadow" 
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setAuthMode("register"); setAuthError(""); }}
                className={`py-2 text-xs font-semibold rounded-lg transition ${
                  authMode === "register" 
                    ? "bg-indigo-600 text-white shadow" 
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Register
              </button>
            </div>

            {authError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-400 flex items-start space-x-2">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{authError}</span>
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              {authMode === "register" && (
                <div>
                  <label className="block text-xs font-medium text-zinc-300 mb-1">Operator Full Name</label>
                  <div className="relative">
                    <User className="h-4 w-4 absolute left-3 top-3 text-zinc-500" />
                    <input
                      type="text"
                      placeholder="e.g. Jordan Vance"
                      value={authName}
                      autoComplete="name"
                      onChange={(e) => setAuthName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                      required
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Operator Email</label>
                <div className="relative">
                  <Mail className="h-4 w-4 absolute left-3 top-3 text-zinc-500" />
                  <input
                    type="email"
                    autoComplete="email"
                    placeholder="operator@repairgrid.demo"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-zinc-300 mb-1">Password</label>
                <div className="relative">
                  <Lock className="h-4 w-4 absolute left-3 top-3 text-zinc-500" />
                  <input
                    type={showPassword ? "text" : "password"}
                    autoComplete={authMode === "login" ? "current-password" : "new-password"}
                    placeholder="••••••••"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-zinc-950 border border-zinc-800 text-xs text-white placeholder-zinc-500 focus:outline-none focus:border-indigo-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-zinc-500 hover:text-zinc-300"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={authSubmitting}
                className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition shadow-lg shadow-indigo-600/30 flex items-center justify-center space-x-2 disabled:opacity-60"
              >
                {authSubmitting ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <span>{authMode === "login" ? "Enter Mission Control" : "Create Operator Account"}</span>
                    <ShieldCheck className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            {/* Quick 1-Click Demo Login */}
            <div className="pt-4 border-t border-zinc-800 space-y-2">
              <span className="text-[10px] font-semibold text-zinc-400 block uppercase text-center tracking-wider">
                Instant Demo Access
              </span>
              <button
                type="button"
                onClick={() => handleQuickLogin("operator@repairgrid.demo")}
                className="w-full p-2.5 rounded-xl bg-zinc-950 hover:bg-zinc-900 border border-indigo-500/30 text-left transition flex items-center justify-between"
              >
                <div>
                  <span className="text-xs font-bold text-indigo-400 block">Jordan Vance</span>
                  <span className="text-[10px] text-zinc-400">Chief Dispatch Operator</span>
                </div>
                <span className="text-xs font-semibold text-zinc-300 px-2 py-1 rounded bg-indigo-500/10 border border-indigo-500/20">
                  Quick Login
                </span>
              </button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Authenticated Mission Control Workspace
  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      <OperatorNav />

      <main className="mx-auto w-full max-w-[1440px] space-y-6 px-4 py-6 sm:px-6 lg:py-8">
        <section className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Badge variant="secondary" className="rounded-md border-zinc-800 bg-zinc-900 text-[10px] text-zinc-400">
                Operations
              </Badge>
              <span className="flex items-center gap-1.5 text-[10px] text-zinc-500">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live Network Active
              </span>
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-zinc-50 sm:text-3xl">Mission Control</h1>
            <p className="mt-1.5 text-sm text-zinc-400">
              Live tracking of submitted citizen reports, autonomous dispatching, and field operations.
            </p>
          </div>
          <div className="flex items-center gap-2">
            {lastUpdated && (
              <span className="hidden text-[11px] text-zinc-500 sm:block">
                Live sync {lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
              </span>
            )}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => refresh()} 
              disabled={loading} 
              className="border-zinc-800 bg-zinc-950 text-zinc-300 hover:bg-zinc-900"
            >
              <RefreshCw className={`mr-2 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} /> Refresh
            </Button>
            <Link 
              href="/operations/missions" 
              className="inline-flex h-8 items-center rounded-md bg-zinc-100 px-3 text-xs font-medium text-zinc-900 shadow hover:bg-white"
            >
              View all missions
            </Link>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {metrics.map((metric) => {
            const Icon = metric.icon;
            return (
              <Card key={metric.label} className="border-zinc-800 bg-zinc-900/50">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 p-5 pb-2">
                  <CardTitle className="text-xs font-medium text-zinc-400">{metric.label}</CardTitle>
                  <span className="flex h-8 w-8 items-center justify-center rounded-md border border-zinc-800 bg-zinc-950 text-zinc-400">
                    <Icon className="h-4 w-4" />
                  </span>
                </CardHeader>
                <CardContent className="p-5 pt-1">
                  <p className="text-3xl font-semibold tracking-tight text-zinc-50">{metric.value}</p>
                  <p className="mt-1 text-[11px] text-zinc-500">{metric.hint}</p>
                </CardContent>
              </Card>
            );
          })}
        </section>

        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,.75fr)]">
          <Card className="overflow-hidden border-zinc-800 bg-zinc-900/40">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b border-zinc-800 p-5">
              <div>
                <CardTitle className="text-sm text-zinc-100">Live Incident Stream</CardTitle>
                <CardDescription className="mt-1 text-xs text-zinc-500">
                  New resident submissions and dispatched missions appearing in real-time.
                </CardDescription>
              </div>
              <Badge variant="secondary" className="rounded-md border-zinc-800 bg-zinc-950 text-zinc-400">
                {missions.length} live cases
              </Badge>
            </CardHeader>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="border-b border-zinc-800 bg-zinc-950/60 text-[10px] uppercase tracking-wider text-zinc-500">
                  <tr>
                    <th className="px-5 py-3 font-medium">Mission / Incident</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Risk Band</th>
                    <th className="px-4 py-3 font-medium">Technician</th>
                    <th className="px-4 py-3 font-medium"><span className="sr-only">Open</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-800/80">
                  {visibleMissions.map((mission) => (
                    <tr key={mission.missionId} className="group transition-colors hover:bg-zinc-900/80">
                      <td className="px-5 py-4">
                        <div className="max-w-[290px]">
                          <p className="truncate font-medium text-zinc-100">{mission.title}</p>
                          <p className="mt-1 flex items-center gap-1.5 truncate text-[10px] text-zinc-500">
                            <MapPin className="h-3 w-3 shrink-0" />
                            {mission.location || "Campus Site"} · <span className="font-mono">{mission.missionId}</span>
                          </p>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <Badge variant={statusVariant(mission.status)} className="whitespace-nowrap rounded-md text-[9px]">
                          {titleCase(mission.status)}
                        </Badge>
                      </td>
                      <td className="px-4 py-4">
                        <Badge variant={riskVariant(mission.riskBand)} className="rounded-md text-[9px]">
                          {mission.riskBand} ({mission.priority})
                        </Badge>
                      </td>
                      <td className="px-4 py-4">
                        <p className="whitespace-nowrap text-zinc-300 font-medium">
                          {mission.assignedTechnicianName || "Awaiting Technician"}
                        </p>
                        <p className="mt-1 text-[10px] capitalize text-zinc-500">
                          {mission.department}
                        </p>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <Link 
                          href={`/operations/missions/${mission.missionId}`} 
                          className="inline-flex h-8 w-8 items-center justify-center rounded-md text-zinc-500 transition hover:bg-zinc-800 hover:text-white"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      </td>
                    </tr>
                  ))}
                  {!loading && visibleMissions.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-5 py-12 text-center text-zinc-500">
                        No live missions recorded. Submit a report from the Resident portal to see it appear here.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t border-zinc-800 px-5 py-3">
              <p className="text-[10px] text-zinc-600">Sorted by most recent submission</p>
              <Link href="/operations/missions" className="flex items-center gap-1 text-[11px] font-medium text-zinc-300 hover:text-white">
                Open Full Mission Register <ArrowRight className="h-3 w-3" />
              </Link>
            </div>
          </Card>

          <div className="space-y-6">
            <Card className="border-zinc-800 bg-zinc-900/40">
              <CardHeader className="border-b border-zinc-800 p-5">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-sm text-zinc-100">Needs Attention</CardTitle>
                  <Badge variant={attention.length ? "warning" : "success"} className="rounded-md text-[9px]">
                    {attention.length} open
                  </Badge>
                </div>
                <CardDescription className="text-xs text-zinc-500">
                  Cases awaiting operator sign-off or technician acceptance.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-2 p-3">
                {attention.slice(0, 4).map((mission) => (
                  <Link 
                    key={mission.missionId} 
                    href={`/operations/missions/${mission.missionId}`} 
                    className="flex items-start gap-3 rounded-md border border-transparent p-3 transition hover:border-zinc-800 hover:bg-zinc-950/60"
                  >
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-amber-500/10 text-amber-400">
                      <AlertTriangle className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-xs font-medium text-zinc-200">{mission.title}</span>
                      <span className="mt-1 block text-[10px] text-zinc-500">
                        {titleCase(mission.verificationStatus === "OPERATOR_REVIEW" ? "OPERATOR_REVIEW" : mission.status)}
                      </span>
                    </span>
                    <ChevronRight className="mt-2 h-3.5 w-3.5 text-zinc-600" />
                  </Link>
                ))}
                {attention.length === 0 && (
                  <div className="flex flex-col items-center py-8 text-center">
                    <ShieldCheck className="h-7 w-7 text-emerald-500" />
                    <p className="mt-3 text-xs font-medium text-zinc-300">Attention Queue Clear</p>
                    <p className="mt-1 text-[10px] text-zinc-600">All current cases are autonomously progressing.</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-zinc-800 bg-zinc-900/40">
              <CardHeader className="p-5 pb-3">
                <CardTitle className="text-sm text-zinc-100">Community Health Index</CardTitle>
                <CardDescription className="text-xs text-zinc-500">Live deterministic service condition index.</CardDescription>
              </CardHeader>
              <CardContent className="p-5 pt-0">
                <div className="flex items-end justify-between">
                  <p className="text-4xl font-semibold tracking-tight text-zinc-50">{summary.community_health}</p>
                  <span className="pb-1 text-[10px] text-zinc-600">out of 100</span>
                </div>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-zinc-800">
                  <div 
                    className="h-full rounded-full bg-indigo-500 transition-all duration-500" 
                    style={{ width: `${Math.max(0, Math.min(100, summary.community_health))}%` }} 
                  />
                </div>
                <div className="mt-5 space-y-3">
                  {Object.entries(summary.category_health).map(([label, value]) => (
                    <div key={label}>
                      <div className="mb-1.5 flex items-center justify-between text-[10px]">
                        <span className="capitalize text-zinc-500">{label}</span>
                        <span className="font-medium text-zinc-300">{value}%</span>
                      </div>
                      <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
                        <div className="h-full rounded-full bg-zinc-400" style={{ width: `${value}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(320px,.7fr)]">
          <Card className="border-zinc-800 bg-zinc-900/40">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 border-b border-zinc-800 p-5">
              <div>
                <CardTitle className="flex items-center gap-2 text-sm text-zinc-100">
                  <Activity className="h-4 w-4 text-indigo-400" />
                  Live Event Telemetry
                </CardTitle>
                <CardDescription className="mt-1 text-xs text-zinc-500">
                  Structured audit events from Strands agents, technicians, and resident submissions.
                </CardDescription>
              </div>
              <Link href="/operations/agents" className="text-[11px] font-medium text-zinc-400 hover:text-white">
                Inspect Strands Graph
              </Link>
            </CardHeader>
            <CardContent className="divide-y divide-zinc-800/70 p-0">
              {events.slice(0, 6).map((event) => (
                <div key={event.eventId} className="flex items-start gap-3 px-5 py-3.5">
                  <span className="mt-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-zinc-800 bg-zinc-950">
                    <CircleDot className="h-3.5 w-3.5 text-indigo-400" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <p className="truncate text-xs font-medium text-zinc-200">{titleCase(event.eventType)}</p>
                      <time className="shrink-0 text-[9px] text-zinc-600">
                        {new Date(event.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </time>
                    </div>
                    <p className="mt-1 truncate text-[10px] text-zinc-500">
                      {event.actorId} · <span className="font-mono">{event.missionId}</span>
                    </p>
                  </div>
                </div>
              ))}
              {events.length === 0 && (
                <div className="py-8 text-center text-xs text-zinc-500">No events recorded yet.</div>
              )}
            </CardContent>
          </Card>

          <Card className="border-zinc-800 bg-zinc-900/40">
            <CardHeader className="border-b border-zinc-800 p-5">
              <CardTitle className="flex items-center gap-2 text-sm text-zinc-100">
                <Bot className="h-4 w-4 text-indigo-400" />
                Network Automation Health
              </CardTitle>
              <CardDescription className="text-xs text-zinc-500">
                Autonomous system activity and safety gates.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 p-5">
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-md border border-zinc-800 bg-zinc-950/60 p-3">
                  <p className="text-[10px] text-zinc-500">Actions Recorded</p>
                  <p className="mt-1 text-xl font-semibold text-zinc-100">{summary.agent_actions_today}</p>
                </div>
                <div className="rounded-md border border-zinc-800 bg-zinc-950/60 p-3">
                  <p className="text-[10px] text-zinc-500">Pending Reviews</p>
                  <p className="mt-1 text-xl font-semibold text-zinc-100">
                    {summary.pending_decisions + summary.verification_pending}
                  </p>
                </div>
              </div>
              <div className="rounded-md border border-emerald-500/20 bg-emerald-500/5 p-3">
                <div className="flex items-center gap-2 text-xs font-medium text-emerald-400">
                  <ShieldCheck className="h-4 w-4" />
                  Real-time Safeguards Active
                </div>
                <p className="mt-1.5 text-[10px] leading-4 text-zinc-500">
                  Guardian Policy intercepts high-severity items into the Decision Inbox while routine items dispatch autonomously.
                </p>
              </div>
              <Link 
                href="/operations/trust" 
                className="flex h-9 w-full items-center justify-between rounded-md border border-zinc-800 px-3 text-xs font-medium text-zinc-300 transition hover:bg-zinc-800"
              >
                <span>Open Trust Center</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
}
