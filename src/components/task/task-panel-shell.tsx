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
        className="w-full gap-0 overflow-y-auto p-0 data-[side=right]:w-full data-[side=right]:sm:max-w-xl"
      >
        {/* The body renders the visible title; these name the dialog until it loads. */}
        <SheetTitle className="sr-only">{task ?? "Görev"}</SheetTitle>
        <SheetDescription className="sr-only">Görev ayrıntıları</SheetDescription>
        {children}
      </SheetContent>
    </Sheet>
  );
}
