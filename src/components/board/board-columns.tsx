import { STATUS_LABELS, TASK_STATUSES } from "@/lib/task-status";

import { StatusIcon } from "./status-icon";

/** Kanban column shells. Phase 3 renders task cards inside them. */
export function BoardColumns() {
  return (
    <div className="flex min-h-0 flex-1 gap-3 overflow-x-auto p-3">
      {TASK_STATUSES.map((status) => (
        <section
          key={status}
          aria-label={STATUS_LABELS[status]}
          className="flex w-72 shrink-0 flex-col rounded-lg bg-muted/50 md:w-auto md:min-w-56 md:flex-1"
        >
          <header className="flex items-center gap-2 px-3 py-2.5">
            <StatusIcon status={status} />
            <h2 className="text-sm font-medium">{STATUS_LABELS[status]}</h2>
            <span className="text-xs text-muted-foreground tabular-nums">0</span>
          </header>
          <div className="flex flex-1 flex-col gap-2 px-2 pb-2">
            <p className="rounded-md border border-dashed px-3 py-6 text-center text-xs text-muted-foreground">
              Görev yok
            </p>
          </div>
        </section>
      ))}
    </div>
  );
}
