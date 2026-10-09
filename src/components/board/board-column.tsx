"use client";

import { useDroppable } from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";

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
}: {
  status: TaskStatus;
  tasks: BoardTask[];
  projectKey: string;
  filtered: boolean;
  onCreate: (status: TaskStatus, title: string) => Promise<boolean>;
}) {
  // The whole column is a drop target so empty columns accept cards.
  const { setNodeRef, isOver } = useDroppable({ id: columnId(status), data: { type: "column", status } });
  const headingId = `column-${status}-heading`;

  return (
    <section
      aria-labelledby={headingId}
      className={cn(
        "flex w-72 shrink-0 flex-col rounded-lg bg-muted/50 transition-colors md:w-auto md:min-w-56 md:flex-1",
        isOver && "bg-muted",
      )}
    >
      <header className="flex items-center gap-2 px-3 py-2.5">
        <StatusIcon status={status} />
        <h2 id={headingId} className="text-sm font-medium">
          {STATUS_LABELS[status]}
        </h2>
        <span className="text-xs text-muted-foreground tabular-nums" aria-label={`${tasks.length} görev`}>
          {tasks.length}
        </span>
      </header>

      <div ref={setNodeRef} className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-2 pb-2">
        <SortableContext id={columnId(status)} items={tasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          <ol className="flex flex-col gap-2" aria-label={`${STATUS_LABELS[status]} görevleri`}>
            {tasks.map((task) => (
              <SortableTaskCard key={task.id} task={task} projectKey={projectKey} />
            ))}
          </ol>
        </SortableContext>
        {tasks.length === 0 && (
          <p className="rounded-md border border-dashed px-3 py-6 text-center text-xs text-muted-foreground">
            {filtered ? "Filtreye uyan görev yok" : "Görev yok"}
          </p>
        )}
        <QuickAddTask status={status} onCreate={onCreate} />
      </div>
    </section>
  );
}
