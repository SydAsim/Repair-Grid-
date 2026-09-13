"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, HardHat, House } from "lucide-react";

const portals = [
  { label: "Resident", href: "/resident", icon: House, match: "/resident" },
  { label: "Technician", href: "/worker", icon: HardHat, match: "/worker" },
  { label: "Mission Control", href: "/operations", icon: Building2, match: "/operations" },
];

export function PortalSwitcher({ compact = false }: { compact?: boolean }) {
  const pathname = usePathname();
  return (
    <nav className="flex items-center gap-1 rounded-full border border-slate-200/80 bg-slate-100/80 p-1 dark:border-white/10 dark:bg-white/[.05]" aria-label="Demo portals">
      {portals.map(({ label, href, icon: Icon, match }) => {
        const active = pathname.startsWith(match);
        return (
          <Link
            key={href}
            href={href}
            className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[11px] font-semibold transition ${active ? "bg-white text-blue-700 shadow-sm dark:bg-blue-500/15 dark:text-blue-200" : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"}`}
          >
            <Icon className="h-3.5 w-3.5" />
            {!compact && <span className="hidden md:inline">{label}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
