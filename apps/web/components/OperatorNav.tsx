"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Bot,
  CheckCircle2,
  FileText,
  Inbox,
  Map,
  Search,
  ShieldCheck,
  Sparkles,
  LogOut,
  UserCheck
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useOperatorAuth } from "@/lib/auth-context";

const navItems = [
  { label: "Overview", href: "/operations", icon: Activity },
  { label: "Map", href: "/operations/map", icon: Map },
  { label: "Missions", href: "/operations/missions", icon: FileText },
  { label: "Decisions", href: "/operations/decisions", icon: Inbox, badge: true },
  { label: "Verification", href: "/operations/verification", icon: CheckCircle2 },
  { label: "Agents", href: "/operations/agents", icon: Bot },
  { label: "Trust", href: "/operations/trust", icon: ShieldCheck },
];

export function OperatorNav() {
  const pathname = usePathname();
  const { user, logout } = useOperatorAuth();

  return (
    <header className="sticky top-0 z-50 border-b border-zinc-800 bg-zinc-950/95 backdrop-blur supports-[backdrop-filter]:bg-zinc-950/80">
      <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-4 px-4 sm:px-6">
        <div className="flex shrink-0 items-center gap-3">
          <Link href="/" aria-label="Back to RepairGrid home" className="flex h-9 w-9 items-center justify-center rounded-md border border-zinc-800 bg-zinc-900 text-zinc-400 shadow-sm transition hover:bg-zinc-800 hover:text-white">
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div className="hidden h-8 w-px bg-zinc-800 sm:block" />
          <div className="flex items-center gap-2.5">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-indigo-600 text-white shadow-sm shadow-indigo-950">
              <Sparkles className="h-4 w-4" />
            </span>
            <div className="leading-none">
              <p className="text-sm font-semibold tracking-tight text-zinc-50">RepairGrid</p>
              <p className="mt-1 text-[10px] font-medium text-zinc-500">Mission Control</p>
            </div>
          </div>
        </div>

        <nav className="ml-2 hidden min-w-0 flex-1 items-center gap-1 overflow-x-auto lg:flex">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative inline-flex h-9 shrink-0 items-center gap-2 rounded-md px-3 text-xs font-medium transition-colors ${active ? "bg-zinc-800 text-zinc-50 shadow-sm" : "text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"}`}
              >
                <Icon className="h-3.5 w-3.5" />
                {item.label}
                {item.badge && <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />}
              </Link>
            );
          })}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
          <Link href="/operations/missions" className="hidden h-9 w-44 items-center gap-2 rounded-md border border-zinc-800 bg-zinc-900/70 px-3 text-left text-xs text-zinc-500 shadow-sm transition hover:bg-zinc-900 hover:text-zinc-300 md:flex">
            <Search className="h-3.5 w-3.5" />
            Search missions...
            <ArrowRight className="ml-auto h-3.5 w-3.5" />
          </Link>
          <Badge variant="success" className="h-7 gap-1.5 rounded-md px-2.5 text-[10px]">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Live Network
          </Badge>

          {user ? (
            <div className="flex items-center space-x-2 pl-2 border-l border-zinc-800">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-semibold text-zinc-200">{user.name || "Operator"}</span>
                <span className="text-[10px] text-indigo-400 capitalize">{user.role}</span>
              </div>
              <button
                onClick={() => logout()}
                className="h-8 w-8 rounded-md bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-rose-400 border border-zinc-800 flex items-center justify-center transition"
                title="Sign out of Mission Control"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          ) : (
            <Link
              href="/operations"
              className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-md bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition"
            >
              <UserCheck className="h-3.5 w-3.5 mr-1" />
              <span>Sign In</span>
            </Link>
          )}
        </div>
      </div>

      <nav className="flex items-center gap-1 overflow-x-auto border-t border-zinc-900 px-4 py-2 lg:hidden">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href;
          return (
            <Link 
              key={item.href} 
              href={item.href} 
              className={`inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md px-2.5 text-[11px] font-medium ${active ? "bg-zinc-800 text-white" : "text-zinc-500 hover:text-zinc-200"}`}
            >
              <Icon className="h-3.5 w-3.5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </header>
  );
}
