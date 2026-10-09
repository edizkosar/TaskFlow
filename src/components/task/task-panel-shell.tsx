"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { closeTaskPanel } from "@/lib/task-url";

/**
 * Right-hand task panel. Opens from the URL (`?task=MOB-12`) on the client right
 * away; the body (children) is a server component streamed in behind Suspense.
 */
export function TaskPanelShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const task = searchParams.get("task");

  return (
    <Sheet
      open={task !== null}
      onOpenChange={(open) => {
        if (!open) closeTaskPanel(router, pathname, new URLSearchParams(searchParams));
      }}
    >
      <SheetContent
        side="right"
        // The header has its own close button.
        showCloseButton={false}
        className={[
          "w-full gap-0 overflow-y-auto overscroll-contain p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-xl",
          // Frosted glass panel with a soft leading shadow.
          "border-border/40 bg-background/90 backdrop-blur-xl supports-[backdrop-filter]:bg-background/80",
          "shadow-[-24px_0_60px_-24px_rgba(15,23,42,0.3)] dark:shadow-[-24px_0_60px_-20px_rgba(0,0,0,0.8)]",
          // Smooth slide in from the right (Base UI starting/ending styles).
          "duration-300 ease-out data-[side=right]:data-ending-style:translate-x-16 data-[side=right]:data-starting-style:translate-x-16",
        ].join(" ")}
      >
        {/* The body renders the visible title; these name the dialog until it loads. */}
        <SheetTitle className="sr-only">{task ?? "Görev"}</SheetTitle>
        <SheetDescription className="sr-only">Görev ayrıntıları</SheetDescription>
        {children}
      </SheetContent>
    </Sheet>
  );
}
