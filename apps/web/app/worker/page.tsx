"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { 
  ArrowLeft, 
  Bell, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  Navigation, 
  Route, 
  Zap,
  Wrench,
  Lock,
  Mail,
  User,
  LogOut,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  Eye,
  EyeOff,
  AlertTriangle,
  ChevronRight,
  X,
  Camera,
  Bot,
  Check
} from "lucide-react";
import { API_BASE_URL } from "@/lib/config";
import { useWorkerAuth } from "@/lib/auth-context";

type WorkerProfile = {
  workerId: string;
  displayName: string;
  department: string;
  zone: string;
  availability: string;
};

type Mission = {
  mission_id: string;
  title: string;
  description?: string;
  location?: string;
  risk_band: string;
  status: string;
  photo_evidence?: string;
  photoEvidence?: string;
  ai_solution?: string;
  required_skill?: string;
  reporter_name?: string;
  reporterName?: string;
  before_photo?: string;
  beforePhoto?: string;
  after_photo?: string;
  afterPhoto?: string;
  technician_notes?: string;
  technicianNotes?: string;
  voice_transcript?: string;
  voiceTranscript?: string;
  controller_approved_at?: string;
  controllerApprovedAt?: string;
  coordinates?: { lat: number; lng: number };
};

type WorkerNotification = {
  notificationId: string;
  title: string;
  message: string;
  missionId: string;
  actionUrl: string;
  priority: string;
  createdAt: string;
  readAt?: string | null;
  deliveryStatus: string;
  photoEvidence?: string;
  aiRecommendation?: string;
};

