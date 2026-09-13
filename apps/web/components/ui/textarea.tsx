import * as React from "react";
import { cn } from "@/lib/utils";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          "flex min-h-[80px] w-full rounded-md border border-zinc-300 dark:border-zinc-800 bg-white dark:bg-[#0d0d10] px-3 py-2 text-sm text-zinc-900 dark:text-zinc-100 shadow-sm placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus-visible:outline-none focus-visible:border-zinc-500 focus-visible:ring-1 focus-visible:ring-zinc-400 disabled:cursor-not-allowed disabled:opacity-50",
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Textarea.displayName = "Textarea";

export { Textarea };
