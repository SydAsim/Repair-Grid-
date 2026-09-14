"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { 
  ArrowLeft, 
  PlusCircle, 
  Lightbulb, 
  Droplets, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  ChevronRight,
  LogOut,
  User,
  Mail,
  Lock,
  RefreshCw,
  Sparkles,
  ShieldCheck,
  Wrench,
  Eye,
  EyeOff
} from "lucide-react";
import { useAuth } from "@/lib/auth-context";
import { getApiBaseUrl } from "@/lib/config";

interface Report {
  report_id: string;
  reporter_id: string;
  reporter_name?: string;
  category: string;
  description: string;
  lat: number;
  lng: number;
  location_name?: string;
  status: string;
  verification_confidence: number;
  duplicate_of?: string | null;
  evidence_refs: string[];
  before_photo?: string;
  after_photo?: string;
  technician_notes?: string;
  controller_approved_at?: string;
  mission_id?: string;
  created_at: string;
}

export default function ResidentHomePage() {
  const { user, isLoading: authLoading, login, register, logout, getAuthHeaders } = useAuth();

  // Auth form state
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authSubmitting, setAuthSubmitting] = useState(false);

  // Reports state
  const [reports, setReports] = useState<Report[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [reportsError, setReportsError] = useState("");

  const fetchReports = useCallback(async () => {
    if (!user) return;
    setLoadingReports(true);
    setReportsError("");
    try {
      const baseUrl = getApiBaseUrl();
      const res = await fetch(`${baseUrl}/api/reports/mine`, {
        headers: getAuthHeaders(),
      });
      if (res.ok) {
        const data = await res.json();
        setReports(data);
      } else {
        setReportsError("Could not load previous reports.");
      }
    } catch (e: any) {
      console.warn("Failed to fetch reports:", e);
      setReportsError("Backend service offline or unreachable.");
    } finally {
      setLoadingReports(false);
    }
  }, [user, getAuthHeaders]);

  useEffect(() => {
    if (user) {
      fetchReports();
    }
  }, [user, fetchReports]);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthSubmitting(true);

    if (authMode === "register") {
      if (!name.trim()) {
        setAuthError("Please enter your full name.");
        setAuthSubmitting(false);
        return;
      }
      if (!email.trim() || !email.includes("@")) {
        setAuthError("Please enter a valid email address.");
        setAuthSubmitting(false);
        return;
      }
      if (password.length < 4) {
        setAuthError("Password must be at least 4 characters.");
        setAuthSubmitting(false);
        return;
      }

      const res = await register(name, email, password);
      if (!res.success) {
        setAuthError(res.error || "Registration failed. Please try again.");
      }
    } else {
      if (!email.trim()) {
        setAuthError("Please enter your email.");
        setAuthSubmitting(false);
        return;
      }
      if (!password) {
        setAuthError("Please enter your password.");
        setAuthSubmitting(false);
        return;
      }

      const res = await login(email, password);
      if (!res.success) {
        setAuthError(res.error || "Invalid email or password.");
      }
    }
    setAuthSubmitting(false);
  };

  const fillDemoAccount = () => {
    setEmail("resident@repairgrid.demo");
    setPassword("password123");
    setAuthMode("login");
  };

  const getCategoryIcon = (category: string) => {
    switch (category?.toLowerCase()) {
      case "streetlights":
      case "streetlight":
        return <Lightbulb className="h-5 w-5 text-amber-400" />;
      case "potholes":
      case "pothole":
        return <AlertTriangle className="h-5 w-5 text-orange-400" />;
      case "blocked_drains":
      case "drainage":
        return <Droplets className="h-5 w-5 text-cyan-400" />;
      default:
        return <Wrench className="h-5 w-5 text-indigo-400" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "SUBMITTED":
      case "PENDING":
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">PENDING DISPATCH</span>;
      case "MISSION_CREATED":
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">AGENT TRIAGED</span>;
      case "AWAITING_ACCEPTANCE":
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">AWAITING TECHNICIAN</span>;
      case "ACCEPTED":
      case "EN_ROUTE":
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">DISPATCHED (EN ROUTE)</span>;
      case "IN_PROGRESS":
      case "ON_SITE":
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/20">ON-SITE REPAIR</span>;
      case "PROOF_SUBMITTED":
      case "READY_FOR_REVIEW":
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">READY FOR CONTROLLER REVIEW</span>;
      case "APPROVED":
      case "CLOSED":
      case "RESOLVED":
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm shadow-emerald-500/10">APPROVED ✓</span>;
      default:
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-slate-800 text-slate-300 border border-slate-700">{status}</span>;
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
        <div className="flex items-center space-x-3">
          <div className="h-6 w-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium text-slate-400">Loading Resident Hub...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md px-4 py-3 sticky top-0 z-40">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <Link href="/" className="inline-flex items-center text-xs font-semibold text-slate-400 hover:text-white transition">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Home
          </Link>
          <span className="font-bold text-sm tracking-tight text-white flex items-center space-x-1.5">
            <span className="h-2 w-2 rounded-full bg-emerald-400 inline-block animate-pulse" />
            <span>RESIDENT HUB</span>
          </span>
          <div className="flex items-center space-x-3">
            <Link
              href="/resident/map"
              className="text-xs font-medium text-indigo-400 hover:text-indigo-300"
            >
              Public Map
            </Link>
            {user && (
              <button
                onClick={() => logout("resident")}
                className="inline-flex items-center text-xs text-rose-400 hover:text-rose-300 transition"
                title="Sign Out"
              >
                <LogOut className="h-3.5 w-3.5 mr-1" />
                Sign Out
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-xl mx-auto w-full p-4 sm:p-6 space-y-6">
        {/* If user is NOT logged in: Show Registration and Login Schema */}
        {!user ? (
          <div className="space-y-5">
            <div className="text-center space-y-1.5 pt-2">
              <div className="inline-flex h-12 w-12 rounded-2xl bg-indigo-600/20 border border-indigo-500/30 items-center justify-center text-indigo-400 mb-2">
                <User className="h-6 w-6" />
              </div>
              <h1 className="text-2xl font-extrabold text-white tracking-tight">
                {authMode === "login" ? "Welcome to Resident Hub" : "Create Resident Account"}
              </h1>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                {authMode === "login" 
                  ? "Log in to track your submissions, get real-time repair alerts, and confirm repairs."
                  : "Register with your name, email, and password to start submitting and tracking community issues."}
              </p>
            </div>

            {/* Auth Card */}
            <div className="glass-panel rounded-2xl p-6 border border-slate-800 bg-slate-900/80 shadow-2xl space-y-5">
              {/* Tab Selector */}
              <div className="grid grid-cols-2 p-1 bg-slate-950 rounded-xl border border-slate-800 text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => { setAuthMode("login"); setAuthError(""); }}
                  className={`py-2 rounded-lg transition ${
                    authMode === "login" 
                      ? "bg-indigo-600 text-white shadow" 
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Log In
                </button>
                <button
                  type="button"
                  onClick={() => { setAuthMode("register"); setAuthError(""); }}
                  className={`py-2 rounded-lg transition ${
                    authMode === "register" 
                      ? "bg-indigo-600 text-white shadow" 
                      : "text-slate-400 hover:text-white"
                  }`}
                >
                  Register
                </button>
              </div>

              {/* Error Message */}
              {authError && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-start space-x-2">
                  <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
                  <span>{authError}</span>
                </div>
              )}

              {/* Form */}
              <form onSubmit={handleAuthSubmit} className="space-y-4">
                {authMode === "register" && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="h-4 w-4 text-slate-500 absolute left-3.5 top-3.5" />
                      <input
                        type="text"
                        required
                        autoComplete="name"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="e.g. Alex Mercer"
                        className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="h-4 w-4 text-slate-500 absolute left-3.5 top-3.5" />
                    <input
                      type="email"
                      required
                      autoComplete="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="resident@repairgrid.demo"
                      className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="h-4 w-4 text-slate-500 absolute left-3.5 top-3.5" />
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      autoComplete={authMode === "login" ? "current-password" : "new-password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
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
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-indigo-500 hover:from-indigo-500 hover:to-indigo-400 font-bold text-sm text-white transition shadow-lg shadow-indigo-600/30 flex items-center justify-center space-x-2"
                >
                  {authSubmitting ? (
                    <div className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <span>{authMode === "login" ? "Sign In to Resident Hub" : "Complete Registration"}</span>
                  )}
                </button>
              </form>

              {/* Demo Account Shortcut */}
              <div className="pt-2 border-t border-slate-800/80 text-center">
                <button
                  type="button"
                  onClick={fillDemoAccount}
                  className="inline-flex items-center text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition space-x-1"
                >
                  <Sparkles className="h-3.5 w-3.5 mr-1" />
                  <span>Use Demo Resident (resident@repairgrid.demo)</span>
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Logged In Resident Dashboard */
          <>
            {/* Greeting & Community Health Badge */}
            <div className="glass-panel rounded-2xl p-5 border border-indigo-500/20 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-indigo-400 font-semibold uppercase tracking-wider bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
                      Resident Account
                    </span>
                  </div>
                  <h1 className="text-xl font-bold text-white mt-1">Hello, {user.name}</h1>
                  <p className="text-xs text-slate-400">{user.email}</p>
                </div>
                <div className="h-12 w-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex flex-col items-center justify-center">
                  <span className="text-lg font-extrabold text-indigo-400 leading-none">84</span>
                  <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider">Health</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-3 border-t border-slate-800/80 text-center">
                <div className="bg-slate-950/60 rounded-xl p-2 border border-slate-800/60">
                  <span className="text-[10px] text-slate-400 block">Lighting</span>
                  <span className="text-xs font-bold text-emerald-400">88%</span>
                </div>
                <div className="bg-slate-950/60 rounded-xl p-2 border border-slate-800/60">
                  <span className="text-[10px] text-slate-400 block">Roads</span>
                  <span className="text-xs font-bold text-amber-400">76%</span>
                </div>
                <div className="bg-slate-950/60 rounded-xl p-2 border border-slate-800/60">
                  <span className="text-[10px] text-slate-400 block">Drainage</span>
                  <span className="text-xs font-bold text-cyan-400">82%</span>
                </div>
              </div>
            </div>

            {/* Quick Report CTA */}
            <Link
              href="/report"
              className="w-full py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition flex items-center justify-center space-x-2 shadow-lg shadow-indigo-600/30 group"
            >
              <PlusCircle className="h-5 w-5 group-hover:rotate-90 transition duration-300" />
              <span>Report New Problem</span>
            </Link>

            {/* Real-time Case Update Banner for Resident */}
            {reports.length > 0 && (
              <div className={`p-4 rounded-2xl border transition shadow-lg ${
                reports[0].status === "APPROVED" || reports[0].status === "CLOSED"
                  ? "bg-emerald-950/25 border-emerald-500/40 shadow-emerald-950/20"
                  : reports[0].status === "READY_FOR_REVIEW"
                  ? "bg-cyan-950/25 border-cyan-500/40 shadow-cyan-950/20"
                  : reports[0].status === "ACCEPTED" || reports[0].status === "EN_ROUTE"
                  ? "bg-blue-950/25 border-blue-500/40 shadow-blue-950/20"
                  : "bg-amber-950/25 border-amber-500/40 shadow-amber-950/20"
              }`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start space-x-3">
                    <div className={`h-8 w-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                      reports[0].status === "APPROVED" || reports[0].status === "CLOSED"
                        ? "bg-emerald-500/20 text-emerald-400"
                        : reports[0].status === "READY_FOR_REVIEW"
                        ? "bg-cyan-500/20 text-cyan-400"
                        : reports[0].status === "ACCEPTED" || reports[0].status === "EN_ROUTE"
                        ? "bg-blue-500/20 text-blue-400"
                        : "bg-amber-500/20 text-amber-400"
                    }`}>
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                        {reports[0].status === "APPROVED" || reports[0].status === "CLOSED"
                          ? "🎉 Case Approved & Resolved!"
                          : reports[0].status === "READY_FOR_REVIEW"
                          ? "📋 Repair Finished • Under Mission Controller Review"
                          : reports[0].status === "ACCEPTED" || reports[0].status === "EN_ROUTE"
                          ? "🚚 Technician Dispatched & En Route"
                          : "⏳ Case Update: Your Case is PENDING"}
                      </h4>
                      <p className="text-[11px] text-slate-300 mt-0.5 leading-relaxed">
                        {reports[0].status === "APPROVED" || reports[0].status === "CLOSED"
                          ? "Mission Controller has reviewed the Before and After evidence and APPROVED the repair closure."
                          : reports[0].status === "READY_FOR_REVIEW"
                          ? "Technician completed physical work and submitted proof. Awaiting final Controller sign-off."
                          : reports[0].status === "ACCEPTED" || reports[0].status === "EN_ROUTE"
                          ? "Assigned field specialist has accepted your case and is traveling to the site."
                          : "Your problem report is currently PENDING technician acceptance. Triage and dispatch are in progress."}
                      </p>
                      <div className="flex items-center space-x-2 mt-2 text-[10px] font-mono text-slate-400">
                        <span>Case: <strong className="text-white">{reports[0].report_id}</strong></span>
                        <span>•</span>
                        <span>Status: <strong className="text-indigo-300">{reports[0].status}</strong></span>
                      </div>
                    </div>
                  </div>
                  <Link
                    href={`/resident/reports/${reports[0].report_id}/`}
                    className="text-xs font-bold text-indigo-400 hover:text-indigo-300 shrink-0 flex items-center"
                  >
                    <span>Track</span>
                    <ChevronRight className="h-3.5 w-3.5 ml-0.5" />
                  </Link>
                </div>
              </div>
            )}

            {/* Your Reports Section */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-2">
                  <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Your Reports</h2>
                  <span className="text-[10px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded-full">
                    {reports.length}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={fetchReports}
                  disabled={loadingReports}
                  className="text-xs text-slate-400 hover:text-white flex items-center space-x-1"
                >
                  <RefreshCw className={`h-3 w-3 ${loadingReports ? "animate-spin" : ""}`} />
                  <span>Refresh</span>
                </button>
              </div>

              {reportsError && (
                <div className="p-3 mb-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
                  {reportsError}
                </div>
              )}

              {loadingReports && reports.length === 0 ? (
                <div className="p-8 text-center glass-panel rounded-2xl border border-slate-800">
                  <div className="h-6 w-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                  <p className="text-xs text-slate-400">Loading your submitted reports...</p>
                </div>
              ) : reports.length === 0 ? (
                /* Empty state */
                <div className="glass-panel rounded-2xl p-8 border border-dashed border-slate-800 text-center space-y-3">
                  <div className="h-12 w-12 rounded-full bg-slate-900 flex items-center justify-center mx-auto text-slate-500">
                    <ShieldCheck className="h-6 w-6" />
                  </div>
                  <h3 className="text-sm font-bold text-white">No Reports Submitted Yet</h3>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto">
                    When you report a street light, pothole, or other maintenance issue, it will appear here with live autonomous tracking.
                  </p>
                  <Link
                    href="/report"
                    className="inline-flex items-center text-xs font-semibold text-indigo-400 hover:text-indigo-300 bg-indigo-500/10 px-3 py-1.5 rounded-lg border border-indigo-500/20 transition"
                  >
                    <PlusCircle className="h-3.5 w-3.5 mr-1.5" />
                    Submit your first report
                  </Link>
                </div>
              ) : (
                /* Report Cards */
                <div className="space-y-3">
                  {reports.map((report) => {
                    const isApproved = report.status === "APPROVED" || report.status === "CLOSED" || report.status === "RESOLVED";
                    const isPending = report.status === "PENDING" || report.status === "SUBMITTED";
                    return (
                      <Link
                        key={report.report_id}
                        href={`/resident/reports/${report.report_id}/`}
                        onClick={(e) => { e.preventDefault(); window.location.href = `/resident/reports/${report.report_id}/`; }}
                        className={`glass-panel rounded-2xl p-4 flex flex-col gap-3 block hover:bg-slate-900/90 transition group border ${
                          isApproved
                            ? "border-emerald-500/40 bg-emerald-950/10 shadow-lg shadow-emerald-950/15 hover:border-emerald-500/60"
                            : isPending
                            ? "border-amber-500/30 bg-amber-950/10 hover:border-amber-500/50"
                            : "border-slate-800 hover:border-indigo-500/40"
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center space-x-3.5">
                            <div className="h-10 w-10 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center flex-shrink-0">
                              {getCategoryIcon(report.category)}
                            </div>
                            <div>
                              <div className="flex items-center space-x-2">
                                <h3 className="text-sm font-bold text-white capitalize">
                                  {report.category.replace("_", " ")} Issue
                                </h3>
                                {getStatusBadge(report.status)}
                              </div>
                              <span className="text-[11px] text-slate-400 font-mono">
                                Reporter: {report.reporter_name || user.name || "Resident"}
                              </span>
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4 text-slate-600 group-hover:text-indigo-400 group-hover:translate-x-0.5 transition" />
                        </div>

                        <p className="text-xs text-slate-300 leading-relaxed bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                          &ldquo;{report.description}&rdquo;
                        </p>

                        {/* Side-by-Side Thumbnail Preview if Approved */}
                        {isApproved && (report.before_photo || report.evidence_refs?.[0] || report.after_photo) && (
                          <div className="pt-1">
                            <span className="text-[10px] font-mono text-emerald-400 font-bold uppercase tracking-wider block mb-1.5">
                              ✓ Verified Before & After Proof:
                            </span>
                            <div className="grid grid-cols-2 gap-2">
                              <div className="relative h-20 rounded-lg overflow-hidden border border-slate-800 bg-slate-950">
                                <img
                                  src={report.before_photo || report.evidence_refs?.[0] || "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?w=600"}
                                  alt="Before fix"
                                  className="h-full w-full object-cover"
                                />
                                <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-slate-950/80 text-[8px] font-mono text-rose-300">
                                  Before
                                </span>
                              </div>
                              <div className="relative h-20 rounded-lg overflow-hidden border border-emerald-500/40 bg-slate-950">
                                <img
                                  src={report.after_photo || "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=600"}
                                  alt="After fix"
                                  className="h-full w-full object-cover"
                                />
                                <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-emerald-950/80 text-[8px] font-mono text-emerald-300 border border-emerald-500/40">
                                  After (Approved)
                                </span>
                              </div>
                            </div>
                          </div>
                        )}

                        <div className="flex items-center justify-between pt-1 border-t border-slate-800/60 text-[11px] text-slate-500">
                          <span className="flex items-center">
                            <MapPin className="h-3 w-3 mr-1 text-slate-500" />
                            {report.location_name || `${report.lat.toFixed(3)}, ${report.lng.toFixed(3)}`}
                          </span>
                          <span className="flex items-center font-mono">
                            <Clock className="h-3 w-3 mr-1 text-slate-500" />
                            {new Date(report.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
