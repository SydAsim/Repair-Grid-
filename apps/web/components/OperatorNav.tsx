"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { 
  Activity, 
  Map, 
  FileText, 
  Users, 
  Bot, 
  Inbox, 
  CheckCircle, 
  ShieldCheck, 
  Zap,
  ArrowLeft
} from "lucide-react";

export function OperatorNav() {
  const pathname = usePathname();

  const navItems = [
    { label: "Overview", href: "/operations", icon: Activity },
    { label: "Living Map", href: "/operations/map", icon: Map },
    { label: "Missions", href: "/operations/missions", icon: FileText },
    { label: "Decisions (HITL)", href: "/operations/decisions", icon: Inbox, badge: "1" },
    { label: "Proof-of-Repair", href: "/operations/verification", icon: CheckCircle },
    { label: "Strands Agents", href: "/operations/agents", icon: Bot },
    { label: "Trust Center", href: "/operations/trust", icon: ShieldCheck },
    { label: "Simulator", href: "/operations/simulate", icon: Zap },
  ];

  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-14 flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link href="/" className="text-xs text-slate-400 hover:text-white flex items-center">
            <ArrowLeft className="h-3.5 w-3.5 mr-1" />
            Home
          </Link>
          <div className="h-4 w-px bg-slate-800" />
          <div className="flex items-center space-x-2">
            <span className="font-extrabold text-sm tracking-tight text-white">REPAIRGRID</span>
            <span className="text-[10px] font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
              MISSION CONTROL
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 mr-1.5 animate-pulse" />
            LIVE AGENT CORE
          </span>
        </div>
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center space-x-1 overflow-x-auto py-1 border-t border-slate-800/60">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition flex items-center space-x-1.5 ${
                isActive 
                  ? "bg-indigo-600 text-white shadow-sm" 
                  : "text-slate-400 hover:text-white hover:bg-slate-800/60"
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              <span>{item.label}</span>
              {item.badge && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[9px] font-extrabold bg-rose-500 text-white">
                  {item.badge}
                </span>
              )}
            </Link>
          );
        })}
      </div>
    </header>
  );
}
