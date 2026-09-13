import Link from "next/link";
import { Wrench } from "lucide-react";

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <Link href="/" className="group inline-flex items-center gap-2.5" aria-label="RepairGrid home">
      <span className="rg-gradient flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-[0_10px_25px_-10px_rgba(37,99,235,.8)] transition group-hover:rotate-3 group-hover:scale-105">
        <Wrench className="h-4 w-4" strokeWidth={2.4} />
      </span>
      {!compact && (
        <span>
          <span className="block text-[17px] font-extrabold tracking-[-0.04em] text-slate-950 dark:text-white">RepairGrid</span>
          <span className="block text-[8px] font-bold uppercase tracking-[.18em] text-slate-500 dark:text-slate-400">Cleaner places, brighter lives</span>
        </span>
      )}
    </Link>
  );
}
