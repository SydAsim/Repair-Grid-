import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-zinc-900 text-white hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200",
        secondary:
          "border-zinc-200 bg-zinc-100 text-zinc-800 hover:bg-zinc-200 dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-300 dark:hover:bg-zinc-800",
        destructive:
          "border-red-200 bg-red-50 text-red-700 hover:bg-red-100 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400 dark:hover:bg-red-500/20",
        outline: "border-zinc-300 text-zinc-700 dark:border-zinc-800 dark:text-zinc-300",
        success:
          "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400 dark:hover:bg-emerald-500/20",
        warning:
          "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400 dark:hover:bg-amber-500/20",
        info:
          "border-indigo-200 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-400 dark:hover:bg-indigo-500/20",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  );
}

export { Badge, badgeVariants };
