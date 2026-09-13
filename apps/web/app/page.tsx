import Link from "next/link";
import { 
  ShieldCheck, 
  MapPin, 
  Wrench, 
  Activity, 
  Bot, 
  CheckCircle2, 
  Sparkles, 
  Radio, 
  Users, 
  ArrowRight,
  Zap
} from "lucide-react";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Top Banner */}
      <header className="border-b border-slate-800/80 bg-slate-900/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-tr from-indigo-600 to-indigo-400 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Bot className="h-5 w-5 text-white" />
            </div>
            <div>
              <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
                REPAIRGRID
              </span>
              <span className="ml-2 px-2 py-0.5 text-xs font-semibold rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                Strands Agents OS
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse" />
              Live Operations Network
            </span>
            <Link
              href="/worker"
              className="inline-flex items-center space-x-1.5 text-xs font-medium px-3 py-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-400 border border-amber-500/30 transition shadow-sm"
            >
              <Wrench className="h-3.5 w-3.5" />
              <span>Technician Portal</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 flex flex-col justify-center">
        <div className="text-center max-w-3xl mx-auto mb-16">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-slate-900 border border-slate-800 text-xs font-medium text-slate-300 mb-6">
            <Sparkles className="h-3.5 w-3.5 text-indigo-400" />
            <span>AWS & Devpost 'Agents for Humans' Hackathon • Good Neighbor Agents Track</span>
          </div>
          
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-white mb-6">
            Autonomous Community <br />
            <span className="bg-gradient-to-r from-indigo-400 via-indigo-300 to-cyan-400 bg-clip-text text-transparent">
              Maintenance Network
            </span>
          </h1>

          <p className="text-lg text-slate-400 leading-relaxed mb-8">
            An autonomous operations layer connecting residents, technicians, and operators. 
            A coordinated Strands agent system ingests reports, deduplicates, determines risk, dispatches workers, 
            and verifies proof-of-repair without chatbot friction.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/report"
              className="inline-flex items-center space-x-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition shadow-lg shadow-indigo-600/30"
            >
              <span>Submit a Problem Report</span>
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/operations"
              className="inline-flex items-center space-x-2 px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 font-semibold transition"
            >
              <Activity className="h-4 w-4 text-indigo-400" />
              <span>Launch Mission Control</span>
            </Link>
          </div>
        </div>

        {/* 4 Interactive Role Gateways */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* 1. Resident */}
          <Link
            href="/resident"
            className="group glass-panel-interactive rounded-2xl p-6 flex flex-col justify-between"
          >
            <div>
              <div className="h-12 w-12 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Users className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2 flex items-center justify-between">
                Resident Portal
                <span className="text-xs font-normal text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-full border border-blue-500/20">
                  Mobile First
                </span>
              </h3>
              <p className="text-sm text-slate-400 mb-4">
                Fast photo/location capture, personal timeline, and post-repair citizen confirmation.
              </p>
            </div>
            <div className="pt-4 border-t border-slate-800 text-xs font-semibold text-blue-400 flex items-center space-x-1">
              <span>Enter /resident</span>
              <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* 2. Field Worker */}
          <Link
            href="/worker"
            className="group glass-panel-interactive rounded-2xl p-6 flex flex-col justify-between"
          >
            <div>
              <div className="h-12 w-12 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Wrench className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2 flex items-center justify-between">
                Field Technician
                <span className="text-xs font-normal text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                  Field Ops
                </span>
              </h3>
              <p className="text-sm text-slate-400 mb-4">
                Today's route, start arrival workflow, and submit completion proof with before/after photos.
              </p>
            </div>
            <div className="pt-4 border-t border-slate-800 text-xs font-semibold text-amber-400 flex items-center space-x-1">
              <span>Enter /worker</span>
              <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* 3. Operator Mission Control */}
          <Link
            href="/operations"
            className="group glass-panel-interactive rounded-2xl p-6 flex flex-col justify-between border-indigo-500/30 bg-slate-900/60"
          >
            <div>
              <div className="h-12 w-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <Activity className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2 flex items-center justify-between">
                Mission Control
                <span className="text-xs font-normal text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
                  Hero UI
                </span>
              </h3>
              <p className="text-sm text-slate-400 mb-4">
                Living map, Strands agent network visualizer, Human-in-the-Loop decision inbox, and Trust center.
              </p>
            </div>
            <div className="pt-4 border-t border-slate-800 text-xs font-semibold text-indigo-400 flex items-center space-x-1">
              <span>Enter /operations</span>
              <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>

          {/* 4. Admin & Demo */}
          <Link
            href="/admin/demo"
            className="group glass-panel-interactive rounded-2xl p-6 flex flex-col justify-between"
          >
            <div>
              <div className="h-12 w-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2 flex items-center justify-between">
                Admin & Demo
                <span className="text-xs font-normal text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                  Judges
                </span>
              </h3>
              <p className="text-sm text-slate-400 mb-4">
                Seed synthetic Campus District assets (100 assets, 6 workers), configure policies, and reset state.
              </p>
            </div>
            <div className="pt-4 border-t border-slate-800 text-xs font-semibold text-emerald-400 flex items-center space-x-1">
              <span>Enter /admin/demo</span>
              <ArrowRight className="h-3 w-3 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-6 text-center text-xs text-slate-500">
        <p>RepairGrid • Autonomous Maintenance Network • Powered by AWS Bedrock & Strands Agents SDK • MIT License</p>
      </footer>
    </div>
  );
}
