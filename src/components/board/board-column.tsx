"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";

import { InboxIcon, SearchXIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { STATUS_LABELS, type TaskStatus } from "@/lib/task-status";
import type { BoardTask } from "@/lib/task-types";

import { QuickAddTask } from "./quick-add-task";
import { StatusIcon } from "./status-icon";
import { SortableTaskCard } from "./task-card";

export const columnId = (status: TaskStatus) => `column:${status}`;

export function BoardColumn({
  status,
  tasks,
  projectKey,
  filtered,
  onCreate,
  onOpen,
  quickAddRequest,
}: {
  status: TaskStatus;
  tasks: BoardTask[];
  projectKey: string;
  filtered: boolean;
  onCreate: (status: TaskStatus, title: string) => Promise<boolean>;
  onOpen: (task: BoardTask) => void;
  /** Increments to ask this column's quick add to open. */
  quickAddRequest: number;
}) {
  // The whole column is a drop target so empty columns accept cards.
  const { setNodeRef, isOver } = useDroppable({ id: columnId(status), data: { type: "column", status } });
  const headingId = `column-${status}-heading`;

  return (
    <section
      aria-labelledby={headingId}
      className={cn(
        "flex w-72 shrink-0 flex-col rounded-xl bg-muted/40 ring-1 ring-border/40 backdrop-blur-[2px] md:w-auto md:min-w-56 md:flex-1",
        "transition-[background-color,box-shadow] duration-200 ease-out dark:bg-white/[0.02] dark:ring-white/[0.05]",
        isOver && "bg-primary/[0.04] ring-primary/30 dark:bg-primary/[0.06] dark:ring-primary/30",
      )}
    >
      <header className="flex items-center gap-2 px-3.5 pt-3 pb-2">
        <StatusIcon status={status} />
        <h2 id={headingId} className="text-[13px] font-semibold tracking-tight">
          {STATUS_LABELS[status]}
        </h2>
        <span
          className="ml-auto rounded-full bg-background/80 px-2 py-0.5 text-[11px] font-medium text-muted-foreground tabular-nums ring-1 ring-border/50 dark:bg-white/[0.04]"
          aria-label={`${tasks.length} görev`}
        >
          {tasks.length}
        </span>
      </header>

      <div ref={setNodeRef} className="flex min-h-0 flex-1 flex-col gap-2.5 overflow-y-auto px-2.5 pt-1 pb-2.5">
        <SortableContext id={columnId(status)} items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          <ol className="flex flex-col gap-2.5" aria-label={`${STATUS_LABELS[status]} görevleri`}>
            {tasks.map((task) => (
              <SortableTaskCard key={task.id} task={task} projectKey={projectKey} onOpen={onOpen} />
            ))}
          </ol>
        </SortableContext>
        {tasks.length === 0 && (
          <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-border/60 px-3 py-7 text-center">
            {filtered ? (
              <SearchXIcon aria-hidden strokeWidth={1.5} className="size-6 text-muted-foreground/70" />
            ) : (
              <InboxIcon aria-hidden strokeWidth={1.5} className="size-6 text-muted-foreground/70" />
            )}
            <p className="text-xs text-muted-foreground">{filtered ? "Filtreye uyan görev yok" : "Görev yok"}</p>
          </div>
        )}
        <QuickAddTask status={status} onCreate={onCreate} openRequest={quickAddRequest} />
      </div>
    </section>
  );
}
