import { MinusIcon } from "lucide-react";

import type { TaskPriority } from "@/lib/task-types";
import { cn } from "@/lib/utils";

const FILLED: Record<"LOW" | "MEDIUM" | "HIGH", number> = { LOW: 1, MEDIUM: 2, HIGH: 3 };

/**
 * Linear-style priority mark (decorative; pair it with a text label for screen
 * readers): three bars with 1–3 filled, an orange "!" tile for urgent, a dash for none.
 */
export function PriorityIcon({ priority, className }: { priority: TaskPriority; className?: string }) {
  if (priority === "NONE") {
    return <MinusIcon aria-hidden className={cn("size-3.5 text-muted-foreground/50", className)} />;
  }
  if (priority === "URGENT") {
    return (
      <span
        aria-hidden
        className={cn(
          "flex size-3.5 items-center justify-center rounded-[3px] bg-orange-500 text-[10px] leading-none font-bold text-white dark:bg-orange-500/90",
          className,
        )}
      >
        !
      </span>
    );
  }
  const filled = FILLED[priority];
  return (
    <span aria-hidden className={cn("flex h-3.5 items-end gap-[2px] text-foreground/70", className)}>
      {[5, 8, 11].map((height, i) => (
        <span
          key={height}
          className={cn("w-[3px] rounded-[1px] bg-current", i >= filled && "opacity-25")}
          style={{ height }}
        />
      ))}
    </span>
  );
}