export default function WorkerHomePage() {
  const { user, isLoading: authLoading, login, register, logout, getAuthHeaders } = useWorkerAuth();

  // Auth UI state
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authName, setAuthName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authDepartment, setAuthDepartment] = useState("electrical");
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authSubmitting, setAuthSubmitting] = useState(false);

  // Worker Operational State
  const [isAvailable, setIsAvailable] = useState(true);
  const [profile, setProfile] = useState<WorkerProfile | null>(null);
  const [missions, setMissions] = useState<Mission[]>([]);
  const [notifications, setNotifications] = useState<WorkerNotification[]>([]);
  const [busyMission, setBusyMission] = useState<string | null>(null);
  const announced = useRef(new Set<string>());

  const refresh = useCallback(async () => {
    if (!user) return;
    const headers = getAuthHeaders();
    try {
      const [profileResponse, missionResponse, notificationResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/api/workers/me`, { headers, cache: "no-store" }),
        fetch(`${API_BASE_URL}/api/missions/assigned`, { headers, cache: "no-store" }),
        fetch(`${API_BASE_URL}/api/workers/me/notifications`, { headers, cache: "no-store" }),
      ]);

      if (profileResponse.ok) setProfile(await profileResponse.json());
      if (missionResponse.ok) setMissions(await missionResponse.json());
      if (notificationResponse.ok) {
        const nextNotifications: WorkerNotification[] = await notificationResponse.json();
        setNotifications(nextNotifications);
        const latestUnread = nextNotifications.find((item) => !item.readAt);
        if (
          latestUnread &&
          !announced.current.has(latestUnread.notificationId) &&
          typeof Notification !== "undefined" &&
          Notification.permission === "granted"
        ) {
          new Notification(latestUnread.title, { body: latestUnread.message });
          announced.current.add(latestUnread.notificationId);
        }
      }
    } catch (e) {
      console.warn("Worker refresh error:", e);
    }
  }, [user, getAuthHeaders]);

  useEffect(() => {
    if (user) {
      refresh().catch(() => undefined);
      const timer = window.setInterval(() => {
        if (typeof document === "undefined" || document.visibilityState === "visible") {
          refresh().catch(() => undefined);
        }
      }, 8000);
      return () => window.clearInterval(timer);
    }
  }, [user, refresh]);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthSubmitting(true);

    if (authMode === "register") {
      if (!authName.trim()) {
        setAuthError("Please enter your full name.");
        setAuthSubmitting(false);
        return;
      }
      if (!authEmail.trim() || !authEmail.includes("@")) {
        setAuthError("Please enter a valid email address.");
        setAuthSubmitting(false);
        return;
      }
      if (authPassword.length < 4) {
        setAuthError("Password must be at least 4 characters.");
        setAuthSubmitting(false);
        return;
      }
      const res = await register(authName, authEmail, authPassword, authDepartment);
      if (!res.success) {
        setAuthError(res.error || "Technician registration failed.");
      }
    } else {
      if (!authEmail.trim()) {
        setAuthError("Please enter your email.");
        setAuthSubmitting(false);
        return;
      }
      const res = await login(authEmail, authPassword);
      if (!res.success) {
        setAuthError(res.error || "Login failed. Check your credentials.");
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

  const unread = notifications.filter((item) => !item.readAt).length;
  const orderedMissions = useMemo(
    () => [...missions].sort((a, b) => Number(a.status !== "AWAITING_ACCEPTANCE") - Number(b.status !== "AWAITING_ACCEPTANCE")),
    [missions]
  );
  const nextMission = orderedMissions[0];

  const markRead = async (notificationId: string) => {
    await fetch(`${API_BASE_URL}/api/workers/me/notifications/${notificationId}/read`, {
      method: "POST",
      headers: getAuthHeaders(),
    });
    await refresh();
  };

  const enableAlerts = async () => {
    if (typeof Notification !== "undefined") await Notification.requestPermission();
  };

  const acceptMission = async (missionId: string) => {
    setBusyMission(missionId);
    try {
      await fetch(`${API_BASE_URL}/api/missions/${missionId}/accept`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      await refresh();
    } finally {
      setBusyMission(null);
    }
  };

  const rejectMission = async (missionId: string) => {
    setBusyMission(missionId);
    try {
      await fetch(`${API_BASE_URL}/api/missions/${missionId}/reject`, {
        method: "POST",
        headers: getAuthHeaders(),
      });
      await refresh();
    } finally {
      setBusyMission(null);
    }
  };

  const handleToggleStatus = async () => {
    const nextStatus = !isAvailable;
    setIsAvailable(nextStatus);
    try {
      await fetch(`${API_BASE_URL}/api/workers/me/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          availability: nextStatus ? "AVAILABLE" : "OFF_SHIFT",
        }),
      });
      await refresh();
    } catch (e) {
      console.warn("Failed to toggle status:", e);
    }
  };

  const displayName = profile?.displayName || "Ahmed Khan";
  const initials = displayName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // If not logged in as Technician, render Login / Register view
  if (!user && !authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
        <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md px-4 py-3 sticky top-0 z-40 flex items-center justify-between">
          <Link href="/" className="inline-flex items-center text-xs font-semibold text-slate-400 hover:text-white transition">
            <ArrowLeft className="h-4 w-4 mr-1" /> Back to Home
          </Link>
          <span className="font-bold text-xs tracking-wider text-amber-400">FIELD TECHNICIAN PORTAL</span>
          <div className="w-12" />
        </header>

        <main className="flex-1 max-w-md mx-auto w-full p-4 sm:p-6 flex flex-col justify-center">
          <div className="glass-panel rounded-2xl p-6 sm:p-8 border border-amber-500/30 bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/30 shadow-2xl shadow-amber-950/20 space-y-6">
            <div className="text-center space-y-2">
              <div className="h-14 w-14 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/10">
                <Wrench className="h-7 w-7" />
              </div>
              <h1 className="text-2xl font-extrabold text-white">Technician Access</h1>
              <p className="text-xs text-slate-400">
                Log in or register your field technician profile to accept live dispatched repairs and upload proofs.
              </p>
            </div>

            {/* Auth Mode Toggle */}
            <div className="grid grid-cols-2 p-1 bg-slate-950/80 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => { setAuthMode("login"); setAuthError(""); }}
                className={`py-2 text-xs font-bold rounded-lg transition ${
                  authMode === "login" 
                    ? "bg-amber-500 text-slate-950 shadow" 
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Sign In
              </button>
              <button
                type="button"
                onClick={() => { setAuthMode("register"); setAuthError(""); }}
                className={`py-2 text-xs font-bold rounded-lg transition ${
                  authMode === "register" 
                    ? "bg-amber-500 text-slate-950 shadow" 
                    : "text-slate-400 hover:text-white"
                }`}
              >
                Register
              </button>
            </div>

            {authError && (
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 flex-shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              {authMode === "register" && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Full Name</label>
                    <div className="relative">
                      <User className="h-4 w-4 absolute left-3 top-3 text-slate-500" />
                      <input
                        type="text"
                        placeholder="Ahmed Khan"
                        value={authName}
                        onChange={(e) => setAuthName(e.target.value)}
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">Trade Department</label>
                    <select
                      value={authDepartment}
                      onChange={(e) => setAuthDepartment(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-amber-500"
                    >
                      <option value="electrical">Electrical & Lighting</option>
                      <option value="roads">Roads & Pavement</option>
                      <option value="plumbing_drainage">Plumbing & Stormwater Drainage</option>
                      <option value="facilities">General Facilities Maintenance</option>
                    </select>
                  </div>
                </>
              )}

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Work Email</label>
                <div className="relative">
                  <Mail className="h-4 w-4 absolute left-3 top-3 text-slate-500" />
                  <input
                    type="email"
                    autoComplete="email"
                    placeholder="technician@repairgrid.demo"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Password</label>
                <div className="relative">
                  <Lock className="h-4 w-4 absolute left-3 top-3 text-slate-500" />
                  <input
                    type={showPassword ? "text" : "password"}
                    autoComplete={authMode === "login" ? "current-password" : "new-password"}
                    placeholder="••••••••"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    className="w-full pl-9 pr-10 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3 text-slate-500 hover:text-slate-300"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={authSubmitting}
                className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs transition shadow-lg shadow-amber-500/20 flex items-center justify-center space-x-2 disabled:opacity-60"
              >
                {authSubmitting ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <span>{authMode === "login" ? "Sign In to Field Dashboard" : "Register Technician Account"}</span>
                    <ShieldCheck className="h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            {/* Quick Demo Pre-fill */}
            <div className="pt-4 border-t border-slate-800 space-y-2">
              <span className="text-[10px] font-semibold text-slate-400 block uppercase text-center tracking-wider">
                Instant 1-Click Demo Accounts
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickLogin("worker.electric@repairgrid.demo")}
                  className="p-2.5 rounded-xl bg-slate-950/80 hover:bg-slate-950 border border-amber-500/30 text-left transition flex flex-col"
                >
                  <span className="text-xs font-bold text-amber-400">Ahmed Khan</span>
                  <span className="text-[10px] text-slate-400">Electrical Specialist</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickLogin("worker.plumber@repairgrid.demo")}
                  className="p-2.5 rounded-xl bg-slate-950/80 hover:bg-slate-950 border border-slate-800 text-left transition flex flex-col"
                >
                  <span className="text-xs font-bold text-indigo-400">Marcus Thorne</span>
                  <span className="text-[10px] text-slate-400">Drainage Specialist</span>
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // Authenticated Field Technician Dashboard
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur-md px-4 py-3 sticky top-0 z-40 flex items-center justify-between">
        <Link href="/" className="inline-flex items-center text-xs font-semibold text-slate-400 hover:text-white transition">
          <ArrowLeft className="h-4 w-4 mr-1" /> Home
        </Link>
        <span className="font-bold text-xs tracking-wider text-amber-400">FIELD OPERATIONS</span>
        <div className="flex items-center space-x-3">
          <Link href="/worker/map" className="text-xs font-semibold text-indigo-400 flex items-center">
            <Route className="h-3.5 w-3.5 mr-1" /> Route
          </Link>
          <button
            onClick={() => logout()}
            className="text-xs font-semibold text-slate-400 hover:text-rose-400 flex items-center transition"
            title="Sign Out"
          >
            <LogOut className="h-3.5 w-3.5 mr-1" /> Logout
          </button>
        </div>
      </header>

      <main className="flex-1 max-w-lg mx-auto w-full p-4 sm:p-6 space-y-5">
        {/* Worker Profile Card with Shift Toggle */}
        <div className="glass-panel rounded-2xl p-5 border border-amber-500/20 bg-gradient-to-br from-slate-900 via-slate-900 to-amber-950/20 shadow-xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3.5">
              <div className="h-12 w-12 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center font-bold text-lg">
                {initials}
              </div>
              <div>
                <h1 className="text-lg font-bold text-white">{displayName}</h1>
                <p className="text-xs text-slate-400 capitalize">
                  {profile?.department || "Electrical"} Specialist • {(profile?.zone || "campus_all").replaceAll("_", " ")}
                </p>
              </div>
            </div>
            <button 
              onClick={handleToggleStatus} 
              className={`px-3 py-1.5 rounded-full text-xs font-bold transition flex items-center space-x-1.5 border ${
                isAvailable 
                  ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30 hover:bg-emerald-500/20" 
                  : "bg-slate-800 text-slate-400 border-slate-700 hover:bg-slate-750"
              }`}
            >
              <span className={`h-2 w-2 rounded-full ${isAvailable ? "bg-emerald-400 animate-pulse" : "bg-slate-500"}`} />
              <span>{isAvailable ? "AVAILABLE" : "OFF SHIFT"}</span>
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t border-slate-800 text-center">
            <div className="bg-slate-950/60 rounded-xl p-2.5 border border-slate-800/60">
              <span className="text-[10px] text-slate-400 block uppercase">Missions</span>
              <span className="text-sm font-extrabold text-white">{missions.length} Active</span>
            </div>
            <div className="bg-slate-950/60 rounded-xl p-2.5 border border-slate-800/60">
              <span className="text-[10px] text-slate-400 block uppercase">Offers</span>
              <span className="text-sm font-extrabold text-indigo-400">
                {missions.filter((mission) => mission.status === "AWAITING_ACCEPTANCE").length}
              </span>
            </div>
            <div className="bg-slate-950/60 rounded-xl p-2.5 border border-slate-800/60">
              <span className="text-[10px] text-slate-400 block uppercase">Alerts</span>
              <span className="text-sm font-extrabold text-amber-400">{unread} New</span>
            </div>
          </div>
        </div>

        {/* Off-Shift Warning Alert */}
        {!isAvailable && (
          <div className="rounded-2xl p-4 bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-start space-x-3 text-xs">
            <AlertTriangle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold block text-sm text-amber-200">Shift Status: OFF-SHIFT</strong>
              <p className="mt-0.5 text-amber-400/90 text-[11px] leading-relaxed">
                Autonomous matching and dispatch offers are paused while you are off shift. Toggle your status back to Available to accept new campus work orders.
              </p>
            </div>
          </div>
        )}

        {/* Route Planning & Geospatial Dispatch CTA */}
        <Link 
          href="/worker/map" 
          className="glass-panel-interactive rounded-2xl p-4 border border-indigo-500/30 bg-gradient-to-r from-indigo-950/40 via-slate-900 to-purple-950/30 flex items-center justify-between group hover:border-indigo-500/60 transition shadow-lg shadow-indigo-950/20"
        >
          <div className="flex items-center space-x-3.5">
            <div className="h-10 w-10 rounded-xl bg-indigo-500/15 text-indigo-400 border border-indigo-500/30 flex items-center justify-center group-hover:scale-105 transition">
              <Route className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h3 className="text-xs font-bold text-white">Route Planning & Geospatial Dispatch</h3>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">LIVE MAP</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Inspect optimized driving routes, asset locations & safety perimeters across campus.
              </p>
            </div>
          </div>
          <ChevronRight className="h-5 w-5 text-slate-500 group-hover:text-white transition" />
        </Link>

        {/* Real-time Notifications */}
        <section>
          <div className="flex items-center justify-between mb-2.5">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center">
              <Bell className="h-3.5 w-3.5 mr-1.5" /> Notifications
            </h2>
            <button onClick={enableAlerts} className="text-[10px] font-semibold text-indigo-400 hover:text-indigo-300">
              Enable device alerts
            </button>
          </div>
          <div className="space-y-2">
            {notifications.slice(0, 5).map((notification) => (
              <div 
                key={notification.notificationId} 
                className={`glass-panel-interactive rounded-xl p-3.5 flex flex-col gap-2.5 ${
                  !notification.readAt ? "border-amber-500/40 bg-amber-950/15" : "border-slate-800"
                }`}
              >
                <div className="flex items-start gap-3">
                  {notification.photoEvidence ? (
                    <div className="h-12 w-12 rounded-lg overflow-hidden border border-slate-800 shrink-0 bg-slate-950">
                      <img src={notification.photoEvidence} alt="Evidence" className="h-full w-full object-cover" />
                    </div>
                  ) : (
                    <span className={`mt-0.5 h-9 w-9 rounded-lg flex items-center justify-center shrink-0 ${
                      !notification.readAt ? "bg-amber-500/15 text-amber-400" : "bg-slate-800 text-slate-400"
                    }`}>
                      <Bell className="h-4 w-4" />
                    </span>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <strong className="text-xs text-white">{notification.title}</strong>
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30 font-bold">
                        {notification.priority || "HIGH"}
                      </span>
                    </div>
                    <p className="mt-1 text-[11px] leading-4 text-slate-300">
                      {notification.message}
                    </p>
                  </div>
                </div>

                {/* AI Solution Snippet */}
                {notification.aiRecommendation && (
                  <div className="p-2.5 rounded-lg bg-indigo-950/30 border border-indigo-500/20 text-[11px] text-indigo-300 flex items-center space-x-2">
                    <Bot className="h-3.5 w-3.5 text-indigo-400 shrink-0" />
                    <span className="truncate">{notification.aiRecommendation}</span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
                  <span className="text-[10px] font-mono text-slate-500">
                    {new Date(notification.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <Link
                    href={notification.actionUrl}
                    onClick={async () => {
                      await markRead(notification.notificationId);
                      window.location.href = notification.actionUrl;
                    }}
                    className="text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center"
                  >
                    <span>View & Decide</span>
                    <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
                  </Link>
                </div>
              </div>
            ))}
            {notifications.length === 0 && (
              <div className="glass-panel rounded-xl border border-slate-800 p-4 text-center text-xs text-slate-500">
                No new mission notifications. Real-time updates active.
              </div>
            )}
          </div>
        </section>

        {/* Primary Dispatched Mission */}
        {nextMission ? (
          <section>
            <div className="flex items-center justify-between mb-2.5">
              <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                {nextMission.status === "AWAITING_ACCEPTANCE" ? "🚨 Incoming Dispatch Offer — Action Required" : "Active Dispatched Mission"}
              </h2>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${
                nextMission.risk_band === "HIGH" || nextMission.risk_band === "CRITICAL"
                  ? "text-rose-400 bg-rose-500/10 border-rose-500/20" 
                  : "text-amber-400 bg-amber-500/10 border-amber-500/20"
              }`}>
                {nextMission.risk_band} PRIORITY
              </span>
            </div>
            <div className="glass-panel rounded-2xl p-5 border border-indigo-500/40 space-y-4 bg-slate-900/90 shadow-xl shadow-indigo-950/20">
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 font-mono">MISSION {nextMission.mission_id}</span>
                  <h3 className="text-lg font-bold text-white mt-0.5">{nextMission.title}</h3>
                  <p className="text-xs text-slate-400 flex items-center mt-1">
                    <MapPin className="h-3.5 w-3.5 mr-1 text-rose-400" />
                    {nextMission.location || "Location supplied with report"}
                    {nextMission.coordinates && (
                      <span className="ml-1.5 font-mono text-indigo-400 text-[10px]">
                        ({nextMission.coordinates.lat.toFixed(4)}, {nextMission.coordinates.lng.toFixed(4)})
                      </span>
                    )}
                  </p>
                </div>
                <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                  <Zap className="h-5 w-5" />
                </div>
              </div>

              {/* Verified Reporter Information */}
              <div className="flex items-center justify-between bg-slate-950/70 p-2.5 rounded-xl border border-slate-800 text-xs">
                <div className="flex items-center space-x-2">
                  <User className="h-4 w-4 text-amber-400 shrink-0" />
                  <span className="text-slate-400">Reporter:</span>
                  <span className="font-bold text-white">
                    {nextMission.reporter_name || nextMission.reporterName || "Syed Asim (Resident Citizen)"}
                  </span>
                </div>
                <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20 font-bold">
                  CITIZEN SUBMISSION
                </span>
              </div>

              {/* Status Banner when Approved or Under Review */}
              {(nextMission.status === "APPROVED" || nextMission.status === "VERIFIED" || nextMission.status === "CLOSED") && (
                <div className="p-3.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-between text-xs text-emerald-300">
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                    <div>
                      <span className="font-bold block text-white">CASE APPROVED BY MISSION CONTROLLER ✓</span>
                      <span className="text-[11px] text-emerald-400">
                        Work verified and closed out across resident & central registry.
                      </span>
                    </div>
                  </div>
                  <span className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-bold">
                    APPROVED ✓
                  </span>
                </div>
              )}

              {(nextMission.status === "READY_FOR_REVIEW" || nextMission.status === "PROOF_SUBMITTED") && (
                <div className="p-3.5 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-between text-xs text-amber-300">
                  <div className="flex items-center space-x-2">
                    <Clock className="h-5 w-5 text-amber-400 shrink-0" />
                    <div>
                      <span className="font-bold block text-white">UNDER ADMISSION CONTROLLER REVIEW</span>
                      <span className="text-[11px] text-amber-400">
                        Technician proof submitted. Awaiting Before/After photo sign-off.
                      </span>
                    </div>
                  </div>
                  <span className="px-2 py-1 rounded bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold">
                    REVIEW PENDING
                  </span>
                </div>
              )}

              {/* Citizen Description & Photo Evidence */}
              <div className="space-y-2">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block font-semibold mb-1">
                    Exact Resident Complaint / Brief:
                  </span>
                  <p className="text-xs text-slate-100 bg-slate-950/80 p-3 rounded-xl border border-slate-800 leading-relaxed font-medium">
                    &ldquo;{nextMission.description || "Please repair street light near HVK"}&rdquo;
                  </p>
                </div>

                {/* Picture comparison or single photo */}
                {nextMission.after_photo || nextMission.afterPhoto ? (
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono text-rose-400 font-bold block">1. Before (Resident)</span>
                      <div className="relative h-36 w-full rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
                        <img 
                          src={nextMission.photo_evidence || nextMission.photoEvidence || nextMission.before_photo || nextMission.beforePhoto || "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=800"} 
                          alt="Citizen Reported Issue" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] font-mono text-emerald-400 font-bold block">2. After (Repaired)</span>
                      <div className="relative h-36 w-full rounded-xl overflow-hidden border border-emerald-500/40 bg-slate-950">
                        <img 
                          src={nextMission.after_photo || nextMission.afterPhoto} 
                          alt="Technician Fixed Issue" 
                          className="w-full h-full object-cover"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="relative h-44 w-full rounded-xl overflow-hidden border border-slate-800 bg-slate-950">
                    <img 
                      src={nextMission.photo_evidence || nextMission.photoEvidence || nextMission.before_photo || nextMission.beforePhoto || "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=800"} 
                      alt="Citizen Reported Issue" 
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 left-2 px-2.5 py-1 rounded-md bg-slate-950/80 backdrop-blur-sm border border-slate-700 text-[10px] font-mono text-slate-200 flex items-center space-x-1.5">
                      <Camera className="h-3 w-3 text-indigo-400" />
                      <span>Resident Photographic Evidence</span>
                    </div>
                  </div>
                )}
              </div>

              {/* AI-Based Solution / Triage Result Box */}
              <div className="p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-500/30 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-indigo-300 flex items-center">
                    <Bot className="h-4 w-4 mr-1.5 text-indigo-400" />
                    Amazon Nova AI Diagnostic & Solution
                  </span>
                  <span className="font-mono text-emerald-400 font-bold">
                    99% Ranked Fit
                  </span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed font-mono">
                  {nextMission.ai_solution || "AI Solution: Replace damaged 150W modular luminaire core and verify photocell switch. Lockout breaker before opening casing."}
                </p>
                <div className="pt-1.5 border-t border-indigo-500/20 flex items-center justify-between text-[10px] text-slate-400">
                  <span>Required Trade: <strong className="text-white capitalize">{nextMission.required_skill || "Electrical Specialist"}</strong></span>
                  <span>Safety Protocol: <strong className="text-amber-400">Class 3 PPE Mandatory</strong></span>
                </div>
              </div>

              {/* Technician Decision Choice Controls */}
              <div className="pt-2">
                {nextMission.status === "AWAITING_ACCEPTANCE" || nextMission.status === "PENDING" ? (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2.5">
                      <button 
                        onClick={() => acceptMission(nextMission.mission_id)} 
                        disabled={busyMission === nextMission.mission_id} 
                        className="py-3 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-60 text-xs font-bold text-white transition flex items-center justify-center space-x-1.5 shadow-lg shadow-emerald-600/25"
                      >
                        <Check className="h-4 w-4" />
                        <span>{busyMission ? "Accepting..." : "Accept Case"}</span>
                      </button>

                      <button 
                        onClick={() => rejectMission(nextMission.mission_id)} 
                        disabled={busyMission === nextMission.mission_id} 
                        className="py-3 px-3 rounded-xl bg-slate-800 hover:bg-rose-950/40 border border-slate-700 hover:border-rose-500/50 disabled:opacity-60 text-xs font-bold text-slate-300 hover:text-rose-300 transition flex items-center justify-center space-x-1.5"
                      >
                        <X className="h-4 w-4" />
                        <span>Decline / Reject</span>
                      </button>
                    </div>

                    <Link 
                      href={`/worker/missions/${nextMission.mission_id}/`} 
                      onClick={(e) => { e.preventDefault(); window.location.href = `/worker/missions/${nextMission.mission_id}/`; }}
                      className="w-full py-2.5 px-4 rounded-xl bg-indigo-600/20 hover:bg-indigo-600/30 text-xs font-semibold text-indigo-300 text-center transition flex items-center justify-center space-x-1.5 border border-indigo-500/30"
                    >
                      <span>Inspect Full Work Order Details & Route</span>
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                ) : (
                  <div className="flex items-center space-x-3">
                    <Link 
                      href={`/worker/missions/${nextMission.mission_id}/`} 
                      onClick={(e) => { e.preventDefault(); window.location.href = `/worker/missions/${nextMission.mission_id}/`; }}
                      className="flex-1 py-3 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white text-center transition flex items-center justify-center space-x-2 shadow-lg shadow-indigo-600/25"
                    >
                      <Navigation className="h-4 w-4" />
                      <span>Open Mission Execution</span>
                    </Link>
                    <span className="py-3 px-4 rounded-xl bg-slate-800 text-xs font-semibold text-slate-300 flex items-center">
                      <Clock className="h-3.5 w-3.5 mr-1 text-indigo-400" />
                      {nextMission.status.replaceAll("_", " ")}
                    </span>
                  </div>
                )}
              </div>
            </div>
          </section>
        ) : (
          <section className="glass-panel rounded-2xl p-6 border border-slate-800 text-center space-y-3">
            <div className="h-10 w-10 rounded-xl bg-slate-800 text-slate-400 flex items-center justify-center mx-auto">
              <CheckCircle2 className="h-5 w-5 text-emerald-400" />
            </div>
            <h3 className="text-sm font-bold text-white">All Dispatched Cases Addressed</h3>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              Standing by for incoming resident reports. When a report is submitted, it will appear here instantly.
            </p>
          </section>
        )}

        {/* Additional Missions Queue */}
        {orderedMissions.length > 1 && (
          <section>
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">
              Other Assigned & District Cases ({orderedMissions.length - 1})
            </h2>
            <div className="space-y-2.5">
              {orderedMissions.slice(1).map((mission) => (
                <Link 
                  key={mission.mission_id} 
                  href={`/worker/missions/${mission.mission_id}/`} 
                  onClick={(e) => { e.preventDefault(); window.location.href = `/worker/missions/${mission.mission_id}/`; }}
                  className="glass-panel-interactive rounded-xl p-3.5 flex items-center justify-between border border-slate-800"
                >
                  <div>
                    <span className="text-[10px] text-slate-500 font-mono">{mission.mission_id}</span>
                    <h4 className="text-xs font-bold text-white">{mission.title}</h4>
                    <p className="text-[11px] text-slate-400">
                      {mission.location || "Location provided"} • {mission.risk_band}
                    </p>
                  </div>
                  <span className="text-[10px] text-slate-400 bg-slate-800 px-2 py-1 rounded-md">
                    {mission.status.replaceAll("_", " ")}
                  </span>
                </Link>
              ))}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}
