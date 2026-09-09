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
  ShieldCheck,
  HeartPulse
} from "lucide-react";

export default function ResidentHomePage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col">
      {/* Header */}
      <header className="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md px-4 py-3 sticky top-0 z-40">
        <div className="max-w-xl mx-auto flex items-center justify-between">
          <Link href="/" className="inline-flex items-center text-xs font-semibold text-slate-400 hover:text-white transition">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Home
          </Link>
          <span className="font-bold text-sm tracking-tight text-white">RESIDENT HUB</span>
          <Link
            href="/resident/map"
            className="text-xs font-medium text-indigo-400 hover:text-indigo-300"
          >
            Public Map
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-xl mx-auto w-full p-4 sm:p-6 space-y-6">
        {/* Resident Greeting & Community Health Badge */}
        <div className="glass-panel rounded-2xl p-5 border border-indigo-500/20 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950/40">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-xs text-slate-400 font-medium">Good evening, Resident</p>
              <h1 className="text-xl font-bold text-white">Campus District</h1>
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
          className="w-full py-3.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition flex items-center justify-center space-x-2 shadow-lg shadow-indigo-600/30"
        >
          <PlusCircle className="h-5 w-5" />
          <span>Report New Problem</span>
        </Link>

        {/* Your Reports Section */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Your Reports</h2>
            <span className="text-xs text-slate-500">3 Submissions</span>
          </div>

          <div className="space-y-3">
            {/* Report 1 */}
            <Link
              href="/resident/reports/RG-R-101"
              className="glass-panel-interactive rounded-xl p-4 flex items-center justify-between block"
            >
              <div className="flex items-center space-x-3.5">
                <div className="h-10 w-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center flex-shrink-0">
                  <Lightbulb className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-sm font-bold text-white">Broken Streetlight</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      IN PROGRESS
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">Gate 2, University Road</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-500" />
            </Link>

            {/* Report 2 */}
            <Link
              href="/resident/reports/RG-R-102"
              className="glass-panel-interactive rounded-xl p-4 flex items-center justify-between block"
            >
              <div className="flex items-center space-x-3.5">
                <div className="h-10 w-10 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center flex-shrink-0">
                  <Droplets className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-sm font-bold text-white">Blocked Drain</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/20">
                      ASSIGNED
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">Campus Primary School Gate</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-slate-500" />
            </Link>

            {/* Report 3: Needs verification! */}
            <Link
              href="/resident/verify/RG-R-103"
              className="glass-panel-interactive rounded-xl p-4 flex items-center justify-between block border-emerald-500/30 bg-emerald-950/20"
            >
              <div className="flex items-center space-x-3.5">
                <div className="h-10 w-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <h3 className="text-sm font-bold text-white">Pothole Repaired</h3>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 animate-pulse">
                      ACTION REQUIRED
                    </span>
                  </div>
                  <p className="text-xs text-emerald-400/90 mt-0.5">Please confirm if repair worked</p>
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-emerald-400" />
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
