import { WorkflowIcon } from "lucide-react";

import { cn } from "@/lib/utils";

/** TaskFlow wordmark: gradient tile + name. */
export function Brand({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2 text-lg font-semibold tracking-tight", className)}>
      <span
        aria-hidden
        className="flex size-7 items-center justify-center rounded-lg bg-linear-to-br from-primary to-primary/60 text-primary-foreground shadow-[inset_0_1px_0_rgba(255,255,255,0.25),0_4px_12px_-4px_var(--color-primary)]"
      >
        <WorkflowIcon className="size-4" strokeWidth={2} />
      </span>
      TaskFlow
    </span>
  );
}

/** Centered stage for auth / onboarding / invite screens: soft accent glow + faint grid. */
export function AuthStage({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative flex flex-1 items-center justify-center overflow-hidden px-4 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(60%_45%_at_50%_0%,color-mix(in_oklch,var(--color-primary)_16%,transparent),transparent)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(var(--color-border)_1px,transparent_1px),linear-gradient(90deg,var(--color-border)_1px,transparent_1px)] [background-size:44px_44px] opacity-40 [mask-image:radial-gradient(70%_60%_at_50%_30%,black,transparent)] dark:opacity-25"
      />
      {children}
    </main>
  );
}

/** Glass card surface used on the auth stage. */
export const glassCard =
  "bg-card/80 ring-1 ring-border/50 shadow-[0_24px_60px_-24px_rgba(15,23,42,0.25)] backdrop-blur-xl dark:bg-card/60 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_24px_60px_-24px_rgba(0,0,0,0.8)]";
