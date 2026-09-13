"use client";

import { useEffect, useState } from "react";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "./ThemeProvider";

export function ThemeToggle({ className = "" }: { className?: string }) {
  const { resolvedTheme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className={`h-9 w-9 rounded-full border border-slate-200 dark:border-white/10 bg-white/70 dark:bg-slate-900/70 ${className}`} />
    );
  }

  const isDark = resolvedTheme === "dark";

  return (
    <button
      onClick={toggleTheme}
      type="button"
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={`relative inline-flex h-9 w-9 items-center justify-center rounded-full border text-xs font-medium transition-all duration-200 select-none
        border-slate-200 bg-white/85 text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 shadow-sm
        dark:border-white/10 dark:bg-slate-900/80 dark:text-slate-300 dark:hover:border-blue-400/30 dark:hover:bg-blue-500/10 dark:hover:text-blue-200
        ${className}`}
    >
      <div className="flex items-center">
        {isDark ? (
          <>
            <Sun className="h-3.5 w-3.5 text-amber-400 transition-transform duration-200 rotate-0 hover:rotate-45" />
          </>
        ) : (
          <>
            <Moon className="h-3.5 w-3.5 text-indigo-600 transition-transform duration-200" />
          </>
        )}
      </div>
    </button>
  );
}
